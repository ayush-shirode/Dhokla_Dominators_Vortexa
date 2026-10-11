'use client';

import { useApp } from '@/context/AppContext';
import React from 'react';
import { ShieldCheck } from 'lucide-react';

export type CloudFeature = 'photo' | 'translate' | 'cloudAssist';
export type ConsentAnswer = 'once' | 'always' | 'no';

/** What each cloud feature sends (FRONTEND_SPEC §9), as catalog keys. */
export const CLOUD_FEATURE_INFO: Record<CloudFeature, { title: string; sends: string }> = {
  photo: { title: 'consent.photoTitle', sends: 'consent.photoSends' },
  translate: { title: 'consent.translateTitle', sends: 'consent.translateSends' },
  cloudAssist: { title: 'consent.assistTitle', sends: 'consent.assistSends' },
};

export function ConsentDialog({ feature, onAnswer }: { feature: CloudFeature; onAnswer: (a: ConsentAnswer) => void }) {
  const { t } = useApp();
  const info = CLOUD_FEATURE_INFO[feature];
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 p-5 space-y-4 shadow-lg">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 id="consent-title" className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {t(info.title)}
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{t(info.sends)}</p>
            <p className="text-[11px] text-stone-500">{t('consent.theResultIsAlwaysA')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <button type="button" onClick={() => onAnswer('once')} className="min-h-12 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded">
            
            {t('common.sendOnce')}
          </button>
          <button type="button" onClick={() => onAnswer('always')} className="min-h-12 px-4 py-2.5 border border-teal-700 text-teal-800 dark:text-teal-300 text-sm font-semibold rounded">
            
            {t('consent.alwaysAllowChangeInSettings')}
          </button>
          <button type="button" onClick={() => onAnswer('no')} className="min-h-12 px-4 py-2.5 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium rounded">
            
            {t('consent.noILlDoIt')}
          </button>
        </div>
      </div>
    </div>
  );
}
