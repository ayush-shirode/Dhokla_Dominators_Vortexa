import type { GrievanceChannel, GrievanceChannelInput } from '@repo/shared';
import { getDb, type Row } from '../db/index.js';
import { AppError, nowIso } from '../lib/http.js';

function rowToChannel(r: Row): GrievanceChannel {
  return {
    id: r.id as string,
    scope: r.scope as GrievanceChannel['scope'],
    stateCode: (r.state_code as string) ?? null,
    name: r.name as string,
    kind: r.kind as GrievanceChannel['kind'],
    value: r.value as string,
    notes: r.notes as string,
    acceptedLanguages: r.accepted_languages_json ? (JSON.parse(r.accepted_languages_json as string) as string[]) : null,
    sourceUrl: (r.source_url as string) ?? null,
    sourceNote: r.source_note as string,
    lastVerified: (r.last_verified as string) ?? null,
    verificationStatus: r.verification_status as GrievanceChannel['verificationStatus'],
    updatedAt: r.updated_at as string,
  };
}

export function listChannels(stateCode?: string): GrievanceChannel[] {
  const rows = stateCode
    ? getDb().prepare("SELECT * FROM channels WHERE scope = 'national' OR state_code = ? ORDER BY scope DESC, kind, name").all(stateCode)
    : getDb().prepare('SELECT * FROM channels ORDER BY scope DESC, state_code, kind, name').all();
  return (rows as Row[]).map(rowToChannel);
}

export function getChannel(id: string): GrievanceChannel | null {
  const r = getDb().prepare('SELECT * FROM channels WHERE id = ?').get(id) as Row | undefined;
  return r ? rowToChannel(r) : null;
}

export function putChannel(id: string, c: GrievanceChannelInput): { channel: GrievanceChannel; created: boolean } {
  if (c.scope === 'state' && !c.stateCode) throw new AppError(400, 'VALIDATION_FAILED', 'State channels need a stateCode');
  const existed = Boolean(getChannel(id));
  getDb()
    .prepare(`INSERT INTO channels (id, scope, state_code, name, kind, value, notes, accepted_languages_json, source_url, source_note, last_verified, verification_status, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET scope=excluded.scope, state_code=excluded.state_code, name=excluded.name, kind=excluded.kind,
        value=excluded.value, notes=excluded.notes, accepted_languages_json=excluded.accepted_languages_json, source_url=excluded.source_url,
        source_note=excluded.source_note, last_verified=excluded.last_verified, verification_status=excluded.verification_status, updated_at=excluded.updated_at`)
    .run(
      id, c.scope, c.scope === 'national' ? null : c.stateCode, c.name, c.kind, c.value, c.notes,
      c.acceptedLanguages ? JSON.stringify(c.acceptedLanguages) : null, c.sourceUrl, c.sourceNote, c.lastVerified, c.verificationStatus, nowIso(),
    );
  return { channel: getChannel(id)!, created: !existed };
}

export function deleteChannel(id: string): void {
  const r = getDb().prepare('DELETE FROM channels WHERE id = ?').run(id);
  if (r.changes === 0) throw new AppError(404, 'NOT_FOUND', 'Channel not found');
}
