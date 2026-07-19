import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { KeyService } from './key.service.js';
import { ToastService } from './toast.service.js';
import type { ApiErrorBody } from './models.js';

/** Header carrying the raw access key on every authed request (research R3). */
export const ACCESS_KEY_HEADER = 'X-Access-Key';

/**
 * Set on candidate-probe requests (the welcome page's "I have a key" flow) so a 401 does NOT
 * clear the stored session or redirect — the page surfaces the rejection inline instead
 * (FR-007). The candidate key is attached explicitly by the caller, not from storage.
 */
export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);

/**
 * Attaches the stored key to outgoing API requests and reacts to auth responses (contracts/
 * ui-auth-surfaces.md § Interceptor):
 *   - request with a stored key and no explicit header → attach `X-Access-Key`;
 *   - 401 `invalid_key` on a session request → clear the key, toast, redirect to /welcome;
 *   - 429 `rate_limited` → cooldown toast, key untouched;
 *   - network / 5xx → left to the existing httpErrorInterceptor; key untouched.
 * Registered AHEAD of httpErrorInterceptor so the header is attached before that runs.
 */
export const keyInterceptor: HttpInterceptorFn = (req, next) => {
  const keys = inject(KeyService);
  const toast = inject(ToastService);
  const router = inject(Router);

  // Attach the stored key unless the caller set the header explicitly (candidate probe).
  const stored = keys.key();
  const outgoing =
    stored && !req.headers.has(ACCESS_KEY_HEADER)
      ? req.clone({ setHeaders: { [ACCESS_KEY_HEADER]: stored } })
      : req;

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const code = (err.error as ApiErrorBody | null)?.error?.code;
        if (err.status === 401 && code === 'invalid_key' && !req.context.get(SKIP_AUTH_REDIRECT)) {
          // The session key stopped working (unknown/rotated). Forget it and send the user back.
          if (keys.hasKey()) {
            keys.clear();
            toast.error('Your workspace key is no longer valid. Please sign in again.');
            void router.navigate(['/welcome']);
          }
        } else if (err.status === 429 && code === 'rate_limited' && !req.context.get(SKIP_AUTH_REDIRECT)) {
          toast.error('Too many attempts. Please wait a minute and try again.');
        }
      }
      return throwError(() => err);
    }),
  );
};
