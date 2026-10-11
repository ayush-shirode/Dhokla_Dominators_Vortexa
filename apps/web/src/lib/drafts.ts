import { api } from './api';
import { saveLocalRecord } from './db';
import type { LocalRecord } from './localTypes';

/** Drafts created by the API have ids starting with "d_"; local drafts use random UUIDs. */
export function isServerDraft(draftId: string): boolean {
  return draftId.startsWith('d_');
}

/**
 * Saves a record the user confirmed from a draft. For server drafts it first calls
 * POST /ai/drafts/:id/confirm so the server records which machine-read fields were checked;
 * offline, the record is still saved locally and synced later.
 */
export async function saveConfirmedDraft(draftId: string, record: LocalRecord): Promise<LocalRecord> {
  let saved: LocalRecord = record;
  if (isServerDraft(draftId)) {
    try {
      const res = await api.ai.confirmDraft(draftId, { record });
      if (res.record) saved = res.record;
    } catch {
      /* offline or draft expired: keep the user's values */
    }
  }
  await saveLocalRecord(saved);
  return saved;
}
