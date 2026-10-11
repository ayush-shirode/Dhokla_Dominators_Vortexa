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
import {
  Plus,
  ChevronRight,
  Calendar,
  Users,
  ShieldCheck,
  Sparkles,
  Trash2,
  FileText,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

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
  const primaryHh = households[0];

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* User Greeting & Header Card Matching Reference Mockup */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-stone-500">Namaste,</span>
              <h2 className="text-lg font-extrabold text-[#1c3d2e] dark:text-stone-100">
                {primaryHh ? primaryHh.label : 'Ration Beneficiary'}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#edf7f2] dark:bg-stone-800 text-[#244b38] dark:text-emerald-400 flex items-center justify-center font-bold text-lg shadow-2xs">
              🌾
            </div>
          </div>

          {/* Quick Ration Card & Entitlement Summary Tile */}
          {primaryHh ? (
            <div className="bg-[#f7f5ed] dark:bg-stone-950 border border-[#e5decb] dark:border-stone-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Ration Card No</span>
                  <span className="font-mono text-xs font-bold text-stone-800 dark:text-stone-200">
                    {primaryHh.rationCardNo || 'Not entered in settings'}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#244b38]/10 text-[#244b38] border border-[#244b38]/20">
                  {primaryHh.cardType} &bull; {primaryHh.members} members
                </span>
              </div>

              {/* Verified Entitlement Strip */}
              <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-[#eee7db] dark:border-stone-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#244b38] dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Your Monthly Entitlement</span>
                  </div>
                  <div className="font-mono text-sm font-extrabold text-stone-900 dark:text-stone-100">
                    {computeEntitlement(primaryHh).formula}
                  </div>
                </div>
                <Link
                  href={`/household/${primaryHh.id}/edit`}
                  className="text-[11px] font-bold text-[#244b38] hover:underline"
                >
                  View details &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#f7f5ed] rounded-2xl text-center space-y-2">
              <p className="text-xs text-stone-600 font-medium">Set up your ration card to start verifying entitlement.</p>
              <Link
                href="/household/new"
                className="inline-block px-4 py-2 bg-[#244b38] text-white text-xs font-bold rounded-xl"
              >
                + Set up household
              </Link>
            </div>
          )}

          {/* 4 Feature Action Tiles Matching Mockup Screen 4 */}
          {primaryHh && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                href={`/household/${primaryHh.id}/edit`}
                className="p-3.5 rounded-2xl bg-[#fbf9f4] hover:bg-[#f3eee3] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 transition-all flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-[#244b38]/10 text-[#244b38] flex items-center justify-center font-bold mb-2">
                  📋
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">My Ration Card</div>
                  <div className="text-[10px] text-stone-500">View household details</div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => handleCreateCheck(primaryHh.id)}
                className="p-3.5 rounded-2xl bg-[#fbf9f4] hover:bg-[#f3eee3] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 text-left transition-all flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-[#c07b17]/10 text-[#c07b17] flex items-center justify-center font-bold mb-2">
                  📦
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">Monthly Records</div>
                  <div className="text-[10px] text-stone-500">Check month history</div>
                </div>
              </button>

              <Link
                href="/channels"
                className="p-3.5 rounded-2xl bg-[#fbf9f4] hover:bg-[#f3eee3] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 transition-all flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-bold mb-2">
                  📢
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">Grievance Portal</div>
                  <div className="text-[10px] text-stone-500">Helplines &amp; status</div>
                </div>
              </Link>

              <Link
                href="/help"
                className="p-3.5 rounded-2xl bg-[#fbf9f4] hover:bg-[#f3eee3] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 transition-all flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-[#244b38]/10 text-[#244b38] flex items-center justify-center font-bold mb-2">
                  🤖
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">AI Assistant</div>
                  <div className="text-[10px] text-stone-500">Rules &amp; help</div>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        {primaryHh && (
          <button
            onClick={() => handleCreateCheck(primaryHh.id)}
            className="w-full py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-sm rounded-2xl shadow-warm-md flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Calendar className="w-4 h-4" />
            <span>Check Current Month Ledger</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {/* Example Data Banner */}
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span>Need a demonstration?</span>
          {hasExample ? (
            <button
              onClick={handleClearExample}
              className="text-amber-800 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear example data</span>
            </button>
          ) : (
            <button
              onClick={handleTryExample}
              className="text-[#244b38] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Try with example data</span>
            </button>
          )}
        </div>

        {/* Checks Ledger History List */}
        {households.length > 0 && (
          <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1c3d2e] dark:text-stone-200">
                Monthly Checks History
              </h3>
              <span className="text-[10px] text-stone-400 font-mono">
                {checks.length} months
              </span>
            </div>

            {checks.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center italic">
                No monthly checks logged yet. Tap &ldquo;Check Current Month&rdquo; above to begin.
              </p>
            ) : (
              <div className="divide-y divide-[#eee7db] dark:divide-stone-800">
                {checks
                  .sort((a, b) => b.period.localeCompare(a.period))
                  .map((chk) => (
                    <Link
                      key={chk.id}
                      href={`/check/${chk.id}`}
                      className="py-3 px-1 flex items-center justify-between hover:bg-[#fbf9f4] dark:hover:bg-stone-800/50 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#244b38]/10 text-[#244b38] font-bold text-xs flex items-center justify-center font-mono">
                          📅
                        </div>
                        <div>
                          <div className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                            {chk.period}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            {chk.status === 'filed' ? 'Complaint filed with official portal' : chk.status === 'reported' ? 'Audit report generated' : 'Ledger entries open'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                            chk.status === 'filed'
                              ? 'bg-[#edf7f2] text-[#166534] border-[#bbf7d0]'
                              : chk.status === 'reported'
                              ? 'bg-[#fefce8] text-[#854d0e] border-[#fef08a]'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {chk.status === 'filed' ? 'Filed ✓' : chk.status === 'reported' ? 'Report Ready' : 'Open'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#244b38]" />
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
