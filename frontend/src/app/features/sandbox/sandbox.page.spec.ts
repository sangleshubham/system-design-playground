import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SandboxPage } from './sandbox.page';
import { ContentApi } from '../../core/api/content.api';
import { SandboxApi } from '../../core/api/sandbox.api';
import type { Component, Design } from '../../core/models';

// jsdom has no ResizeObserver, which Foblex Flow relies on.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver ??= ResizeObserverStub;

const components: Component[] = [
  { id: 'client', name: 'Client', tech: 'Browser', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
  { id: 'cache', name: 'Cache', tech: 'Redis', category: 'caching', description: '', costPerHr: 0.1, latencyMs: 1, icon: 'caching' },
];

const design: Design = {
  id: 'sb1',
  levelId: null,
  name: 'My Sandbox',
  nodes: [{ id: 'a', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 }],
  edges: [],
  notes: [],
  revealedHintCount: 0,
  updatedAt: new Date().toISOString(),
};

describe('SandboxPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SandboxPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ designId: 'sb1' })) } },
        { provide: ContentApi, useValue: { getComponents: () => of(components) } },
        { provide: SandboxApi, useValue: { get: () => of(design), update: () => of({ updatedAt: '' }) } },
      ],
    });
  });

  it('loads the design and shows its name, with no missions or RUN (FR-030)', () => {
    const fixture = TestBed.createComponent(SandboxPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('My Sandbox');
    // Sandbox mode is deliberately free of the level-play scaffolding.
    expect(text).not.toContain('RUN');
    expect(text).not.toMatch(/mission/i);
    expect(fixture.nativeElement.querySelector('app-context-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-results-dialog')).toBeNull();
    // The palette and canvas are reused from the playground.
    expect(fixture.nativeElement.querySelector('app-palette')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-canvas')).not.toBeNull();
  });
});
