'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { SUPPORTED_LANGUAGES } from '@repo/shared';
import { ArrowRight, ShieldCheck, Scale, CheckCircle2, Lock } from 'lucide-react';
import { ListenButton } from '@/components/Navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const { lang, setLang, t } = useApp();

  // Screen flow:
  // 1: Language Picker (can be skipped, defaults to English)
  // 2: Intro (3 cards)
  // 3: Privacy card (always shown once before home)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    // If the user has already seen onboarding/privacy, direct returning users to Home
    const seen = localStorage.getItem('rs_onboarding_completed');
    if (seen === 'true') {
      router.replace('/');
    }
  }, [router]);

  const handleFinishOnboarding = () => {
    localStorage.setItem('rs_onboarding_completed', 'true');
    router.push('/');
  };

  const handleSkipLanguage = () => {
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col justify-between items-center p-4 pb-8 font-sans">
      {/* Top Header */}
      <div className="w-full max-w-md pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌾</span>
          <span className="font-extrabold text-sm text-[#1c3d2e] dark:text-stone-100">
            
            {t('common.ration')}<span className="text-[#c07b17]">{t('common.saathi')}</span>
          </span>
        </div>

        {step === 1 && (
          <button
            onClick={handleSkipLanguage}
            className="min-h-[44px] px-3 text-xs text-stone-500 font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-[#244b38] rounded-lg"
          >
            
            {t('onboarding.skipEnglish')}
          </button>
        )}
      </div>

      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-6 shadow-warm space-y-6 my-auto">
        {/* Step 1: Language Picker */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-left space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-[#1c3d2e] dark:text-stone-100">
                  
                  {t('onboarding.chooseYourLanguage')}
                </h2>
                <ListenButton text={t('onboarding.chooseYourLanguageSelectYour')} label={t('actions.listen')} />
              </div>
              <p className="text-xs text-stone-500 font-medium">
                
                {t('onboarding.selectYourPreferredLanguageTo')}
              </p>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`w-full min-h-[52px] p-3.5 rounded-2xl border flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
                    lang === l.code
                      ? 'bg-[#edf7f2] dark:bg-emerald-950/40 border-[#bbf7d0] dark:border-emerald-800 ring-2 ring-[#244b38]'
                      : 'bg-[#fbf9f4] dark:bg-stone-950 border-[#eee7db] dark:border-stone-800 hover:bg-[#f3eee3]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        lang === l.code
                          ? 'border-[#244b38] bg-[#244b38]'
                          : 'border-stone-300'
                      }`}
                    >
                      {lang === l.code && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="text-left">
                      <span className="text-xs font-extrabold block text-stone-900 dark:text-stone-100">
                        {l.nativeName}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">{l.name}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full min-h-[48px] py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <span>{t('onboarding.continue')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Intro (3 cards) */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
                
                {t('onboarding.howRationsaathiWorks')}
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                
                {t('onboarding.transparentEvidenceBasedSelfFiled')}
              </p>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-4 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 flex items-start gap-3">
                <Scale className="w-5 h-5 text-[#244b38] shrink-0 mt-0.5" />
                <p>
                  <strong>{t('onboarding.compareYourEntitlement')}</strong> {' '}{t('onboarding.checkWhatStatutoryRulesGuarantee')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#244b38] shrink-0 mt-0.5" />
                <p>
                  <strong>{t('onboarding.plainArithmetic')}</strong> {' '}{t('onboarding.noAutomatedGuessesEveryCalculation')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#244b38] shrink-0 mt-0.5" />
                <p>
                  <strong>{t('onboarding.youFileYourself')}</strong> {' '}{t('onboarding.rationsaathiPreparesTheTextCopy')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full min-h-[48px] py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <span>{t('onboarding.nextPrivacyGuarantee')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Privacy Card (Always shown once) */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100 flex items-center justify-center gap-1.5">
                <Lock className="w-4 h-4 text-[#244b38]" />
                <span>{t('onboarding.yourPrivacyIsGuaranteed')}</span>
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                
                {t('onboarding.offlineFirstLocalStorageOnly')}
              </p>
            </div>

            <div className="p-4 bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl border border-[#eee7db] dark:border-stone-800 text-xs space-y-3 text-stone-700 dark:text-stone-300">
              <div className="flex items-start gap-2">
                <span className="text-[#244b38] font-bold">{t('common.x')}</span>
                <p>
                  
                  {t('onboarding.cardNumberLocal')}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#244b38] font-bold">{t('common.x')}</span>
                <p>
                  
                  {t('onboarding.any12DigitAadhaarNumbers')}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#244b38] font-bold">{t('common.x')}</span>
                <p>
                  
                  {t('onboarding.weNeverAskForPasswords')}
                </p>
              </div>
            </div>

            <button
              onClick={handleFinishOnboarding}
              className="w-full min-h-[48px] py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <span>{t('onboarding.getStarted')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-stone-400 font-medium">
        
        {t('onboarding.rationsaathiSahiRationSabkaAdhikar')}
      </div>
    </div>
  );
}
