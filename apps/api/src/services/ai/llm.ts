/**
 * Client for an OpenAI-compatible chat API serving open models. Defaults to NVIDIA's hosted API
 * (https://integrate.api.nvidia.com/v1), but any compatible endpoint works (set LLM_BASE_URL).
 *
 * Structured output does not depend on provider-specific features: the JSON schema is put in the
 * prompt, the reply is parsed leniently and validated with zod, and one repair attempt is made.
 *
 * Privacy: callers pass only what the user chose to send (masked photo, redacted text, transcript,
 * report text). Nothing here logs request or response content.
 */
import type { z } from 'zod';
import { config } from '../../config.js';
import { AppError } from '../../lib/http.js';

export type LlmContent = { type: 'text'; text: string } | { type: 'image'; mediaType: string; base64: string };

/** fast = chat, voice, short extraction · translate = translation · vision = reading photos */
export type LlmTask = 'fast' | 'translate' | 'vision';

export function cloudAvailable(): boolean {
  return Boolean(config.llm.apiKey);
}

export function modelFor(task: LlmTask): string {
  return config.llm.models[task];
}

export interface StructuredCall<T> {
  system: string;
  content: LlmContent[];
  /** JSON schema describing the reply (objects need additionalProperties:false + required). */
  schema: Record<string, unknown>;
  validator: z.ZodType<T>;
  task: LlmTask;
  maxTokens?: number;
  temperature?: number;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string | Array<Record<string, unknown>> };

/** Pulls a JSON object out of a model reply: strips reasoning blocks, code fences and chatter. */
export function extractJson(text: string): unknown {
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fence) t = fence[1]!.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object found');
  return JSON.parse(t.slice(start, end + 1));
}

function buildMessages(call: StructuredCall<unknown>): ChatMessage[] {
  const instructions =
    `${call.system}\n\nReply with ONLY one JSON object that matches this JSON Schema. ` +
    `No explanation, no markdown, no code fences.\n${JSON.stringify(call.schema)}`;
  const hasImage = call.content.some((c) => c.type === 'image');
  const parts = call.content.map((c) =>
    c.type === 'text'
      ? { type: 'text', text: c.text }
      : { type: 'image_url', image_url: { url: `data:${c.mediaType};base64,${c.base64}` } },
  );
  if (!hasImage) {
    return [
      { role: 'system', content: instructions },
      { role: 'user', content: call.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n\n') },
    ];
  }
  // Several open vision models reject a system prompt together with an image: put it in the user turn.
  return [{ role: 'user', content: [{ type: 'text', text: instructions }, ...parts] }];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(body: Record<string, unknown>): Promise<{ status: number; json: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.llm.timeoutMs);
  try {
    const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.llm.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON error page */
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

/** One completion with retries for rate limits, server errors and network failures. */
async function complete(model: string, messages: ChatMessage[], opts: { maxTokens: number; temperature: number }): Promise<string> {
  let jsonMode = true;
  for (let attempt = 0; attempt < 4; attempt++) {
    let r: { status: number; json: unknown };
    try {
      r = await post({
        model,
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        stream: false,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      });
    } catch {
      if (attempt < 3) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw new AppError(503, 'AI_UNAVAILABLE', 'Could not reach the AI service.');
    }

    if (r.status >= 200 && r.status < 300) {
      const text = (r.json as { choices?: Array<{ message?: { content?: string | null } }> })?.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.trim()) return text;
      throw new AppError(502, 'AI_FAILED', 'The AI service returned an empty reply.');
    }
    if (r.status === 401 || r.status === 403) throw new AppError(503, 'AI_UNAVAILABLE', 'The AI service is not available (credentials).');
    if (r.status === 404) throw new AppError(503, 'AI_UNAVAILABLE', `The AI model "${model}" is not available.`);
    if (r.status === 429 || r.status >= 500) {
      if (attempt < 3) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw r.status === 429
        ? new AppError(429, 'RATE_LIMITED', 'The AI service is busy. Please try again shortly.')
        : new AppError(503, 'AI_UNAVAILABLE', 'The AI service is having problems. Please try again later.');
    }
    // 400 and friends: some models do not support JSON mode. Retry once without it.
    if (jsonMode) {
      jsonMode = false;
      continue;
    }
    throw new AppError(502, 'AI_FAILED', 'The AI service rejected the request.');
  }
  throw new AppError(502, 'AI_FAILED', 'The AI service could not complete the request.');
}

export async function structuredCall<T>(call: StructuredCall<T>): Promise<T> {
  if (!cloudAvailable()) throw new AppError(503, 'AI_UNAVAILABLE', 'Cloud AI is not configured on this server');
  const model = modelFor(call.task);
  const opts = { maxTokens: call.maxTokens ?? 4096, temperature: call.temperature ?? 0.1 };
  const messages = buildMessages(call as StructuredCall<unknown>);

  let reply = await complete(model, messages, opts);
  for (let repair = 0; repair < 2; repair++) {
    try {
      const parsed = call.validator.safeParse(extractJson(reply));
      if (parsed.success) return parsed.data;
    } catch {
      /* fall through to the repair attempt */
    }
    if (repair === 1) break;
    reply = await complete(
      model,
      [
        ...messages,
        { role: 'assistant', content: reply.slice(0, 6000) },
        { role: 'user', content: 'That was not valid for the schema. Reply again with ONLY the corrected JSON object.' },
      ],
      opts,
    );
  }
  throw new AppError(502, 'AI_FAILED', 'The AI response could not be read.');
}

// --- JSON-schema helpers -------------------------------------------------------

export const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });

export function obj(properties: Record<string, unknown>): Record<string, unknown> {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
