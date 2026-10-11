import {
  redactSensitiveIds,
  ruleFingerprint,
  type ApiWarning,
  type EntitlementRule,
  type Household,
  type HouseholdInput,
} from '@repo/shared';
import { getDb, tx, type Row } from '../db/index.js';
import { AppError, nowIso } from '../lib/http.js';

export function rowToHousehold(r: Row): Household {
  return {
    id: r.id as string,
    label: r.label as string,
    cardType: r.card_type as Household['cardType'],
    cardName: (r.card_name as string) ?? null,
    members: r.members as number,
    rule: JSON.parse(r.rule_json as string) as EntitlementRule,
    ruleConfirmed: r.rule_confirmed_at !== null,
    ruleConfirmedAt: (r.rule_confirmed_at as string) ?? null,
    stateCode: (r.state_code as string) ?? null,
    district: (r.district as string) ?? null,
    fpsNo: (r.fps_no as string) ?? null,
    fpsName: (r.fps_name as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function getHouseholdRow(deviceId: string, id: string, includeDeleted = false): Row | undefined {
  return getDb()
    .prepare(`SELECT * FROM households WHERE id = ? AND device_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`)
    .get(id, deviceId) as Row | undefined;
}

export function getHousehold(deviceId: string, id: string): Household | null {
  const r = getHouseholdRow(deviceId, id);
  return r ? rowToHousehold(r) : null;
}

export function listHouseholds(deviceId: string): Household[] {
  return (getDb()
    .prepare('SELECT * FROM households WHERE device_id = ? AND deleted_at IS NULL ORDER BY created_at')
    .all(deviceId) as Row[]).map(rowToHousehold);
}

/** Redacts Aadhaar/VID-like numbers from free-text fields; returns warnings if anything was removed. */
export function redactFields<T extends Record<string, unknown>>(obj: T, keys: Array<keyof T>, warnings: ApiWarning[]): T {
  const out = { ...obj };
  let total = 0;
  for (const k of keys) {
    const v = out[k];
    if (typeof v === 'string') {
      const r = redactSensitiveIds(v);
      total += r.count;
      (out as Record<string, unknown>)[k as string] = r.text;
    }
  }
  if (total > 0) {
    warnings.push({ code: 'SENSITIVE_ID_REDACTED', message: `Removed ${total} number(s) that looked like an Aadhaar number or VID.`, details: { count: total } });
  }
  return out;
}

export interface PutResult<T> {
  entity: T;
  created: boolean;
  stale: boolean;
  warnings: ApiWarning[];
}

export function putHousehold(deviceId: string, id: string, input: HouseholdInput): PutResult<Household> {
  return tx(() => {
    const db = getDb();
    const warnings: ApiWarning[] = [];
    const existing = db.prepare('SELECT * FROM households WHERE id = ?').get(id) as Row | undefined;
    if (existing && existing.device_id !== deviceId) throw new AppError(409, 'CONFLICT', 'This id is already in use');

    if (existing && isStale(input.clientUpdatedAt, existing.client_updated_at as string | null)) {
      warnings.push({ code: 'STALE_WRITE_IGNORED', message: 'A newer version exists on the server; your change was not applied.' });
      return { entity: rowToHousehold(existing), created: false, stale: true, warnings };
    }

    const clean = redactFields(
      { label: input.label ?? 'My household', cardName: input.cardName ?? null, district: input.district ?? null, fpsNo: input.fpsNo ?? null, fpsName: input.fpsName ?? null, sourceNote: input.rule.sourceNote ?? '' },
      ['label', 'cardName', 'district', 'fpsNo', 'fpsName', 'sourceNote'],
      warnings,
    );
    const rule: EntitlementRule = { ...input.rule, sourceNote: clean.sourceNote };
    const fingerprint = ruleFingerprint({ cardType: input.cardType, members: input.members, rule });
    const now = nowIso();

    // Core Principle 1: confirmation covers exactly the rule shown to the user. A write that
    // does not carry ruleConfirmed=true leaves the rule unconfirmed.
    let confirmedAt: string | null = null;
    if (input.ruleConfirmed) {
      const sameRule = existing && existing.rule_fingerprint === fingerprint && existing.rule_confirmed_at && !existing.deleted_at;
      confirmedAt = sameRule ? (existing!.rule_confirmed_at as string) : now;
    }

    if (existing) {
      db.prepare(`UPDATE households SET label=?, card_type=?, card_name=?, members=?, rule_json=?, rule_fingerprint=?, rule_confirmed_at=?,
        state_code=?, district=?, fps_no=?, fps_name=?, client_updated_at=?, updated_at=?, deleted_at=NULL WHERE id=?`).run(
        clean.label, input.cardType, clean.cardName, input.members, JSON.stringify(rule), fingerprint, confirmedAt,
        input.stateCode ?? null, clean.district, clean.fpsNo, clean.fpsName, input.clientUpdatedAt ?? now, now, id,
      );
    } else {
      db.prepare(`INSERT INTO households (id, device_id, label, card_type, card_name, members, rule_json, rule_fingerprint, rule_confirmed_at,
        state_code, district, fps_no, fps_name, client_updated_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, deviceId, clean.label, input.cardType, clean.cardName, input.members, JSON.stringify(rule), fingerprint, confirmedAt,
        input.stateCode ?? null, clean.district, clean.fpsNo, clean.fpsName, input.clientUpdatedAt ?? now, now, now,
      );
    }
    const row = db.prepare('SELECT * FROM households WHERE id = ?').get(id) as Row;
    return { entity: rowToHousehold(row), created: !existing, stale: false, warnings };
  });
}

export function deleteHousehold(deviceId: string, id: string): void {
  tx(() => {
    const db = getDb();
    const r = getHouseholdRow(deviceId, id);
    if (!r) throw new AppError(404, 'NOT_FOUND', 'Household not found');
    const now = nowIso();
    db.prepare('UPDATE households SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
    const checkIds = (db.prepare('SELECT id FROM checks WHERE household_id = ? AND deleted_at IS NULL').all(id) as Row[]).map((c) => c.id as string);
    for (const cid of checkIds) {
      db.prepare('UPDATE checks SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, cid);
      db.prepare('UPDATE records SET deleted_at = ?, updated_at = ? WHERE check_id = ? AND deleted_at IS NULL').run(now, now, cid);
    }
  });
}

/** True when the incoming client timestamp is older than the stored one (last-write-wins). */
export function isStale(incoming: string | undefined, stored: string | null): boolean {
  if (!incoming || !stored) return false;
  return Date.parse(incoming) < Date.parse(stored);
}
