/**
 * Deterministic report + grievance text templates (Core Principle 6: strictly neutral).
 * No AI is involved in producing any text in this file. Every template string here must pass
 * `checkNeutrality()` — enforced by tests.
 */
import { DISCLAIMER, ENGINE_VERSION, GRIEVANCE_CATEGORY, LABEL_INFO, POSSIBLE_CAUSES, speechLangFor } from './constants.js';
import { computeSummary, formatDate, formatKg, formatKgNumber, formatPeriod, sortRecords, type EntitlementInput } from './engine.js';
import type {
  Commodity,
  CreatedVia,
  DiscrepancySummary,
  EntitlementRule,
  EvidenceType,
  Filing,
  LanguageCode,
  ReadbackPayload,
  RecordLabel,
  ReportRecordSnapshot,
  ReportSnapshot,
  TemplateLanguage,
  AiAssistInfo,
} from './types.js';

export interface SnapshotRecordInput {
  id: string;
  date: string;
  quantityKg: number;
  commodity?: Commodity | null;
  evidenceType: EvidenceType;
  evidenceContent?: string | null;
  photoId?: string | null;
  unclear: boolean;
  createdVia?: CreatedVia;
  aiAssist?: AiAssistInfo | null;
}

export interface SnapshotInput {
  household: EntitlementInput & { label: string; rule: EntitlementRule; cardName?: string | null };
  period: string;
  records: SnapshotRecordInput[];
  ruleConfirmedAt: string;
  generatedAt?: string;
}

export function buildReportSnapshot(input: SnapshotInput): ReportSnapshot {
  const summary = computeSummary({ household: input.household, period: input.period, records: input.records });
  const byId = new Map(summary.records.map((a) => [a.recordId, a]));
  const records: ReportRecordSnapshot[] = sortRecords(input.records).map((r) => {
    const a = byId.get(r.id)!;
    return {
      id: r.id,
      date: r.date,
      quantityKg: a.quantityKg,
      commodity: r.commodity ?? null,
      evidenceType: r.evidenceType,
      evidenceContent: r.evidenceContent ?? null,
      photoId: r.photoId ?? null,
      unclear: r.unclear,
      createdVia: r.createdVia ?? 'manual',
      labels: a.labels,
      counted: a.counted,
      exclusionReason: a.exclusionReason,
    };
  });
  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    period: input.period,
    household: { label: input.household.label, cardType: input.household.cardType, cardName: input.household.cardName ?? null, members: input.household.members },
    rule: { ...input.household.rule, confirmedAt: input.ruleConfirmedAt },
    summary,
    records,
    possibleCauses: POSSIBLE_CAUSES.en,
    disclaimer: DISCLAIMER.en,
  };
}

// ---------------------------------------------------------------------------
// Phrase tables
// ---------------------------------------------------------------------------

const T = {
  en: {
    title: 'RATIONSAATHI — ENTITLEMENT & EVIDENCE REPORT',
    period: 'Period',
    household: 'Household',
    cardType: 'Card type',
    members: 'Members on card',
    s1: '1. RULE USED',
    rule: 'Rule',
    perMember: 'per member per month',
    perFamily: 'per family per month (flat)',
    confirmedOn: 'confirmed by the household on',
    entitlement: 'Entitlement for the period',
    source: 'Source',
    sourceNote: 'Source note',
    lastVerified: 'Default last verified',
    notVerified: 'not verified',
    s2: '2. RECORDS AND EVIDENCE',
    noRecords: 'No records were entered for this period.',
    evidence: 'Evidence',
    labels: 'Labels',
    noLabels: 'none',
    counted: 'Counted',
    notCounted: 'NOT COUNTED',
    enteredVia: 'Entered via',
    s3: '3. ARITHMETIC',
    s4: '4. RESULT',
    labelsPresent: 'Labels for this period',
    s5: '5. RECORDS NOT COUNTED',
    allCounted: 'All records were counted.',
    s6: '6. POSSIBLE CAUSES (NOT ESTABLISHED BY THIS REPORT)',
    causesIntro: 'A difference like this can arise from many causes, including:',
    footer: 'Prepared with RationSaathi. The calculation above is plain deterministic arithmetic; no AI was used to compute it. Evidence text is reproduced as provided by the household.',
    reportId: 'Report ID',
    version: 'Version',
    hash: 'Integrity hash (SHA-256)',
    generated: 'Generated at',
    engine: 'Calculation engine',
    filed: 'FILED',
    filedRef: 'Grievance reference',
    filedOn: 'filed on',
  },
  hi: {
    title: 'राशनसाथी — पात्रता और प्रमाण रिपोर्ट',
    period: 'अवधि',
    household: 'परिवार',
    cardType: 'कार्ड का प्रकार',
    members: 'कार्ड पर सदस्य',
    s1: '1. उपयोग किया गया नियम',
    rule: 'नियम',
    perMember: 'प्रति सदस्य प्रति माह',
    perFamily: 'प्रति परिवार प्रति माह (एकमुश्त)',
    confirmedOn: 'परिवार द्वारा पुष्टि की तारीख',
    entitlement: 'इस अवधि की पात्रता',
    source: 'स्रोत',
    sourceNote: 'स्रोत टिप्पणी',
    lastVerified: 'डिफ़ॉल्ट अंतिम बार सत्यापित',
    notVerified: 'सत्यापित नहीं',
    s2: '2. रिकॉर्ड और प्रमाण',
    noRecords: 'इस अवधि के लिए कोई रिकॉर्ड दर्ज नहीं किया गया।',
    evidence: 'प्रमाण',
    labels: 'लेबल',
    noLabels: 'कोई नहीं',
    counted: 'गिना गया',
    notCounted: 'गिना नहीं गया',
    enteredVia: 'दर्ज करने का तरीका',
    s3: '3. गणना',
    s4: '4. परिणाम',
    labelsPresent: 'इस अवधि के लेबल',
    s5: '5. जो रिकॉर्ड गिने नहीं गए',
    allCounted: 'सभी रिकॉर्ड गिने गए।',
    s6: '6. संभावित कारण (यह रिपोर्ट इनमें से किसी को स्थापित नहीं करती)',
    causesIntro: 'ऐसा अंतर कई कारणों से हो सकता है, जैसे:',
    footer: 'राशनसाथी द्वारा तैयार। ऊपर की गणना सामान्य, तय नियमों वाला अंकगणित है; इसमें AI का उपयोग नहीं हुआ। प्रमाण का पाठ परिवार द्वारा दिए गए रूप में ही दिखाया गया है।',
    reportId: 'रिपोर्ट आईडी',
    version: 'संस्करण',
    hash: 'अखंडता हैश (SHA-256)',
    generated: 'बनाने का समय',
    engine: 'गणना इंजन',
    filed: 'शिकायत दर्ज',
    filedRef: 'शिकायत संदर्भ संख्या',
    filedOn: 'दर्ज करने की तारीख',
  },
} as const;

const EVIDENCE_NAMES: Record<TemplateLanguage, Record<EvidenceType, string>> = {
  en: { receipt: 'Receipt / slip number', sms: 'SMS text', photo: 'Photo', note: 'Note by household', none: 'No evidence' },
  hi: { receipt: 'रसीद / पर्ची संख्या', sms: 'SMS का पाठ', photo: 'फोटो', note: 'परिवार का नोट', none: 'कोई प्रमाण नहीं' },
};

const COMMODITY_NAMES: Record<TemplateLanguage, Record<Commodity, string>> = {
  en: { rice: 'rice', wheat: 'wheat', coarse_grains: 'coarse grains', mixed: 'mixed', other: 'other' },
  hi: { rice: 'चावल', wheat: 'गेहूँ', coarse_grains: 'मोटा अनाज', mixed: 'मिश्रित', other: 'अन्य' },
};

const VIA_NAMES: Record<TemplateLanguage, Record<CreatedVia, string>> = {
  en: { manual: 'typed by household', voice: 'voice (confirmed by household)', ocr: 'photo/text reading (confirmed by household)' },
  hi: { manual: 'परिवार द्वारा टाइप किया गया', voice: 'आवाज़ से (परिवार द्वारा पुष्टि)', ocr: 'फोटो/पाठ पढ़कर (परिवार द्वारा पुष्टि)' },
};

function kgL(kg: number, lang: TemplateLanguage): string {
  return lang === 'hi' ? `${formatKgNumber(kg)} किलो` : formatKg(kg);
}

export function entitlementFormula(s: DiscrepancySummary, lang: TemplateLanguage): string {
  const e = s.entitlement;
  if (lang === 'en') return e.formula;
  if (e.basis === 'perFamily') return `${kgL(e.perUnitKg, 'hi')} प्रति परिवार = ${kgL(e.kg, 'hi')}`;
  return `${kgL(e.perUnitKg, 'hi')} × ${e.members} सदस्य = ${kgL(e.kg, 'hi')}`;
}

function labelName(l: RecordLabel | 'shortfall', lang: TemplateLanguage): string {
  return LABEL_INFO[l][lang].name;
}

function exclusionText(reason: 'unrecorded' | 'unclear', lang: TemplateLanguage): string {
  if (lang === 'hi') return reason === 'unrecorded' ? 'कोई प्रमाण नहीं जुड़ा (बिना प्रमाण)' : 'अनिश्चित के रूप में चिह्नित (अस्पष्ट)';
  return reason === 'unrecorded' ? 'no evidence linked (Unrecorded)' : 'marked as unsure (Unclear)';
}

function lateText(pos: 'before_period' | 'after_period', lang: TemplateLanguage): string {
  if (lang === 'hi') return pos === 'before_period' ? 'तारीख अवधि से पहले की है' : 'तारीख अवधि के बाद की है';
  return pos === 'before_period' ? 'dated before the period' : 'dated after the period';
}

/** One neutral sentence describing the result. */
export function resultSentence(s: DiscrepancySummary, lang: TemplateLanguage): string {
  const p = formatPeriod(s.period, lang);
  const ent = kgL(s.entitlement.kg, lang);
  const got = kgL(s.totals.countedKg, lang);
  const diff = kgL(Math.abs(s.differenceKg), lang);
  if (lang === 'hi') {
    if (s.status === 'shortfall') return `${p} के लिए गिनी गई प्राप्त मात्रा ${got} है, जो ऊपर दिए नियम के अनुसार ${ent} की पात्रता से ${diff} कम है।`;
    if (s.status === 'matches') return `${p} के लिए गिनी गई प्राप्त मात्रा ${got} है, जो ऊपर दिए नियम के अनुसार ${ent} की पात्रता के बराबर है।`;
    return `${p} के लिए गिनी गई प्राप्त मात्रा ${got} है, जो ऊपर दिए नियम के अनुसार ${ent} की पात्रता से ${diff} अधिक है। ऐसा अग्रिम या बकाया वितरण के कारण हो सकता है।`;
  }
  if (s.status === 'shortfall') return `The counted quantity received for ${p} is ${got}, which is ${diff} less than the entitlement of ${ent} under the rule above.`;
  if (s.status === 'matches') return `The counted quantity received for ${p} is ${got}, which equals the entitlement of ${ent} under the rule above.`;
  return `The counted quantity received for ${p} is ${got}, which is ${diff} more than the entitlement of ${ent} under the rule above. This can happen with advance or make-up deliveries.`;
}

function excludedSentence(s: DiscrepancySummary, lang: TemplateLanguage): string | null {
  if (s.totals.excludedCount === 0) return null;
  const n = s.totals.excludedCount;
  const kg = kgL(s.totals.excludedKg, lang);
  if (lang === 'hi') return `इसके अलावा ${n} रिकॉर्ड (कुल ${kg}) सूचीबद्ध हैं पर गिने नहीं गए, क्योंकि उनके साथ कोई प्रमाण नहीं जुड़ा है या वे अस्पष्ट चिह्नित हैं।`;
  return `In addition, ${n} ${n === 1 ? 'record' : 'records'} totalling ${kg} ${n === 1 ? 'is' : 'are'} listed but not counted, because ${n === 1 ? 'it has' : 'they have'} no linked evidence or ${n === 1 ? 'is' : 'are'} marked unclear.`;
}

function lateSentence(s: DiscrepancySummary, lang: TemplateLanguage): string | null {
  const n = s.records.filter((r) => r.latePosition).length;
  if (n === 0) return null;
  if (lang === 'hi') return `${n} रिकॉर्ड की तारीख इस अवधि से बाहर है; उन्हें फिर भी गिना गया है।`;
  return `${n} ${n === 1 ? 'record is' : 'records are'} dated outside the period; ${n === 1 ? 'it is' : 'they are'} still counted.`;
}

// ---------------------------------------------------------------------------
// Full report text
// ---------------------------------------------------------------------------

export interface RenderExtras {
  reportId?: string;
  version?: number;
  contentHash?: string;
  filing?: Pick<Filing, 'referenceNumber' | 'filedDate'> | null;
}

export function renderReportText(snap: ReportSnapshot, lang: TemplateLanguage, extras: RenderExtras = {}): string {
  const t = T[lang];
  const s = snap.summary;
  const L: string[] = [];
  const hr = '─'.repeat(60);

  L.push(t.title, hr);
  L.push(`${t.period}: ${formatPeriod(snap.period, lang)} (${s.periodStart} – ${s.periodEnd})`);
  const card = snap.household.cardName ? `${snap.household.cardType} — ${snap.household.cardName}` : snap.household.cardType;
  L.push(`${t.household}: ${snap.household.label} · ${t.cardType}: ${card} · ${t.members}: ${snap.household.members}`);
  if (extras.filing) {
    L.push(`[${t.filed}] ${t.filedRef}: ${extras.filing.referenceNumber} · ${t.filedOn}: ${extras.filing.filedDate}`);
  }
  L.push('');

  L.push(t.s1);
  L.push(`${t.rule}: ${kgL(snap.rule.perUnitKg, lang)} ${snap.rule.basis === 'perFamily' ? t.perFamily : t.perMember} (${t.confirmedOn} ${snap.rule.confirmedAt.slice(0, 10)})`);
  L.push(`${t.entitlement}: ${entitlementFormula(s, lang)}`);
  L.push(`${t.source}: ${snap.rule.sourceTitle}${snap.rule.sourceUrl ? ` — ${snap.rule.sourceUrl}` : ''}`);
  if (snap.rule.sourceNote) L.push(`${t.sourceNote}: ${snap.rule.sourceNote}`);
  L.push(`${t.lastVerified}: ${snap.rule.lastVerified ?? t.notVerified}`);
  L.push('');

  L.push(t.s2);
  if (snap.records.length === 0) L.push(t.noRecords);
  const assessById = new Map(s.records.map((a) => [a.recordId, a]));
  snap.records.forEach((r, i) => {
    const a = assessById.get(r.id);
    const commodity = r.commodity ? ` (${COMMODITY_NAMES[lang][r.commodity]})` : '';
    L.push(`#${i + 1}  ${formatDate(r.date, lang)} — ${kgL(r.quantityKg, lang)}${commodity}`);
    let ev = EVIDENCE_NAMES[lang][r.evidenceType];
    if (r.evidenceContent) ev += `: "${r.evidenceContent.replace(/\s+/g, ' ').trim()}"`;
    if (r.photoId) ev += ` [photo ${r.photoId}]`;
    L.push(`    ${t.evidence}: ${ev}`);
    const labels = r.labels.length ? r.labels.map((l) => labelName(l, lang)).join(', ') : t.noLabels;
    const late = a?.latePosition ? ` (${lateText(a.latePosition, lang)})` : '';
    const counted = r.counted ? t.counted : `${t.notCounted} — ${exclusionText(r.exclusionReason!, lang)}`;
    L.push(`    ${t.labels}: ${labels}${late} · ${counted}`);
    L.push(`    ${t.enteredVia}: ${VIA_NAMES[lang][r.createdVia]}`);
  });
  L.push('');

  L.push(t.s3);
  for (const line of s.arithmetic) L.push(`  ${line}`);
  L.push('');

  L.push(t.s4);
  L.push(resultSentence(s, lang));
  const late = lateSentence(s, lang);
  if (late) L.push(late);
  L.push(`${t.labelsPresent}: ${s.labels.length ? s.labels.map((l) => labelName(l, lang)).join(', ') : t.noLabels}`);
  L.push('');

  L.push(t.s5);
  const excluded = snap.records.filter((r) => !r.counted);
  if (excluded.length === 0) L.push(t.allCounted);
  else {
    const ex = excludedSentence(s, lang);
    if (ex) L.push(ex);
    for (const r of excluded) L.push(`  - ${formatDate(r.date, lang)}, ${kgL(r.quantityKg, lang)}: ${exclusionText(r.exclusionReason!, lang)}`);
  }
  L.push('');

  L.push(t.s6);
  L.push(t.causesIntro);
  for (const c of POSSIBLE_CAUSES[lang]) L.push(`  - ${c}`);
  L.push('');
  L.push(DISCLAIMER[lang]);
  L.push(hr);

  if (extras.reportId) L.push(`${t.reportId}: ${extras.reportId}${extras.version ? ` · ${t.version} ${extras.version}` : ''}`);
  if (extras.contentHash) L.push(`${t.hash}: ${extras.contentHash}`);
  L.push(`${t.generated}: ${snap.generatedAt} · ${t.engine}: v${snap.engineVersion}`);
  L.push(t.footer);
  return L.join('\n');
}

// ---------------------------------------------------------------------------
// Grievance description
// ---------------------------------------------------------------------------

export function grievanceCategory(lang: TemplateLanguage): { code: typeof GRIEVANCE_CATEGORY.code; label: string } {
  return { code: GRIEVANCE_CATEGORY.code, label: lang === 'hi' ? GRIEVANCE_CATEGORY.labelHi : GRIEVANCE_CATEGORY.label };
}

export function generateGrievanceDescription(
  snap: ReportSnapshot,
  lang: TemplateLanguage,
  opts: { reportId?: string; contentHash?: string } = {},
): string {
  const s = snap.summary;
  const p = formatPeriod(snap.period, lang);
  const ent = kgL(s.entitlement.kg, lang);
  const got = kgL(s.totals.countedKg, lang);
  const diff = kgL(Math.abs(s.differenceKg), lang);
  const parts: string[] = [];
  const ref = opts.reportId ? `RS-${opts.reportId.replace(/-/g, '').slice(0, 8).toUpperCase()}` : null;

  if (lang === 'hi') {
    parts.push(`${p} के लिए, उपयोग किए गए नियम (${snap.household.cardType} कार्ड, ${entitlementFormula(s, 'hi')}) के अनुसार इस परिवार की राशन पात्रता ${ent} खाद्यान्न है।`);
    if (s.status === 'shortfall') {
      parts.push(`संलग्न रिपोर्ट में दर्ज रिकॉर्ड और प्रमाण के आधार पर प्राप्त और गिनी गई मात्रा ${got} है, यानी ${diff} का अंतर।`);
    } else if (s.status === 'matches') {
      parts.push(`संलग्न रिपोर्ट में दर्ज रिकॉर्ड और प्रमाण के आधार पर प्राप्त और गिनी गई मात्रा ${got} है, जो पात्रता के बराबर है।`);
    } else {
      parts.push(`संलग्न रिपोर्ट में दर्ज रिकॉर्ड और प्रमाण के आधार पर प्राप्त और गिनी गई मात्रा ${got} है, जो पात्रता से ${diff} अधिक है।`);
    }
    const ex = excludedSentence(s, 'hi');
    if (ex) parts.push(ex);
    const late = lateSentence(s, 'hi');
    if (late) parts.push(late);
    parts.push('इस अंतर का कारण स्थापित नहीं हुआ है।');
    if (s.status === 'shortfall') parts.push('अनुरोध है कि इस अवधि में प्राप्त मात्रा का मिलान रिकॉर्ड से किया जाए और यदि कोई मात्रा देय है तो उसे प्रदान किया जाए।');
    if (ref) parts.push(`रिपोर्ट संदर्भ: ${ref}${opts.contentHash ? ` (हैश ${opts.contentHash.slice(0, 12)})` : ''}।`);
    return parts.join(' ');
  }

  parts.push(`For ${p}, the ration entitlement for this household under the rule used (${snap.household.cardType} card, ${s.entitlement.formula}) is ${ent} of foodgrains.`);
  if (s.status === 'shortfall') {
    parts.push(`Based on the records and evidence listed in the attached report, the quantity received and counted is ${got}, a difference of ${diff}.`);
  } else if (s.status === 'matches') {
    parts.push(`Based on the records and evidence listed in the attached report, the quantity received and counted is ${got}, which equals the entitlement.`);
  } else {
    parts.push(`Based on the records and evidence listed in the attached report, the quantity received and counted is ${got}, which is ${diff} more than the entitlement.`);
  }
  const ex = excludedSentence(s, 'en');
  if (ex) parts.push(ex);
  const late = lateSentence(s, 'en');
  if (late) parts.push(late);
  parts.push('The cause of this difference has not been established.');
  if (s.status === 'shortfall') parts.push('I request that the quantity received for this period be checked against the records and that any quantity due be provided.');
  if (ref) parts.push(`Report reference: ${ref}${opts.contentHash ? ` (hash ${opts.contentHash.slice(0, 12)})` : ''}.`);
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Read-back (text-to-speech)
// ---------------------------------------------------------------------------

/** Splits text into speakable sentences. */
export function buildReadback(text: string, lang: LanguageCode): ReadbackPayload {
  const segments = text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?।])\s+/))
    .map((s) => s.replace(/[─#*]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0);
  return { language: lang, speechLang: speechLangFor(lang), segments, fullText: segments.join(' ') };
}

/** A short spoken version of a report, easier to follow by ear than the full text. */
export function buildReportSpokenSummary(snap: ReportSnapshot, lang: TemplateLanguage): ReadbackPayload {
  const s = snap.summary;
  const seg: string[] = [];
  const p = formatPeriod(snap.period, lang);
  if (lang === 'hi') {
    seg.push(`यह ${p} की रिपोर्ट है।`);
    seg.push(`नियम के अनुसार पात्रता: ${entitlementFormula(s, 'hi')}।`);
    snap.records.forEach((r, i) => {
      seg.push(`रिकॉर्ड ${i + 1}: ${formatDate(r.date, 'hi')}, ${kgL(r.quantityKg, 'hi')}, प्रमाण: ${EVIDENCE_NAMES.hi[r.evidenceType]}। ${r.counted ? 'गिना गया।' : `गिना नहीं गया, क्योंकि ${exclusionText(r.exclusionReason!, 'hi')}।`}`);
    });
  } else {
    seg.push(`This is the report for ${p}.`);
    seg.push(`Entitlement under the rule: ${s.entitlement.formula}.`);
    snap.records.forEach((r, i) => {
      seg.push(`Record ${i + 1}: ${formatDate(r.date, 'en')}, ${kgL(r.quantityKg, 'en')}, evidence: ${EVIDENCE_NAMES.en[r.evidenceType]}. ${r.counted ? 'Counted.' : `Not counted, because of ${exclusionText(r.exclusionReason!, 'en')}.`}`);
    });
  }
  seg.push(resultSentence(s, lang));
  const ex = excludedSentence(s, lang);
  if (ex) seg.push(ex);
  seg.push(DISCLAIMER[lang]);
  return { language: lang, speechLang: speechLangFor(lang), segments: seg, fullText: seg.join(' ') };
}

/** Deterministic canonical JSON (sorted keys) used for content hashing. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(',')}}`;
}
