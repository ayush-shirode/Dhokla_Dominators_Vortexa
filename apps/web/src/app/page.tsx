'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { useApp } from '@/context/AppContext';
import { getLocalHouseholds, getLocalChecks, seedExampleData, clearExampleData } from '@/lib/db';
import {
  formatKg,
  computeEntitlement,
} from '@repo/shared';
import type { LocalCheck, LocalHousehold } from '@/lib/localTypes';
import { Plus, ChevronRight, Calendar, Users, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';

export default function HomePage() {
  const { t } = useApp();
  const router = useRouter();
  const [households, setHouseholds] = useState<LocalHousehold[]>([]);
  const [checks, setChecks] = useState<LocalCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const hhList = await getLocalHouseholds();
      const chList = await getLocalChecks();
      setHouseholds(hhList);
      setChecks(chList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCheck = async (householdId: string) => {
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    // Check if check exists
    const existing = checks.find((c) => c.householdId === householdId && c.period === currentPeriod);
    if (existing) {
      router.push(`/check/${existing.id}`);
      return;
    }

    const newCheckId = crypto.randomUUID();
    const newCheck: LocalCheck = {
      id: newCheckId,
      householdId,
      period: currentPeriod,
      status: 'open',
    };
    const { saveLocalCheck } = await import('@/lib/db');
    await saveLocalCheck(newCheck);
    router.push(`/check/${newCheckId}`);
  };

  const handleTryExample = async () => {
    const { checkId } = await seedExampleData();
    await loadData();
    router.push(`/check/${checkId}`);
  };

  const handleClearExample = async () => {
    await clearExampleData();
    await loadData();
  };

  const hasExample = households.some((h) => h.id === 'example-household-1');

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-20">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full space-y-6">
        {/* Welcome & Primary CTA */}
        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Monthly Ration Ledger
              </h2>
              <ListenButton
                text="Welcome to RationSaathi. Compare your monthly ration card entitlement with actual received grain based on plain arithmetic and verified evidence."
                label="Listen"
              />
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xl leading-relaxed">
              Compare your entitlement against what you received. Every calculation is clear, line-by-line arithmetic linked to your receipts and messages.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {households.length > 0 ? (
              <button
                onClick={() => handleCreateCheck(households[0].id)}
                className="w-full sm:w-auto px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>{t('actions.checkMonth')}</span>
              </button>
            ) : (
              <Link
                href="/household/new"
                className="w-full sm:w-auto px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Set up household</span>
              </Link>
            )}
          </div>
        </div>

        {/* Empty State */}
        {!loading && households.length === 0 && (
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-400 mx-auto flex items-center justify-center font-bold text-xl">
              🌾
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Start by telling us about your ration card
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Add your card type (AAY or PHH) and member count. Your ration card number stays securely on this phone and is never sent to any server.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/household/new"
                className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs"
              >
                {t('actions.addHousehold')}
              </Link>
              <button
                onClick={handleTryExample}
                className="w-full sm:w-auto px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium text-xs rounded transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('common.exampleData')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Households and their Period Checks */}
        {households.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                Your Households &amp; Checks
              </h3>
              <div className="flex items-center gap-3">
                {hasExample ? (
                  <button
                    onClick={handleClearExample}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t('common.clearExample')}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleTryExample}
                    className="text-xs text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{t('common.exampleData')}</span>
                  </button>
                )}
                <Link
                  href="/household/new"
                  className="text-xs text-teal-700 dark:text-teal-400 font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add another household</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {households.map((h) => {
                const hhChecks = checks
                  .filter((c) => c.householdId === h.id)
                  .sort((a, b) => b.period.localeCompare(a.period));

                const { formula, kg: entitledKg } = computeEntitlement(h);
                const isExample = h.id === 'example-household-1';

                return (
                  <div
                    key={h.id}
                    className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                            {h.label}
                          </h4>
                          {isExample && (
                            <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-300">
                              Example
                            </span>
                          )}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                            {h.cardType} &bull; {h.members} members
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 font-mono">
                          Formula: {formula} ({entitledKg} kg/mo)
                        </p>
                      </div>

                      <Link
                        href={`/household/${h.id}/edit`}
                        className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium"
                      >
                        Edit Rule
                      </Link>
                    </div>

                    {/* Checks for this household */}
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                        <span>Monthly Ledger Periods</span>
                        <button
                          onClick={() => handleCreateCheck(h.id)}
                          className="text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Check current month</span>
                        </button>
                      </div>

                      {hhChecks.length === 0 ? (
                        <p className="text-xs text-stone-400 py-2 italic">
                          No months checked yet. Tap &ldquo;Check current month&rdquo; to begin.
                        </p>
                      ) : (
                        <div className="divide-y divide-dashed divide-stone-200 dark:divide-stone-800">
                          {hhChecks.map((chk) => (
                            <Link
                              key={chk.id}
                              href={`/check/${chk.id}`}
                              className="flex items-center justify-between py-2.5 px-2 hover:bg-stone-100 dark:hover:bg-stone-800/50 rounded transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold text-stone-800 dark:text-stone-200">
                                  {chk.period}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                                    chk.status === 'filed'
                                      ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300'
                                      : chk.status === 'reported'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300'
                                  }`}
                                >
                                  {chk.status === 'filed' ? 'Filed ✓' : chk.status === 'reported' ? 'Report Ready' : 'Open'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-stone-400 group-hover:text-teal-700">
                                <span>Open Ledger</span>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
