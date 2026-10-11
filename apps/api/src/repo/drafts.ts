import crypto from 'node:crypto';
import type { AiDraft, AiEngine, ApiWarning, DraftKind, LanguageCode } from '@repo/shared';
import { getDb, type Row } from '../db/index.js';
import { AppError, nowIso } from '../lib/http.js';

function rowToDraft(r: Row): AiDraft {
  return {
    id: r.id as string,
    kind: r.kind as DraftKind,
    status: r.status as AiDraft['status'],
    checkId: (r.check_id as string) ?? null,
    photoId: (r.photo_id as string) ?? null,
    engine: r.engine as AiEngine,
    warnings: JSON.parse(r.warnings_json as string) as ApiWarning[],
    readBack: JSON.parse(r.read_back_json as string) as { language: LanguageCode; text: string },
    result: JSON.parse(r.result_json as string),
    createdAt: r.created_at as string,
    resolvedAt: (r.resolved_at as string) ?? null,
  } as AiDraft;
}

export function createDraft(
  deviceId: string,
  d: {
    kind: DraftKind;
    checkId: string | null;
    photoId: string | null;
    engine: AiEngine;
    result: unknown;
    warnings: ApiWarning[];
    readBack: { language: LanguageCode; text: string };
  },
): AiDraft {
  const id = `d_${crypto.randomUUID().replace(/-/g, '')}`;
  getDb()
    .prepare(`INSERT INTO drafts (id, device_id, kind, status, check_id, photo_id, engine, result_json, warnings_json, read_back_json, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, deviceId, d.kind, 'pending', d.checkId, d.photoId, d.engine, JSON.stringify(d.result), JSON.stringify(d.warnings), JSON.stringify(d.readBack), nowIso());
  return getDraft(deviceId, id)!;
}

export function getDraft(deviceId: string, id: string): AiDraft | null {
  const r = getDb().prepare('SELECT * FROM drafts WHERE id = ? AND device_id = ?').get(id, deviceId) as Row | undefined;
  return r ? rowToDraft(r) : null;
}

export function requirePendingDraft(deviceId: string, id: string): AiDraft {
  const d = getDraft(deviceId, id);
  if (!d) throw new AppError(404, 'NOT_FOUND', 'Draft not found');
  if (d.status !== 'pending') throw new AppError(409, 'DRAFT_NOT_PENDING', `Draft is already ${d.status}`);
  return d;
}

export function resolveDraft(deviceId: string, id: string, status: 'confirmed' | 'rejected'): AiDraft {
  getDb().prepare('UPDATE drafts SET status = ?, resolved_at = ? WHERE id = ? AND device_id = ?').run(status, nowIso(), id, deviceId);
  return getDraft(deviceId, id)!;
}
