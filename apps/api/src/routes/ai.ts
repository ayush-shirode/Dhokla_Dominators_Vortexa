/**
 * AI-assisted entry. Every endpoint returns a DRAFT; nothing becomes a record until the user
 * confirms it via POST /ai/drafts/:id/confirm (Core Principle 4).
 *
 * Data sent to the cloud (only when the request carries allowCloud: true):
 *  - /ai/ocr          the stored, already-masked JPEG
 *  - /ai/extract-text the pasted text after Aadhaar/VID redaction
 *  - /ai/voice/parse  the transcript text (after redaction)
 *  - /ai/translate    the report / grievance description / evidence text
 *  - /ai/chat         the chat messages
 */
import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import {
  CAUSE_REDIRECT,
  FAQ,
  LIMITS,
  checkNeutrality,
  computeEntitlement,
  extractFromText,
  extractionReadBack,
  faqAnswer,
  isCauseQuestion,
  isTemplateLanguage,
  kgToGrams,
  matchFaq,
  parseVoiceTranscript,
  redactSensitiveIds,
  todayIST,
  voiceReadBack,
  type ApiWarning,
  type ChatReply,
  type ConfirmDraftResult,
  type ExtractionResult,
  type LanguageCode,
  type RecordInput,
  type TranslationResult,
  type VoiceParseResult,
} from '@repo/shared';
import { getDb, tx } from '../db/index.js';
import { AppError, deviceOf, h, ok, param, parse } from '../lib/http.js';
import { idSchema, languageSchema, recordInputSchema } from '../lib/schemas.js';
import { getCheck, putRecord, requireCheck } from '../repo/checks.js';
import { createDraft, getDraft, requirePendingDraft, resolveDraft } from '../repo/drafts.js';
import { getHousehold } from '../repo/households.js';
import { cloudAvailable } from '../services/ai/llm.js';
import { cloudChat, cloudExtract, cloudTranslate, cloudVoiceParse, numbersPreserved } from '../services/ai/tasks.js';
import { grievanceDescription, setTranslatedDescription } from '../services/grievance.js';
import { ocrCapability, runOcr } from '../services/ocr.js';
import { getPhotoRow, photoFilePath } from '../services/photos.js';
import { requireReport, saveReportTranslation } from '../services/reports.js';

export const aiRouter = Router();

const readBackLang = (l: LanguageCode): 'en' | 'hi' => (l === 'hi' ? 'hi' : 'en');

/** Period and (if the rule is confirmed) entitlement of a check, for resolving dates / fractions. */
function checkContext(deviceId: string, checkId: string | undefined): { period?: string; entitlementKg?: number } {
  if (!checkId) return {};
  const check = requireCheck(deviceId, checkId);
  const hh = getHousehold(deviceId, check.householdId);
  return { period: check.period, entitlementKg: hh?.ruleConfirmed ? computeEntitlement(hh).kg : undefined };
}

/** Decides whether to use the cloud for this request. */
function useCloud(allowCloud: boolean | undefined, warnings: ApiWarning[]): boolean {
  if (!allowCloud) return false;
  if (cloudAvailable()) return true;
  warnings.push({ code: 'CLOUD_UNAVAILABLE_LOCAL_USED', message: 'Cloud AI is not configured on this server; the on-server reader was used instead.' });
  return false;
}

function extractionWarnings(r: ExtractionResult, warnings: ApiWarning[]): void {
  if (r.lowConfidenceFields.length) warnings.push({ code: 'LOW_CONFIDENCE', message: `Please check: ${r.lowConfidenceFields.join(', ')}`, details: { fields: r.lowConfidenceFields } });
  if (r.retakeSuggested) warnings.push({ code: 'RETAKE_SUGGESTED', message: 'This could not be read clearly. A clearer photo is recommended.', details: { reasons: r.retakeReasons } });
  if (r.sensitiveIdsRedacted) warnings.push({ code: 'SENSITIVE_ID_REDACTED', message: `Removed ${r.sensitiveIdsRedacted} ID number(s).` });
}

// --- OCR ----------------------------------------------------------------------

const ocrBody = z.object({
  photoId: z.string().max(64),
  checkId: idSchema.optional(),
  allowCloud: z.boolean().optional(),
  languageHint: languageSchema.optional(),
});

aiRouter.post('/ai/ocr', h(async (req, res) => {
  const d = deviceOf(req);
  const body = parse(ocrBody, req.body);
  const row = getPhotoRow(d, body.photoId);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Photo not found');
  const ctx = checkContext(d, body.checkId);
  const warnings: ApiWarning[] = [];
  const today = todayIST();
  const photoDoc = JSON.parse(row.doc_type_json as string) as { value: ExtractionResult['docType']['value']; confidence: number };
  let result: ExtractionResult;
  let engine: 'local' | 'cloud' = 'local';

  if (useCloud(body.allowCloud, warnings)) {
    const image = fs.readFileSync(photoFilePath(d, row)); // already masked
    result = await cloudExtract({ image, period: ctx.period, today });
    engine = 'cloud';
  } else {
    let text = row.ocr_text as string | null;
    let meanConf = row.ocr_mean_conf as number | null;
    if (text === null) {
      if (!ocrCapability().available) {
        throw new AppError(503, 'AI_UNAVAILABLE', 'This server cannot read photos without cloud AI. Allow AI reading, or type the values.');
      }
      const ocr = await runOcr(fs.readFileSync(photoFilePath(d, row)));
      text = redactSensitiveIds(ocr.text).text;
      meanConf = ocr.meanConf;
      getDb().prepare('UPDATE photos SET ocr_text = ?, ocr_mean_conf = ? WHERE id = ?').run(text, meanConf, row.id);
    }
    result = extractFromText(text, { period: ctx.period, today });
    if (result.docType.value === 'unknown') result = { ...result, docType: photoDoc };
    if ((meanConf ?? 0) < 45 || result.legibility === 'poor') {
      result = { ...result, legibility: 'poor', retakeSuggested: true, retakeReasons: ['The text in the photo could not be read clearly'] };
    }
  }

  const quality = JSON.parse(row.quality_json as string) as { ok: boolean; issues: string[] };
  if (!quality.ok) {
    result = { ...result, retakeSuggested: true, retakeReasons: [...new Set([...result.retakeReasons, ...quality.issues])] };
  }
  extractionWarnings(result, warnings);
  const draft = createDraft(d, {
    kind: 'ocr',
    checkId: body.checkId ?? null,
    photoId: body.photoId,
    engine,
    result,
    warnings,
    readBack: { language: readBackLang(body.languageHint ?? 'en'), text: extractionReadBack(result, readBackLang(body.languageHint ?? 'en')) },
  });
  ok(res, draft, { status: 201, warnings });
}));

// --- Pasted text ----------------------------------------------------------------

const textBody = z.object({
  text: z.string().trim().min(1).max(LIMITS.maxTextChars),
  sourceType: z.enum(['sms', 'receipt', 'note']),
  checkId: idSchema.optional(),
  allowCloud: z.boolean().optional(),
  language: languageSchema.optional(),
});

aiRouter.post('/ai/extract-text', h(async (req, res) => {
  const d = deviceOf(req);
  const body = parse(textBody, req.body);
  const ctx = checkContext(d, body.checkId);
  const warnings: ApiWarning[] = [];
  const red = redactSensitiveIds(body.text); // before anything else, including the cloud
  let result: ExtractionResult;
  let engine: 'local' | 'cloud' = 'local';
  if (useCloud(body.allowCloud, warnings)) {
    result = await cloudExtract({ text: red.text, period: ctx.period, today: todayIST(), sourceType: body.sourceType });
    engine = 'cloud';
  } else {
    result = extractFromText(red.text, { period: ctx.period, sourceType: body.sourceType });
  }
  result = { ...result, extractedText: red.text, sensitiveIdsRedacted: result.sensitiveIdsRedacted + red.count };
  extractionWarnings(result, warnings);
  const lang = readBackLang(body.language ?? 'en');
  const draft = createDraft(d, {
    kind: 'text_extract',
    checkId: body.checkId ?? null,
    photoId: null,
    engine,
    result,
    warnings,
    readBack: { language: lang, text: extractionReadBack(result, lang) },
  });
  ok(res, draft, { status: 201, warnings });
}));

// --- Voice --------------------------------------------------------------------

const voiceBody = z.object({
  transcript: z.string().trim().min(1).max(1000),
  language: languageSchema,
  checkId: idSchema.optional(),
  allowCloud: z.boolean().optional(),
});

aiRouter.post('/ai/voice/parse', h(async (req, res) => {
  const d = deviceOf(req);
  const body = parse(voiceBody, req.body);
  const ctx = checkContext(d, body.checkId);
  const warnings: ApiWarning[] = [];
  const today = todayIST();
  const local = parseVoiceTranscript(body.transcript, { period: ctx.period, today, entitlementKg: ctx.entitlementKg });
  let result: VoiceParseResult = {
    intent: local.intent,
    transcript: local.transcript,
    fields: local.fields,
    quantityExpression: local.quantityExpression,
    lowConfidenceFields: local.lowConfidenceFields,
  };
  let engine: 'local' | 'cloud' = 'local';
  const localWeak = local.intent === 'unknown' || local.lowConfidenceFields.length > 0 || !isTemplateLanguage(body.language);
  if (localWeak && useCloud(body.allowCloud, warnings)) {
    const c = await cloudVoiceParse({ transcript: local.transcript, language: body.language, period: ctx.period, today, entitlementKg: ctx.entitlementKg });
    result = { ...c, transcript: local.transcript };
    engine = 'cloud';
  }
  if (result.lowConfidenceFields.length) warnings.push({ code: 'LOW_CONFIDENCE', message: `Please check: ${result.lowConfidenceFields.join(', ')}` });
  const lang = readBackLang(body.language);
  const draft = createDraft(d, {
    kind: 'voice',
    checkId: body.checkId ?? null,
    photoId: null,
    engine,
    result,
    warnings,
    readBack: { language: lang, text: voiceReadBack(result.intent, result.fields, result.quantityExpression, lang) },
  });
  ok(res, draft, { status: 201, warnings });
}));

// --- Translation ----------------------------------------------------------------

const translateBody = z.object({
  purpose: z.enum(['report', 'grievance_description', 'evidence_text']),
  targetLanguage: languageSchema,
  reportId: z.string().max(64).optional(),
  checkId: idSchema.optional(),
  text: z.string().trim().min(1).max(LIMITS.maxTextChars).optional(),
  allowCloud: z.boolean().optional(),
});

aiRouter.post('/ai/translate', h(async (req, res) => {
  const d = deviceOf(req);
  const body = parse(translateBody, req.body);
  if (body.allowCloud !== true) {
    throw new AppError(403, 'CLOUD_CONSENT_REQUIRED', 'Translation uses a cloud AI service. Ask the user, then send allowCloud: true.');
  }
  if (!cloudAvailable()) throw new AppError(503, 'AI_UNAVAILABLE', 'Cloud AI is not configured on this server');

  let sourceText: string;
  let sourceLanguage: TranslationResult['sourceLanguage'] = 'auto';
  const target = { reportId: null as string | null, checkId: null as string | null };
  if (body.purpose === 'report') {
    if (!body.reportId) throw new AppError(400, 'VALIDATION_FAILED', 'reportId is required', [{ path: 'reportId', message: 'required' }]);
    if (isTemplateLanguage(body.targetLanguage)) {
      throw new AppError(422, 'UNSUPPORTED_LANGUAGE', 'English and Hindi reports are generated without AI. Export with lang=en or lang=hi instead.');
    }
    const report = requireReport(d, body.reportId);
    sourceText = report.text;
    sourceLanguage = report.language;
    target.reportId = report.id;
  } else if (body.purpose === 'grievance_description') {
    if (!body.checkId) throw new AppError(400, 'VALIDATION_FAILED', 'checkId is required', [{ path: 'checkId', message: 'required' }]);
    const g = grievanceDescription(d, body.checkId);
    if (g.language === body.targetLanguage) throw new AppError(422, 'UNSUPPORTED_LANGUAGE', 'The description is already in this language');
    if (isTemplateLanguage(body.targetLanguage)) {
      throw new AppError(422, 'UNSUPPORTED_LANGUAGE', 'English and Hindi descriptions are generated without AI. Use POST /checks/:id/grievance/regenerate.');
    }
    sourceText = g.text;
    sourceLanguage = g.language;
    target.checkId = body.checkId;
  } else {
    if (!body.text) throw new AppError(400, 'VALIDATION_FAILED', 'text is required', [{ path: 'text', message: 'required' }]);
    sourceText = redactSensitiveIds(body.text).text;
  }

  const t = await cloudTranslate({ text: sourceText, targetLanguage: body.targetLanguage });
  const neutrality = checkNeutrality(`${t.translatedText}\n${t.backTranslation}`);
  const warnings: ApiWarning[] = [];
  if (!neutrality.ok) warnings.push({ code: 'NEUTRALITY_TERMS', message: 'The translation contains words that must be changed before it can be used.', details: neutrality });
  const nums = numbersPreserved(sourceText, t.translatedText);
  if (!nums.ok) warnings.push({ code: 'NUMBERS_CHANGED', message: 'The translation changed some numbers. Please correct them to match the original.', details: nums });

  const result: TranslationResult = {
    purpose: body.purpose,
    sourceLanguage,
    targetLanguage: body.targetLanguage,
    sourceText,
    translatedText: t.translatedText,
    backTranslation: t.backTranslation,
    neutrality,
    target,
  };
  const draft = createDraft(d, {
    kind: 'translation',
    checkId: target.checkId ?? body.checkId ?? null,
    photoId: null,
    engine: 'cloud',
    result,
    warnings,
    readBack: { language: body.targetLanguage, text: t.translatedText },
  });
  ok(res, draft, { status: 201, warnings });
}));

// --- Drafts ---------------------------------------------------------------------

aiRouter.get('/ai/drafts/:id', h((req, res) => {
  const draft = getDraft(deviceOf(req), param(req, 'id'));
  if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');
  ok(res, draft);
}));

aiRouter.post('/ai/drafts/:id/reject', h((req, res) => {
  const d = deviceOf(req);
  const id = param(req, 'id');
  requirePendingDraft(d, id);
  ok(res, resolveDraft(d, id, 'rejected'));
}));

const confirmBody = z.object({
  record: recordInputSchema.extend({ id: idSchema }).optional(),
  text: z.string().trim().min(1).max(LIMITS.maxTextChars * 4).optional(),
});

type LowField = 'date' | 'quantityKg' | 'reference' | 'commodity';

aiRouter.post('/ai/drafts/:id/confirm', h((req, res) => {
  const d = deviceOf(req);
  const id = param(req, 'id');
  const body = parse(confirmBody, req.body ?? {});

  const out = tx((): { result: ConfirmDraftResult; warnings: ApiWarning[] } => {
    const draft = requirePendingDraft(d, id);

    if (draft.kind === 'translation') {
      if (!body.text) throw new AppError(400, 'VALIDATION_FAILED', 'text (the confirmed translation) is required', [{ path: 'text', message: 'required' }]);
      const n = checkNeutrality(body.text);
      if (!n.ok) throw new AppError(422, 'NEUTRALITY_CHECK_FAILED', 'The translation contains words that state or imply wrongdoing. Please change them.', { flaggedTerms: n.flaggedTerms });
      const r = draft.result;
      const nums = numbersPreserved(r.sourceText, body.text);
      if (!nums.ok) throw new AppError(400, 'VALIDATION_FAILED', 'The numbers in the translation must match the original exactly.', nums);
      let appliedTo: ConfirmDraftResult['appliedTo'] = { kind: 'none' };
      if (r.purpose === 'report' && r.target.reportId) {
        requireReport(d, r.target.reportId);
        const tid = saveReportTranslation(r.target.reportId, r.targetLanguage, body.text, draft.id);
        appliedTo = { kind: 'report_translation', reportId: r.target.reportId, translationId: tid };
      } else if (r.purpose === 'grievance_description' && r.target.checkId) {
        setTranslatedDescription(d, r.target.checkId, body.text, r.targetLanguage);
        appliedTo = { kind: 'grievance_description', checkId: r.target.checkId };
      }
      return { result: { draft: resolveDraft(d, id, 'confirmed'), appliedTo }, warnings: [] };
    }

    if (draft.kind === 'voice' && draft.result.intent !== 'add_record') {
      return { result: { draft: resolveDraft(d, id, 'confirmed'), appliedTo: { kind: 'none' } }, warnings: [] };
    }

    if (!body.record) throw new AppError(400, 'VALIDATION_FAILED', 'record (the values the user confirmed) is required', [{ path: 'record', message: 'required' }]);
    const rec = body.record;
    if (!getCheck(d, rec.checkId)) throw new AppError(404, 'NOT_FOUND', 'Check not found');

    // A field the AI was unsure about stays "low confidence" unless the user changed its value.
    const fields = draft.result.fields as Record<string, { value: unknown }>;
    const aiLow = draft.result.lowConfidenceFields as LowField[];
    const changed = (f: LowField): boolean => {
      const v = fields[f]?.value ?? null;
      switch (f) {
        case 'date':
          return v !== rec.date;
        case 'quantityKg':
          return v === null || kgToGrams(v as number) !== kgToGrams(rec.quantityKg);
        case 'reference':
          return v === null || !(rec.evidenceContent ?? '').includes(String(v));
        case 'commodity':
          return v !== (rec.commodity ?? null);
      }
    };
    const remaining = aiLow.filter((f) => !changed(f));
    const input: RecordInput = {
      ...rec,
      createdVia: draft.kind === 'voice' ? 'voice' : 'ocr',
      photoId: rec.photoId ?? (draft.kind === 'ocr' && rec.evidenceType !== 'none' ? draft.photoId : null),
      aiAssist: {
        draftId: draft.id,
        lowConfidenceFields: remaining,
        userVerifiedLowConfidence: rec.aiAssist?.userVerifiedLowConfidence ?? false,
      },
    };
    const put = putRecord(d, rec.id, input);
    return { result: { draft: resolveDraft(d, id, 'confirmed'), record: put.entity }, warnings: put.warnings };
  });
  ok(res, out.result, { warnings: out.warnings });
}));

// --- Chat -----------------------------------------------------------------------

const chatBody = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1000) })).min(1).max(20),
  language: languageSchema,
  allowCloud: z.boolean().optional(),
});

aiRouter.post('/ai/chat', h(async (req, res) => {
  deviceOf(req);
  const body = parse(chatBody, req.body);
  const lang = body.language;
  const last = [...body.messages].reverse().find((m) => m.role === 'user');
  if (!last) throw new AppError(400, 'VALIDATION_FAILED', 'At least one user message is required');
  const question = redactSensitiveIds(last.content).text;
  const suggestions = FAQ.slice(0, 4).map((f) => (lang === 'hi' ? f.question.hi : f.question.en));
  const redirect = lang === 'hi' ? CAUSE_REDIRECT.hi : CAUSE_REDIRECT.en;
  const warnings: ApiWarning[] = [];
  const send = (r: ChatReply) => ok(res, r, { warnings });

  // Scope guardrail first: never discuss the cause of a specific discrepancy (Spec §5.6).
  if (isCauseQuestion(question)) return send({ reply: redirect, source: 'guardrail', faqId: null, suggestions });

  const faq = matchFaq(question, lang);
  if (faq && faq.score >= 2) return send({ reply: faqAnswer(faq.entry, lang), source: 'faq', faqId: faq.entry.id, suggestions });

  if (useCloud(body.allowCloud, warnings)) {
    const messages = body.messages.map((m) => ({ ...m, content: redactSensitiveIds(m.content).text }));
    const c = await cloudChat({ messages, language: lang });
    if (c.outOfScope || !checkNeutrality(c.reply).ok) return send({ reply: redirect, source: 'guardrail', faqId: null, suggestions });
    return send({ reply: c.reply, source: 'ai', faqId: null, suggestions });
  }
  if (faq) return send({ reply: faqAnswer(faq.entry, lang), source: 'faq', faqId: faq.entry.id, suggestions });
  const fallback =
    lang === 'hi'
      ? 'मैं राशनसाथी के इस्तेमाल और शिकायत की प्रक्रिया से जुड़े सवालों के जवाब दे सकता हूँ। नीचे दिए सवालों में से कोई चुनें।'
      : 'I can answer questions about how RationSaathi works and the grievance process. Try one of the questions below.';
  return send({ reply: fallback, source: 'fallback', faqId: null, suggestions });
}));
