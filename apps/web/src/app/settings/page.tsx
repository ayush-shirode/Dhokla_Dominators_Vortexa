'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export default function SettingsPage() {
  const { lang, setLang, aiConsent, setAiConsent, speak } = useApp();
  const [clearing, setClearing] = useState(false);
  const [exportJson, setExportJson] = useState<string | null>(null);

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

  const handleDeleteEverything = async () => {
    const confirm1 = window.confirm(
      'Delete everything? This removes all households, months, records, photos and reports from this phone AND from the backup server. It cannot be undone.',
    );
    if (!confirm1) return;
    const confirm2 = window.confirm('Second confirmation: delete all RationSaathi data now?');
    if (!confirm2) return;

    setClearing(true);
    try {
      // Remember the device token so the server copy can still be erased if we are offline now.
      const creds = await getDeviceCredentials();
      if (creds && !creds.token.startsWith('offline-')) localStorage.setItem('rs_pending_wipe_token', creds.token);

      let serverDeleted = false;
      try {
        await api.devices.deleteAll();
        serverDeleted = true;
        localStorage.removeItem('rs_pending_wipe_token');
      } catch (err) {
        // 401: the server has nothing for this device any more.
        if ((err as { code?: string })?.code === 'UNAUTHORIZED') {
          serverDeleted = true;
          localStorage.removeItem('rs_pending_wipe_token');
        }
      }

      await clearAllLocalData();
      forgetDeviceToken();
      alert(
        serverDeleted
          ? 'All data was deleted from this phone and from the server.'
          : 'All data was deleted from this phone. The server copy will be deleted automatically the next time you are online.',
      );
      window.location.href = '/';
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Settings &amp; Data Privacy
            </h2>
            <p className="text-xs text-stone-500">
              Language preference, AI permissions, data export, and device wipe.
            </p>
          </div>
          <ListenButton
            text="Settings page. Select your language, manage AI permissions, or export and delete your data."
            label="Listen"
          />
        </div>

        {/* 1. Language Picker */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              App Language
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`p-2.5 rounded border text-left flex items-center justify-between transition-colors ${
                  lang === l.code
                    ? 'bg-teal-50 dark:bg-teal-950 border-teal-700 dark:border-teal-600 ring-1 ring-teal-700'
                    : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 hover:border-stone-400'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{l.nativeName}</span>
                  <span className="text-[10px] text-stone-500">{l.name}</span>
                </div>
                {lang === l.code && <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* 2. AI Features & Consent */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              Cloud AI Consent (Default Off)
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            By default, all calculations, SMS extraction, and rules run 100% locally on your phone. You can enable optional cloud AI assistance below:
          </p>

          <div className="space-y-3 pt-1">
            <label className="flex items-start justify-between gap-3 p-2.5 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold block">Read photos with cloud OCR</span>
                <span className="text-[11px] text-stone-500 block leading-tight">
                  Sends masked photos (ID numbers blacked out) for high-accuracy OCR.
                </span>
              </div>
              <input
                type="checkbox"
                checked={aiConsent.photo}
                onChange={(e) => setAiConsent({ ...aiConsent, photo: e.target.checked })}
                className="mt-1 rounded text-teal-600"
              />
            </label>

            <label className="flex items-start justify-between gap-3 p-2.5 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold block">Translate reports with AI</span>
                <span className="text-[11px] text-stone-500 block leading-tight">
                  Translates verified reports to regional languages with back-translation.
                </span>
              </div>
              <input
                type="checkbox"
                checked={aiConsent.translate}
                onChange={(e) => setAiConsent({ ...aiConsent, translate: e.target.checked })}
                className="mt-1 rounded text-teal-600"
              />
            </label>

            <label className="flex items-start justify-between gap-3 p-2.5 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold block">Smarter voice &amp; chat answers</span>
                <span className="text-[11px] text-stone-500 block leading-tight">
                  Sends question text to cloud LLM for broader NFSA procedural assistance.
                </span>
              </div>
              <input
                type="checkbox"
                checked={aiConsent.cloudAssist}
                onChange={(e) => setAiConsent({ ...aiConsent, cloudAssist: e.target.checked })}
                className="mt-1 rounded text-teal-600"
              />
            </label>
          </div>
        </div>

        {/* 3. Data Export & Wiping */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              Data Management &amp; Deletion
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportData}
              className="w-full sm:w-auto px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-800 dark:text-stone-200 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export my data (JSON)</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteEverything}
              disabled={clearing}
              className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-amber-100 text-amber-800 border border-stone-300 dark:border-stone-700 hover:border-amber-300 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete everything</span>
            </button>
          </div>
        </div>

        {/* 4. About & Legal Disclaimer */}
        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 text-xs text-stone-600 dark:text-stone-400 space-y-2">
          <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-200">
            <Info className="w-4 h-4 text-teal-700" />
            <span>About RationSaathi</span>
          </div>
          <p>
            RationSaathi is an open, evidence-linked ration entitlement companion. It operates under deterministic rules specified by the National Food Security Act 2013 (NFSA).
          </p>
          <p className="italic text-[11px] text-stone-500 pt-1 border-t border-stone-200 dark:border-stone-800">
            <strong>Important legal notice:</strong> RationSaathi is an informational helper and not legal advice. It never automatically files complaints on your behalf.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
