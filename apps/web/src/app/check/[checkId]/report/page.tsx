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
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  type ReportSnapshot,
} from '@repo/shared';
import { api, flushOutbox } from '@/lib/api';
import { TranslatePanel } from '@/components/TranslatePanel';
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
  const [extraTranslations, setExtraTranslations] = useState<LanguageCode[]>([]);

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
          // Latest saved version
          if (reps && reps.length > 0) setReport([...reps].sort((a, b) => b.version - a.version)[0]!);
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

  // A saved report is an immutable server snapshot. If records or the rule changed since,
  // what is on screen is a new preview until it is saved again.
  const savedIsCurrent =
    !!report &&
    JSON.stringify(report.snapshot.summary.arithmetic) === JSON.stringify(snapshot.summary.arithmetic) &&
    JSON.stringify(report.snapshot.records.map((r) => [r.id, r.evidenceContent, r.photoId])) ===
      JSON.stringify(snapshot.records.map((r) => [r.id, r.evidenceContent, r.photoId]));

  const handleSaveReport = async () => {
    setSaving(true);
    setOfflineNotice(null);
    try {
      // The official snapshot (id, version, SHA-256 hash) is made by the server from synced data,
      // so pending changes are sent first. Offline, nothing "official" is invented.
      await flushOutbox();
      const rep = await api.reports.create(checkId, { language: templateLang });
      await saveLocalReport(rep);
      setReport(rep);
      await saveLocalCheck({ ...check, status: check.status === 'filed' ? 'filed' : 'reported' }, false);
      setCheck({ ...check, status: check.status === 'filed' ? 'filed' : 'reported' });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setOfflineNotice(
        code === 'NEUTRALITY_CHECK_FAILED'
          ? 'Some notes say who caused a difference. Please edit them to describe only what was received.'
          : code === 'RULE_NOT_CONFIRMED'
            ? 'The rule is not confirmed on the server yet. Open the rule, confirm it, and try again.'
            : 'Saving the official report needs an internet connection. The preview below can still be read aloud and downloaded as text.',
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Text download: the saved report (with id and hash) when current, otherwise the preview. */
  const handleDownload = () => {
    const text =
      savedIsCurrent && report
        ? renderReportText(report.snapshot, templateLang, { reportId: report.id, version: report.version, contentHash: report.contentHash })
        : renderReportText(snapshot, templateLang);
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `ration-report-${check.period}${savedIsCurrent && report ? `-v${report.version}` : '-preview'}.txt`);
  };

  const handleExport = async (format: 'pdf' | 'html' | 'txt', language: LanguageCode) => {
    if (!report) return;
    try {
      const blob = await api.reports.export(report.id, format, language);
      downloadBlob(blob, `ration-report-${check.period}-v${report.version}-${language}.${format}`);
    } catch {
      setOfflineNotice('This download needs an internet connection. Use "Download (.txt)" instead.');
    }
  };

  const translatedLangs: LanguageCode[] = report
    ? [...new Set([...report.translations.map((tr) => tr.language), ...extraTranslations])]
    : [];

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
              {!savedIsCurrent ? (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {report ? `Changed since v${report.version}` : 'Not yet saved'}
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
            text={`Report for ${check.period}. Entitlement ${formatKg(snapshot.summary.entitlement.kg)}. Received and counted ${formatKg(snapshot.summary.totals.countedKg)}. Difference ${formatKg(Math.abs(snapshot.summary.differenceKg))}.`}
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
                {isShortfall ? 'Difference (Shortfall)' : snapshot.summary.status === 'above_entitlement' ? 'Received more than the entitlement' : 'Difference'}
              </span>
              <span className={`font-mono text-base ${isShortfall ? 'text-amber-900' : 'text-stone-800'}`}>
                {formatKg(Math.abs(snapshot.summary.differenceKg))}
              </span>
            </div>
          </div>

          {/* Every record with its evidence (Principle 3) */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-extrabold text-stone-400 block">Records and evidence</span>
            {snapshot.records.length === 0 && <p className="text-xs text-stone-500">No records for this month.</p>}
            {snapshot.records.map((r) => (
              <div key={r.id} className="p-3 rounded-2xl border border-[#eee7db] dark:border-stone-800 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold">{r.date}</span>
                  <span className="font-mono font-extrabold">{formatKg(r.quantityKg)}</span>
                </div>
                <p className="text-stone-600 dark:text-stone-400 break-words">
                  {r.evidenceType === 'none' ? 'No evidence' : `${r.evidenceType.toUpperCase()}${r.evidenceContent ? `: ${r.evidenceContent}` : ''}`}
                </p>
                {!r.counted && (
                  <p className="text-[11px] text-amber-800">
                    Not counted — {r.exclusionReason === 'unrecorded' ? 'no evidence linked' : 'marked unsure'}
                  </p>
                )}
              </div>
            ))}
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
            {savedIsCurrent && report && (
              <p className="text-[11px] text-stone-500 font-mono break-all">
                Official report v{report.version} · hash {report.contentHash.slice(0, 12)}…
              </p>
            )}
            {!savedIsCurrent && (
              <button
                type="button"
                onClick={handleSaveReport}
                disabled={saving}
                className="w-full min-h-[48px] py-3.5 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>{saving ? 'Saving…' : report ? 'Save new version' : 'Save This Report'}</span>
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="min-h-[48px] py-3 px-3 bg-[#fbf9f4] hover:bg-[#f3eee3] border border-[#eee7db] text-[#1c3d2e] font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-[#244b38]" />
                <span>Download (.txt)</span>
              </button>
              {savedIsCurrent ? (
                <button
                  type="button"
                  onClick={() => handleExport('pdf', templateLang)}
                  className="min-h-[48px] py-3 px-3 bg-[#fbf9f4] hover:bg-[#f3eee3] border border-[#eee7db] text-[#1c3d2e] font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#244b38]" />
                  <span>Download PDF</span>
                </button>
              ) : (
                <span />
              )}
            </div>
            {savedIsCurrent && (
              <Link
                href={`/check/${checkId}/grievance`}
                className="min-h-[48px] py-3 px-3 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <span>Proceed to Grievance &rarr;</span>
              </Link>
            )}
          </div>
        </div>

        {savedIsCurrent && report && (
          <div className="space-y-2">
            <TranslatePanel purpose="report" reportId={report.id} onApplied={(_, l) => setExtraTranslations((p) => [...p, l])} />
            {translatedLangs.length > 0 && (
              <div className="text-xs bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-2xl p-3 space-y-1.5">
                <span className="font-extrabold block">Confirmed translations</span>
                {translatedLangs.map((l) => (
                  <div key={l} className="flex items-center justify-between gap-2">
                    <span>{SUPPORTED_LANGUAGES.find((x) => x.code === l)?.nativeName ?? l}</span>
                    <span className="flex gap-3">
                      <button type="button" onClick={() => handleExport('html', l)} className="underline">Printable page</button>
                      <button type="button" onClick={() => handleExport('txt', l)} className="underline">Text</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
