'use client';

import React from 'react';
import Link from 'next/link';
import {
  DiscrepancySummary,
  formatKg,
  POSSIBLE_CAUSES,
  DISCLAIMER,
} from '@repo/shared';
import { ListenButton } from './Navigation';
import { StatusChip } from './StatusChip';
import { CheckCircle2 } from 'lucide-react';

interface SummaryPanelProps {
  summary: DiscrepancySummary;
  checkId: string;
  lang?: 'en' | 'hi';
}

export function SummaryPanel({ summary, checkId, lang = 'en' }: SummaryPanelProps) {
  const causes = POSSIBLE_CAUSES[lang] || POSSIBLE_CAUSES.en;
  const disclaimer = DISCLAIMER[lang] || DISCLAIMER.en;

  const isShortfall = summary.status === 'shortfall';
  const isMatches = summary.status === 'matches';
  const isAbove = summary.status === 'above_entitlement';

  const unrecordedCount = summary.records.filter(
    (r) => !r.counted && r.exclusionReason === 'unrecorded',
  ).length;
  const unclearCount = summary.records.filter(
    (r) => !r.counted && r.exclusionReason === 'unclear',
  ).length;

  return (
    <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-5">
      <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1c3d2e] dark:text-stone-200">
          Entitlement vs Received (Comparison)
        </h3>
        <ListenButton
          text={`Summary: Entitled ${summary.entitlement.kg} kg. Received counted ${summary.totals.countedKg} kg. Difference ${summary.differenceKg} kg. Status: ${summary.status}.`}
          label="Listen"
        />
      </div>

      {/* 3 Headline Metrics with Monospace >= 28px figures */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl border border-[#eee7db] dark:border-stone-800">
          <span className="text-[10px] text-stone-500 block uppercase tracking-wider font-extrabold">
            Entitled
          </span>
          <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#1c3d2e] dark:text-stone-100 block mt-1">
            {formatKg(summary.entitlement.kg)}
          </span>
        </div>

        <div className="p-3 bg-[#edf7f2] dark:bg-emerald-950/20 rounded-2xl border border-[#bbf7d0] dark:border-emerald-900/60">
          <span className="text-[10px] text-[#166534] dark:text-emerald-400 block uppercase tracking-wider font-extrabold">
            Counted
          </span>
          <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#166534] dark:text-emerald-300 block mt-1">
            {formatKg(summary.totals.countedKg)}
          </span>
        </div>

        {/* Shortfall in NEUTRAL AMBER, never alarming red */}
        <div
          className={`p-3 rounded-2xl border ${
            isShortfall
              ? 'bg-[#fffbeb] border-[#fde68a] text-amber-900 dark:bg-amber-950/20'
              : 'bg-[#fbf9f4] border-[#eee7db] text-stone-800'
          }`}
        >
          <span className="text-[10px] block uppercase tracking-wider font-extrabold opacity-80">
            {isShortfall ? 'Difference (Shortfall)' : 'Difference'}
          </span>
          <span className="text-2xl sm:text-3xl font-mono font-extrabold block mt-1">
            {formatKg(summary.differenceKg)}
          </span>
        </div>
      </div>

      {/* Arithmetic Block: Line by Line */}
      <div className="bg-[#fbf9f4] dark:bg-stone-950 p-4 rounded-2xl border border-[#eee7db] dark:border-stone-800 font-mono text-xs text-stone-800 dark:text-stone-200 space-y-1">
        <span className="text-[10px] uppercase tracking-wider font-sans text-stone-400 font-extrabold block mb-1">
          Plain Line-By-Line Arithmetic
        </span>
        {summary.arithmetic.map((line, idx) => (
          <div key={idx} className="whitespace-pre">
            {line}
          </div>
        ))}
      </div>

      {/* Neutral Status Box */}
      <div
        className={`p-4 rounded-2xl border text-xs leading-relaxed ${
          isShortfall
            ? 'bg-[#fffbeb] border-[#fde68a] text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
            : isAbove
            ? 'bg-[#fefce8] border-[#fef08a] text-[#854d0e]'
            : 'bg-[#edf7f2] border-[#bbf7d0] text-[#166534]'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold mb-1">
          {isShortfall && <StatusChip label="shortfall" />}
          {isMatches && <CheckCircle2 className="w-4 h-4 text-[#166534]" />}
          <span>
            {isShortfall
              ? `Calculated difference of ${summary.differenceKg} kg below the entitlement rule`
              : isAbove
              ? `Received ${summary.differenceKg} kg more than the entitlement (advance/make-up delivery)`
              : 'Received quantity matches the entitlement rule'}
          </span>
        </div>
      </div>

      {/* Excluded Records Note ("Not counted") */}
      {summary.totals.excludedCount > 0 && (
        <div className="text-xs text-stone-600 dark:text-stone-400 bg-[#fbf9f4] dark:bg-stone-950 p-4 rounded-2xl border border-[#eee7db] dark:border-stone-800">
          <p className="font-bold text-stone-800 dark:text-stone-200">
            {summary.totals.excludedCount} records ({summary.totals.excludedKg} kg) were not counted in confirmed totals:
          </p>
          <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-[11px]">
            {unrecordedCount > 0 && (
              <li>{unrecordedCount} has no slip or SMS evidence (Unrecorded)</li>
            )}
            {unclearCount > 0 && (
              <li>{unclearCount} marked unclear or unverified</li>
            )}
          </ul>
        </div>
      )}

      {/* Possible Causes & Disclaimer (MANDATORY on every shortfall view) */}
      {isShortfall && (
        <div className="bg-[#fbf9f4] dark:bg-stone-950 p-4 rounded-2xl border border-[#eee7db] dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Possible Explanations
            </span>
            <ListenButton text={causes.join('. ') + '. ' + disclaimer} label="Listen" />
          </div>
          <ul className="list-disc list-inside text-xs text-stone-600 dark:text-stone-400 space-y-1">
            {causes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <p className="italic text-[11px] text-stone-500 pt-2 border-t border-[#eee7db] dark:border-stone-800">
            {disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
