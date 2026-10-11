'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { getLocalHouseholds, getLocalChecks, seedExampleData, clearExampleData } from '@/lib/db';
import { computeEntitlement } from '@repo/shared';
import type { LocalCheck, LocalHousehold } from '@/lib/localTypes';
import {
  Calendar,
  ShieldCheck,
  Sparkles,
  Trash2,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  PlusCircle,
  Check,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<LocalHousehold[]>([]);
  const [checks, setChecks] = useState<LocalCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmedNotice, setShowConfirmedNotice] = useState(false);

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
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('rs_onboarding_completed');
      if (!seen) {
        router.replace('/welcome');
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('notice') === 'rule_confirmed') {
        setShowConfirmedNotice(true);
        setTimeout(() => setShowConfirmedNotice(false), 5000);
      }
    }
    loadData();
  }, [router]);

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
        {/* Rule confirmed toast / notice */}
        {showConfirmedNotice && (
          <div className="p-3.5 bg-[#edf7f2] border border-[#bbf7d0] text-[#166534] rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Rule confirmed! You can now check monthly ledgers.</span>
            </div>
            <button
              onClick={() => setShowConfirmedNotice(false)}
              className="text-[#166534] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STATE 1: No Household exists -> One big button "Set up your ration card" */}
        {!loading && households.length === 0 && (
          <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-8 shadow-warm text-center space-y-6 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#edf7f2] text-[#244b38] flex items-center justify-center font-bold text-3xl mx-auto shadow-2xs">
              🌾
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-[#1c3d2e] dark:text-stone-100">
                Welcome to RationSaathi
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                Check your statutory monthly grain entitlement against actual shop distributions with plain arithmetic.
              </p>
            </div>

            <Link
              href="/household/new"
              className="w-full min-h-[56px] py-4 px-6 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-sm rounded-2xl shadow-warm-md flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Set up your ration card</span>
            </Link>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTryExample}
                className="min-h-[44px] text-xs font-bold text-[#c07b17] hover:underline inline-flex items-center gap-1.5 focus:outline-none"
              >
                <Sparkles className="w-4 h-4" />
                <span>Or try with example data</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: Household exists */}
        {primaryHh && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500">Namaste,</span>
                  <h2 className="text-lg font-extrabold text-[#1c3d2e] dark:text-stone-100">
                    {primaryHh.label || 'Ration Beneficiary'}
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#edf7f2] dark:bg-stone-800 text-[#244b38] dark:text-emerald-400 flex items-center justify-center font-bold text-lg shadow-2xs">
                  🌾
                </div>
              </div>

              {/* Ration card summary card */}
              <div className="bg-[#f7f5ed] dark:bg-stone-950 border border-[#e5decb] dark:border-stone-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Ration Card</span>
                    <span className="font-mono text-xs font-bold text-stone-800 dark:text-stone-200">
                      {primaryHh.rationCardNo ? `•••• •••• ${primaryHh.rationCardNo.slice(-4)}` : 'Saved locally'}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#244b38]/10 text-[#244b38] border border-[#244b38]/20">
                    {primaryHh.cardType} &bull; {primaryHh.members} members
                  </span>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-[#eee7db] dark:border-stone-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#244b38] dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Confirmed Entitlement</span>
                    </div>
                    <div className="font-mono text-sm font-extrabold text-stone-900 dark:text-stone-100">
                      {computeEntitlement(primaryHh).formula}
                    </div>
                  </div>
                  <Link
                    href={`/household/${primaryHh.id}/edit`}
                    className="min-h-[44px] flex items-center text-xs font-bold text-[#244b38] hover:underline focus:outline-none focus:ring-2 focus:ring-[#244b38] rounded-lg px-2"
                  >
                    Edit &rarr;
                  </Link>
                </div>
              </div>

              {/* Main Button: "Check a month" */}
              <button
                onClick={() => handleCreateCheck(primaryHh.id)}
                className="w-full min-h-[52px] py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-sm rounded-2xl shadow-warm-md flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              >
                <Calendar className="w-5 h-5" />
                <span>Check a month</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Checks Ledger History List */}
            <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1c3d2e] dark:text-stone-200">
                  Monthly Checks History
                </h3>
                <span className="text-[11px] text-stone-500 font-bold">
                  {checks.length} months
                </span>
              </div>

              {checks.length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center italic">
                  No monthly checks logged yet. Tap &ldquo;Check a month&rdquo; above to begin.
                </p>
              ) : (
                <div className="divide-y divide-[#eee7db] dark:divide-stone-800">
                  {checks
                    .sort((a, b) => b.period.localeCompare(a.period))
                    .map((chk) => (
                      <Link
                        key={chk.id}
                        href={`/check/${chk.id}`}
                        className="min-h-[48px] py-3 px-1 flex items-center justify-between hover:bg-[#fbf9f4] dark:hover:bg-stone-800/50 rounded-xl transition-colors group focus:outline-none focus:ring-2 focus:ring-[#244b38]"
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
                              {chk.status === 'filed' ? 'Complaint reference recorded' : chk.status === 'reported' ? 'Audit report generated' : 'Ledger open'}
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

            {/* Example Data Banner */}
            <div className="flex items-center justify-between text-xs text-stone-500 px-1 pt-1">
              <span>Need demonstration records?</span>
              {hasExample ? (
                <button
                  onClick={handleClearExample}
                  className="min-h-[44px] text-amber-800 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 focus:outline-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear example data</span>
                </button>
              ) : (
                <button
                  onClick={handleTryExample}
                  className="min-h-[44px] text-[#244b38] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 focus:outline-none"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Try with example data</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
