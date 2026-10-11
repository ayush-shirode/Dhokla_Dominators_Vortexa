'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { InstallApp } from '@/components/InstallApp';
import { SUPPORTED_LANGUAGES } from '@repo/shared';
import {
  ArrowRight,
  ClipboardList,
  Calculator,
  ShieldCheck,
  FileCheck2,
  Lock,
  WifiOff,
  Volume2,
  Check,
} from 'lucide-react';

/** Brand mark (from the design): green leaves and a golden wheat ear. */
function Logo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path d="M24 48V28C24 23.5817 20.4183 20 16 20V40C16 44.4183 19.5817 48 24 48Z" fill="#3D7B5D" />
      <path d="M32 48V16C32 11.5817 35.5817 8 40 8C40 12.4183 36.4183 16 32 16Z" fill="#E6B042" />
      <path d="M32 26C36.4183 26 40 22.4183 40 18V26H32Z" fill="#F0C35B" />
      <path d="M32 36C36.4183 36 40 32.4183 40 28V36H32Z" fill="#E6B042" />
      <path d="M28 48V32C28 27.5817 31.5817 24 36 24V40C36 44.4183 32.4183 48 28 48Z" fill="#4E9973" />
    </svg>
  );
}

function Wordmark({ size = 'text-xl' }: { size?: string }) {
  return (
    <span className={`${size} font-black tracking-tight leading-none`}>
      <span className="text-[#1c3d2e]">Ration</span>
      <span className="text-[#d07b1a]">Saathi</span>
    </span>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const { lang, setLang, t, speak } = useApp();
  const [view, setView] = useState<'landing' | 'start' | 'language'>('landing');
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0]!;

  const begin = () => {
    try {
      localStorage.setItem('rs_onboarding_completed', 'true');
    } catch {
      /* private mode: the home page will show this screen again */
    }
    router.push('/');
  };

  const features = [
    { icon: FileCheck2, title: t('welcome.f1Title'), body: t('welcome.f1Body') },
    { icon: ClipboardList, title: t('welcome.f2Title'), body: t('welcome.f2Body') },
    { icon: Calculator, title: t('welcome.f3Title'), body: t('welcome.f3Body') },
    { icon: ShieldCheck, title: t('welcome.f4Title'), body: t('welcome.f4Body') },
  ];

  return (
    <div className="flex-1 flex flex-col font-sans min-h-screen bg-[#FAF8F1] dark:bg-[#181d1a] text-[#1c1917] dark:text-[#f5f5f4] overflow-x-hidden">
      {/* ── Landing ─────────────────────────────────────────────── */}
      {view === 'landing' && (
        <div className="flex-1 flex flex-col w-full">
          <header className="pt-4 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <div>
                <Wordmark />
                <p className="text-[10px] font-bold text-stone-600 tracking-tight mt-0.5">{t('welcome.tagline')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView('language')}
              className="min-h-[36px] px-3 py-1 bg-white border border-[#E8E5DD] rounded-full text-[11px] font-bold text-stone-700"
              aria-label={t('welcome.changeLanguage')}
            >
              {currentLang.nativeName}
            </button>
          </header>

          {/* Hero */}
          <section className="px-5 pt-6 pb-4">
            <h1 className="text-[28px] leading-[1.15] font-black text-[#1c3d2e]">{t('welcome.heroTitle')}</h1>
            <p className="mt-3 text-sm text-stone-700 leading-relaxed">{t('welcome.heroBody')}</p>

            {/* Mini entitlement card (illustration of the core idea) */}
            <div className="mt-5 bg-white border border-[#E8E5DD] rounded-2xl p-4 shadow-subtle max-w-[260px]">
              <p className="text-[11px] font-bold text-stone-500 mb-2">{t('welcome.cardTitle')}</p>
              {[
                { kg: '35 kg', label: t('welcome.cardEntitled'), tone: 'text-[#166534] bg-[#edf7f2]' },
                { kg: '20 kg', label: t('welcome.cardReceived'), tone: 'text-[#166534] bg-[#edf7f2]' },
                { kg: '15 kg', label: t('welcome.cardDifference'), tone: 'text-[#92400e] bg-[#fef3c7]' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 py-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center ${row.tone}`}>
                    <Check className="w-3 h-3" />
                  </span>
                  <span className="font-mono font-bold text-sm text-stone-900 w-14">{row.kg}</span>
                  <span className="text-[11px] text-stone-600">{row.label}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setView('start')}
              className="mt-6 min-h-[52px] px-7 bg-[#1e5338] hover:bg-[#16402b] text-white font-bold text-sm rounded-full shadow-warm inline-flex items-center gap-2"
            >
              <span>{t('welcome.getStarted')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </section>

          <div className="px-5">
            <InstallApp />
          </div>

          {/* Key features */}
          <section className="px-5 pt-6 pb-2">
            <h2 className="text-xl font-black text-[#1c3d2e] mb-3">{t('welcome.featuresTitle')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-white border border-[#E8E5DD] rounded-2xl p-3.5 shadow-subtle">
                  <div className="w-10 h-10 rounded-xl bg-[#edf7f2] text-[#1e5338] flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#1c3d2e] leading-snug">{title}</p>
                  <p className="text-[11px] text-stone-600 mt-1 leading-snug">{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Ribbon */}
          <section className="px-5 py-6 text-center">
            <p className="text-lg font-bold italic text-[#1e5338]">{t('welcome.ribbon')}</p>
          </section>

          {/* Footer */}
          <footer className="mt-auto bg-[#1e5338] text-white px-5 py-6 space-y-3">
            <div className="flex items-center gap-2">
              <Logo className="w-9 h-9" />
              <div>
                <span className="text-lg font-black">
                  Ration<span className="text-[#E6B042]">Saathi</span>
                </span>
                <p className="text-[10px] text-white/80">{t('welcome.tagline')}</p>
              </div>
            </div>
            <div className="text-[11px] text-white/85 leading-relaxed border-t border-white/20 pt-3">
              <p className="font-bold">Team Dhokla_Dominators</p>
              <p>Vishwakarma Institute of Technology · {t('welcome.track')}</p>
              <p>Ayush Shirode · Swaroop Deshmukh · Purvika Agrawal · Grishma Hajirnis</p>
            </div>
          </footer>
        </div>
      )}

      {/* ── Get started (no account needed) ─────────────────────── */}
      {view === 'start' && (
        <div className="flex-1 flex flex-col w-full">
          <div className="relative w-full select-none">
            <div className="absolute top-3 left-4 right-4 z-20 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setView('landing')}
                className="min-h-[36px] text-xs font-bold text-stone-600 bg-white/80 backdrop-blur px-3 py-1 rounded-full"
              >
                &larr; {t('actions.back')}
              </button>
              <button
                type="button"
                onClick={() => setView('language')}
                className="min-h-[36px] text-xs font-bold text-stone-600 bg-white/80 backdrop-blur px-3 py-1 rounded-full"
              >
                {currentLang.nativeName}
              </button>
            </div>
            <div className="pt-16 pb-6 flex flex-col items-center gap-2 bg-gradient-to-b from-[#f3efe2] to-[#FAF8F1]">
              <Logo className="w-16 h-16" />
              <Wordmark size="text-3xl" />
              <p className="text-xs font-bold text-stone-600">{t('welcome.tagline')}</p>
            </div>
          </div>

          <div className="px-5 -mt-1 space-y-4 pb-6">
            <div className="bg-white border border-[#E8E5DD] rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h1 className="text-2xl font-black text-[#1c3d2e] leading-tight">{t('welcome.startTitle')}</h1>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">{t('welcome.startBody')}</p>
              </div>

              <ul className="space-y-2.5 text-xs text-stone-700">
                <li className="flex gap-2.5">
                  <Lock className="w-4 h-4 text-[#1e5338] shrink-0 mt-0.5" />
                  <span>{t('welcome.point1')}</span>
                </li>
                <li className="flex gap-2.5">
                  <WifiOff className="w-4 h-4 text-[#1e5338] shrink-0 mt-0.5" />
                  <span>{t('welcome.point2')}</span>
                </li>
                <li className="flex gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#1e5338] shrink-0 mt-0.5" />
                  <span>{t('welcome.point3')}</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={begin}
                className="w-full min-h-[50px] py-3 bg-[#1e5338] hover:bg-[#16402b] text-white font-bold text-sm rounded-xl shadow-warm flex items-center justify-center gap-2"
              >
                <span>{t('welcome.startButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => speak(`${t('welcome.startTitle')}. ${t('welcome.startBody')} ${t('welcome.point1')} ${t('welcome.point2')} ${t('welcome.point3')}`)}
                className="w-full min-h-[44px] text-xs font-bold text-[#1e5338] flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>{t('actions.listen')}</span>
              </button>
            </div>

            <InstallApp />
          </div>
        </div>
      )}

      {/* ── Language ────────────────────────────────────────────── */}
      {view === 'language' && (
        <div className="flex-1 flex flex-col w-full p-6 pt-8 pb-8">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E5DD]">
            <button onClick={() => setView('landing')} className="text-xs text-stone-500 font-bold min-h-[44px] flex items-center">
              &larr; {t('actions.back')}
            </button>
            <h2 className="text-sm font-bold text-[#1c3d2e]">{t('welcome.languageTitle')}</h2>
            <span className="w-12" />
          </div>
          <div className="space-y-2 py-4 flex-1 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`w-full min-h-[52px] p-3.5 rounded-2xl border flex items-center justify-between ${
                  lang === l.code ? 'bg-[#edf7f2] border-[#244b38] ring-2 ring-[#244b38]' : 'bg-white border-[#E8E5DD]'
                }`}
              >
                <span className="text-left">
                  <span className="text-sm font-bold block text-stone-900">{l.nativeName}</span>
                  <span className="text-[10px] text-stone-400">{l.name}</span>
                </span>
                {lang === l.code && <Check className="w-4 h-4 text-[#244b38]" />}
              </button>
            ))}
          </div>
          <button
            onClick={() => setView('landing')}
            className="w-full min-h-[52px] bg-[#244b38] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2"
          >
            <span>{t('welcome.continue')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
