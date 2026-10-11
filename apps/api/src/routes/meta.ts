import { Router } from 'express';
import { z } from 'zod';
import {
  DISCLAIMER,
  ENGINE_VERSION,
  INDIAN_STATES,
  LIMITS,
  LOW_CONFIDENCE_THRESHOLD,
  POSSIBLE_CAUSES,
  PRODUCT_NAME,
  RULE_DEFAULTS,
  SUPPORTED_LANGUAGES,
  checkNeutrality,
  redactSensitiveIds,
  type MetaInfo,
  type RuleDefault,
} from '@repo/shared';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { h, ok, parse } from '../lib/http.js';
import { cloudAvailable } from '../services/ai/claude.js';
import { pdfLanguages } from '../services/export.js';
import { ocrCapability } from '../services/ocr.js';

export const metaRouter = Router();

export function ruleDefaults(): RuleDefault[] {
  return RULE_DEFAULTS.map((r) => ({ ...r, lastVerified: config.ruleDefaultsLastVerified }));
}

metaRouter.get('/health', (_req, res) => {
  let db: 'ok' | 'error' = 'ok';
  try {
    getDb().prepare('SELECT 1').get();
  } catch {
    db = 'error';
  }
  ok(res, { status: db === 'ok' ? 'ok' : 'degraded', uptime: process.uptime(), version: config.apiVersion, db, timestamp: new Date().toISOString() });
});

metaRouter.get('/meta', (_req, res) => {
  const ocr = ocrCapability();
  const meta: MetaInfo = {
    productName: PRODUCT_NAME,
    apiVersion: config.apiVersion,
    engineVersion: ENGINE_VERSION,
    languages: SUPPORTED_LANGUAGES.map(({ code, name, nativeName, speechLang, templateSupported }) => ({ code, name, nativeName, speechLang, templateSupported })),
    ruleDefaults: ruleDefaults(),
    possibleCauses: POSSIBLE_CAUSES,
    lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
    limits: { maxPhotoBytes: LIMITS.maxPhotoBytes, maxTextChars: LIMITS.maxTextChars, maxRecordsPerCheck: LIMITS.maxRecordsPerCheck },
    capabilities: { cloudAi: cloudAvailable(), localOcr: ocr.available, localOcrLanguages: ocr.langs, pdfLanguages: pdfLanguages() },
  };
  ok(res, { ...meta, disclaimer: DISCLAIMER });
});

metaRouter.get('/states', (_req, res) => ok(res, INDIAN_STATES));

metaRouter.get('/entitlement-rules/defaults', (_req, res) => ok(res, ruleDefaults()));

const textBody = z.object({ text: z.string().max(LIMITS.maxTextChars * 4) });

metaRouter.post('/utils/neutrality-check', h((req, res) => ok(res, checkNeutrality(parse(textBody, req.body).text))));
metaRouter.post('/utils/redact', h((req, res) => ok(res, redactSensitiveIds(parse(textBody, req.body).text))));
