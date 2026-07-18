import { describe, it, expect } from 'vitest';
import { designHash } from '../../src/services/ai/design-hash.js';
import type { DesignEdge, DesignNode } from '../../src/models/index.js';

function n(
  id: string,
  componentId: string,
  overrides: Partial<DesignNode> = {},
): DesignNode {
  return { id, componentId, displayName: '', note: '', x: 0, y: 0, ...overrides };
}

function e(id: string, source: string, target: string): DesignEdge {
  return { id, sourceNodeId: source, targetNodeId: target };
}

const NODES: DesignNode[] = [
  n('n1', 'client', { displayName: 'Client', x: 0, y: 0 }),
  n('n2', 'web-server', { displayName: 'Web', x: 100, y: 50 }),
  n('n3', 'blob-storage', { displayName: 'Blob', x: 200, y: 0 }),
];
const EDGES: DesignEdge[] = [e('e1', 'n1', 'n2'), e('e2', 'n2', 'n3')];

describe('designHash canonicalization', () => {
  it('is independent of node ordering', () => {
    const reordered = [NODES[2]!, NODES[0]!, NODES[1]!];
    expect(designHash(reordered, EDGES)).toBe(designHash(NODES, EDGES));
  });

  it('is independent of edge ordering', () => {
    const reordered = [EDGES[1]!, EDGES[0]!];
    expect(designHash(NODES, reordered)).toBe(designHash(NODES, EDGES));
  });

  it('excludes node positions', () => {
    const moved = NODES.map((node) => ({ ...node, x: node.x + 999, y: node.y - 999 }));
    expect(designHash(moved, EDGES)).toBe(designHash(NODES, EDGES));
  });

  it('excludes learner notes', () => {
    const annotated = NODES.map((node) => ({ ...node, note: 'some intent note' }));
    expect(designHash(annotated, EDGES)).toBe(designHash(NODES, EDGES));
  });

  it('changes when a node is renamed (displayName participates)', () => {
    const renamed = NODES.map((node, i) => (i === 0 ? { ...node, displayName: 'Renamed' } : node));
    expect(designHash(renamed, EDGES)).not.toBe(designHash(NODES, EDGES));
  });

  it('changes when the componentId changes', () => {
    const swapped = NODES.map((node, i) => (i === 1 ? { ...node, componentId: 'cdn' } : node));
    expect(designHash(swapped, EDGES)).not.toBe(designHash(NODES, EDGES));
  });

  it('changes when an edge is added or removed', () => {
    const extra = [...EDGES, e('e3', 'n1', 'n3')];
    expect(designHash(NODES, extra)).not.toBe(designHash(NODES, EDGES));
  });

  it('changes when an edge direction flips', () => {
    const flipped = [e('e1', 'n2', 'n1'), EDGES[1]!];
    expect(designHash(NODES, flipped)).not.toBe(designHash(NODES, EDGES));
  });

  it('returns a 64-char hex sha256 string', () => {
    expect(designHash(NODES, EDGES)).toMatch(/^[0-9a-f]{64}$/);
  });
});
