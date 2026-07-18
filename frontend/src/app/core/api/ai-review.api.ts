import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, throwError } from 'rxjs';
import { SKIP_ERROR_TOAST } from '../http-error.interceptor.js';
import type { AiReviewGetResponse, AiReviewPostResponse } from '../models.js';

export interface AiReviewApiError {
  code: string;
  message: string;
}

export interface AiReviewRequestOptions {
  force?: boolean;
  deep?: boolean;
}

function toApiError(err: unknown): AiReviewApiError {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: { code?: string; message?: string } } | null;
    return {
      code: body?.error?.code ?? 'ai_upstream_error',
      message: body?.error?.message ?? `Request failed (${err.status}).`,
    };
  }
  return { code: 'ai_upstream_error', message: 'Request failed.' };
}

@Injectable({ providedIn: 'root' })
export class AiReviewApi {
  private readonly http = inject(HttpClient);

  /**
   * POST /levels/:id/ai-review. Errors are translated to `{ code, message }` (the panel
   * renders its own per-code UI, so the request opts out of the generic error toast).
   * The returned Observable is cold — unsubscribing (the panel's Cancel button) aborts
   * the underlying HTTP request, standing in for an AbortSignal in Angular's HttpClient.
   */
  requestReview(levelId: string, opts: AiReviewRequestOptions = {}): Observable<AiReviewPostResponse> {
    return this.http
      .post<AiReviewPostResponse>(
        `/api/v1/levels/${encodeURIComponent(levelId)}/ai-review`,
        opts,
        { context: new HttpContext().set(SKIP_ERROR_TOAST, true) },
      )
      .pipe(catchError((err: unknown) => throwError(() => toApiError(err))));
  }

  /**
   * GET /levels/:id/ai-review — the stored review for the current saved design plus
   * availability info, so the panel can restore state on open without spending tokens.
   * Never calls upstream. Errors are normalized to `{ code, message }` like the POST.
   */
  getReview(levelId: string): Observable<AiReviewGetResponse> {
    return this.http
      .get<AiReviewGetResponse>(`/api/v1/levels/${encodeURIComponent(levelId)}/ai-review`, {
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .pipe(catchError((err: unknown) => throwError(() => toApiError(err))));
  }
}
