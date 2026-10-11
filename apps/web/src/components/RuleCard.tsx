'use client';

import { useApp } from '@/context/AppContext';
import React from 'react';
import type { CardType, EntitlementRule } from '@repo/shared';
import { computeEntitlement } from '@repo/shared';
import { CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { ListenButton } from './Navigation';

interface RuleCardProps {
  cardType: CardType;
  members: number;
  rule: EntitlementRule;
  isConfirmed: boolean;
  confirmedDate?: string | null;
  isEdited?: boolean;
  onConfirm?: () => void;
  showActions?: boolean;
  /** Shown prominently when official sources disagree about this figure. */
  caution?: string | null;
  /** Why "Use this rule" is disabled (no figure yet, no source given…). */
  blockedReason?: string | null;
}

export function RuleCard({
  cardType,
  members,
  rule,
  isConfirmed,
  confirmedDate,
  isEdited = false,
  onConfirm,
  showActions = true,
  caution,
  blockedReason,
}: RuleCardProps) {
  const { t } = useApp();
  const computation = computeEntitlement({
    cardType,
    members,
    rule,
  });

  const ruleSummaryText = [
    t('rule.listenRule', { formula: computation.formula }),
    t('rule.listenSource', { source: rule.sourceTitle || t('rule.nfsaStatutoryRules') }),
    rule.lastVerified ? t('rule.listenVerified', { date: rule.lastVerified }) : t('rule.notVerifiedYet'),
  ].join(' ');

  return (
    <div
      className={`bg-white dark:bg-[#202622] border rounded-2xl p-5 shadow-subtle transition-all ${
        isConfirmed
          ? 'border-[#bbf7d0] dark:border-emerald-800'
          : 'border-[#E8E5DD] dark:border-stone-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#E8E5DD] dark:border-stone-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <CheckCircle2 className="w-4 h-4 text-[#166534] dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
            {isConfirmed ? t('rule.applicableRuleConfirmed') : t('rule.entitlementRuleConfirmation')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEdited && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
              
              {t('rule.editedByYou')}
            </span>
          )}
          <ListenButton text={ruleSummaryText} label={t('actions.listen')} />
        </div>
      </div>

      {/* Compact summary with clear label */}
      <div className="py-1">
        <span className="text-[11px] font-medium text-stone-500 block mb-1">
          
          {t('rule.calculatedMonthlyEntitlement')}
        </span>
        <div className="font-mono text-xl sm:text-2xl font-bold text-[#1c3d2e] dark:text-stone-100 tracking-tight">
          {computation.formula}
        </div>
      </div>

      {/* Source Citation & Verification Status */}
      <div className="pt-3 mt-3 border-t border-[#E8E5DD] dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-stone-500">{t('rule.source')}</span>
          {rule.sourceUrl ? (
            <a
              href={rule.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#244b38] dark:text-emerald-400 font-medium underline inline-flex items-center gap-1 hover:text-[#1b3a2b]"
            >
              <span>{rule.sourceTitle || t('rule.nfsaStatutoryRules')}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="font-medium text-stone-700">{rule.sourceTitle || t('rule.stateScheme')}</span>
          )}
        </div>

        <div className="text-[11px] text-stone-500">
          {rule.lastVerified ? (
            <span>{t('common.lastVerified')}{' '}{rule.lastVerified}</span>
          ) : (
            <span className="italic">{t('rule.notVerifiedYet')}</span>
          )}
        </div>
        {rule.sourceNote && <p className="text-[11px] text-stone-500 leading-relaxed">{rule.sourceNote}</p>}
        {caution && (
          <p className="text-[11px] p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
            {caution}
          </p>
        )}
      </div>

      {/* Confirmation Action Button */}
      {showActions && onConfirm && (
        <div className="pt-3 mt-3 border-t border-[#E8E5DD] dark:border-stone-800">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isConfirmed && !!blockedReason}
            className={`w-full min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
              isConfirmed
                ? 'bg-[#edf7f2] hover:bg-[#e2f2e9] text-[#166534] border border-[#bbf7d0]'
                : 'bg-[#244b38] hover:bg-[#1b3a2b] text-white shadow-warm'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isConfirmed ? t('rule.ruleConfirmedTapToRe') : t('rule.useThisRule')}</span>
          </button>
          {!isConfirmed && blockedReason && (
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-2 text-center">{blockedReason}</p>
          )}
        </div>
      )}
    </div>
  );
}
