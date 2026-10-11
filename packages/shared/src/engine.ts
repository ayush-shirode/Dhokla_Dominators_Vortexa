/**
 * Deterministic entitlement engine (Core Principle 2: arithmetic never depends on AI).
 *
 * All quantities are handled internally as integer grams so that sums and differences are
 * exact. This module is pure and has no dependencies: it runs identically on the server and,
 * offline, in the browser.
 */
import { ENGINE_VERSION } from './constants.js';
import type {
  AiAssistInfo,
  CardType,
  DiscrepancySummary,
  DistributionRecord,
  EntitlementComputation,
  EntitlementRule,
  OverallLabel,
  RecordAssessment,
  RecordLabel,
} from './types.js';

// ---------------------------------------------------------------------------
// Units & formatting
// ---------------------------------------------------------------------------

export function kgToGrams(kg: number): number {
  return Math.round(kg * 1000);
}

export function gramsToKg(grams: number): number {
  return grams / 1000;
}

/** True when `kg` has at most 3 decimal places (i.e. is a whole number of grams). */
export function hasAtMostThreeDecimals(kg: number): boolean {
  return Number.isFinite(kg) && Math.abs(kg * 1000 - Math.round(kg * 1000)) < 1e-6;
}

/** "20", "12.5", "0.25" — no trailing zeros, up to 3 decimals. */
export function formatKgNumber(kg: number): string {
  const grams = Math.round(kg * 1000);
  const sign = grams < 0 ? '-' : '';
  const abs = Math.abs(grams);
  const whole = Math.floor(abs / 1000);
  const frac = abs % 1000;
  if (frac === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${String(frac).padStart(3, '0').replace(/0+$/, '')}`;
}

/** "20 kg", "12.5 kg" */
export function formatKg(kg: number): string {
  return `${formatKgNumber(kg)} kg`;
}

function fmtG(grams: number): string {
  return formatKg(gramsToKg(grams));
}

// ---------------------------------------------------------------------------
// Periods & dates
// ---------------------------------------------------------------------------

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isValidPeriod(period: string): boolean {
  return PERIOD_RE.test(period);
}

export function isValidDate(date: string): boolean {
  const m = DATE_RE.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return d <= daysInMonth(y, mo);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function periodBounds(period: string): { start: string; end: string } {
  const m = PERIOD_RE.exec(period);
  if (!m) throw new Error(`Invalid period "${period}", expected YYYY-MM`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return { start: `${m[1]}-${m[2]}-01`, end: `${m[1]}-${m[2]}-${String(daysInMonth(y, mo)).padStart(2, '0')}` };
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

export function formatPeriod(period: string, lang: 'en' | 'hi' = 'en'): string {
  const m = PERIOD_RE.exec(period);
  if (!m) return period;
  const months = lang === 'hi' ? MONTHS_HI : MONTHS_EN;
  return `${months[Number(m[2]) - 1]} ${m[1]}`;
}

export function formatDate(date: string, lang: 'en' | 'hi' = 'en'): string {
  const m = DATE_RE.exec(date);
  if (!m) return date;
  const months = lang === 'hi' ? MONTHS_HI : MONTHS_EN;
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

/** Today's date as YYYY-MM-DD in India Standard Time (UTC+5:30), independent of host TZ. */
export function todayIST(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Entitlement
// ---------------------------------------------------------------------------

export interface EntitlementInput {
  cardType: CardType;
  members: number;
  rule: Pick<EntitlementRule, 'perUnitKg' | 'basis'>;
}

export function computeEntitlement(h: EntitlementInput): EntitlementComputation {
  const perUnitG = kgToGrams(h.rule.perUnitKg);
  const members = Math.max(1, Math.floor(h.members));
  let grams: number;
  let formula: string;
  if (h.rule.basis === 'perFamily') {
    grams = perUnitG;
    formula = `${fmtG(perUnitG)} per family = ${fmtG(grams)}`;
  } else {
    grams = perUnitG * members;
    formula = `${fmtG(perUnitG)} × ${members} ${members === 1 ? 'member' : 'members'} = ${fmtG(grams)}`;
  }
  return {
    cardType: h.cardType,
    basis: h.rule.basis,
    perUnitKg: gramsToKg(perUnitG),
    members,
    grams,
    kg: gramsToKg(grams),
    formula,
  };
}

/** Stable string describing the parts of a household that the rule confirmation covers. */
export function ruleFingerprint(h: EntitlementInput): string {
  return `${h.cardType}|${Math.floor(h.members)}|${kgToGrams(h.rule.perUnitKg)}|${h.rule.basis}`;
}

// ---------------------------------------------------------------------------
// Record assessment & summary
// ---------------------------------------------------------------------------

export type RecordLike = Pick<
  DistributionRecord,
  'id' | 'date' | 'quantityKg' | 'evidenceType' | 'unclear'
> & {
  evidenceContent?: string | null;
  photoId?: string | null;
  aiAssist?: AiAssistInfo | null;
};

export function hasEvidence(r: RecordLike): boolean {
  if (r.evidenceType === 'none') return false;
  if (r.evidenceType === 'photo') return Boolean(r.photoId);
  return Boolean(r.evidenceContent && r.evidenceContent.trim().length > 0) || Boolean(r.photoId);
}

export function assessRecord(r: RecordLike, period: string): RecordAssessment {
  const { start, end } = periodBounds(period);
  const labels: RecordLabel[] = [];

  let latePosition: RecordAssessment['latePosition'] = null;
  if (r.date < start) latePosition = 'before_period';
  else if (r.date > end) latePosition = 'after_period';
  if (latePosition) labels.push('late');

  const unrecorded = !hasEvidence(r);
  if (unrecorded) labels.push('unrecorded');

  let unclearReason: RecordAssessment['unclearReason'] = null;
  if (r.unclear) unclearReason = 'user_flagged';
  else if (r.aiAssist && r.aiAssist.lowConfidenceFields.length > 0 && !r.aiAssist.userVerifiedLowConfidence) {
    unclearReason = 'low_confidence_ai';
  }
  if (unclearReason) labels.push('unclear');

  const exclusionReason: RecordAssessment['exclusionReason'] = unrecorded ? 'unrecorded' : unclearReason ? 'unclear' : null;
  const quantityG = kgToGrams(r.quantityKg);

  return {
    recordId: r.id,
    date: r.date,
    quantityG,
    quantityKg: gramsToKg(quantityG),
    evidenceType: r.evidenceType,
    labels,
    counted: exclusionReason === null,
    exclusionReason,
    unclearReason,
    latePosition,
  };
}

export function sortRecords<T extends { date: string; id: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
}

export function assessRecords(records: RecordLike[], period: string): RecordAssessment[] {
  return sortRecords(records).map((r) => assessRecord(r, period));
}

export interface SummaryInput {
  household: EntitlementInput;
  period: string;
  records: RecordLike[];
}

export function computeSummary(input: SummaryInput): DiscrepancySummary {
  const { start, end } = periodBounds(input.period);
  const entitlement = computeEntitlement(input.household);
  const assessed = assessRecords(input.records, input.period);

  let countedG = 0;
  let excludedG = 0;
  let countedCount = 0;
  for (const a of assessed) {
    if (a.counted) {
      countedG += a.quantityG;
      countedCount++;
    } else {
      excludedG += a.quantityG;
    }
  }
  const differenceG = entitlement.grams - countedG;
  const status: DiscrepancySummary['status'] = differenceG > 0 ? 'shortfall' : differenceG === 0 ? 'matches' : 'above_entitlement';

  const labelSet = new Set<OverallLabel>();
  if (status === 'shortfall') labelSet.add('shortfall');
  for (const a of assessed) for (const l of a.labels) labelSet.add(l);
  const order: OverallLabel[] = ['shortfall', 'late', 'unrecorded', 'unclear'];
  const labels = order.filter((l) => labelSet.has(l));

  return {
    engineVersion: ENGINE_VERSION,
    period: input.period,
    periodStart: start,
    periodEnd: end,
    entitlement,
    records: assessed,
    totals: {
      countedG,
      countedKg: gramsToKg(countedG),
      excludedG,
      excludedKg: gramsToKg(excludedG),
      countedCount,
      excludedCount: assessed.length - countedCount,
    },
    differenceG,
    differenceKg: gramsToKg(differenceG),
    status,
    labels,
    arithmetic: buildArithmetic(entitlement, assessed, countedG, differenceG),
  };
}

function buildArithmetic(
  ent: EntitlementComputation,
  assessed: RecordAssessment[],
  countedG: number,
  differenceG: number,
): string[] {
  const lines: string[] = [];
  lines.push(`Entitlement: ${ent.formula}`);
  if (assessed.length === 0) {
    lines.push('Records: none entered for this period');
  }
  for (const a of assessed) {
    const notes: string[] = [`evidence: ${a.evidenceType}`];
    if (a.latePosition) notes.push(a.latePosition === 'before_period' ? 'dated before the period' : 'dated after the period');
    if (a.counted) {
      lines.push(`  + ${fmtG(a.quantityG)}  (${a.date}; ${notes.join('; ')})`);
    } else {
      lines.push(`    ${fmtG(a.quantityG)}  (${a.date}; ${notes.join('; ')}; NOT COUNTED — ${a.exclusionReason})`);
    }
  }
  const counted = assessed.filter((a) => a.counted);
  const sumExpr = counted.length > 1 ? `${counted.map((a) => formatKgNumber(gramsToKg(a.quantityG))).join(' + ')} = ` : '';
  lines.push(`Counted received total: ${sumExpr}${fmtG(countedG)}`);
  lines.push(`Difference (entitlement − counted): ${fmtG(ent.grams)} − ${fmtG(countedG)} = ${fmtG(differenceG)}`);
  return lines;
}
