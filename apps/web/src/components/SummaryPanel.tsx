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
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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

  return (
    <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
          Discrepancy Summary
        </h3>
        <ListenButton
          text={`Summary: Entitled ${summary.entitledKg} kg. Received counted ${summary.receivedCountedKg} kg. Difference ${summary.differenceKg} kg. Status: ${summary.status}.`}
          label="Listen"
        />
      </div>

      {/* 3 Headline Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 bg-white dark:bg-stone-950 rounded border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 block uppercase tracking-wider font-semibold">
            Entitled
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-stone-900 dark:text-stone-100">
            {formatKg(summary.entitledKg)}
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-stone-950 rounded border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 block uppercase tracking-wider font-semibold">
            Counted
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-teal-700 dark:text-teal-400">
            {formatKg(summary.receivedCountedKg)}
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-stone-950 rounded border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 block uppercase tracking-wider font-semibold">
            Difference
          </span>
          <span
            className={`text-xl sm:text-2xl font-mono font-bold ${
              isShortfall
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-stone-800 dark:text-stone-200'
            }`}
          >
            {formatKg(summary.differenceKg)}
          </span>
        </div>
      </div>

      {/* Arithmetic Block */}
      <div className="bg-stone-100 dark:bg-stone-950 p-3.5 rounded border border-stone-200 dark:border-stone-800 font-mono text-xs text-stone-800 dark:text-stone-200 space-y-1">
        <span className="text-[10px] uppercase tracking-wider font-sans text-stone-500 block mb-1">
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
        className={`p-3.5 rounded-md border text-xs leading-relaxed ${
          isShortfall
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
            : isAbove
            ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200'
            : 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-950 dark:text-teal-200'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold mb-1">
          {isShortfall && <StatusChip label="Shortfall" />}
          {isMatches && <CheckCircle2 className="w-4 h-4 text-teal-700" />}
          <span>
            {isShortfall
              ? `Difference of ${summary.differenceKg} kg below the entitlement`
              : isAbove
              ? `Received ${summary.differenceKg} kg more than the entitlement (this can happen with advance or make-up deliveries)`
              : 'Received quantity matches the entitlement'}
          </span>
        </div>
      </div>

      {/* Excluded Records Note */}
      {summary.recordsExcluded > 0 && (
        <div className="text-xs text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-950 p-3 rounded border border-stone-200 dark:border-stone-800">
          <p className="font-semibold text-stone-700 dark:text-stone-300">
            {summary.recordsExcluded} records ({summary.excludedKg} kg) were not counted:
          </p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
            {summary.exclusionBreakdown.unrecordedCount > 0 && (
              <li>{summary.exclusionBreakdown.unrecordedCount} has no evidence (Unrecorded)</li>
            )}
            {summary.exclusionBreakdown.unclearCount > 0 && (
              <li>{summary.exclusionBreakdown.unclearCount} marked unclear or unverified</li>
            )}
          </ul>
        </div>
      )}

      {/* Possible Causes & Disclaimer (MANDATORY on every shortfall view) */}
      <div className="bg-white dark:bg-stone-950 p-3.5 rounded border border-stone-200 dark:border-stone-800 space-y-2">
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
        <p className="text-[11px] text-stone-500 italic pt-2 border-t border-stone-100 dark:border-stone-900 leading-normal">
          {disclaimer}
        </p>
      </div>

      {/* Make Report CTA */}
      <Link
        href={`/check/${checkId}/report`}
        className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors"
      >
        <span>Make report</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
