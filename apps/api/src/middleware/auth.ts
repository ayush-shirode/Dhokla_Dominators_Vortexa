import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { AppError } from '../lib/http.js';
import { config } from '../config.js';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Bearer-token device auth. Tokens are random 256-bit values; only their SHA-256 is stored. */
export function requireDevice(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,200})$/.exec(header);
  if (!m) return next(new AppError(401, 'UNAUTHORIZED', 'Missing or malformed device token'));
  const row = getDb()
    .prepare('SELECT id, last_seen_at FROM devices WHERE token_hash = ?')
    .get(hashToken(m[1]!)) as { id: string; last_seen_at: string } | undefined;
  if (!row) return next(new AppError(401, 'UNAUTHORIZED', 'Unknown device token'));
  (req as Request & { deviceId?: string }).deviceId = row.id;
  // Update last-seen at most once a minute.
  if (Date.now() - Date.parse(row.last_seen_at) > 60_000) {
    getDb().prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const token = req.header('x-admin-token') ?? '';
  if (!config.adminToken || config.adminToken === 'change-me' || token.length === 0) {
    return next(new AppError(403, 'FORBIDDEN', 'Admin endpoints are disabled or the token is missing'));
  }
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(hashToken(config.adminToken));
  if (!crypto.timingSafeEqual(a, b)) return next(new AppError(403, 'FORBIDDEN', 'Invalid admin token'));
  next();
}
