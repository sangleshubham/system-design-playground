import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import type { Attempt, AttemptResult, DesignUpsertRequest, LevelPayload } from '../models.js';
import { mapStaleWrite } from '../stale-write.js';

@Injectable({ providedIn: 'root' })
export class LevelsApi {
  private readonly http = inject(HttpClient);

  getLevel(levelId: string): Observable<LevelPayload> {
    return this.http.get<LevelPayload>(`/api/v1/levels/${encodeURIComponent(levelId)}`);
  }

  /**
   * Save the level canvas. `baseUpdatedAt` is the optimistic-concurrency precondition
   * (research R6); on a mismatch the returned observable errors with a StaleWriteError.
   */
  saveDesign(
    levelId: string,
    body: DesignUpsertRequest,
    baseUpdatedAt?: string,
  ): Observable<{ updatedAt: string }> {
    return this.http
      .put<{ updatedAt: string }>(`/api/v1/levels/${encodeURIComponent(levelId)}/design`, {
        ...body,
        ...(baseUpdatedAt ? { baseUpdatedAt } : {}),
      })
      .pipe(catchError(mapStaleWrite));
  }

  runAttempt(levelId: string): Observable<AttemptResult> {
    return this.http.post<AttemptResult>(
      `/api/v1/levels/${encodeURIComponent(levelId)}/attempts`,
      {},
    );
  }

  getAttempts(levelId: string): Observable<{ attempts: Attempt[]; best: number | null }> {
    return this.http.get<{ attempts: Attempt[]; best: number | null }>(
      `/api/v1/levels/${encodeURIComponent(levelId)}/attempts`,
    );
  }
}
