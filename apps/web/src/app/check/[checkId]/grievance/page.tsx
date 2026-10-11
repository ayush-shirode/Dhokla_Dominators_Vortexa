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
  getLocalFiling,
  saveLocalFiling,
  deleteLocalFiling,
  saveLocalCheck,
} from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { TranslatePanel } from '@/components/TranslatePanel';
import {
  Filing,
  buildReportSnapshot,
  generateGrievanceDescription,
  checkNeutrality,
  stateName,
  type LanguageCode,
  GRIEVANCE_CATEGORY,
} from '@repo/shared';
import { api } from '@/lib/api';
import type { LocalCheck, LocalHousehold, LocalRecord } from '@/lib/localTypes';
import {
  Copy,
  ExternalLink,
  Volume2,
  Trash2,
  Info,
  Edit2,
  ShieldAlert,
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
  /** Language of the description (changes after a confirmed translation). */
  const [descriptionLang, setDescriptionLang] = useState<LanguageCode>('en');
  const [languageAdvice, setLanguageAdvice] = useState<string | null>(null);
  /** True once a translated / edited description came from the server: never overwrite it. */
  const serverDescription = React.useRef(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [readBackDone, setReadBackDone] = useState(false);
  const [hasSelfRead, setHasSelfRead] = useState(false);

  const [filingRef, setFilingRef] = useState('');
  const [filingDate, setFilingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditingFiling, setIsEditingFiling] = useState(false);
  const [isSavingFiling, setIsSavingFiling] = useState(false);
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
          serverDescription.current = true;
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
              // Offline-generated neutral text, unless the server holds a translated/edited one.
              if (!serverDescription.current) setDescription(generateGrievanceDescription(snapshot, 'en'));
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
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyAll = async () => {
    const allText = `State: ${stateLabel}
District: ${household.district || 'N/A'}
Ration Card Number: ${household.rationCardNo || 'N/A'}
FPS Number: ${household.fpsNo || 'N/A'}
FPS Name: ${household.fpsName || 'N/A'}
Category: ${GRIEVANCE_CATEGORY.label}
Problem Description:
${description}`;
    await copyToClipboard('all', allText);
  };

  const handlePlayReadBack = () => {
    speak(description, descriptionLang);
    setReadBackDone(true);
  };

  const handleSaveFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filingRef.trim()) return;

    setIsSavingFiling(true);
    try {
      const now = new Date().toISOString();
      let newFiling: Filing = {
        id: filing?.id || crypto.randomUUID(),
        checkId,
        reportId: null,
        referenceNumber: filingRef.trim(),
        filedDate: filingDate,
        portalUrl: portal.url,
        channelId: portal.channelId,
        createdAt: filing?.createdAt || now,
        updatedAt: now,
      };
      try {
        newFiling = await api.filing.put(checkId, {
          referenceNumber: newFiling.referenceNumber,
          filedDate: newFiling.filedDate,
          portalUrl: newFiling.portalUrl,
          channelId: newFiling.channelId,
        });
      } catch {
        // Saved locally offline
      }
      await saveLocalFiling(newFiling);
      setFiling(newFiling);
      setIsEditingFiling(false);
      await saveLocalCheck({ ...check, status: 'filed' });
      setCheck({ ...check, status: 'filed' });
    } finally {
      setIsSavingFiling(false);
    }
  };

  const handleDeleteFiling = async () => {
    if (window.confirm('Remove this filing reference?')) {
      await deleteLocalFiling(checkId);
      api.filing.delete(checkId).catch(() => {});
      setFiling(null);
      setFilingRef('');
      await saveLocalCheck({ ...check, status: 'reported' });
      setCheck({ ...check, status: 'reported' });
    }
  };

  const canOpenPortal = readBackDone || hasSelfRead;
  const neutrality = checkNeutrality(description);

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />
      <StepProgress activeStep={4} checkId={checkId} householdId={household.id} />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
              Grievance Helper
            </h2>
            {filing && (
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#edf7f2] text-[#166534] border border-[#bbf7d0]">
                Filed ✓
              </span>
            )}
          </div>
          <ListenButton
            text="Grievance helper. We cannot submit complaints for you. Copy these details and open the official portal in a new tab."
            label="Listen"
          />
        </div>

        {/* NEUTRAL BLUE NOTICE: "We cannot submit this for you" */}
        <div className="bg-[#eff6ff] dark:bg-blue-950/40 border border-[#bfdbfe] dark:border-blue-900 rounded-3xl p-4 flex items-start gap-3 text-xs text-[#1e40af] dark:text-blue-200 shadow-2xs">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold">We cannot submit this for you.</p>
            <p className="leading-relaxed text-[#1d4ed8] dark:text-blue-300">
              Official grievances require an OTP from your registered phone. RationSaathi prepares the text; you paste it securely on the government portal.
            </p>
          </div>
        </div>

        {/* Pre-filled Details Box with Copy Buttons on Every Field + "Copy All" */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100">
              Pre-filled details (ready to copy)
            </h3>
            <button
              type="button"
              onClick={handleCopyAll}
              className="min-h-[44px] text-xs text-[#244b38] dark:text-emerald-400 font-extrabold hover:underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#244b38] rounded-lg px-2"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedField === 'all' ? 'All copied ✓' : 'Copy all fields'}</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* State */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 font-extrabold block">State</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{stateLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('state', stateLabel)}
                className="min-h-[44px] px-3 py-1 bg-white dark:bg-stone-900 border border-[#eee7db] rounded-xl font-extrabold text-xs"
              >
                {copiedField === 'state' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* District */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 font-extrabold block">District</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{household.district || 'Not specified'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('district', household.district || '')}
                className="min-h-[44px] px-3 py-1 bg-white dark:bg-stone-900 border border-[#eee7db] rounded-xl font-extrabold text-xs"
              >
                {copiedField === 'district' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* FPS Shop */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 font-extrabold block">FPS / Shop Number</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{household.fpsNo || 'Not specified'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('fps', household.fpsNo || '')}
                className="min-h-[44px] px-3 py-1 bg-white dark:bg-stone-900 border border-[#eee7db] rounded-xl font-extrabold text-xs"
              >
                {copiedField === 'fps' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* Ration Card Number */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 font-extrabold block">Ration Card Number (local)</span>
                <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{household.rationCardNo || 'N/A'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('rc', household.rationCardNo || '')}
                className="min-h-[44px] px-3 py-1 bg-white dark:bg-stone-900 border border-[#eee7db] rounded-xl font-extrabold text-xs"
              >
                {copiedField === 'rc' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* Neutral Problem Description */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block">
                  Neutral Problem Description
                </label>
                <button
                  type="button"
                  onClick={() => copyToClipboard('desc', description)}
                  className="text-xs text-[#244b38] font-bold hover:underline"
                >
                  {copiedField === 'desc' ? 'Copied ✓' : 'Copy description'}
                </button>
              </div>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setReadBackDone(false);
                  setHasSelfRead(false);
                }}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-2xl focus:ring-2 focus:ring-[#244b38]"
              />
              {!neutrality.ok && (
                <p className="text-xs text-[#991b1b] p-2.5 rounded-xl bg-[#fef2f2] border border-[#fecaca] font-bold">
                  {NEUTRALITY_HINT} (Flagged: {flaggedTermsText(neutrality)})
                </p>
              )}
            </div>

            <TranslatePanel
              purpose="grievance_description"
              checkId={checkId}
              advice={languageAdvice}
              onApplied={(text, language) => {
                serverDescription.current = true;
                setDescription(text);
                setDescriptionLang(language);
                setReadBackDone(false);
                setHasSelfRead(false);
              }}
            />
          </div>
        </div>

        {/* Read-Back Safeguard & Portal Button */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100 block">
              Read-Back Safeguard (Required)
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handlePlayReadBack}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-[#244b38]/10 text-[#244b38] hover:bg-[#244b38]/20 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              >
                <Volume2 className="w-4 h-4" />
                <span>Listen to description</span>
              </button>
              <label className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer min-h-[44px] px-2">
                <input
                  type="checkbox"
                  checked={hasSelfRead}
                  onChange={(e) => setHasSelfRead(e.target.checked)}
                  className="w-4 h-4 rounded text-[#244b38]"
                />
                <span className="font-bold">I have read the description myself</span>
              </label>
            </div>
          </div>

          <a
            href={canOpenPortal ? portal.url : '#'}
            target={canOpenPortal ? '_blank' : undefined}
            rel={canOpenPortal ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (!canOpenPortal) {
                e.preventDefault();
                alert('Please listen to the description or check "I have read the description myself" before opening the portal.');
              }
            }}
            className={`w-full min-h-[52px] text-xs font-extrabold rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
              canOpenPortal
                ? 'bg-[#244b38] hover:bg-[#1b3a2b] text-white cursor-pointer'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
            }`}
          >
            <span>Open Official Portal (new tab)</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Reference-Number Recording & Filed Stamp */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100">
              Grievance Reference Number
            </h4>
            {filing && !isEditingFiling && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#edf7f2] text-[#166534] border border-[#bbf7d0]">
                Filed ✓
              </span>
            )}
          </div>

          {filing && !isEditingFiling ? (
            <div className="p-4 bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Reference Number</span>
                  <span className="font-mono text-sm font-extrabold text-stone-900 dark:text-stone-100">
                    {filing.referenceNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Filing Date</span>
                  <span className="font-mono text-xs font-bold text-stone-700">
                    {filing.filedDate}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#eee7db] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingFiling(true)}
                  className="min-h-[44px] text-xs font-bold text-[#244b38] hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFiling}
                  className="min-h-[44px] text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveFiling} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Received an SMS / acknowledgment number from the portal?
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-GRV-2025-88219"
                  value={filingRef}
                  onChange={(e) => setFilingRef(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs font-mono bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSavingFiling || !filingRef.trim()}
                  className="flex-1 min-h-[48px] py-3 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm transition-all disabled:opacity-50"
                >
                  Save Reference &amp; Mark as Filed
                </button>
                {isEditingFiling && (
                  <button
                    type="button"
                    onClick={() => setIsEditingFiling(false)}
                    className="min-h-[48px] px-4 text-xs font-bold text-stone-600 bg-stone-100 rounded-2xl"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Helplines Link */}
        <div className="text-center pt-2">
          <Link
            href="/channels"
            className="min-h-[44px] inline-flex items-center text-xs font-extrabold text-[#244b38] hover:underline"
          >
            Need state helpline phone numbers? View Helplines Directory &rarr;
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
