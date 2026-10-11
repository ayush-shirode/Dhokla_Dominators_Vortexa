import {
  assessRecord,
  checkNeutrality,
  computeSummary,
  gramsToKg,
  kgToGrams,
  periodBounds,
  type AiAssistInfo,
  type ApiWarning,
  type Check,
  type CheckInput,
  type CheckStatus,
  type DiscrepancySummary,
  type DistributionRecord,
  type Filing,
  type Household,
  type RecordInput,
  LIMITS,
} from '@repo/shared';
import { getDb, tx, type Row } from '../db/index.js';
import { AppError, nowIso } from '../lib/http.js';
import { getHousehold, isStale, redactFields, type PutResult } from './households.js';

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export function rowToFiling(r: Row): Filing {
  return {
    id: r.id as string,
    checkId: r.check_id as string,
    reportId: (r.report_id as string) ?? null,
    referenceNumber: r.reference_number as string,
    filedDate: r.filed_date as string,
    portalUrl: (r.portal_url as string) ?? null,
    channelId: (r.channel_id as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function getFiling(deviceId: string, checkId: string): Filing | null {
  const r = getDb().prepare('SELECT * FROM filings WHERE check_id = ? AND device_id = ?').get(checkId, deviceId) as Row | undefined;
  return r ? rowToFiling(r) : null;
}

function rowToCheck(r: Row): Check {
  const db = getDb();
  const filingRow = db.prepare('SELECT * FROM filings WHERE check_id = ?').get(r.id as string) as Row | undefined;
  const latest = db
    .prepare('SELECT id FROM reports WHERE check_id = ? ORDER BY version DESC LIMIT 1')
    .get(r.id as string) as Row | undefined;
  const status: CheckStatus = filingRow ? 'filed' : latest ? 'reported' : 'open';
  return {
    id: r.id as string,
    householdId: r.household_id as string,
    period: r.period as string,
    status,
    latestReportId: (latest?.id as string) ?? null,
    filing: filingRow ? rowToFiling(filingRow) : null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function getCheckRow(deviceId: string, id: string): Row | undefined {
  return getDb().prepare('SELECT * FROM checks WHERE id = ? AND device_id = ? AND deleted_at IS NULL').get(id, deviceId) as Row | undefined;
}

export function getCheck(deviceId: string, id: string): Check | null {
  const r = getCheckRow(deviceId, id);
  return r ? rowToCheck(r) : null;
}

export function requireCheck(deviceId: string, id: string): Check {
  const c = getCheck(deviceId, id);
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Check not found');
  return c;
}

export function listChecks(deviceId: string, householdId?: string): Check[] {
  const rows = householdId
    ? getDb().prepare('SELECT * FROM checks WHERE device_id = ? AND household_id = ? AND deleted_at IS NULL ORDER BY period DESC').all(deviceId, householdId)
    : getDb().prepare('SELECT * FROM checks WHERE device_id = ? AND deleted_at IS NULL ORDER BY period DESC').all(deviceId);
  return (rows as Row[]).map(rowToCheck);
}

export function putCheck(deviceId: string, id: string, input: CheckInput): PutResult<Check> {
  return tx(() => {
    const db = getDb();
    const warnings: ApiWarning[] = [];
    const existing = db.prepare('SELECT * FROM checks WHERE id = ?').get(id) as Row | undefined;
    if (existing && existing.device_id !== deviceId) throw new AppError(409, 'CONFLICT', 'This id is already in use');
    if (existing && isStale(input.clientUpdatedAt, existing.client_updated_at as string | null)) {
      warnings.push({ code: 'STALE_WRITE_IGNORED', message: 'A newer version exists on the server; your change was not applied.' });
      return { entity: rowToCheck(existing), created: false, stale: true, warnings };
    }
    if (!getHousehold(deviceId, input.householdId)) throw new AppError(404, 'NOT_FOUND', 'Household not found');
    if (existing && existing.household_id !== input.householdId) {
      throw new AppError(400, 'VALIDATION_FAILED', 'A check cannot be moved to another household', [{ path: 'householdId', message: 'cannot change' }]);
    }
    const dup = db
      .prepare('SELECT id FROM checks WHERE household_id = ? AND period = ? AND deleted_at IS NULL AND id != ?')
      .get(input.householdId, input.period, id) as Row | undefined;
    if (dup) throw new AppError(409, 'CONFLICT', 'A check for this household and period already exists', { existingCheckId: dup.id });

    const now = nowIso();
    if (existing) {
      db.prepare('UPDATE checks SET period = ?, client_updated_at = ?, updated_at = ?, deleted_at = NULL WHERE id = ?').run(
        input.period, input.clientUpdatedAt ?? now, now, id,
      );
    } else {
      db.prepare('INSERT INTO checks (id, device_id, household_id, period, status, client_updated_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)').run(
        id, deviceId, input.householdId, input.period, 'open', input.clientUpdatedAt ?? now, now, now,
      );
    }
    return { entity: rowToCheck(db.prepare('SELECT * FROM checks WHERE id = ?').get(id) as Row), created: !existing, stale: false, warnings };
  });
}

export function deleteCheck(deviceId: string, id: string): void {
  tx(() => {
    if (!getCheckRow(deviceId, id)) throw new AppError(404, 'NOT_FOUND', 'Check not found');
    const now = nowIso();
    getDb().prepare('UPDATE checks SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
    getDb().prepare('UPDATE records SET deleted_at = ?, updated_at = ? WHERE check_id = ? AND deleted_at IS NULL').run(now, now, id);
  });
}

/** Household + check, with the rule-confirmed requirement (Core Principle 1). */
export function requireConfirmedContext(deviceId: string, checkId: string): { check: Check; household: Household } {
  const check = requireCheck(deviceId, checkId);
  const household = getHousehold(deviceId, check.householdId);
  if (!household) throw new AppError(404, 'NOT_FOUND', 'Household not found');
  if (!household.ruleConfirmed || !household.ruleConfirmedAt) {
    throw new AppError(409, 'RULE_NOT_CONFIRMED', 'The entitlement rule has not been confirmed by the user yet', { householdId: household.id });
  }
  return { check, household };
}

export function summaryFor(deviceId: string, checkId: string): DiscrepancySummary {
  const { check, household } = requireConfirmedContext(deviceId, checkId);
  return computeSummary({ household, period: check.period, records: listRecords(deviceId, checkId) });
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

function rowToRecord(r: Row, period: string | null): DistributionRecord {
  const base = {
    id: r.id as string,
    checkId: r.check_id as string,
    date: r.date as string,
    quantityKg: gramsToKg(r.quantity_g as number),
    commodity: (r.commodity as DistributionRecord['commodity']) ?? null,
    evidenceType: r.evidence_type as DistributionRecord['evidenceType'],
    evidenceContent: (r.evidence_content as string) ?? null,
    photoId: (r.photo_id as string) ?? null,
    unclear: r.unclear === 1,
    createdVia: r.created_via as DistributionRecord['createdVia'],
    confirmed: true as const,
    aiAssist: r.ai_assist_json ? (JSON.parse(r.ai_assist_json as string) as AiAssistInfo) : null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
  const labels = period ? assessRecord(base, period).labels : [];
  return { ...base, labels };
}

function periodOfCheck(checkId: string): string | null {
  const r = getDb().prepare('SELECT period FROM checks WHERE id = ?').get(checkId) as Row | undefined;
  return (r?.period as string) ?? null;
}

export function listRecords(deviceId: string, checkId: string): DistributionRecord[] {
  const period = periodOfCheck(checkId);
  return (getDb()
    .prepare('SELECT * FROM records WHERE check_id = ? AND device_id = ? AND deleted_at IS NULL ORDER BY date, id')
    .all(checkId, deviceId) as Row[]).map((r) => rowToRecord(r, period));
}

export function getRecord(deviceId: string, id: string): DistributionRecord | null {
  const r = getDb().prepare('SELECT * FROM records WHERE id = ? AND device_id = ? AND deleted_at IS NULL').get(id, deviceId) as Row | undefined;
  return r ? rowToRecord(r, periodOfCheck(r.check_id as string)) : null;
}

/** Evidence types whose text is written by the household (and so must be neutral). */
const USER_AUTHORED: ReadonlySet<string> = new Set(['note', 'photo']);

export function putRecord(deviceId: string, id: string, input: RecordInput): PutResult<DistributionRecord> {
  return tx(() => {
    const db = getDb();
    const warnings: ApiWarning[] = [];
    const existing = db.prepare('SELECT * FROM records WHERE id = ?').get(id) as Row | undefined;
    if (existing && existing.device_id !== deviceId) throw new AppError(409, 'CONFLICT', 'This id is already in use');
    const check = getCheckRow(deviceId, input.checkId);
    if (!check) throw new AppError(404, 'NOT_FOUND', 'Check not found');
    if (existing && isStale(input.clientUpdatedAt, existing.client_updated_at as string | null)) {
      warnings.push({ code: 'STALE_WRITE_IGNORED', message: 'A newer version exists on the server; your change was not applied.' });
      return { entity: rowToRecord(existing, check.period as string), created: false, stale: true, warnings };
    }

    // Evidence rules (Core Principle 3)
    const errs: Array<{ path: string; message: string }> = [];
    let content = input.evidenceContent?.trim() || null;
    const photoId = input.photoId || null;
    if (input.evidenceType === 'none') {
      if (content || photoId) errs.push({ path: 'evidenceType', message: 'evidence type "none" cannot carry evidence content or a photo' });
    } else if (input.evidenceType === 'photo') {
      if (!photoId) errs.push({ path: 'photoId', message: 'a photo is required for evidence type "photo"' });
    } else if (!content) {
      errs.push({ path: 'evidenceContent', message: `evidence content is required for evidence type "${input.evidenceType}"` });
    }
    const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);
    if (input.date > tomorrow) errs.push({ path: 'date', message: 'date cannot be in the future' });
    if (errs.length) throw new AppError(400, 'VALIDATION_FAILED', 'Record validation failed', errs);

    if (photoId) {
      const p = db.prepare('SELECT id FROM photos WHERE id = ? AND device_id = ?').get(photoId, deviceId);
      if (!p) throw new AppError(404, 'NOT_FOUND', 'Photo not found');
    }
    if (!existing || existing.deleted_at) {
      const n = (db.prepare('SELECT COUNT(*) AS n FROM records WHERE check_id = ? AND deleted_at IS NULL').get(input.checkId) as Row).n as number;
      if (n >= LIMITS.maxRecordsPerCheck) {
        throw new AppError(400, 'VALIDATION_FAILED', `A check can hold at most ${LIMITS.maxRecordsPerCheck} records`);
      }
    }

    if (content) {
      content = redactFields({ content }, ['content'], warnings).content;
      const n = checkNeutrality(content);
      if (!n.ok) {
        if (USER_AUTHORED.has(input.evidenceType)) {
          throw new AppError(422, 'NEUTRALITY_CHECK_FAILED', 'Please describe what was received, without saying who caused a difference. The report must stay neutral.', {
            flaggedTerms: n.flaggedTerms,
          });
        }
        // Verbatim third-party text (SMS / receipt) is kept as evidence, quoted as provided.
        warnings.push({ code: 'NEUTRALITY_TERMS', message: 'This text contains words such as those in the details. It is kept verbatim as evidence and quoted as provided.', details: { flaggedTerms: n.flaggedTerms } });
      }
    }

    const { start, end } = periodBounds(check.period as string);
    if (input.date < start || input.date > end) {
      warnings.push({ code: 'RECORD_OUTSIDE_PERIOD', message: 'The date is outside the period being checked; the record will be labelled Late (still counted).' });
    }
    if (input.evidenceType === 'none') warnings.push({ code: 'NO_EVIDENCE', message: 'No evidence is linked; the record will be labelled Unrecorded and not counted.' });

    const aiAssist = input.aiAssist ?? null;
    let unclear = input.unclear;
    if (aiAssist && aiAssist.lowConfidenceFields.length > 0 && !aiAssist.userVerifiedLowConfidence) {
      unclear = true;
      warnings.push({ code: 'LOW_CONFIDENCE', message: `Machine-read values were not checked (${aiAssist.lowConfidenceFields.join(', ')}); the record is marked Unclear and not counted.` });
    }

    const now = nowIso();
    const values = [
      input.checkId, input.date, kgToGrams(input.quantityKg), input.commodity ?? null, input.evidenceType, content, photoId,
      unclear ? 1 : 0, input.createdVia, aiAssist ? JSON.stringify(aiAssist) : null, input.clientUpdatedAt ?? now,
    ];
    if (existing) {
      db.prepare(`UPDATE records SET check_id=?, date=?, quantity_g=?, commodity=?, evidence_type=?, evidence_content=?, photo_id=?,
        unclear=?, created_via=?, ai_assist_json=?, client_updated_at=?, updated_at=?, deleted_at=NULL WHERE id=?`).run(...values, now, id);
    } else {
      db.prepare(`INSERT INTO records (check_id, date, quantity_g, commodity, evidence_type, evidence_content, photo_id, unclear,
        created_via, ai_assist_json, client_updated_at, created_at, updated_at, id, device_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        ...values, now, now, id, deviceId,
      );
    }
    db.prepare('UPDATE checks SET updated_at = ? WHERE id = ?').run(now, input.checkId);
    const row = db.prepare('SELECT * FROM records WHERE id = ?').get(id) as Row;
    return { entity: rowToRecord(row, check.period as string), created: !existing, stale: false, warnings };
  });
}

export function deleteRecord(deviceId: string, id: string): void {
  const r = getDb().prepare('SELECT id FROM records WHERE id = ? AND device_id = ? AND deleted_at IS NULL').get(id, deviceId);
  if (!r) throw new AppError(404, 'NOT_FOUND', 'Record not found');
  const now = nowIso();
  getDb().prepare('UPDATE records SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
}
