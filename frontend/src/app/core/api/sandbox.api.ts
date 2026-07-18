import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Design, SandboxSummary } from '../models.js';

interface SandboxUpsertBody {
  nodes: Design['nodes'];
  edges: Design['edges'];
  notes: Design['notes'];
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class SandboxApi {
  private readonly http = inject(HttpClient);

  list(): Observable<SandboxSummary[]> {
    return this.http.get<SandboxSummary[]>('/api/v1/sandbox/designs');
  }

  create(name: string): Observable<Design> {
    return this.http.post<Design>('/api/v1/sandbox/designs', { name });
  }

  get(id: string): Observable<Design> {
    return this.http.get<Design>(`/api/v1/sandbox/designs/${encodeURIComponent(id)}`);
  }

  update(id: string, body: SandboxUpsertBody): Observable<{ updatedAt: string }> {
    return this.http.put<{ updatedAt: string }>(
      `/api/v1/sandbox/designs/${encodeURIComponent(id)}`,
      body,
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/sandbox/designs/${encodeURIComponent(id)}`);
  }
}
