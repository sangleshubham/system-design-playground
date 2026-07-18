import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HomeView } from '../models.js';

@Injectable({ providedIn: 'root' })
export class ProgressApi {
  private readonly http = inject(HttpClient);

  getProgress(): Observable<HomeView> {
    return this.http.get<HomeView>('/api/v1/progress');
  }
}
