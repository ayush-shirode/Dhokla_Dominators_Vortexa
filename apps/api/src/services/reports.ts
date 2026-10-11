import crypto from 'node:crypto';
import {
  buildReportSnapshot,
  canonicalJson,
  checkNeutrality,
  generateGrievanceDescription,
  isTemplateLanguage,
  renderReportText,
  type LanguageCode,
  type Report,
  type ReportSnapshot,
  type ReportTranslation,
  type TemplateLanguage,
} from '@repo/shared';
import { getDb, tx, type Row } from '../db/index.js';
import { AppError, nowIso } from '../lib/http.js';
import { getFiling, listRecords, requireConfirmedContext } from '../repo/checks.js';

function translationsFor(reportId: string): ReportTranslation[] {
  return (getDb().prepare('SELECT * FROM report_translations WHERE report_id = ? ORDER BY confirmed_at').all(reportId) as Row[]).map((t) => ({
    id: t.id as string,
    language: t.language as LanguageCode,
    text: t.text as string,
    confirmedAt: t.confirmed_at as string,
    draftId: t.draft_id as string,
  }));
}

function rowToReport(r: Row): Report {
  return {
    id: r.id as string,
    checkId: r.check_id as string,
    householdId: r.household_id as string,
    version: r.version as number,
    language: r.language as TemplateLanguage,
    createdAt: r.created_at as string,
    contentHash: r.content_hash as string,
    snapshot: JSON.parse(r.snapshot_json as string) as ReportSnapshot,
    text: r.text as string,
    translations: translationsFor(r.id as string),
  };
}

export function getReport(deviceId: string, id: string): Report | null {
  const r = getDb().prepare('SELECT * FROM reports WHERE id = ? AND device_id = ?').get(id, deviceId) as Row | undefined;
  return r ? rowToReport(r) : null;
}

export function requireReport(deviceId: string, id: string): Report {
  const r = getReport(deviceId, id);
  if (!r) throw new AppError(404, 'NOT_FOUND', 'Report not found');
  return r;
}

export function latestReport(deviceId: string, checkId: string): Report | null {
  const r = getDb()
    .prepare('SELECT * FROM reports WHERE check_id = ? AND device_id = ? ORDER BY version DESC LIMIT 1')
    .get(checkId, deviceId) as Row | undefined;
  return r ? rowToReport(r) : null;
}

export function listReports(deviceId: string, checkId: string) {
  return (getDb()
    .prepare('SELECT id, version, language, created_at, content_hash FROM reports WHERE check_id = ? AND device_id = ? ORDER BY version DESC')
    .all(checkId, deviceId) as Row[]).map((r) => ({
    id: r.id as string,
    version: r.version as number,
    language: r.language as TemplateLanguage,
    createdAt: r.created_at as string,
    contentHash: r.content_hash as string,
  }));
}

export function contentHashOf(snapshot: ReportSnapshot): string {
  return crypto.createHash('sha256').update(canonicalJson(snapshot)).digest('hex');
}

/** Creates an immutable report snapshot. Arithmetic comes from the shared engine only. */
export function createReport(deviceId: string, checkId: string, language: TemplateLanguage): Report {
  return tx(() => {
    const { check, household } = requireConfirmedContext(deviceId, checkId);
    const records = listRecords(deviceId, checkId);

    // Core Principle 6: household-written evidence must be neutral before it goes into a report.
    const flagged = records
      .filter((r) => (r.evidenceType === 'note' || r.evidenceType === 'photo') && r.evidenceContent)
      .map((r) => ({ recordId: r.id, flaggedTerms: checkNeutrality(r.evidenceContent!).flaggedTerms }))
      .filter((x) => x.flaggedTerms.length > 0);
    if (flagged.length) {
      throw new AppError(422, 'NEUTRALITY_CHECK_FAILED', 'Some notes say who caused a difference. Please edit them to describe only what was received.', { records: flagged });
    }

    const snapshot = buildReportSnapshot({ household, period: check.period, records, ruleConfirmedAt: household.ruleConfirmedAt! });
    const contentHash = contentHashOf(snapshot);
    const db = getDb();
    const version = (((db.prepare('SELECT MAX(version) AS v FROM reports WHERE check_id = ?').get(checkId) as Row).v as number | null) ?? 0) + 1;
    const id = crypto.randomUUID();
    const text = renderReportText(snapshot, language, { reportId: id, version, contentHash });
    db.prepare(`INSERT INTO reports (id, device_id, check_id, household_id, version, language, snapshot_json, content_hash, text, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, deviceId, checkId, household.id, version, language, JSON.stringify(snapshot), contentHash, text, nowIso());

    // Keep a generated (not user-edited / translated) grievance description in step with the newest report.
    const g = db.prepare('SELECT description_language, description_source FROM grievance_drafts WHERE check_id = ?').get(checkId) as Row | undefined;
    if (g && g.description_source === 'generated' && isTemplateLanguage(g.description_language as string)) {
      const desc = generateGrievanceDescription(snapshot, g.description_language as TemplateLanguage, { reportId: id, contentHash });
      db.prepare('UPDATE grievance_drafts SET description = ?, based_on_report_id = ?, updated_at = ? WHERE check_id = ?').run(desc, id, nowIso(), checkId);
    }
    return getReport(deviceId, id)!;
  });
}

/** Text of a report in a language: deterministic for en/hi, else a user-confirmed translation. */
export function reportTextIn(deviceId: string, report: Report, lang?: LanguageCode): { text: string; language: LanguageCode } {
  const filing = getFiling(deviceId, report.checkId);
  const extras = { reportId: report.id, version: report.version, contentHash: report.contentHash, filing };
  const target = lang ?? report.language;
  if (isTemplateLanguage(target)) return { text: renderReportText(report.snapshot, target, extras), language: target };
  const tr = report.translations.filter((t) => t.language === target).at(-1);
  if (!tr) {
    throw new AppError(422, 'UNSUPPORTED_LANGUAGE', `No confirmed ${target} translation exists for this report. Translate it first, or export in English or Hindi.`);
  }
  const footer = [
    '',
    '────────────────────────────────────────────────────────────',
    `Translated from the ${report.language === 'hi' ? 'Hindi' : 'English'} original with AI assistance and confirmed by the household on ${tr.confirmedAt.slice(0, 10)}. The original report is authoritative.`,
    filing ? `FILED — grievance reference ${filing.referenceNumber}, filed on ${filing.filedDate}` : null,
    `Report ID: ${report.id} · Version ${report.version} · SHA-256: ${report.contentHash}`,
  ].filter((l): l is string => l !== null);
  return { text: `${tr.text}\n${footer.join('\n')}`, language: target };
}

export function saveReportTranslation(reportId: string, language: LanguageCode, text: string, draftId: string): string {
  const id = crypto.randomUUID();
  getDb().prepare('DELETE FROM report_translations WHERE report_id = ? AND language = ?').run(reportId, language);
  getDb()
    .prepare('INSERT INTO report_translations (id, report_id, language, text, draft_id, confirmed_at) VALUES (?,?,?,?,?,?)')
    .run(id, reportId, language, text, draftId, nowIso());
  return id;
}
