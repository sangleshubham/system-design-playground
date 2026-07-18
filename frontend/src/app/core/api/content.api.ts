import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Component, MapView } from '../models.js';

@Injectable({ providedIn: 'root' })
export class ContentApi {
  private readonly http = inject(HttpClient);

  getComponents(): Observable<Component[]> {
    return this.http.get<Component[]>('/api/v1/components');
  }

  getMap(): Observable<MapView> {
    return this.http.get<MapView>('/api/v1/map');
  }
}
