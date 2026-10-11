/* RationSaathi service worker — makes the app open with no network (FRONTEND_SPEC §2, §3).
 *
 * - Pages: network-first; the last good copy of each page is kept for offline use.
 * - /_next/static, icons, fonts: cache-first (file names are content-hashed).
 * - Dynamic routes (/check/<id>/…, /household/<id>/edit): offline, a page for an id that was
 *   never opened online is answered with the cached page of the same route shape. The pages
 *   render from IndexedDB and read the id from the real URL (src/lib/routeParams.ts).
 * - RSC fetches are never served from cache: if one fails offline, Next falls back to a full
 *   page load, which this worker answers from the page cache.
 * - Only same-origin requests are handled. API calls (another origin) are never cached.
 */
const VERSION = 'rs-v1';
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;

const TEMPLATE = '__offline__';
const PRECACHE_PAGES = [
  '/',
  '/onboarding',
  '/household/new',
  '/help',
  '/settings',
  '/channels',
  `/household/${TEMPLATE}/edit`,
  `/check/${TEMPLATE}`,
  `/check/${TEMPLATE}/record/new`,
  `/check/${TEMPLATE}/record/${TEMPLATE}`,
  `/check/${TEMPLATE}/paste`,
  `/check/${TEMPLATE}/voice`,
  `/check/${TEMPLATE}/capture`,
  `/check/${TEMPLATE}/report`,
  `/check/${TEMPLATE}/grievance`,
];
const PRECACHE_STATIC = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];

async function precache() {
  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  const assets = new Set(PRECACHE_STATIC);
  await Promise.allSettled(
    PRECACHE_PAGES.map(async (path) => {
      const res = await fetch(path, { credentials: 'same-origin' });
      if (!res.ok) return;
      const html = await res.clone().text();
      await pages.put(path, res);
      // Cache the JS/CSS the page needs so it can boot offline.
      for (const m of html.matchAll(/["'(](\/_next\/static\/[^"')\s]+)/g)) assets.add(m[1]);
    }),
  );
  await Promise.allSettled([...assets].map((a) => statics.add(a)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** /check/abc/report → /check/__offline__/report ; /household/abc/edit → /household/__offline__/edit */
function templateFor(pathname) {
  let m = pathname.match(/^\/check\/[^/]+\/record\/(?!new$)[^/]+\/?$/);
  if (m) return `/check/${TEMPLATE}/record/${TEMPLATE}`;
  m = pathname.match(/^\/check\/[^/]+(\/.*)?$/);
  if (m) return `/check/${TEMPLATE}${(m[1] || '').replace(/\/$/, '')}`;
  if (/^\/household\/[^/]+\/edit\/?$/.test(pathname)) return `/household/${TEMPLATE}/edit`;
  return null;
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
      cache.put(url.pathname, res.clone());
    }
    return res;
  } catch {
    const exact = await cache.match(url.pathname);
    if (exact) return exact;
    const tpl = templateFor(url.pathname);
    if (tpl) {
      const t = await cache.match(tpl);
      if (t) return t;
    }
    return (await cache.match('/')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API and third parties: untouched

  const isRsc = request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
  if (isRsc) return; // network only (see header comment)

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(cacheFirst(request));
  }
});
