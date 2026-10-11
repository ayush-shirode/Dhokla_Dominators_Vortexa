'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCheckId } from '@/lib/routeParams';
import { Header, BottomNav, StepProgress, ListenButton } from '@/components/Navigation';
import { SummaryPanel } from '@/components/SummaryPanel';
import { StatusChip } from '@/components/StatusChip';
import {
  getLocalCheck,
  getLocalHousehold,
  getLocalRecords,
  deleteLocalRecord,
} from '@/lib/db';
import { computeSummary } from '@repo/shared';
import type { LocalCheck, LocalHousehold, LocalRecord } from '@/lib/localTypes';
import {
  Plus,
  FileText,
  AlertCircle,
  Trash2,
  Edit2,
  Calendar,
  Lock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function CheckLedgerPage() {
  const router = useRouter();
  const checkId = useCheckId();

  const [check, setCheck] = useState<LocalCheck | null>(null);
  const [household, setHousehold] = useState<LocalHousehold | null>(null);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter tabs: All, Counted, Late, Unrecorded, Unclear
  const [filter, setFilter] = useState<'all' | 'counted' | 'late' | 'unrecorded' | 'unclear'>('all');

  const [highlightId, setHighlightId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const chk = await getLocalCheck(checkId);
      if (chk) {
        setCheck(chk);
        const [hh, recs] = await Promise.all([
          getLocalHousehold(chk.householdId),
          getLocalRecords(chk.id),
        ]);
        setHousehold(hh || null);
        setRecords(recs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hl = urlParams.get('highlight');
      if (hl) {
        setHighlightId(hl);
        setTimeout(() => setHighlightId(null), 3000);
      }
    }
  }, [checkId]);

  const handleDeleteRecord = async (recordId: string) => {
    if (window.confirm('Delete this record? This cannot be undone.')) {
      await deleteLocalRecord(recordId);
      await loadData();
    }
  };

  if (loading || !check || !household) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] flex items-center justify-center text-xs font-mono">
        Loading monthly ledger...
      </div>
    );
  }

  // Principle P1 gate: Is the rule confirmed?
  const isRuleConfirmed = household.ruleConfirmed;

  // Compute deterministic summary with the confirmed rule
  const summary = computeSummary({
    household,
    period: check.period,
    records,
  });

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (filter === 'all') return true;
    const assessed = summary.records.find((ar) => ar.recordId === r.id);
    if (!assessed) return true;
    if (filter === 'counted') return assessed.counted;
    if (filter === 'late') return assessed.labels.includes('late');
    if (filter === 'unrecorded') return assessed.labels.includes('unrecorded');
    if (filter === 'unclear') return assessed.labels.includes('unclear');
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />
      <StepProgress activeStep={2} checkId={checkId} householdId={household.id} />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* Ledger Header */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-[#244b38]/10 text-[#244b38]">
                {check.period}
              </span>
              <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
                Monthly Records Ledger
              </h2>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {household.label} &bull; {household.members} members
            </p>
          </div>
          <ListenButton
            text={`Ledger for ${check.period}. ${records.length} records logged.`}
            label="Listen"
          />
        </div>

        {/* RULE CONFIRMATION GATE (Principle P1) */}
        {!isRuleConfirmed ? (
          <div className="bg-[#fffbeb] dark:bg-amber-950/40 border border-[#fde68a] dark:border-amber-800 rounded-3xl p-5 shadow-warm space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                  Confirm the rule before we can compare
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  The law requires your entitlement rule to be explicitly confirmed before any comparison or shortfall can be shown.
                </p>
              </div>
            </div>

            <Link
              href={`/household/${household.id}/edit`}
              className="w-full min-h-[48px] py-3 px-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <span>View Rule Card &bull; Tap &ldquo;Use this rule&rdquo;</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Deterministic Summary Panel (Only rendered if rule is confirmed) */
          <SummaryPanel summary={summary} checkId={checkId} />
        )}

        {/* Ledger Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/check/${checkId}/record/new`}
            className="min-h-[48px] py-3 px-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </Link>

          {isRuleConfirmed ? (
            <Link
              href={`/check/${checkId}/report`}
              className="min-h-[48px] py-3 px-4 bg-white dark:bg-stone-900 border border-[#244b38] text-[#244b38] dark:text-emerald-400 hover:bg-[#edf7f2] font-extrabold text-xs rounded-2xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <FileText className="w-4 h-4" />
              <span>Make Report &rarr;</span>
            </Link>
          ) : (
            <button
              disabled
              title="Confirm the rule to unlock reports"
              className="min-h-[48px] py-3 px-4 bg-stone-100 text-stone-400 border border-stone-200 rounded-2xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>Make Report</span>
            </button>
          )}
        </div>

        {/* Segmented Filter Pills */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1c3d2e] dark:text-stone-200">
              Distribution Slips &amp; Entries ({records.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(['all', 'counted', 'late', 'unrecorded', 'unclear'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`min-h-[40px] px-3.5 py-1.5 text-xs font-extrabold rounded-full capitalize transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
                  filter === tab
                    ? 'bg-[#244b38] text-white shadow-xs'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-[#eee7db] hover:border-stone-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Records List */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-8 text-center space-y-3">
            <p className="text-xs text-stone-500 italic">
              {records.length === 0
                ? 'No ration records logged for this month yet.'
                : `No records matching the "${filter}" filter.`}
            </p>
            {records.length === 0 && (
              <Link
                href={`/check/${checkId}/record/new`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#244b38] text-white text-xs font-extrabold rounded-xl"
              >
                <Plus className="w-4 h-4" />
                <span>Add your first distribution record</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((r) => {
              const assessed = summary.records.find((ar) => ar.recordId === r.id);
              const isHl = highlightId === r.id;

              return (
                <div
                  key={r.id}
                  className={`bg-white dark:bg-stone-900 border rounded-3xl p-4 shadow-warm transition-all ${
                    isHl
                      ? 'border-[#244b38] ring-2 ring-[#244b38] bg-[#edf7f2]'
                      : 'border-[#eee7db] dark:border-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#eee7db] dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <span className="font-mono text-xs font-extrabold text-stone-800 dark:text-stone-200">
                        {r.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {assessed?.labels.map((lbl) => (
                        <StatusChip key={lbl} label={lbl} />
                      ))}
                      {assessed?.counted && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#edf7f2] text-[#166534] border border-[#bbf7d0]">
                          Counted
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold capitalize text-stone-800 dark:text-stone-200 block">
                        {r.commodity ? r.commodity.replace('_', ' ') : 'Mixed commodities'}
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        Evidence: {r.evidenceType === 'receipt' ? 'Receipt / Slip' : r.evidenceType === 'sms' ? 'SMS Text' : r.evidenceType === 'note' ? 'Visit Note' : 'No evidence'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-2xl font-extrabold text-[#1c3d2e] dark:text-stone-100">
                        {r.quantityKg} <span className="text-xs font-sans text-stone-500">kg</span>
                      </div>
                    </div>
                  </div>

                  {r.evidenceContent && (
                    <div className="pt-2 border-t border-[#eee7db] dark:border-stone-800 text-[11px] font-mono text-stone-600 dark:text-stone-400 truncate">
                      {r.evidenceContent}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#eee7db] dark:border-stone-800 flex items-center justify-end gap-2">
                    <Link
                      href={`/check/${checkId}/record/${r.id}`}
                      className="min-h-[44px] px-3 py-1 text-xs text-stone-600 hover:text-[#244b38] font-bold inline-flex items-center gap-1 focus:outline-none"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(r.id)}
                      className="min-h-[44px] px-3 py-1 text-xs text-rose-600 hover:text-rose-800 font-bold inline-flex items-center gap-1 focus:outline-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
