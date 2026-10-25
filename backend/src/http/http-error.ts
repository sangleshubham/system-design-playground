/**
 * HTTP error envelope + central handler. All error responses use the shape
 * `{ error: { code, message } }` per contracts/api.md (400 / 404 / 409 / 500).
 */
import type { NextFunction, Request, Response } from 'express';

export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export const badRequest = (message: string, extra?: Record<string, unknown>) =>
  new ApiHttpError(400, 'validation_error', message, extra);

export const notFound = (message: string) => new ApiHttpError(404, 'not_found', message);

/** Standard message for an optimistic-concurrency conflict (research R6, FR-011). */
export const STALE_WRITE_MESSAGE = 'This design changed since you loaded it.';

/**
 * 409 for a stale design save. Unlike the standard envelope, the winning row rides at the
 * TOP LEVEL as `current` (sibling to `error`) so the client can adopt it directly
 * (contracts/scoped-api-changes.md § Concurrency delta).
 */
export function sendStaleWrite(res: Response, current: unknown): void {
  res.status(409).json({
    error: { code: 'stale_write', message: STALE_WRITE_MESSAGE },
    current,
  });
}

/** Express error-handling middleware (must be registered last). */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // next is required for Express to treat this as an error handler
  _next: NextFunction,
): void {
  if (err instanceof ApiHttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.extra ?? {}) },
    });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { code: 'internal_error', message: 'An unexpected error occurred.' },
  });
}
