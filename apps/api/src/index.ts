import { APP_CONFIG } from '@repo/shared';
import { createApp } from './app.js';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { cloudAvailable } from './services/ai/claude.js';
import { ocrCapability } from './services/ocr.js';

getDb();
const app = createApp();
app.listen(config.port, () => {
  const ocr = ocrCapability();
  console.log(`[api] RationSaathi API on http://localhost:${config.port}${APP_CONFIG.API_PREFIX}`);
  console.log(`[api] cloud AI: ${cloudAvailable() ? `on (${config.ai.model})` : 'off'} · local OCR: ${ocr.available ? ocr.langs.join('+') : 'off'}`);
});
