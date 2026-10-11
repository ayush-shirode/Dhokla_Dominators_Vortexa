'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header, BottomNav, StepProgress, ListenButton } from '@/components/Navigation';
import { SummaryPanel } from '@/components/SummaryPanel';
import { StatusChip, EvidenceBadge } from '@/components/StatusChip';
import { RuleCard } from '@/components/RuleCard';
import {
  getLocalCheck,
  getLocalHousehold,
  getLocalRecords,
  saveLocalHousehold,
  deleteLocalRecord,
} from '@/lib/db';
import {
  Household,
  Check,
  DistributionRecord,
  DiscrepancySummary,
  computeSummary,
  assessRecords,
  formatKg,
} from '@repo/shared';
import {
  Plus,
  Camera,
  Clipboard,
  Mic,
  PenTool,
  AlertTriangle,
  ChevronDown,
  Trash2,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';

export default function CheckLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const checkId = params.checkId as string;

  const [check, setCheck] = useState<Check | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [records, setRecords] = useState<DistributionRecord[]>([]);
  const [summary, setSummary] = useState<DiscrepancySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const chk = await getLocalCheck(checkId);
      if (!chk) return;
      setCheck(chk);

      const hh = await getLocalHousehold(chk.householdId);
      if (hh) {
        setHousehold(hh);
        const recs = await getLocalRecords(checkId);
        // Sort by date ascending
        recs.sort((a, b) => a.date.localeCompare(b.date));
        setRecords(recs);

        if (hh.ruleConfirmed) {
          const sum = computeSummary({
            household: hh,
            period: chk.period,
            records: recs,
          });
          setSummary(sum);
        } else {
          setSummary(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [checkId]);

  const handleConfirmRule = async () => {
    if (!household) return;
    const updated: Household = {
      ...household,
      ruleConfirmed: true,
      ruleConfirmedAt: new Date().toISOString(),
    };
    await saveLocalHousehold(updated);
    setHousehold(updated);
    if (check) {
      const sum = computeSummary({
        household: updated,
        period: check.period,
        records,
      });
      setSummary(sum);
    }
  };

  const handleDeleteRecord = async (recId: string) => {
    if (window.confirm('Delete this distribution record?')) {
      await deleteLocalRecord(recId);
      await loadAll();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center text-xs font-mono">
        Loading monthly ledger...
      </div>
    );
  }

  if (!check || !household) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 p-6 text-center space-y-3">
        <p className="text-sm">Ledger or household not found.</p>
        <Link href="/" className="text-xs text-teal-700 underline">
          Go back home
        </Link>
      </div>
    );
  }

  const assessments = assessRecords(records, check.period);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-24">
      <Header />
      <StepProgress activeStep={2} checkId={checkId} />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full space-y-6">
        {/* Header Strip */}
        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                Period: {check.period}
              </span>
              <span className="text-xs text-stone-500">&bull; {household.label}</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800">
                {check.status === 'filed' ? 'Filed ✓' : check.status === 'reported' ? 'Report Ready' : 'Open'}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              Rule: {household.cardType} &bull; {household.rule.perUnitKg} kg{' '}
              {household.rule.basis === 'perMember'
                ? `× ${household.members} members = ${household.rule.perUnitKg * household.members} kg`
                : `= ${household.rule.perUnitKg} kg`}
            </p>
          </div>

          <Link
            href={`/household/${household.id}/edit`}
            className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium"
          >
            Edit Rule
          </Link>
        </div>

        {/* Blocking banner if rule is unconfirmed (Principle P1) */}
        {!household.ruleConfirmed && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-800 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Confirm the rule before we can compare
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed mt-0.5">
                  In line with Principle P1, discrepancy figures and reports remain hidden until you review and confirm the entitlement rule.
                </p>
              </div>
            </div>
            <RuleCard
              cardType={household.cardType}
              members={household.members}
              rule={household.rule}
              isConfirmed={false}
              onConfirm={handleConfirmRule}
            />
          </div>
        )}

        {/* Ledger Layout: Two panes on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Records Ledger (Left Pane) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Distribution Records ({records.length})
                </h3>
                <ListenButton
                  text={`Monthly ledger for period ${check.period}. ${records.length} records logged.`}
                  label="Listen"
                />
              </div>

              {/* Add Record Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add record</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* 4 Add Options Sheet/Dropdown */}
                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg z-30 p-2 space-y-1">
                    <Link
                      href={`/check/${checkId}/record/new`}
                      onClick={() => setShowAddMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 transition-colors"
                    >
                      <PenTool className="w-4 h-4 text-teal-700" />
                      <div>
                        <div className="font-semibold">1. Type it</div>
                        <div className="text-[10px] text-stone-500">Manual entry form</div>
                      </div>
                    </Link>

                    <Link
                      href={`/check/${checkId}/capture`}
                      onClick={() => setShowAddMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-teal-700" />
                      <div>
                        <div className="font-semibold">2. Photo of slip / SMS</div>
                        <div className="text-[10px] text-stone-500">OCR &amp; draft review</div>
                      </div>
                    </Link>

                    <Link
                      href={`/check/${checkId}/paste`}
                      onClick={() => setShowAddMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 transition-colors"
                    >
                      <Clipboard className="w-4 h-4 text-teal-700" />
                      <div>
                        <div className="font-semibold">3. Paste SMS / receipt text</div>
                        <div className="text-[10px] text-stone-500">Fast offline text extraction</div>
                      </div>
                    </Link>

                    <Link
                      href={`/check/${checkId}/voice`}
                      onClick={() => setShowAddMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 transition-colors"
                    >
                      <Mic className="w-4 h-4 text-teal-700" />
                      <div>
                        <div className="font-semibold">4. Say it</div>
                        <div className="text-[10px] text-stone-500">Voice entry with read-back</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Records List (Register style with dashed rows) */}
            <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-3 shadow-xs">
              {records.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-xs text-stone-500">No records logged for this month yet.</p>
                  <p className="text-[11px] text-stone-400">
                    Use &ldquo;Add record&rdquo; to log a slip, SMS, note, or zero-grain visit.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-dashed divide-stone-300 dark:divide-stone-700">
                  {records.map((rec) => {
                    const assess = assessments.find((a) => a.id === rec.id);
                    const isCounted = assess?.counted ?? true;

                    return (
                      <div
                        key={rec.id}
                        className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-stone-100 dark:hover:bg-stone-800/40 rounded transition-colors"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
                              {rec.date}
                            </span>
                            <span className="font-mono text-base font-bold text-teal-700 dark:text-teal-400">
                              {formatKg(rec.quantityKg)}
                            </span>
                            {rec.commodity && (
                              <span className="text-[10px] uppercase font-semibold text-stone-500 bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                                {rec.commodity}
                              </span>
                            )}
                            {assess?.labels.map((lbl) => (
                              <StatusChip key={lbl} label={lbl} />
                            ))}
                          </div>

                          <EvidenceBadge
                            type={rec.evidenceType}
                            preview={rec.evidenceContent}
                          />

                          {!isCounted && (
                            <p className="text-[11px] text-stone-500 italic">
                              &bull; Not counted: {assess?.reason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/check/${checkId}/record/${rec.id}`}
                            className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 px-2 py-1 rounded"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="text-xs text-stone-400 hover:text-amber-700 p-1 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Discrepancy Summary (Right Pane) */}
          <div className="lg:col-span-5 space-y-4">
            {summary && household.ruleConfirmed ? (
              <SummaryPanel summary={summary} checkId={checkId} />
            ) : (
              <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 text-center text-xs text-stone-500">
                Summary will appear here once the entitlement rule is confirmed.
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
