import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CostIndicatorComponent } from './cost-indicator.component';
import { PlaygroundStore } from '../state/playground.store';
import type { Component, Design, Level } from '../../../core/models';

const components: Component[] = [
  { id: 'client', name: 'Client', tech: 'Browser', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
  { id: 'db', name: 'DB', tech: 'PostgreSQL', category: 'storage', description: '', costPerHr: 2.0, latencyMs: 10, icon: 'storage' },
  { id: 'cache', name: 'Cache', tech: 'Redis', category: 'caching', description: '', costPerHr: 1.5, latencyMs: 1, icon: 'caching' },
];

const level = {
  id: 'level-1', actId: 'act-1', order: 1, title: 'T', difficulty: 'easy', summary: '', narrative: '',
  objectives: [],
  specs: { functional: [], nonFunctional: [], constraints: [], budgetPerHr: 3.0, capacity: [], tradeoff: '' },
  missions: [{ id: 'm1', kind: 'add', componentId: 'client', label: 'Add Client' }],
  topologyRules: [], resilienceRules: [], recommendedComponentIds: [], hints: [],
} as unknown as Level;

const design: Design = {
  id: 'd1', levelId: 'level-1', name: null, revealedHintCount: 0, updatedAt: '', notes: [], edges: [],
  nodes: [
    { id: 'a', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 },
    { id: 'b', componentId: 'db', displayName: 'DB', note: '', x: 100, y: 0 },
  ],
};

describe('CostIndicatorComponent', () => {
  let store: PlaygroundStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CostIndicatorComponent], providers: [PlaygroundStore] });
    store = TestBed.inject(PlaygroundStore);
    store.setCatalog(components);
    store.hydrate(level, design);
  });

  it('shows total cost against the level budget, within budget', () => {
    const fixture = TestBed.createComponent(CostIndicatorComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('$2.0'); // client 0 + db 2.0
    expect(text).toContain('$3.0'); // budget
    expect(text).toContain('/hr');
    expect(fixture.nativeElement.querySelector('.cost-pill.over')).toBeNull();
  });

  it('flips to the over-budget state when node costs exceed the budget', () => {
    const fixture = TestBed.createComponent(CostIndicatorComponent);
    store.addNodeFromPalette('cache', { x: 0, y: 0 }); // 2.0 + 1.5 = 3.5 > 3.0
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cost-pill.over')).not.toBeNull();
    expect((fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ')).toContain('$3.5');
  });
});
