'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  ChevronDown,
  Menu,
  X,
  CreditCard,
  ClipboardList,
  Calculator,
  ShieldCheck,
} from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();
  const { lang, setLang } = useApp();

  // 'landing' matches Phone 1 (Landing Page); 'login' matches Phone 2 (Login Page); 'language' modal
  const [view, setView] = useState<'landing' | 'login' | 'language'>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form state for Login
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

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
    }, 400);
  };

  const handleSkipOrGuest = () => {
    localStorage.setItem('rs_onboarding_completed', 'true');
    router.push('/');
  };

  return (
    <div className="flex-1 flex flex-col justify-between font-sans min-h-screen bg-[#FAF8F1] dark:bg-[#181d1a] text-[#1c1917] dark:text-[#f5f5f4] overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          PHONE 1: LANDING PAGE (EXACT PIXEL MATCH)
         ───────────────────────────────────────────────────────────── */}
      {view === 'landing' && (
        <div className="flex-1 flex flex-col justify-between w-full max-w-md mx-auto relative bg-[#FAF8F1]">
          {/* Header */}
          <div className="pt-4 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 shrink-0">
                <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                  <path d="M24 48V28C24 23.5817 20.4183 20 16 20V40C16 44.4183 19.5817 48 24 48Z" fill="#3D7B5D"/>
                  <path d="M32 48V16C32 11.5817 35.5817 8 40 8C40 12.4183 36.4183 16 32 16Z" fill="#E6B042"/>
                  <path d="M32 26C36.4183 26 40 22.4183 40 18V26H32Z" fill="#F0C35B"/>
                  <path d="M32 36C36.4183 36 40 32.4183 40 28V36H32Z" fill="#E6B042"/>
                  <path d="M28 48V32C28 27.5817 31.5817 24 36 24V40C36 44.4183 32.4183 48 28 48Z" fill="#4E9973"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center tracking-tight leading-none">
                  <span className="text-xl font-black text-[#1c3d2e]">Ration</span>
                  <span className="text-xl font-black text-[#d07b1a]">Saathi</span>
                </div>
                <p className="text-[10px] font-bold text-stone-600 tracking-tight mt-0.5">
                  Sahi Ration &bull; Sabka Adhikar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setView('language')}
                className="px-2.5 py-1 bg-white border border-[#E8E5DD] rounded-full text-[11px] font-bold text-stone-700"
              >
                {currentLang.nativeName}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-[#1c3d2e] hover:bg-black/5"
                title="Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 stroke-[2.5]" />}
              </button>
            </div>
          </div>

          {/* Optional Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="mx-5 mt-2 p-3 bg-white border border-[#E8E5DD] rounded-2xl shadow-warm space-y-2 z-30">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setView('login');
                }}
                className="w-full text-left py-2 px-3 text-xs font-bold text-[#1c3d2e] hover:bg-[#edf7f2] rounded-xl"
              >
                Login / Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setView('language');
                }}
                className="w-full text-left py-2 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 rounded-xl"
              >
                Change Language ({currentLang.name})
              </button>
              <button
                type="button"
                onClick={handleSkipOrGuest}
                className="w-full text-left py-2 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 rounded-xl"
              >
                Continue as Guest
              </button>
            </div>
          )}

          {/* Hero Section: Exact Complete Artwork from Mockup with Clickable Get Started Overlay */}
          <div className="relative w-full overflow-hidden select-none">
            <img
              src="/landing_hero_complete.png"
              alt="Know Your Ration Entitlement"
              className="w-full h-auto block"
            />
            {/* Click target right over the 'Get Started ->' button */}
            <button
              type="button"
              onClick={() => setView('login')}
              className="absolute left-[2%] top-[65.8%] w-[42%] h-[16.5%] rounded-full cursor-pointer opacity-0 focus:opacity-20 hover:opacity-10 bg-white"
              title="Get Started"
              aria-label="Get Started"
            />
          </div>

          {/* Key Features Section */}
          <div className="relative w-full overflow-hidden select-none">
            <img
              src="/landing_features_complete.png"
              alt="Key Features"
              className="w-full h-auto block"
            />
          </div>

          {/* Ribbon: 'Your Entitlement. Our Priority.' */}
          <div className="relative w-full overflow-hidden select-none">
            <img
              src="/landing_ribbon_complete.png"
              alt="Your Entitlement. Our Priority."
              className="w-full h-auto block"
            />
          </div>

          {/* Team Dhokla_Dominators Footer */}
          <div className="relative w-full overflow-hidden select-none">
            <img
              src="/landing_footer_complete.png"
              alt="Team Dhokla_Dominators"
              className="w-full h-auto block"
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PHONE 2: LOGIN PAGE (EXACT PIXEL MATCH)
         ───────────────────────────────────────────────────────────── */}
      {view === 'login' && (
        <div className="flex-1 flex flex-col justify-between w-full max-w-md mx-auto relative bg-[#FAF8F1]">
          {/* Top Scenery Slice: Centered Logo, Tagline, Village House & Trees */}
          <div className="relative w-full overflow-hidden select-none">
            {/* Nav row inside top scene */}
            <div className="absolute top-3 left-4 right-4 z-20 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setView('landing')}
                className="text-xs font-bold text-stone-600 bg-white/70 backdrop-blur px-3 py-1 rounded-full shadow-2xs hover:bg-white"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setView('language')}
                className="text-xs font-bold text-stone-600 bg-white/70 backdrop-blur px-3 py-1 rounded-full shadow-2xs hover:bg-white"
              >
                {currentLang.nativeName}
              </button>
            </div>
            <img
              src="/login_scene_top.png"
              alt="RationSaathi"
              className="w-full h-auto block"
            />
          </div>

          {/* Welcome Back Card */}
          <div className="px-5 -mt-2 z-10">
            <div className="bg-white border border-[#E8E5DD] rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h1 className="text-2xl font-black text-[#1c3d2e] tracking-tight leading-tight">
                  Welcome Back!
                </h1>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Log in to your account to continue
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Mobile Number Input */}
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
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 text-xs bg-white border border-[#E8E5DD] rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#205139]"
                  />
                </div>

                {/* Password Input */}
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
                    className="w-full min-h-[46px] pl-10 pr-10 py-2.5 text-xs bg-white border border-[#E8E5DD] rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#205139]"
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

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[46px] py-3 bg-[#1e5338] hover:bg-[#16402b] text-white font-extrabold text-xs rounded-xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span>{loading ? 'Logging in…' : 'Login'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E8E5DD]"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-stone-400">OR</span>
                <div className="flex-grow border-t border-[#E8E5DD]"></div>
              </div>

              {/* Login with Aadhaar */}
              <button
                type="button"
                onClick={handleSkipOrGuest}
                className="w-full min-h-[44px] py-2 px-4 bg-white hover:bg-[#edf7f2] border border-[#205139] text-[#1e5338] rounded-xl font-extrabold text-xs flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-5 h-5 text-[#1e5338]" />
                <span>Login with Aadhaar</span>
              </button>

              {/* Forgot Password */}
              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={handleSkipOrGuest}
                  className="text-xs font-semibold text-stone-500 hover:text-[#1e5338]"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign Up Link */}
              <div className="text-center pt-1 text-xs text-stone-500">
                <span>Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={handleSkipOrGuest}
                  className="font-extrabold text-[#1e5338] hover:underline"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Scenery Slice: Rolling Green Hills and Wheat Stalk */}
          <div className="relative w-full overflow-hidden select-none mt-4">
            <img
              src="/login_scene_hills_pristine.png"
              alt="Landscape"
              className="w-full h-auto block"
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: LANGUAGE MODAL
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
