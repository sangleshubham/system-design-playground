import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ContextPanelComponent } from './context-panel.component';
import { PlaygroundStore } from '../state/playground.store';
import type { Component, Level } from '../../../core/models';

const components: Component[] = [
  { id: 'client', name: 'Client', tech: 'Browser', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
  { id: 'cdn', name: 'CDN', tech: 'CloudFront', category: 'networking', description: '', costPerHr: 0.2, latencyMs: 15, icon: 'networking' },
];

const level = {
  id: 'level-1',
  actId: 'act-1',
  order: 1,
  title: 'The Static App',
  difficulty: 'easy',
  summary: '',
  narrative: 'Paragraph one.\n\nParagraph two.',
  objectives: ['CDN'],
  specs: { functional: ['serve pages'], nonFunctional: [], constraints: [], budgetPerHr: 3, capacity: [], tradeoff: 'edge vs freshness' },
  missions: [
    { id: 'm1', kind: 'add', componentId: 'client', label: 'Add Client' },
    { id: 'm2', kind: 'add', componentId: 'cdn', label: 'Add CDN' },
  ],
  topologyRules: [],
  resilienceRules: [],
  recommendedComponentIds: ['client', 'cdn'],
  hints: ['first hint', 'second hint'],
} as unknown as Level;

describe('ContextPanelComponent', () => {
  let store: PlaygroundStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ContextPanelComponent], providers: [PlaygroundStore] });
    store = TestBed.inject(PlaygroundStore);
    store.setCatalog(components);
    store.hydrate(level, null);
  });

  it('renders the narrative and checks a mission off when the store satisfies it', () => {
    const fixture = TestBed.createComponent(ContextPanelComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.missionProgress().label).toBe('0/2');

    store.addNodeFromPalette('client', { x: 0, y: 0 });
    fixture.detectChanges();
    const m1 = fixture.componentInstance.missionStates().find((s) => s.mission.id === 'm1');
    expect(m1?.satisfied).toBe(true);
    expect(fixture.componentInstance.missionProgress().label).toBe('1/2');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paragraph one.');
    expect(text).toContain('1/2');
  });

  it('reveals hints one at a time', () => {
    const fixture = TestBed.createComponent(ContextPanelComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.revealedHints()).toEqual([]);
    fixture.componentInstance.revealHint();
    fixture.detectChanges();
    expect(fixture.componentInstance.revealedHints()).toEqual(['first hint']);
    expect(fixture.componentInstance.hasMoreHints()).toBe(true);
  });

  it('disables the AI Review button with a notice when the parent reports it unavailable (US3)', () => {
    const fixture = TestBed.createComponent(ContextPanelComponent);
    store.addNodeFromPalette('client', { x: 0, y: 0 }); // non-empty canvas isolates the availability check
    fixture.componentRef.setInput('aiAvailable', false);
    fixture.detectChanges();

    expect(fixture.componentInstance.aiReviewDisabled()).toBe(true);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.ai-review-btn');
    expect(button?.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "AI review isn't configured on this server.",
    );
  });

  it('leaves the AI Review button enabled by default while the canvas has components (US3)', () => {
    const fixture = TestBed.createComponent(ContextPanelComponent);
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    fixture.detectChanges();

    expect(fixture.componentInstance.aiReviewDisabled()).toBe(false);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.ai-review-btn');
    expect(button?.disabled).toBe(false);
  });
});
