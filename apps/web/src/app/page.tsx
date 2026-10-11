'use client';

import { useApp } from '@/context/AppContext';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { InstallApp } from '@/components/InstallApp';
import { useRouter } from 'next/navigation';
import { Header, BottomNav } from '@/components/Navigation';
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
  PlusCircle,
  Check,
  CreditCard,
  Users,
} from 'lucide-react';

export default function HomePage() {
  const { t } = useApp();
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
    <div className="min-h-screen bg-[#FAF8F1] dark:bg-[#181d1a] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-32">
      <Header />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-4">
        <InstallApp />

        {/* Rule confirmed toast / notice */}
        {showConfirmedNotice && (
          <div className="p-3 bg-[#edf7f2] border border-[#bbf7d0] text-[#166534] rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{t('home.ruleConfirmedYouCanNow')}</span>
            </div>
            <button
              onClick={() => setShowConfirmedNotice(false)}
              className="text-[#166534] hover:underline"
            >
              {t('home.dismiss')}
            </button>
          </div>
        )}

        {/* STATE 1: No Household exists -> Set up your ration card */}
        {!loading && households.length === 0 && (
          <div className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-3xl p-6 shadow-sm text-center space-y-5 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#edf7f2] text-[#244b38] flex items-center justify-center font-bold text-2xl mx-auto shadow-2xs">
              🌾
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-[#1c3d2e] dark:text-stone-100">
                {t('home.welcomeToRationsaathi')}
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                {t('home.checkYourStatutoryMonthlyGrain')}
              </p>
            </div>

            <Link
              href="/household/new"
              className="w-full min-h-[50px] py-3.5 px-6 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-sm rounded-xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{t('home.setUpYourRationCard')}</span>
            </Link>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleTryExample}
                className="min-h-[44px] text-xs font-bold text-[#c07b17] hover:underline inline-flex items-center gap-1.5 focus:outline-none"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('home.orTryWithExampleData')}</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: Logged in Beneficiary Household Card */}
        {primaryHh && (
          <div className="space-y-4">
            {/* Beneficiary Household Card */}
            <div className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-3xl p-5 shadow-sm space-y-4">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 block leading-tight">{t('home.namaste')}</span>
                  <h2 className="text-xl font-black text-[#1c3d2e] dark:text-stone-100 tracking-tight">
                    {primaryHh.label || t('home.rationBeneficiary')}
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#edf7f2] dark:bg-emerald-950/60 text-[#244b38] dark:text-emerald-400 flex items-center justify-center font-bold text-lg shadow-2xs">
                  🌾
                </div>
              </div>

              {/* Clean Inner Card with Entitlement Details */}
              <div className="bg-[#FAF8F1] dark:bg-stone-900 border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block leading-none">{t('home.rationCard')}</span>
                      <span className="font-mono text-xs font-bold text-stone-800 dark:text-stone-200">
                        {primaryHh.rationCardNo ? `•••• •••• ${primaryHh.rationCardNo.slice(-4)}` : t('home.savedLocally')}
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-white dark:bg-stone-800 text-[#244b38] dark:text-emerald-400 border border-[#E8E5DD] dark:border-stone-700 shadow-2xs">
                    {primaryHh.cardType} &bull; {primaryHh.members} {t('common.members')}
                  </span>
                </div>

                <div className="bg-white dark:bg-stone-800 rounded-xl p-3 border border-[#E8E5DD] dark:border-stone-700 flex items-center justify-between shadow-2xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#244b38] dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t('home.confirmedEntitlement')}</span>
                    </div>
                    <div className="font-mono text-sm font-black text-stone-900 dark:text-stone-100">
                      {computeEntitlement(primaryHh).formula}
                    </div>
                  </div>
                  <Link
                    href={`/household/${primaryHh.id}/edit`}
                    className="min-h-[40px] flex items-center text-xs font-bold text-[#244b38] dark:text-emerald-400 hover:underline px-2"
                  >
                    {t('home.edit')} &rarr;
                  </Link>
                </div>
              </div>

              {/* Main Primary Action Button */}
              <button
                onClick={() => handleCreateCheck(primaryHh.id)}
                className="w-full min-h-[48px] py-3.5 bg-[#1e5338] hover:bg-[#16402b] text-white font-extrabold text-sm rounded-xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Calendar className="w-4 h-4" />
                <span>{t('actions.checkMonth')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Monthly Checks Ledger Card */}
            <div className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1c3d2e] dark:text-stone-200">
                  {t('home.monthlyChecksHistory')}
                </h3>
                <span className="text-xs text-stone-500 font-bold">
                  {checks.length} {t('home.months')}
                </span>
              </div>

              {checks.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400 italic">
                  {t('home.noMonthlyChecksLoggedYet')}
                </div>
              ) : (
                <div className="divide-y divide-[#E8E5DD] dark:divide-stone-800">
                  {checks
                    .sort((a, b) => b.period.localeCompare(a.period))
                    .map((chk) => (
                      <Link
                        key={chk.id}
                        href={`/check/${chk.id}`}
                        className="min-h-[48px] py-3 px-1 flex items-center justify-between hover:bg-[#FAF8F1] dark:hover:bg-stone-800/50 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#edf7f2] dark:bg-emerald-950/60 text-[#244b38] dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                            📅
                          </div>
                          <div>
                            <div className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                              {chk.period}
                            </div>
                            <div className="text-[10px] text-stone-500">
                              {chk.status === 'filed' ? t('home.complaintReferenceRecorded') : chk.status === 'reported' ? t('home.auditReportGenerated') : t('home.ledgerOpen')}
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
                            {chk.status === 'filed' ? t('grievance.filed') : chk.status === 'reported' ? t('home.reportReady') : t('home.open')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#244b38]" />
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>

            {/* Example Demonstration Data Option */}
            <div className="flex items-center justify-between text-xs text-stone-500 px-2 pt-1">
              <span>{t('home.needDemonstrationRecords')}</span>
              {hasExample ? (
                <button
                  onClick={handleClearExample}
                  className="min-h-[40px] text-amber-800 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('home.clearExampleData')}</span>
                </button>
              ) : (
                <button
                  onClick={handleTryExample}
                  className="min-h-[40px] text-[#244b38] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('common.exampleData')}</span>
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
