/**
 * Tries the configured AI models on small realistic tasks and prints pass/fail and latency.
 *   NVIDIA_API_KEY=nvapi-... pnpm --filter @repo/api ai:check
 * Override models with LLM_MODEL_FAST / LLM_MODEL_TRANSLATE / LLM_MODEL_VISION, e.g.
 *   LLM_MODEL_VISION=meta/llama-3.2-11b-vision-instruct pnpm --filter @repo/api ai:check
 */
import sharp from 'sharp';
import { checkNeutrality } from '@repo/shared';
import { config } from '../src/config.js';
import { cloudAvailable, modelFor } from '../src/services/ai/llm.js';
import { cloudChat, cloudExtract, cloudTranslate, cloudVoiceParse, numbersPreserved } from '../src/services/ai/tasks.js';

if (!cloudAvailable()) {
  console.error('No API key. Set NVIDIA_API_KEY (or LLM_API_KEY) first. Keys: https://build.nvidia.com');
  process.exit(2);
}
console.log(`Endpoint: ${config.llm.baseUrl}\n`);

let failures = 0;
async function run(name: string, task: 'fast' | 'translate' | 'vision', fn: () => Promise<string | true>) {
  const t0 = Date.now();
  try {
    const out = await fn();
    const ms = Date.now() - t0;
    const ok = out === true;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${String(ms).padStart(6)} ms  ${modelFor(task)}${ok ? '' : `\n      ${out}`}`);
  } catch (e) {
    failures++;
    console.log(`FAIL  ${name.padEnd(34)} ${String(Date.now() - t0).padStart(6)} ms  ${modelFor(task)}\n      ${(e as Error).message}`);
  }
}

async function main() {
await run('voice: "paanch tarikh ko barah kilo"', 'fast', async () => {
  const r = await cloudVoiceParse({ transcript: 'paanch tarikh ko barah kilo mila, parchi nahi di', language: 'hi', period: '2026-10', today: '2026-10-11' });
  const ok = r.fields.quantityKg.value === 12 && r.fields.date.value === '2026-10-05';
  return ok || `got qty=${r.fields.quantityKg.value} date=${r.fields.date.value}`;
});

await run('voice: "half" is a fraction, not kg', 'fast', async () => {
  const r = await cloudVoiceParse({ transcript: 'I only got half this month', language: 'en', period: '2026-10', today: '2026-10-11', entitlementKg: 20 });
  return r.fields.quantityKg.value === 10 || `got qty=${r.fields.quantityKg.value}`;
});

await run('chat: cause question stays in scope', 'fast', async () => {
  const r = await cloudChat({ messages: [{ role: 'user', content: 'The shopkeeper gave me less. Is he stealing?' }], language: 'en' });
  return r.outOfScope === true || checkNeutrality(r.reply).ok || `reply: ${r.reply.slice(0, 120)}`;
});

await run('chat: process question answered', 'fast', async () => {
  const r = await cloudChat({ messages: [{ role: 'user', content: 'What is a DGRO?' }], language: 'en' });
  return (!r.outOfScope && /grievance|officer/i.test(r.reply)) || `reply: ${r.reply.slice(0, 120)}`;
});

const source = 'Entitlement: 20 kg. Counted received total: 12 kg. Difference: 8 kg. The cause of this difference has not been established.';
for (const [lang, check] of [['ta', /[஀-௿]/], ['mr', /[ऀ-ॿ]/], ['bn', /[ঀ-৿]/]] as const) {
  await run(`translate → ${lang} (numbers kept)`, 'translate', async () => {
    const r = await cloudTranslate({ text: source, targetLanguage: lang });
    const nums = numbersPreserved(source, r.translatedText);
    if (!check.test(r.translatedText)) return `not in the ${lang} script: ${r.translatedText.slice(0, 80)}`;
    if (!nums.ok) return `numbers changed (missing ${nums.missing}, added ${nums.added})`;
    return checkNeutrality(r.translatedText).ok || 'accusing word in translation';
  });
}

await run('vision: read a slip (3 kg + 2 kg)', 'vision', async () => {
  const text = ['FAIR PRICE SHOP 0417', 'Date: 05/10/2026', 'Rice 3.000 Kg', 'Wheat 2.000 Kg', 'Txn No 88213'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620"><rect width="100%" height="100%" fill="#fff"/>${text
    .map((l, i) => `<text x="50" y="${100 + i * 110}" font-size="62" font-family="DejaVu Sans, Liberation Sans, sans-serif">${l}</text>`)
    .join('')}</svg>`;
  const image = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  const r = await cloudExtract({ image, period: '2026-10', today: '2026-10-11' });
  const ok = r.fields.quantityKg.value === 5 && r.fields.date.value === '2026-10-05';
  return ok || `got qty=${r.fields.quantityKg.value} date=${r.fields.date.value} items=${JSON.stringify(r.lineItems.map((l) => l.quantityKg))}`;
});

console.log(failures ? `\n${failures} check(s) failed. Try another model, e.g. set LLM_MODEL_* (list: GET ${config.llm.baseUrl}/models).` : '\nAll checks passed.');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
