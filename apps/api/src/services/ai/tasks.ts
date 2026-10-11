/**
 * Cloud AI tasks. Each returns a DRAFT that the user must confirm (Core Principle 4).
 * The model only reads/transcribes/translates; any arithmetic (summing line items, applying a
 * spoken fraction to the entitlement) is done afterwards in plain code (Core Principle 2).
 */
import { z } from 'zod';
import {
  FAQ,
  evidenceTypeForDoc,
  formatKg,
  gramsToKg,
  isValidDate,
  kgToGrams,
  languageName,
  lowConfidenceFieldsOf,
  normalizeDigits,
  redactSensitiveIds,
  type ChatMessage,
  type Commodity,
  type ExtractedField,
  type ExtractionResult,
  type LanguageCode,
  type VoiceParseResult,
} from '@repo/shared';
import { nullable, obj, structuredCall } from './claude.js';

const DOC_TYPES = ['receipt', 'sms_screenshot', 'handwritten_note', 'photo_note', 'unknown'] as const;
const COMMODITIES = ['rice', 'wheat', 'coarse_grains', 'mixed', 'other'] as const;

const fieldSchema = (valueSchema: Record<string, unknown>) =>
  obj({ value: nullable(valueSchema), confidence: { type: 'number' }, rawText: nullable({ type: 'string' }) });

const zField = <T extends z.ZodType>(v: T) => z.object({ value: v.nullable(), confidence: z.number(), rawText: z.string().nullable() });
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

// ---------------------------------------------------------------------------
// Extraction (photo or text)
// ---------------------------------------------------------------------------

const extractionSchema = obj({
  docType: { type: 'string', enum: [...DOC_TYPES] },
  docTypeConfidence: { type: 'number' },
  legibility: { type: 'string', enum: ['good', 'partial', 'poor'] },
  retakeReasons: { type: 'array', items: { type: 'string' } },
  date: fieldSchema({ type: 'string' }),
  reference: fieldSchema({ type: 'string' }),
  lineItems: {
    type: 'array',
    items: obj({
      commodity: nullable({ type: 'string', enum: [...COMMODITIES] }),
      quantityKg: { type: 'number' },
      confidence: { type: 'number' },
      rawText: nullable({ type: 'string' }),
    }),
  },
  statedTotalKg: fieldSchema({ type: 'number' }),
  extractedText: { type: 'string' },
});

const zExtraction = z.object({
  docType: z.enum(DOC_TYPES),
  docTypeConfidence: z.number(),
  legibility: z.enum(['good', 'partial', 'poor']),
  retakeReasons: z.array(z.string()),
  date: zField(z.string()),
  reference: zField(z.string()),
  lineItems: z.array(z.object({ commodity: z.enum(COMMODITIES).nullable(), quantityKg: z.number(), confidence: z.number(), rawText: z.string().nullable() })),
  statedTotalKg: zField(z.number()),
  extractedText: z.string(),
});

const EXTRACTION_SYSTEM = `You read photos and text of Indian Public Distribution System (ration) evidence: e-PoS slips, receipts, SMS messages and handwritten notes.

Rules:
- Report only what is literally written. If a value is not clearly legible, return null for it with a low confidence. Never guess.
- Confidence is 0–1 and reflects how sure you are the value is exactly what is written.
- List each foodgrain quantity as a separate line item, in kilograms (convert grams). Do not add quantities together. Only fill statedTotalKg if a total is printed/written.
- Dates as YYYY-MM-DD. Indian documents write dates as DD/MM/YYYY.
- reference = a receipt, transaction, slip or token number if present.
- In extractedText, replace any Aadhaar number, Virtual ID, phone number or ration card number with [ID REMOVED].
- legibility: good / partial / poor. If the image is blurred, dark, cut off or unreadable, use poor and list the reasons in retakeReasons (e.g. "blurred", "too dark", "cut off").
- Do not comment on whether any quantity is right or wrong, or on why anything happened.`;

export async function cloudExtract(input: {
  image?: Buffer;
  text?: string;
  period?: string;
  today: string;
  sourceType?: 'sms' | 'receipt' | 'note';
}): Promise<ExtractionResult> {
  const context = `Period being checked: ${input.period ?? 'unknown'}. Today: ${input.today}.${input.sourceType ? ` The user says this is: ${input.sourceType}.` : ''}`;
  const content: Parameters<typeof structuredCall>[0]['content'] = [];
  if (input.image) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.image.toString('base64') } });
  content.push({ type: 'text', text: input.text ? `${context}\n\nText to read:\n"""\n${input.text}\n"""` : `${context}\n\nRead the attached image.` });

  const r = await structuredCall({ system: EXTRACTION_SYSTEM, content, schema: extractionSchema, validator: zExtraction, effort: 'medium' });
  return assembleExtraction(r, input.sourceType);
}

/** Turns the model's reading into an ExtractionResult. All arithmetic happens here, in code. */
export function assembleExtraction(r: z.infer<typeof zExtraction>, sourceType?: 'sms' | 'receipt' | 'note'): ExtractionResult {
  let redactedCount = 0;
  const red = (s: string | null): string | null => {
    if (s === null) return null;
    const o = redactSensitiveIds(s);
    redactedCount += o.count;
    return o.text;
  };

  const date: ExtractedField<string> =
    r.date.value && isValidDate(r.date.value)
      ? { value: r.date.value, confidence: clamp01(r.date.confidence), rawText: red(r.date.rawText) }
      : { value: null, confidence: 0, rawText: red(r.date.rawText) };
  const reference: ExtractedField<string> = r.reference.value
    ? { value: red(r.reference.value), confidence: clamp01(r.reference.confidence), rawText: red(r.reference.rawText) }
    : { value: null, confidence: 0, rawText: null };

  const items = r.lineItems
    .filter((li) => Number.isFinite(li.quantityKg) && li.quantityKg > 0 && li.quantityKg <= 1000)
    .map((li) => ({ commodity: li.commodity as Commodity | null, quantityKg: gramsToKg(kgToGrams(li.quantityKg)), confidence: clamp01(li.confidence), rawText: red(li.rawText) }));

  let quantityKg: ExtractedField<number> = { value: null, confidence: 0, rawText: null };
  let quantityFormula: string | null = null;
  const stated = r.statedTotalKg.value !== null && r.statedTotalKg.value > 0 ? gramsToKg(kgToGrams(r.statedTotalKg.value)) : null;
  if (items.length > 0) {
    const g = items.reduce((s, li) => s + kgToGrams(li.quantityKg), 0);
    let conf = Math.min(...items.map((li) => li.confidence));
    if (stated !== null) conf = kgToGrams(stated) === g ? Math.max(conf, 0.9) : Math.min(conf, 0.5);
    if (items.length > 1) {
      quantityFormula = `${items.map((li) => `${formatKg(li.quantityKg)}${li.commodity ? ` (${li.commodity.replace('_', ' ')})` : ''}`).join(' + ')} = ${formatKg(gramsToKg(g))}`;
    }
    quantityKg = { value: gramsToKg(g), confidence: conf, rawText: items.map((i) => i.rawText).filter(Boolean).join(' | ') || null };
  } else if (stated !== null) {
    quantityKg = { value: stated, confidence: clamp01(r.statedTotalKg.confidence), rawText: red(r.statedTotalKg.rawText) };
  }

  const distinct = new Set(items.map((i) => i.commodity).filter(Boolean));
  const commodityValue: Commodity | null = distinct.size > 1 ? 'mixed' : ((items.find((i) => i.commodity)?.commodity as Commodity) ?? null);
  const commodity: ExtractedField<Commodity> = { value: commodityValue, confidence: commodityValue ? 0.8 : 0, rawText: null };

  const extractedText = red(r.extractedText) ?? '';
  const fields = { date, quantityKg, reference, commodity };
  const lowConfidenceFields = lowConfidenceFieldsOf(fields);
  const retakeSuggested = r.legibility === 'poor' || (date.value === null && quantityKg.value === null);
  return {
    docType: { value: r.docType, confidence: clamp01(r.docTypeConfidence) },
    suggestedEvidenceType: sourceType === 'note' ? 'note' : evidenceTypeForDoc(r.docType),
    fields,
    lineItems: items,
    quantityFormula,
    extractedText,
    legibility: r.legibility,
    retakeSuggested,
    retakeReasons: retakeSuggested && r.retakeReasons.length === 0 ? ['Date and quantity could not be read'] : r.retakeReasons,
    sensitiveIdsRedacted: redactedCount,
    lowConfidenceFields,
  };
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

const voiceSchema = obj({
  intent: { type: 'string', enum: ['add_record', 'set_household', 'unknown'] },
  date: fieldSchema({ type: 'string' }),
  quantityKg: fieldSchema({ type: 'number' }),
  fractionOfEntitlement: fieldSchema({ type: 'number' }),
  evidenceType: fieldSchema({ type: 'string', enum: ['receipt', 'sms', 'photo', 'note', 'none'] }),
  commodity: fieldSchema({ type: 'string', enum: [...COMMODITIES] }),
  cardType: fieldSchema({ type: 'string', enum: ['AAY', 'PHH', 'CUSTOM'] }),
  members: fieldSchema({ type: 'integer' }),
});

const zVoice = z.object({
  intent: z.enum(['add_record', 'set_household', 'unknown']),
  date: zField(z.string()),
  quantityKg: zField(z.number()),
  fractionOfEntitlement: zField(z.number()),
  evidenceType: zField(z.enum(['receipt', 'sms', 'photo', 'note', 'none'])),
  commodity: zField(z.enum(COMMODITIES)),
  cardType: zField(z.enum(['AAY', 'PHH', 'CUSTOM'])),
  members: zField(z.number()),
});

const VOICE_SYSTEM = `You turn one spoken sentence from a ration (PDS) beneficiary in India into form fields. The sentence may be in any Indian language or a mix with English.
- add_record: the person describes a visit/collection (a date and/or a quantity received).
- set_household: the person states their card type (Antyodaya = AAY, Priority Household = PHH) or the number of members.
- quantityKg: only a quantity explicitly said as a number of kg/grams. Never compute one.
- fractionOfEntitlement: if they describe the amount as a fraction of what they should get ("half", "aadha", "a quarter"), give the fraction (e.g. 0.5) here and leave quantityKg null.
- Dates as YYYY-MM-DD; resolve relative dates ("yesterday", "kal", "on the 5th") using today's date and the period given. If unsure, null with low confidence.
- evidenceType: "none" if they say they got no slip/receipt; "receipt" if they mention a slip/receipt; otherwise null.
- Confidence 0–1. Never guess; prefer null.`;

export async function cloudVoiceParse(input: { transcript: string; language: LanguageCode; period?: string; today: string; entitlementKg?: number }) {
  const r = await structuredCall({
    system: VOICE_SYSTEM,
    content: [{ type: 'text', text: `Today: ${input.today}. Period being checked: ${input.period ?? 'unknown'}. Spoken language: ${languageName(input.language)}.\n\nSentence: "${input.transcript}"` }],
    schema: voiceSchema,
    validator: zVoice,
    effort: 'low',
    maxTokens: 4000,
  });
  const f = <T>(x: { value: T | null; confidence: number; rawText: string | null }): ExtractedField<T> =>
    x.value === null ? { value: null, confidence: 0, rawText: x.rawText } : { value: x.value, confidence: clamp01(x.confidence), rawText: x.rawText };

  let quantityKg = f(r.quantityKg);
  if (quantityKg.value !== null && !(quantityKg.value >= 0 && quantityKg.value <= 1000)) quantityKg = { value: null, confidence: 0, rawText: quantityKg.rawText };
  if (quantityKg.value !== null) quantityKg = { ...quantityKg, value: gramsToKg(kgToGrams(quantityKg.value)) };
  let quantityExpression: VoiceParseResult['quantityExpression'] = null;
  const frac = r.fractionOfEntitlement.value;
  if (quantityKg.value === null && frac !== null && frac > 0 && frac <= 1 && input.entitlementKg !== undefined) {
    const g = Math.round(kgToGrams(input.entitlementKg) * frac);
    quantityExpression = { kind: 'fraction_of_entitlement', fraction: frac, formula: `${frac} × ${formatKg(input.entitlementKg)} = ${formatKg(gramsToKg(g))}` };
    quantityKg = { value: gramsToKg(g), confidence: Math.min(0.6, clamp01(r.fractionOfEntitlement.confidence)), rawText: r.fractionOfEntitlement.rawText };
  }
  const date = r.date.value && isValidDate(r.date.value) ? f(r.date) : { value: null, confidence: 0, rawText: r.date.rawText };
  const members = r.members.value !== null && Number.isInteger(r.members.value) && r.members.value >= 1 && r.members.value <= 30 ? f(r.members) : { value: null, confidence: 0, rawText: null };
  const fields: VoiceParseResult['fields'] = {
    date,
    quantityKg,
    evidenceType: f(r.evidenceType),
    commodity: f(r.commodity),
    cardType: f(r.cardType),
    members,
  };
  return {
    intent: r.intent,
    fields,
    quantityExpression,
    lowConfidenceFields: r.intent === 'add_record' ? lowConfidenceFieldsOf({ date: fields.date, quantityKg: fields.quantityKg }) : [],
  };
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

const translateSchema = obj({ translatedText: { type: 'string' }, backTranslation: { type: 'string' } });
const zTranslate = z.object({ translatedText: z.string(), backTranslation: z.string() });

const TRANSLATE_SYSTEM = `You translate documents for ration (PDS) beneficiaries in India.
- Translate faithfully and completely into the target language, in simple everyday words.
- Keep every number, date, unit, reference/report ID and URL exactly as in the source, written with the same Western (0–9) digits.
- Do not add, remove, soften or strengthen any statement. Do not add explanations.
- The source is deliberately neutral: it states a difference and its evidence without blaming anyone. Keep it that way. Never introduce any word implying fraud, theft, cheating, corruption or wrongdoing.
- Keep line breaks and list structure.
- Then translate your translation back into English literally, as backTranslation, so a reviewer can check the meaning.`;

export async function cloudTranslate(input: { text: string; targetLanguage: LanguageCode }): Promise<{ translatedText: string; backTranslation: string }> {
  return structuredCall({
    system: TRANSLATE_SYSTEM,
    content: [{ type: 'text', text: `Target language: ${languageName(input.targetLanguage)} (${input.targetLanguage}).\n\nSource:\n"""\n${input.text}\n"""` }],
    schema: translateSchema,
    validator: zTranslate,
    effort: 'medium',
    maxTokens: 32000,
  });
}

/** Numbers in source and translation must match exactly (the AI must not alter figures). */
export function numbersPreserved(source: string, translated: string): { ok: boolean; missing: string[]; added: string[] } {
  const nums = (s: string) => (normalizeDigits(s).match(/\d+(?:\.\d+)?/g) ?? []).sort();
  const a = nums(source);
  const b = nums(translated);
  const count = (arr: string[]) => arr.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
  const ca = count(a);
  const cb = count(b);
  const missing = [...ca].filter(([k, v]) => (cb.get(k) ?? 0) < v).map(([k]) => k);
  const added = [...cb].filter(([k, v]) => (ca.get(k) ?? 0) < v).map(([k]) => k);
  return { ok: missing.length === 0 && added.length === 0, missing, added };
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

const chatSchema = obj({ reply: { type: 'string' }, outOfScope: { type: 'boolean' } });
const zChat = z.object({ reply: z.string(), outOfScope: z.boolean() });

const CHAT_SYSTEM = `You are the help assistant inside RationSaathi, an app that helps ration (PDS) beneficiaries in India compare their NFSA entitlement with what they received, and prepare a grievance they file themselves on the official portal.

Scope — you ONLY explain terms and process: what labels mean (Shortfall, Late, Unrecorded, Unclear), how the app works, what evidence is, what happens after filing, what a DGRO or State Food Commission is, where to find a fair price shop (FPS) number, the national NFSA scale.

Hard rules:
- Never discuss, guess or speculate about why a particular person received less, and never suggest that any shop, dealer or official did something wrong. If asked, set outOfScope=true and say the app only shows the numbers and evidence, a difference can have many causes, and the grievance process is where the cause is looked into.
- Never write, rewrite or change the user's report or grievance text.
- Never ask for Aadhaar numbers, OTPs or passwords. Explain that the user enters their OTP only on the official portal.
- Do not state phone numbers or URLs as fact; point to the app's channel directory and say entries may be unverified.
- Not legal advice. Keep answers short (under 120 words), simple and friendly, in the user's language.

Reference notes:
${FAQ.map((f) => `Q: ${f.question.en}\nA: ${f.answer.en}`).join('\n\n')}`;

export async function cloudChat(input: { messages: ChatMessage[]; language: LanguageCode }): Promise<{ reply: string; outOfScope: boolean }> {
  const transcript = input.messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  return structuredCall({
    system: CHAT_SYSTEM,
    content: [{ type: 'text', text: `Reply in ${languageName(input.language)}.\n\nConversation so far:\n${transcript}\n\nWrite the assistant's next reply.` }],
    schema: chatSchema,
    validator: zChat,
    effort: 'low',
    maxTokens: 4000,
  });
}
