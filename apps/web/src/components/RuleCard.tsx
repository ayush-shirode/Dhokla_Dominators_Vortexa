'use client';

import React from 'react';
import { EntitlementRule, CardType, computeEntitlement } from '@repo/shared';
import { ListenButton } from './Navigation';
import { CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

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
      className={`rounded-lg border p-4 transition-all ${
        isConfirmed
          ? 'bg-stone-50 dark:bg-stone-900 border-teal-600/50 dark:border-teal-700/50 shadow-xs'
          : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Rule Used for Calculation
          </span>
          <ListenButton text={ruleSpoken} label="Listen" />
        </div>
        {isConfirmed ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed {confirmedDate ? `(${confirmedDate.split('T')[0]})` : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3.5 h-3.5" />
            Confirmation Needed
          </span>
        )}
      </div>

      {/* Formula Display */}
      <div className="my-2.5 p-3 rounded bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 font-mono text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center justify-between">
        <span>{formula}</span>
        <span className="text-xs text-stone-500 font-sans font-normal">
          ({entitledKg} kg / month)
        </span>
      </div>

      {/* Source Citation */}
      <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-medium text-stone-700 dark:text-stone-300">Source:</span>
          <span>{rule.sourceTitle}</span>
          {rule.sourceUrl && (
            <a
              href={rule.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-teal-700 dark:text-teal-400 hover:underline gap-0.5"
            >
              <span>link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div>
          <span className="font-medium text-stone-700 dark:text-stone-300">Last verified:</span>{' '}
          {rule.lastVerified || 'not verified yet'}
        </div>
        <p className="text-[11px] text-stone-500 italic">
          State schemes may give more grain. If yours differs, edit the rule figure.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 underline font-medium"
          >
            Edit rule settings
          </button>
        )}
        {!isConfirmed ? (
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Use this rule</span>
          </button>
        ) : (
          <span className="text-xs text-teal-700 dark:text-teal-400 font-medium">
            &check; Rule active for summary
          </span>
        )}
      </div>
    </div>
  );
}
