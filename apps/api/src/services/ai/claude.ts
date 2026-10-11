/**
 * Thin wrapper over the Anthropic SDK for structured (JSON-schema) calls.
 *
 * Privacy: callers pass only what the user explicitly chose to send (masked photo, redacted
 * text, transcript, report text). Nothing here logs request or response content.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { config } from '../../config.js';
import { AppError } from '../../lib/http.js';

let client: Anthropic | null = null;

export function cloudAvailable(): boolean {
  return Boolean(config.ai.apiKey);
}

function getClient(): Anthropic {
  if (!cloudAvailable()) throw new AppError(503, 'AI_UNAVAILABLE', 'Cloud AI is not configured on this server');
  if (!client) client = new Anthropic({ apiKey: config.ai.apiKey, maxRetries: 2, timeout: 90_000 });
  return client;
}

export interface StructuredCall<T> {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  /** JSON schema for structured outputs (objects need additionalProperties:false + required). */
  schema: Record<string, unknown>;
  validator: z.ZodType<T>;
  effort: 'low' | 'medium' | 'high';
  maxTokens?: number;
}

export async function structuredCall<T>(call: StructuredCall<T>): Promise<T> {
  const c = getClient();
  let msg: Anthropic.Beta.BetaMessage;
  try {
    msg = await c.beta.messages.create({
      model: config.ai.model,
      max_tokens: call.maxTokens ?? 8000,
      system: call.system,
      messages: [{ role: 'user', content: call.content }],
      output_config: { effort: call.effort, format: { type: 'json_schema', schema: call.schema } },
      // Server-side refusal fallback: on a policy decline the API re-runs on a fallback model.
      ...(config.ai.fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new AppError(429, 'RATE_LIMITED', 'The AI service is busy. Please try again shortly.');
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      throw new AppError(503, 'AI_UNAVAILABLE', 'The AI service is not available (credentials).');
    }
    if (e instanceof Anthropic.BadRequestError) throw new AppError(502, 'AI_FAILED', 'The AI service rejected the request.');
    if (e instanceof Anthropic.APIConnectionError) throw new AppError(503, 'AI_UNAVAILABLE', 'Could not reach the AI service.');
    if (e instanceof Anthropic.APIError) throw new AppError(502, 'AI_FAILED', `AI service error (${e.status ?? 'unknown'})`);
    throw e;
  }

  if (msg.stop_reason === 'refusal') throw new AppError(502, 'AI_FAILED', 'The AI service declined this request. Please enter the values yourself.');
  if (msg.stop_reason === 'max_tokens') throw new AppError(502, 'AI_FAILED', 'The AI response was cut off. Please try again.');

  const text = msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AppError(502, 'AI_FAILED', 'The AI response could not be read.');
  }
  const parsed = call.validator.safeParse(json);
  if (!parsed.success) throw new AppError(502, 'AI_FAILED', 'The AI response had an unexpected shape.');
  return parsed.data;
}

// --- JSON-schema helpers -------------------------------------------------------

export const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });

export function obj(properties: Record<string, unknown>): Record<string, unknown> {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
