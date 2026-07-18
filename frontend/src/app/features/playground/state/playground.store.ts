/**
 * The playground graph store: a per-instance injectable holding all canvas state in
 * Signals (the app owns the graph; Foblex Flow only renders it — research.md R1/R2).
 *
 * Committed mutations flow through `commit()`, which snapshots the previous state for
 * undo/redo (bounded to 100, node-move drags coalesced into one snapshot — T037).
 * `missionStates`/`missionProgress` re-check the mission rules live on every change
 * (FR-015) using the shared client semantics in mission-check.ts (SC-006).
 */
import { Injectable, computed, signal } from '@angular/core';
import type {
  Component,
  Design,
  DesignEdge,
  DesignNode,
  DesignUpsertRequest,
  Level,
  Mission,
  StickyNote,
} from '../../../core/models.js';
import { isMissionSatisfied } from './mission-check.js';
import { captureSelection, materialize, type ClipboardBuffer } from './clipboard.js';

interface Snapshot {
  nodes: DesignNode[];
  edges: DesignEdge[];
  stickyNotes: StickyNote[];
}

export interface Selection {
  nodes: string[];
  edges: string[];
}

export interface RejectionFeedback {
  message: string;
  nodeId?: string;
  token: number;
}

export interface MissionStateView {
  mission: Mission;
  satisfied: boolean;
}

const MAX_HISTORY = 100;

/** Arrow-nudge step (canvas px) and the Shift multiplier for a coarse nudge (FR-015, R7). */
export const NUDGE_STEP = 8;
export const NUDGE_COARSE_FACTOR = 10;
/** Sliding window (ms) inside which same-key nudges coalesce into one undo step (R7). */
export const COALESCE_WINDOW_MS = 500;

function uuid(): string {
  return crypto.randomUUID();
}

@Injectable()
export class PlaygroundStore {
  readonly level = signal<Level | null>(null);
  readonly nodes = signal<DesignNode[]>([]);
  readonly edges = signal<DesignEdge[]>([]);
  readonly stickyNotes = signal<StickyNote[]>([]);
  readonly selection = signal<Selection>({ nodes: [], edges: [] });
  readonly revealedHintCount = signal(0);
  readonly locked = signal(false);
  readonly rejectionFeedback = signal<RejectionFeedback | null>(null);

  private readonly past = signal<Snapshot[]>([]);
  private readonly future = signal<Snapshot[]>([]);
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);

  /** In-memory copy buffer (id-free, same-canvas only). Dies with the store instance (FR-007). */
  readonly clipboard = signal<ClipboardBuffer | null>(null);
  readonly canCopy = computed(() => {
    const sel = this.selection();
    return !this.locked() && (sel.nodes.length > 0 || sel.edges.length > 0);
  });
  readonly canPaste = computed(() => this.clipboard() !== null && !this.locked());

  readonly catalog = signal<Component[]>([]);
  private componentsById = new Map<string, Component>();
  private rejectionToken = 0;

  // Coalescing-window state for burst mutations (nudge — R7). `coalesceKey` names the open
  // burst; a same-key commitCoalesced within COALESCE_WINDOW_MS of the previous one slides the
  // window and skips a new snapshot, collapsing the whole burst into a single undo step.
  private coalesceKey: string | null = null;
  private coalesceStamp = 0;

  /* ------------------------------ setup ------------------------------ */

  setCatalog(components: Component[]): void {
    this.componentsById = new Map(components.map((c) => [c.id, c]));
    this.catalog.set(components);
  }

  component(componentId: string): Component | undefined {
    return this.componentsById.get(componentId);
  }

  /** Load level (or null for sandbox mode) + saved design. Resets history to this baseline. */
  hydrate(level: Level | null, design: Design | null): void {
    this.level.set(level);
    this.nodes.set(design?.nodes ? structuredClone(design.nodes) : []);
    this.edges.set(design?.edges ? structuredClone(design.edges) : []);
    this.stickyNotes.set(design?.notes ? structuredClone(design.notes) : []);
    this.revealedHintCount.set(design?.revealedHintCount ?? 0);
    this.selection.set({ nodes: [], edges: [] });
    this.past.set([]);
    this.future.set([]);
    this.coalesceKey = null;
  }

  /* --------------------------- computed views ------------------------ */

  readonly missionStates = computed<MissionStateView[]>(() => {
    const level = this.level();
    if (!level) return [];
    const nodes = this.nodes();
    const edges = this.edges();
    return level.missions.map((mission) => ({
      mission,
      satisfied: isMissionSatisfied(mission, nodes, edges),
    }));
  });

  /** "n/m" over required (non-bonus) missions. */
  readonly missionProgress = computed(() => {
    const states = this.missionStates().filter((s) => !s.mission.bonus);
    const done = states.filter((s) => s.satisfied).length;
    return { done, total: states.length, label: `${done}/${states.length}` };
  });

  /* ----------------------------- mutations --------------------------- */

  private snapshot(): Snapshot {
    return {
      nodes: structuredClone(this.nodes()),
      edges: structuredClone(this.edges()),
      stickyNotes: structuredClone(this.stickyNotes()),
    };
  }

  private restore(s: Snapshot): void {
    // History navigation ends any open coalescing burst (undo/redo route through here).
    this.coalesceKey = null;
    this.nodes.set(structuredClone(s.nodes));
    this.edges.set(structuredClone(s.edges));
    this.stickyNotes.set(structuredClone(s.stickyNotes));
  }

  /** Push a snapshot onto the undo stack (trimmed to MAX_HISTORY) and clear the redo stack. */
  private pushHistory(prev: Snapshot): void {
    this.past.update((p) => {
      const next = [...p, prev];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    this.future.set([]);
  }

  /** Apply a committed mutation: snapshot the previous state for undo, then mutate. */
  private commit(mutator: () => void): void {
    if (this.locked()) return;
    // A discrete commit closes any open coalescing burst, so the next nudge starts a fresh
    // undo step (store-api invariant: e.g. nudge → delete → nudge = three undo steps).
    this.coalesceKey = null;
    this.pushHistory(this.snapshot());
    mutator();
  }

  /**
   * Coalesced commit for burst mutations (nudge — R7). The first call of a burst pushes a
   * history snapshot exactly like {@link commit}; subsequent calls with the same `key` inside
   * a sliding `windowMs` window mutate WITHOUT a new snapshot and slide the window, so the
   * whole burst collapses to one undo step (FR-015). The window closes on expiry (a later
   * same-key call lands outside it), on any plain `commit()`, or on undo/redo — after which
   * the next call opens a fresh burst.
   */
  private commitCoalesced(key: string, mutator: () => void, windowMs = COALESCE_WINDOW_MS): void {
    if (this.locked()) return;
    const now = Date.now();
    if (this.coalesceKey === key && now - this.coalesceStamp < windowMs) {
      // Inside the open window: mutate in place, push no snapshot, slide the window.
      this.coalesceStamp = now;
      mutator();
      return;
    }
    // Open a new burst — snapshot first, exactly like commit().
    this.pushHistory(this.snapshot());
    this.coalesceKey = key;
    this.coalesceStamp = now;
    mutator();
  }

  addNodeFromPalette(componentId: string, position: { x: number; y: number }): void {
    const comp = this.componentsById.get(componentId);
    if (!comp) return;
    this.commit(() => {
      const node: DesignNode = {
        id: uuid(),
        componentId,
        displayName: comp.name,
        note: '',
        x: Math.round(position.x),
        y: Math.round(position.y),
      };
      this.nodes.update((ns) => [...ns, node]);
    });
  }

  connect(sourceNodeId: string, targetNodeId: string): void {
    if (this.locked()) return;
    if (sourceNodeId === targetNodeId) {
      this.reject("Self-connections aren't allowed.", sourceNodeId);
      return;
    }
    const exists = this.edges().some(
      (e) => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId,
    );
    if (exists) {
      this.reject('These nodes are already connected.', targetNodeId);
      return;
    }
    this.commit(() => {
      this.edges.update((es) => [...es, { id: uuid(), sourceNodeId, targetNodeId }]);
    });
  }

  /** Persist final drag positions as one committed (undoable) mutation. */
  moveNodes(moves: { id: string; x: number; y: number }[]): void {
    if (moves.length === 0) return;
    const byId = new Map(moves.map((m) => [m.id, m]));
    this.commit(() => {
      this.nodes.update((ns) =>
        ns.map((n) => {
          const m = byId.get(n.id);
          return m ? { ...n, x: Math.round(m.x), y: Math.round(m.y) } : n;
        }),
      );
    });
  }

  renameNode(id: string, displayName: string): void {
    const name = displayName.trim();
    if (!name) return;
    this.commit(() => {
      this.nodes.update((ns) => ns.map((n) => (n.id === id ? { ...n, displayName: name } : n)));
    });
  }

  setNodeNote(id: string, note: string): void {
    this.commit(() => {
      this.nodes.update((ns) => ns.map((n) => (n.id === id ? { ...n, note } : n)));
    });
  }

  addStickyNote(position: { x: number; y: number }): void {
    this.commit(() => {
      this.stickyNotes.update((notes) => [
        ...notes,
        { id: uuid(), text: 'New note', x: Math.round(position.x), y: Math.round(position.y) },
      ]);
    });
  }

  updateStickyNote(id: string, text: string): void {
    this.commit(() => {
      this.stickyNotes.update((notes) => notes.map((n) => (n.id === id ? { ...n, text } : n)));
    });
  }

  moveStickyNote(id: string, x: number, y: number): void {
    this.commit(() => {
      this.stickyNotes.update((notes) =>
        notes.map((n) => (n.id === id ? { ...n, x: Math.round(x), y: Math.round(y) } : n)),
      );
    });
  }

  setSelection(selection: Selection): void {
    this.selection.set(selection);
  }

  deleteSelection(): void {
    const sel = this.selection();
    if (sel.nodes.length === 0 && sel.edges.length === 0) return;
    const nodeIds = new Set(sel.nodes);
    const edgeIds = new Set(sel.edges);
    this.commit(() => {
      this.nodes.update((ns) => ns.filter((n) => !nodeIds.has(n.id)));
      // Drop edges that were selected OR whose endpoints were removed.
      this.edges.update((es) =>
        es.filter(
          (e) => !edgeIds.has(e.id) && !nodeIds.has(e.sourceNodeId) && !nodeIds.has(e.targetNodeId),
        ),
      );
      this.stickyNotes.update((notes) => notes.filter((n) => !nodeIds.has(n.id)));
    });
    this.selection.set({ nodes: [], edges: [] });
  }

  /* --------------------------- shortcut pack (US3) ------------------- */

  /**
   * Select every element on the canvas — components, sticky notes, and connections (FR-012).
   * Sticky-note ids live alongside component ids in `selection.nodes` (the canvas renders both
   * as Foblex nodes). No-op on an empty canvas and while locked; writes no history entry
   * (selection is not part of Snapshot, matching existing selection semantics).
   */
  selectAllElements(): void {
    if (this.locked()) return;
    const nodeIds = this.nodes().map((n) => n.id);
    const noteIds = this.stickyNotes().map((s) => s.id);
    const edgeIds = this.edges().map((e) => e.id);
    if (nodeIds.length === 0 && noteIds.length === 0 && edgeIds.length === 0) return;
    this.selection.set({ nodes: [...nodeIds, ...noteIds], edges: edgeIds });
  }

  /**
   * Move every selected component and sticky note by `(dx, dy)` canvas px (FR-015). Callers
   * supply the final step (NUDGE_STEP, or × NUDGE_COARSE_FACTOR when Shift is held). Routed
   * through the coalescing window so a rapid burst (including key auto-repeat) collapses to a
   * single undo step. Empty selection (nothing movable) and a locked canvas are no-ops.
   */
  nudgeSelection(dx: number, dy: number): void {
    if (this.locked()) return;
    const ids = new Set(this.selection().nodes);
    if (ids.size === 0) return;
    this.commitCoalesced('nudge', () => {
      this.nodes.update((ns) =>
        ns.map((n) => (ids.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)),
      );
      this.stickyNotes.update((notes) =>
        notes.map((n) => (ids.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)),
      );
    });
  }

  /* ----------------------------- clipboard --------------------------- */

  /**
   * Capture the current selection into the clipboard buffer (FR-001). Empty/nothing-pasteable
   * selections and a locked canvas are no-ops that preserve any prior buffer (FR-008/FR-022).
   * Never mutates the design, touches undo history, or writes the OS clipboard (FR-007).
   */
  copySelection(): void {
    if (this.locked()) return;
    const buffer = captureSelection(this.nodes(), this.edges(), this.stickyNotes(), this.selection());
    if (!buffer) return;
    this.clipboard.set(buffer);
  }

  /**
   * Paste the clipboard buffer as fresh entities in one committed mutation (⇒ exactly one
   * undo step, FR-006), cascading below-right by paste generation (FR-003/FR-004). Selection
   * is set to the pasted node + sticky-note ids, which are returned so the canvas can mirror
   * the selection into Foblex. No-op returning `[]` when the buffer is empty or locked.
   */
  pasteClipboard(): string[] {
    if (this.locked()) return [];
    const buffer = this.clipboard();
    if (!buffer) return [];

    const generation = buffer.pasteCount + 1;
    const fragment = materialize(buffer, generation, uuid);
    this.commit(() => {
      this.nodes.update((ns) => [...ns, ...fragment.nodes]);
      this.edges.update((es) => [...es, ...fragment.edges]);
      this.stickyNotes.update((notes) => [...notes, ...fragment.stickyNotes]);
    });
    // pasteCount lives on the (non-snapshotted) buffer, so the cascade keeps advancing and
    // is not rewound by undo.
    this.clipboard.set({ ...buffer, pasteCount: generation });

    const pastedIds = [...fragment.nodes.map((n) => n.id), ...fragment.stickyNotes.map((s) => s.id)];
    this.selection.set({ nodes: pastedIds, edges: [] });
    return pastedIds;
  }

  /**
   * Duplicate the current selection in place (FR-014): capture → materialize at generation 1
   * → append in one commit (one undo step), then select the duplicates and return their ids
   * for the canvas to mirror into Foblex. Unlike paste, this never reads or writes the copy
   * buffer. No-op returning [] on an empty selection or while locked.
   */
  duplicateSelection(): string[] {
    if (this.locked()) return [];
    const buffer = captureSelection(this.nodes(), this.edges(), this.stickyNotes(), this.selection());
    if (!buffer) return [];
    const fragment = materialize(buffer, 1, uuid);
    this.commit(() => {
      this.nodes.update((ns) => [...ns, ...fragment.nodes]);
      this.edges.update((es) => [...es, ...fragment.edges]);
      this.stickyNotes.update((notes) => [...notes, ...fragment.stickyNotes]);
    });
    const dupIds = [...fragment.nodes.map((n) => n.id), ...fragment.stickyNotes.map((s) => s.id)];
    this.selection.set({ nodes: dupIds, edges: [] });
    return dupIds;
  }

  /** Clear the entire canvas (undoable). */
  resetCanvas(): void {
    if (this.nodes().length === 0 && this.edges().length === 0 && this.stickyNotes().length === 0) {
      return;
    }
    this.commit(() => {
      this.nodes.set([]);
      this.edges.set([]);
      this.stickyNotes.set([]);
    });
    this.selection.set({ nodes: [], edges: [] });
  }

  /** Replace all node positions in one committed mutation (used by tidy — T041). */
  applyLayout(positions: Map<string, { x: number; y: number }>): void {
    this.commit(() => {
      this.nodes.update((ns) =>
        ns.map((n) => {
          const p = positions.get(n.id);
          return p ? { ...n, x: Math.round(p.x), y: Math.round(p.y) } : n;
        }),
      );
    });
  }

  revealNextHint(): void {
    const level = this.level();
    if (!level) return;
    this.revealedHintCount.update((c) => Math.min(level.hints.length, c + 1));
  }

  toggleLock(): void {
    this.locked.update((l) => !l);
  }

  /* ------------------------------ history ---------------------------- */

  undo(): void {
    const past = this.past();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    this.future.update((f) => [this.snapshot(), ...f]);
    this.past.set(past.slice(0, -1));
    this.restore(prev);
    this.selection.set({ nodes: [], edges: [] });
  }

  redo(): void {
    const future = this.future();
    if (future.length === 0) return;
    const next = future[0];
    this.past.update((p) => [...p, this.snapshot()]);
    this.future.set(future.slice(1));
    this.restore(next);
    this.selection.set({ nodes: [], edges: [] });
  }

  /* --------------------------- serialization ------------------------- */

  toUpsertRequest(): DesignUpsertRequest {
    return {
      nodes: this.nodes(),
      edges: this.edges(),
      notes: this.stickyNotes(),
      revealedHintCount: this.revealedHintCount(),
    };
  }

  private reject(message: string, nodeId?: string): void {
    this.rejectionFeedback.set({ message, nodeId, token: this.rejectionToken++ });
  }
}
