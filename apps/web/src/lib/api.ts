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
import {
  getDeviceCredentials,
  saveDeviceCredentials,
  getOutbox,
  removeFromOutbox,
} from './db';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

let cachedToken: string | null = null;

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return cachedToken || localStorage.getItem('rs_device_token');
  },
});

export async function initDeviceRegistration(): Promise<{ deviceId: string; token: string }> {
  const existing = await getDeviceCredentials();
  if (existing) {
    cachedToken = existing.token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('rs_device_token', existing.token);
    }
    return existing;
  }

  try {
    const reg = await api.devices.register();
    await saveDeviceCredentials(reg.deviceId, reg.token);
    cachedToken = reg.token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('rs_device_token', reg.token);
    }
    return reg;
  } catch (err) {
    console.warn('Offline device registration fallback', err);
    const offlineCreds = {
      deviceId: `offline-${crypto.randomUUID()}`,
      token: `offline-${crypto.randomUUID()}`,
    };
    await saveDeviceCredentials(offlineCreds.deviceId, offlineCreds.token);
    cachedToken = offlineCreds.token;
    return offlineCreds;
  }
}

export async function flushOutbox(): Promise<{ syncedCount: number; errors: number }> {
  const outbox = await getOutbox();
  if (outbox.length === 0) return { syncedCount: 0, errors: 0 };

  try {
    const res = await api.sync.batch(outbox.slice(0, 50));
    let synced = 0;
    let errCount = 0;
    if (res && res.results) {
      for (let i = 0; i < res.results.length; i++) {
        const itemResult = res.results[i];
        const op = outbox[i];
        if (itemResult.status === 'applied' || itemResult.status === 'stale') {
          await removeFromOutbox(op.opId);
          synced++;
        } else {
          errCount++;
        }
      }
    }
    return { syncedCount: synced, errors: errCount };
  } catch {
    return { syncedCount: 0, errors: outbox.length };
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
