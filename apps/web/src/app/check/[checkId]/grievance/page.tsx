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
  getLocalFiling,
  saveLocalFiling,
  deleteLocalFiling,
  saveLocalCheck,
} from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { TranslatePanel } from '@/components/TranslatePanel';
import {
  Report,
  Filing,
  buildReportSnapshot,
  generateGrievanceDescription,
  checkNeutrality,
  stateName,
  type LanguageCode,
} from '@repo/shared';
import { api } from '@/lib/api';
import type { LocalCheck, LocalHousehold, LocalRecord } from '@/lib/localTypes';
import {
  Copy,
  CheckCircle2,
  ExternalLink,
  Volume2,
  Lock,
  AlertCircle,
  FileCheck2,
  Trash2,
  RotateCcw,
  Info,
} from 'lucide-react';
import { NEUTRALITY_HINT, flaggedTermsText } from '@/lib/neutrality';

export default function GrievanceHelperPage() {
  const router = useRouter();
  const checkId = useCheckId();
  const { speak } = useApp();

  const [check, setCheck] = useState<LocalCheck | null>(null);
  const [household, setHousehold] = useState<LocalHousehold | null>(null);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [filing, setFiling] = useState<Filing | null>(null);

  const [description, setDescription] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [readBackDone, setReadBackDone] = useState(false);
  const [hasSelfRead, setHasSelfRead] = useState(false);

  const [filingRef, setFilingRef] = useState('');
  const [filingDate, setFilingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingFiling, setIsSavingFiling] = useState(false);
  const [filingNote, setFilingNote] = useState<string | null>(null);
  const [languageAdvice, setLanguageAdvice] = useState<string | null>(null);
  const [descriptionLang, setDescriptionLang] = useState<string>('en');
  const [portal, setPortal] = useState<{ url: string; statusUrl: string | null; channelId: string | null }>({
    url: 'https://nfsa.gov.in/',
    statusUrl: null,
    channelId: null,
  });

  useEffect(() => {
    api.grievance
      .get(checkId)
      .then((g) => {
        setPortal({ url: g.portal.url, statusUrl: g.portal.statusUrl, channelId: g.portal.channelId });
        setLanguageAdvice(g.languageAdvice.message);
        if (g.descriptionSource !== 'generated') {
          setDescription(g.description);
          setDescriptionLang(g.descriptionLanguage);
        }
      })
      .catch(() => {});
  }, [checkId]);

  useEffect(() => {
    getLocalCheck(checkId).then((chk) => {
      setCheck(chk || null);
      if (chk) {
        getLocalHousehold(chk.householdId).then((h) => {
          setHousehold(h || null);
          if (h) {
            getLocalRecords(chk.id).then((recs) => {
              setRecords(recs);
              const snapshot = buildReportSnapshot({
                household: h,
                period: chk.period,
                records: recs,
                ruleConfirmedAt: h.ruleConfirmedAt || new Date().toISOString(),
              });
              const desc = generateGrievanceDescription(snapshot, 'en');
              setDescription(desc);
            });
          }
        });
        getLocalFiling(chk.id).then((f) => {
          if (f) {
            setFiling(f);
            setFilingRef(f.referenceNumber);
            setFilingDate(f.filedDate);
          }
        });
      }
    });
  }, [checkId]);

  if (!check || !household) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] flex items-center justify-center text-xs font-mono">
        Loading grievance helper...
      </div>
    );
  }

  const stateLabel = stateName(household.stateCode) ?? household.stateCode ?? '';

  const copyToClipboard = async (fieldName: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = async () => {
    const allText = `State: ${stateLabel}
District: ${household.district || 'N/A'}
Ration Card Number: ${household.rationCardNo || 'N/A'}
FPS Number: ${household.fpsNo || 'N/A'}
FPS Name: ${household.fpsName || 'N/A'}
Category: Not getting NFSA quantity
Description:
${description}`;
    await copyToClipboard('all', allText);
  };

  const handlePlayReadBack = () => {
    speak(description, descriptionLang as LanguageCode);
    setReadBackDone(true);
  };

  const handleSaveFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filingRef.trim()) return;

    setIsSavingFiling(true);
    try {
      const now = new Date().toISOString();
      let newFiling: Filing = {
        id: crypto.randomUUID(),
        checkId,
        reportId: null,
        referenceNumber: filingRef.trim(),
        filedDate: filingDate,
        portalUrl: portal.url,
        channelId: portal.channelId,
        createdAt: now,
        updatedAt: now,
      };
      try {
        newFiling = await api.filing.put(checkId, {
          referenceNumber: newFiling.referenceNumber,
          filedDate: newFiling.filedDate,
          portalUrl: newFiling.portalUrl,
          channelId: newFiling.channelId,
        });
        setFilingNote(null);
      } catch {
        setFilingNote('Saved locally on phone.');
      }
      await saveLocalFiling(newFiling);
      setFiling(newFiling);
      await saveLocalCheck({ ...check, status: 'filed' });
      setCheck({ ...check, status: 'filed' });
    } finally {
      setIsSavingFiling(false);
    }
  };

  const handleDeleteFiling = async () => {
    if (window.confirm('Remove filing reference?')) {
      await deleteLocalFiling(checkId);
      api.filing.delete(checkId).catch(() => {});
      setFiling(null);
      setFilingRef('');
      await saveLocalCheck({ ...check, status: 'reported' });
      setCheck({ ...check, status: 'reported' });
    }
  };

  const portalUrl = portal.url;
  const canOpenPortal = readBackDone || hasSelfRead;
  const neutrality = checkNeutrality(description);

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />
      <StepProgress activeStep={4} checkId={checkId} />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* Title Matching Screen 10: "Raise Grievance" */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800"
            >
              <ExternalLink className="w-5 h-5 rotate-180 text-stone-700 dark:text-stone-300" />
            </button>
            <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
              Raise Grievance
            </h2>
          </div>
          <ListenButton text="Raise grievance helper. Copy your pre-filled details to the official portal." label="Listen" />
        </div>

        {/* Top Info Notice (Matching Screen 10 green pill notice) */}
        <div className="bg-[#edf7f2] dark:bg-emerald-950/40 border border-[#bbf7d0] dark:border-emerald-900 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[#166534] dark:text-emerald-200 shadow-2xs">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This will open the official grievance portal in a new tab. We do not collect any login, OTP or Aadhaar details.
          </p>
        </div>

        {/* Pre-filled Details Box Matching Screen 10 */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100">
              Pre-filled details (you can edit)
            </h3>
            <button
              type="button"
              onClick={handleCopyAll}
              className="text-xs text-[#244b38] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedField === 'all' ? 'All copied ✓' : 'Copy all details'}</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* State */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block">State</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{stateLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('state', stateLabel)}
                className="px-2.5 py-1 bg-white dark:bg-stone-900 border border-[#eee7db] rounded-lg font-bold text-[11px]"
              >
                {copiedField === 'state' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* District */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block">District</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{household.district || 'Not specified'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('district', household.district || '')}
                className="px-2.5 py-1 bg-white dark:bg-stone-900 border border-[#eee7db] rounded-lg font-bold text-[11px]"
              >
                {copiedField === 'district' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* FPS Shop */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block">FPS / Shop No.</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{household.fpsNo || 'Not specified'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('fps', household.fpsNo || '')}
                className="px-2.5 py-1 bg-white dark:bg-stone-900 border border-[#eee7db] rounded-lg font-bold text-[11px]"
              >
                {copiedField === 'fps' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* Ration Card Number */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block">Ration Card No (Local only)</span>
                <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{household.rationCardNo || 'N/A'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('rc', household.rationCardNo || '')}
                className="px-2.5 py-1 bg-white dark:bg-stone-900 border border-[#eee7db] rounded-lg font-bold text-[11px]"
              >
                {copiedField === 'rc' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Problem Description
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setReadBackDone(false);
                  setHasSelfRead(false);
                }}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-[#244b38]"
              />
              {!neutrality.ok && (
                <p className="text-xs text-[#991b1b] p-2.5 rounded-xl bg-[#fef2f2] border border-[#fecaca]">
                  {NEUTRALITY_HINT} (Flagged: {flaggedTermsText(neutrality)})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Read-Back Requirement & Open Portal Button (Screen 10) */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100 block">
              Read-Back Verification
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handlePlayReadBack}
                className="w-full sm:w-auto px-4 py-2 bg-[#244b38]/10 text-[#244b38] hover:bg-[#244b38]/20 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                <span>Listen to submission</span>
              </button>
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 cursor-pointer pt-1 sm:pt-0">
                <input
                  type="checkbox"
                  checked={hasSelfRead}
                  onChange={(e) => setHasSelfRead(e.target.checked)}
                  className="rounded text-[#244b38]"
                />
                <span>I have read the description myself</span>
              </label>
            </div>
          </div>

          <a
            href={canOpenPortal ? portalUrl : '#'}
            target={canOpenPortal ? '_blank' : undefined}
            rel={canOpenPortal ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (!canOpenPortal) {
                e.preventDefault();
                alert('Please listen to the read-back or tick "I have read the description myself" first.');
              }
            }}
            className={`w-full py-4 text-xs font-extrabold rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 ${
              canOpenPortal
                ? 'bg-[#244b38] hover:bg-[#1b3a2b] text-white cursor-pointer'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
            }`}
          >
            <span>Open Grievance Portal</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-[10px] text-stone-400 text-center italic">
            This is not legal advice. Submissions require OTP on the government website.
          </p>
        </div>

        {/* Post-Filing Section */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-3">
          <h4 className="text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100">
            Received Grievance Number?
          </h4>
          <form onSubmit={handleSaveFiling} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Enter reference number (e.g. GRV-88219)"
              value={filingRef}
              onChange={(e) => setFilingRef(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl"
            />
            <button
              type="submit"
              disabled={isSavingFiling || !filingRef.trim()}
              className="w-full py-3 bg-[#244b38] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
            >
              Save Reference &amp; Mark as Filed
            </button>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
