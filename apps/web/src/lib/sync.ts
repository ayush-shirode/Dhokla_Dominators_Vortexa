/**
 * Two-way offline sync (FRONTEND_SPEC §3.3).
 *
 *  push: flush the outbox with POST /sync/batch, in order. `applied` → keep the server copy,
 *        `stale` → the server has newer data, replace local and tell the user,
 *        `error` → keep the op and remember the message to show on that item.
 *  pull: GET /sync/snapshot?since=… and merge, without overwriting items that still have
 *        unsent local edits, and without ever touching the device-only ration card number.
 *  401:  the server no longer knows this device (e.g. DB reset) → register again and re-queue
 *        everything stored locally.
 */
import { ApiError, type ApiErrorBody, type SyncOperation } from '@repo/shared';
import { API_BASE_URL, api, registerDevice } from './api';
import { getDb, getOutbox, getSetting, removeFromOutbox, setSetting } from './db';
import type { LocalCheck, LocalHousehold, LocalRecord } from './localTypes';

export interface SyncResult {
  pushed: number;
  pulled: number;
  /** Items replaced because the server had a newer version. */
  updatedFromServer: number;
  errors: Array<{ entity: SyncOperation['entity']; id: string; error: ApiErrorBody }>;
}

const BATCH = 200;

function householdBody(h: LocalHousehold) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { rationCardNo, createdAt, updatedAt, ruleConfirmedAt, ...body } = h;
  return body;
}

function checkBody(c: LocalCheck) {
  return { householdId: c.householdId, period: c.period };
}

function recordBody(r: LocalRecord) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, labels, createdAt, updatedAt, ...body } = r;
  return body;
}

/** Writes a server entity into IndexedDB, keeping device-only fields. */
async function storeServerEntity(entity: SyncOperation['entity'], value: unknown): Promise<void> {
  if (!value) return;
  const db = await getDb();
  if (entity === 'household') {
    const h = value as LocalHousehold;
    const local = await db.get('households', h.id);
    await db.put('households', { ...h, rationCardNo: local?.rationCardNo ?? null });
  } else if (entity === 'check') {
    await db.put('checks', value as LocalCheck);
  } else {
    await db.put('records', value as LocalRecord);
  }
}

async function push(result: SyncResult): Promise<void> {
  const outbox = (await getOutbox()).sort((a, b) => a.clientUpdatedAt.localeCompare(b.clientUpdatedAt));
  for (let i = 0; i < outbox.length; i += BATCH) {
    const ops = outbox.slice(i, i + BATCH);
    const res = await api.sync.batch(ops);
    for (const r of res.results) {
      const op = ops.find((o) => o.opId === r.opId);
      if (!op) continue;
      if (r.status === 'applied' || r.status === 'stale') {
        await removeFromOutbox(op.opId);
        result.pushed++;
        if (op.action === 'put') await storeServerEntity(op.entity, r.entity);
        if (r.status === 'stale') result.updatedFromServer++;
      } else if (r.error) {
        result.errors.push({ entity: op.entity, id: op.id, error: r.error });
      }
    }
  }
}

async function pull(result: SyncResult): Promise<void> {
  const since = await getSetting<string | null>('sync_last_server_time', null);
  const snap = await api.sync.snapshot(since ?? undefined);
  const pendingIds = new Set((await getOutbox()).map((o) => o.id));
  const db = await getDb();

  for (const h of snap.households) {
    if (pendingIds.has(h.id)) continue;
    await storeServerEntity('household', h);
    result.pulled++;
  }
  for (const c of snap.checks) {
    if (pendingIds.has(c.id)) continue;
    await storeServerEntity('check', c);
    result.pulled++;
  }
  for (const r of snap.records) {
    if (pendingIds.has(r.id)) continue;
    await storeServerEntity('record', r);
    result.pulled++;
  }
  for (const d of snap.deleted) {
    if (pendingIds.has(d.id)) continue;
    const store = d.entity === 'household' ? 'households' : d.entity === 'check' ? 'checks' : 'records';
    await db.delete(store, d.id);
  }
  await setSetting('sync_last_server_time', snap.serverTime);
}

/** Puts every locally stored household, check and record in the outbox (after re-registering). */
export async function requeueEverything(): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const ops: SyncOperation[] = [];
  for (const h of await db.getAll('households')) {
    ops.push({ opId: crypto.randomUUID(), entity: 'household', action: 'put', id: h.id, body: householdBody(h), clientUpdatedAt: now });
  }
  for (const c of await db.getAll('checks')) {
    ops.push({ opId: crypto.randomUUID(), entity: 'check', action: 'put', id: c.id, body: checkBody(c), clientUpdatedAt: now });
  }
  for (const r of await db.getAll('records')) {
    ops.push({ opId: crypto.randomUUID(), entity: 'record', action: 'put', id: r.id, body: recordBody(r), clientUpdatedAt: now });
  }
  await db.clear('outbox');
  for (const op of ops) await db.put('outbox', op);
  await setSetting('sync_last_server_time', null);
}

/** If "Delete everything" ran while offline, finish the server wipe now. */
export async function finishPendingServerWipe(): Promise<void> {
  const token = localStorage.getItem('rs_pending_wipe_token');
  if (!token) return;
  const res = await fetch(`${API_BASE_URL}/devices/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  // 401 means the server copy is already gone.
  if (res.ok || res.status === 401) localStorage.removeItem('rs_pending_wipe_token');
}

export async function runSync(): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, updatedFromServer: 0, errors: [] };
  await finishPendingServerWipe().catch(() => {});
  try {
    await push(result);
    await pull(result);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'UNAUTHORIZED') {
      await registerDevice({ force: true });
      await requeueEverything();
      await push(result);
      await pull(result);
    } else {
      throw e;
    }
  }
  await setSetting('sync_errors', result.errors);
  return result;
}

export { householdBody, checkBody, recordBody };
