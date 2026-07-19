import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ACCESS_KEY_HEADER, SKIP_AUTH_REDIRECT } from '../key.interceptor.js';
import { SKIP_ERROR_TOAST } from '../http-error.interceptor.js';

export interface CreateKeyResponse {
  key: string;
  createdAt: string;
}

export interface SessionResponse {
  createdAt: string;
  lastUsedAt: string;
}

/** Auth endpoints (contracts/auth-api.md). The only client that ever handles a raw key. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  /** POST /auth/keys — mint a new workspace + key. Public (no key attached). */
  createKey(): Observable<CreateKeyResponse> {
    return this.http.post<CreateKeyResponse>('/api/v1/auth/keys', {});
  }

  /**
   * GET /auth/session — probe a key / load session facts. When `candidateKey` is given, the
   * key is attached explicitly and auth-redirect + generic toast are suppressed so the
   * welcome page can render a 401 inline (FR-007). Without it, the stored key is used.
   */
  getSession(candidateKey?: string): Observable<SessionResponse> {
    if (candidateKey === undefined) {
      return this.http.get<SessionResponse>('/api/v1/auth/session');
    }
    const context = new HttpContext().set(SKIP_AUTH_REDIRECT, true).set(SKIP_ERROR_TOAST, true);
    return this.http.get<SessionResponse>('/api/v1/auth/session', {
      headers: { [ACCESS_KEY_HEADER]: candidateKey },
      context,
    });
  }
}
