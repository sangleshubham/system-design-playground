import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaygroundStore, NUDGE_STEP, NUDGE_COARSE_FACTOR } from './playground.store';
import type { Component, Level } from '../../../core/models';

const components: Component[] = [
  { id: 'client', name: 'Client', tech: 'Browser', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
  { id: 'cdn', name: 'CDN', tech: 'CloudFront', category: 'networking', description: '', costPerHr: 0.2, latencyMs: 15, icon: 'networking' },
  { id: 'web-server', name: 'Web Server', tech: 'Node', category: 'compute', description: '', costPerHr: 0.4, latencyMs: 25, icon: 'compute' },
];

const level: Level = {
  id: 'level-1',
  actId: 'act-1',
  order: 1,
  title: 'The Static App',
  difficulty: 'easy',
  summary: '',
  narrative: 'p1\n\np2',
  objectives: [],
  specs: { functional: [], nonFunctional: [], constraints: [], budgetPerHr: 3, capacity: [], tradeoff: '' },
  missions: [
    { id: 'm1', kind: 'add', componentId: 'client', label: 'Add Client' },
    { id: 'm2', kind: 'add', componentId: 'cdn', label: 'Add CDN' },
    { id: 'm3', kind: 'connect', fromComponentId: 'client', toComponentId: 'cdn', label: 'Connect' },
    { id: 'm4', kind: 'add', componentId: 'web-server', label: 'Add Web Server', bonus: true },
  ],
  topologyRules: [],
  resilienceRules: [],
  recommendedComponentIds: ['client', 'cdn'],
  hints: ['h1', 'h2'],
  tips: [],
  resources: [],
};

function newStore(): PlaygroundStore {
  const store = new PlaygroundStore();
  store.setCatalog(components);
  store.hydrate(level, null);
  return store;
}

describe('PlaygroundStore', () => {
  let store: PlaygroundStore;
  beforeEach(() => {
    store = newStore();
  });

  it('adds a node from the palette with the component name as displayName', () => {
    store.addNodeFromPalette('client', { x: 10, y: 20 });
    expect(store.nodes()).toHaveLength(1);
    expect(store.nodes()[0].componentId).toBe('client');
    expect(store.nodes()[0].displayName).toBe('Client');
  });

  it('mission checklist auto-checks and unchecks with the graph', () => {
    expect(store.missionProgress().label).toBe('0/3');
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.addNodeFromPalette('cdn', { x: 100, y: 0 });
    expect(store.missionStates().find((s) => s.mission.id === 'm1')?.satisfied).toBe(true);
    const client = store.nodes()[0];
    const cdn = store.nodes()[1];
    store.connect(client.id, cdn.id);
    expect(store.missionProgress().label).toBe('3/3');
    // delete the cdn -> add-cdn and connect missions uncheck
    store.setSelection({ nodes: [cdn.id], edges: [] });
    store.deleteSelection();
    expect(store.missionProgress().label).toBe('1/3');
  });

  it('rejects self-loops and duplicate edges with feedback and no state change', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.addNodeFromPalette('cdn', { x: 100, y: 0 });
    const [a, b] = store.nodes();

    store.connect(a.id, a.id);
    expect(store.edges()).toHaveLength(0);
    expect(store.rejectionFeedback()?.message).toMatch(/self-connection/i);

    store.connect(a.id, b.id);
    expect(store.edges()).toHaveLength(1);
    store.connect(a.id, b.id); // duplicate
    expect(store.edges()).toHaveLength(1);
    expect(store.rejectionFeedback()?.message).toMatch(/already connected/i);
  });

  it('undo/redo restores exact state (5 edits → undo×5 → redo×2 — US2 scenario 4)', () => {
    // 5 committed edits
    store.addNodeFromPalette('client', { x: 0, y: 0 }); // 1 node
    store.addNodeFromPalette('cdn', { x: 1, y: 0 }); // 2 nodes
    store.addNodeFromPalette('web-server', { x: 2, y: 0 }); // 3 nodes
    const [a, b] = store.nodes();
    store.connect(a.id, b.id); // 1 edge
    store.renameNode(a.id, 'Renamed'); // rename

    expect(store.nodes()).toHaveLength(3);
    expect(store.edges()).toHaveLength(1);
    expect(store.nodes().find((n) => n.id === a.id)?.displayName).toBe('Renamed');

    // undo ×5 → baseline (empty)
    for (let i = 0; i < 5; i++) store.undo();
    expect(store.nodes()).toHaveLength(0);
    expect(store.edges()).toHaveLength(0);
    expect(store.canUndo()).toBe(false);

    // redo ×2 → state after the first two adds
    store.redo();
    store.redo();
    expect(store.nodes()).toHaveLength(2);
    expect(store.edges()).toHaveLength(0);
    expect(store.canRedo()).toBe(true);
  });

  it('resetCanvas clears everything and is undoable', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.addNodeFromPalette('cdn', { x: 1, y: 1 });
    store.resetCanvas();
    expect(store.nodes()).toHaveLength(0);
    store.undo();
    expect(store.nodes()).toHaveLength(2);
  });

  it('locking blocks mutations', () => {
    store.toggleLock();
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    expect(store.nodes()).toHaveLength(0);
  });

  it('renaming a node keeps its missions satisfied (FR-016)', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.addNodeFromPalette('cdn', { x: 1, y: 0 });
    const [client, cdn] = store.nodes();
    store.connect(client.id, cdn.id);
    expect(store.missionProgress().label).toBe('3/3');
    store.renameNode(cdn.id, 'My Edge Cache');
    expect(store.nodes().find((n) => n.id === cdn.id)?.displayName).toBe('My Edge Cache');
    expect(store.missionProgress().label).toBe('3/3');
  });

  it('revealNextHint is bounded by the hint count', () => {
    expect(store.revealedHintCount()).toBe(0);
    store.revealNextHint();
    store.revealNextHint();
    store.revealNextHint();
    expect(store.revealedHintCount()).toBe(2);
  });
});

describe('PlaygroundStore clipboard (US1)', () => {
  let store: PlaygroundStore;
  beforeEach(() => {
    store = newStore();
  });

  function seedTwoConnected(): { a: string; b: string } {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.addNodeFromPalette('cdn', { x: 100, y: 0 });
    const [a, b] = store.nodes();
    store.connect(a.id, b.id);
    return { a: a.id, b: b.id };
  }

  it('canCopy tracks selection+lock; canPaste tracks buffer+lock', () => {
    expect(store.canPaste()).toBe(false);
    const { a, b } = seedTwoConnected();
    expect(store.canCopy()).toBe(false); // nothing selected
    store.setSelection({ nodes: [a, b], edges: [] });
    expect(store.canCopy()).toBe(true);
    store.copySelection();
    expect(store.clipboard()).not.toBeNull();
    expect(store.canPaste()).toBe(true);
  });

  it('paste is exactly one undo step that removes the entire pasted set (FR-006)', () => {
    const { a, b } = seedTwoConnected();
    store.setSelection({ nodes: [a, b], edges: [] });
    store.copySelection();

    const nBefore = store.nodes().length; // 2
    const eBefore = store.edges().length; // 1
    const pasted = store.pasteClipboard();

    expect(store.nodes()).toHaveLength(nBefore + 2);
    expect(store.edges()).toHaveLength(eBefore + 1); // the internal connection came along
    expect(pasted).toHaveLength(2); // two node ids, no sticky notes
    expect(store.selection().nodes).toEqual(pasted); // selection is exactly the pasted set (FR-005)

    store.undo();
    expect(store.nodes()).toHaveLength(nBefore);
    expect(store.edges()).toHaveLength(eBefore);
  });

  it('paste clears the redo stack (existing engine semantics)', () => {
    const { a, b } = seedTwoConnected();
    store.setSelection({ nodes: [a, b], edges: [] });
    store.copySelection();
    store.undo(); // undo the connect → redo stack non-empty
    expect(store.canRedo()).toBe(true);
    store.pasteClipboard();
    expect(store.canRedo()).toBe(false);
  });

  it('empty-selection copy is a no-op that preserves the prior buffer (FR-008)', () => {
    const { a, b } = seedTwoConnected();
    store.setSelection({ nodes: [a, b], edges: [] });
    store.copySelection();
    const buffer = store.clipboard();
    expect(buffer).not.toBeNull();

    store.setSelection({ nodes: [], edges: [] });
    store.copySelection();
    expect(store.clipboard()).toBe(buffer); // same buffer object, untouched
  });

  it('paste with no buffer is a no-op returning [] (FR-008)', () => {
    seedTwoConnected();
    expect(store.clipboard()).toBeNull();
    const before = store.nodes().length;
    expect(store.pasteClipboard()).toEqual([]);
    expect(store.nodes()).toHaveLength(before);
    expect(store.canUndo()).toBe(true); // unchanged by the no-op paste (only the seed commits)
  });

  it('copy and paste are both inert while locked (FR-022)', () => {
    const { a, b } = seedTwoConnected();
    store.setSelection({ nodes: [a, b], edges: [] });

    store.toggleLock();
    store.copySelection();
    expect(store.clipboard()).toBeNull(); // copy refused while locked
    expect(store.canCopy()).toBe(false);
    expect(store.canPaste()).toBe(false);

    store.toggleLock(); // unlock and copy for real
    store.copySelection();
    expect(store.clipboard()).not.toBeNull();

    store.toggleLock(); // lock again → paste refused
    const before = store.nodes().length;
    expect(store.pasteClipboard()).toEqual([]);
    expect(store.nodes()).toHaveLength(before);
  });

  it('repeated pastes cascade further each time (FR-004) and retain the buffer', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.setSelection({ nodes: [store.nodes()[0].id], edges: [] });
    store.copySelection();

    const [p1] = store.pasteClipboard();
    expect(store.canPaste()).toBe(true); // buffer persists after paste
    const [p2] = store.pasteClipboard();

    const first = store.nodes().find((n) => n.id === p1)!;
    const second = store.nodes().find((n) => n.id === p2)!;
    expect(first.x).toBe(24); // generation 1 → origin(0) + 1×24
    expect(second.x).toBe(48); // generation 2 → origin(0) + 2×24
  });
});

describe('PlaygroundStore shortcut pack (US3)', () => {
  let store: PlaygroundStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = newStore();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function seedNode(x = 0, y = 0): string {
    store.addNodeFromPalette('client', { x, y });
    const ns = store.nodes();
    return ns[ns.length - 1].id;
  }
  const xOf = (id: string) => store.nodes().find((n) => n.id === id)!.x;

  /* -------------------------------- nudge --------------------------------- */

  it('coalesces a rapid same-direction nudge burst into ONE undo step (FR-015 scenario 5)', () => {
    const id = seedNode(100, 100);
    store.setSelection({ nodes: [id], edges: [] });

    for (let i = 0; i < 5; i++) {
      store.nudgeSelection(NUDGE_STEP, 0);
      vi.advanceTimersByTime(100); // each within the 500 ms window
    }
    expect(xOf(id)).toBe(100 + 5 * NUDGE_STEP);

    store.undo(); // a single undo restores the entire pre-burst position
    expect(xOf(id)).toBe(100);
    expect(store.canUndo()).toBe(true); // the seed add is still on the stack

    store.undo();
    expect(store.canUndo()).toBe(false);
  });

  it('window expiry splits a burst into two undo steps', () => {
    const id = seedNode(0, 0);
    store.setSelection({ nodes: [id], edges: [] });

    store.nudgeSelection(NUDGE_STEP, 0); // burst 1 → x = 8
    vi.advanceTimersByTime(600); // > 500 ms: window closes
    store.nudgeSelection(NUDGE_STEP, 0); // burst 2 → x = 16
    expect(xOf(id)).toBe(2 * NUDGE_STEP);

    store.undo();
    expect(xOf(id)).toBe(NUDGE_STEP); // only burst 2 undone
    store.undo();
    expect(xOf(id)).toBe(0); // burst 1 undone
  });

  it('an interleaved foreign commit closes the burst (nudge → rename → nudge = 3 steps)', () => {
    const id = seedNode(0, 0);
    store.setSelection({ nodes: [id], edges: [] });

    store.nudgeSelection(NUDGE_STEP, 0); // burst 1 → x = 8
    vi.advanceTimersByTime(50);
    store.renameNode(id, 'Renamed'); // foreign commit() closes the window
    vi.advanceTimersByTime(50);
    store.nudgeSelection(NUDGE_STEP, 0); // fresh burst → x = 16
    expect(xOf(id)).toBe(2 * NUDGE_STEP);

    store.undo(); // undo burst 2
    expect(xOf(id)).toBe(NUDGE_STEP);
    store.undo(); // undo rename
    expect(store.nodes().find((n) => n.id === id)!.displayName).toBe('Client');
    expect(xOf(id)).toBe(NUDGE_STEP); // rename snapshot kept the burst-1 position
    store.undo(); // undo burst 1
    expect(xOf(id)).toBe(0);
  });

  it('applies exactly the delta it is given (Shift-coarse math lives at the call site)', () => {
    const id = seedNode(0, 0);
    store.setSelection({ nodes: [id], edges: [] });
    store.nudgeSelection(NUDGE_STEP * NUDGE_COARSE_FACTOR, 0);
    expect(xOf(id)).toBe(NUDGE_STEP * NUDGE_COARSE_FACTOR); // 80
  });

  it('nudges selected sticky notes too, and is a no-op when empty or locked', () => {
    store.addStickyNote({ x: 10, y: 10 });
    const noteId = store.stickyNotes()[0].id;
    store.setSelection({ nodes: [noteId], edges: [] });
    store.nudgeSelection(0, NUDGE_STEP);
    expect(store.stickyNotes()[0].y).toBe(10 + NUDGE_STEP);

    // empty selection → no state change, no history entry
    store.setSelection({ nodes: [], edges: [] });
    const canUndoBefore = store.canUndo();
    store.nudgeSelection(NUDGE_STEP, 0);
    expect(store.canUndo()).toBe(canUndoBefore);

    // locked → inert
    store.setSelection({ nodes: [noteId], edges: [] });
    store.toggleLock();
    store.nudgeSelection(0, NUDGE_STEP);
    expect(store.stickyNotes()[0].y).toBe(10 + NUDGE_STEP); // unchanged
  });

  /* ------------------------------ select all ------------------------------ */

  it('selectAllElements selects nodes, sticky notes, and edges with no history entry', () => {
    store.selectAllElements(); // empty canvas → no-op
    expect(store.selection()).toEqual({ nodes: [], edges: [] });

    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.addNodeFromPalette('cdn', { x: 50, y: 0 });
    const [a, b] = store.nodes();
    store.connect(a.id, b.id);
    store.addStickyNote({ x: 10, y: 10 });
    const noteId = store.stickyNotes()[0].id;

    const canUndoBefore = store.canUndo();
    store.selectAllElements();
    const sel = store.selection();
    expect(new Set(sel.nodes)).toEqual(new Set([a.id, b.id, noteId]));
    expect(sel.edges).toEqual(store.edges().map((e) => e.id));
    expect(store.canUndo()).toBe(canUndoBefore); // selection is not a history entry
  });

  it('selectAllElements is inert while locked', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.setSelection({ nodes: [], edges: [] });
    store.toggleLock();
    store.selectAllElements();
    expect(store.selection()).toEqual({ nodes: [], edges: [] });
  });

  /* ------------------------------ duplicate ------------------------------- */

  it('duplicateSelection copies the selection in ONE undo step without touching the clipboard', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.addNodeFromPalette('cdn', { x: 100, y: 0 });
    const [a, b] = store.nodes();
    store.connect(a.id, b.id);
    store.setSelection({ nodes: [a.id, b.id], edges: [] });

    expect(store.clipboard()).toBeNull();
    const nBefore = store.nodes().length; // 2
    const eBefore = store.edges().length; // 1

    const dupIds = store.duplicateSelection();
    expect(dupIds).toHaveLength(2);
    expect(store.nodes()).toHaveLength(nBefore + 2);
    expect(store.edges()).toHaveLength(eBefore + 1); // internal connection duplicated
    expect(store.selection().nodes).toEqual(dupIds); // duplicates become the selection
    expect(store.clipboard()).toBeNull(); // clipboard untouched (FR-014)

    store.undo(); // one step removes every duplicate
    expect(store.nodes()).toHaveLength(nBefore);
    expect(store.edges()).toHaveLength(eBefore);
  });

  it('duplicateSelection is a no-op returning [] when empty or locked', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    expect(store.duplicateSelection()).toEqual([]); // nothing selected
    expect(store.nodes()).toHaveLength(1);

    store.setSelection({ nodes: [store.nodes()[0].id], edges: [] });
    store.toggleLock();
    expect(store.duplicateSelection()).toEqual([]); // locked
    expect(store.nodes()).toHaveLength(1);
  });
});
