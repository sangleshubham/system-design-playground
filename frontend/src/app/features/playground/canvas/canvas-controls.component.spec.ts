import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { CanvasControlsComponent } from './canvas-controls.component';
import { PlaygroundStore } from '../state/playground.store';
import { ConfirmDialogService } from '../../../shared/confirm-dialog.service';
import { KeyService } from '../../../core/key.service';
import type { CanvasComponent } from './canvas.component';
import type { Component, Design, Level } from '../../../core/models';

const components: Component[] = [
  { id: 'client', name: 'Client', tech: '', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
  { id: 'cdn', name: 'CDN', tech: '', category: 'networking', description: '', costPerHr: 0, latencyMs: 0, icon: 'networking' },
];

const level = { id: 'l', missions: [] } as unknown as Level;

const seeded: Design = {
  id: 'd', levelId: 'l', name: null, revealedHintCount: 0, updatedAt: '', notes: [],
  nodes: [
    { id: 'a', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 },
    { id: 'b', componentId: 'cdn', displayName: 'CDN', note: '', x: 100, y: 0 },
  ],
  edges: [],
};

describe('CanvasControlsComponent (US1 Copy/Paste)', () => {
  let store: PlaygroundStore;
  let canvasStub: { paste: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    canvasStub = { paste: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CanvasControlsComponent],
      providers: [
        PlaygroundStore,
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(false) } },
      ],
    });
    store = TestBed.inject(PlaygroundStore);
    store.setCatalog(components);
    store.hydrate(level, seeded);
  });

  function create(): ComponentFixture<CanvasControlsComponent> {
    const fixture = TestBed.createComponent(CanvasControlsComponent);
    fixture.componentRef.setInput('canvas', canvasStub as unknown as CanvasComponent);
    fixture.detectChanges();
    return fixture;
  }

  const button = (fixture: ComponentFixture<CanvasControlsComponent>, label: string): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

  it('renders Copy and Paste buttons', () => {
    const fixture = create();
    expect(button(fixture, 'Copy selection')).toBeTruthy();
    expect(button(fixture, 'Paste')).toBeTruthy();
  });

  it('Copy follows canCopy: disabled with no selection, enabled once selected', () => {
    const fixture = create();
    expect(button(fixture, 'Copy selection').disabled).toBe(true);
    store.setSelection({ nodes: ['a'], edges: [] });
    fixture.detectChanges();
    expect(button(fixture, 'Copy selection').disabled).toBe(false);
  });

  it('Paste follows canPaste: disabled until something is copied', () => {
    const fixture = create();
    expect(button(fixture, 'Paste').disabled).toBe(true);
    store.setSelection({ nodes: ['a'], edges: [] });
    store.copySelection();
    fixture.detectChanges();
    expect(button(fixture, 'Paste').disabled).toBe(false);
  });

  it('clicking Copy invokes store.copySelection', () => {
    const fixture = create();
    store.setSelection({ nodes: ['a', 'b'], edges: [] });
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'copySelection');
    button(fixture, 'Copy selection').click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.clipboard()).not.toBeNull();
  });

  it('clicking Paste routes through the shared canvas paste path', () => {
    const fixture = create();
    store.setSelection({ nodes: ['a'], edges: [] });
    store.copySelection();
    fixture.detectChanges();
    button(fixture, 'Paste').click();
    expect(canvasStub.paste).toHaveBeenCalledTimes(1);
  });

  it('both buttons are disabled while the canvas is locked', () => {
    const fixture = create();
    store.setSelection({ nodes: ['a'], edges: [] });
    store.copySelection();
    store.toggleLock();
    fixture.detectChanges();
    expect(button(fixture, 'Copy selection').disabled).toBe(true);
    expect(button(fixture, 'Paste').disabled).toBe(true);
  });
});

// US5 (contract C4 G4–G6, data-model E3): the "Copy my key" button copies the FULL access key
// (never the masked display form), awaits the clipboard write so success/failure differ, and
// auto-reverts after 1.5 s. It is absent when no key is stored.
describe('CanvasControlsComponent (US5 Copy my key)', () => {
  const FULL_KEY = 'ABCD-1234-EFGH';
  const keySignal = signal<string | null>(FULL_KEY);
  const keyStub = { key: keySignal, hasKey: computed(() => keySignal() !== null) };
  const canvasStub = { paste: vi.fn() } as unknown as CanvasComponent;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    keySignal.set(FULL_KEY);
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    TestBed.configureTestingModule({
      imports: [CanvasControlsComponent],
      providers: [
        PlaygroundStore,
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(false) } },
        { provide: KeyService, useValue: keyStub },
      ],
    });
    TestBed.inject(PlaygroundStore).setCatalog(components);
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  function create(): ComponentFixture<CanvasControlsComponent> {
    const fixture = TestBed.createComponent(CanvasControlsComponent);
    fixture.componentRef.setInput('canvas', canvasStub);
    fixture.detectChanges();
    return fixture;
  }

  const copyBtn = (fixture: ComponentFixture<CanvasControlsComponent>): HTMLButtonElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Copy my key"]');

  it('renders the Copy my key button when a key is stored', () => {
    expect(copyBtn(create())).toBeTruthy();
  });

  it('is absent when no key is stored (nothing to copy)', () => {
    keySignal.set(null);
    expect(copyBtn(create())).toBeNull();
  });

  it('writes the FULL key verbatim (never a masked/truncated form) and enters copied state', async () => {
    const fixture = create();
    await fixture.componentInstance.copyKey();
    expect(writeText).toHaveBeenCalledWith(FULL_KEY);
    expect(fixture.componentInstance.copyState()).toBe('copied');
  });

  it('auto-reverts the copied state to idle after 1.5 s', async () => {
    vi.useFakeTimers();
    const fixture = create();
    await fixture.componentInstance.copyKey();
    expect(fixture.componentInstance.copyState()).toBe('copied');
    vi.advanceTimersByTime(1500);
    expect(fixture.componentInstance.copyState()).toBe('idle');
  });

  it('enters the error state when the clipboard write rejects', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    const fixture = create();
    await fixture.componentInstance.copyKey();
    expect(fixture.componentInstance.copyState()).toBe('error');
  });

  it('enters the error state when the Clipboard API is absent', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const fixture = create();
    await fixture.componentInstance.copyKey();
    expect(fixture.componentInstance.copyState()).toBe('error');
  });
});
