/**
 * @repo/shared — RationSaathi domain types, deterministic engine, neutral templates,
 * privacy guards, offline extractors, static data and the typed API client.
 *
 * Everything here is dependency-free and safe to run in the browser (offline) and on the server.
 */
export * from './types.js';
export * from './constants.js';
export * from './engine.js';
export * from './guards.js';
export * from './report.js';
export * from './extract.js';
export * from './faq.js';
export { getStateCardTypes, getNfsaEntry, getOtherCardTypes, ruleFromEntry, CARD_CATALOG_CHECKED_ON, STATE_CARD_TYPES } from './cardCatalog.js';
export type { CardTypeEntry, StateCardTypes } from './cardCatalog.js';
export * from './api-client.js';

/** Monorepo-wide config (kept from the original scaffold). */
export const APP_CONFIG = {
  APP_NAME: 'RationSaathi',
  DEFAULT_API_PORT: 5000,
  DEFAULT_WEB_PORT: 3000,
  API_PREFIX: '/api/v1',
} as const;

/** Liveness payload returned by GET /health. */
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  timestamp: string;
  version: string;
  db: 'ok' | 'error';
  /** @deprecated scaffold field, kept so the original demo page still compiles. */
  service?: string;
  /** @deprecated scaffold field. */
  environment?: string;
}

/** @deprecated Scaffold demo type; RationSaathi has no user accounts (devices only). */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
}
