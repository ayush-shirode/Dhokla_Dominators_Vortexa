/**
 * RationSaathi domain + API contract types.
 *
 * These types are the single source of truth for the backend (apps/api) and the
 * frontend (apps/web). Every API response body is `ApiResponse<T>` where `T` is
 * one of the types below.
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
  /** Non-blocking advisories, e.g. neutrality warnings on saved text. */
  warnings?: ApiWarning[];
  timestamp: string;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiWarning {
  code: WarningCode;
  message: string;
  details?: unknown;
}

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RULE_NOT_CONFIRMED'
  | 'NEUTRALITY_CHECK_FAILED'
  | 'SENSITIVE_ID_DETECTED'
  | 'DRAFT_NOT_PENDING'
  | 'RETAKE_PHOTO'
  | 'MASKING_UNAVAILABLE'
  | 'CLOUD_CONSENT_REQUIRED'
  | 'AI_UNAVAILABLE'
  | 'AI_FAILED'
  | 'UNSUPPORTED_LANGUAGE'
  | 'UNSUPPORTED_MEDIA'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export type WarningCode =
  | 'NEUTRALITY_TERMS'
  | 'SENSITIVE_ID_REDACTED'
  | 'LOW_CONFIDENCE'
  | 'RETAKE_SUGGESTED'
  | 'RECORD_OUTSIDE_PERIOD'
  | 'NO_EVIDENCE'
  | 'LANGUAGE_ACCEPTANCE_UNKNOWN'
  | 'STALE_WRITE_IGNORED'
  /** An AI translation changed, dropped or added a number. It must be fixed before confirming. */
  | 'NUMBERS_CHANGED'
  /** allowCloud was true but the server has no cloud AI; the local rule-based engine was used. */
  | 'CLOUD_UNAVAILABLE_LOCAL_USED';

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type CardType = 'AAY' | 'PHH' | 'CUSTOM';
export type RuleBasis = 'perMember' | 'perFamily';
export type EvidenceType = 'receipt' | 'sms' | 'photo' | 'note' | 'none';
export type CreatedVia = 'manual' | 'voice' | 'ocr';
export type Commodity = 'rice' | 'wheat' | 'coarse_grains' | 'mixed' | 'other';
/** Per-record labels. Derived by rule from arithmetic + evidence only. */
export type RecordLabel = 'late' | 'unrecorded' | 'unclear';
/** Labels that can apply to a whole period check. */
export type OverallLabel = 'shortfall' | 'late' | 'unrecorded' | 'unclear';
export type DiscrepancyStatus = 'shortfall' | 'matches' | 'above_entitlement';
export type CheckStatus = 'open' | 'reported' | 'filed';

/** Languages the UI should support. BCP-47 tags are in SUPPORTED_LANGUAGES. */
export type LanguageCode =
  | 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'as' | 'ur';
/** Languages for which report/grievance text is generated deterministically (no AI). */
export type TemplateLanguage = 'en' | 'hi';

export type DocType = 'receipt' | 'sms_screenshot' | 'handwritten_note' | 'photo_note' | 'unknown';
export type DraftKind = 'ocr' | 'text_extract' | 'voice' | 'translation';
export type DraftStatus = 'pending' | 'confirmed' | 'rejected';
/** 'local' = on this server / device with no third-party call. 'cloud' = third-party AI (Claude). */
export type AiEngine = 'local' | 'cloud';
export type TranslationPurpose = 'report' | 'grievance_description' | 'evidence_text';
/** `card_portal` = where a state/UT publishes ration card details (listed on the NFSA website). */
export type ChannelKind = 'portal' | 'status_check' | 'helpline' | 'dgro' | 'state_food_commission' | 'card_portal' | 'other';
export type VerificationStatus = 'unverified' | 'verified' | 'needs_review';
export type ExportFormat = 'txt' | 'html' | 'pdf' | 'json';

// ---------------------------------------------------------------------------
// Household & rule
// ---------------------------------------------------------------------------

export interface EntitlementRule {
  /** Quantity in kg per unit (per member, or per family). Max 3 decimals. */
  perUnitKg: number;
  basis: RuleBasis;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceNote: string;
  /** YYYY-MM-DD; null when nobody has verified this default against the source. */
  lastVerified: string | null;
}

export interface RuleDefault extends EntitlementRule {
  cardType: Exclude<CardType, 'CUSTOM'>;
  label: string;
}

export interface Household {
  id: string;
  label: string;
  cardType: CardType;
  /** The state's own name for the card category, e.g. "APL (Farmer)". Null for plain AAY/PHH. */
  cardName: string | null;
  members: number;
  rule: EntitlementRule;
  /** True only after the user looked at the rule and accepted/edited it. */
  ruleConfirmed: boolean;
  ruleConfirmedAt: string | null;
  stateCode: string | null;
  district: string | null;
  fpsNo: string | null;
  fpsName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body of PUT /households/:id (create or full replace). */
export interface HouseholdInput {
  label?: string;
  cardType: CardType;
  /** The state's name for the card category (shown in reports). Optional. */
  cardName?: string | null;
  members: number;
  rule: EntitlementRule;
  /**
   * Set true ONLY when the user has just seen and accepted the rule shown on screen.
   * If the rule/members/cardType change and this is false, the server clears confirmation.
   */
  ruleConfirmed: boolean;
  stateCode?: string | null;
  district?: string | null;
  fpsNo?: string | null;
  fpsName?: string | null;
  /** ISO timestamp of the client edit; used for last-write-wins during offline sync. */
  clientUpdatedAt?: string;
}

// ---------------------------------------------------------------------------
// Period check & records
// ---------------------------------------------------------------------------

export interface Check {
  id: string;
  householdId: string;
  /** YYYY-MM */
  period: string;
  status: CheckStatus;
  latestReportId: string | null;
  filing: Filing | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInput {
  householdId: string;
  period: string;
  clientUpdatedAt?: string;
}

export interface AiAssistInfo {
  draftId: string | null;
  /** Fields the AI was unsure about (confidence below threshold). */
  lowConfidenceFields: Array<'date' | 'quantityKg' | 'reference' | 'commodity'>;
  /** User explicitly ticked "I checked these against the receipt". */
  userVerifiedLowConfidence: boolean;
}

export interface DistributionRecord {
  id: string;
  checkId: string;
  /** YYYY-MM-DD */
  date: string;
  quantityKg: number;
  commodity: Commodity | null;
  evidenceType: EvidenceType;
  /** Receipt/reference number, pasted SMS text, photo caption, or note text. Redacted of Aadhaar/VID. */
  evidenceContent: string | null;
  photoId: string | null;
  unclear: boolean;
  createdVia: CreatedVia;
  /** Always true for persisted records: drafts live in /ai/drafts until confirmed. */
  confirmed: true;
  aiAssist: AiAssistInfo | null;
  /** Computed by the server using the shared engine (same as computeSummary). */
  labels: RecordLabel[];
  createdAt: string;
  updatedAt: string;
}

/** Body of PUT /records/:id (create or full replace). */
export interface RecordInput {
  checkId: string;
  date: string;
  quantityKg: number;
  commodity?: Commodity | null;
  evidenceType: EvidenceType;
  evidenceContent?: string | null;
  photoId?: string | null;
  unclear: boolean;
  createdVia: CreatedVia;
  /** Must be literally true: the user confirmed these values on screen. */
  confirmed: true;
  aiAssist?: AiAssistInfo | null;
  clientUpdatedAt?: string;
}

// ---------------------------------------------------------------------------
// Deterministic summary (computed by packages/shared/src/engine.ts)
// ---------------------------------------------------------------------------

export interface EntitlementComputation {
  cardType: CardType;
  basis: RuleBasis;
  perUnitKg: number;
  members: number;
  grams: number;
  kg: number;
  /** e.g. "5 kg × 4 members = 20 kg" */
  formula: string;
}

export interface RecordAssessment {
  recordId: string;
  date: string;
  quantityG: number;
  quantityKg: number;
  evidenceType: EvidenceType;
  labels: RecordLabel[];
  counted: boolean;
  /** Why the record is excluded from the confirmed total. */
  exclusionReason: 'unrecorded' | 'unclear' | null;
  unclearReason: 'user_flagged' | 'low_confidence_ai' | null;
  latePosition: 'before_period' | 'after_period' | null;
}

export interface DiscrepancySummary {
  engineVersion: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  entitlement: EntitlementComputation;
  records: RecordAssessment[];
  totals: {
    countedG: number;
    countedKg: number;
    excludedG: number;
    excludedKg: number;
    countedCount: number;
    excludedCount: number;
  };
  /** entitlement − counted. Negative means more than the entitlement was received. */
  differenceG: number;
  differenceKg: number;
  status: DiscrepancyStatus;
  labels: OverallLabel[];
  /** Human-readable, line-by-line arithmetic (English). */
  arithmetic: string[];
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportRecordSnapshot {
  id: string;
  date: string;
  quantityKg: number;
  commodity: Commodity | null;
  evidenceType: EvidenceType;
  evidenceContent: string | null;
  photoId: string | null;
  unclear: boolean;
  createdVia: CreatedVia;
  labels: RecordLabel[];
  counted: boolean;
  exclusionReason: 'unrecorded' | 'unclear' | null;
}

export interface ReportSnapshot {
  engineVersion: string;
  generatedAt: string;
  period: string;
  household: { label: string; cardType: CardType; cardName: string | null; members: number };
  rule: EntitlementRule & { confirmedAt: string };
  summary: DiscrepancySummary;
  records: ReportRecordSnapshot[];
  possibleCauses: string[];
  disclaimer: string;
}

export interface ReportTranslation {
  id: string;
  language: LanguageCode;
  text: string;
  /** Always confirmed: only user-confirmed AI translations are stored on a report. */
  confirmedAt: string;
  draftId: string;
}

export interface Report {
  id: string;
  checkId: string;
  householdId: string;
  /** 1, 2, 3… per check. Reports are immutable snapshots. */
  version: number;
  language: TemplateLanguage;
  createdAt: string;
  /** SHA-256 of the canonical snapshot JSON. Printed on exports. */
  contentHash: string;
  snapshot: ReportSnapshot;
  /** Full plain-text rendering in `language`. */
  text: string;
  translations: ReportTranslation[];
}

export interface ReadbackPayload {
  language: LanguageCode;
  /** BCP-47 tag to pass to speechSynthesis, e.g. "hi-IN". */
  speechLang: string;
  /** Short sentences, in order, suitable for text-to-speech. */
  segments: string[];
  fullText: string;
}

// ---------------------------------------------------------------------------
// Grievance preparation & filing
// ---------------------------------------------------------------------------

export interface CopyField {
  key: 'state' | 'district' | 'rationCardNo' | 'fpsNo' | 'fpsName' | 'category' | 'description';
  label: string;
  value: string | null;
  /** Sensitive fields are never stored on the server; the client fills them locally. */
  clientOnly: boolean;
}

export interface LanguageAdvice {
  /** null = unknown; the UI must say so instead of assuming. */
  portalAcceptsVernacular: boolean | null;
  acceptedLanguages: string[] | null;
  message: string;
  sourceChannelId: string | null;
}

export interface GrievanceDraft {
  checkId: string;
  stateCode: string | null;
  stateName: string | null;
  district: string | null;
  fpsNo: string | null;
  fpsName: string | null;
  /** Never stored server-side; always null in responses. Client keeps it locally. */
  rationCardNo: null;
  category: { code: 'NOT_GETTING_NFSA_QUANTITY'; label: string };
  description: string;
  descriptionLanguage: LanguageCode;
  descriptionSource: 'generated' | 'translated' | 'user_edited';
  basedOnReportId: string | null;
  languageAdvice: LanguageAdvice;
  portal: { name: string; url: string; statusUrl: string | null; channelId: string };
  copyFields: CopyField[];
  updatedAt: string;
}

export interface GrievanceDraftInput {
  stateCode?: string | null;
  district?: string | null;
  fpsNo?: string | null;
  fpsName?: string | null;
  /** User edit of the description. Neutrality-checked; rejected if it states/implies wrongdoing. */
  description?: string;
  portalChannelId?: string;
}

export interface Filing {
  id: string;
  checkId: string;
  reportId: string | null;
  referenceNumber: string;
  /** YYYY-MM-DD */
  filedDate: string;
  portalUrl: string | null;
  channelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FilingInput {
  referenceNumber: string;
  filedDate: string;
  portalUrl?: string | null;
  channelId?: string | null;
  reportId?: string | null;
}

export interface GrievanceChannel {
  id: string;
  scope: 'national' | 'state';
  stateCode: string | null;
  name: string;
  kind: ChannelKind;
  /** URL for portal/status_check, phone number for helpline, free text otherwise. */
  value: string;
  notes: string;
  /** Languages the channel accepts for complaint text; null = unknown. */
  acceptedLanguages: string[] | null;
  sourceUrl: string | null;
  sourceNote: string;
  lastVerified: string | null;
  verificationStatus: VerificationStatus;
  updatedAt: string;
}

export type GrievanceChannelInput = Omit<GrievanceChannel, 'id' | 'updatedAt'>;

export interface IndianState {
  code: string; // ISO 3166-2:IN suffix, e.g. "MH"
  name: string;
  type: 'state' | 'ut';
}

// ---------------------------------------------------------------------------
// Photos & AI drafts
// ---------------------------------------------------------------------------

export type QualityIssue = 'blurry' | 'too_dark' | 'overexposed' | 'low_contrast' | 'too_small';

export interface PhotoQuality {
  ok: boolean;
  issues: QualityIssue[];
  metrics: { sharpness: number; brightness: number; contrast: number; width: number; height: number };
}

export interface Photo {
  id: string;
  mime: 'image/jpeg';
  width: number;
  height: number;
  bytes: number;
  quality: PhotoQuality;
  /** How many Aadhaar/VID-like numbers were blacked out before storage. */
  sensitiveIdsMasked: number;
  /** false when the server could not scan the image for IDs (no local OCR). */
  maskingPerformed: boolean;
  docType: { value: DocType; confidence: number; engine: AiEngine };
  createdAt: string;
}

export interface ExtractedField<T> {
  value: T | null;
  /** 0–1. Below LOW_CONFIDENCE_THRESHOLD the UI must highlight the field. */
  confidence: number;
  /** Text the value was read from (redacted), for showing the user. */
  rawText: string | null;
}

export interface ExtractedLineItem {
  commodity: Commodity | null;
  quantityKg: number;
  confidence: number;
  rawText: string | null;
}

export interface ExtractionResult {
  docType: { value: DocType; confidence: number };
  suggestedEvidenceType: EvidenceType;
  fields: {
    date: ExtractedField<string>;
    /** Total kg. If line items were read, this is their sum computed by plain code. */
    quantityKg: ExtractedField<number>;
    reference: ExtractedField<string>;
    commodity: ExtractedField<Commodity>;
  };
  lineItems: ExtractedLineItem[];
  /** e.g. "3 kg (rice) + 2 kg (wheat) = 5 kg" when summed from line items. */
  quantityFormula: string | null;
  /** Redacted text read from the source, shown to the user for comparison. */
  extractedText: string;
  legibility: 'good' | 'partial' | 'poor';
  retakeSuggested: boolean;
  retakeReasons: string[];
  sensitiveIdsRedacted: number;
  lowConfidenceFields: Array<'date' | 'quantityKg' | 'reference' | 'commodity'>;
}

export interface VoiceParseResult {
  intent: 'add_record' | 'set_household' | 'unknown';
  transcript: string;
  fields: {
    date: ExtractedField<string>;
    quantityKg: ExtractedField<number>;
    evidenceType: ExtractedField<EvidenceType>;
    commodity: ExtractedField<Commodity>;
    cardType: ExtractedField<CardType>;
    members: ExtractedField<number>;
  };
  /** Present when the user said something like "half"/"only 2 of 4 members' share". Computed in code. */
  quantityExpression: { kind: 'fraction_of_entitlement'; fraction: number; formula: string } | null;
  lowConfidenceFields: Array<'date' | 'quantityKg' | 'reference' | 'commodity'>;
}

export interface TranslationResult {
  purpose: TranslationPurpose;
  sourceLanguage: LanguageCode | 'auto';
  targetLanguage: LanguageCode;
  sourceText: string;
  translatedText: string;
  /** Translation back into English so the user / a helper can verify meaning. */
  backTranslation: string;
  neutrality: NeutralityResult;
  target: { reportId: string | null; checkId: string | null };
}

interface DraftBase {
  id: string;
  status: DraftStatus;
  checkId: string | null;
  photoId: string | null;
  engine: AiEngine;
  warnings: ApiWarning[];
  /** What the assistant should read back / show: "I heard 5 kg on 5 October — is that right?" */
  readBack: { language: LanguageCode; text: string };
  createdAt: string;
  resolvedAt: string | null;
}

export type AiDraft =
  | (DraftBase & { kind: 'ocr' | 'text_extract'; result: ExtractionResult })
  | (DraftBase & { kind: 'voice'; result: VoiceParseResult })
  | (DraftBase & { kind: 'translation'; result: TranslationResult });

export interface ConfirmDraftInput {
  /** Required for ocr / text_extract / voice(add_record): the values the user accepted (may be edited). */
  record?: RecordInput & { id: string };
  /** Required for translation: the final text the user accepted (may be edited). */
  text?: string;
}

export interface ConfirmDraftResult {
  draft: AiDraft;
  record?: DistributionRecord;
  /** For translation drafts. */
  appliedTo?: { kind: 'report_translation'; reportId: string; translationId: string } | { kind: 'grievance_description'; checkId: string } | { kind: 'none' };
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatReply {
  reply: string;
  /** faq = matched built-in answer, guardrail = scope redirect, ai = Claude answer. */
  source: 'faq' | 'guardrail' | 'ai' | 'fallback';
  faqId: string | null;
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// Neutrality & privacy helpers
// ---------------------------------------------------------------------------

export interface NeutralityResult {
  ok: boolean;
  flaggedTerms: Array<{ term: string; index: number }>;
}

// ---------------------------------------------------------------------------
// Devices, meta, sync
// ---------------------------------------------------------------------------

export interface DeviceRegistration {
  deviceId: string;
  /** Bearer token. Shown once; store it on the device. */
  token: string;
  createdAt: string;
}

export interface MetaInfo {
  productName: string;
  apiVersion: string;
  engineVersion: string;
  languages: Array<{ code: LanguageCode; name: string; nativeName: string; speechLang: string; templateSupported: boolean }>;
  ruleDefaults: RuleDefault[];
  possibleCauses: Record<TemplateLanguage, string[]>;
  lowConfidenceThreshold: number;
  limits: { maxPhotoBytes: number; maxTextChars: number; maxRecordsPerCheck: number };
  capabilities: {
    cloudAi: boolean;
    localOcr: boolean;
    localOcrLanguages: string[];
    pdfLanguages: TemplateLanguage[];
  };
}

export type SyncEntity = 'household' | 'check' | 'record';

export interface SyncOperation {
  /** Client-generated id for this op, echoed back in results. */
  opId: string;
  entity: SyncEntity;
  action: 'put' | 'delete';
  id: string;
  /** HouseholdInput / CheckInput / RecordInput for 'put'. */
  body?: unknown;
  clientUpdatedAt: string;
}

export interface SyncOperationResult {
  opId: string;
  status: 'applied' | 'stale' | 'error';
  error?: ApiErrorBody;
  /** Current server copy (for 'applied' and 'stale'). */
  entity?: Household | Check | DistributionRecord | null;
}

export interface SyncSnapshot {
  serverTime: string;
  households: Household[];
  checks: Check[];
  records: DistributionRecord[];
  /** Ids deleted since `since` (only when ?since= is passed). */
  deleted: Array<{ entity: SyncEntity; id: string; deletedAt: string }>;
}
