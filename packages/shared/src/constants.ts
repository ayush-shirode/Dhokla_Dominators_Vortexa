import type {
  IndianState,
  LanguageCode,
  OverallLabel,
  RuleDefault,
  TemplateLanguage,
} from './types.js';

export const PRODUCT_NAME = 'RationSaathi';
/** Bump when any calculation/label rule changes. Stored in every report snapshot. */
export const ENGINE_VERSION = '1.0.0';
/** AI-extracted fields below this confidence must be explicitly checked by the user. */
export const LOW_CONFIDENCE_THRESHOLD = 0.75;

export const LIMITS = {
  maxPhotoBytes: 8 * 1024 * 1024,
  maxTextChars: 4000,
  maxRecordsPerCheck: 100,
  maxMembers: 30,
  maxPerUnitKg: 100,
  maxRecordKg: 1000,
} as const;

const NFSA_SOURCE_TITLE = 'National Food Security Act, 2013 — NFSA entitlements (nfsa.gov.in, Coverage & Entitlements)';
const NFSA_SOURCE_URL = 'https://nfsa.gov.in/portal/Coverage_Entitlements_NFSA_AA';

/**
 * Published national NFSA scale, offered as an editable default only (Core Principle 1).
 * `lastVerified` stays null until someone checks it against the source and records the date
 * (configurable on the server via RULE_DEFAULTS_LAST_VERIFIED).
 */
export const RULE_DEFAULTS: RuleDefault[] = [
  {
    cardType: 'PHH',
    label: 'Priority Household (PHH)',
    perUnitKg: 5,
    basis: 'perMember',
    sourceTitle: NFSA_SOURCE_TITLE,
    sourceUrl: NFSA_SOURCE_URL,
    sourceNote:
      'National scale: 5 kg of foodgrains per person per month for Priority Households. State schemes may give more or differ; edit the figure if yours does.',
    lastVerified: null,
  },
  {
    cardType: 'AAY',
    label: 'Antyodaya Anna Yojana (AAY)',
    perUnitKg: 35,
    basis: 'perFamily',
    sourceTitle: NFSA_SOURCE_TITLE,
    sourceUrl: NFSA_SOURCE_URL,
    sourceNote:
      'National scale: 35 kg of foodgrains per household per month for Antyodaya households, regardless of family size. State schemes may differ; edit the figure if yours does.',
    lastVerified: null,
  },
];

export function getRuleDefault(cardType: string): RuleDefault | null {
  return RULE_DEFAULTS.find((r) => r.cardType === cardType) ?? null;
}

/** Static, neutral list. Never extended by AI, never ranked, never tied to a specific case. */
export const POSSIBLE_CAUSES: Record<TemplateLanguage, string[]> = {
  en: [
    'A genuine stock shortage at the shop',
    'A biometric / e-PoS authentication failure',
    'A delivery split across more visits than were recorded',
    'A recording or data-entry error',
  ],
  hi: [
    'दुकान पर वास्तव में स्टॉक की कमी',
    'बायोमेट्रिक / ई-पॉस प्रमाणीकरण में विफलता',
    'वितरण का कई बार में होना, जिनमें से सभी दर्ज नहीं हुए',
    'दर्ज करने या डेटा-एंट्री में त्रुटि',
  ],
};

export const DISCLAIMER: Record<TemplateLanguage, string> = {
  en: 'This report states a difference and the evidence for it. It does not establish a cause and does not allege wrongdoing by any person or shop. A difference like this can have many causes, including entirely ordinary ones; establishing the cause is for the shop and the grievance process, not for this tool.',
  hi: 'यह रिपोर्ट केवल अंतर और उसके प्रमाण बताती है। यह किसी कारण को स्थापित नहीं करती और किसी व्यक्ति या दुकान पर कोई आरोप नहीं लगाती। ऐसे अंतर के कई कारण हो सकते हैं, जिनमें पूरी तरह सामान्य कारण भी शामिल हैं; कारण तय करना दुकान और शिकायत प्रक्रिया का काम है, इस टूल का नहीं।',
};

export const LABEL_INFO: Record<OverallLabel, Record<TemplateLanguage, { name: string; explanation: string }>> = {
  shortfall: {
    en: { name: 'Shortfall', explanation: 'The counted quantity is less than the entitlement for this period. This tool does not know why.' },
    hi: { name: 'कमी', explanation: 'गिनी गई मात्रा इस अवधि की पात्रता से कम है। यह टूल इसका कारण नहीं जानता।' },
  },
  late: {
    en: { name: 'Late', explanation: "This record's date is outside the period being checked. It is still counted." },
    hi: { name: 'अवधि से बाहर', explanation: 'इस रिकॉर्ड की तारीख जाँची जा रही अवधि से बाहर है। इसे फिर भी गिना गया है।' },
  },
  unrecorded: {
    en: { name: 'Unrecorded', explanation: 'No slip, SMS, photo or note is linked to this record, so it is not counted.' },
    hi: { name: 'बिना प्रमाण', explanation: 'इस रिकॉर्ड के साथ कोई पर्ची, SMS, फोटो या नोट नहीं जुड़ा है, इसलिए इसे गिना नहीं गया।' },
  },
  unclear: {
    en: { name: 'Unclear', explanation: 'Marked as unsure (by you, or because machine-read values were not checked), so it is not counted until confirmed.' },
    hi: { name: 'अस्पष्ट', explanation: 'अनिश्चित के रूप में चिह्नित (आपके द्वारा, या मशीन से पढ़े गए मान जाँचे नहीं गए), इसलिए पुष्टि होने तक इसे गिना नहीं गया।' },
  },
};

export const GRIEVANCE_CATEGORY = {
  code: 'NOT_GETTING_NFSA_QUANTITY' as const,
  label: 'Not getting NFSA quantity',
  labelHi: 'एनएफएसए के अनुसार पूरी मात्रा नहीं मिल रही',
};

export const SUPPORTED_LANGUAGES: Array<{
  code: LanguageCode;
  name: string;
  nativeName: string;
  speechLang: string;
  templateSupported: boolean;
  rtl: boolean;
}> = [
  { code: 'en', name: 'English', nativeName: 'English', speechLang: 'en-IN', templateSupported: true, rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechLang: 'hi-IN', templateSupported: true, rtl: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechLang: 'mr-IN', templateSupported: false, rtl: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechLang: 'bn-IN', templateSupported: false, rtl: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechLang: 'ta-IN', templateSupported: false, rtl: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechLang: 'te-IN', templateSupported: false, rtl: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechLang: 'gu-IN', templateSupported: false, rtl: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechLang: 'kn-IN', templateSupported: false, rtl: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechLang: 'ml-IN', templateSupported: false, rtl: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechLang: 'pa-IN', templateSupported: false, rtl: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', speechLang: 'or-IN', templateSupported: false, rtl: false },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', speechLang: 'as-IN', templateSupported: false, rtl: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', speechLang: 'ur-IN', templateSupported: false, rtl: true },
];

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function isTemplateLanguage(code: string): code is TemplateLanguage {
  return code === 'en' || code === 'hi';
}

export function speechLangFor(code: LanguageCode): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.speechLang ?? 'en-IN';
}

export function languageName(code: LanguageCode): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

/** States and Union Territories, ISO 3166-2:IN codes. */
export const INDIAN_STATES: IndianState[] = [
  { code: 'AP', name: 'Andhra Pradesh', type: 'state' },
  { code: 'AR', name: 'Arunachal Pradesh', type: 'state' },
  { code: 'AS', name: 'Assam', type: 'state' },
  { code: 'BR', name: 'Bihar', type: 'state' },
  { code: 'CT', name: 'Chhattisgarh', type: 'state' },
  { code: 'GA', name: 'Goa', type: 'state' },
  { code: 'GJ', name: 'Gujarat', type: 'state' },
  { code: 'HR', name: 'Haryana', type: 'state' },
  { code: 'HP', name: 'Himachal Pradesh', type: 'state' },
  { code: 'JH', name: 'Jharkhand', type: 'state' },
  { code: 'KA', name: 'Karnataka', type: 'state' },
  { code: 'KL', name: 'Kerala', type: 'state' },
  { code: 'MP', name: 'Madhya Pradesh', type: 'state' },
  { code: 'MH', name: 'Maharashtra', type: 'state' },
  { code: 'MN', name: 'Manipur', type: 'state' },
  { code: 'ML', name: 'Meghalaya', type: 'state' },
  { code: 'MZ', name: 'Mizoram', type: 'state' },
  { code: 'NL', name: 'Nagaland', type: 'state' },
  { code: 'OR', name: 'Odisha', type: 'state' },
  { code: 'PB', name: 'Punjab', type: 'state' },
  { code: 'RJ', name: 'Rajasthan', type: 'state' },
  { code: 'SK', name: 'Sikkim', type: 'state' },
  { code: 'TN', name: 'Tamil Nadu', type: 'state' },
  { code: 'TG', name: 'Telangana', type: 'state' },
  { code: 'TR', name: 'Tripura', type: 'state' },
  { code: 'UP', name: 'Uttar Pradesh', type: 'state' },
  { code: 'UT', name: 'Uttarakhand', type: 'state' },
  { code: 'WB', name: 'West Bengal', type: 'state' },
  { code: 'AN', name: 'Andaman and Nicobar Islands', type: 'ut' },
  { code: 'CH', name: 'Chandigarh', type: 'ut' },
  { code: 'DH', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'ut' },
  { code: 'DL', name: 'Delhi', type: 'ut' },
  { code: 'JK', name: 'Jammu and Kashmir', type: 'ut' },
  { code: 'LA', name: 'Ladakh', type: 'ut' },
  { code: 'LD', name: 'Lakshadweep', type: 'ut' },
  { code: 'PY', name: 'Puducherry', type: 'ut' },
];

export function stateName(code: string | null | undefined): string | null {
  if (!code) return null;
  return INDIAN_STATES.find((s) => s.code === code)?.name ?? null;
}
