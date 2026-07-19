import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { WelcomePage } from './welcome.page';
import { AuthApi } from '../../core/api/auth.api';
import { KEY_STORAGE_KEY } from '../../core/key.service';

function textOf(el: HTMLElement): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function setup(auth: Partial<AuthApi>) {
  TestBed.configureTestingModule({
    imports: [WelcomePage],
    providers: [provideRouter([]), { provide: AuthApi, useValue: auth }],
  });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(WelcomePage);
  fixture.detectChanges();
  return fixture;
}

describe('WelcomePage', () => {
  beforeEach(() => localStorage.clear());

  it('renders both equal actions on the choice screen', () => {
    const fixture = setup({ createKey: () => of({ key: 'X', createdAt: '' }) });
    const text = textOf(fixture.nativeElement);
    expect(text).toContain('Create a new key');
    expect(text).toContain('I have a key');
  });

  it('reveals the formatted key on create and persists it only after acknowledgement', () => {
    const fixture = setup({
      createKey: () => of({ key: 'AB3K-9XQ2-M7TD', createdAt: '2026-07-19T00:00:00.000Z' }),
    });
    const comp = fixture.componentInstance;

    comp.createKey();
    fixture.detectChanges();
    expect(textOf(fixture.nativeElement)).toContain('AB3K-9XQ2-M7TD');
    // Not persisted until the user confirms they saved it.
    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBeNull();

    comp.acknowledgeAndStart();
    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBe('AB3K9XQ2M7TD');
  });

  it('rejects a wrong key inline on enter and persists nothing (FR-007)', () => {
    const fixture = setup({
      getSession: () =>
        throwError(
          () => new HttpErrorResponse({ status: 401, error: { error: { code: 'invalid_key' } } }),
        ),
    });
    const comp = fixture.componentInstance;

    comp.toggleEnter();
    comp.onEntryInput('AB3K9XQ2M7TD');
    comp.submitKey();
    fixture.detectChanges();

    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBeNull();
    expect(textOf(fixture.nativeElement)).toContain("doesn't match any workspace");
  });

  it('persists and proceeds when an entered key probes 200', () => {
    const fixture = setup({
      getSession: () => of({ createdAt: '', lastUsedAt: '' }),
    });
    const comp = fixture.componentInstance;

    comp.toggleEnter();
    comp.onEntryInput('ab3k-9xq2-m7td');
    comp.submitKey();

    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBe('AB3K9XQ2M7TD');
  });
});
