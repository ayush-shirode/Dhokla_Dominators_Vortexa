import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError, sendError } from '../lib/http.js';

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', 'Route not found');
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) return sendError(res, err.status, err.code, err.message, err.details);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Photo is larger than 8 MB');
    return sendError(res, 400, 'VALIDATION_FAILED', err.message);
  }
  const e = err as { type?: string; status?: number; message?: string };
  if (e?.type === 'entity.too.large') return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  if (e?.type === 'entity.parse.failed') return sendError(res, 400, 'VALIDATION_FAILED', 'Malformed JSON body');
  // Never echo internals or request bodies (may contain personal data).
  console.error('[api] unhandled error:', e?.message ?? err);
  sendError(res, 500, 'INTERNAL', 'Internal server error');
}
