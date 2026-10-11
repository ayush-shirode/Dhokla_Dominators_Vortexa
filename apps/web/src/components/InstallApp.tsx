'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, MoreVertical, PlusSquare, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { dismissInstall, installDismissedRecently, promptInstall, useInstallMode } from '@/lib/install';

/**
 * Offers to install RationSaathi on the phone's home screen.
 *  - variant "banner": dismissible card for the welcome/home screens (hidden for 14 days after "Not now")
 *  - variant "panel":  always shown (Settings)
 * Renders nothing when the app is already installed or on desktop browsers.
 */
export function InstallApp({ variant = 'banner' }: { variant?: 'banner' | 'panel' }) {
  const { t } = useApp();
  const mode = useInstallMode();
  const [hidden, setHidden] = useState(true);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    setHidden(variant === 'banner' && installDismissedRecently());
  }, [variant]);

  if (mode === 'none' || hidden) return null;

  if (mode === 'installed') {
    return variant === 'panel' ? (
      <p className="text-xs text-[#166534] bg-[#edf7f2] border border-[#bbf7d0] rounded-xl p-3">{t('install.installed')}</p>
    ) : null;
  }

  const install = async () => {
    if (mode === 'prompt') {
      await promptInstall();
    } else {
      setShowSteps((v) => !v);
    }
  };

  return (
    <div className="relative bg-white dark:bg-[#202622] border border-[#bbf7d0] dark:border-emerald-900 rounded-2xl p-4 shadow-subtle space-y-3">
      {variant === 'banner' && (
        <button
          type="button"
          onClick={() => {
            dismissInstall();
            setHidden(true);
          }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"
          aria-label={t('install.notNow')}
          title={t('install.notNow')}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-start gap-3 pr-6">
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
        <div>
          <p className="text-sm font-bold text-[#1c3d2e] dark:text-stone-100">{t('install.title')}</p>
          <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">{t('install.body')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={install}
        className="w-full min-h-[46px] bg-[#244b38] hover:bg-[#1b3a2b] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        <span>{t('install.button')}</span>
      </button>
      {showSteps && mode === 'ios' && (
        <ol className="text-[11px] text-stone-700 dark:text-stone-300 space-y-1.5 list-decimal list-inside">
          <li className="inline-flex items-center gap-1.5 w-full">
            <span>{t('install.ios1')}</span> <Share className="w-3.5 h-3.5" />
          </li>
          <li className="inline-flex items-center gap-1.5 w-full">
            <span>{t('install.ios2')}</span> <PlusSquare className="w-3.5 h-3.5" />
          </li>
          <li>{t('install.ios3')}</li>
        </ol>
      )}
      {showSteps && mode === 'manual' && (
        <ol className="text-[11px] text-stone-700 dark:text-stone-300 space-y-1.5 list-decimal list-inside">
          <li className="inline-flex items-center gap-1.5 w-full">
            <span>{t('install.android1')}</span> <MoreVertical className="w-3.5 h-3.5" />
          </li>
          <li>{t('install.android2')}</li>
          <li>{t('install.android3')}</li>
        </ol>
      )}
    </div>
  );
}
