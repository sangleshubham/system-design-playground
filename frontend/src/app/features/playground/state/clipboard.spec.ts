import { describe, it, expect } from 'vitest';
import { captureSelection, materialize, PASTE_OFFSET } from './clipboard';
import type { DesignEdge, DesignNode, StickyNote } from '../../../core/models';

const node = (id: string, x: number, y: number, over: Partial<DesignNode> = {}): DesignNode => ({
  id,
  componentId: 'client',
  displayName: id,
  note: '',
  x,
  y,
  ...over,
});
const sticky = (id: string, x: number, y: number, text = 'note'): StickyNote => ({ id, text, x, y });
const edge = (id: string, s: string, t: string): DesignEdge => ({ id, sourceNodeId: s, targetNodeId: t });

/** Deterministic, monotonically-fresh id generator for materialize. */
function idGen(): () => string {
  let n = 0;
  return () => `new-${n++}`;
}

describe('captureSelection', () => {
  it('normalizes to the bounding-box origin and preserves displayName/note (FR-001/FR-003)', () => {
    const nodes = [node('a', 100, 50, { displayName: 'Alpha', note: 'hi' }), node('b', 140, 90)];
    const buf = captureSelection(nodes, [], [], { nodes: ['a', 'b'], edges: [] });
    expect(buf).not.toBeNull();
    expect(buf!.origin).toEqual({ x: 100, y: 50 });
    expect(buf!.components[0]).toMatchObject({ componentId: 'client', displayName: 'Alpha', note: 'hi', dx: 0, dy: 0 });
    expect(buf!.components[1]).toMatchObject({ dx: 40, dy: 40 });
    expect(buf!.pasteCount).toBe(0);
  });

  it('captures an edge only when BOTH endpoints are selected (dangling excluded)', () => {
    const nodes = [node('a', 0, 0), node('b', 50, 0), node('c', 100, 0)];
    const edges = [edge('e-ab', 'a', 'b'), edge('e-bc', 'b', 'c')];
    const buf = captureSelection(nodes, edges, [], { nodes: ['a', 'b'], edges: [] });
    expect(buf!.connections).toEqual([{ sourceIndex: 0, targetIndex: 1 }]);
  });

  it('excludes an edge when only one endpoint is selected', () => {
    const nodes = [node('a', 0, 0), node('b', 50, 0)];
    const edges = [edge('e-ab', 'a', 'b')];
    const buf = captureSelection(nodes, edges, [], { nodes: ['a'], edges: [] });
    expect(buf!.connections).toEqual([]);
  });

  it('captures a sticky-notes-only selection as a valid buffer with no components', () => {
    const notes = [sticky('s1', 20, 30, 'remember')];
    const buf = captureSelection([], [], notes, { nodes: ['s1'], edges: [] });
    expect(buf).not.toBeNull();
    expect(buf!.components).toEqual([]);
    expect(buf!.connections).toEqual([]);
    expect(buf!.origin).toEqual({ x: 20, y: 30 });
    expect(buf!.stickyNotes[0]).toMatchObject({ text: 'remember', dx: 0, dy: 0 });
  });

  it('derives the origin from the combined bounds of components and sticky notes', () => {
    const nodes = [node('a', 100, 200)];
    const notes = [sticky('s', 60, 240)];
    const buf = captureSelection(nodes, [], notes, { nodes: ['a', 's'], edges: [] });
    expect(buf!.origin).toEqual({ x: 60, y: 200 });
    expect(buf!.components[0]).toMatchObject({ dx: 40, dy: 0 });
    expect(buf!.stickyNotes[0]).toMatchObject({ dx: 0, dy: 40 });
  });

  it('returns null when nothing pasteable is selected (empty or edges-only)', () => {
    expect(captureSelection([], [], [], { nodes: [], edges: [] })).toBeNull();
    const nodes = [node('a', 0, 0), node('b', 50, 0)];
    const edges = [edge('e', 'a', 'b')];
    expect(captureSelection(nodes, edges, [], { nodes: [], edges: ['e'] })).toBeNull();
  });
});

describe('materialize', () => {
  it('mints fresh ids at the generation cascade with valid edge endpoints (FR-003/FR-004)', () => {
    const nodes = [node('a', 100, 100, { displayName: 'Alpha', note: 'n' }), node('b', 140, 100)];
    const buf = captureSelection(nodes, [edge('e', 'a', 'b')], [], { nodes: ['a', 'b'], edges: [] })!;

    for (const gen of [1, 2, 3]) {
      const out = materialize(buf, gen, idGen());
      const shift = gen * PASTE_OFFSET;
      expect(out.nodes[0]).toMatchObject({ x: 100 + shift, y: 100 + shift, displayName: 'Alpha', note: 'n' });
      expect(out.nodes[1]).toMatchObject({ x: 140 + shift, y: 100 + shift });

      const ids = [...out.nodes.map((n) => n.id), ...out.edges.map((e) => e.id)];
      expect(new Set(ids).size).toBe(ids.length); // all fresh, all distinct
      expect(ids).not.toContain('a');
      expect(ids).not.toContain('b');
      expect(ids).not.toContain('e');
      // the copied connection resolves to the freshly minted node ids, in order
      expect(out.edges[0].sourceNodeId).toBe(out.nodes[0].id);
      expect(out.edges[0].targetNodeId).toBe(out.nodes[1].id);
    }
  });

  it('materializes sticky notes at the cascade offset with a fresh id', () => {
    const buf = captureSelection([], [], [sticky('s', 10, 20, 'hello')], { nodes: ['s'], edges: [] })!;
    const out = materialize(buf, 2, idGen());
    expect(out.stickyNotes[0]).toMatchObject({ text: 'hello', x: 10 + 2 * PASTE_OFFSET, y: 20 + 2 * PASTE_OFFSET });
    expect(out.stickyNotes[0].id).not.toBe('s');
  });
});
