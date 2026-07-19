import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { KeyService, KEY_STORAGE_KEY } from './core/key.service';

function textOf(el: HTMLElement): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function setup() {
  TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return fixture;
}

describe('App shell — workspace affordance (FR-005)', () => {
  beforeEach(() => localStorage.clear());

  it('hides the workspace menu when no key is stored', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.workspace-menu')).toBeNull();
  });

  it('shows a masked stub (last 4 only) and a Switch key action when a key is stored', () => {
    localStorage.setItem(KEY_STORAGE_KEY, 'ABCD1234WXYZ');
    const fixture = setup();
    const menu = fixture.nativeElement.querySelector('.workspace-menu');
    expect(menu).not.toBeNull();
    const text = textOf(menu);
    expect(text).toContain('WXYZ'); // last 4
    expect(text).not.toContain('ABCD'); // never the full key
    expect(text).toContain('Switch key');
  });

  it('Switch key clears the stored key on this device', () => {
    localStorage.setItem(KEY_STORAGE_KEY, 'ABCD1234WXYZ');
    const fixture = setup();
    fixture.nativeElement.querySelector('.switch-key').click();
    expect(TestBed.inject(KeyService).hasKey()).toBe(false);
    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBeNull();
  });
});
