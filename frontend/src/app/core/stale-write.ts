/**
 * Typed optimistic-concurrency conflict (research R6, contracts/scoped-api-changes.md). The
 * save API clients translate a 409 `stale_write` response into this error so save paths can
 * branch on it instead of parsing HTTP details. It carries `current` — the winning stored
 * design — which the conflict dialog's "reload" adopts and "overwrite" re-bases on.
 */
import { HttpErrorResponse } from '@angular/common/http';
import { throwError, type Observable } from 'rxjs';
import type { ApiErrorBody, Design } from './models.js';

export class StaleWriteError extends Error {
  constructor(readonly current: Design) {
    super('stale_write');
    this.name = 'StaleWriteError';
  }
}

/** catchError mapper: turn a 409 `stale_write` into a StaleWriteError; rethrow everything else. */
export function mapStaleWrite(err: unknown): Observable<never> {
  if (err instanceof HttpErrorResponse && err.status === 409) {
    const body = err.error as (ApiErrorBody & { current?: Design }) | null;
    if (body?.error?.code === 'stale_write' && body.current) {
      return throwError(() => new StaleWriteError(body.current as Design));
    }
  }
  return throwError(() => err);
}
