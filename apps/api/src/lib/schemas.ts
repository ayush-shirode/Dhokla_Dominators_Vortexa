import { z } from 'zod';
import {
  INDIAN_STATES,
  LANGUAGE_CODES,
  LIMITS,
  hasAtMostThreeDecimals,
  isValidDate,
  isValidPeriod,
} from '@repo/shared';

export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'must be 8–64 chars of A–Z, a–z, 0–9, _ or -');
export const dateSchema = z.string().refine(isValidDate, 'must be a valid date YYYY-MM-DD');
export const periodSchema = z.string().refine(isValidPeriod, 'must be a period YYYY-MM');
export const clientUpdatedAtSchema = z.iso.datetime({ offset: true }).optional();
const httpUrl = z
  .string()
  .max(500)
  .refine((u) => /^https?:\/\/[^\s]+$/i.test(u), 'must be an http(s) URL');

const kg = (max: number) =>
  z.number().finite().min(0).max(max).refine(hasAtMostThreeDecimals, 'at most 3 decimal places (whole grams)');

const shortText = (max: number) => z.string().trim().max(max);

export const languageSchema = z.enum(LANGUAGE_CODES);
export const templateLanguageSchema = z.enum(['en', 'hi']);
export const cardTypeSchema = z.enum(['AAY', 'PHH', 'CUSTOM']);
export const evidenceTypeSchema = z.enum(['receipt', 'sms', 'photo', 'note', 'none']);
export const commoditySchema = z.enum(['rice', 'wheat', 'coarse_grains', 'mixed', 'other']);
export const lowFieldSchema = z.enum(['date', 'quantityKg', 'reference', 'commodity']);

export const ruleSchema = z.object({
  perUnitKg: kg(LIMITS.maxPerUnitKg),
  basis: z.enum(['perMember', 'perFamily']),
  sourceTitle: shortText(200).min(1),
  sourceUrl: httpUrl.nullable(),
  sourceNote: shortText(1000).default(''),
  lastVerified: dateSchema.nullable(),
});

const stateCodeSchema = z
  .string()
  .refine((c) => INDIAN_STATES.some((s) => s.code === c), 'unknown state code');

export const householdInputSchema = z.object({
  label: shortText(80).optional(),
  cardType: cardTypeSchema,
  members: z.number().int().min(1).max(LIMITS.maxMembers),
  rule: ruleSchema,
  ruleConfirmed: z.boolean(),
  stateCode: stateCodeSchema.nullable().optional(),
  district: shortText(120).nullable().optional(),
  fpsNo: shortText(120).nullable().optional(),
  fpsName: shortText(120).nullable().optional(),
  clientUpdatedAt: clientUpdatedAtSchema,
});

export const checkInputSchema = z.object({
  householdId: idSchema,
  period: periodSchema,
  clientUpdatedAt: clientUpdatedAtSchema,
});

export const aiAssistSchema = z.object({
  draftId: z.string().max(64).nullable(),
  lowConfidenceFields: z.array(lowFieldSchema).max(4),
  userVerifiedLowConfidence: z.boolean(),
});

export const recordInputSchema = z.object({
  checkId: idSchema,
  date: dateSchema,
  quantityKg: kg(LIMITS.maxRecordKg),
  commodity: commoditySchema.nullable().optional(),
  evidenceType: evidenceTypeSchema,
  evidenceContent: z.string().max(LIMITS.maxTextChars).nullable().optional(),
  photoId: z.string().max(64).nullable().optional(),
  unclear: z.boolean(),
  createdVia: z.enum(['manual', 'voice', 'ocr']),
  confirmed: z.literal(true, { error: 'records must be confirmed by the user (confirmed: true)' }),
  aiAssist: aiAssistSchema.nullable().optional(),
  clientUpdatedAt: clientUpdatedAtSchema,
});

export const filingInputSchema = z.object({
  referenceNumber: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Za-z0-9/_\- ]+$/, 'letters, digits, space, / _ - only'),
  filedDate: dateSchema,
  portalUrl: httpUrl.nullable().optional(),
  channelId: z.string().max(64).nullable().optional(),
  reportId: z.string().max(64).nullable().optional(),
});

export const grievanceInputSchema = z.object({
  stateCode: stateCodeSchema.nullable().optional(),
  district: shortText(120).nullable().optional(),
  fpsNo: shortText(120).nullable().optional(),
  fpsName: shortText(120).nullable().optional(),
  description: z.string().trim().min(20).max(LIMITS.maxTextChars).optional(),
  portalChannelId: z.string().max(64).optional(),
});

export const channelInputSchema = z.object({
  scope: z.enum(['national', 'state']),
  stateCode: stateCodeSchema.nullable(),
  name: shortText(200).min(1),
  kind: z.enum(['portal', 'status_check', 'helpline', 'dgro', 'state_food_commission', 'other']),
  value: shortText(500).min(1),
  notes: shortText(2000),
  acceptedLanguages: z.array(z.string().min(2).max(20)).max(30).nullable(),
  sourceUrl: httpUrl.nullable(),
  sourceNote: shortText(1000),
  lastVerified: dateSchema.nullable(),
  verificationStatus: z.enum(['unverified', 'verified', 'needs_review']),
});
