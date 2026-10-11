import {
  createApiClient,
  checkNeutrality,
  redactSensitiveIds,
  computeSummary,
  buildReportSnapshot,
  renderReportText,
  generateGrievanceDescription,
  extractFromText,
  parseVoiceTranscript,
  matchFaq,
  SUPPORTED_LANGUAGES,
  INDIAN_STATES,
  RULE_DEFAULTS,
  POSSIBLE_CAUSES,
  DISCLAIMER,
  LABEL_INFO,
} from '@repo/shared';
import { clearDeviceCredentials, getDeviceCredentials, saveDeviceCredentials } from './db';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

let cachedToken: string | null = null;

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return cachedToken || localStorage.getItem('rs_device_token');
  },
});

function setActiveToken(token: string | null): void {
  cachedToken = token;
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('rs_device_token', token);
  else localStorage.removeItem('rs_device_token');
}

/**
 * Returns this device's credentials, registering with the API if needed.
 * Offline, it returns null and the app keeps working locally; registration is retried
 * on the next sync. (No placeholder token is ever stored.)
 */
export async function registerDevice(opts: { force?: boolean } = {}): Promise<{ deviceId: string; token: string } | null> {
  const existing = await getDeviceCredentials();
  if (existing && !opts.force && !existing.token.startsWith('offline-')) {
    setActiveToken(existing.token);
    return existing;
  }
  try {
    const reg = await api.devices.register();
    await clearDeviceCredentials();
    await saveDeviceCredentials(reg.deviceId, reg.token);
    setActiveToken(reg.token);
    return reg;
  } catch (err) {
    console.warn('Device registration deferred (offline?)', err);
    if (existing?.token.startsWith('offline-')) {
      await clearDeviceCredentials();
      setActiveToken(null);
    }
    return null;
  }
}

/** Kept for existing callers. */
export const initDeviceRegistration = registerDevice;

export function forgetDeviceToken(): void {
  setActiveToken(null);
}

/** Pushes the outbox and pulls server changes (see lib/sync.ts). */
export async function flushOutbox(): Promise<{ syncedCount: number; errors: number }> {
  const { runSync } = await import('./sync');
  if (!(await registerDevice())) return { syncedCount: 0, errors: 1 };
  try {
    const r = await runSync();
    return { syncedCount: r.pushed, errors: r.errors.length };
  } catch {
    return { syncedCount: 0, errors: 1 };
  }
}

export {
  checkNeutrality,
  redactSensitiveIds,
  computeSummary,
  buildReportSnapshot,
  renderReportText,
  generateGrievanceDescription,
  extractFromText,
  parseVoiceTranscript,
  matchFaq,
  SUPPORTED_LANGUAGES,
  INDIAN_STATES,
  RULE_DEFAULTS,
  POSSIBLE_CAUSES,
  DISCLAIMER,
  LABEL_INFO,
};
