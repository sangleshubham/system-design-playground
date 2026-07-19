import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { ACCESS_KEY_HEADER, keyInterceptor } from './key.interceptor';
import { KeyService, KEY_STORAGE_KEY } from './key.service';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([keyInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    keys: TestBed.inject(KeyService),
    router: TestBed.inject(Router),
  };
}

describe('keyInterceptor', () => {
  beforeEach(() => localStorage.clear());

  it('attaches the stored key as X-Access-Key', () => {
    localStorage.setItem(KEY_STORAGE_KEY, 'ABCD1234WXYZ');
    const { http, httpMock } = setup();
    http.get('/api/v1/map').subscribe();
    const req = httpMock.expectOne('/api/v1/map');
    expect(req.request.headers.get(ACCESS_KEY_HEADER)).toBe('ABCD1234WXYZ');
    req.flush({});
  });

  it('sends no key header when the device has none', () => {
    const { http, httpMock } = setup();
    http.get('/api/v1/health').subscribe();
    const req = httpMock.expectOne('/api/v1/health');
    expect(req.request.headers.has(ACCESS_KEY_HEADER)).toBe(false);
    req.flush({});
  });

  it('clears the session and redirects to /welcome on a 401 invalid_key', () => {
    localStorage.setItem(KEY_STORAGE_KEY, 'ABCD1234WXYZ');
    const { http, httpMock, keys, router } = setup();
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.get('/api/v1/map').subscribe({ error: () => undefined });
    httpMock
      .expectOne('/api/v1/map')
      .flush({ error: { code: 'invalid_key', message: 'x' } }, { status: 401, statusText: 'Unauthorized' });

    expect(keys.hasKey()).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(['/welcome']);
  });

  it('leaves the key intact on a 429 rate_limited', () => {
    localStorage.setItem(KEY_STORAGE_KEY, 'ABCD1234WXYZ');
    const { http, httpMock, keys } = setup();

    http.get('/api/v1/map').subscribe({ error: () => undefined });
    httpMock
      .expectOne('/api/v1/map')
      .flush({ error: { code: 'rate_limited', message: 'x' } }, { status: 429, statusText: 'Too Many Requests' });

    expect(keys.hasKey()).toBe(true);
  });
});
