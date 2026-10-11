'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCheckId } from '@/lib/routeParams';
import { Header, BottomNav, StepProgress, ListenButton } from '@/components/Navigation';
import { SummaryPanel } from '@/components/SummaryPanel';
import { StatusChip, EvidenceBadge } from '@/components/StatusChip';
import { RuleCard } from '@/components/RuleCard';
import {
  getLocalCheck,
  getLocalHousehold,
  getLocalRecords,
  getPendingPhotos,
  saveLocalHousehold,
  deleteLocalRecord,
} from '@/lib/db';
import {
  DiscrepancySummary,
  computeSummary,
  assessRecords,
  formatKg,
} from '@repo/shared';
import type { LocalCheck, LocalHousehold, LocalRecord } from '@/lib/localTypes';
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
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function CheckLedgerPage() {
  const router = useRouter();
  const checkId = useCheckId();

  const [check, setCheck] = useState<LocalCheck | null>(null);
  const [household, setHousehold] = useState<LocalHousehold | null>(null);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [summary, setSummary] = useState<DiscrepancySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);

  // Tabs matching Screen 8: "All", "Counted", "Unrecorded"
  const [activeTab, setActiveTab] = useState<'all' | 'counted' | 'unrecorded'>('all');

  useEffect(() => {
    getPendingPhotos(checkId)
      .then((p) => setPendingPhotoCount(p.length))
      .catch(() => setPendingPhotoCount(0));
  }, [checkId]);

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
    const updated: LocalHousehold = {
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
      <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] flex items-center justify-center text-xs font-mono">
        Loading monthly ledger...
      </div>
    );
  }

  if (!check || !household) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] p-6 text-center space-y-3">
        <p className="text-sm font-semibold">Ledger or household not found.</p>
        <Link href="/" className="text-xs text-[#244b38] underline">
          Go back home
        </Link>
      </div>
    );
  }

  const assessments = assessRecords(records, check.period);

  // Filter records based on tab
  const filteredRecords = records.filter((rec) => {
    const assess = assessments.find((a) => a.recordId === rec.id);
    if (activeTab === 'counted') return assess?.counted;
    if (activeTab === 'unrecorded') return rec.evidenceType === 'none';
    return true;
  });

  const countedCount = records.filter((r) => assessments.find((a) => a.recordId === r.id)?.counted).length;
  const unrecordedCount = records.filter((r) => r.evidenceType === 'none').length;

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />
      <StepProgress activeStep={2} checkId={checkId} />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {pendingPhotoCount > 0 && (
          <Link
            href={`/check/${checkId}/capture`}
            className="block p-3.5 rounded-2xl border border-teal-300 dark:border-teal-800 bg-[#edf7f2] dark:bg-teal-950/40 text-xs text-teal-900 dark:text-teal-200 font-semibold shadow-2xs"
          >
            {pendingPhotoCount} offline photo{pendingPhotoCount === 1 ? '' : 's'} waiting to be processed. Tap to read now &rarr;
          </Link>
        )}

        {/* Period Card Header Matching Reference Design */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
                {check.period}
              </span>
              <span className="text-xs text-stone-500 font-medium">&bull; {household.label}</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#244b38]/10 text-[#244b38] border border-[#244b38]/20">
              {check.status === 'filed' ? 'Filed ✓' : check.status === 'reported' ? 'Report Ready' : 'Open'}
            </span>
          </div>

          <div className="bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl p-3 border border-[#eee7db] dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-600 dark:text-stone-400 font-mono font-medium">
              Rule: {household.cardType} &bull; {household.rule.perUnitKg} kg{' '}
              {household.rule.basis === 'perMember' ? `× ${household.members} = ${household.rule.perUnitKg * household.members} kg` : `= ${household.rule.perUnitKg} kg`}
            </span>
            <Link
              href={`/household/${household.id}/edit`}
              className="text-xs font-bold text-[#244b38] hover:underline"
            >
              Edit Rule
            </Link>
          </div>
        </div>

        {/* Blocking banner if rule is unconfirmed (Principle P1) */}
        {!household.ruleConfirmed && (
          <div className="bg-[#fffaf0] dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-3xl p-5 shadow-warm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-800 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-200">
                  Confirm the rule before comparison
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed mt-0.5 font-medium">
                  Per Principle P1, discrepancies and reports are hidden until you explicitly confirm the statutory entitlement rule.
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

        {/* Live Summary Panel */}
        {summary && household.ruleConfirmed && (
          <SummaryPanel summary={summary} checkId={checkId} />
        )}

        {/* My Records Header & Segmented Tab Controls (Screen 8) */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1c3d2e] dark:text-stone-100">
              My Records ({records.length})
            </h3>

            {/* Add Record Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="px-4 py-2 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Record</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* 4 Add Options Menu */}
              {showAddMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-2xl shadow-xl z-30 p-2 space-y-1">
                  <Link
                    href={`/check/${checkId}/record/new`}
                    onClick={() => setShowAddMenu(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#fbf9f4] dark:hover:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 transition-colors"
                  >
                    <PenTool className="w-4 h-4 text-[#244b38]" />
                    <div>
                      <div className="font-bold">1. Type it</div>
                      <div className="text-[10px] text-stone-500">Manual entry form</div>
                    </div>
                  </Link>

                  <Link
                    href={`/check/${checkId}/capture`}
                    onClick={() => setShowAddMenu(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#fbf9f4] dark:hover:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-[#244b38]" />
                    <div>
                      <div className="font-bold">2. Photo of slip / SMS</div>
                      <div className="text-[10px] text-stone-500">OCR &amp; draft review</div>
                    </div>
                  </Link>

                  <Link
                    href={`/check/${checkId}/paste`}
                    onClick={() => setShowAddMenu(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#fbf9f4] dark:hover:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 transition-colors"
                  >
                    <Clipboard className="w-4 h-4 text-[#244b38]" />
                    <div>
                      <div className="font-bold">3. Paste SMS / receipt text</div>
                      <div className="text-[10px] text-stone-500">Offline text extraction</div>
                    </div>
                  </Link>

                  <Link
                    href={`/check/${checkId}/voice`}
                    onClick={() => setShowAddMenu(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#fbf9f4] dark:hover:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 transition-colors"
                  >
                    <Mic className="w-4 h-4 text-[#244b38]" />
                    <div>
                      <div className="font-bold">4. Say it</div>
                      <div className="text-[10px] text-stone-500">Voice entry with read-back</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Segmented Filter Pills Matching Screen 8 */}
          <div className="flex items-center gap-2 p-1 bg-[#f3eee3] dark:bg-stone-950 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 rounded-xl transition-all ${activeTab === 'all' ? 'bg-[#244b38] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              All ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('counted')}
              className={`flex-1 py-1.5 rounded-xl transition-all ${activeTab === 'counted' ? 'bg-[#244b38] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Counted ({countedCount})
            </button>
            <button
              onClick={() => setActiveTab('unrecorded')}
              className={`flex-1 py-1.5 rounded-xl transition-all ${activeTab === 'unrecorded' ? 'bg-[#244b38] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Unrecorded ({unrecordedCount})
            </button>
          </div>

          {/* Records List Matching Reference Cards */}
          {filteredRecords.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-xs text-stone-500 font-semibold">No records in this category.</p>
              <p className="text-[11px] text-stone-400">
                Tap &ldquo;Add Record&rdquo; above to log an entry.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const assess = assessments.find((a) => a.recordId === rec.id);
                const isCounted = assess?.counted ?? true;

                return (
                  <div
                    key={rec.id}
                    className="p-3.5 bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl border border-[#eee7db] dark:border-stone-800 space-y-2 hover:border-[#244b38]/40 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100">
                          {rec.date}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-mono font-extrabold text-[#244b38] dark:text-emerald-400">
                            {formatKg(rec.quantityKg)}
                          </span>
                          {rec.commodity && (
                            <span className="text-[10px] font-bold uppercase text-stone-500 bg-[#eee7db] dark:bg-stone-800 px-2 py-0.5 rounded-full">
                              {rec.commodity}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {assess?.labels.map((lbl) => (
                          <StatusChip key={lbl} label={lbl} />
                        ))}
                      </div>
                    </div>

                    <EvidenceBadge
                      type={rec.evidenceType}
                      preview={rec.evidenceContent ?? undefined}
                    />

                    {!isCounted && (
                      <p className="text-[11px] text-stone-500 italic pt-1">
                        &bull; Not counted:{' '}
                        {assess?.exclusionReason === 'unrecorded'
                          ? 'no evidence linked (Unrecorded)'
                          : 'marked unsure or unverified (Unclear)'}
                      </p>
                    )}

                    <div className="pt-2 border-t border-[#eee7db] dark:border-stone-800 flex items-center justify-between text-xs">
                      <Link
                        href={`/check/${checkId}/record/${rec.id}`}
                        className="text-[#244b38] dark:text-emerald-400 font-bold hover:underline"
                      >
                        Edit details
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="text-stone-400 hover:text-rose-600 transition-colors p-1"
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
      </main>

      <BottomNav />
    </div>
  );
}
