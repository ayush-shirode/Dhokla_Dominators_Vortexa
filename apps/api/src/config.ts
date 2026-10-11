import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v === undefined || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const root = process.cwd();
const resolve = (p: string) => (path.isAbsolute(p) ? p : path.resolve(root, p));

export const config = {
  port: num('PORT', 5000),
  env: process.env.NODE_ENV ?? 'development',
  isTest: process.env.NODE_ENV === 'test',
  frontendOrigins: (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  dataDir: resolve(process.env.DATA_DIR ?? './data'),
  dbFile: process.env.DB_FILE ?? '',
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.AI_MODEL || 'claude-opus-5-5',
    fallbacks: (process.env.AI_FALLBACKS ?? 'true') !== 'false',
  },
  ocr: {
    bin: process.env.TESSERACT_BIN || 'tesseract',
    tessdataDir: resolve(process.env.TESSDATA_DIR ?? './tessdata'),
    langs: process.env.OCR_LANGS || 'eng+hin',
    disabled: process.env.OCR_DISABLED === 'true',
  },
  fontDir: resolve(process.env.FONT_DIR ?? './assets/fonts'),
  adminToken: process.env.ADMIN_TOKEN ?? '',
  ruleDefaultsLastVerified: /^\d{4}-\d{2}-\d{2}$/.test(process.env.RULE_DEFAULTS_LAST_VERIFIED ?? '')
    ? (process.env.RULE_DEFAULTS_LAST_VERIFIED as string)
    : null,
  quality: {
    minSharpness: num('QUALITY_MIN_SHARPNESS', 40),
    minBrightness: num('QUALITY_MIN_BRIGHTNESS', 50),
    maxBrightness: num('QUALITY_MAX_BRIGHTNESS', 240),
    minContrast: num('QUALITY_MIN_CONTRAST', 18),
    minShortSide: num('QUALITY_MIN_SHORT_SIDE', 600),
  },
  apiVersion: '1.0.0',
};
