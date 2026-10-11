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
import { ArrowRight, AlertCircle, CheckCircle2, FileText, ChevronRight } from 'lucide-react';

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
    <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-2xl p-5 shadow-warm space-y-5">
      <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1c3d2e] dark:text-stone-200">
          Entitlement vs Received
        </h3>
        <ListenButton
          text={`Summary: Entitled ${summary.entitlement.kg} kg. Received counted ${summary.totals.countedKg} kg. Difference ${summary.differenceKg} kg. Status: ${summary.status}.`}
          label="Listen"
        />
      </div>

      {/* 3 Headline Metrics Matching Reference Mockup */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 bg-[#fbf9f4] dark:bg-stone-950 rounded-xl border border-[#eee7db] dark:border-stone-800">
          <span className="text-[10px] text-stone-500 block uppercase tracking-wider font-bold">
            Entitlement
          </span>
          <span className="text-xl font-mono font-extrabold text-[#1c3d2e] dark:text-stone-100">
            {formatKg(summary.entitlement.kg)}
          </span>
        </div>

        <div className="p-3 bg-[#edf7f2] dark:bg-emerald-950/20 rounded-xl border border-[#bbf7d0] dark:border-emerald-900/60">
          <span className="text-[10px] text-[#166534] dark:text-emerald-400 block uppercase tracking-wider font-bold">
            Received
          </span>
          <span className="text-xl font-mono font-extrabold text-[#166534] dark:text-emerald-300">
            {formatKg(summary.totals.countedKg)}
          </span>
        </div>

        <div className={`p-3 rounded-xl border ${isShortfall ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b] dark:bg-rose-950/20' : 'bg-[#fbf9f4] border-[#eee7db] text-stone-800'}`}>
          <span className="text-[10px] block uppercase tracking-wider font-bold opacity-80">
            {isShortfall ? 'Shortfall' : 'Difference'}
          </span>
          <span className="text-xl font-mono font-extrabold">
            {formatKg(summary.differenceKg)}
          </span>
        </div>
      </div>

      {/* Arithmetic Block */}
      <div className="bg-[#fbf9f4] dark:bg-stone-950 p-3.5 rounded-xl border border-[#eee7db] dark:border-stone-800 font-mono text-xs text-stone-800 dark:text-stone-200 space-y-1">
        <span className="text-[10px] uppercase tracking-wider font-sans text-stone-400 font-bold block mb-1">
          Plain Line-By-Line Arithmetic
        </span>
        {summary.arithmetic.map((line, idx) => (
          <div key={idx} className="whitespace-pre">
            {line}
          </div>
        ))}
      </div>

      {/* Status Box */}
      <div
        className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
          isShortfall
            ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b] dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200'
            : isAbove
            ? 'bg-[#fefce8] border-[#fef08a] text-[#854d0e]'
            : 'bg-[#edf7f2] border-[#bbf7d0] text-[#166534]'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold mb-1">
          {isShortfall && <StatusChip label="Shortfall" />}
          {isMatches && <CheckCircle2 className="w-4 h-4 text-[#166534]" />}
          <span>
            {isShortfall
              ? `Shortfall of ${summary.differenceKg} kg below the entitlement`
              : isAbove
              ? `Received ${summary.differenceKg} kg more than the entitlement (advance/make-up delivery)`
              : 'Received quantity matches the entitlement'}
          </span>
        </div>
      </div>

      {/* Excluded Records Note */}
      {summary.totals.excludedCount > 0 && (
        <div className="text-xs text-stone-600 dark:text-stone-400 bg-[#fbf9f4] dark:bg-stone-950 p-3 rounded-xl border border-[#eee7db] dark:border-stone-800">
          <p className="font-bold text-stone-800 dark:text-stone-200">
            {summary.totals.excludedCount} records ({summary.totals.excludedKg} kg) were not counted:
          </p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
            {unrecordedCount > 0 && (
              <li>{unrecordedCount} has no evidence (Unrecorded)</li>
            )}
            {unclearCount > 0 && (
              <li>{unclearCount} marked unclear or unverified</li>
            )}
          </ul>
        </div>
      )}

      {/* Possible Causes & Disclaimer (MANDATORY on every shortfall view) */}
      <div className="bg-[#fbf9f4] dark:bg-stone-950 p-3.5 rounded-xl border border-[#eee7db] dark:border-stone-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Possible Causes
          </span>
          <ListenButton text={causes.join('. ') + '. ' + disclaimer} label="Listen" />
        </div>
        <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-1 list-disc list-inside">
          {causes.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
        <p className="text-[11px] text-stone-500 italic pt-2 border-t border-stone-200 dark:border-stone-800 leading-normal">
          {disclaimer}
        </p>
      </div>

      {/* View Full Report CTA Matching Reference Design */}
      <Link
        href={`/check/${checkId}/report`}
        className="w-full py-3.5 px-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
      >
        <span>View Full Report</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
