import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { keyGuard, noKeyGuard } from './key.guard';
import { KEY_STORAGE_KEY } from './key.service';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('key guards', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('keyGuard redirects a keyless visitor to /welcome', () => {
    const result = TestBed.runInInjectionContext(() => keyGuard(route, state));
    expect(result.toString()).toBe('/welcome');
  });

  it('keyGuard admits a visitor who holds a key', () => {
    localStorage.setItem(KEY_STORAGE_KEY, 'ABCD1234WXYZ');
    const result = TestBed.runInInjectionContext(() => keyGuard(route, state));
    expect(result).toBe(true);
  });

  it('noKeyGuard bounces a keyed visitor away from /welcome to /', () => {
    localStorage.setItem(KEY_STORAGE_KEY, 'ABCD1234WXYZ');
    const result = TestBed.runInInjectionContext(() => noKeyGuard(route, state));
    expect(result.toString()).toBe('/');
  });

  it('noKeyGuard admits a keyless visitor to /welcome', () => {
    const result = TestBed.runInInjectionContext(() => noKeyGuard(route, state));
    expect(result).toBe(true);
  });
});
