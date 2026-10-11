import { describe, expect, it } from 'vitest';
import {
  CAUSE_REDIRECT,
  DISCLAIMER,
  FAQ,
  LABEL_INFO,
  POSSIBLE_CAUSES,
  RULE_DEFAULTS,
  buildReportSnapshot,
  buildReportSpokenSummary,
  checkNeutrality,
  computeEntitlement,
  computeSummary,
  extractFromText,
  formatKg,
  generateGrievanceDescription,
  isCauseQuestion,
  matchFaq,
  parseVoiceTranscript,
  redactSensitiveIds,
  renderReportText,
  type EntitlementRule,
} from '@repo/shared';
import { assembleExtraction, numbersPreserved } from '../src/services/ai/tasks.js';

const phh = (members = 4) => ({ label: 'Test', cardType: 'PHH' as const, members, rule: { ...RULE_DEFAULTS[0]! } as EntitlementRule });
const aay = (members = 6) => ({ label: 'Test', cardType: 'AAY' as const, members, rule: { ...RULE_DEFAULTS[1]! } as EntitlementRule });
const rec = (id: string, date: string, quantityKg: number, evidenceType: 'receipt' | 'sms' | 'photo' | 'note' | 'none', extra: object = {}) => ({
  id, date, quantityKg, evidenceType, evidenceContent: evidenceType === 'none' ? null : 'evidence', photoId: null, unclear: false, ...extra,
});

describe('entitlement (P1/P2)', () => {
  it('PHH is per member', () => {
    const e = computeEntitlement(phh(4));
    expect(e.kg).toBe(20);
    expect(e.formula).toBe('5 kg × 4 members = 20 kg');
  });
  it('AAY is flat per family regardless of members', () => {
    const e = computeEntitlement(aay(9));
    expect(e.kg).toBe(35);
    expect(e.formula).toBe('35 kg per family = 35 kg');
  });
  it('uses integer grams, so decimal sums are exact', () => {
    const s = computeSummary({
      household: { cardType: 'CUSTOM', members: 1, rule: { perUnitKg: 0.3, basis: 'perMember' } },
      period: '2026-10',
      records: [rec('a', '2026-10-01', 0.1, 'receipt'), rec('b', '2026-10-02', 0.2, 'receipt')],
    });
    expect(s.differenceG).toBe(0);
    expect(s.status).toBe('matches');
  });
});

describe('summary & labels (P3/P5)', () => {
  const records = [
    rec('a', '2026-10-05', 12, 'sms'),
    rec('b', '2026-10-19', 4, 'note'),
    rec('c', '2026-10-27', 3, 'none'),
  ];
  it('matches the acceptance scenario', () => {
    const s = computeSummary({ household: phh(4), period: '2026-10', records });
    expect(s.totals.countedKg).toBe(16);
    expect(s.differenceKg).toBe(4);
    expect(s.status).toBe('shortfall');
    expect(s.labels).toEqual(['shortfall', 'unrecorded']);
    expect(s.records.find((r) => r.recordId === 'c')).toMatchObject({ counted: false, exclusionReason: 'unrecorded' });
  });
  it('late records are labelled but still counted', () => {
    const s = computeSummary({ household: phh(4), period: '2026-10', records: [rec('a', '2026-11-03', 20, 'receipt')] });
    expect(s.records[0]).toMatchObject({ labels: ['late'], counted: true, latePosition: 'after_period' });
    expect(s.status).toBe('matches');
    expect(s.labels).toEqual(['late']);
  });
  it('user-flagged and unchecked low-confidence AI records are excluded as unclear', () => {
    const s = computeSummary({
      household: phh(4),
      period: '2026-10',
      records: [
        rec('a', '2026-10-01', 5, 'receipt', { unclear: true }),
        rec('b', '2026-10-02', 5, 'photo', { photoId: 'p1', aiAssist: { draftId: 'd', lowConfidenceFields: ['quantityKg'], userVerifiedLowConfidence: false } }),
        rec('c', '2026-10-03', 5, 'photo', { photoId: 'p2', aiAssist: { draftId: 'd', lowConfidenceFields: ['quantityKg'], userVerifiedLowConfidence: true } }),
      ],
    });
    expect(s.records.map((r) => r.unclearReason)).toEqual(['user_flagged', 'low_confidence_ai', null]);
    expect(s.totals.countedKg).toBe(5);
  });
  it('more than the entitlement is described neutrally', () => {
    const s = computeSummary({ household: phh(1), period: '2026-10', records: [rec('a', '2026-10-01', 7, 'receipt')] });
    expect(s.status).toBe('above_entitlement');
    expect(s.differenceKg).toBe(-2);
  });
});

describe('neutral language (P5/P6)', () => {
  it('flags accusatory words in several scripts', () => {
    expect(checkNeutrality('The dealer stole 5 kg').ok).toBe(false);
    expect(checkNeutrality('दुकानदार ने चोरी की').ok).toBe(false);
    expect(checkNeutrality('this is a scam').ok).toBe(false);
    expect(checkNeutrality('black-market sale').ok).toBe(false);
  });
  it('does not flag ordinary words', () => {
    for (const t of ['steady supply', 'anchor', 'household chores', 'I got 12 kg on the 5th', 'stock was short that week']) {
      expect(checkNeutrality(t).ok, t).toBe(true);
    }
  });
  it('every generated template passes the guard, in every status and language', () => {
    const scenarios = [
      [rec('a', '2026-10-05', 12, 'sms'), rec('c', '2026-10-27', 3, 'none'), rec('d', '2026-11-02', 1, 'receipt', { unclear: true })],
      [rec('a', '2026-10-05', 20, 'sms')],
      [rec('a', '2026-10-05', 25, 'sms')],
      [],
    ];
    for (const records of scenarios) {
      const snap = buildReportSnapshot({ household: phh(4), period: '2026-10', records, ruleConfirmedAt: '2026-10-11T00:00:00Z' });
      for (const lang of ['en', 'hi'] as const) {
        expect(checkNeutrality(renderReportText(snap, lang, { reportId: 'r1', version: 1, contentHash: 'abc' })).ok).toBe(true);
        expect(checkNeutrality(generateGrievanceDescription(snap, lang, { reportId: 'r1' })).ok).toBe(true);
        expect(checkNeutrality(buildReportSpokenSummary(snap, lang).fullText).ok).toBe(true);
      }
    }
  });
  it('static texts pass the guard', () => {
    const all = [
      ...POSSIBLE_CAUSES.en, ...POSSIBLE_CAUSES.hi, DISCLAIMER.en, DISCLAIMER.hi, CAUSE_REDIRECT.en, CAUSE_REDIRECT.hi,
      ...FAQ.flatMap((f) => [f.question.en, f.question.hi, f.answer.en, f.answer.hi]),
      ...Object.values(LABEL_INFO).flatMap((l) => [l.en.name, l.en.explanation, l.hi.name, l.hi.explanation]),
    ];
    for (const t of all) expect(checkNeutrality(t).ok, t).toBe(true);
  });
  it('the report always carries the causes and disclaimer', () => {
    const snap = buildReportSnapshot({ household: phh(4), period: '2026-10', records: [], ruleConfirmedAt: '2026-10-11T00:00:00Z' });
    const text = renderReportText(snap, 'en');
    for (const c of POSSIBLE_CAUSES.en) expect(text).toContain(c);
    expect(text).toContain(DISCLAIMER.en);
  });
});

describe('sensitive IDs', () => {
  it('redacts checksum-valid Aadhaar numbers and VIDs only', () => {
    const r = redactSensitiveIds('Aadhaar 2345 6789 0124, txn 123456789012, masked XXXX XXXX 0124');
    expect(r.count).toBe(1);
    expect(r.text).toContain('[ID REMOVED]');
    expect(r.text).toContain('123456789012');
    expect(r.text).toContain('XXXX XXXX 0124');
  });
});

describe('offline extractors', () => {
  it('reads an SMS and sums line items in code', () => {
    const r = extractFromText('Rice 3.000 Kg Wheat 2.000 Kg distributed on 05/10/2026 Txn No 88213', { period: '2026-10' });
    expect(r.fields.date.value).toBe('2026-10-05');
    expect(r.fields.quantityKg.value).toBe(5);
    expect(r.quantityFormula).toBe('3 kg (rice) + 2 kg (wheat) = 5 kg');
    expect(r.fields.reference.value).toBe('88213');
  });
  it('reads Hindi text with Devanagari digits', () => {
    const r = extractFromText('चावल 3 किलो, गेहूं 2 किलो, कुल 5 किलो दिनांक ०५/१०/२०२६');
    expect(r.fields.quantityKg).toMatchObject({ value: 5 });
    expect(r.fields.quantityKg.confidence).toBeGreaterThan(0.9);
    expect(r.fields.date.value).toBe('2026-10-05');
  });
  it('parses voice in English and Hinglish, resolving fractions in code', () => {
    const v1 = parseVoiceTranscript('paanch tarikh ko barah kilo mila', { period: '2026-10', today: '2026-10-11' });
    expect(v1.fields.quantityKg.value).toBe(12);
    expect(v1.fields.date.value).toBe('2026-10-05');
    const v2 = parseVoiceTranscript('I only got half this month, no slip', { period: '2026-10', today: '2026-10-11', entitlementKg: 20 });
    expect(v2.fields.quantityKg.value).toBe(10);
    expect(v2.quantityExpression?.formula).toBe(`½ × ${formatKg(20)} = ${formatKg(10)}`);
    expect(v2.lowConfidenceFields).toContain('quantityKg');
    expect(v2.fields.evidenceType.value).toBe('none');
    const v3 = parseVoiceTranscript('we are 5 members, antyodaya card');
    expect(v3.intent).toBe('set_household');
    expect(v3.fields.members.value).toBe(5);
    expect(v3.fields.cardType.value).toBe('AAY');
  });
});

describe('cloud output assembly (AI reads, code adds)', () => {
  it('sums line items itself and lowers confidence when a printed total disagrees', () => {
    const base = {
      docType: 'receipt' as const, docTypeConfidence: 0.9, legibility: 'good' as const, retakeReasons: [],
      date: { value: '2026-10-05', confidence: 0.95, rawText: '05/10/2026' },
      reference: { value: 'TX1', confidence: 0.9, rawText: 'TX1' },
      lineItems: [
        { commodity: 'rice' as const, quantityKg: 3, confidence: 0.9, rawText: 'Rice 3' },
        { commodity: 'wheat' as const, quantityKg: 2.5, confidence: 0.9, rawText: 'Wheat 2.5' },
      ],
      statedTotalKg: { value: 6, confidence: 0.9, rawText: 'Total 6' },
      extractedText: 'Aadhaar 2345 6789 0124',
    };
    const r = assembleExtraction(base);
    expect(r.fields.quantityKg.value).toBe(5.5);
    expect(r.fields.quantityKg.confidence).toBeLessThanOrEqual(0.5);
    expect(r.lowConfidenceFields).toContain('quantityKg');
    expect(r.extractedText).toBe('Aadhaar [ID REMOVED]');
    expect(r.fields.commodity.value).toBe('mixed');
  });
  it('detects numbers changed by a translation', () => {
    expect(numbersPreserved('20 kg − 16 kg = 4 kg', '२० किलो − 16 किलो = 4 किलो').ok).toBe(true);
    expect(numbersPreserved('20 kg − 16 kg = 4 kg', '20 किलो − 15 किलो = 4 किलो').ok).toBe(false);
  });
});

describe('chat scope', () => {
  it('detects cause questions and matches FAQ', () => {
    expect(isCauseQuestion('why did I get less this month?')).toBe(true);
    expect(isCauseQuestion('is the dealer cheating me')).toBe(true);
    expect(isCauseQuestion('मुझे कम क्यों मिला')).toBe(true);
    expect(isCauseQuestion('what is a DGRO')).toBe(false);
    expect(matchFaq('what is a DGRO?')?.entry.id).toBe('what-is-dgro');
  });
});
