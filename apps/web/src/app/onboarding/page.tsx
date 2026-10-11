'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@repo/shared';
import { Volume2, ArrowRight, ShieldCheck, Scale, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-md space-y-6">
        {/* Step 1: Language Picker */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <span className="text-2xl">🇮🇳</span>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Choose Your Language
              </h2>
              <p className="text-xs text-stone-500">अपनी पसंदीदा भाषा चुनें</p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {SUPPORTED_LANGUAGES.map((l) => (
                <div
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                    lang === l.code
                      ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-700 dark:border-teal-600 ring-2 ring-teal-700'
                      : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{l.nativeName}</span>
                    <span className="text-[10px] text-stone-400">{l.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(l.nativeName, l.code);
                    }}
                    className="p-1 text-stone-400 hover:text-teal-700"
                    title="Listen"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
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
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                How RationSaathi Works
              </h2>
              <p className="text-xs text-stone-500">
                Designed for clarity, fairness, and trust
              </p>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-start gap-3">
                <Scale className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Compare your entitlement:</strong> See what the law guarantees versus what you received each month.
                </p>
              </div>

              <div className="p-3 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Plain arithmetic:</strong> No AI calculates your totals. Every number is verified math linked to your receipts.
                </p>
              </div>

              <div className="p-3 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <p>
                  <strong>You file yourself:</strong> We prepare the description and copy fields. You file securely on the official portal with your own OTP.
                </p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Next &bull; आगे</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Privacy & Device Registration */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Your Privacy is Guaranteed
              </h2>
              <p className="text-xs text-stone-500">
                Data security and local-first storage
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-stone-950 rounded-lg border border-stone-200 dark:border-stone-800 text-xs space-y-2 text-stone-600 dark:text-stone-400">
              <p>
                &bull; Your ration card number <strong>never leaves this phone</strong>.
              </p>
              <p>
                &bull; Any 12-digit numbers that look like an Aadhaar number are blacked out before any image or text is saved.
              </p>
              <p>
                &bull; RationSaathi works 100% offline. You can use it anywhere without an active internet connection.
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
