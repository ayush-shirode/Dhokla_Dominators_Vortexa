'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCheckId } from '@/lib/routeParams';
import { Header, BottomNav, StepProgress, ListenButton } from '@/components/Navigation';
import { StatusChip } from '@/components/StatusChip';
import {
  getLocalCheck,
  getLocalHousehold,
  getLocalRecords,
  getLocalReports,
  saveLocalReport,
  getLocalFiling,
} from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { TranslatePanel } from '@/components/TranslatePanel';
import { api, flushOutbox } from '@/lib/api';
import {
  Report,
  Filing,
  buildReportSnapshot,
  renderReportText,
  formatKg,
  POSSIBLE_CAUSES,
  DISCLAIMER,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '@repo/shared';
import type { LocalCheck, LocalHousehold, LocalRecord } from '@/lib/localTypes';
import {
  Download,
  Share2,
  Printer,
  Copy,
  CheckCircle2,
  FileText,
  Volume2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const checkId = useCheckId();
  const { speak } = useApp();

  const [check, setCheck] = useState<LocalCheck | null>(null);
  const [household, setHousehold] = useState<LocalHousehold | null>(null);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [savedReport, setSavedReport] = useState<Report | null>(null);
  const [filing, setFiling] = useState<Filing | null>(null);
  const [reportLang, setReportLang] = useState<'en' | 'hi'>('en');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [extraTranslations, setExtraTranslations] = useState<LanguageCode[]>([]);

  useEffect(() => {
    getLocalCheck(checkId).then((chk) => {
      setCheck(chk || null);
      if (chk) {
        getLocalHousehold(chk.householdId).then((h) => setHousehold(h || null));
        getLocalRecords(chk.id).then(setRecords);
        getLocalReports(chk.id).then((reps) => {
          if (reps.length > 0) setSavedReport(reps[reps.length - 1]);
        });
        getLocalFiling(chk.id).then((f) => setFiling(f || null));
      }
    });
  }, [checkId]);

  if (!check || !household) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] flex items-center justify-center text-xs font-mono">
        Loading report summary...
      </div>
    );
  }

  if (!household.ruleConfirmed || !household.ruleConfirmedAt) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
        <Header />
        <main className="flex-1 max-w-md mx-auto px-4 py-10 w-full">
          <div className="bg-[#fffaf0] dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-3xl p-5 text-xs space-y-3">
            <p className="font-extrabold text-amber-950 dark:text-amber-200">Confirm the rule before viewing report</p>
            <p className="text-amber-900 dark:text-amber-300">The calculation requires an entitlement rule you have explicitly confirmed.</p>
            <Link href={`/household/${household.id}/edit`} className="inline-block px-4 py-2 bg-[#244b38] text-white rounded-xl font-bold">
              Review rule
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const snapshot = buildReportSnapshot({
    household,
    period: check.period,
    records,
    ruleConfirmedAt: household.ruleConfirmedAt,
  });

  const savedIsCurrent =
    !!savedReport &&
    JSON.stringify(savedReport.snapshot.summary.arithmetic) === JSON.stringify(snapshot.summary.arithmetic) &&
    JSON.stringify(savedReport.snapshot.records.map((r) => [r.id, r.evidenceContent, r.photoId])) ===
      JSON.stringify(snapshot.records.map((r) => [r.id, r.evidenceContent, r.photoId]));

  const fullReportText = savedIsCurrent
    ? renderReportText(savedReport!.snapshot, reportLang, {
        reportId: savedReport!.id,
        version: savedReport!.version,
        contentHash: savedReport!.contentHash,
        filing,
      })
    : renderReportText(snapshot, reportLang, { filing });

  const handleSaveReport = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await flushOutbox();
      const report = await api.reports.create(checkId, { language: reportLang });
      await saveLocalReport(report);
      setSavedReport(report);
      const { saveLocalCheck } = await import('@/lib/db');
      await saveLocalCheck({ ...check, status: check.status === 'filed' ? 'filed' : 'reported' }, false);
    } catch (err: any) {
      setSaveError(
        err?.code === 'NEUTRALITY_CHECK_FAILED'
          ? 'Some notes say who caused a difference. Please edit them to describe only what was received.'
          : err?.code === 'RULE_NOT_CONFIRMED'
            ? 'The rule is not confirmed on the server yet. Open the rule, confirm it, and try again.'
            : 'Saving the official report needs an internet connection. Your preview is shown below and can be copied.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!savedReport) return;
    try {
      const blob = await api.reports.export(savedReport.id, 'pdf', reportLang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RationSaathi-Report-${check.period}-v${savedReport.version}-${reportLang}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSaveError('The PDF needs an internet connection. Use "Download .txt" or "Print" instead.');
    }
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(fullReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([fullReportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RationSaathi-Report-${check.period}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />
      <StepProgress activeStep={3} checkId={checkId} />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* Title Bar with Back Button */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800"
            >
              <ArrowRight className="w-5 h-5 rotate-180 text-stone-700 dark:text-stone-300" />
            </button>
            <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
              Report Summary
            </h2>
          </div>
          <ListenButton text={fullReportText} label="Read aloud" />
        </div>

        {/* Report Summary Card Matching Screen 9 */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#1c3d2e] dark:text-stone-200">
              Entitlement vs Received
            </span>
            <span className="font-mono text-xs font-bold text-stone-500">
              {check.period}
            </span>
          </div>

          {/* 3 Metric Rows */}
          <div className="space-y-2 bg-[#fbf9f4] dark:bg-stone-950 p-3.5 rounded-2xl border border-[#eee7db] dark:border-stone-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-600 dark:text-stone-400">Entitlement (monthly)</span>
              <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                {formatKg(snapshot.summary.entitlement.kg)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600 dark:text-stone-400">Received (counted)</span>
              <span className="font-mono font-bold text-[#166534] dark:text-emerald-400">
                {formatKg(snapshot.summary.totals.countedKg)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#eee7db] dark:border-stone-800 font-bold">
              <span className={snapshot.summary.status === 'shortfall' ? 'text-[#991b1b]' : 'text-stone-800'}>
                {snapshot.summary.status === 'shortfall' ? 'Shortfall' : 'Difference'}
              </span>
              <span className={`font-mono text-sm ${snapshot.summary.status === 'shortfall' ? 'text-[#991b1b]' : 'text-stone-800'}`}>
                {formatKg(snapshot.summary.differenceKg)}
              </span>
            </div>
          </div>

          {/* Line-by-line arithmetic */}
          <div className="p-3 bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl border border-[#eee7db] dark:border-stone-800 font-mono text-[11px] text-stone-700 dark:text-stone-300 space-y-0.5">
            <span className="text-[10px] font-sans font-bold uppercase text-stone-400 block mb-1">Arithmetic</span>
            {snapshot.summary.arithmetic.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>

          {/* Labels In Report (Screen 9 Footer Chips) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Labels in this report:</span>
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label="Shortfall" />
              <StatusChip label="Late" />
              <StatusChip label="Unrecorded" />
              <StatusChip label="Unclear" />
            </div>
          </div>

          {/* Download & Export CTAs */}
          <div className="pt-2 space-y-2">
            {!savedIsCurrent ? (
              <button
                onClick={handleSaveReport}
                disabled={saving}
                className="w-full py-3.5 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-xl shadow-warm transition-all flex items-center justify-center gap-2"
              >
                <span>{saving ? 'Saving...' : 'Save Official Report'}</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadPdf}
                className="w-full py-3.5 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-xl shadow-warm transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Report</span>
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCopyText}
                className="flex-1 py-2.5 bg-[#fbf9f4] hover:bg-[#f3eee3] border border-[#eee7db] rounded-xl text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#244b38]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied ✓' : 'Copy Text'}</span>
              </button>
              <button
                onClick={handleDownloadTxt}
                className="flex-1 py-2.5 bg-[#fbf9f4] hover:bg-[#f3eee3] border border-[#eee7db] rounded-xl text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Next Step: Grievance Helper Link */}
        <Link
          href={`/check/${checkId}/grievance`}
          className="w-full py-3.5 px-4 bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-2xl shadow-warm flex items-center justify-between text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100 hover:bg-[#fbf9f4] transition-all"
        >
          <span>Proceed to Raise Grievance Helper</span>
          <ChevronRight className="w-4 h-4 text-[#244b38]" />
        </Link>
      </main>

      <BottomNav />
    </div>
  );
}
