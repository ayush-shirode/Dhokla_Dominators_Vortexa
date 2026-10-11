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

  // Filing form fields
  const [filingRef, setFilingRef] = useState('');
  const [filingDate, setFilingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingFiling, setIsSavingFiling] = useState(false);
  const [filingNote, setFilingNote] = useState<string | null>(null);
  // Official portal from the API's sourced directory; nfsa.gov.in when offline or not yet synced.
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
        // Keep a translated or user-edited description saved on the server.
        if (g.descriptionSource !== 'generated') {
          setDescription(g.description);
          setDescriptionLang(g.descriptionLanguage);
        }
      })
      .catch(() => {
        /* offline or not synced yet: keep the default */
      });
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
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center text-xs font-mono">
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
      // Filings are not part of /sync/batch: send directly, keep a local copy either way.
      try {
        newFiling = await api.filing.put(checkId, {
          referenceNumber: newFiling.referenceNumber,
          filedDate: newFiling.filedDate,
          portalUrl: newFiling.portalUrl,
          channelId: newFiling.channelId,
        });
        setFilingNote(null);
      } catch {
        setFilingNote('Saved on this phone. It will need to be saved again when you are online.');
      }
      await saveLocalFiling(newFiling);
      setFiling(newFiling);

      // Update check status to 'filed'
      await saveLocalCheck({ ...check, status: 'filed' });
      setCheck({ ...check, status: 'filed' });
    } finally {
      setIsSavingFiling(false);
    }
  };

  const handleDeleteFiling = async () => {
    if (window.confirm('Remove filing reference?')) {
      await deleteLocalFiling(checkId);
      api.filing.delete(checkId).catch(() => {
        /* offline or never synced */
      });
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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-24">
      <Header />
      <StepProgress activeStep={4} checkId={checkId} />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-6 w-full space-y-6">
        {/* Top Notice (Mandatory per Principle P7) */}
        <div className="bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg p-4 text-xs space-y-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
            <Lock className="w-4 h-4 text-teal-700" />
            <span>Official Portal Filing Guide (No Auto-Submission)</span>
          </div>
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
            RationSaathi prepares what the official grievance form asks for. It <strong>cannot submit it</strong>. The official state portal will ask for an OTP on your Aadhaar-linked phone, which only you can give. Copy each field across and file it yourself.
          </p>
        </div>

        {/* Filed Badge Banner if already filed */}
        {filing && (
          <div className="bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5 text-sm">
                <FileCheck2 className="w-4 h-4 text-teal-700" />
                <span>Filed &bull; Ref: {filing.referenceNumber}</span>
              </span>
              <p className="text-teal-800 dark:text-teal-300">
                Filed on {filing.filedDate}. This reference is stamped on your exported report.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded shadow-xs flex items-center gap-1"
              >
                <span>Check status on portal ↗</span>
              </a>
              <button
                onClick={handleDeleteFiling}
                className="p-1.5 text-stone-400 hover:text-amber-700 rounded"
                title="Remove filing"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Copyable Fields Box */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Grievance Form Fields
            </h3>
            <button
              type="button"
              onClick={handleCopyAll}
              className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-semibold flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedField === 'all' ? 'All copied ✓' : 'Copy all fields'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {/* State */}
            <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">State</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{stateLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('state', stateLabel)}
                className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 rounded hover:bg-stone-300 text-[11px] font-medium"
              >
                {copiedField === 'state' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* District */}
            <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">District</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{household.district || 'Not specified'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('district', household.district || '')}
                className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 rounded hover:bg-stone-300 text-[11px] font-medium"
              >
                {copiedField === 'district' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* Ration Card Number - From LOCAL STORAGE ONLY */}
            <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs">
              <div>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 uppercase font-semibold block">
                  Ration Card Number (Local Storage)
                </span>
                <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                  {household.rationCardNo || 'Not entered in settings'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('rc', household.rationCardNo || '')}
                className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 rounded hover:bg-stone-300 text-[11px] font-medium"
              >
                {copiedField === 'rc' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* FPS Number & Name */}
            <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">FPS Shop</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {household.fpsNo ? `FPS No: ${household.fpsNo} ${household.fpsName ? `(${household.fpsName})` : ''}` : 'Not specified'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('fps', household.fpsNo || '')}
                className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 rounded hover:bg-stone-300 text-[11px] font-medium"
              >
                {copiedField === 'fps' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* Problem Category */}
            <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">Grievance Category</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">Not getting NFSA quantity / Shortfall</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('category', 'Not getting NFSA quantity')}
                className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 rounded hover:bg-stone-300 text-[11px] font-medium"
              >
                {copiedField === 'category' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Problem Description (Neutral language verified)
                </label>
                <button
                  type="button"
                  onClick={() => copyToClipboard('desc', description)}
                  className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 rounded hover:bg-stone-300 text-[11px] font-medium"
                >
                  {copiedField === 'desc' ? 'Copied ✓' : 'Copy description'}
                </button>
              </div>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  // The user must hear (or read) exactly what will be submitted.
                  setReadBackDone(false);
                  setHasSelfRead(false);
                }}
                className="w-full px-3 py-2 text-xs font-mono bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              {!neutrality.ok && (
                <p className="text-xs text-amber-800 dark:text-amber-300 p-2 rounded bg-amber-50 dark:bg-amber-950 border border-amber-300">
                  {NEUTRALITY_HINT} (Flagged: {flaggedTermsText(neutrality)})
                </p>
              )}
              {descriptionLang !== 'en' && (
                <p className="text-[11px] text-stone-500">Description language: {descriptionLang}</p>
              )}
            </div>

            <TranslatePanel
              purpose="grievance_description"
              checkId={checkId}
              advice={languageAdvice}
              onApplied={(text, language) => {
                setDescription(text);
                setDescriptionLang(language);
                setReadBackDone(false);
                setHasSelfRead(false);
              }}
            />
          </div>
        </div>

        {/* Read-Back before filing (MANDATORY STEP PER PRINCIPLE P7 / SECTION 4.7) */}
        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
              Mandatory Read-Back Before Submission
            </span>
            <span className="text-[11px] text-stone-500">Step required to unlock portal link</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handlePlayReadBack}
              className="w-full sm:w-auto px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded shadow-xs flex items-center justify-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen to what you will submit</span>
            </button>

            <span className="text-xs text-stone-400">or</span>

            <label className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSelfRead}
                onChange={(e) => setHasSelfRead(e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>I have read the description myself</span>
            </label>
          </div>

          {/* Open Official Portal Link Button */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
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
              className={`w-full py-3 px-4 text-xs font-semibold rounded shadow-xs flex items-center justify-center gap-2 transition-colors ${
                canOpenPortal
                  ? 'bg-stone-900 dark:bg-stone-100 hover:bg-black text-white dark:text-stone-900 cursor-pointer'
                  : 'bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <span>Open official grievance portal ↗</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-[11px] text-stone-500 text-center mt-1.5">
              Opens in a new tab. You will complete Aadhaar OTP and submission on the official government website.
            </p>
          </div>
        </div>

        {/* Post-Filing Reference Form */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            After Filing: Save Your Reference Number
          </h3>
          <p className="text-xs text-stone-500">
            Once submitted on the portal, enter the SMS reference number you received to mark this check as Filed.
          </p>

          <form onSubmit={handleSaveFiling} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Grievance Reference Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GRV-MH-2026-99102"
                  value={filingRef}
                  onChange={(e) => setFilingRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Filed Date
                </label>
                <input
                  type="date"
                  required
                  value={filingDate}
                  onChange={(e) => setFilingDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingFiling || !filingRef.trim()}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Save Reference &amp; Mark as Filed</span>
            </button>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
