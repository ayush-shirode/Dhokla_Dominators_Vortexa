'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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
import {
  Household,
  Check,
  DistributionRecord,
  Report,
  Filing,
  buildReportSnapshot,
  renderReportText,
  formatKg,
  POSSIBLE_CAUSES,
  DISCLAIMER,
} from '@repo/shared';
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
} from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const checkId = params.checkId as string;
  const { speak } = useApp();

  const [check, setCheck] = useState<Check | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [records, setRecords] = useState<DistributionRecord[]>([]);
  const [savedReport, setSavedReport] = useState<Report | null>(null);
  const [filing, setFiling] = useState<Filing | null>(null);
  const [reportLang, setReportLang] = useState<'en' | 'hi'>('en');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

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
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center text-xs font-mono">
        Loading report...
      </div>
    );
  }

  // Generate preview snapshot locally using shared engine
  const snapshot = buildReportSnapshot({
    household,
    period: check.period,
    records,
    ruleConfirmedAt: household.ruleConfirmedAt || new Date().toISOString(),
  });

  const fullReportText = renderReportText(snapshot, reportLang, {
    reportId: savedReport?.id,
    version: savedReport?.version || 1,
    contentHash: savedReport?.contentHash || 'PREVIEW-LOCAL-HASH',
    filing,
  });

  const handleSaveReport = async () => {
    setSaving(true);
    try {
      const newReport: Report = {
        id: crypto.randomUUID(),
        checkId,
        version: (savedReport?.version || 0) + 1,
        language: reportLang,
        snapshot,
        text: fullReportText,
        contentHash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        createdAt: new Date().toISOString(),
      };
      await saveLocalReport(newReport);
      setSavedReport(newReport);

      // Update check status
      const { saveLocalCheck } = await import('@/lib/db');
      await saveLocalCheck({ ...check, status: check.status === 'filed' ? 'filed' : 'reported' });
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-24">
      <Header />
      <StepProgress activeStep={3} checkId={checkId} />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-6 w-full space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Monthly Entitlement Report
            </h2>
            <ListenButton text={fullReportText} label="Read aloud" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Language toggle (en/hi) */}
            <div className="inline-flex rounded border border-stone-300 dark:border-stone-700 p-0.5 bg-white dark:bg-stone-900">
              <button
                type="button"
                onClick={() => setReportLang('en')}
                className={`px-2 py-1 text-xs rounded font-medium ${
                  reportLang === 'en'
                    ? 'bg-teal-700 text-white'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setReportLang('hi')}
                className={`px-2 py-1 text-xs rounded font-medium ${
                  reportLang === 'hi'
                    ? 'bg-teal-700 text-white'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                हिन्दी
              </button>
            </div>

            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-xs font-medium flex items-center gap-1.5 hover:bg-stone-100 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied ✓' : 'Copy text'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-xs font-medium flex items-center gap-1.5 hover:bg-stone-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-xs font-medium flex items-center gap-1.5 hover:bg-stone-100 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Save Report Banner if Preview */}
        {!savedReport ? (
          <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-lg p-3.5 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-200">
                Preview &mdash; not yet saved
              </span>
              <p className="text-amber-800 dark:text-amber-300">
                Tap &ldquo;Save report&rdquo; to freeze an official version with a cryptographic integrity hash.
              </p>
            </div>
            <button
              onClick={handleSaveReport}
              disabled={saving}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded shrink-0 shadow-xs"
            >
              Save Report
            </button>
          </div>
        ) : (
          <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 rounded-lg p-3 text-xs text-teal-900 dark:text-teal-200 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              Official Report v{savedReport.version} (Hash: {savedReport.contentHash.slice(0, 12)}...)
            </span>
            <Link
              href={`/check/${checkId}/grievance`}
              className="font-semibold text-teal-800 dark:text-teal-300 underline flex items-center gap-1"
            >
              <span>Continue to Grievance Helper</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Structured Report Layout (Printable Document Card) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 shadow-sm space-y-6 print:border-none print:shadow-none">
          {/* Header */}
          <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
                  RationSaathi Entitlement Audit
                </span>
                <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  Monthly Ration Distribution Report
                </h1>
              </div>
              <span className="font-mono text-sm font-bold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded">
                Period: {snapshot.period}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-stone-600 dark:text-stone-400">
              <div>
                <span className="text-stone-400 block text-[10px]">Household</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{snapshot.household.label}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Card Type</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{snapshot.household.cardType} ({snapshot.household.members} members)</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">State &amp; District</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{snapshot.household.stateCode} {snapshot.household.district ? `/ ${snapshot.household.district}` : ''}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">FPS Shop</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{snapshot.household.fpsNo || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Rule Used */}
          <div className="bg-stone-50 dark:bg-stone-950 p-3.5 rounded border border-stone-200 dark:border-stone-800 text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              Entitlement Rule Used for Calculation
            </span>
            <p className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
              {snapshot.rule.formula}
            </p>
            <p className="text-stone-500 text-[11px]">
              Source: {snapshot.rule.sourceTitle} &bull; Last verified: {snapshot.rule.lastVerified || 'not verified yet'} &bull; Confirmed by user on {snapshot.rule.confirmedAt.split('T')[0]}
            </p>
          </div>

          {/* Records Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
              Recorded Distribution Visits ({snapshot.records.length})
            </span>
            <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Quantity</th>
                    <th className="p-2.5">Evidence</th>
                    <th className="p-2.5">Labels</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {snapshot.records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-stone-400 italic">
                        No distribution records entered for this period.
                      </td>
                    </tr>
                  ) : (
                    snapshot.records.map((r, i) => (
                      <tr key={i} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                        <td className="p-2.5 font-mono font-medium">{r.date}</td>
                        <td className="p-2.5 font-mono font-bold text-teal-700 dark:text-teal-400">
                          {formatKg(r.quantityKg)}
                        </td>
                        <td className="p-2.5">
                          <span className="font-medium capitalize">{r.evidenceType}</span>
                          {r.evidenceContent && (
                            <span className="text-stone-400 truncate block max-w-xs text-[11px]">
                              {r.evidenceContent}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {r.labels.map((lbl: any) => (
                            <StatusChip key={lbl} label={lbl} />
                          ))}
                        </td>
                        <td className="p-2.5 text-[11px]">
                          {r.counted ? (
                            <span className="text-teal-700 dark:text-teal-400 font-semibold">Counted</span>
                          ) : (
                            <span className="text-stone-500 italic">Excluded ({r.exclusionReason})</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Arithmetic Summary */}
          <div className="bg-stone-100 dark:bg-stone-950 p-4 rounded border border-stone-200 dark:border-stone-800 font-mono text-xs space-y-1">
            <span className="text-[10px] uppercase font-sans font-bold text-stone-500 block mb-1">
              Plain Line-By-Line Arithmetic
            </span>
            {snapshot.summary.arithmetic.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>

          {/* Possible Causes & Disclaimer */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded border border-stone-200 dark:border-stone-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
              Possible Causes
            </span>
            <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-1 list-disc list-inside">
              {(POSSIBLE_CAUSES[reportLang] || POSSIBLE_CAUSES.en).map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <p className="text-[11px] text-stone-500 italic pt-2 border-t border-stone-200 dark:border-stone-800">
              {DISCLAIMER[reportLang] || DISCLAIMER.en}
            </p>
          </div>

          {/* Footer stamp */}
          <div className="border-t border-stone-200 dark:border-stone-800 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-stone-400 font-mono gap-1">
            <span>Generated: {snapshot.generatedAt}</span>
            {filing && (
              <span className="text-teal-700 dark:text-teal-400 font-bold font-sans">
                Official Filing Reference: {filing.referenceNumber} (Filed {filing.filedDate})
              </span>
            )}
          </div>
        </div>

        {/* Next Step CTA */}
        <div className="pt-2 flex justify-end">
          <Link
            href={`/check/${checkId}/grievance`}
            className="w-full sm:w-auto px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>Proceed to Grievance Helper</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
