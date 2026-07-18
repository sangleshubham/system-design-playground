import { describe, it, expect } from 'vitest';
import { tidyLayout } from './tidy';
import { PlaygroundStore } from '../state/playground.store';
import type { Component, Design, DesignEdge, DesignNode, Level } from '../../../core/models';

const node = (id: string, componentId: string): DesignNode => ({
  id,
  componentId,
  displayName: componentId,
  note: '',
  x: 0,
  y: 0,
});

describe('tidyLayout', () => {
  it('returns a position for every node and leaves edges untouched (US2 scenario 6)', () => {
    const nodes = [node('a', 'client'), node('b', 'cdn'), node('c', 'web-server')];
    const edges: DesignEdge[] = [
      { id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' },
      { id: 'e2', sourceNodeId: 'b', targetNodeId: 'c' },
    ];
    const positions = tidyLayout(nodes, edges);
    expect(positions.size).toBe(3);
    for (const n of nodes) {
      expect(positions.has(n.id)).toBe(true);
    }
  });

  it('applying a tidy layout via the store commits once and preserves edges', () => {
    const store = new PlaygroundStore();
    const components: Component[] = [
      { id: 'client', name: 'Client', tech: '', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
      { id: 'cdn', name: 'CDN', tech: '', category: 'networking', description: '', costPerHr: 0, latencyMs: 0, icon: 'networking' },
    ];
    store.setCatalog(components);
    const design: Design = {
      id: 'd', levelId: 'l', name: null, revealedHintCount: 0, updatedAt: '', notes: [],
      nodes: [node('a', 'client'), node('b', 'cdn')],
      edges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' }],
    };
    store.hydrate({ id: 'l', missions: [] } as unknown as Level, design);

    const before = store.edges();
    store.applyLayout(tidyLayout(store.nodes(), store.edges()));

    expect(store.edges()).toEqual(before); // connections unchanged
    // one committed mutation -> one undo returns to the pre-tidy positions
    store.undo();
    expect(store.nodes().every((n) => n.x === 0 && n.y === 0)).toBe(true);
  });
});
