/** Offline sync: idempotent batched writes + snapshot/delta reads (last-write-wins on clientUpdatedAt). */
import { Router } from 'express';
import { z } from 'zod';
import type { SyncOperationResult, SyncSnapshot } from '@repo/shared';
import { getDb, type Row } from '../db/index.js';
import { AppError, deviceOf, h, ok, parse, zodDetails } from '../lib/http.js';
import { checkInputSchema, householdInputSchema, idSchema, recordInputSchema } from '../lib/schemas.js';
import { deleteCheck, deleteRecord, getCheck, getRecord, listChecks, listRecords, putCheck, putRecord } from '../repo/checks.js';
import { deleteHousehold, getHousehold, listHouseholds, putHousehold, rowToHousehold } from '../repo/households.js';

export const syncRouter = Router();

syncRouter.get('/sync/snapshot', h((req, res) => {
  const d = deviceOf(req);
  const since = typeof req.query.since === 'string' && !Number.isNaN(Date.parse(req.query.since)) ? new Date(req.query.since).toISOString() : null;
  const serverTime = new Date().toISOString();
  const db = getDb();
  const households = since
    ? (db.prepare('SELECT * FROM households WHERE device_id = ? AND deleted_at IS NULL AND updated_at > ?').all(d, since) as Row[]).map(rowToHousehold)
    : listHouseholds(d);
  const allChecks = listChecks(d);
  const checks = allChecks.filter((c) => !since || c.updatedAt > since);
  const records = allChecks.flatMap((c) => listRecords(d, c.id)).filter((r) => !since || r.updatedAt > since);
  const deleted: SyncSnapshot['deleted'] = [];
  if (since) {
    for (const [entity, table] of [['household', 'households'], ['check', 'checks'], ['record', 'records']] as const) {
      for (const r of db.prepare(`SELECT id, deleted_at FROM ${table} WHERE device_id = ? AND deleted_at > ?`).all(d, since) as Row[]) {
        deleted.push({ entity, id: r.id as string, deletedAt: r.deleted_at as string });
      }
    }
  }
  const snapshot: SyncSnapshot = { serverTime, households, checks, records, deleted };
  ok(res, snapshot);
}));

const opSchema = z.object({
  opId: z.string().min(1).max(64),
  entity: z.enum(['household', 'check', 'record']),
  action: z.enum(['put', 'delete']),
  id: idSchema,
  body: z.unknown().optional(),
  clientUpdatedAt: z.iso.datetime({ offset: true }),
});
const batchSchema = z.object({ operations: z.array(opSchema).min(1).max(200) });

syncRouter.post('/sync/batch', h((req, res) => {
  const d = deviceOf(req);
  const { operations } = parse(batchSchema, req.body);
  const results: SyncOperationResult[] = operations.map((op) => {
    try {
      if (op.action === 'delete') {
        const exists =
          op.entity === 'household' ? getHousehold(d, op.id) : op.entity === 'check' ? getCheck(d, op.id) : getRecord(d, op.id);
        if (exists) {
          if (op.entity === 'household') deleteHousehold(d, op.id);
          else if (op.entity === 'check') deleteCheck(d, op.id);
          else deleteRecord(d, op.id);
        }
        return { opId: op.opId, status: 'applied', entity: null };
      }
      const withTs = { ...(op.body as object), clientUpdatedAt: op.clientUpdatedAt };
      const parseOrThrow = <T extends z.ZodType>(s: T) => {
        const r = s.safeParse(withTs);
        if (!r.success) throw new AppError(400, 'VALIDATION_FAILED', 'Request validation failed', zodDetails(r.error));
        return r.data as z.infer<T>;
      };
      const put =
        op.entity === 'household'
          ? putHousehold(d, op.id, parseOrThrow(householdInputSchema))
          : op.entity === 'check'
            ? putCheck(d, op.id, parseOrThrow(checkInputSchema))
            : putRecord(d, op.id, parseOrThrow(recordInputSchema));
      return { opId: op.opId, status: put.stale ? 'stale' : 'applied', entity: put.entity };
    } catch (e) {
      if (e instanceof AppError) return { opId: op.opId, status: 'error', error: { code: e.code, message: e.message, details: e.details } };
      throw e;
    }
  });
  ok(res, { results, serverTime: new Date().toISOString() });
}));
