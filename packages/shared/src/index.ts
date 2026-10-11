/**
 * @repo/shared - Domain types, constants, entitlement engine, templates,
 * guards, text extractors, voice parsers, and typed API client for RationSaathi.
 */

// ==========================================
// 1. CONSTANTS & DOMAIN DATA
// ==========================================

export const ENGINE_VERSION = '1.0.0';
export const LOW_CONFIDENCE_THRESHOLD = 0.75;

export type LanguageCode =
  | 'en'
  | 'hi'
  | 'mr'
  | 'bn'
  | 'ta'
  | 'te'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'pa'
  | 'or'
  | 'as'
  | 'ur';

export interface SupportedLanguage {
  code: LanguageCode;
  name: string;
  nativeName: string;
  speechLang: string; // BCP-47
  templateSupported: boolean;
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', speechLang: 'en-IN', templateSupported: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechLang: 'hi-IN', templateSupported: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechLang: 'mr-IN', templateSupported: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechLang: 'bn-IN', templateSupported: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechLang: 'ta-IN', templateSupported: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechLang: 'te-IN', templateSupported: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechLang: 'gu-IN', templateSupported: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechLang: 'kn-IN', templateSupported: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechLang: 'ml-IN', templateSupported: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechLang: 'pa-IN', templateSupported: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', speechLang: 'or-IN', templateSupported: false },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', speechLang: 'as-IN', templateSupported: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', speechLang: 'ur-IN', templateSupported: false, rtl: true },
];

export interface IndianState {
  code: string;
  name: string;
  portalUrl?: string;
  helpline?: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh', portalUrl: 'https://epdsap.ap.gov.in', helpline: '1967' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam', helpline: '1967' },
  { code: 'BR', name: 'Bihar', portalUrl: 'http://epds.bihar.gov.in', helpline: '1800-3456-194' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'CT', name: 'Chhattisgarh', portalUrl: 'https://khadya.cg.nic.in', helpline: '1800-233-3663' },
  { code: 'DL', name: 'Delhi', portalUrl: 'https://nfs.delhi.gov.in', helpline: '1967' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat', portalUrl: 'https://dcs-dof.gujarat.gov.in', helpline: '1800-233-5500' },
  { code: 'HR', name: 'Haryana', helpline: '1800-180-2087' },
  { code: 'HP', name: 'Himachal Pradesh', helpline: '1967' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand', portalUrl: 'https://aahar.jharkhand.gov.in', helpline: '1800-3456-598' },
  { code: 'KA', name: 'Karnataka', portalUrl: 'https://ahara.kar.nic.in', helpline: '1967' },
  { code: 'KL', name: 'Kerala', portalUrl: 'https://civilsupplieskerala.gov.in', helpline: '1967' },
  { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'MP', name: 'Madhya Pradesh', portalUrl: 'http://rationmitra.nic.in', helpline: '181' },
  { code: 'MH', name: 'Maharashtra', portalUrl: 'https://mahaepos.gov.in', helpline: '1800-22-4950' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha', portalUrl: 'http://pdsodisha.gov.in', helpline: '1967' },
  { code: 'PB', name: 'Punjab', helpline: '1967' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'RJ', name: 'Rajasthan', portalUrl: 'https://food.rajasthan.gov.in', helpline: '181' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu', portalUrl: 'https://www.tnpds.gov.in', helpline: '1967' },
  { code: 'TS', name: 'Telangana', portalUrl: 'https://epds.telangana.gov.in', helpline: '1967' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh', portalUrl: 'https://fcs.up.gov.in', helpline: '1800-1800-150' },
  { code: 'UK', name: 'Uttarakhand', helpline: '1967' },
  { code: 'WB', name: 'West Bengal', portalUrl: 'https://wbpds.wb.gov.in', helpline: '1967' },
];

export type CardType = 'AAY' | 'PHH' | 'CUSTOM';
export type RuleBasis = 'perMember' | 'perFamily';

export interface EntitlementRule {
  perUnitKg: number;
  basis: RuleBasis;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceNote: string;
  lastVerified: string | null; // YYYY-MM-DD or null
}

export interface RuleDefault {
  cardType: CardType;
  rule: EntitlementRule;
}

export const RULE_DEFAULTS: Record<'AAY' | 'PHH', EntitlementRule> = {
  AAY: {
    perUnitKg: 35,
    basis: 'perFamily',
    sourceTitle: 'National Food Security Act, 2013 — Antyodaya Anna Yojana',
    sourceUrl: 'https://nfsa.gov.in/',
    sourceNote: 'National statutory scale: 35 kg per family per month.',
    lastVerified: null,
  },
  PHH: {
    perUnitKg: 5,
    basis: 'perMember',
    sourceTitle: 'National Food Security Act, 2013 — Priority Households',
    sourceUrl: 'https://nfsa.gov.in/',
    sourceNote: 'National statutory scale: 5 kg per member per month.',
    lastVerified: null,
  },
};

export function getRuleDefault(cardType: CardType): EntitlementRule {
  if (cardType === 'AAY') return { ...RULE_DEFAULTS.AAY };
  if (cardType === 'PHH') return { ...RULE_DEFAULTS.PHH };
  return {
    perUnitKg: 5,
    basis: 'perMember',
    sourceTitle: 'State / Custom Scheme',
    sourceUrl: null,
    sourceNote: 'User-specified allocation.',
    lastVerified: null,
  };
}

export const POSSIBLE_CAUSES: Record<string, string[]> = {
  en: [
    'Genuine stock shortage at the shop',
    'Biometric / e-PoS authentication failure',
    'Delivery split across visits that were not all recorded',
    'A recording or data-entry error',
  ],
  hi: [
    'दुकान पर राशन सामग्री की वास्तविक कमी',
    'बायोमेट्रिक या ई-पॉस (e-PoS) मशीन में प्रमाणीकरण विफलता',
    'अलग-अलग तारीखों में राशन वितरण जो दर्ज होने से रह गया हो',
    'दर्ज करने या आंकड़े प्रविष्ट करने में मानवीय भूल',
  ],
};

export const DISCLAIMER: Record<string, string> = {
  en: 'This report states a difference and the evidence for it. It does not establish a cause and does not allege wrongdoing by any person or shop.',
  hi: 'यह रिपोर्ट प्राप्त राशन और पात्रता के बीच के अंतर तथा उपलब्ध साक्ष्य को दर्शाती है। यह किसी व्यक्ति या उचित मूल्य दुकान पर किसी प्रकार का आरोप नहीं लगाती और न ही कारण का दावा करती है।',
};

export interface LabelInfo {
  code: 'shortfall' | 'late' | 'unrecorded' | 'unclear' | 'recorded';
  title: string;
  explanation: string;
  color: string;
}

export const LABEL_INFO: Record<string, LabelInfo> = {
  shortfall: {
    code: 'shortfall',
    title: 'Shortfall',
    explanation: 'The counted quantity is less than the entitlement for this month. This tool does not know why.',
    color: 'amber',
  },
  late: {
    code: 'late',
    title: 'Late',
    explanation: 'This record\'s date is outside the month being checked. It is still counted.',
    color: 'yellow',
  },
  unrecorded: {
    code: 'unrecorded',
    title: 'Unrecorded',
    explanation: 'No slip, SMS, photo or note is linked, so it is not counted.',
    color: 'blue-gray',
  },
  unclear: {
    code: 'unclear',
    title: 'Unclear',
    explanation: 'Marked as unsure, so it is not counted until confirmed.',
    color: 'gray',
  },
  recorded: {
    code: 'recorded',
    title: 'Recorded',
    explanation: 'Verified with evidence and counted in summary.',
    color: 'teal',
  },
};

export interface FaqEntry {
  id: string;
  question: string;
  questionHi?: string;
  answer: string;
  answerHi?: string;
  keywords: string[];
}

export const FAQ: FaqEntry[] = [
  {
    id: 'unrecorded',
    question: 'What does Unrecorded mean?',
    questionHi: 'अन-रिकॉर्डेड (Unrecorded) का क्या अर्थ है?',
    answer: 'An Unrecorded mark means the visit had "No evidence" (no receipt number, SMS, photo, or note). In line with non-negotiable principle P3, RationSaathi only counts evidence-linked records.',
    answerHi: 'अन-रिकॉर्डेड का अर्थ है कि उस लेनदेन के साथ कोई साक्ष्य (पर्ची, SMS, फोटो या नोट) संलग्न नहीं था। सिद्धांत P3 के अनुसार बिना साक्ष्य के प्रविष्टि योग में नहीं जोड़ी जाती।',
    keywords: ['unrecorded', 'evidence', 'not counted', 'none', 'साक्ष्य', 'अन-रिकॉर्डेड'],
  },
  {
    id: 'unclear',
    question: 'What does Unclear mean?',
    questionHi: 'अन-क्लियर (Unclear) का क्या अर्थ है?',
    answer: 'Unclear means either you checked "I\'m not sure about this amount", or an AI draft had low confidence and was not explicitly verified. Unclear entries are kept safe but excluded from the counted total until verified.',
    answerHi: 'अन-क्लियर का अर्थ है कि आपने संदेह दर्ज किया था या AI द्वारा पढ़े गए विवरण की पुष्टि नहीं की गई। यह योग में तब तक नहीं जुड़ता जब तक आप पुष्टि न करें।',
    keywords: ['unclear', 'unsure', 'confidence', 'verify', 'संदेह'],
  },
  {
    id: 'dgro',
    question: 'What is a DGRO?',
    questionHi: 'DGRO (जिला शिकायत निवारण अधिकारी) क्या होता है?',
    answer: 'Under Section 15 of the National Food Security Act (NFSA 2013), each district has a designated District Grievance Redressal Officer (DGRO) to hear and resolve ration and food entitlement grievances.',
    answerHi: 'राष्ट्रीय खाद्य सुरक्षा अधिनियम (NFSA 2013) की धारा 15 के तहत, हर जिले में एक जिला शिकायत निवारण अधिकारी (DGRO) नियुक्त होता है जो राशन संबंधित शिकायतों का निपटारा करता है।',
    keywords: ['dgro', 'officer', 'redressal', 'district', 'अधिकारी', 'शिकायत'],
  },
  {
    id: 'fps_no',
    question: 'Where do I find my FPS number?',
    questionHi: 'मुझे अपना उचित मूल्य दुकान (FPS) नंबर कहाँ मिलेगा?',
    answer: 'Your FPS (Fair Price Shop / ration shop) number is typically printed on your monthly ration slip, transaction receipt, or on the state Food & Civil Supplies online portal under your ration card details.',
    answerHi: 'राशन दुकान नंबर आपके राशन पर्चे, ई-पॉस पर्ची या राज्य खाद्य विभाग के पोर्टल पर आपके राशन कार्ड विवरण में दर्ज होता है।',
    keywords: ['fps', 'shop', 'dealer', 'number', 'दुकान नंबर'],
  },
  {
    id: 'after_file',
    question: 'What happens after I file my grievance?',
    questionHi: 'शिकायत दर्ज करने के बाद क्या होता है?',
    answer: 'Once you submit your complaint on the official state portal, you will receive a Grievance Reference Number via SMS. Save that reference in RationSaathi to mark your check as Filed. The state authorities will process it according to NFSA timelines.',
    answerHi: 'सरकारी पोर्टल पर शिकायत दर्ज करने के बाद आपको SMS द्वारा शिकायत संदर्भ संख्या मिलेगी। उसे राशनसाथी में दर्ज करके स्थिति को "दर्ज (Filed)" करें।',
    keywords: ['file', 'grievance', 'reference', 'status', 'portal'],
  },
  {
    id: 'why_shortfall',
    question: 'Why did I receive less grain this month?',
    questionHi: 'मुझे इस महीने कम अनाज क्यों मिला?',
    answer: 'RationSaathi calculates the arithmetic difference between your confirmed entitlement and recorded visits. By design (Principle P5), we cannot determine why a difference occurred. Check the Possible Causes list on your report.',
    answerHi: 'राशनसाथी केवल पात्रता और मिली मात्रा का गणितीय अंतर निकालता है। सिद्धांत P5 के अनुसार हम कारण नहीं बता सकते। कृपया रिपोर्ट में संभावित कारणों की सूची देखें।',
    keywords: ['why', 'cheat', 'dealer', 'less', 'stolen', 'कमी', 'कारण'],
  },
];

// ==========================================
// 2. TYPES
// ==========================================

export interface Household {
  id: string;
  label: string;
  cardType: CardType;
  members: number;
  rule: EntitlementRule;
  ruleConfirmed: boolean;
  ruleConfirmedAt: string | null;
  stateCode: string;
  district?: string;
  fpsNo?: string;
  fpsName?: string;
  rationCardNo?: string; // Local storage ONLY
  syncState?: 'synced' | 'pending' | 'error';
  createdAt?: string;
  updatedAt?: string;
}

export type CheckStatus = 'open' | 'reported' | 'filed';

export interface Check {
  id: string;
  householdId: string;
  period: string; // 'YYYY-MM'
  status: CheckStatus;
  syncState?: 'synced' | 'pending' | 'error';
  createdAt?: string;
  updatedAt?: string;
}

export type EvidenceType = 'receipt' | 'sms' | 'photo' | 'note' | 'none';
export type Commodity = 'rice' | 'wheat' | 'coarse_grains' | 'mixed' | 'other';
export type CreatedVia = 'manual' | 'ocr' | 'voice' | 'paste';

export interface DistributionRecord {
  id: string;
  checkId: string;
  date: string; // 'YYYY-MM-DD'
  quantityKg: number;
  commodity?: Commodity;
  evidenceType: EvidenceType;
  evidenceContent?: string;
  photoId?: string;
  unclear?: boolean;
  confirmed: boolean;
  createdVia?: CreatedVia;
  aiAssist?: {
    draftId?: string;
    lowConfidenceFields?: string[];
    userVerifiedLowConfidence?: boolean;
  };
  labels?: Array<'Late' | 'Unrecorded' | 'Unclear' | 'Recorded'>;
  counted?: boolean;
  exclusionReason?: string;
  syncState?: 'synced' | 'pending' | 'error';
  createdAt?: string;
  updatedAt?: string;
}

export type SummaryStatus = 'shortfall' | 'matches' | 'above_entitlement';

export interface DiscrepancySummary {
  period: string;
  householdCardType: CardType;
  householdMembers: number;
  ruleFormula: string;
  entitledKg: number;
  receivedCountedKg: number;
  differenceKg: number;
  status: SummaryStatus;
  arithmetic: string[];
  recordsCounted: number;
  recordsExcluded: number;
  excludedKg: number;
  exclusionBreakdown: {
    unrecordedCount: number;
    unrecordedKg: number;
    unclearCount: number;
    unclearKg: number;
  };
}

export interface ReportSnapshot {
  period: string;
  household: {
    id: string;
    label: string;
    cardType: CardType;
    members: number;
    stateCode: string;
    district?: string;
    fpsNo?: string;
    fpsName?: string;
  };
  rule: EntitlementRule & { formula: string; confirmedAt: string };
  summary: DiscrepancySummary;
  records: Array<{
    id: string;
    date: string;
    quantityKg: number;
    commodity?: Commodity;
    evidenceType: EvidenceType;
    evidenceContent?: string;
    photoId?: string;
    labels: string[];
    counted: boolean;
    exclusionReason?: string;
  }>;
  generatedAt: string;
}

export interface Report {
  id: string;
  checkId: string;
  version: number;
  language: 'en' | 'hi';
  snapshot: ReportSnapshot;
  text: string;
  contentHash: string;
  createdAt: string;
}

export interface Filing {
  id: string;
  checkId: string;
  referenceNumber: string;
  filedDate: string; // YYYY-MM-DD
  portalUrl?: string;
  createdAt: string;
}

export interface GrievanceDraft {
  checkId: string;
  stateCode: string;
  district: string;
  fpsNo: string;
  fpsName: string;
  category: string;
  description: string;
  descriptionSource: 'generated' | 'edited' | 'translated';
  languageAdvice: {
    preferredLanguage: string;
    portalAcceptsVernacular: boolean | null;
    advice: string;
  };
  copyFields: {
    state: string;
    district: string;
    rationCardNo: string | null;
    fpsNo: string;
    fpsName: string;
    category: string;
    description: string;
  };
  portal: {
    name: string;
    url: string;
    statusUrl?: string;
  };
}

export interface GrievanceChannel {
  id: string;
  stateCode: string;
  kind: 'portal' | 'status_check' | 'helpline' | 'dgro' | 'state_commission' | 'other';
  name: string;
  value: string;
  notes?: string;
  acceptedLanguages?: string[];
  sourceUrl?: string;
  lastVerified?: string | null;
  verificationStatus: 'verified' | 'unverified';
}

export interface ReadbackPayload {
  language: LanguageCode;
  text: string;
  segments: string[];
}

export interface AiDraft {
  id: string;
  kind: 'ocr' | 'text_extract' | 'voice' | 'translation';
  status: 'pending' | 'confirmed' | 'rejected';
  engine: 'local' | 'cloud';
  checkId?: string;
  photoId?: string;
  result: any;
  readBack: {
    language: LanguageCode;
    text: string;
  };
  warnings?: Array<{ code: string; message: string }>;
  createdAt: string;
  resolvedAt: string | null;
}

export interface NeutralityResult {
  ok: boolean;
  flaggedTerms: string[];
  hint: string;
}

export interface SyncOperation {
  opId: string;
  entity: 'household' | 'check' | 'record' | 'filing';
  action: 'put' | 'delete';
  id: string;
  body?: any;
  clientUpdatedAt: string;
}

// ==========================================
// 3. ENGINE (DETERMINISTIC & PURE)
// ==========================================

export function kgToGrams(kg: number): number {
  return Math.round(kg * 1000);
}

export function gramsToKg(grams: number): number {
  return Number((grams / 1000).toFixed(3));
}

export function formatKg(kg: number): string {
  if (Number.isInteger(kg)) return `${kg} kg`;
  return `${Number(kg.toFixed(3))} kg`;
}

export function ruleFingerprint(rule: EntitlementRule): string {
  return `${rule.perUnitKg}-${rule.basis}`;
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function periodBounds(period: string): { start: string; end: string } {
  if (!isValidPeriod(period)) throw new Error(`Invalid period: ${period}`);
  const [year, month] = period.split('-').map(Number);
  const startDate = `${period}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;
  return { start: startDate, end: endDate };
}

export function computeEntitlement(household: Pick<Household, 'cardType' | 'members' | 'rule'>): {
  entitledKg: number;
  formula: string;
} {
  const { rule, members } = household;
  if (rule.basis === 'perMember') {
    const total = Number((rule.perUnitKg * members).toFixed(3));
    return {
      entitledKg: total,
      formula: `${rule.perUnitKg} kg × ${members} members = ${total} kg`,
    };
  }
  const total = Number(rule.perUnitKg.toFixed(3));
  return {
    entitledKg: total,
    formula: `${rule.perUnitKg} kg per family = ${total} kg`,
  };
}

export function assessRecords(
  records: Array<Pick<DistributionRecord, 'id' | 'date' | 'quantityKg' | 'evidenceType' | 'evidenceContent' | 'photoId' | 'unclear' | 'aiAssist'>>,
  period: string
): Array<Pick<DistributionRecord, 'id'> & { labels: Array<'Late' | 'Unrecorded' | 'Unclear' | 'Recorded'>; counted: boolean; reason?: string }> {
  const bounds = periodBounds(period);
  return records.map((rec) => {
    const labels: Array<'Late' | 'Unrecorded' | 'Unclear' | 'Recorded'> = [];
    let counted = true;
    let reason: string | undefined;

    if (rec.date < bounds.start || rec.date > bounds.end) {
      labels.push('Late');
    }

    if (rec.evidenceType === 'none') {
      labels.push('Unrecorded');
      counted = false;
      reason = 'No evidence linked';
    } else if (rec.unclear) {
      labels.push('Unclear');
      counted = false;
      reason = 'Marked as unclear';
    } else if (
      rec.aiAssist?.lowConfidenceFields &&
      rec.aiAssist.lowConfidenceFields.length > 0 &&
      !rec.aiAssist.userVerifiedLowConfidence
    ) {
      labels.push('Unclear');
      counted = false;
      reason = 'Low confidence AI fields not checked';
    }

    if (labels.length === 0 || (labels.length === 1 && labels[0] === 'Late')) {
      labels.push('Recorded');
    }

    return { id: rec.id, labels, counted, reason };
  });
}

export function computeSummary(input: {
  household: Pick<Household, 'cardType' | 'members' | 'rule'>;
  period: string;
  records: Array<Pick<DistributionRecord, 'id' | 'date' | 'quantityKg' | 'evidenceType' | 'evidenceContent' | 'photoId' | 'unclear' | 'aiAssist'>>;
}): DiscrepancySummary {
  const { entitledKg, formula } = computeEntitlement(input.household);
  const assessments = assessRecords(input.records, input.period);

  let countedGrams = 0;
  let excludedGrams = 0;
  let recordsCounted = 0;
  let recordsExcluded = 0;
  let unrecordedCount = 0;
  let unrecordedGrams = 0;
  let unclearCount = 0;
  let unclearGrams = 0;

  const arithmeticLines: string[] = [];
  arithmeticLines.push(`Entitlement: ${formula}`);

  input.records.forEach((rec) => {
    const assess = assessments.find((a) => a.id === rec.id);
    const g = kgToGrams(rec.quantityKg);
    if (assess && assess.counted) {
      countedGrams += g;
      recordsCounted++;
      arithmeticLines.push(`+ Received on ${rec.date}: ${rec.quantityKg} kg`);
    } else {
      excludedGrams += g;
      recordsExcluded++;
      if (rec.evidenceType === 'none') {
        unrecordedCount++;
        unrecordedGrams += g;
      } else {
        unclearCount++;
        unclearGrams += g;
      }
    }
  });

  const entitledGrams = kgToGrams(entitledKg);
  const receivedCountedKg = gramsToKg(countedGrams);
  const diffGrams = Math.abs(entitledGrams - countedGrams);
  const differenceKg = gramsToKg(diffGrams);

  let status: SummaryStatus = 'matches';
  if (countedGrams < entitledGrams) {
    status = 'shortfall';
    arithmeticLines.push(`----------------------------------------`);
    arithmeticLines.push(`Total Received (counted): ${receivedCountedKg} kg`);
    arithmeticLines.push(`Shortfall (Difference): ${entitledKg} kg - ${receivedCountedKg} kg = ${differenceKg} kg`);
  } else if (countedGrams > entitledGrams) {
    status = 'above_entitlement';
    arithmeticLines.push(`----------------------------------------`);
    arithmeticLines.push(`Total Received (counted): ${receivedCountedKg} kg`);
    arithmeticLines.push(`Above Entitlement: ${receivedCountedKg} kg - ${entitledKg} kg = ${differenceKg} kg`);
  } else {
    status = 'matches';
    arithmeticLines.push(`----------------------------------------`);
    arithmeticLines.push(`Total Received (counted): ${receivedCountedKg} kg (Matches entitlement)`);
  }

  return {
    period: input.period,
    householdCardType: input.household.cardType,
    householdMembers: input.household.members,
    ruleFormula: formula,
    entitledKg,
    receivedCountedKg,
    differenceKg,
    status,
    arithmetic: arithmeticLines,
    recordsCounted,
    recordsExcluded,
    excludedKg: gramsToKg(excludedGrams),
    exclusionBreakdown: {
      unrecordedCount,
      unrecordedKg: gramsToKg(unrecordedGrams),
      unclearCount,
      unclearKg: gramsToKg(unclearGrams),
    },
  };
}

// ==========================================
// 4. GUARDS: NEUTRALITY & SENSITIVE ID REDACTION
// ==========================================

const FORBIDDEN_WORDS = [
  'fraud', 'theft', 'stolen', 'cheat', 'cheated', 'corrupt', 'corruption',
  'scam', 'black market', 'diverted', 'suspicious', 'culprit', 'guilty',
  'dishonest', 'thief', 'loot', 'looted', 'chori', 'chor', 'ghotala',
  'bhrashtachar', 'dhokha',
];

export function checkNeutrality(text: string): NeutralityResult {
  if (!text) return { ok: true, flaggedTerms: [], hint: '' };
  const lower = text.toLowerCase();
  const flagged = FORBIDDEN_WORDS.filter((word) => {
    const reg = new RegExp(`\\b${word}\\b`, 'i');
    return reg.test(lower);
  });
  if (flagged.length > 0) {
    return {
      ok: false,
      flaggedTerms: flagged,
      hint: 'Please describe what you received, not who caused it. The report must stay neutral.',
    };
  }
  return { ok: true, flaggedTerms: [], hint: '' };
}

export function isLikelyAadhaar(str: string): boolean {
  const clean = str.replace(/[\s-]/g, '');
  return /^\d{12}$/.test(clean);
}

export function redactSensitiveIds(text: string): { text: string; count: number } {
  if (!text) return { text: '', count: 0 };
  let count = 0;
  // Match 12-digit patterns or 16-digit VID patterns with or without spaces/hyphens
  const regex = /\b(?:\d[ -]?){11}\d\b|\b(?:\d[ -]?){15}\d\b/g;
  const replaced = text.replace(regex, () => {
    count++;
    return '[ID REMOVED]';
  });
  return { text: replaced, count };
}

// ==========================================
// 5. TEMPLATES: REPORT & GRIEVANCE
// ==========================================

export function buildReportSnapshot(input: {
  household: Household;
  period: string;
  records: DistributionRecord[];
  ruleConfirmedAt: string;
  generatedAt?: string;
}): ReportSnapshot {
  const summary = computeSummary({
    household: input.household,
    period: input.period,
    records: input.records,
  });
  const assessments = assessRecords(input.records, input.period);

  return {
    period: input.period,
    household: {
      id: input.household.id,
      label: input.household.label,
      cardType: input.household.cardType,
      members: input.household.members,
      stateCode: input.household.stateCode,
      district: input.household.district,
      fpsNo: input.household.fpsNo,
      fpsName: input.household.fpsName,
    },
    rule: {
      ...input.household.rule,
      formula: summary.ruleFormula,
      confirmedAt: input.ruleConfirmedAt,
    },
    summary,
    records: input.records.map((r) => {
      const a = assessments.find((x) => x.id === r.id);
      return {
        id: r.id,
        date: r.date,
        quantityKg: r.quantityKg,
        commodity: r.commodity,
        evidenceType: r.evidenceType,
        evidenceContent: r.evidenceContent,
        photoId: r.photoId,
        labels: a?.labels || [],
        counted: a?.counted ?? true,
        exclusionReason: a?.reason,
      };
    }),
    generatedAt: input.generatedAt || new Date().toISOString(),
  };
}

export function renderReportText(
  snapshot: ReportSnapshot,
  lang: 'en' | 'hi' = 'en',
  extras?: { reportId?: string; version?: number; contentHash?: string; filing?: Filing | null }
): string {
  const isHi = lang === 'hi';
  const lines: string[] = [];

  lines.push(isHi ? '=== राशनसाथी मासिक राशन विवरण रिपोर्ट ===' : '=== RationSaathi Monthly Ration Distribution Report ===');
  lines.push(`${isHi ? 'माह / अवधि' : 'Period'}: ${snapshot.period}`);
  lines.push(`${isHi ? 'परिवार' : 'Household'}: ${snapshot.household.label} (${snapshot.household.cardType}, ${snapshot.household.members} ${isHi ? 'सदस्य' : 'members'})`);
  if (snapshot.household.fpsNo) {
    lines.push(`${isHi ? 'उचित मूल्य दुकान (FPS)' : 'FPS'}: ${snapshot.household.fpsNo} ${snapshot.household.fpsName ? `- ${snapshot.household.fpsName}` : ''}`);
  }
  lines.push('');
  lines.push(isHi ? '--- पात्रता नियम ---' : '--- Entitlement Rule ---');
  lines.push(`${isHi ? 'नियम' : 'Rule'}: ${snapshot.rule.formula}`);
  lines.push(`${isHi ? 'स्रोत' : 'Source'}: ${snapshot.rule.sourceTitle} (${snapshot.rule.sourceUrl || 'N/A'})`);
  lines.push(`${isHi ? 'सत्यापन' : 'Last verified'}: ${snapshot.rule.lastVerified || (isHi ? 'सत्यापित नहीं' : 'Not verified')}`);
  lines.push(`${isHi ? 'पुष्टि तिथि' : 'Confirmed by user on'}: ${snapshot.rule.confirmedAt.split('T')[0]}`);
  lines.push('');
  lines.push(isHi ? '--- वितरण रिकॉर्ड ---' : '--- Distribution Records ---');
  if (snapshot.records.length === 0) {
    lines.push(isHi ? 'इस माह के लिए कोई रिकॉर्ड दर्ज नहीं है।' : 'No records logged for this period.');
  } else {
    snapshot.records.forEach((r, idx) => {
      const countedStr = r.counted ? (isHi ? 'गणना में शामिल' : 'Counted') : `${isHi ? 'शामिल नहीं' : 'Excluded'} (${r.exclusionReason})`;
      lines.push(`${idx + 1}. ${r.date} | ${r.quantityKg} kg | ${r.evidenceType} | [${r.labels.join(', ')}] | ${countedStr}`);
      if (r.evidenceContent) {
        lines.push(`   ${isHi ? 'साक्ष्य विवरण' : 'Evidence preview'}: ${r.evidenceContent.slice(0, 70)}`);
      }
    });
  }
  lines.push('');
  lines.push(isHi ? '--- गणितीय गणना ---' : '--- Arithmetic Summary ---');
  snapshot.summary.arithmetic.forEach((a) => lines.push(a));
  lines.push('');
  lines.push(isHi ? '--- संभावित कारण ---' : '--- Possible Causes ---');
  (POSSIBLE_CAUSES[lang] || POSSIBLE_CAUSES.en).forEach((c) => lines.push(`• ${c}`));
  lines.push('');
  lines.push(isHi ? '--- अस्वीकरण ---' : '--- Disclaimer ---');
  lines.push(DISCLAIMER[lang] || DISCLAIMER.en);

  if (extras) {
    lines.push('');
    lines.push('----------------------------------------');
    if (extras.reportId) lines.push(`Report ID: ${extras.reportId}`);
    if (extras.version) lines.push(`Version: ${extras.version}`);
    if (extras.contentHash) lines.push(`Integrity Hash: ${extras.contentHash.slice(0, 16)}...`);
    if (extras.filing) {
      lines.push(`Official Filing: Ref ${extras.filing.referenceNumber} on ${extras.filing.filedDate}`);
    }
  }

  return lines.join('\n');
}

export function generateGrievanceDescription(snapshot: ReportSnapshot, lang: 'en' | 'hi' = 'en'): string {
  const isHi = lang === 'hi';
  const { summary, household, period } = snapshot;

  if (isHi) {
    return `विषय: राष्ट्रीय खाद्य सुरक्षा अधिनियम (NFSA) के तहत ${period} माह के राशन वितरण में मात्रा का अंतर।

विवरण:
मेरा राशन कार्ड प्रकार ${household.cardType} है और कार्ड में कुल ${household.members} सदस्य दर्ज हैं।
वैधानिक पात्रता नियम के अनुसार (${summary.ruleFormula}) इस माह की कुल पात्रता ${summary.entitledKg} किलोग्राम बनती है।

इस माह के दौरान प्राप्त एवं साक्ष्य-सत्यापित राशन की कुल मात्रा ${summary.receivedCountedKg} किलोग्राम दर्ज की गई है।
अतः पात्रता से ${summary.differenceKg} किलोग्राम कम अनाज प्राप्त हुआ है।

उचित मूल्य दुकान (FPS) क्रमांक: ${household.fpsNo || 'उल्लेखित नहीं'}
दुकान का नाम: ${household.fpsName || 'उल्लेखित नहीं'}

निवेदन है कि इस अंतर का सत्यापन कर नियमानुसार समाधान प्रदान करने की कृपा करें।`;
  }

  return `Subject: Quantity difference in food grain distribution under NFSA for period ${period}.

Description:
My household holds an ${household.cardType} ration card with ${household.members} members registered.
As per the statutory entitlement rule (${summary.ruleFormula}), the entitled quantity for this month is ${summary.entitledKg} kg.

During this period, the total quantity received with verified evidence is ${summary.receivedCountedKg} kg.
Consequently, there is a shortfall of ${summary.differenceKg} kg below the entitlement.

Fair Price Shop (FPS) No: ${household.fpsNo || 'Not specified'}
Shop Name: ${household.fpsName || 'Not specified'}

Kindly verify the distribution records and ensure appropriate resolution as per the guidelines.`;
}

export function buildReadback(text: string, lang: LanguageCode = 'en'): ReadbackPayload {
  const segments = text
    .split(/(?<=[.!?।\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    language: lang,
    text,
    segments: segments.length > 0 ? segments : [text],
  };
}

// ==========================================
// 6. OFFLINE EXTRACTORS & VOICE PARSER
// ==========================================

export interface ExtractionResult {
  docType: { value: string; confidence: number };
  suggestedEvidenceType: EvidenceType;
  fields: {
    date: { value: string | null; confidence: number; rawText: string | null };
    quantityKg: { value: number | null; confidence: number; rawText: string | null };
    reference: { value: string | null; confidence: number; rawText: string | null };
    commodity: { value: Commodity | null; confidence: number; rawText: string | null };
  };
  lineItems: Array<{ commodity: Commodity; quantityKg: number; confidence: number; rawText: string }>;
  quantityFormula: string;
  extractedText: string;
  legibility: 'good' | 'fair' | 'poor';
  retakeSuggested: boolean;
  retakeReasons: string[];
  sensitiveIdsRedacted: number;
  lowConfidenceFields: string[];
}

export function extractFromText(
  text: string,
  opts: { period?: string; today?: string; sourceType?: 'sms' | 'receipt' | 'note' } = {}
): ExtractionResult {
  const { text: redacted, count: sensitiveIdsRedacted } = redactSensitiveIds(text);
  const lowConfidenceFields: string[] = [];

  // 1. Quantity extraction (look for e.g. "5 kg", "5.000 Kg", "5 किलो", "Rice 3kg, Wheat 2kg")
  let quantityKg: number | null = null;
  let rawQuantity: string | null = null;
  const lineItems: Array<{ commodity: Commodity; quantityKg: number; confidence: number; rawText: string }> = [];

  const kgMatches = [...redacted.matchAll(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|किलो|किग्रा)/gi)];
  if (kgMatches.length > 0) {
    let sum = 0;
    kgMatches.forEach((m) => {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && val < 500) {
        sum += val;
        lineItems.push({
          commodity: 'mixed',
          quantityKg: val,
          confidence: 0.85,
          rawText: m[0],
        });
      }
    });
    if (sum > 0) {
      quantityKg = Number(sum.toFixed(3));
      rawQuantity = kgMatches.map((m) => m[0]).join(' + ');
    }
  }

  if (quantityKg === null) {
    // Try bare number search
    const numMatch = redacted.match(/\b(\d+(?:\.\d+)?)\b/);
    if (numMatch) {
      quantityKg = parseFloat(numMatch[1]);
      rawQuantity = numMatch[1];
      lowConfidenceFields.push('quantityKg');
    }
  }

  // 2. Date extraction (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
  let dateVal: string | null = null;
  let rawDate: string | null = null;
  const dateMatch = redacted.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})|(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (dateMatch) {
    rawDate = dateMatch[0];
    if (dateMatch[4]) {
      // YYYY-MM-DD
      dateVal = `${dateMatch[4]}-${String(dateMatch[5]).padStart(2, '0')}-${String(dateMatch[6]).padStart(2, '0')}`;
    } else {
      // DD-MM-YYYY
      dateVal = `${dateMatch[3]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[1]).padStart(2, '0')}`;
    }
  } else {
    dateVal = opts.today || new Date().toISOString().split('T')[0];
    lowConfidenceFields.push('date');
  }

  // 3. Reference number
  let refVal: string | null = null;
  let rawRef: string | null = null;
  const refMatch = redacted.match(/(?:txn|receipt|slip|ref|रसीद|क्रमांक)[^\w]*([A-Za-z0-9/_-]{3,20})/i);
  if (refMatch) {
    refVal = refMatch[1];
    rawRef = refMatch[0];
  } else {
    lowConfidenceFields.push('reference');
  }

  const suggestedEvidenceType: EvidenceType = opts.sourceType || 'sms';

  return {
    docType: { value: suggestedEvidenceType, confidence: 0.85 },
    suggestedEvidenceType,
    fields: {
      date: { value: dateVal, confidence: rawDate ? 0.9 : 0.5, rawText: rawDate },
      quantityKg: { value: quantityKg || 0, confidence: rawQuantity ? 0.85 : 0.4, rawText: rawQuantity },
      reference: { value: refVal, confidence: refVal ? 0.8 : 0.4, rawText: rawRef },
      commodity: { value: 'mixed', confidence: 0.8, rawText: null },
    },
    lineItems,
    quantityFormula: quantityKg ? `${quantityKg} kg` : '0 kg',
    extractedText: redacted,
    legibility: 'good',
    retakeSuggested: false,
    retakeReasons: [],
    sensitiveIdsRedacted,
    lowConfidenceFields,
  };
}

export interface VoiceParseResult {
  intent: 'add_record' | 'set_household' | 'query';
  date: string;
  quantityKg: number;
  evidenceType: EvidenceType;
  reference?: string;
  notes?: string;
  unclear?: boolean;
  householdFields?: {
    members?: number;
    cardType?: CardType;
  };
  quantityExpression?: {
    fraction?: number;
    formula?: string;
  };
  lowConfidenceFields: string[];
}

export function parseVoiceTranscript(
  transcript: string,
  opts: { period?: string; today?: string; entitlementKg?: number } = {}
): VoiceParseResult & { readBack: string } {
  const lower = transcript.toLowerCase();
  const lowConfidenceFields: string[] = [];
  const today = opts.today || new Date().toISOString().split('T')[0];

  // 1. Check for household intent
  if (lower.includes('member') || lower.includes('सदस्य') || lower.includes('कार्ड') || lower.includes('phh') || lower.includes('aay')) {
    let members: number | undefined;
    const memMatch = lower.match(/(\d+)\s*(?:member|सदस्य)/);
    if (memMatch) members = parseInt(memMatch[1], 10);

    let cardType: CardType | undefined;
    if (lower.includes('aay') || lower.includes('अंत्योदय')) cardType = 'AAY';
    else if (lower.includes('phh') || lower.includes('प्राथमिकता')) cardType = 'PHH';

    if (members || cardType) {
      return {
        intent: 'set_household',
        date: today,
        quantityKg: 0,
        evidenceType: 'note',
        householdFields: { members, cardType },
        lowConfidenceFields: [],
        readBack: `I heard ${members ? `${members} members` : ''} ${cardType ? `${cardType} card` : ''}. Is this correct?`,
      };
    }
  }

  // 2. Quantity (including fractions like "half", "आधा")
  let quantityKg = 0;
  let fraction: number | undefined;
  let formula: string | undefined;

  if (lower.includes('half') || lower.includes('आधा') || lower.includes('आधे')) {
    fraction = 0.5;
    const ent = opts.entitlementKg || 20;
    quantityKg = ent * 0.5;
    formula = `½ × ${ent} kg = ${quantityKg} kg`;
  } else {
    const numMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:kg|किलो|किग्रा)?/);
    if (numMatch) {
      quantityKg = parseFloat(numMatch[1]);
    } else {
      lowConfidenceFields.push('quantityKg');
    }
  }

  // 3. Evidence
  let evidenceType: EvidenceType = 'note';
  if (lower.includes('no slip') || lower.includes('कोई पर्ची नहीं') || lower.includes('बिना पर्ची')) {
    evidenceType = 'none';
  } else if (lower.includes('slip') || lower.includes('रसीद') || lower.includes('receipt')) {
    evidenceType = 'receipt';
  } else if (lower.includes('sms') || lower.includes('मैसेज')) {
    evidenceType = 'sms';
  }

  const readBack = `I heard ${quantityKg} kg on ${today}, with ${evidenceType === 'none' ? 'no slip' : evidenceType} evidence. Is that right?`;

  return {
    intent: 'add_record',
    date: today,
    quantityKg,
    evidenceType,
    notes: transcript,
    quantityExpression: fraction ? { fraction, formula } : undefined,
    lowConfidenceFields,
    readBack,
  };
}

export function matchFaq(question: string, _lang: LanguageCode = 'en'): { entry: FaqEntry; score: number } | null {
  const qLower = question.toLowerCase();
  let bestEntry: FaqEntry | null = null;
  let highestScore = 0;

  for (const item of FAQ) {
    let score = 0;
    for (const kw of item.keywords) {
      if (qLower.includes(kw.toLowerCase())) score += 2;
    }
    if (qLower.includes(item.question.toLowerCase())) score += 5;
    if (score > highestScore) {
      highestScore = score;
      bestEntry = item;
    }
  }

  if (highestScore > 0 && bestEntry) {
    return { entry: bestEntry, score: highestScore };
  }
  return null;
}

// ==========================================
// 7. TYPED API CLIENT
// ==========================================

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function createApiClient(config: { baseUrl: string; getToken: () => string | null }) {
  const { baseUrl, getToken } = config;

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const isJson = res.headers.get('content-type')?.includes('application/json');

    if (!res.ok) {
      if (isJson) {
        const errorJson = await res.json();
        throw new ApiError(
          errorJson.error?.message || res.statusText,
          res.status,
          errorJson.error?.code || 'UNKNOWN_ERROR',
          errorJson.error?.details
        );
      }
      throw new ApiError(res.statusText, res.status, 'HTTP_ERROR');
    }

    if (isJson) {
      const data = await res.json();
      return data.data !== undefined ? data.data : data;
    }
    return (await res.blob()) as unknown as T;
  }

  return {
    health: () => request<{ status: string }>('/health'),
    meta: () => request<any>('/meta'),
    states: () => request<IndianState[]>('/states'),
    devices: {
      register: () => request<{ deviceId: string; token: string }>('/devices', { method: 'POST', body: '{}' }),
      me: () => request<any>('/devices/me'),
      deleteAll: () => request<{ deleted: boolean }>('/devices/me', { method: 'DELETE' }),
    },
    rules: {
      defaults: () => request<RuleDefault[]>('/entitlement-rules/defaults'),
    },
    households: {
      list: () => request<Household[]>('/households'),
      get: (id: string) => request<Household>(`/households/${id}`),
      put: (id: string, body: any) => request<Household>(`/households/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: string) => request<{ deleted: boolean }>(`/households/${id}`, { method: 'DELETE' }),
    },
    checks: {
      list: (householdId?: string) => request<Check[]>(`/checks${householdId ? `?householdId=${householdId}` : ''}`),
      get: (id: string) => request<Check>(`/checks/${id}`),
      put: (id: string, body: any) => request<Check>(`/checks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: string) => request<{ deleted: boolean }>(`/checks/${id}`, { method: 'DELETE' }),
      records: (id: string) => request<DistributionRecord[]>(`/checks/${id}/records`),
      summary: (id: string) => request<DiscrepancySummary>(`/checks/${id}/summary`),
    },
    records: {
      get: (id: string) => request<DistributionRecord>(`/records/${id}`),
      put: (id: string, body: any) => request<DistributionRecord>(`/records/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: string) => request<{ deleted: boolean }>(`/records/${id}`, { method: 'DELETE' }),
    },
    photos: {
      upload: (file: Blob, opts?: { skipQualityGate?: boolean; userConfirmedNoIds?: boolean }) => {
        const formData = new FormData();
        formData.append('image', file);
        const q = new URLSearchParams();
        if (opts?.skipQualityGate) q.set('skipQualityGate', 'true');
        if (opts?.userConfirmedNoIds) q.set('userConfirmedNoIds', 'true');
        const qs = q.toString() ? `?${q.toString()}` : '';
        return request<any>(`/photos${qs}`, { method: 'POST', body: formData });
      },
      blob: (id: string) => request<Blob>(`/photos/${id}`),
      meta: (id: string) => request<any>(`/photos/${id}/meta`),
      delete: (id: string) => request<{ deleted: boolean }>(`/photos/${id}`, { method: 'DELETE' }),
    },
    ai: {
      ocr: (body: any) => request<AiDraft>('/ai/ocr', { method: 'POST', body: JSON.stringify(body) }),
      extractText: (body: any) => request<AiDraft>('/ai/extract-text', { method: 'POST', body: JSON.stringify(body) }),
      voiceParse: (body: any) => request<AiDraft>('/ai/voice/parse', { method: 'POST', body: JSON.stringify(body) }),
      translate: (body: any) => request<AiDraft>('/ai/translate', { method: 'POST', body: JSON.stringify(body) }),
      getDraft: (id: string) => request<AiDraft>(`/ai/drafts/${id}`),
      confirmDraft: (id: string, body: any) => request<any>(`/ai/drafts/${id}/confirm`, { method: 'POST', body: JSON.stringify(body) }),
      rejectDraft: (id: string) => request<AiDraft>(`/ai/drafts/${id}/reject`, { method: 'POST' }),
      chat: (body: any) => request<any>('/ai/chat', { method: 'POST', body: JSON.stringify(body) }),
    },
    reports: {
      create: (checkId: string, body?: any) => request<Report>(`/checks/${checkId}/reports`, { method: 'POST', body: JSON.stringify(body || {}) }),
      list: (checkId: string) => request<any[]>(`/checks/${checkId}/reports`),
      get: (id: string) => request<Report>(`/reports/${id}`),
      export: (id: string, format: string, lang: string) => request<Blob>(`/reports/${id}/export?format=${format}&lang=${lang}`),
      readback: (id: string, lang: string) => request<ReadbackPayload>(`/reports/${id}/readback?lang=${lang}`),
    },
    grievance: {
      get: (checkId: string) => request<GrievanceDraft>(`/checks/${checkId}/grievance`),
      put: (checkId: string, body: any) => request<GrievanceDraft>(`/checks/${checkId}/grievance`, { method: 'PUT', body: JSON.stringify(body) }),
      regenerate: (checkId: string, body?: any) => request<GrievanceDraft>(`/checks/${checkId}/grievance/regenerate`, { method: 'POST', body: JSON.stringify(body || {}) }),
      readback: (checkId: string) => request<ReadbackPayload>(`/checks/${checkId}/grievance/readback`),
    },
    filing: {
      get: (checkId: string) => request<Filing | null>(`/checks/${checkId}/filing`),
      put: (checkId: string, body: any) => request<Filing>(`/checks/${checkId}/filing`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (checkId: string) => request<{ deleted: boolean }>(`/checks/${checkId}/filing`, { method: 'DELETE' }),
    },
    channels: {
      list: (stateCode?: string) => request<GrievanceChannel[]>(`/grievance-channels${stateCode ? `?stateCode=${stateCode}` : ''}`),
      get: (id: string) => request<GrievanceChannel>(`/grievance-channels/${id}`),
    },
    sync: {
      snapshot: (since?: string) => request<any>(`/sync/snapshot${since ? `?since=${since}` : ''}`),
      batch: (ops: SyncOperation[]) => request<any>('/sync/batch', { method: 'POST', body: JSON.stringify({ operations: ops }) }),
    },
    utils: {
      neutrality: (text: string) => request<NeutralityResult>('/utils/neutrality-check', { method: 'POST', body: JSON.stringify({ text }) }),
      redact: (text: string) => request<{ text: string; count: number }>('/utils/redact', { method: 'POST', body: JSON.stringify({ text }) }),
    },
  };
}
