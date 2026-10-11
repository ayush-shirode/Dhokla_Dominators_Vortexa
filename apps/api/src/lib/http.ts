import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import type { ApiWarning, ErrorCode } from '@repo/shared';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} not found`);

export function ok<T>(res: Response, data: T, opts: { status?: number; warnings?: ApiWarning[] } = {}): void {
  res.status(opts.status ?? 200).json({
    success: true,
    data,
    ...(opts.warnings && opts.warnings.length ? { warnings: opts.warnings } : {}),
    timestamp: new Date().toISOString(),
  });
}

export function sendError(res: Response, status: number, code: ErrorCode, message: string, details?: unknown): void {
  res.status(status).json({
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    timestamp: new Date().toISOString(),
  });
}

/** Wraps async handlers so thrown errors reach the error middleware. */
export function h(fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function zodDetails(err: z.ZodError): Array<{ path: string; message: string }> {
  return err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError(400, 'VALIDATION_FAILED', 'Request validation failed', zodDetails(r.error));
  return r.data;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** The authenticated device id (set by the auth middleware). */
export function deviceOf(req: Request): string {
  const id = (req as Request & { deviceId?: string }).deviceId;
  if (!id) throw new AppError(401, 'UNAUTHORIZED', 'Missing device token');
  return id;
}

export function param(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(v)) throw new AppError(400, 'VALIDATION_FAILED', `Invalid ${name}`);
  return v;
}
