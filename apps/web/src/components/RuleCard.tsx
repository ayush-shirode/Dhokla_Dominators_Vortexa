'use client';

import React from 'react';
import { EntitlementRule, CardType, computeEntitlement } from '@repo/shared';
import { ListenButton } from './Navigation';
import { CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';

interface RuleCardProps {
  cardType: CardType;
  members: number;
  rule: EntitlementRule;
  isConfirmed: boolean;
  confirmedDate?: string | null;
  onConfirm: () => void;
  onEdit?: () => void;
}

export function RuleCard({
  cardType,
  members,
  rule,
  isConfirmed,
  confirmedDate,
  onConfirm,
  onEdit,
}: RuleCardProps) {
  const { formula, kg: entitledKg } = computeEntitlement({
    cardType,
    members,
    rule,
  });

  const ruleSpoken = `Rule used for calculation: ${formula}. ${isConfirmed ? 'This rule is confirmed.' : 'Please confirm this rule to calculate discrepancy.'}`;

  return (
    <div
      className={`rounded-2xl border p-4.5 transition-all ${
        isConfirmed
          ? 'bg-[#f7f5ed] dark:bg-stone-900 border-[#e1dac8] dark:border-stone-800 shadow-2xs'
          : 'bg-[#fffaf0] dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#244b38]/10 text-[#244b38] dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
            ⚖
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1e4131] dark:text-emerald-400">
            Statutory Entitlement Rule
          </span>
          <ListenButton text={ruleSpoken} label="Listen" />
        </div>
        {isConfirmed ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#244b38] dark:text-emerald-400 bg-[#244b38]/10 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-[#244b38]/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed {confirmedDate ? `(${confirmedDate.split('T')[0]})` : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Confirmation Needed
          </span>
        )}
      </div>

      {/* Formula Display - Reference Green Highlight & Monospace */}
      <div className="my-2.5 p-3.5 rounded-xl bg-white dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 font-mono text-sm sm:text-base font-bold text-[#1c3d2e] dark:text-stone-100 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#244b38]" />
          <span>{formula}</span>
        </div>
        <span className="text-xs text-stone-500 font-sans font-semibold">
          ({entitledKg} kg / month)
        </span>
      </div>

      {/* Source Citation */}
      <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1 bg-white/60 dark:bg-stone-950/40 p-3 rounded-lg border border-[#eee7db]/80 dark:border-stone-800">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-semibold text-stone-800 dark:text-stone-200">Source:</span>
          <span>{rule.sourceTitle}</span>
          {rule.sourceUrl && (
            <a
              href={rule.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[#244b38] dark:text-emerald-400 hover:underline gap-0.5 font-medium ml-1"
            >
              <span>nfsa.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div>
          <span className="font-semibold text-stone-800 dark:text-stone-200">Last verified:</span>{' '}
          {rule.lastVerified || 'not verified yet'}
        </div>
        <p className="text-[11px] text-stone-500 italic pt-1">
          State schemes may give more grain. If yours differs, edit the rule figure.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-3.5 pt-3 border-t border-[#eee7db] dark:border-stone-800 flex items-center justify-between gap-3">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 underline font-semibold"
          >
            Edit rule settings
          </button>
        )}
        {!isConfirmed ? (
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm &amp; Use this rule</span>
          </button>
        ) : (
          <span className="text-xs text-[#244b38] dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Rule active for calculations
          </span>
        )}
      </div>
    </div>
  );
}
