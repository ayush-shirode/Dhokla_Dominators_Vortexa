'use client';

/**
 * "Install the app" support (PWA). Chrome/Edge/Samsung Internet on Android fire
 * `beforeinstallprompt` once, early in page load, so it is captured here at module load and kept
 * until a screen asks for it. iPhone Safari has no such event: the app shows the Share → "Add to
 * Home Screen" steps instead. Installing needs HTTPS (or localhost).
 */
import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode =
  /** Already running as an installed app: show nothing. */
  | 'installed'
  /** The browser offered a one-tap install. */
  | 'prompt'
  /** iPhone / iPad Safari: Share → Add to Home Screen. */
  | 'ios'
  /** Other phone browsers: use the browser menu. */
  | 'manual'
  /** Desktop or unsupported: nothing to offer. */
  | 'none';

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for our own button
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function computeMode(): InstallMode {
  if (typeof window === 'undefined') return 'none';
  if (installed || isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/Android|Mobile/i.test(ua)) return 'manual';
  return 'none';
}

let snapshot: InstallMode = 'none';
function getSnapshot(): InstallMode {
  const next = computeMode();
  if (next !== snapshot) snapshot = next;
  return snapshot;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const mq = typeof window !== 'undefined' ? window.matchMedia?.('(display-mode: standalone)') : null;
  mq?.addEventListener?.('change', cb);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener?.('change', cb);
  };
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'none');
}

/** Shows the browser's install dialog. Resolves true when the user installed the app. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome === 'accepted';
}

const DISMISS_KEY = 'rs_install_dismissed_at';
const DISMISS_DAYS = 14;

export function installDismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}
