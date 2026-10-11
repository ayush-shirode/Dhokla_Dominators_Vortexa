'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, registerDevice } from '@/lib/api';
import { runSync } from '@/lib/sync';
import { errorKey } from '@/lib/errors';
import { ConsentDialog, type CloudFeature, type ConsentAnswer } from '@/components/ConsentDialog';
import { getSetting, setSetting } from '@/lib/db';
import { LanguageCode, SUPPORTED_LANGUAGES } from '@repo/shared';
import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';
import mr from '@/i18n/mr.json';
import bn from '@/i18n/bn.json';
import ta from '@/i18n/ta.json';
import te from '@/i18n/te.json';
import gu from '@/i18n/gu.json';
import kn from '@/i18n/kn.json';
import ml from '@/i18n/ml.json';
import pa from '@/i18n/pa.json';
import or from '@/i18n/or.json';
import as from '@/i18n/as.json';
import ur from '@/i18n/ur.json';

type Catalog = { [key: string]: string | Catalog };
/** UI string catalogs. English is the per-key fallback (FRONTEND_SPEC §7). */
const CATALOGS: Record<LanguageCode, Catalog> = { en, hi, mr, bn, ta, te, gu, kn, ml, pa, or, as, ur };

function lookup(dict: Catalog, path: string): string | undefined {
  let cur: string | Catalog | undefined = dict;
  for (const p of path.split('.')) {
    if (!cur || typeof cur === 'string') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function applyDocumentLanguage(code: LanguageCode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  document.documentElement.dir = SUPPORTED_LANGUAGES.find((l) => l.code === code)?.rtl ? 'rtl' : 'ltr';
}

interface AppContextType {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  isOnline: boolean;
  syncStatus: 'synced' | 'pending' | 'syncing' | 'offline';
  syncNow: () => Promise<void>;
  /** UI text in the current language. `{name}` placeholders are filled from `vars`. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  speak: (text: string, customLang?: LanguageCode) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  aiConsent: {
    photo: boolean;
    translate: boolean;
    cloudAssist: boolean;
  };
  setAiConsent: (consent: { photo: boolean; translate: boolean; cloudAssist: boolean }) => void;
  /** Server capabilities from GET /meta (cached for offline). */
  capabilities: { cloudAi: boolean; localOcr: boolean; pdfLanguages: string[] };
  /**
   * Asks for consent before a cloud AI call (FRONTEND_SPEC §5, §9). Resolves true when the user
   * allowed it (now or "always"), false when they declined or cloud AI is not available.
   */
  requestCloudConsent: (feature: CloudFeature) => Promise<boolean>;
  /** One-line notice after a sync, e.g. items updated from the server. */
  syncNotice: string | null;
  dismissSyncNotice: () => void;
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
  const [capabilities, setCapabilities] = useState({ cloudAi: false, localOcr: false, pdfLanguages: [] as string[] });
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [consentAsk, setConsentAsk] = useState<CloudFeature | null>(null);
  const consentResolver = useRef<((a: ConsentAnswer) => void) | null>(null);
  const syncing = useRef(false);

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
      applyDocumentLanguage(savedLang);
    });

    getSetting('pref_ai_consent', { photo: false, translate: false, cloudAssist: false }).then((c) => {
      setAiConsentState(c);
    });

    getSetting('server_capabilities', { cloudAi: false, localOcr: false, pdfLanguages: [] as string[] }).then(setCapabilities);
    api
      .meta()
      .then((m) => {
        const caps = { cloudAi: m.capabilities.cloudAi, localOcr: m.capabilities.localOcr, pdfLanguages: m.capabilities.pdfLanguages };
        setCapabilities(caps);
        setSetting('server_capabilities', caps);
      })
      .catch(() => {
        /* offline: keep cached capabilities */
      });

    registerDevice()
      .then(() => triggerSync())
      .catch(console.warn);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setLang = (newLang: LanguageCode) => {
    setLangState(newLang);
    setSetting('pref_lang', newLang);
    applyDocumentLanguage(newLang);
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
    if (syncing.current) return;
    syncing.current = true;
    setSyncStatus('syncing');
    try {
      if (!(await registerDevice())) {
        setSyncStatus('pending');
        return;
      }
      const res = await runSync();
      setSyncStatus(res.errors.length > 0 ? 'pending' : 'synced');
      if (res.updatedFromServer > 0) {
        setSyncNotice(t('sync.updatedFromServer', { n: res.updatedFromServer }));
      } else if (res.errors.length > 0) {
        setSyncNotice(t('sync.notBackedUp', { n: res.errors.length, reason: t(errorKey({ code: res.errors[0]!.error.code }, 'errors.generic')) }));
      }
    } catch {
      setSyncStatus('pending');
    } finally {
      syncing.current = false;
    }
  };

  const requestCloudConsent = (feature: CloudFeature): Promise<boolean> => {
    if (!capabilities.cloudAi) return Promise.resolve(false);
    if (aiConsent[feature]) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      consentResolver.current = (answer) => {
        setConsentAsk(null);
        consentResolver.current = null;
        if (answer === 'always') setAiConsent({ ...aiConsent, [feature]: true });
        resolve(answer !== 'no');
      };
      setConsentAsk(feature);
    });
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

  const t = (path: string, vars?: Record<string, string | number>): string => {
    const text = lookup(CATALOGS[lang] ?? en, path) ?? lookup(en, path) ?? path;
    return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
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
        capabilities,
        requestCloudConsent,
        syncNotice,
        dismissSyncNotice: () => setSyncNotice(null),
      }}
    >
      {children}
      {consentAsk && <ConsentDialog feature={consentAsk} onAnswer={(a) => consentResolver.current?.(a)} />}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
