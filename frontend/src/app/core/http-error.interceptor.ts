import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast.service.js';
import type { ApiErrorBody } from './models.js';

/**
 * Set on a request's `context` to suppress the generic toast — for callers (like the AI
 * review panel) that render their own per-error-code UI instead of a toast.
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Maps the backend error envelope `{ error: { code, message } }` to a user-visible toast.
 * Two statuses are surfaced by their callers instead of a toast, so we skip them here:
 * 423 (locked) → the playground's friendly locked screen; 409 `stale_write` → the conflict
 * dialog raised by the save paths (FR-011). Every other error gets a toast. The error is
 * re-thrown so callers can still react (e.g. the RUN button re-enables).
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && !req.context.get(SKIP_ERROR_TOAST)) {
        const body = err.error as ApiErrorBody | null;
        const message = body?.error?.message ?? `Request failed (${err.status}).`;
        const isStaleWrite = err.status === 409 && body?.error?.code === 'stale_write';
        if (err.status !== 423 && !isStaleWrite) {
          toast.error(message);
        }
      }
      return throwError(() => err);
    }),
  );
};
