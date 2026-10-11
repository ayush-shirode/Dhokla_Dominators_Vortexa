'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LanguageCode } from '@repo/shared';
import { useApp } from '@/context/AppContext';
import {
  Volume2,
  VolumeX,
  Cloud,
  CloudOff,
  RefreshCw,
  Home,
  HelpCircle,
  Settings,
  BookOpen,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export function Header() {
  const { isOnline, syncStatus, syncNow, isSpeaking, stopSpeaking, syncNotice, dismissSyncNotice, t, lang } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-[#fbf9f4]/95 dark:bg-[#141716]/95 border-b border-[#eee7db] dark:border-stone-800 backdrop-blur">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          {/* Logo with Green Sprout Icon matching Reference Design */}
          <div className="w-9 h-9 rounded-xl bg-[#244b38] text-white flex items-center justify-center font-bold shadow-xs">
            <span className="text-lg">🌾</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100 tracking-tight">
                Ration<span className="text-[#c07b17]">Saathi</span>
              </span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium tracking-wide">
              Sahi Ration &bull; Sabka Adhikar
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          {/* Audio Stop Button */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse"
              title="Stop audio reading"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>{t('actions.stopAudio')}</span>
            </button>
          )}

          {/* Sync Pill */}
          <button
            onClick={() => syncNow()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 text-stone-700 dark:text-stone-300 shadow-2xs hover:bg-stone-50 transition-colors"
            title="Sync status"
          >
            {isOnline ? (
              syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#244b38]" />
                  <span>{t('sync.syncing')}</span>
                </>
              ) : syncStatus === 'synced' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-[#244b38]" />
                  <span>{t('sync.synced')}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('sync.pending')}</span>
                </>
              )
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-stone-400" />
                <span>{t('sync.offline')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {syncNotice && (
        <div role="status" aria-live="polite" className="border-t border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40">
          <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200">
            <span>{syncNotice}</span>
            <button type="button" onClick={dismissSyncNotice} className="font-semibold underline shrink-0">
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
  const { t } = useApp();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/channels', label: 'Helplines', icon: BookOpen },
    { href: '/help', label: 'AI Assistant', icon: Sparkles },
    { href: '/settings', label: 'More', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#ffffff]/98 dark:bg-[#141716]/98 border-t border-[#eee7db] dark:border-stone-800 pb-safe shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-semibold transition-all ${
                isActive
                  ? 'text-[#244b38] dark:text-emerald-400 font-bold scale-105'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-[#244b38]/10 dark:bg-emerald-500/10' : ''}`}>
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
}: {
  activeStep: 1 | 2 | 3 | 4;
  checkId: string;
}) {
  const { t } = useApp();
  const steps = [
    { num: 1, label: '1 Rule', href: checkId ? `/check/${checkId}` : '#' },
    { num: 2, label: '2 Records', href: checkId ? `/check/${checkId}` : '#' },
    { num: 3, label: '3 Report', href: checkId ? `/check/${checkId}/report` : '#' },
    { num: 4, label: '4 Grievance', href: checkId ? `/check/${checkId}/grievance` : '#' },
  ];

  return (
    <div className="bg-[#f3eee3] dark:bg-stone-900 border-b border-[#eee7db] dark:border-stone-800 py-2.5 px-3">
      <div className="max-w-md mx-auto flex items-center justify-between text-xs">
        {steps.map((st) => {
          const isCurrent = st.num === activeStep;
          const isDone = st.num < activeStep;
          return (
            <Link
              key={st.num}
              href={st.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isCurrent
                  ? 'bg-[#244b38] text-white shadow-xs'
                  : isDone
                  ? 'text-[#244b38] dark:text-emerald-400 font-semibold bg-white dark:bg-stone-800 border border-[#eee7db] dark:border-stone-700'
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
      className="inline-flex items-center gap-1 text-xs text-[#244b38] dark:text-emerald-400 hover:text-[#1b3a2b] hover:underline font-semibold p-1 rounded transition-colors"
      title="Listen to this section"
    >
      <Volume2 className="w-3.5 h-3.5" />
      <span>{label && label !== 'Listen' ? label : t('actions.listen')}</span>
    </button>
  );
}
