'use client';

import React from 'react';
import { formatKg, type DiscrepancySummary } from '@repo/shared';
import { useApp } from '@/context/AppContext';

/**
 * Line-by-line arithmetic, in the user's language, built from the summary's structured numbers
 * (the same values the engine computed; nothing is recalculated here).
 */
export function arithmeticLines(s: DiscrepancySummary, t: (k: string, v?: Record<string, string | number>) => string): string[] {
  const e = s.entitlement;
  const formula =
    e.basis === 'perFamily'
      ? t('arith.perFamily', { kg: formatKg(e.perUnitKg), total: formatKg(e.kg) })
      : t(e.members === 1 ? 'arith.perMember1' : 'arith.perMember', { kg: formatKg(e.perUnitKg), n: e.members, total: formatKg(e.kg) });
  const lines = [t('arith.entitlement', { formula })];
  if (s.records.length === 0) lines.push(t('arith.noRecords'));
  for (const r of s.records) {
    const late = r.latePosition === 'before_period' ? t('arith.before') : r.latePosition === 'after_period' ? t('arith.after') : '';
    const vars = { kg: formatKg(r.quantityKg), date: r.date, evidence: t(`evidence.${r.evidenceType}`), late };
    lines.push(
      r.counted
        ? t('arith.counted', vars)
        : t('arith.excluded', { ...vars, reason: t(r.exclusionReason === 'unrecorded' ? 'labels.unrecorded' : 'labels.unclear') }),
    );
  }
  const counted = s.records.filter((r) => r.counted);
  const sum = counted.length > 1 ? `${counted.map((r) => formatKg(r.quantityKg).replace(' kg', '')).join(' + ')} = ${formatKg(s.totals.countedKg)}` : formatKg(s.totals.countedKg);
  lines.push(t('arith.total', { sum }));
  lines.push(t('arith.difference', { entitled: formatKg(e.kg), counted: formatKg(s.totals.countedKg), diff: formatKg(s.differenceKg) }));
  return lines;
}

export function Arithmetic({ summary, className }: { summary: DiscrepancySummary; className?: string }) {
  const { t } = useApp();
  return (
    <>
      {arithmeticLines(summary, t).map((line, i) => (
        <div key={i} className={className}>
          {line}
        </div>
      ))}
    </>
  );
}
