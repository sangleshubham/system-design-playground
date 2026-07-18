import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';
import { PlaygroundStore } from '../state/playground.store';
import type { Component, Design, Level } from '../../../core/models';
import type { FCreateConnectionEvent, FCreateNodeEvent, FMoveNodesEvent } from '@foblex/flow';

// jsdom has no ResizeObserver, which Foblex Flow relies on.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver ??= ResizeObserverStub;

const components: Component[] = [
  { id: 'client', name: 'Client', tech: 'Browser', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
  { id: 'cdn', name: 'CDN', tech: 'CloudFront', category: 'networking', description: '', costPerHr: 0.2, latencyMs: 15, icon: 'networking' },
  { id: 'web-server', name: 'Web Server', tech: 'Node', category: 'compute', description: '', costPerHr: 0.4, latencyMs: 25, icon: 'compute' },
];

const level = {
  id: 'level-1', actId: 'act-1', order: 1, title: 'T', difficulty: 'easy', summary: '', narrative: '',
  objectives: [], specs: { functional: [], nonFunctional: [], constraints: [], budgetPerHr: 3, capacity: [], tradeoff: '' },
  missions: [{ id: 'm1', kind: 'add', componentId: 'client', label: 'Add Client' }],
  topologyRules: [], resilienceRules: [], recommendedComponentIds: [], hints: [],
} as unknown as Level;

const seeded: Design = {
  id: 'd1', levelId: 'level-1', name: null, revealedHintCount: 0, updatedAt: '',
  notes: [],
  nodes: [
    { id: 'a', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 },
    { id: 'b', componentId: 'cdn', displayName: 'CDN', note: '', x: 100, y: 0 },
  ],
  edges: [],
};

describe('CanvasComponent', () => {
  let store: PlaygroundStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CanvasComponent], providers: [PlaygroundStore] });
    store = TestBed.inject(PlaygroundStore);
    store.setCatalog(components);
    store.hydrate(level, seeded);
  });

  it('renders seeded nodes and a palette drop adds a node', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    fixture.detectChanges();
    const hosts = (fixture.nativeElement as HTMLElement).querySelectorAll('.node-host');
    expect(hosts.length).toBe(2);

    // Every node host must be a drag handle: since @foblex/flow v19, DragNodePreparation
    // only starts a node drag when the pointerdown target is inside `.f-drag-handle`.
    // Without it, nodes select but silently never move.
    for (const host of hosts) {
      expect(host.classList.contains('f-drag-handle')).toBe(true);
    }

    fixture.componentInstance.onCreateNode({
      data: { componentId: 'web-server' },
      dropPosition: { x: 5, y: 6 },
      externalItemRect: { x: 5, y: 6, width: 0, height: 0 },
    } as unknown as FCreateNodeEvent);
    expect(store.nodes()).toHaveLength(3);
  });

  it('maps a create-connection event (output→input) to store.connect', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    fixture.detectChanges();
    fixture.componentInstance.onCreateConnection({
      sourceId: 'a__out',
      targetId: 'b__in',
    } as unknown as FCreateConnectionEvent);
    expect(store.edges()).toHaveLength(1);
    expect(store.edges()[0].sourceNodeId).toBe('a');
    expect(store.edges()[0].targetNodeId).toBe('b');
  });

  it('ignores a connection dropped onto nothing (no target)', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    fixture.detectChanges();
    fixture.componentInstance.onCreateConnection({
      sourceId: 'a__out',
      targetId: undefined,
    } as unknown as FCreateConnectionEvent);
    expect(store.edges()).toHaveLength(0);
  });

  it('a committed move persists the new position and is not reset by change detection', () => {
    const fixture = TestBed.createComponent(CanvasComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;

    // Foblex reports a drag-end for node 'a'.
    cmp.onMoveNodes({
      nodes: [{ id: 'a', position: { x: 240, y: 120 } }],
    } as unknown as FMoveNodesEvent);

    const moved = store.nodes().find((n) => n.id === 'a')!;
    expect(moved.x).toBe(240);
    expect(moved.y).toBe(120);
    expect(store.canUndo()).toBe(true);

    // The position map reflects the committed value…
    fixture.detectChanges();
    const pos1 = cmp.nodePositions().get('a')!;
    expect(pos1).toEqual({ x: 240, y: 120 });

    // …and a further change-detection pass with no graph change keeps the SAME object
    // reference, so Foblex never re-applies (resets) the node mid-drag.
    fixture.detectChanges();
    expect(cmp.nodePositions().get('a')).toBe(pos1);
  });

  // US2 (Phase 4): keyboard undo/redo shares CanvasComponent.undo()/redo() with the toolbar.
  // The keyboard bindings carry no isApplicable guard (the key is always claimed), so these
  // methods must guard the Foblex clearSelection themselves — otherwise pressing Mod+Z at a
  // history bound clears Foblex's visual selection while the store keeps it (phantom selection).
  describe('undo/redo Foblex selection sync', () => {
    // Grab the FFlowComponent viewChild and stub clearSelection so the real mediator call
    // (which jsdom can't run) never executes and we can assert whether it was invoked.
    function stubClearSelection(cmp: CanvasComponent) {
      const flow = (cmp as unknown as { flow: () => { clearSelection: () => void } | undefined }).flow();
      expect(flow).toBeTruthy();
      return vi.spyOn(flow!, 'clearSelection').mockImplementation(() => {});
    }

    it('is a true no-op at history bounds — no Foblex clearSelection, selection preserved', () => {
      const fixture = TestBed.createComponent(CanvasComponent);
      fixture.detectChanges();
      const cmp = fixture.componentInstance;

      // Live selection with an empty history (past=[], future=[]).
      store.setSelection({ nodes: ['a'], edges: [] });
      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);

      const clearSpy = stubClearSelection(cmp);
      cmp.undo();
      cmp.redo();

      expect(clearSpy).not.toHaveBeenCalled();
      expect(store.selection().nodes).toEqual(['a']);
    });

    it('undo restores the previous state and syncs Foblex once when history exists', () => {
      const fixture = TestBed.createComponent(CanvasComponent);
      fixture.detectChanges();
      const cmp = fixture.componentInstance;

      // Real history: move node 'a', then undo it.
      cmp.onMoveNodes({
        nodes: [{ id: 'a', position: { x: 240, y: 120 } }],
      } as unknown as FMoveNodesEvent);
      expect(store.canUndo()).toBe(true);

      const clearSpy = stubClearSelection(cmp);
      cmp.undo();

      expect(store.nodes().find((n) => n.id === 'a')!.x).toBe(0);
      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(store.canRedo()).toBe(true);
    });
  });

  // US4 (Phase 6): the right-click handlers open the CDK-overlay context menu. Both zones MUST
  // stopPropagation — otherwise the right-click bubbles to the document, where CDK's overlay
  // outside-click dispatcher catches it and instantly dismisses the menu it just opened (the
  // canvas-zone menu never appears). onItemContextMenu already did this; onCanvasContextMenu
  // regressed without it.
  describe('context menu open (stopPropagation regression)', () => {
    function ctxEvent() {
      return {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 12,
        clientY: 34,
      } as unknown as MouseEvent;
    }

    it('onCanvasContextMenu opens the canvas-zone menu and stops propagation', () => {
      const fixture = TestBed.createComponent(CanvasComponent);
      fixture.detectChanges();
      const cmp = fixture.componentInstance;

      const ev = ctxEvent();
      cmp.onCanvasContextMenu(ev);

      expect(ev.preventDefault).toHaveBeenCalled();
      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(cmp.ctxOpen()).toBe(true);
      expect(cmp.ctxZone()).toBe('canvas');
      expect(cmp.ctxAnchor()).toEqual({ x: 12, y: 34 });
    });

    it('onItemContextMenu opens the selection-zone menu and stops propagation', () => {
      const fixture = TestBed.createComponent(CanvasComponent);
      fixture.detectChanges();
      const cmp = fixture.componentInstance;

      const ev = ctxEvent();
      cmp.onItemContextMenu(ev, 'a');

      expect(ev.preventDefault).toHaveBeenCalled();
      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(cmp.ctxOpen()).toBe(true);
      expect(cmp.ctxZone()).toBe('selection');
    });
  });
});
