'use client';

import React, { useEffect, useState } from 'react';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { INDIAN_STATES, GrievanceChannel } from '@repo/shared';
import { Phone, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

export default function ChannelsPage() {
  const [selectedState, setSelectedState] = useState('MH');
  const [channels, setChannels] = useState<GrievanceChannel[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The directory comes from the API so every entry carries its source, last-verified date and
  // verification status (Spec §4.4). Nothing is hard-coded or marked verified on the client.
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    api.channels
      .list(selectedState)
      .then((list) => {
        if (!cancelled) setChannels(list);
      })
      .catch(() => {
        if (!cancelled) {
          setChannels([]);
          setLoadError('The channel directory could not be loaded. Connect to the internet and try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedState]);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-6 w-full space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Official Grievance Channels Directory
            </h2>
            <p className="text-xs text-stone-500">
              State portals, helplines, and DGRO redressal mechanisms under NFSA 2013.
            </p>
          </div>
          <ListenButton
            text="Grievance channel directory. Select your state to see portals and helplines, with their sources."
            label="Listen"
          />
        </div>

        {/* State Selector */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-lg border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between gap-3">
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Select Your State / UT:
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded font-medium"
          >
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Channel Cards */}
        <div className="space-y-3">
          {loadError && (
            <p className="text-xs text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 p-3 rounded border border-stone-200 dark:border-stone-800">
              {loadError}
            </p>
          )}
          {channels.map((ch) => {
            const isPhone = ch.kind === 'helpline';
            const isLink = /^https?:\/\//.test(ch.value);

            return (
              <div
                key={ch.id}
                className="bg-white dark:bg-stone-900 p-4 rounded-lg border border-stone-200 dark:border-stone-800 shadow-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 dark:text-teal-400">
                      {ch.kind.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {ch.name}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      ch.verificationStatus === 'verified'
                        ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300'
                        : 'bg-stone-100 text-stone-600 border-stone-300 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {ch.verificationStatus === 'verified' ? 'Verified ✓' : 'Unverified'}
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  {isPhone ? (
                    <a
                      href={`tel:${ch.value}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded text-xs font-semibold hover:bg-teal-800 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call {ch.value}</span>
                    </a>
                  ) : isLink ? (
                    <a
                      href={ch.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded text-xs font-semibold hover:bg-black transition-colors"
                    >
                      <span>Visit Portal ↗</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="font-mono text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {ch.value}
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-500 leading-normal">{ch.notes}</p>
                <p className="text-[11px] text-stone-400 leading-normal">
                  Accepted languages: {ch.acceptedLanguages ? ch.acceptedLanguages.join(', ') : 'unknown'} · Source: {ch.sourceNote}
                </p>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                  <span>Last verified: {ch.lastVerified || 'not verified yet'}</span>
                  {ch.sourceUrl && (
                    <a
                      href={ch.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-stone-500"
                    >
                      Official source ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Directory Disclaimer */}
        <p className="text-[11px] text-stone-500 italic p-3 bg-stone-50 dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800 leading-relaxed">
          This directory could not be fully verified. Helplines and URLs change; check numbers on your state food department&apos;s website before relying on them.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
