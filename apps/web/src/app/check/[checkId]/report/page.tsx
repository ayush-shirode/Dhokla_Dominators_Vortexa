'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCheckId } from '@/lib/routeParams';
import { Header, BottomNav, StepProgress, ListenButton } from '@/components/Navigation';
import {
  getLocalCheck,
  getLocalHousehold,
  getLocalRecords,
  getLocalReports,
  saveLocalReport,
  saveLocalCheck,
} from '@/lib/db';
import { useApp } from '@/context/AppContext';
import {
  Report,
  buildReportSnapshot,
  renderReportText,
  formatKg,
  POSSIBLE_CAUSES,
  DISCLAIMER,
  type ReportSnapshot,
} from '@repo/shared';
import { api } from '@/lib/api';
import type { LocalCheck, LocalHousehold, LocalRecord } from '@/lib/localTypes';
import {
  FileText,
  Download,
  ShieldAlert,
} from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const checkId = useCheckId();
  const { lang, speak } = useApp();

  const [check, setCheck] = useState<LocalCheck | null>(null);
  const [household, setHousehold] = useState<LocalHousehold | null>(null);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  const templateLang = lang === 'hi' ? 'hi' : 'en';
  const causes = POSSIBLE_CAUSES[templateLang];
  const disclaimer = DISCLAIMER[templateLang];

  useEffect(() => {
    getLocalCheck(checkId).then((chk) => {
      setCheck(chk || null);
      if (chk) {
        getLocalHousehold(chk.householdId).then((h) => {
          setHousehold(h || null);
          if (h) {
            getLocalRecords(chk.id).then((recs) => {
              setRecords(recs);
              const snap = buildReportSnapshot({
                household: h,
                period: chk.period,
                records: recs,
                ruleConfirmedAt: h.ruleConfirmedAt || new Date().toISOString(),
              });
              setSnapshot(snap);
            });
          }
        });
        getLocalReports(chk.id).then((reps) => {
          if (reps && reps.length > 0) {
            setReport(reps[0]);
          }
        });
      }
    });
  }, [checkId]);

  if (!check || !household || !snapshot) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] flex items-center justify-center text-xs font-mono">
        Loading audit report preview...
      </div>
    );
  }

  // Principle P1 gate: Is the rule confirmed?
  if (!household.ruleConfirmed) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-md mx-auto px-4 py-8 w-full space-y-4">
          <div className="bg-[#fffbeb] border border-[#fde68a] rounded-3xl p-6 text-center space-y-4">
            <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
            <h2 className="text-base font-extrabold text-amber-900">
              Confirm the rule before generating report
            </h2>
            <p className="text-xs text-amber-800 leading-relaxed">
              An audit report requires your statutory entitlement rule to be explicitly confirmed.
            </p>
            <Link
              href={`/household/${household.id}/edit`}
              className="inline-block px-5 py-3 bg-[#244b38] text-white text-xs font-extrabold rounded-2xl shadow-warm"
            >
              Confirm Rule Now &rarr;
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleSaveReport = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      let rep: Report;

      try {
        rep = await api.reports.create(checkId, { language: templateLang });
      } catch {
        rep = {
          id: crypto.randomUUID(),
          checkId,
          householdId: household.id,
          version: (report?.version || 0) + 1,
          language: templateLang,
          createdAt: now,
          contentHash: 'local-audit-hash',
          snapshot,
          text: renderReportText(snapshot, templateLang),
          translations: [],
        };
        setOfflineNotice('Report saved on phone (offline).');
      }

      await saveLocalReport(rep);
      setReport(rep);
      await saveLocalCheck({ ...check, status: 'reported' });
      setCheck({ ...check, status: 'reported' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const text = renderReportText(snapshot, templateLang);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ration-audit-${check.period}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isShortfall = snapshot.summary.status === 'shortfall';

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />
      <StepProgress activeStep={3} checkId={checkId} householdId={household.id} />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* Title & Listen */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
                Monthly Audit Report
              </h2>
              {!report ? (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Not yet saved
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#edf7f2] text-[#166534] border border-[#bbf7d0]">
                  Saved ✓
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 font-mono">
              Period {check.period} &bull; {snapshot.summary.records.length} records analyzed
            </p>
          </div>
          <ListenButton
            text={`Audit report for ${check.period}. Entitlement is ${snapshot.summary.entitlement.kg} kg. Total received is ${snapshot.summary.totals.countedKg} kg. Shortfall is ${snapshot.summary.differenceKg} kg.`}
            label="Listen"
          />
        </div>

        {offlineNotice && (
          <div className="p-3 bg-[#f7f5ed] border border-[#e5decb] text-xs font-bold text-stone-700 rounded-2xl">
            {offlineNotice}
          </div>
        )}

        {/* Report Summary Card */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-stone-800 dark:text-stone-200">
              Entitlement vs Received
            </span>
            <span className="font-mono text-xs font-bold text-stone-500">
              {check.period}
            </span>
          </div>

          {/* 3 Metric Rows */}
          <div className="space-y-2.5 bg-[#fbf9f4] dark:bg-stone-950 p-4 rounded-2xl border border-[#eee7db] dark:border-stone-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-600 dark:text-stone-400">Entitlement (monthly)</span>
              <span className="font-mono text-sm font-extrabold text-stone-900 dark:text-stone-100">
                {formatKg(snapshot.summary.entitlement.kg)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600 dark:text-stone-400">Received (counted)</span>
              <span className="font-mono text-sm font-extrabold text-[#166534] dark:text-emerald-400">
                {formatKg(snapshot.summary.totals.countedKg)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-[#eee7db] dark:border-stone-800 font-extrabold">
              <span className={isShortfall ? 'text-amber-900' : 'text-stone-800'}>
                {isShortfall ? 'Difference (Shortfall)' : 'Difference'}
              </span>
              <span className={`font-mono text-base ${isShortfall ? 'text-amber-900' : 'text-stone-800'}`}>
                {formatKg(snapshot.summary.differenceKg)}
              </span>
            </div>
          </div>

          {/* Line-by-line arithmetic */}
          <div className="p-3.5 bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl border border-[#eee7db] dark:border-stone-800 font-mono text-[11px] text-stone-700 dark:text-stone-300 space-y-1">
            <span className="text-[10px] uppercase font-sans font-extrabold text-stone-400 block mb-1">
              Line-by-Line Arithmetic
            </span>
            {snapshot.summary.arithmetic.map((line: string, idx: number) => (
              <div key={idx}>{line}</div>
            ))}
          </div>

          {/* Possible causes & Disclaimer on shortfall */}
          {isShortfall && (
            <div className="p-4 bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl border border-[#eee7db] dark:border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Possible Explanations
                </span>
                <ListenButton text={causes.join('. ') + '. ' + disclaimer} label="Listen" />
              </div>
              <ul className="list-disc list-inside text-xs text-stone-600 dark:text-stone-400 space-y-1">
                {causes.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <p className="italic text-[11px] text-stone-500 pt-2 border-t border-[#eee7db]">
                {disclaimer}
              </p>
            </div>
          )}

          {/* Action Buttons: Save / Download */}
          <div className="pt-2 flex flex-col gap-2">
            {!report ? (
              <button
                type="button"
                onClick={handleSaveReport}
                disabled={saving}
                className="w-full min-h-[48px] py-3.5 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>Save This Report</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="min-h-[48px] py-3 px-3 bg-[#fbf9f4] hover:bg-[#f3eee3] border border-[#eee7db] text-[#1c3d2e] font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#244b38]" />
                  <span>Download (.txt)</span>
                </button>

                <Link
                  href={`/check/${checkId}/grievance`}
                  className="min-h-[48px] py-3 px-3 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <span>Proceed to Grievance &rarr;</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
