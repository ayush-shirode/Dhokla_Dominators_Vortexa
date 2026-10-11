/**
 * Rule-based (non-AI) extraction used offline and as the "local" engine on the server:
 *  - extractFromText: receipt / SMS / note text → draft record fields
 *  - parseVoiceTranscript: spoken sentence → draft record / household fields
 *
 * Output is always a DRAFT (Core Principle 4). Any total built from several line items is
 * summed here in plain code (Core Principle 2).
 */
import { LOW_CONFIDENCE_THRESHOLD } from './constants.js';
import { formatDate, formatKg, formatKgNumber, gramsToKg, isValidDate, kgToGrams, todayIST } from './engine.js';
import { redactSensitiveIds } from './guards.js';
import type {
  CardType,
  Commodity,
  DocType,
  EvidenceType,
  ExtractedField,
  ExtractedLineItem,
  ExtractionResult,
  VoiceParseResult,
} from './types.js';

type LowField = 'date' | 'quantityKg' | 'reference' | 'commodity';

function field<T>(value: T | null, confidence: number, rawText: string | null = null): ExtractedField<T> {
  return { value, confidence: value === null ? 0 : Math.round(confidence * 100) / 100, rawText };
}

// ---------------------------------------------------------------------------
// Number & date helpers
// ---------------------------------------------------------------------------

/** Converts Devanagari, Bengali, Gujarati, Gurmukhi, Odia, Tamil, Telugu, Kannada, Malayalam and Arabic-Indic digits to ASCII. */
export function normalizeDigits(text: string): string {
  const zeros = [0x0966, 0x09e6, 0x0ae6, 0x0a66, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0660, 0x06f0];
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const z = zeros.find((zero) => cp >= zero && cp <= zero + 9);
    out += z !== undefined ? String(cp - z) : ch;
  }
  return out;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
  जनवरी: 1, फरवरी: 2, फ़रवरी: 2, मार्च: 3, अप्रैल: 4, मई: 5, जून: 6, जुलाई: 7, अगस्त: 8, सितंबर: 9, सितम्बर: 9,
  अक्टूबर: 10, अक्तूबर: 10, नवंबर: 11, नवम्बर: 11, दिसंबर: 12, दिसम्बर: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  return isValidDate(iso) ? iso : null;
}

/** Finds the most plausible date in text. Indian order (DD/MM/YYYY) is assumed for numeric dates. */
export function findDate(text: string, opts: { period?: string; today?: string } = {}): ExtractedField<string> {
  const t = normalizeDigits(text);
  const candidates: Array<{ iso: string; raw: string; conf: number }> = [];

  for (const m of t.matchAll(/(?<!\d)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/g)) {
    const iso = toIso(+m[1]!, +m[2]!, +m[3]!);
    if (iso) candidates.push({ iso, raw: m[0], conf: 0.95 });
  }
  for (const m of t.matchAll(/(?<!\d)(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?!\d)/g)) {
    const iso = toIso(+m[3]!, +m[2]!, +m[1]!);
    if (iso) candidates.push({ iso, raw: m[0], conf: m[3]!.length === 4 ? 0.9 : 0.8 });
  }
  const monthAlt = Object.keys(MONTH_NAMES).sort((a, b) => b.length - a.length).join('|');
  const re1 = new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${monthAlt})\\.?,?\\s*(\\d{2,4})?`, 'giu');
  for (const m of t.matchAll(re1)) {
    const mo = MONTH_NAMES[m[2]!.toLowerCase()];
    if (!mo) continue;
    const y = m[3] ? +m[3] : inferYear(mo, opts);
    const iso = toIso(y, mo, +m[1]!);
    if (iso) candidates.push({ iso, raw: m[0].trim(), conf: m[3] ? 0.9 : 0.75 });
  }
  if (candidates.length === 0) return field<string>(null, 0);
  // Prefer dates inside the period being checked, then the highest confidence.
  const inPeriod = opts.period ? candidates.filter((c) => c.iso.startsWith(opts.period!)) : [];
  const best = (inPeriod.length ? inPeriod : candidates).sort((a, b) => b.conf - a.conf)[0]!;
  const conf = candidates.length > 1 && new Set(candidates.map((c) => c.iso)).size > 1 ? best.conf - 0.15 : best.conf;
  return field(best.iso, conf, best.raw);
}

function inferYear(month: number, opts: { period?: string; today?: string }): number {
  if (opts.period) return Number(opts.period.slice(0, 4));
  const today = opts.today ?? todayIST();
  const y = Number(today.slice(0, 4));
  return month > Number(today.slice(5, 7)) ? y - 1 : y;
}

// ---------------------------------------------------------------------------
// Quantities & commodities
// ---------------------------------------------------------------------------

const COMMODITY_WORDS: Array<[Commodity, RegExp]> = [
  ['rice', /\b(rice|chawal|chaval|arisi|biyyam|akki|chaul)\b|चावल|तांदूळ|চাল|அரிசி|బియ్యం|ಅಕ್ಕಿ|അരി|ਚੌਲ|ચોખા/iu],
  ['wheat', /\b(wheat|gehu|gehun|gahu|atta)\b|गेहूं|गेहूँ|गहू|আটা|গম|கோதுமை|గోధుమ|ಗೋಧಿ|ഗോതമ്പ്|ਕਣਕ|ઘઉં/iu],
  ['coarse_grains', /\b(jowar|bajra|ragi|millet|maize|makka|coarse)\b|ज्वार|बाजरा|रागी|मक्का/iu],
];

export function detectCommodity(text: string): Commodity | null {
  for (const [c, re] of COMMODITY_WORDS) if (re.test(text)) return c;
  return null;
}

const KG_RE = /(?<![\d.])(\d{1,4}(?:[.,]\d{1,3})?)\s*(kgs?|kilo(?:gram)?s?|किलो(?:ग्राम)?|कि\.?\s?ग्रा\.?|किग्रा|कि\.ग्रा)(?![a-z])/giu;
const GRAM_RE = /(?<![\d.])(\d{2,6})\s*(g|gm|gms|grams?|ग्राम)(?![a-z])/giu;

function parseNum(s: string): number {
  return Number(s.replace(',', '.'));
}

/**
 * Reads per-commodity line items (e.g. "Rice 3.000 Kg", "Wheat: 2 kg") and stand-alone totals.
 * Returns line items plus a total (sum in plain integer-gram arithmetic).
 */
export function findQuantities(text: string): {
  lineItems: ExtractedLineItem[];
  total: ExtractedField<number>;
  formula: string | null;
} {
  const t = normalizeDigits(text);
  const lines = t.split(/\n|;|,(?=\s*[A-Za-zऀ-ॿ])/);
  const lineItems: ExtractedLineItem[] = [];
  const looseQuantities: Array<{ kg: number; raw: string; isTotal: boolean }> = [];

  for (const line of lines) {
    const kgMatches = [...line.matchAll(KG_RE)];
    const gMatches = kgMatches.length ? [] : [...line.matchAll(GRAM_RE)];
    const all = [
      ...kgMatches.map((m) => ({ kg: parseNum(m[1]!), raw: m[0], index: m.index ?? 0 })),
      ...gMatches.map((m) => ({ kg: parseNum(m[1]!) / 1000, raw: m[0], index: m.index ?? 0 })),
    ].sort((a, b) => a.index - b.index);
    if (all.length === 0) continue;
    let segStart = 0;
    for (const q of all) {
      // The words between the previous quantity and this one describe this quantity.
      const segment = line.slice(segStart, q.index + q.raw.length);
      segStart = q.index + q.raw.length;
      if (!(q.kg > 0 && q.kg <= 1000)) continue;
      const commodity = detectCommodity(segment);
      const isTotal = /(?<![\p{L}])(total|tot|कुल|ekun|mottam)(?![\p{L}\p{M}])/iu.test(segment);
      if (commodity && !isTotal) {
        lineItems.push({ commodity, quantityKg: gramsToKg(kgToGrams(q.kg)), confidence: 0.85, rawText: segment.trim().slice(0, 120) });
      } else {
        looseQuantities.push({ kg: q.kg, raw: q.raw, isTotal });
      }
    }
  }

  if (lineItems.length > 0) {
    const g = lineItems.reduce((sum, li) => sum + kgToGrams(li.quantityKg), 0);
    const formula =
      lineItems.length > 1
        ? `${lineItems.map((li) => `${formatKg(li.quantityKg)} (${li.commodity?.replace('_', ' ')})`).join(' + ')} = ${formatKg(gramsToKg(g))}`
        : null;
    const statedTotal = looseQuantities.find((q) => q.isTotal);
    // If the slip states a total that disagrees with the sum, lower confidence so the user checks it.
    let conf = lineItems.length === 1 ? 0.85 : 0.8;
    if (statedTotal && kgToGrams(statedTotal.kg) !== g) conf = 0.5;
    if (statedTotal && kgToGrams(statedTotal.kg) === g) conf = 0.92;
    return { lineItems, total: field(gramsToKg(g), conf, lineItems.map((l) => l.rawText).join(' | ')), formula };
  }
  if (looseQuantities.length === 0) return { lineItems: [], total: field<number>(null, 0), formula: null };
  const total = looseQuantities.find((q) => q.isTotal) ?? looseQuantities[0]!;
  const distinct = new Set(looseQuantities.map((q) => kgToGrams(q.kg))).size;
  const conf = total.isTotal ? 0.9 : distinct === 1 ? 0.85 : 0.55;
  return { lineItems: [], total: field(gramsToKg(kgToGrams(total.kg)), conf, total.raw), formula: null };
}

const REF_RE = /\b(?:txn|trans(?:action)?|receipt|rcpt|slip|ref(?:erence)?|bill|token|memo|रसीद|पर्ची)\s*(?:no\.?|number|id|#|nr\.?|संख्या|क्र\.?)?\s*[:#.\-]?\s*([A-Z0-9][A-Z0-9/\-]{3,30})/iu;

export function findReference(text: string): ExtractedField<string> {
  const t = normalizeDigits(text);
  const m = REF_RE.exec(t);
  if (!m) return field<string>(null, 0);
  const value = m[1]!.replace(/[-/]+$/, '');
  if (!/\d/.test(value)) return field<string>(null, 0);
  return field(value, /\d{4,}/.test(value) ? 0.8 : 0.6, m[0].trim());
}

export function classifyText(text: string, sourceType?: 'sms' | 'receipt' | 'note'): { value: DocType; confidence: number } {
  if (sourceType === 'sms') return { value: 'sms_screenshot', confidence: 0.9 };
  if (sourceType === 'receipt') return { value: 'receipt', confidence: 0.9 };
  if (sourceType === 'note') return { value: 'photo_note', confidence: 0.9 };
  const t = text.toLowerCase();
  if (/(dear|प्रिय).{0,40}(beneficiar|लाभार्थी)|sms|-[a-z]{6}\b|\bpds\b.*\bcollected\b|has been distributed|वितरित/i.test(t)) {
    return { value: 'sms_screenshot', confidence: 0.6 };
  }
  if (/(fps|e-?pos|receipt|transaction|txn|bill|qty|quantity|rate|amount)/i.test(t)) return { value: 'receipt', confidence: 0.6 };
  return { value: 'unknown', confidence: 0.3 };
}

export function evidenceTypeForDoc(doc: DocType): EvidenceType {
  switch (doc) {
    case 'receipt':
      return 'receipt';
    case 'sms_screenshot':
      return 'sms';
    case 'handwritten_note':
    case 'photo_note':
      return 'photo';
    default:
      return 'photo';
  }
}

export function lowConfidenceFieldsOf(fields: Partial<Record<LowField, ExtractedField<unknown>>>, required: LowField[] = ['date', 'quantityKg']): LowField[] {
  const out: LowField[] = [];
  for (const [k, f] of Object.entries(fields) as Array<[LowField, ExtractedField<unknown>]>) {
    if (!f) continue;
    if (f.value === null) {
      if (required.includes(k)) out.push(k);
      continue;
    }
    if (f.confidence < LOW_CONFIDENCE_THRESHOLD) out.push(k);
  }
  return out;
}

export interface ExtractOptions {
  period?: string;
  today?: string;
  sourceType?: 'sms' | 'receipt' | 'note';
}

/** Rule-based extraction from receipt / SMS / note text (works offline). */
export function extractFromText(rawText: string, opts: ExtractOptions = {}): ExtractionResult {
  const { text, count } = redactSensitiveIds(rawText ?? '');
  const date = findDate(text, opts);
  const q = findQuantities(text);
  const reference = findReference(text);
  const commodityValue = q.lineItems.length > 1 ? 'mixed' : q.lineItems[0]?.commodity ?? detectCommodity(text);
  const commodity = field<Commodity>(commodityValue, commodityValue ? 0.8 : 0);
  const docType = classifyText(text, opts.sourceType);
  const fields = { date, quantityKg: q.total, reference, commodity };
  const lowConfidenceFields = lowConfidenceFieldsOf(fields);
  const found = [date.value, q.total.value].filter((v) => v !== null).length;
  return {
    docType,
    suggestedEvidenceType: opts.sourceType === 'note' ? 'note' : evidenceTypeForDoc(docType.value),
    fields,
    lineItems: q.lineItems,
    quantityFormula: q.formula,
    extractedText: text,
    legibility: found === 2 ? 'good' : found === 1 ? 'partial' : 'poor',
    retakeSuggested: false,
    retakeReasons: [],
    sensitiveIdsRedacted: count,
    lowConfidenceFields,
  };
}

// ---------------------------------------------------------------------------
// Voice transcript parsing
// ---------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, 'twenty five': 25, thirty: 30, 'thirty five': 35, forty: 40, fifty: 50,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chah: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20,
  pachees: 25, pachchis: 25, tees: 30, paintees: 35, chalis: 40, pachas: 50,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, छः: 6, सात: 7, आठ: 8, नौ: 9, दस: 10, ग्यारह: 11, बारह: 12,
  तेरह: 13, चौदह: 14, पंद्रह: 15, सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19, बीस: 20, पच्चीस: 25, तीस: 30,
  पैंतीस: 35, चालीस: 40, पचास: 50,
};

const FRACTIONS: Array<[RegExp, number, string]> = [
  [/\b(half|aadha|adha|aadhi|adhi)\b|आधा|आधी/iu, 0.5, '½'],
  [/\b(quarter|chauthai|paav)\b|चौथाई|पाव/iu, 0.25, '¼'],
  [/\b(three quarters?|paune)\b|पौना/iu, 0.75, '¾'],
  [/\b(one third|tihai)\b|तिहाई/iu, 1 / 3, '⅓'],
  [/\b(nothing|none|zero|kuch nahi|kuchh nahi)\b|कुछ नहीं|कुछ भी नहीं/iu, 0, '0'],
];

/** Replaces spoken number words with digits ("paanch kilo" → "5 kilo"). */
export function wordsToDigits(text: string): string {
  let out = normalizeDigits(text);
  const keys = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const isLatin = /^[a-z ]+$/.test(k);
    const re = isLatin ? new RegExp(`\\b${k}\\b`, 'gi') : new RegExp(`(?<![\\p{L}])${k}(?![\\p{L}\\p{M}])`, 'gu');
    out = out.replace(re, String(NUMBER_WORDS[k]));
  }
  // "aadha kilo" / "half a kilo" → 0.5 kilo ; "dhai" → 2.5 ; "dedh" → 1.5
  out = out
    .replace(/\b(half a|aadha|adha)\s+(kilo|kg)/gi, '0.5 $2')
    .replace(/\b(dhai|dhaai)\b|ढाई/giu, '2.5')
    .replace(/\b(dedh|derh)\b|डेढ़/giu, '1.5')
    .replace(/(\d+)\s+(and a half|saadhe)\b/gi, (_m, n: string) => String(Number(n) + 0.5));
  return out;
}

const RELATIVE_DAYS: Array<[RegExp, number]> = [
  [/\b(day before yesterday|parso|parson)\b|परसों/iu, -2],
  [/\b(today|aaj)\b|आज/iu, 0],
  // "kal" is ambiguous (yesterday/tomorrow); for a past visit it means yesterday, at low confidence.
  [/\b(yesterday|kal)\b|कल/iu, -1],
];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface VoiceOptions {
  period?: string;
  today?: string;
  /** Entitlement for the period, to resolve "half"/"quarter" deterministically. */
  entitlementKg?: number;
}

export function parseVoiceTranscript(transcript: string, opts: VoiceOptions = {}): VoiceParseResult & { readBack: string } {
  const { text: redacted } = redactSensitiveIds(transcript ?? '');
  const t = wordsToDigits(redacted);
  const today = opts.today ?? todayIST();

  // Household intent
  const cardType: ExtractedField<CardType> = /\b(aay|antyodaya|antodaya)\b|अंत्योदय/iu.test(t)
    ? field<CardType>('AAY', 0.85, 'antyodaya')
    : /\b(phh|priority|praathmik|prathmik)\b|प्राथमिक|प्राथमिकता/iu.test(t)
      ? field<CardType>('PHH', 0.85, 'priority household')
      : field<CardType>(null, 0);
  const memMatch = /(\d{1,2})\s*(members?|people|persons|log|sadasya|सदस्य|लोग|jan|जन)/iu.exec(t);
  const members = memMatch ? field(Number(memMatch[1]), 0.85, memMatch[0]) : field<number>(null, 0);

  // Record intent
  let date = findDate(t, opts);
  if (date.value === null) {
    for (const [re, delta] of RELATIVE_DAYS) {
      const m = re.exec(t);
      if (m) {
        date = field(addDays(today, delta), delta === -1 ? 0.7 : 0.85, m[0]);
        break;
      }
    }
  }
  if (date.value === null) {
    const dayOnly = /(?:on the |on |ko |tarikh |तारीख |)\b(\d{1,2})(?:st|nd|rd|th)\b|(\d{1,2})\s*(?:tarikh|तारीख)/iu.exec(t);
    const d = dayOnly ? Number(dayOnly[1] ?? dayOnly[2]) : null;
    if (d && opts.period) {
      const iso = `${opts.period}-${pad(d)}`;
      if (isValidDate(iso)) date = field(iso, 0.8, dayOnly![0]);
    }
  }

  let quantityExpression: VoiceParseResult['quantityExpression'] = null;
  let quantityKg: ExtractedField<number> = field<number>(null, 0);
  const q = findQuantities(t);
  if (q.total.value !== null) {
    quantityKg = q.total;
  } else {
    for (const [re, fraction, sym] of FRACTIONS) {
      const m = re.exec(t);
      if (!m) continue;
      if (fraction === 0) {
        quantityKg = field(0, 0.8, m[0]);
      } else if (opts.entitlementKg !== undefined) {
        const g = Math.round(kgToGrams(opts.entitlementKg) * fraction);
        quantityExpression = {
          kind: 'fraction_of_entitlement',
          fraction,
          formula: `${sym} × ${formatKg(opts.entitlementKg)} = ${formatKg(gramsToKg(g))}`,
        };
        // A spoken fraction is an approximation of what was received: always ask the user to check it.
        quantityKg = field(gramsToKg(g), 0.6, m[0]);
      }
      break;
    }
  }

  const evidenceType: ExtractedField<EvidenceType> = /\b(no (slip|receipt|parchi)|without (slip|receipt)|parchi nahi|rasid nahi)\b|पर्ची नहीं|रसीद नहीं/iu.test(t)
    ? field<EvidenceType>('none', 0.85, 'no slip')
    : /\b(slip|receipt|parchi|rasid)\b|पर्ची|रसीद/iu.test(t)
      ? field<EvidenceType>('receipt', 0.7, 'slip')
      : /\b(sms|message)\b|मैसेज|संदेश/iu.test(t)
        ? field<EvidenceType>('sms', 0.7, 'sms')
        : field<EvidenceType>(null, 0);

  const commodityValue = detectCommodity(t);
  const commodity = field<Commodity>(commodityValue, commodityValue ? 0.8 : 0);

  const hasRecord = quantityKg.value !== null || date.value !== null;
  const hasHousehold = cardType.value !== null || members.value !== null;
  const intent: VoiceParseResult['intent'] = hasRecord ? 'add_record' : hasHousehold ? 'set_household' : 'unknown';

  const lowConfidenceFields = intent === 'add_record' ? lowConfidenceFieldsOf({ date, quantityKg }) : [];

  return {
    intent,
    transcript: redacted,
    fields: { date, quantityKg, evidenceType, commodity, cardType, members },
    quantityExpression,
    lowConfidenceFields,
    readBack: voiceReadBack(intent, { date, quantityKg, evidenceType, cardType, members }, quantityExpression, 'en'),
  };
}

export function voiceReadBack(
  intent: VoiceParseResult['intent'],
  f: Pick<VoiceParseResult['fields'], 'date' | 'quantityKg' | 'evidenceType' | 'cardType' | 'members'>,
  expr: VoiceParseResult['quantityExpression'],
  lang: 'en' | 'hi',
): string {
  if (lang === 'hi') {
    if (intent === 'add_record') {
      const qty = f.quantityKg.value !== null ? `${formatKgNumber(f.quantityKg.value)} किलो` : 'मात्रा समझ नहीं आई';
      const when = f.date.value ? `${formatDate(f.date.value, 'hi')} को` : 'तारीख समझ नहीं आई';
      const how = expr ? ` (${expr.formula})` : '';
      const ev = f.evidenceType.value === 'none' ? ', बिना पर्ची के' : f.evidenceType.value === 'receipt' ? ', पर्ची के साथ' : '';
      return `मैंने सुना: ${when} ${qty}${how}${ev}। क्या यह सही है?`;
    }
    if (intent === 'set_household') {
      const bits = [f.cardType.value ? `${f.cardType.value} कार्ड` : null, f.members.value ? `${f.members.value} सदस्य` : null].filter(Boolean);
      return `मैंने सुना: ${bits.join(', ')}। क्या यह सही है?`;
    }
    return 'माफ़ कीजिए, मैं समझ नहीं पाया। कृपया फिर से बोलें, जैसे "पाँच तारीख को बारह किलो मिला"।';
  }
  if (intent === 'add_record') {
    const qty = f.quantityKg.value !== null ? formatKg(f.quantityKg.value) : 'an amount I could not understand';
    const when = f.date.value ? `on ${formatDate(f.date.value, 'en')}` : 'on a date I could not understand';
    const how = expr ? ` (${expr.formula})` : '';
    const ev = f.evidenceType.value === 'none' ? ', with no slip' : f.evidenceType.value === 'receipt' ? ', with a slip' : '';
    return `I heard ${qty}${how} ${when}${ev}. Is that right?`;
  }
  if (intent === 'set_household') {
    const bits = [f.cardType.value ? `${f.cardType.value} card` : null, f.members.value ? `${f.members.value} members` : null].filter(Boolean);
    return `I heard ${bits.join(', ')}. Is that right?`;
  }
  return 'Sorry, I did not understand. Please try again, for example: "I got 12 kg on the 5th".';
}

/** Read-back for an OCR / text extraction draft. */
export function extractionReadBack(r: ExtractionResult, lang: 'en' | 'hi'): string {
  const f = r.fields;
  if (lang === 'hi') {
    const qty = f.quantityKg.value !== null ? `${formatKgNumber(f.quantityKg.value)} किलो` : 'मात्रा नहीं पढ़ी जा सकी';
    const when = f.date.value ? `${formatDate(f.date.value, 'hi')} को` : 'तारीख नहीं पढ़ी जा सकी';
    const ref = f.reference.value ? `, पर्ची संख्या ${f.reference.value}` : '';
    const check = r.lowConfidenceFields.length ? ' कृपया पीले रंग वाले हिस्से जाँच लें।' : '';
    return `मैंने पढ़ा: ${when} ${qty}${ref}।${check}`;
  }
  const qty = f.quantityKg.value !== null ? formatKg(f.quantityKg.value) : 'no quantity I could read';
  const when = f.date.value ? `on ${formatDate(f.date.value, 'en')}` : 'with no date I could read';
  const ref = f.reference.value ? `, slip number ${f.reference.value}` : '';
  const check = r.lowConfidenceFields.length ? ` Please check: ${r.lowConfidenceFields.join(', ')}.` : '';
  return `I read ${qty} ${when}${ref}.${check}`;
}
