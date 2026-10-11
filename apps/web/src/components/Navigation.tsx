'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LanguageCode } from '@repo/shared';
import { useApp } from '@/context/AppContext';
import {
  Volume2,
  VolumeX,
  RefreshCw,
  Home,
  HelpCircle,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export function Header() {
  const { isOnline, syncStatus, syncNow, isSpeaking, stopSpeaking, syncNotice, dismissSyncNotice, t } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F1]/95 dark:bg-[#181d1a]/95 border-b border-[#E8E5DD] dark:border-stone-800 backdrop-blur">
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#244b38] rounded-xl p-1">
          <div className="w-9 h-9 rounded-xl bg-[#244b38] text-white flex items-center justify-center font-bold shadow-xs">
            <span className="text-lg">🌾</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[#1c3d2e] dark:text-stone-100 tracking-tight">
                Ration<span className="text-[#c07b17]">Saathi</span>
              </span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium tracking-wide">
              Sahi Ration &bull; Sabka Adhikar
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Audio Stop Button */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="min-h-[44px] flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse focus:outline-none focus:ring-2 focus:ring-amber-600"
              title="Stop audio reading"
            >
              <VolumeX className="w-4 h-4" />
              <span>{t('actions.stopAudio')}</span>
            </button>
          )}

          {/* Offline/Saved on this phone badge */}
          <button
            onClick={() => syncNow()}
            className="min-h-[40px] flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-stone-900 border border-[#E8E5DD] dark:border-stone-800 text-stone-700 dark:text-stone-300 shadow-2xs hover:bg-stone-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            title="Data storage status"
          >
            {isOnline ? (
              syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#244b38]" />
                  <span>Syncing…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#244b38]" />
                  <span>Saved on phone</span>
                </>
              )
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                <span>Saved on phone (Offline)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {syncNotice && (
        <div role="status" aria-live="polite" className="border-t border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40">
          <div className="w-full px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200">
            <span>{syncNotice}</span>
            <button type="button" onClick={dismissSyncNotice} className="font-semibold underline shrink-0 min-h-[44px] px-2">
              {t('common.ok')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/help', label: 'Help', icon: HelpCircle },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    /* Contained to the desktop shell with max-w-md, white background, thin top border */
    <nav className="fixed bottom-0 z-40 w-full max-w-md bg-white dark:bg-[#202622] border-t border-[#E8E5DD] dark:border-stone-800 shadow-md">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] rounded-xl ${
                isActive
                  ? 'text-[#244b38] dark:text-emerald-400 font-bold'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-[#244b38]/10 dark:bg-emerald-500/15' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function StepProgress({
  activeStep,
  checkId,
  householdId,
}: {
  activeStep: 1 | 2 | 3 | 4;
  checkId: string;
  householdId?: string;
}) {
  const steps = [
    { num: 1, label: '1 Rule', href: householdId ? `/household/${householdId}/edit` : `/check/${checkId}` },
    { num: 2, label: '2 Records', href: checkId ? `/check/${checkId}` : '#' },
    { num: 3, label: '3 Report', href: checkId ? `/check/${checkId}/report` : '#' },
    { num: 4, label: '4 Grievance', href: checkId ? `/check/${checkId}/grievance` : '#' },
  ];

  return (
    <div className="bg-[#FAF8F1] dark:bg-stone-900 border-b border-[#E8E5DD] dark:border-stone-800 py-2.5 px-3">
      <div className="w-full flex items-center justify-between text-xs">
        {steps.map((st) => {
          const isCurrent = st.num === activeStep;
          const isDone = st.num < activeStep;
          return (
            <Link
              key={st.num}
              href={st.href}
              className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
                isCurrent
                  ? 'bg-[#244b38] text-white shadow-xs'
                  : isDone
                  ? 'text-[#244b38] dark:text-emerald-400 font-semibold bg-white dark:bg-stone-800 border border-[#E8E5DD] dark:border-stone-700'
                  : 'text-stone-400 dark:text-stone-500'
              }`}
            >
              <span>{st.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const LATIN_ONLY = /^[\u0000-\u024F\u2000-\u206F\u20B9\u2212\u00D7\s]*$/;

export function ListenButton({ text, label, lang }: { text: string; label?: string; lang?: LanguageCode }) {
  const { speak, t } = useApp();
  const voice = lang ?? (LATIN_ONLY.test(text) ? 'en' : undefined);
  return (
    <button
      type="button"
      onClick={() => speak(text, voice)}
      className="min-h-[44px] inline-flex items-center gap-1.5 text-xs text-[#244b38] dark:text-emerald-400 hover:text-[#1b3a2b] font-medium px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#244b38] transition-colors"
      title="Listen to this text aloud"
    >
      <Volume2 className="w-4 h-4" />
      <span>{label && label !== 'Listen' ? label : t('actions.listen')}</span>
    </button>
  );
}
