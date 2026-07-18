import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Attempt, AttemptResult, DesignUpsertRequest, LevelPayload } from '../models.js';

@Injectable({ providedIn: 'root' })
export class LevelsApi {
  private readonly http = inject(HttpClient);

  getLevel(levelId: string): Observable<LevelPayload> {
    return this.http.get<LevelPayload>(`/api/v1/levels/${encodeURIComponent(levelId)}`);
  }

  saveDesign(levelId: string, body: DesignUpsertRequest): Observable<{ updatedAt: string }> {
    return this.http.put<{ updatedAt: string }>(
      `/api/v1/levels/${encodeURIComponent(levelId)}/design`,
      body,
    );
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
