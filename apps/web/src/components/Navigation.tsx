'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

export function Header() {
  const { isOnline, syncStatus, syncNow, isSpeaking, stopSpeaking } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-stone-50/95 dark:bg-stone-900/95 border-b border-stone-200 dark:border-stone-800 backdrop-blur">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-teal-700 text-amber-50 flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            RS
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-tight">
              RationSaathi
            </h1>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 -mt-0.5 font-medium">
              राशनसाथी &bull; Entitlement Helper
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* TTS Active Indicator */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse"
              title="Stop audio reading"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop audio</span>
            </button>
          )}

          {/* Sync & Connectivity Indicator */}
          <button
            onClick={() => syncNow()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition-colors"
            title="Sync status"
          >
            {isOnline ? (
              syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span className="hidden sm:inline">Syncing...</span>
                </>
              ) : syncStatus === 'synced' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden sm:inline">Backed up</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Saved on phone</span>
                </>
              )
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden sm:inline">Saved on phone (offline)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/channels', label: 'Helplines', icon: BookOpen },
    { href: '/help', label: 'Help', icon: HelpCircle },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 pb-safe">
      <div className="max-w-4xl mx-auto flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span>{item.label}</span>
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
  const steps = [
    { num: 1, label: '1 Rule', href: checkId ? `/check/${checkId}` : '#' },
    { num: 2, label: '2 Records', href: checkId ? `/check/${checkId}` : '#' },
    { num: 3, label: '3 Report', href: checkId ? `/check/${checkId}/report` : '#' },
    { num: 4, label: '4 Grievance', href: checkId ? `/check/${checkId}/grievance` : '#' },
  ];

  return (
    <div className="bg-stone-100 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 py-2 px-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
        {steps.map((st) => {
          const isCurrent = st.num === activeStep;
          const isDone = st.num < activeStep;
          return (
            <Link
              key={st.num}
              href={st.href}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                isCurrent
                  ? 'bg-teal-700 text-white font-medium shadow-xs'
                  : isDone
                  ? 'text-teal-800 dark:text-teal-400 font-medium'
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

export function ListenButton({ text, label = 'Listen' }: { text: string; label?: string }) {
  const { speak } = useApp();
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className="inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-400 hover:text-teal-800 hover:underline font-medium p-1 rounded transition-colors"
      title="Listen to this section"
    >
      <Volume2 className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
