/**
 * Typed fetch client for the RationSaathi API. Works in the browser and Node 18+.
 * Every method unwraps the `{success, data}` envelope and throws `ApiError` on failure.
 */
import type {
  AiDraft,
  ApiResponse,
  ApiWarning,
  ChatMessage,
  ChatReply,
  Check,
  CheckInput,
  ConfirmDraftInput,
  ConfirmDraftResult,
  DeviceRegistration,
  DiscrepancySummary,
  DistributionRecord,
  ErrorCode,
  ExportFormat,
  Filing,
  FilingInput,
  GrievanceChannel,
  GrievanceDraft,
  GrievanceDraftInput,
  Household,
  HouseholdInput,
  IndianState,
  LanguageCode,
  MetaInfo,
  NeutralityResult,
  Photo,
  ReadbackPayload,
  RecordInput,
  Report,
  RuleDefault,
  SyncOperation,
  SyncOperationResult,
  SyncSnapshot,
  TemplateLanguage,
  TranslationPurpose,
} from './types.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  /** e.g. "http://localhost:5000/api/v1" */
  baseUrl: string;
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof fetch;
  /** Called with non-blocking warnings returned by any call. */
  onWarnings?: (warnings: ApiWarning[], path: string) => void;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function createApiClient(opts: ApiClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, '');
  const doFetch = opts.fetch ?? fetch;
  const state = { lastWarnings: [] as ApiWarning[] };

  function url(path: string, query?: Query): string {
    const qs = query
      ? Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  }

  async function headers(json: boolean): Promise<Record<string, string>> {
    const h: Record<string, string> = { Accept: 'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    const token = opts.getToken ? await opts.getToken() : null;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async function send(method: string, path: string, body?: unknown, query?: Query, raw = false): Promise<Response> {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    let res: Response;
    try {
      res = await doFetch(url(path, query), {
        method,
        headers: await headers(body !== undefined && !isForm),
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      });
    } catch (e) {
      throw new ApiError(0, 'NETWORK_ERROR', e instanceof Error ? e.message : 'Network error');
    }
    if (raw && res.ok) return res;
    return res;
  }

  async function call<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const res = await send(method, path, body, query);
    let payload: ApiResponse<T> | null = null;
    try {
      payload = (await res.json()) as ApiResponse<T>;
    } catch {
      throw new ApiError(res.status, 'INTERNAL', `Unexpected response (${res.status})`);
    }
    if (!payload.success) {
      throw new ApiError(res.status, payload.error.code, payload.error.message, payload.error.details);
    }
    state.lastWarnings = payload.warnings ?? [];
    if (payload.warnings?.length && opts.onWarnings) opts.onWarnings(payload.warnings, path);
    return payload.data;
  }

  async function blob(path: string, query?: Query): Promise<Blob> {
    const res = await send('GET', path, undefined, query, true);
    if (!res.ok) {
      let err: ApiError = new ApiError(res.status, 'INTERNAL', `Request failed (${res.status})`);
      try {
        const p = (await res.json()) as ApiResponse<never>;
        if (!p.success) err = new ApiError(res.status, p.error.code, p.error.message, p.error.details);
      } catch {
        /* not JSON */
      }
      throw err;
    }
    return res.blob();
  }

  const e = encodeURIComponent;

  return {
    get lastWarnings(): ApiWarning[] {
      return state.lastWarnings;
    },

    health: () => call<{ status: string; uptime: number; version: string; db: string; timestamp: string }>('GET', '/health'),
    meta: () => call<MetaInfo>('GET', '/meta'),
    states: () => call<IndianState[]>('GET', '/states'),

    devices: {
      register: () => call<DeviceRegistration>('POST', '/devices', {}),
      me: () =>
        call<{ deviceId: string; createdAt: string; lastSeenAt: string; counts: Record<string, number> }>('GET', '/devices/me'),
      deleteAll: () => call<{ deleted: true }>('DELETE', '/devices/me'),
    },

    rules: {
      defaults: () => call<RuleDefault[]>('GET', '/entitlement-rules/defaults'),
    },

    households: {
      list: () => call<Household[]>('GET', '/households'),
      get: (id: string) => call<Household>('GET', `/households/${e(id)}`),
      put: (id: string, body: HouseholdInput) => call<Household>('PUT', `/households/${e(id)}`, body),
      delete: (id: string) => call<{ deleted: true }>('DELETE', `/households/${e(id)}`),
    },

    checks: {
      list: (householdId?: string) => call<Check[]>('GET', '/checks', undefined, { householdId }),
      get: (id: string) => call<Check>('GET', `/checks/${e(id)}`),
      put: (id: string, body: CheckInput) => call<Check>('PUT', `/checks/${e(id)}`, body),
      delete: (id: string) => call<{ deleted: true }>('DELETE', `/checks/${e(id)}`),
      records: (id: string) => call<DistributionRecord[]>('GET', `/checks/${e(id)}/records`),
      summary: (id: string) => call<DiscrepancySummary>('GET', `/checks/${e(id)}/summary`),
    },

    records: {
      get: (id: string) => call<DistributionRecord>('GET', `/records/${e(id)}`),
      put: (id: string, body: RecordInput) => call<DistributionRecord>('PUT', `/records/${e(id)}`, body),
      delete: (id: string) => call<{ deleted: true }>('DELETE', `/records/${e(id)}`),
    },

    photos: {
      upload: (file: Blob, o: { skipQualityGate?: boolean; userConfirmedNoIds?: boolean; filename?: string } = {}) => {
        const fd = new FormData();
        fd.append('image', file, o.filename ?? 'photo.jpg');
        return call<Photo>('POST', '/photos', fd, {
          skipQualityGate: o.skipQualityGate || undefined,
          userConfirmedNoIds: o.userConfirmedNoIds || undefined,
        });
      },
      blob: (id: string) => blob(`/photos/${e(id)}`),
      meta: (id: string) => call<Photo>('GET', `/photos/${e(id)}/meta`),
      delete: (id: string) => call<{ deleted: true }>('DELETE', `/photos/${e(id)}`),
    },

    ai: {
      ocr: (body: { photoId: string; checkId?: string; allowCloud?: boolean; languageHint?: LanguageCode }) =>
        call<AiDraft>('POST', '/ai/ocr', body),
      extractText: (body: { text: string; sourceType: 'sms' | 'receipt' | 'note'; checkId?: string; allowCloud?: boolean }) =>
        call<AiDraft>('POST', '/ai/extract-text', body),
      voiceParse: (body: { transcript: string; language: LanguageCode; checkId?: string; allowCloud?: boolean }) =>
        call<AiDraft>('POST', '/ai/voice/parse', body),
      translate: (body: {
        purpose: TranslationPurpose;
        targetLanguage: LanguageCode;
        reportId?: string;
        checkId?: string;
        text?: string;
        allowCloud: boolean;
      }) => call<AiDraft>('POST', '/ai/translate', body),
      getDraft: (id: string) => call<AiDraft>('GET', `/ai/drafts/${e(id)}`),
      confirmDraft: (id: string, body: ConfirmDraftInput) => call<ConfirmDraftResult>('POST', `/ai/drafts/${e(id)}/confirm`, body),
      rejectDraft: (id: string) => call<AiDraft>('POST', `/ai/drafts/${e(id)}/reject`, {}),
      chat: (body: { messages: ChatMessage[]; language: LanguageCode; allowCloud?: boolean }) =>
        call<ChatReply>('POST', '/ai/chat', body),
    },

    reports: {
      create: (checkId: string, body: { language?: TemplateLanguage } = {}) => call<Report>('POST', `/checks/${e(checkId)}/reports`, body),
      list: (checkId: string) =>
        call<Array<Pick<Report, 'id' | 'version' | 'language' | 'createdAt' | 'contentHash'>>>('GET', `/checks/${e(checkId)}/reports`),
      get: (id: string) => call<Report>('GET', `/reports/${e(id)}`),
      export: (id: string, format: ExportFormat, lang?: LanguageCode) => blob(`/reports/${e(id)}/export`, { format, lang }),
      readback: (id: string, lang?: LanguageCode) => call<ReadbackPayload>('GET', `/reports/${e(id)}/readback`, undefined, { lang }),
    },

    grievance: {
      get: (checkId: string) => call<GrievanceDraft>('GET', `/checks/${e(checkId)}/grievance`),
      put: (checkId: string, body: GrievanceDraftInput) => call<GrievanceDraft>('PUT', `/checks/${e(checkId)}/grievance`, body),
      regenerate: (checkId: string, body: { language?: TemplateLanguage } = {}) =>
        call<GrievanceDraft>('POST', `/checks/${e(checkId)}/grievance/regenerate`, body),
      readback: (checkId: string) => call<ReadbackPayload>('GET', `/checks/${e(checkId)}/grievance/readback`),
    },

    filing: {
      get: (checkId: string) => call<Filing | null>('GET', `/checks/${e(checkId)}/filing`),
      put: (checkId: string, body: FilingInput) => call<Filing>('PUT', `/checks/${e(checkId)}/filing`, body),
      delete: (checkId: string) => call<{ deleted: true }>('DELETE', `/checks/${e(checkId)}/filing`),
    },

    channels: {
      list: (stateCode?: string) => call<GrievanceChannel[]>('GET', '/grievance-channels', undefined, { stateCode }),
      get: (id: string) => call<GrievanceChannel>('GET', `/grievance-channels/${e(id)}`),
    },

    sync: {
      snapshot: (since?: string) => call<SyncSnapshot>('GET', '/sync/snapshot', undefined, { since }),
      batch: (operations: SyncOperation[]) =>
        call<{ results: SyncOperationResult[]; serverTime: string }>('POST', '/sync/batch', { operations }),
    },

    utils: {
      neutrality: (text: string) => call<NeutralityResult>('POST', '/utils/neutrality-check', { text }),
      redact: (text: string) => call<{ text: string; count: number }>('POST', '/utils/redact', { text }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
