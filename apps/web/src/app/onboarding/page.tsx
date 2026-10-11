'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@repo/shared';
import { Volume2, ArrowRight, ShieldCheck, Scale, CheckCircle2, ChevronDown } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { lang, setLang, speak } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as any);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col justify-between items-center p-4 pb-8">
      {/* Top Header Matching Screen 1 & 2 */}
      <div className="w-full max-w-md pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌾</span>
          <span className="font-extrabold text-sm text-[#1c3d2e] dark:text-stone-100">
            Ration<span className="text-[#c07b17]">Saathi</span>
          </span>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-xs text-stone-500 font-bold hover:underline"
        >
          Skip &rarr;
        </button>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-6 shadow-warm space-y-6 my-auto">
        {/* Step 1: Language Picker Matching Screen 2 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-left space-y-1">
              <h2 className="text-lg font-extrabold text-[#1c3d2e] dark:text-stone-100">
                Choose your language
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Select your preferred language to continue
              </p>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {SUPPORTED_LANGUAGES.map((l) => (
                <div
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
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
                    <div>
                      <span className="text-xs font-extrabold block text-stone-900 dark:text-stone-100">
                        {l.nativeName}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">{l.name}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(l.nativeName, l.code);
                    }}
                    className="p-1.5 text-stone-400 hover:text-[#244b38]"
                    title="Listen"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>Continue &bull; आगे बढ़ें</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: What RationSaathi Does / Doesn't Do */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
                How RationSaathi Works
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Transparent &bull; Evidence-based &bull; Self-filed
              </p>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 flex items-start gap-3">
                <Scale className="w-5 h-5 text-[#244b38] shrink-0 mt-0.5" />
                <p>
                  <strong>Compare your entitlement:</strong> See what the law guarantees versus what you received each month.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#244b38] shrink-0 mt-0.5" />
                <p>
                  <strong>Plain arithmetic:</strong> No AI produces your totals. Every number is plain arithmetic linked to your slips.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#244b38] shrink-0 mt-0.5" />
                <p>
                  <strong>You file yourself:</strong> We prepare the grievance copy. You file securely on the official portal with your OTP.
                </p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>Next &bull; आगे</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Privacy & Get Started */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
                Your Privacy is Guaranteed
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Offline-first &bull; Local storage
              </p>
            </div>

            <div className="p-4 bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl border border-[#eee7db] dark:border-stone-800 text-xs space-y-2.5 text-stone-600 dark:text-stone-400">
              <p>
                &bull; Your ration card number <strong>never leaves this phone</strong>.
              </p>
              <p>
                &bull; 12-digit Aadhaar numbers are automatically masked out before saving.
              </p>
              <p>
                &bull; RationSaathi works 100% offline with no internet connection required.
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-stone-400 font-medium">
        RationSaathi &bull; Sahi Ration, Sabka Adhikar
      </div>
    </div>
  );
}
