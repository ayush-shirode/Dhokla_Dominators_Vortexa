import crypto from 'node:crypto';
import fs from 'node:fs';
import { Router } from 'express';
import { getDb, tx, type Row } from '../db/index.js';
import { deviceOf, h, nowIso, ok } from '../lib/http.js';
import { hashToken, requireDevice } from '../middleware/auth.js';
import { photoDir } from '../services/photos.js';

export const devicesRouter = Router();

devicesRouter.post('/devices', (_req, res) => {
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('base64url');
  const now = nowIso();
  getDb().prepare('INSERT INTO devices (id, token_hash, created_at, last_seen_at) VALUES (?,?,?,?)').run(id, hashToken(token), now, now);
  ok(res, { deviceId: id, token, createdAt: now }, { status: 201 });
});

devicesRouter.get('/devices/me', requireDevice, h((req, res) => {
  const id = deviceOf(req);
  const db = getDb();
  const d = db.prepare('SELECT created_at, last_seen_at FROM devices WHERE id = ?').get(id) as Row;
  const count = (sql: string) => (db.prepare(sql).get(id) as Row).n as number;
  ok(res, {
    deviceId: id,
    createdAt: d.created_at,
    lastSeenAt: d.last_seen_at,
    counts: {
      households: count('SELECT COUNT(*) n FROM households WHERE device_id = ? AND deleted_at IS NULL'),
      checks: count('SELECT COUNT(*) n FROM checks WHERE device_id = ? AND deleted_at IS NULL'),
      records: count('SELECT COUNT(*) n FROM records WHERE device_id = ? AND deleted_at IS NULL'),
      photos: count('SELECT COUNT(*) n FROM photos WHERE device_id = ?'),
    },
  });
}));

/** Right to erasure: hard-deletes every row and photo belonging to this device. */
devicesRouter.delete('/devices/me', requireDevice, h((req, res) => {
  const id = deviceOf(req);
  tx(() => {
    const db = getDb();
    for (const t of ['records', 'checks', 'households', 'drafts', 'grievance_drafts', 'filings', 'photos']) {
      db.prepare(`DELETE FROM ${t} WHERE device_id = ?`).run(id);
    }
    db.prepare('DELETE FROM report_translations WHERE report_id IN (SELECT id FROM reports WHERE device_id = ?)').run(id);
    db.prepare('DELETE FROM reports WHERE device_id = ?').run(id);
    db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  });
  fs.rmSync(photoDir(id), { recursive: true, force: true });
  ok(res, { deleted: true });
}));
