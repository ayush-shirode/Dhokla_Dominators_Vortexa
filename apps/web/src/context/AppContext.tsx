'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushOutbox, initDeviceRegistration } from '@/lib/api';
import { getSetting, setSetting } from '@/lib/db';
import { LanguageCode, SUPPORTED_LANGUAGES } from '@repo/shared';
import enDict from '@/i18n/en.json';
import hiDict from '@/i18n/hi.json';

interface AppContextType {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  isOnline: boolean;
  syncStatus: 'synced' | 'pending' | 'syncing' | 'offline';
  syncNow: () => Promise<void>;
  t: (key: string) => string;
  speak: (text: string, customLang?: LanguageCode) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  aiConsent: {
    photo: boolean;
    translate: boolean;
    cloudAssist: boolean;
  };
  setAiConsent: (consent: { photo: boolean; translate: boolean; cloudAssist: boolean }) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>('en');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'offline'>('synced');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiConsent, setAiConsentState] = useState({
    photo: false,
    translate: false,
    cloudAssist: false,
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial settings
    getSetting<LanguageCode>('pref_lang', 'en').then((savedLang) => {
      setLangState(savedLang);
    });

    getSetting('pref_ai_consent', { photo: false, translate: false, cloudAssist: false }).then((c) => {
      setAiConsentState(c);
    });

    initDeviceRegistration().catch(console.warn);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setLang = (newLang: LanguageCode) => {
    setLangState(newLang);
    setSetting('pref_lang', newLang);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === newLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLang;
      document.documentElement.dir = langObj?.rtl ? 'rtl' : 'ltr';
    }
  };

  const setAiConsent = (newConsent: { photo: boolean; translate: boolean; cloudAssist: boolean }) => {
    setAiConsentState(newConsent);
    setSetting('pref_ai_consent', newConsent);
  };

  const triggerSync = async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    try {
      const res = await flushOutbox();
      if (res.errors > 0) {
        setSyncStatus('pending');
      } else {
        setSyncStatus('synced');
      }
    } catch {
      setSyncStatus('pending');
    }
  };

  const speak = (text: string, customLang?: LanguageCode) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!text) return;

    const targetLang = customLang || lang;
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langObj?.speechLang || 'en-IN';
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const t = (path: string): string => {
    const dict: any = lang === 'hi' ? hiDict : enDict;
    const parts = path.split('.');
    let cur = dict;
    for (const p of parts) {
      if (cur && cur[p] !== undefined) {
        cur = cur[p];
      } else {
        // Fallback to english
        let fb: any = enDict;
        for (const f of parts) {
          fb = fb ? fb[f] : undefined;
        }
        return fb || path;
      }
    }
    return cur || path;
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        isOnline,
        syncStatus,
        syncNow: triggerSync,
        t,
        speak,
        stopSpeaking,
        isSpeaking,
        aiConsent,
        setAiConsent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
