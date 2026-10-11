'use client';

import { usePathname } from 'next/navigation';

/**
 * Route ids read from the real URL rather than from the rendered page's params.
 *
 * Offline, the service worker may answer /check/<new-id> with the cached page of another check
 * (the pages render from IndexedDB, so the HTML is the same shell). Next's router takes the
 * pathname from location.href, so this always returns the id the user is actually on.
 */
export function usePathSegment(index: number): string {
  const pathname = usePathname() ?? '';
  return decodeURIComponent(pathname.split('/')[index] ?? '');
}

/** /check/<checkId>/… */
export function useCheckId(): string {
  return usePathSegment(2);
}
