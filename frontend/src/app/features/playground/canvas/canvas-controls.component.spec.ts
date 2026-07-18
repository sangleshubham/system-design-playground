import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CanvasControlsComponent } from './canvas-controls.component';
import { PlaygroundStore } from '../state/playground.store';
import { ConfirmDialogService } from '../../../shared/confirm-dialog.service';
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
