'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { useApp } from '@/context/AppContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@repo/shared';
import { clearAllLocalData, getDb, getDeviceCredentials } from '@/lib/db';
import { api, forgetDeviceToken } from '@/lib/api';
import {
  Globe,
  Shield,
  Download,
  Trash2,
  Volume2,
  Info,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  WifiOff,
  PhoneCall,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { lang, setLang, aiConsent, setAiConsent, speak } = useApp();
  const [clearing, setClearing] = useState(false);
  const [exportJson, setExportJson] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<'main' | 'language' | 'privacy' | 'about'>('main');

  const currentLangName = SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.name || 'English';

  const handleExportData = async () => {
    const db = await getDb();
    const data = {
      households: await db.getAll('households'),
      checks: await db.getAll('checks'),
      records: await db.getAll('records'),
      reports: await db.getAll('reports'),
      filings: await db.getAll('filings'),
      exportedAt: new Date().toISOString(),
    };
    const str = JSON.stringify(data, null, 2);
    setExportJson(str);

    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rationsaathi-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Double confirmation on "Delete everything"
  const handleDeleteEverything = async () => {
    const confirm1 = window.confirm(
      'Delete everything? This removes all ration cards, monthly checks, slips, and audit reports from this phone. It cannot be undone.',
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      'Second confirmation: Are you sure you want to permanently erase all RationSaathi data now?',
    );
    if (!confirm2) return;

    setClearing(true);
    try {
      const creds = await getDeviceCredentials();
      if (creds && !creds.token.startsWith('offline-')) localStorage.setItem('rs_pending_wipe_token', creds.token);

      let serverDeleted = false;
      try {
        await api.devices.deleteAll();
        serverDeleted = true;
        localStorage.removeItem('rs_pending_wipe_token');
      } catch (err) {
        if ((err as { code?: string })?.code === 'UNAUTHORIZED') {
          serverDeleted = true;
          localStorage.removeItem('rs_pending_wipe_token');
        }
      }

      await clearAllLocalData();
      forgetDeviceToken();
      localStorage.removeItem('rs_onboarding_completed');
      alert(
        serverDeleted
          ? 'All data was erased from this phone and from the server backup.'
          : 'All data was erased from this phone.',
      );
      window.location.href = '/onboarding';
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeSection !== 'main') {
                  setActiveSection('main');
                } else {
                  router.back();
                }
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            </button>
            <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
              {activeSection === 'language'
                ? 'Choose Language'
                : activeSection === 'privacy'
                ? 'Privacy & Cloud Consent'
                : activeSection === 'about'
                ? 'About RationSaathi'
                : 'Settings'}
            </h2>
          </div>
          <ListenButton
            text="Settings. Change language, manage offline data, view state helpline directory, or configure cloud AI permissions."
            label="Listen"
          />
        </div>

        {/* SECTION: MAIN LIST */}
        {activeSection === 'main' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-2 shadow-warm divide-y divide-[#eee7db] dark:divide-stone-800">
              {/* Language item */}
              <button
                type="button"
                onClick={() => setActiveSection('language')}
                className="w-full min-h-[56px] p-4 flex items-center justify-between hover:bg-[#fbf9f4] rounded-2xl transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#edf7f2] text-[#244b38] flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      Language
                    </span>
                    <span className="text-[10px] text-stone-400">App display language</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
                  <span>{currentLangName}</span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </button>

              {/* State Helplines Link */}
              <Link
                href="/channels"
                className="w-full min-h-[56px] p-4 flex items-center justify-between hover:bg-[#fbf9f4] rounded-2xl transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-blue-700 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      State Helplines &amp; Portals
                    </span>
                    <span className="text-[10px] text-stone-400">Official toll-free phone directory</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </Link>

              {/* Privacy & Cloud Consent item */}
              <button
                type="button"
                onClick={() => setActiveSection('privacy')}
                className="w-full min-h-[56px] p-4 flex items-center justify-between hover:bg-[#fbf9f4] rounded-2xl transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#edf7f2] text-[#244b38] flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      Privacy &amp; Cloud Permissions
                    </span>
                    <span className="text-[10px] text-stone-400">Offline guarantees &amp; AI consent</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* About item */}
              <button
                type="button"
                onClick={() => setActiveSection('about')}
                className="w-full min-h-[56px] p-4 flex items-center justify-between hover:bg-[#fbf9f4] rounded-2xl transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ffedd5] text-[#c2410c] flex items-center justify-center">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      About RationSaathi
                    </span>
                    <span className="text-[10px] text-stone-400">Version 1.0.0 &bull; NFSA</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* Offline indicator */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      Offline Storage
                    </span>
                    <span className="text-[10px] text-stone-400">IndexedDB local database</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#edf7f2] text-[#166534] border border-[#bbf7d0]">
                  Saved on this phone
                </span>
              </div>
            </div>

            {/* Data Management Card: Export and Double Confirmation Delete */}
            <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-3">
              <span className="text-xs font-extrabold text-[#1c3d2e] dark:text-stone-100 block">
                Data Management
              </span>
              <p className="text-xs text-stone-500 leading-relaxed">
                Export your offline logs as JSON anytime, or permanently erase all data from this phone.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex-1 min-h-[48px] px-3 bg-[#fbf9f4] hover:bg-[#f3eee3] text-[#1c3d2e] border border-[#eee7db] rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#244b38]"
                >
                  <Download className="w-4 h-4 text-[#244b38]" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteEverything}
                  disabled={clearing}
                  className="flex-1 min-h-[48px] px-3 bg-[#fef2f2] hover:bg-[#fee2e2] text-rose-800 border border-rose-200 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete everything</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: LANGUAGE PICKER */}
        {activeSection === 'language' && (
          <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
            <p className="text-xs text-stone-500">
              Select your preferred language. All screen text, receipts and audio readings will adapt.
            </p>
            <div className="space-y-2">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    setActiveSection('main');
                  }}
                  className={`w-full min-h-[52px] p-3.5 rounded-2xl border flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
                    lang === l.code
                      ? 'bg-[#edf7f2] border-[#bbf7d0] ring-2 ring-[#244b38]'
                      : 'bg-[#fbf9f4] border-[#eee7db] hover:bg-[#f3eee3]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        lang === l.code
                          ? 'border-[#244b38] bg-[#244b38]'
                          : 'border-stone-300'
                      }`}
                    >
                      {lang === l.code && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="text-left">
                      <span className="text-xs font-bold text-stone-900 block">
                        {l.nativeName}
                      </span>
                      <span className="text-[10px] text-stone-400">{l.name}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: PRIVACY & CLOUD PERMISSIONS */}
        {activeSection === 'privacy' && (
          <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
            <p className="text-xs text-stone-500 leading-relaxed">
              By default, all calculations and arithmetic run 100% locally on your phone. Optional cloud AI assistance can be enabled below with your explicit permission:
            </p>

            <div className="space-y-3">
              <label className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[#fbf9f4] border border-[#eee7db] cursor-pointer min-h-[52px]">
                <div>
                  <span className="text-xs font-bold block text-stone-900">
                    Read photos with cloud OCR
                  </span>
                  <span className="text-[11px] text-stone-500 block leading-tight mt-0.5">
                    Sends masked photos (ID numbers blacked out) for high-accuracy text extraction.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={aiConsent.photo}
                  onChange={(e) => setAiConsent({ ...aiConsent, photo: e.target.checked })}
                  className="w-4 h-4 mt-1 rounded text-[#244b38]"
                />
              </label>

              <label className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[#fbf9f4] border border-[#eee7db] cursor-pointer min-h-[52px]">
                <div>
                  <span className="text-xs font-bold block text-stone-900">
                    Translate reports with cloud assistance
                  </span>
                  <span className="text-[11px] text-stone-500 block leading-tight mt-0.5">
                    Translates verified reports to regional languages.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={aiConsent.translate}
                  onChange={(e) => setAiConsent({ ...aiConsent, translate: e.target.checked })}
                  className="w-4 h-4 mt-1 rounded text-[#244b38]"
                />
              </label>

              <label className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[#fbf9f4] border border-[#eee7db] cursor-pointer min-h-[52px]">
                <div>
                  <span className="text-xs font-bold block text-stone-900">
                    Smarter procedural answers in Help
                  </span>
                  <span className="text-[11px] text-stone-500 block leading-tight mt-0.5">
                    Sends question text to cloud model for broader NFSA procedural assistance.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={aiConsent.cloudAssist}
                  onChange={(e) => setAiConsent({ ...aiConsent, cloudAssist: e.target.checked })}
                  className="w-4 h-4 mt-1 rounded text-[#244b38]"
                />
              </label>
            </div>
          </div>
        )}

        {/* SECTION: ABOUT */}
        {activeSection === 'about' && (
          <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-6 shadow-warm text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#edf7f2] text-[#244b38] flex items-center justify-center font-bold text-3xl mx-auto shadow-2xs">
              🌾
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
                RationSaathi
              </h3>
              <p className="text-xs text-[#c07b17] font-bold">Version 1.0.0</p>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed text-left pt-2 border-t border-[#eee7db]">
              RationSaathi is an open, evidence-linked ration entitlement companion. It operates under deterministic rules specified by the National Food Security Act, 2013 (NFSA).
            </p>

            <div className="p-3 bg-[#fbf9f4] rounded-2xl border border-[#eee7db] text-left text-[11px] text-stone-500 space-y-1">
              <p className="font-bold text-stone-700">Important Notice:</p>
              <p>
                RationSaathi provides informational assistance only. It never automatically submits complaints on your behalf.
              </p>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
