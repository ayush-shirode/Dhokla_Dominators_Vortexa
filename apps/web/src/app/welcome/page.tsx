'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { SUPPORTED_LANGUAGES } from '@repo/shared';
import {
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Fingerprint,
  Menu,
  X,
  CreditCard,
  ClipboardList,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

/** RationSaathi clean SVG logo with wheat grain and green stalk */
function RationSaathiLogo({ className = 'w-10 h-10' }: { className?: string }) {
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

export default function WelcomePage() {
  const router = useRouter();
  const { lang, setLang, t } = useApp();

  // Screen state: 'landing' (First screen) -> 'login' (After clicking Get Started)
  const [view, setView] = useState<'landing' | 'login' | 'language'>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form state for Login
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0]!;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (mobileNumber) {
        localStorage.setItem('rs_user_mobile', mobileNumber);
      }
      localStorage.setItem('rs_onboarding_completed', 'true');
      setLoading(false);
      router.push('/');
    }, 350);
  };

  const handleSkipOrGuest = () => {
    try {
      localStorage.setItem('rs_onboarding_completed', 'true');
    } catch {
      /* private mode */
    }
    router.push('/');
  };

  return (
    <div className="flex-1 flex flex-col font-sans min-h-screen bg-[#FAF8F1] dark:bg-[#181d1a] text-[#1c1917] dark:text-[#f5f5f4] overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          SCREEN 1: CLEAN CRISP LANDING PAGE (Vectors & native UI)
         ───────────────────────────────────────────────────────────── */}
      {view === 'landing' && (
        <div className="flex-1 flex flex-col justify-between w-full max-w-md mx-auto">
          {/* Top Header */}
          <header className="pt-5 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RationSaathiLogo className="w-10 h-10" />
              <div>
                <div className="flex items-center tracking-tight leading-none text-xl font-black">
                  <span className="text-[#1c3d2e] dark:text-stone-100">Ration</span>
                  <span className="text-[#d07b1a]">Saathi</span>
                </div>
                <p className="text-[10px] font-bold text-stone-600 dark:text-stone-400 tracking-tight mt-0.5">
                  Sahi Ration &bull; Sabka Adhikar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setView('language')}
                className="px-3 py-1 bg-white dark:bg-stone-900 border border-[#E8E5DD] dark:border-stone-800 rounded-full text-xs font-bold text-stone-700 dark:text-stone-300 shadow-2xs hover:bg-stone-50"
              >
                {currentLang.nativeName}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-[#1c3d2e] dark:text-stone-200 hover:bg-black/5"
                title="Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 stroke-[2.5]" />}
              </button>
            </div>
          </header>

          {/* Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="mx-5 mt-2 p-3 bg-white dark:bg-stone-900 border border-[#E8E5DD] dark:border-stone-800 rounded-2xl shadow-warm space-y-2 z-30">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setView('login');
                }}
                className="w-full text-left py-2.5 px-3 text-xs font-bold text-[#1c3d2e] hover:bg-[#edf7f2] rounded-xl"
              >
                Login / Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setView('language');
                }}
                className="w-full text-left py-2.5 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 rounded-xl"
              >
                Change Language ({currentLang.name})
              </button>
              <button
                type="button"
                onClick={handleSkipOrGuest}
                className="w-full text-left py-2.5 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 rounded-xl"
              >
                Continue as Guest
              </button>
            </div>
          )}

          {/* Hero Section */}
          <section className="px-5 pt-6 pb-4 space-y-5">
            <div className="space-y-2.5">
              <h1 className="text-[30px] font-black text-[#1c3d2e] dark:text-stone-100 tracking-tight leading-[1.12]">
                Know Your<br />Ration Entitlement
              </h1>
              <p className="text-xs text-stone-600 dark:text-stone-400 font-medium leading-relaxed max-w-xs">
                Track your collections, compare with what you are owed, and raise a grievance &mdash; all in one place.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="min-h-[48px] py-3 px-6 bg-[#1f5038] hover:bg-[#18402d] text-white font-extrabold text-xs rounded-full shadow-warm inline-flex items-center gap-2 transition-all active:scale-98"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Crisp Native Illustrated Card (Entitlement 35 kg / Received 20 kg / Shortfall 15 kg) */}
            <div className="relative bg-gradient-to-br from-[#edf5ec] via-[#f4f9f3] to-[#e8f1e7] dark:from-stone-900 dark:to-stone-950 border border-[#d6e5d3] dark:border-stone-800 rounded-3xl p-5 shadow-2xs overflow-hidden">
              {/* Subtle background shop awning badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#244b38] text-white flex items-center justify-center font-bold text-base shadow-2xs">
                    🌾
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#1c3d2e] dark:text-stone-100 block">Ration Shop Companion</span>
                    <span className="text-[10px] text-stone-500 font-semibold">NFSA Monthly Allocation</span>
                  </div>
                </div>
                <span className="bg-[#e4a864] text-[#332010] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#c48d4f]">
                  राशन की दुकान
                </span>
              </div>

              {/* Live Status Rows */}
              <div className="bg-white/95 dark:bg-[#202622] rounded-2xl p-3.5 border border-[#e2ece0] dark:border-stone-800 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#edf7f2] text-[#166534] flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
                    </span>
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Entitlement (Monthly)</span>
                  </div>
                  <span className="text-sm font-black font-mono text-[#1c3d2e] dark:text-stone-100">35 kg</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#edf7f2] text-[#166534] flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
                    </span>
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Received Quantity</span>
                  </div>
                  <span className="text-sm font-black font-mono text-[#1c3d2e] dark:text-stone-100">20 kg</span>
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    </span>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-400">Shortfall Difference</span>
                  </div>
                  <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-400">15 kg</span>
                </div>
              </div>
            </div>
          </section>

          {/* Key Features Section */}
          <section className="px-5 py-2 space-y-3">
            <div className="bg-[#edf5ec] dark:bg-stone-900 border border-[#d6e5d3] dark:border-stone-800 rounded-3xl p-4 space-y-3 shadow-2xs">
              <div>
                <h2 className="text-xl font-black text-[#1c3d2e] dark:text-stone-100 tracking-tight">
                  Key Features
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                  Simple tools for a fairer and transparent PDS.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white dark:bg-[#202622] rounded-2xl p-2.5 text-center flex flex-col items-center justify-between min-h-[105px] border border-white/60 dark:border-stone-800 shadow-2xs">
                  <div className="w-9 h-9 rounded-full bg-[#edf7f2] text-[#1f5038] flex items-center justify-center mb-1">
                    <CreditCard className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#1c3d2e] dark:text-stone-200 leading-tight">
                    Know Your<br />Entitlement
                  </span>
                </div>

                <div className="bg-white dark:bg-[#202622] rounded-2xl p-2.5 text-center flex flex-col items-center justify-between min-h-[105px] border border-white/60 dark:border-stone-800 shadow-2xs">
                  <div className="w-9 h-9 rounded-full bg-[#edf7f2] text-[#1f5038] flex items-center justify-center mb-1">
                    <ClipboardList className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#1c3d2e] dark:text-stone-200 leading-tight">
                    Log Your<br />Collections
                  </span>
                </div>

                <div className="bg-white dark:bg-[#202622] rounded-2xl p-2.5 text-center flex flex-col items-center justify-between min-h-[105px] border border-white/60 dark:border-stone-800 shadow-2xs">
                  <div className="w-9 h-9 rounded-full bg-[#edf7f2] text-[#1f5038] flex items-center justify-center mb-1">
                    <Calculator className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#1c3d2e] dark:text-stone-200 leading-tight">
                    See the<br />Difference
                  </span>
                </div>

                <div className="bg-white dark:bg-[#202622] rounded-2xl p-2.5 text-center flex flex-col items-center justify-between min-h-[105px] border border-white/60 dark:border-stone-800 shadow-2xs">
                  <div className="w-9 h-9 rounded-full bg-[#edf7f2] text-[#1f5038] flex items-center justify-center mb-1">
                    <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#1c3d2e] dark:text-stone-200 leading-tight">
                    Raise a<br />Grievance
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Ribbon */}
          <section className="px-5 py-4 text-center">
            <p className="text-base font-serif italic font-bold text-[#1e5338] tracking-tight">
              &ldquo;Your Entitlement. Our Priority.&rdquo;
            </p>
          </section>

          {/* Deep Forest Green Footer */}
          <footer className="mt-4 bg-[#184530] text-white p-5 rounded-t-3xl space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7">
                    <RationSaathiLogo className="w-full h-full" />
                  </div>
                  <span className="text-base font-black tracking-tight">
                    Ration<span className="text-[#F4C75B]">Saathi</span>
                  </span>
                </div>
                <p className="text-[9px] text-emerald-200/80 font-bold tracking-wide">
                  Sahi Ration &bull; Sabka Adhikar
                </p>
              </div>

              <div className="border-l border-emerald-600/50 pl-3 text-left space-y-0.5">
                <span className="text-[10px] font-extrabold text-white block">
                  Team Dhokla_Dominators
                </span>
                <p className="text-[9px] text-emerald-100/90 font-medium leading-tight">
                  Vishwakarma Institute of Technology
                </p>
                <p className="text-[8px] text-emerald-300/80 font-semibold">
                  Track: Civic Technology
                </p>
                <p className="text-[8px] text-emerald-200/70 pt-0.5">
                  Ayush Shirode &bull; Swaroop Deshmukh<br />
                  Purvika Agrawal &bull; Grishma Hajirnis
                </p>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SCREEN 2: LOGIN PAGE (Clean vector design, sharp & crisp)
         ───────────────────────────────────────────────────────────── */}
      {view === 'login' && (
        <div className="flex-1 flex flex-col justify-between w-full max-w-md mx-auto">
          {/* Top Header & Branding */}
          <div className="pt-6 px-6 text-center space-y-4">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setView('landing')}
                className="text-xs font-bold text-stone-600 bg-white dark:bg-stone-900 border border-[#E8E5DD] px-3 py-1 rounded-full hover:bg-stone-50"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setView('language')}
                className="text-xs font-bold text-stone-600 bg-white dark:bg-stone-900 border border-[#E8E5DD] px-3 py-1 rounded-full hover:bg-stone-50"
              >
                {currentLang.nativeName}
              </button>
            </div>

            <div className="flex flex-col items-center pt-2">
              <div className="w-14 h-14 mb-2">
                <RationSaathiLogo className="w-full h-full" />
              </div>
              <div className="flex items-center justify-center tracking-tight text-2xl font-black">
                <span className="text-[#1c3d2e] dark:text-stone-100">Ration</span>
                <span className="text-[#d07b1a]">Saathi</span>
              </div>
              <p className="text-xs font-bold text-stone-600 dark:text-stone-400 mt-0.5">
                Sahi Ration &bull; Sabka Adhikar
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="px-5 py-4">
            <div className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h1 className="text-2xl font-black text-[#1c3d2e] dark:text-stone-100 tracking-tight">
                  Welcome Back!
                </h1>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Log in to your account to continue
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-400">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 text-xs bg-white dark:bg-stone-900 border border-[#E8E5DD] dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#205139]"
                  />
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-stone-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-[46px] pl-10 pr-10 py-2.5 text-xs bg-white dark:bg-stone-900 border border-[#E8E5DD] dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#205139]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-stone-400 hover:text-stone-600 p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] py-3 bg-[#1e5338] hover:bg-[#16402b] text-white font-extrabold text-xs rounded-xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span>{loading ? 'Logging in…' : 'Login'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E8E5DD] dark:border-stone-700"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-stone-400">OR</span>
                <div className="flex-grow border-t border-[#E8E5DD] dark:border-stone-700"></div>
              </div>

              <button
                type="button"
                onClick={handleSkipOrGuest}
                className="w-full min-h-[46px] py-2 px-4 bg-white dark:bg-stone-900 hover:bg-[#edf7f2] border border-[#205139] text-[#1e5338] dark:text-emerald-400 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-5 h-5 text-[#1e5338]" />
                <span>Login with Aadhaar</span>
              </button>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={handleSkipOrGuest}
                  className="text-xs font-semibold text-stone-500 hover:text-[#1e5338]"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="text-center pt-1 text-xs text-stone-500">
                <span>Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={handleSkipOrGuest}
                  className="font-extrabold text-[#1e5338] dark:text-emerald-400 hover:underline"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Clean Scenery Vector */}
          <div className="mt-auto px-5 pb-5 text-center">
            <p className="text-xs text-stone-500 font-semibold italic">
              Empowering beneficiaries across India &bull; NFSA 2013
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SCREEN 3: LANGUAGE MODAL
         ───────────────────────────────────────────────────────────── */}
      {view === 'language' && (
        <div className="flex-1 flex flex-col justify-between w-full max-w-md mx-auto p-6 pt-8 pb-8">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E5DD]">
            <button
              onClick={() => setView('landing')}
              className="text-xs text-stone-500 font-bold hover:underline min-h-[44px] flex items-center"
            >
              &larr; Back
            </button>
            <h2 className="text-sm font-bold text-[#1c3d2e]">Language Settings</h2>
            <button
              onClick={() => setView('landing')}
              className="text-xs text-[#244b38] font-bold hover:underline min-h-[44px] flex items-center"
            >
              Done
            </button>
          </div>

          <div className="my-auto space-y-4 py-4">
            <div>
              <h2 className="text-lg font-bold text-[#1c3d2e]">Choose your language</h2>
              <p className="text-xs text-stone-500 font-medium">Select your preferred language to continue</p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`w-full min-h-[52px] p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    lang === l.code
                      ? 'bg-[#edf7f2] border-[#244b38] ring-2 ring-[#244b38]'
                      : 'bg-white border-[#E8E5DD] hover:bg-[#f3eee3]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        lang === l.code ? 'border-[#244b38] bg-[#244b38]' : 'border-stone-300'
                      }`}
                    >
                      {lang === l.code && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="text-left">
                      <span className="text-xs font-bold block text-stone-900">{l.nativeName}</span>
                      <span className="text-[10px] text-stone-400 font-medium">{l.name}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setView('landing')}
              className="w-full min-h-[52px] py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-bold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2"
            >
              <span>Continue &bull; आगे बढ़ें</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
