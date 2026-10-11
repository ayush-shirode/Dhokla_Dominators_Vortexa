import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RationSaathi — Ration Entitlement Helper',
    short_name: 'RationSaathi',
    description:
      'Compare your NFSA ration entitlement with what you received, keep the evidence, and prepare a neutral grievance you file yourself.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3f0e6',
    theme_color: '#0f6e5c',
    lang: 'en',
    categories: ['utilities', 'government'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
