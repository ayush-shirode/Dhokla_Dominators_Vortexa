import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

process.env.LLM_API_KEY = 'test-key';
const { extractJson, structuredCall, obj } = await import('../src/services/ai/llm.js');
const { cloudChat, cloudExtract, cloudTranslate, cloudVoiceParse } = await import('../src/services/ai/tasks.js');

const reply = (content: string, status = 200) =>
  new Response(JSON.stringify(status === 200 ? { choices: [{ message: { content } }] } : { error: 'x' }), { status });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const bodyOf = (call: number) => JSON.parse((fetchMock.mock.calls[call]![1] as RequestInit).body as string);
const schema = obj({ n: { type: 'number' } });
const call = { system: 'sys', content: [{ type: 'text' as const, text: 'hi' }], schema, validator: z.object({ n: z.number() }), task: 'fast' as const };

describe('extractJson', () => {
  it('handles fences, reasoning blocks and chatter', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJson('<think>maybe {"x":0}</think>\nSure! {"a":3} hope that helps')).toEqual({ a: 3 });
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('structuredCall', () => {
  it('sends the schema in the prompt, with the configured model and bearer key', async () => {
    fetchMock.mockResolvedValueOnce(reply('{"n": 5}'));
    expect(await structuredCall(call)).toEqual({ n: 5 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-key' });
    const b = bodyOf(0);
    expect(b.model).toBe('nvidia/nemotron-3.5-lightning-30b-a3b');
    expect(b.messages[0].content).toContain('"additionalProperties":false');
  });

  it('repairs once when the first reply does not match the schema', async () => {
    fetchMock.mockResolvedValueOnce(reply('{"n": "five"}')).mockResolvedValueOnce(reply('{"n": 5}'));
    expect(await structuredCall(call)).toEqual({ n: 5 });
    expect(bodyOf(1).messages.at(-1).content).toContain('not valid');
  });

  it('gives up with AI_FAILED after a failed repair', async () => {
    fetchMock.mockResolvedValue(reply('nonsense'));
    await expect(structuredCall(call)).rejects.toMatchObject({ code: 'AI_FAILED' });
  });

  it('retries without JSON mode when the model rejects it', async () => {
    fetchMock.mockResolvedValueOnce(reply('', 400)).mockResolvedValueOnce(reply('{"n": 1}'));
    expect(await structuredCall(call)).toEqual({ n: 1 });
    expect(bodyOf(0).response_format).toBeDefined();
    expect(bodyOf(1).response_format).toBeUndefined();
  });

  it('maps credentials, missing model and rate-limit errors', async () => {
    fetchMock.mockResolvedValueOnce(reply('', 401));
    await expect(structuredCall(call)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    fetchMock.mockResolvedValueOnce(reply('', 404));
    await expect(structuredCall(call)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
  });

  it('puts the system prompt in the user turn for images and uses the vision model', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(JSON.stringify({ docType: 'receipt', docTypeConfidence: 0.9, legibility: 'good', retakeReasons: [], date: { value: '2026-10-05', confidence: 0.9, rawText: '05/10/2026' }, reference: { value: null, confidence: 0, rawText: null }, lineItems: [{ commodity: 'rice', quantityKg: 3, confidence: 0.9, rawText: 'Rice 3' }, { commodity: 'wheat', quantityKg: 2, confidence: 0.9, rawText: 'Wheat 2' }], statedTotalKg: { value: null, confidence: 0, rawText: null }, extractedText: 'Rice 3 Wheat 2' })),
    );
    const r = await cloudExtract({ image: Buffer.from('jpegbytes'), period: '2026-10', today: '2026-10-11' });
    const b = bodyOf(0);
    expect(b.model).toBe('meta/llama-3.2-90b-vision-instruct');
    expect(b.messages).toHaveLength(1);
    expect(b.messages[0].role).toBe('user');
    expect(b.messages[0].content.some((p: { type: string }) => p.type === 'image_url')).toBe(true);
    expect(r.fields.quantityKg.value).toBe(5); // summed in code, not by the model
    expect(r.quantityFormula).toBe('3 kg (rice) + 2 kg (wheat) = 5 kg');
  });
});

describe('task wiring', () => {
  it('uses the right model per task', async () => {
    fetchMock
      .mockResolvedValueOnce(reply('{"translatedText":"வணக்கம் 20","backTranslation":"Hello 20"}'))
      .mockResolvedValueOnce(reply('{"reply":"A DGRO is an officer.","outOfScope":false}'))
      .mockResolvedValueOnce(
        reply(JSON.stringify({ intent: 'add_record', date: { value: '2026-10-05', confidence: 0.9, rawText: null }, quantityKg: { value: 12, confidence: 0.9, rawText: null }, fractionOfEntitlement: { value: null, confidence: 0, rawText: null }, evidenceType: { value: null, confidence: 0, rawText: null }, commodity: { value: null, confidence: 0, rawText: null }, cardType: { value: null, confidence: 0, rawText: null }, members: { value: null, confidence: 0, rawText: null } })),
      );
    await cloudTranslate({ text: 'Hello 20', targetLanguage: 'ta' });
    await cloudChat({ messages: [{ role: 'user', content: 'What is a DGRO?' }], language: 'en' });
    const v = await cloudVoiceParse({ transcript: 'paanch tarikh ko barah kilo', language: 'hi', today: '2026-10-11', period: '2026-10' });
    expect([bodyOf(0).model, bodyOf(1).model, bodyOf(2).model]).toEqual(['google/gemma-4-31b-it', 'nvidia/nemotron-3.5-lightning-30b-a3b', 'nvidia/nemotron-3.5-lightning-30b-a3b']);
    expect(v.fields.quantityKg.value).toBe(12);
  });
});
