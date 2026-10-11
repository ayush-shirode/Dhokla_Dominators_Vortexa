import crypto from 'node:crypto';
import {
  buildReportSnapshot,
  checkNeutrality,
  generateGrievanceDescription,
  grievanceCategory,
  languageName,
  redactSensitiveIds,
  stateName,
  todayIST,
  type ApiWarning,
  type CopyField,
  type Filing,
  type FilingInput,
  type GrievanceDraft,
  type GrievanceDraftInput,
  type LanguageAdvice,
  type LanguageCode,
  type TemplateLanguage,
} from '@repo/shared';
import { getDb, tx, type Row } from '../db/index.js';
import { DEFAULT_PORTAL_CHANNEL_ID } from '../db/seed.js';
import { AppError, nowIso } from '../lib/http.js';
import { getChannel, listChannels } from '../repo/channels.js';
import { getFiling, listRecords, requireCheck, requireConfirmedContext } from '../repo/checks.js';
import { getHousehold } from '../repo/households.js';
import { latestReport } from './reports.js';

function generate(deviceId: string, checkId: string, lang: TemplateLanguage): { description: string; reportId: string | null } {
  const { check, household } = requireConfirmedContext(deviceId, checkId);
  const report = latestReport(deviceId, checkId);
  if (report) {
    return { description: generateGrievanceDescription(report.snapshot, lang, { reportId: report.id, contentHash: report.contentHash }), reportId: report.id };
  }
  const snap = buildReportSnapshot({ household, period: check.period, records: listRecords(deviceId, checkId), ruleConfirmedAt: household.ruleConfirmedAt! });
  return { description: generateGrievanceDescription(snap, lang), reportId: null };
}

function languageAdviceFor(portalChannelId: string, descriptionLanguage: LanguageCode): LanguageAdvice {
  const ch = getChannel(portalChannelId);
  const accepted = ch?.acceptedLanguages ?? null;
  if (!accepted) {
    return {
      portalAcceptsVernacular: null,
      acceptedLanguages: null,
      message:
        descriptionLanguage === 'en'
          ? 'We do not know which languages this portal accepts for the complaint text. English is the safest choice.'
          : `We do not know whether this portal accepts complaint text in ${languageName(descriptionLanguage)}. Check on the portal; English is the safest choice.`,
      sourceChannelId: ch?.id ?? null,
    };
  }
  const vernacular = accepted.some((l) => l !== 'en');
  return {
    portalAcceptsVernacular: vernacular,
    acceptedLanguages: accepted,
    message: accepted.includes(descriptionLanguage)
      ? `This portal is listed as accepting ${languageName(descriptionLanguage)} (source: channel directory).`
      : `This portal is listed as accepting: ${accepted.join(', ')}. Use one of these for the description.`,
    sourceChannelId: ch?.id ?? null,
  };
}

function toDraft(deviceId: string, row: Row): GrievanceDraft {
  const checkId = row.check_id as string;
  const check = requireCheck(deviceId, checkId);
  const household = getHousehold(deviceId, check.householdId)!;
  const stateCode = (row.state_code as string) ?? household.stateCode;
  const district = (row.district as string) ?? household.district;
  const fpsNo = (row.fps_no as string) ?? household.fpsNo;
  const fpsName = (row.fps_name as string) ?? household.fpsName;
  const lang = row.description_language as LanguageCode;
  const category = grievanceCategory('en');
  const portalId = (row.portal_channel_id as string) ?? DEFAULT_PORTAL_CHANNEL_ID;
  const portal = getChannel(portalId) ?? getChannel(DEFAULT_PORTAL_CHANNEL_ID)!;
  const status = listChannels(stateCode ?? undefined).find((c) => c.kind === 'status_check' && (c.scope === portal.scope || c.stateCode === stateCode));

  const copyFields: CopyField[] = [
    { key: 'state', label: 'State', value: stateName(stateCode), clientOnly: false },
    { key: 'district', label: 'District', value: district, clientOnly: false },
    { key: 'rationCardNo', label: 'Ration card number', value: null, clientOnly: true },
    { key: 'fpsNo', label: 'Fair price shop (FPS) number', value: fpsNo, clientOnly: false },
    { key: 'fpsName', label: 'Fair price shop (FPS) name', value: fpsName, clientOnly: false },
    { key: 'category', label: 'Problem category', value: category.label, clientOnly: false },
    { key: 'description', label: 'Problem description', value: row.description as string, clientOnly: false },
  ];

  return {
    checkId,
    stateCode: stateCode ?? null,
    stateName: stateName(stateCode),
    district: district ?? null,
    fpsNo: fpsNo ?? null,
    fpsName: fpsName ?? null,
    rationCardNo: null,
    category,
    description: row.description as string,
    descriptionLanguage: lang,
    descriptionSource: row.description_source as GrievanceDraft['descriptionSource'],
    basedOnReportId: (row.based_on_report_id as string) ?? null,
    languageAdvice: languageAdviceFor(portal.id, lang),
    portal: { name: portal.name, url: portal.value, statusUrl: status?.value ?? null, channelId: portal.id },
    copyFields,
    updatedAt: row.updated_at as string,
  };
}

function draftRow(checkId: string): Row | undefined {
  return getDb().prepare('SELECT * FROM grievance_drafts WHERE check_id = ?').get(checkId) as Row | undefined;
}

export function getOrCreateGrievance(deviceId: string, checkId: string): { draft: GrievanceDraft; warnings: ApiWarning[] } {
  return tx(() => {
    requireConfirmedContext(deviceId, checkId);
    if (!draftRow(checkId)) {
      const { description, reportId } = generate(deviceId, checkId, 'en');
      getDb()
        .prepare(`INSERT INTO grievance_drafts (check_id, device_id, description, description_language, description_source, based_on_report_id, portal_channel_id, updated_at)
          VALUES (?,?,?,?,?,?,?,?)`)
        .run(checkId, deviceId, description, 'en', 'generated', reportId, DEFAULT_PORTAL_CHANNEL_ID, nowIso());
    }
    const draft = toDraft(deviceId, draftRow(checkId)!);
    return { draft, warnings: adviceWarnings(draft) };
  });
}

function adviceWarnings(d: GrievanceDraft): ApiWarning[] {
  if (d.descriptionLanguage !== 'en' && d.languageAdvice.portalAcceptsVernacular === null) {
    return [{ code: 'LANGUAGE_ACCEPTANCE_UNKNOWN', message: d.languageAdvice.message }];
  }
  return [];
}

export function updateGrievance(deviceId: string, checkId: string, input: GrievanceDraftInput): { draft: GrievanceDraft; warnings: ApiWarning[] } {
  return tx(() => {
    getOrCreateGrievance(deviceId, checkId);
    const warnings: ApiWarning[] = [];
    const sets: string[] = [];
    const vals: Array<string | null> = [];
    const set = (col: string, v: string | null) => {
      sets.push(`${col} = ?`);
      vals.push(v);
    };
    const redact = (v: string | null | undefined) => {
      if (v === undefined || v === null) return v ?? null;
      const r = redactSensitiveIds(v);
      if (r.count) warnings.push({ code: 'SENSITIVE_ID_REDACTED', message: 'Removed a number that looked like an Aadhaar number.' });
      return r.text;
    };
    if (input.stateCode !== undefined) set('state_code', input.stateCode);
    if (input.district !== undefined) set('district', redact(input.district));
    if (input.fpsNo !== undefined) set('fps_no', redact(input.fpsNo));
    if (input.fpsName !== undefined) set('fps_name', redact(input.fpsName));
    if (input.portalChannelId !== undefined) {
      const ch = getChannel(input.portalChannelId);
      if (!ch || ch.kind !== 'portal') throw new AppError(400, 'VALIDATION_FAILED', 'portalChannelId must be a portal channel');
      set('portal_channel_id', ch.id);
    }
    if (input.description !== undefined) {
      const desc = redact(input.description)!;
      const n = checkNeutrality(desc);
      if (!n.ok) {
        throw new AppError(422, 'NEUTRALITY_CHECK_FAILED', 'Please describe the difference without saying who caused it. The description must stay neutral.', {
          flaggedTerms: n.flaggedTerms,
        });
      }
      set('description', desc);
      set('description_source', 'user_edited');
    }
    if (sets.length) {
      set('updated_at', nowIso());
      getDb().prepare(`UPDATE grievance_drafts SET ${sets.join(', ')} WHERE check_id = ?`).run(...vals, checkId);
    }
    const draft = toDraft(deviceId, draftRow(checkId)!);
    return { draft, warnings: [...warnings, ...adviceWarnings(draft)] };
  });
}

export function regenerateGrievance(deviceId: string, checkId: string, lang: TemplateLanguage): { draft: GrievanceDraft; warnings: ApiWarning[] } {
  return tx(() => {
    getOrCreateGrievance(deviceId, checkId);
    const { description, reportId } = generate(deviceId, checkId, lang);
    getDb()
      .prepare(`UPDATE grievance_drafts SET description = ?, description_language = ?, description_source = 'generated', based_on_report_id = ?, updated_at = ? WHERE check_id = ?`)
      .run(description, lang, reportId, nowIso(), checkId);
    const draft = toDraft(deviceId, draftRow(checkId)!);
    return { draft, warnings: adviceWarnings(draft) };
  });
}

export function setTranslatedDescription(deviceId: string, checkId: string, text: string, lang: LanguageCode): void {
  getOrCreateGrievance(deviceId, checkId);
  getDb()
    .prepare(`UPDATE grievance_drafts SET description = ?, description_language = ?, description_source = 'translated', updated_at = ? WHERE check_id = ?`)
    .run(text, lang, nowIso(), checkId);
}

export function grievanceDescription(deviceId: string, checkId: string): { text: string; language: LanguageCode } {
  const { draft } = getOrCreateGrievance(deviceId, checkId);
  return { text: draft.description, language: draft.descriptionLanguage };
}

// ---------------------------------------------------------------------------
// Filing (the user filed on the real portal and tells us the reference)
// ---------------------------------------------------------------------------

export function putFiling(deviceId: string, checkId: string, input: FilingInput): Filing {
  return tx(() => {
    requireCheck(deviceId, checkId);
    const maxDate = todayIST(new Date(Date.now() + 24 * 3600 * 1000));
    if (input.filedDate > maxDate) throw new AppError(400, 'VALIDATION_FAILED', 'Filed date cannot be in the future', [{ path: 'filedDate', message: 'in the future' }]);
    let reportId = input.reportId ?? null;
    if (reportId) {
      const r = getDb().prepare('SELECT id FROM reports WHERE id = ? AND check_id = ? AND device_id = ?').get(reportId, checkId, deviceId);
      if (!r) throw new AppError(404, 'NOT_FOUND', 'Report not found for this check');
    } else {
      reportId = latestReport(deviceId, checkId)?.id ?? null;
    }
    let portalUrl = input.portalUrl ?? null;
    if (input.channelId) {
      const ch = getChannel(input.channelId);
      if (!ch) throw new AppError(404, 'NOT_FOUND', 'Channel not found');
      if (!portalUrl && /^https?:/.test(ch.value)) portalUrl = ch.value;
    }
    const now = nowIso();
    const existing = getFiling(deviceId, checkId);
    if (existing) {
      getDb()
        .prepare('UPDATE filings SET report_id=?, reference_number=?, filed_date=?, portal_url=?, channel_id=?, updated_at=? WHERE id=?')
        .run(reportId, input.referenceNumber.trim(), input.filedDate, portalUrl, input.channelId ?? null, now, existing.id);
    } else {
      getDb()
        .prepare('INSERT INTO filings (id, device_id, check_id, report_id, reference_number, filed_date, portal_url, channel_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(crypto.randomUUID(), deviceId, checkId, reportId, input.referenceNumber.trim(), input.filedDate, portalUrl, input.channelId ?? null, now, now);
    }
    getDb().prepare('UPDATE checks SET updated_at = ? WHERE id = ?').run(now, checkId);
    return getFiling(deviceId, checkId)!;
  });
}

export function deleteFiling(deviceId: string, checkId: string): void {
  requireCheck(deviceId, checkId);
  const r = getDb().prepare('DELETE FROM filings WHERE check_id = ? AND device_id = ?').run(checkId, deviceId);
  if (r.changes === 0) throw new AppError(404, 'NOT_FOUND', 'No filing recorded for this check');
}

