'use client';

import { useEffect } from 'react';

/** Registers the offline service worker (production builds only; dev caching gets in the way). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  }, []);
  return null;
}
