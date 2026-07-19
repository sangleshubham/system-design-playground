import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { KeyService, KEY_STORAGE_KEY } from './key.service';

describe('KeyService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('starts empty when nothing is stored', () => {
    const svc = TestBed.inject(KeyService);
    expect(svc.hasKey()).toBe(false);
    expect(svc.key()).toBeNull();
  });

  it('hydrates from localStorage at construction', () => {
    localStorage.setItem(KEY_STORAGE_KEY, 'ABCD1234WXYZ');
    const svc = TestBed.inject(KeyService);
    expect(svc.hasKey()).toBe(true);
    expect(svc.key()).toBe('ABCD1234WXYZ');
  });

  it('setKey persists to localStorage and flips the signals', () => {
    const svc = TestBed.inject(KeyService);
    svc.setKey('ABCD1234WXYZ');
    expect(svc.hasKey()).toBe(true);
    expect(svc.key()).toBe('ABCD1234WXYZ');
    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBe('ABCD1234WXYZ');
  });

  it('clear forgets the key on this device', () => {
    const svc = TestBed.inject(KeyService);
    svc.setKey('ABCD1234WXYZ');
    svc.clear();
    expect(svc.hasKey()).toBe(false);
    expect(svc.key()).toBeNull();
    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBeNull();
  });
});
