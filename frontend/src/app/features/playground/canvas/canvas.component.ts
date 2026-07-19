import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FCanvasComponent,
  FFlowComponent,
  FFlowModule,
  FZoomDirective,
  type FCreateConnectionEvent,
  type FCreateNodeEvent,
  type FDragStartedEvent,
  type FMoveNodesEvent,
  type FSelectionChangeEvent,
} from '@foblex/flow';
import {
  createShortcutRouter,
  detectPlatform,
  type ShortcutBinding,
  type ShortcutEvent,
  type ShortcutRouter,
} from './canvas-shortcuts.js';
import { NUDGE_COARSE_FACTOR, NUDGE_STEP, PlaygroundStore } from '../state/playground.store.js';
import { ThemeService } from '../../../core/theme.service.js';
import { ToastService } from '../../../core/toast.service.js';
import { DesignNodeComponent } from './design-node.component.js';
import { StickyNoteComponent } from './sticky-note.component.js';
import {
  CanvasContextMenuComponent,
  type ContextMenuAction,
  type ContextMenuZone,
} from './canvas-context-menu.component.js';
import { AlignmentGuidesComponent, type GuideViewport } from './alignment-guides.component.js';
import {
  ALIGN_TOLERANCE,
  boundingBox,
  detectAlignments,
  guidesEqual,
  type AlignmentGuide,
  type GuideRect,
} from './alignment-guides.js';

/** Foblex node-drag kind (DRAG_NODE_HANDLER_KIND). Alignment guides track only node drags —
 *  canvas pans, connection drags, and minimap drags emit (fDragStarted) too but must not. */
const DRAG_NODE_KIND = 'drag-node';

const OUT = '__out';
const IN = '__in';

interface PaletteDrop {
  componentId?: string;
  note?: boolean;
}

/**
 * Foblex Flow canvas wrapper. The store owns all graph state; this component translates
 * Foblex interaction events (create-connection, move, external-drop, select, delete) into
 * store mutations and renders nodes/edges/sticky-notes back from the store signals.
 */
@Component({
  selector: 'app-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FFlowModule,
    DesignNodeComponent,
    StickyNoteComponent,
    CanvasContextMenuComponent,
    AlignmentGuidesComponent,
  ],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
})
export class CanvasComponent {
  readonly store = inject(PlaygroundStore);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly zone = inject(NgZone);

  private readonly canvasCmp = viewChild(FCanvasComponent);
  private readonly flow = viewChild(FFlowComponent);
  private readonly zoom = viewChild(FZoomDirective);

  // Single canvas-wide keyboard router (research.md R1). Bindings are wired to store/flow
  // calls; later user stories append their keys to the same table. Guards (text-editing,
  // lock) and Cmd/Ctrl platform mapping live in the router — see canvas-shortcuts.ts.
  private readonly shortcuts: ShortcutRouter = createShortcutRouter(this.createShortcutBindings(), {
    platform: detectPlatform(),
    locked: () => this.store.locked(),
  });

  readonly nodes = this.store.nodes;
  readonly edges = this.store.edges;
  readonly stickyNotes = this.store.stickyNotes;
  readonly locked = this.store.locked;

  readonly dotColor = signal('#cbd5e1');
  readonly shakeNodeId = signal<string | null>(null);
  private lastRejectionToken = -1;

  // Tracks whether the pointer is over the canvas host — one half of the G3 zoom-scope test
  // (the other is focus-within). Only when the canvas is the active target do zoom shortcuts
  // fire and block the browser's page zoom; elsewhere page zoom is left untouched (FR-016).
  private readonly pointerInside = signal(false);

  // Right-click context-menu state (US4). The canvas owns open/anchor/zone; the menu component
  // is a store-driven renderer that emits the chosen action back here (contract ui-components §1).
  readonly ctxOpen = signal(false);
  readonly ctxAnchor = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly ctxZone = signal<ContextMenuZone>('selection');

  // True between (fDragStarted) and (fDragEnded): a right-click mid-drag must not open the menu.
  private readonly dragging = signal(false);

  // Visual-only alignment guides shown while dragging a node (US5, research R3). `guides` holds
  // canvas-space lines; `guideTransform` is the live canvas→screen mapping the overlay renders
  // with (the overlay lives outside the Foblex transform — see alignment-guides.component.ts).
  // Both are written only when the visible guides actually change, so a drag never floods change
  // detection (Principle V). Peer rects are measured once at drag start; the dragged group's rects
  // are re-sampled per animation frame (Foblex updates its position model only at drag finalize,
  // so the live DOM rect is the only source of the in-flight position).
  readonly guides = signal<AlignmentGuide[]>([]);
  readonly guideTransform = signal<GuideViewport>({ scale: 1, x: 0, y: 0 });
  // Every node-host element + its canvas-space rect captured at drag start. Peers (non-dragged)
  // reuse the cached rect; the dragged group is re-measured live from these element refs each
  // frame. The dragged/peer split is re-derived from the live selection per frame, so it self-
  // corrects when Foblex updates the selection a tick after (fDragStarted) — e.g. grabbing an
  // unselected node (research R2 deferred-selection caveat).
  private nodeEls = new Map<string, HTMLElement>();
  private cachedRects = new Map<string, GuideRect>();
  private guideRaf = 0;
  private guideFrameQueued = false;
  // True between a fitToView() request and the transform-change that applies it — the window in
  // which onCanvasTransformChange() clamps the fit result to ≤ 100% (US2).
  private fitClampPending = false;
  private readonly onGuidePointerMove = (): void => this.queueGuideFrame();

  private readonly selectedNodeIds = computed(() => new Set(this.store.selection().nodes));

  // Stable per-id position references. Foblex re-applies `fNodePosition` whenever its input
  // reference changes, which would reset (and effectively block) a drag every time change
  // detection runs — e.g. the selection change a drag's own mousedown fires, or the periodic
  // autosave-status signal. Reusing the same {x,y} object until the value actually changes
  // lets Foblex own the position during the drag and only re-applies it on a real commit.
  private nodePosCache = new Map<string, { x: number; y: number }>();
  private stickyPosCache = new Map<string, { x: number; y: number }>();
  readonly nodePositions = computed(() => {
    this.nodePosCache = this.reconcilePositions(this.nodePosCache, this.store.nodes());
    return this.nodePosCache;
  });
  readonly stickyPositions = computed(() => {
    this.stickyPosCache = this.reconcilePositions(this.stickyPosCache, this.store.stickyNotes());
    return this.stickyPosCache;
  });

  private reconcilePositions(
    cache: Map<string, { x: number; y: number }>,
    items: readonly { id: string; x: number; y: number }[],
  ): Map<string, { x: number; y: number }> {
    const next = new Map<string, { x: number; y: number }>();
    for (const it of items) {
      const prev = cache.get(it.id);
      next.set(it.id, prev && prev.x === it.x && prev.y === it.y ? prev : { x: it.x, y: it.y });
    }
    return next;
  }

  constructor() {
    // Keep the background dot color in sync with the active theme (T053).
    effect(() => {
      this.theme.theme();
      queueMicrotask(() => {
        const value = getComputedStyle(document.documentElement)
          .getPropertyValue('--canvas-dot')
          .trim();
        if (value) this.dotColor.set(value);
      });
    });

    // Surface connection rejections as a toast + a shake on the offending node (T042).
    effect(() => {
      const rej = this.store.rejectionFeedback();
      if (!rej || rej.token === this.lastRejectionToken) return;
      this.lastRejectionToken = rej.token;
      this.toast.show(rej.message, 'info', 2500);
      if (rej.nodeId) {
        this.shakeNodeId.set(rej.nodeId);
        setTimeout(() => this.shakeNodeId.set(null), 450);
      }
    });

    // Tear down any in-flight guide tracking (listener + rAF) if the canvas is destroyed mid-drag.
    inject(DestroyRef).onDestroy(() => this.endGuides());
  }

  isNodeSelected(id: string): boolean {
    return this.selectedNodeIds().has(id);
  }

  onCreateNode(event: FCreateNodeEvent): void {
    const data = event.data as PaletteDrop | undefined;
    const pos = event.dropPosition ?? { x: event.externalItemRect.x, y: event.externalItemRect.y };
    if (data?.note) {
      this.store.addStickyNote(pos);
    } else if (data?.componentId) {
      this.store.addNodeFromPalette(data.componentId, pos);
    }
  }

  onCreateConnection(event: FCreateConnectionEvent): void {
    if (!event.targetId) return;
    const source = this.stripConnector(event.sourceId, OUT);
    const target = this.stripConnector(event.targetId, IN);
    if (source && target) this.store.connect(source, target);
  }

  onMoveNodes(event: FMoveNodesEvent): void {
    const nodeIds = new Set(this.nodes().map((n) => n.id));
    const stickyIds = new Set(this.stickyNotes().map((n) => n.id));
    const nodeMoves = event.nodes
      .filter((m) => nodeIds.has(m.id))
      .map((m) => ({ id: m.id, x: m.position.x, y: m.position.y }));
    if (nodeMoves.length) this.store.moveNodes(nodeMoves);
    for (const m of event.nodes) {
      if (stickyIds.has(m.id)) this.store.moveStickyNote(m.id, m.position.x, m.position.y);
    }
  }

  onSelectionChange(event: FSelectionChangeEvent): void {
    this.store.setSelection({ nodes: event.nodeIds, edges: event.connectionIds });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    this.shortcuts.handleKeydown(event);
  }

  @HostListener('pointerenter')
  onPointerEnter(): void {
    this.pointerInside.set(true);
  }

  @HostListener('pointerleave')
  onPointerLeave(): void {
    this.pointerInside.set(false);
  }

  onDragStarted(event: FDragStartedEvent): void {
    this.dragging.set(true);
    this.closeContextMenu();
    // Alignment guides track node drags only — canvas pans, connection drags, and minimap drags
    // all emit (fDragStarted) but must not produce guides (they don't move nodes).
    if (event.kind === DRAG_NODE_KIND) this.beginGuides();
  }

  onDragEnded(): void {
    this.dragging.set(false);
    this.endGuides();
  }

  /* ----------------------- alignment guides (US5) --------------------- */

  /**
   * Begin guide tracking for a node drag. Capture every node-host element and its canvas-space rect
   * ONCE (peers never move during a drag, so their rects are cached — Principle V), then listen for
   * pointer movement to re-sample the dragged group. The listener is registered outside Angular so
   * the per-move hot path triggers no change detection; the gated `guides`/`guideTransform` signal
   * writes refresh the OnPush overlay on their own.
   */
  private beginGuides(): void {
    const canvas = this.canvasCmp();
    if (!canvas) return;
    const els = new Map<string, HTMLElement>();
    const rects = new Map<string, GuideRect>();
    const hosts = this.hostEl.nativeElement.querySelectorAll<HTMLElement>('.node-host[data-node-id]');
    for (const el of Array.from(hosts)) {
      const id = el.dataset['nodeId'];
      if (!id) continue;
      els.set(id, el);
      const rect = this.toCanvasRect(el.getBoundingClientRect(), canvas);
      if (rect) rects.set(id, rect);
    }
    this.nodeEls = els;
    this.cachedRects = rects;
    // Need at least two nodes for any alignment to ever exist; otherwise don't even listen.
    if (els.size < 2) return;
    this.zone.runOutsideAngular(() =>
      document.addEventListener('pointermove', this.onGuidePointerMove, { passive: true }),
    );
  }

  /** rAF-throttle: at most one guide computation per frame, and only after real pointer movement. */
  private queueGuideFrame(): void {
    if (this.guideFrameQueued) return;
    this.guideFrameQueued = true;
    this.guideRaf = requestAnimationFrame(() => {
      this.guideFrameQueued = false;
      this.guideRaf = 0;
      this.computeGuides();
    });
  }

  /**
   * Re-sample the dragged group's live DOM rects, detect alignments against the cached peers, and
   * publish the guides. Writes signals only when the visible guides actually change (and refreshes
   * the transform only while guides are shown, covering auto-pan) — so an ordinary drag with nothing
   * aligned is entirely change-detection-free.
   */
  private computeGuides(): void {
    const canvas = this.canvasCmp();
    if (!canvas) return;
    const draggedIds = new Set(this.store.selection().nodes);
    const draggedRects: GuideRect[] = [];
    const peers: GuideRect[] = [];
    for (const [id, cached] of this.cachedRects) {
      if (draggedIds.has(id)) {
        const el = this.nodeEls.get(id);
        const live = el ? this.toCanvasRect(el.getBoundingClientRect(), canvas) : null;
        if (live) draggedRects.push(live);
      } else {
        peers.push(cached);
      }
    }
    const bounds = boundingBox(draggedRects);
    const next = bounds ? detectAlignments(bounds, peers, ALIGN_TOLERANCE) : [];

    const guidesChanged = !guidesEqual(this.guides(), next);
    const viewport = next.length > 0 ? this.readViewport(canvas) : null;
    const viewportChanged = viewport !== null && !this.sameViewport(this.guideTransform(), viewport);
    if (!guidesChanged && !viewportChanged) return;

    // Publish inside Angular so the OnPush overlay repaints reliably in this zoned app (the drag
    // hot path itself runs outside the zone). Reached only on a real change — alignment gained,
    // lost, or moved, or the canvas panned while a guide is shown — so a steady drag writes nothing.
    this.zone.run(() => {
      if (guidesChanged) this.guides.set(next);
      if (viewport && viewportChanged) this.guideTransform.set(viewport);
    });
  }

  private sameViewport(a: GuideViewport, b: GuideViewport): boolean {
    return a.scale === b.scale && a.x === b.x && a.y === b.y;
  }

  /**
   * Convert a screen-space DOM rect to a canvas-space rect — the inverse of Foblex's own
   * `calculatePointerInFlow`. With `transform-origin: 0 0` on f-canvas, a canvas point maps to
   * screen as `hostOrigin + position + scaledPosition + canvas × scale`; `getScale()`/`getPosition()`
   * are the public accessors for `transform.scale`/`transform.position` (scaledPosition is only
   * non-zero transiently). The host and the guide overlay share a screen origin, so the same
   * `position (+ scaledPosition)` offset round-trips exactly (see readViewport).
   */
  private toCanvasRect(r: DOMRect, canvas: FCanvasComponent): GuideRect | null {
    const t = canvas.transform;
    if (!t.scale) return null;
    const origin = this.hostEl.nativeElement.getBoundingClientRect();
    const ox = origin.left + t.position.x + t.scaledPosition.x;
    const oy = origin.top + t.position.y + t.scaledPosition.y;
    return {
      x: (r.left - ox) / t.scale,
      y: (r.top - oy) / t.scale,
      width: r.width / t.scale,
      height: r.height / t.scale,
    };
  }

  /** The canvas→overlay mapping the guide overlay renders with (the overlay shares the host origin,
   *  so no host-origin term is needed here — only the pan offset and scale). */
  private readViewport(canvas: FCanvasComponent): GuideViewport {
    const t = canvas.transform;
    return {
      scale: t.scale,
      x: t.position.x + t.scaledPosition.x,
      y: t.position.y + t.scaledPosition.y,
    };
  }

  /** Stop guide tracking: drop the listener + any pending frame, clear caches, hide the overlay. */
  private endGuides(): void {
    document.removeEventListener('pointermove', this.onGuidePointerMove);
    if (this.guideRaf) cancelAnimationFrame(this.guideRaf);
    this.guideRaf = 0;
    this.guideFrameQueued = false;
    this.nodeEls.clear();
    this.cachedRects.clear();
    if (this.guides().length) this.zone.run(() => this.guides.set([]));
  }

  /**
   * Right-click on a component or sticky note (US4, zone 'selection'). Suppresses the native
   * menu, stops the event from also reaching the canvas-background handler, and — if the item
   * isn't already part of the selection — selects it first so the menu acts on what was clicked.
   */
  onItemContextMenu(event: MouseEvent, id: string): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.dragging()) return;
    if (!this.store.selection().nodes.includes(id)) this.syncSelectionToFlow([id]);
    this.openContextMenu(event, 'selection');
  }

  /** Right-click on empty canvas (US4, zone 'canvas'). */
  onCanvasContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // stopPropagation (mirrors onItemContextMenu) so this right-click does not bubble to the
    // document, where CDK's overlay outside-click dispatcher would otherwise catch it and
    // instantly dismiss the menu we are about to open.
    event.stopPropagation();
    if (this.dragging()) return;
    this.openContextMenu(event, 'canvas');
  }

  private openContextMenu(event: MouseEvent, zone: ContextMenuZone): void {
    this.ctxAnchor.set({ x: event.clientX, y: event.clientY });
    this.ctxZone.set(zone);
    this.ctxOpen.set(true);
  }

  closeContextMenu(): void {
    this.ctxOpen.set(false);
  }

  /** Route a chosen menu entry to the exact store/flow calls the keyboard router uses (FR-019). */
  onContextAction(action: ContextMenuAction): void {
    switch (action) {
      case 'copy':
        this.store.copySelection();
        break;
      case 'paste':
        this.paste();
        break;
      case 'duplicate':
        this.duplicate();
        break;
      case 'delete':
        this.store.deleteSelection();
        break;
      case 'selectAll':
        this.selectAll();
        break;
    }
  }

  /**
   * The canvas keyboard binding table. Delete/Backspace is migrated here from the former
   * inline handler with identical behavior; subsequent user stories append copy/paste,
   * undo/redo, the shortcut pack, and zoom bindings to this list.
   */
  private createShortcutBindings(): ShortcutBinding[] {
    return [
      {
        // Matches Delete/Backspace regardless of modifiers (as the original handler did);
        // fires only when something is selected. The router's G1/G2 guards now cover the
        // text-editing skip and the locked-canvas no-op the inline handler relied on.
        id: 'delete-selection',
        combo: { keys: ['delete', 'backspace'], anyModifiers: true },
        isApplicable: () => {
          const sel = this.store.selection();
          return sel.nodes.length > 0 || sel.edges.length > 0;
        },
        action: () => this.store.deleteSelection(),
      },
      {
        // Copy (US1). No-op preserving the buffer when nothing is selected; G1 leaves
        // field-level copy native inside text inputs.
        id: 'copy',
        combo: { keys: ['c'], mod: true },
        isApplicable: () => this.store.canCopy(),
        action: () => this.store.copySelection(),
      },
      {
        // Paste (US1): materialize the buffer, then mirror the resulting selection into Foblex.
        id: 'paste',
        combo: { keys: ['v'], mod: true },
        isApplicable: () => this.store.canPaste(),
        action: () => this.paste(),
      },
      {
        // Undo (US2): identical to the toolbar button (research.md R9). The store already
        // resets its own selection signal on undo/redo — clearSelection() here only syncs
        // Foblex's visual selection to match. No isApplicable: at history bounds store.undo()
        // is already a no-op, and the key is still claimed (preventDefault fires either way).
        id: 'undo',
        combo: { keys: ['z'], mod: true, shift: false },
        action: () => this.undo(),
      },
      {
        // Redo (US2): Mod+Shift+Z only — no Mod+Y binding exists anywhere in this table.
        id: 'redo',
        combo: { keys: ['z'], mod: true, shift: true },
        action: () => this.redo(),
      },
      {
        // Select all (US3): components + sticky notes + connections. No-op on an empty canvas.
        id: 'select-all',
        combo: { keys: ['a'], mod: true },
        isApplicable: () => this.hasAnyElements(),
        action: () => this.selectAll(),
      },
      {
        // Deselect (US3) / close the context menu (US4): Escape closes an open menu first,
        // otherwise clears the selection. Never preventDefaults, so Escape stays free for
        // dialogs; G1 already leaves in-editor Escape native. This is the single Escape
        // dispatch point (the context menu deliberately does not bind Escape itself).
        id: 'escape-clear',
        combo: { keys: ['escape'] },
        preventDefaultWhen: () => false,
        action: () => (this.ctxOpen() ? this.closeContextMenu() : this.clearAllSelection()),
      },
      {
        // Duplicate (US3): like paste but independent of the copy buffer (FR-014).
        id: 'duplicate',
        combo: { keys: ['d'], mod: true },
        isApplicable: () => this.hasSelection(),
        action: () => this.duplicate(),
      },
      // Arrow nudges (US3): plain = NUDGE_STEP, Shift = coarse (× NUDGE_COARSE_FACTOR). Only
      // applicable — and only preventDefault (blocking page scroll) — with a live selection, so
      // an empty-selection arrow falls through to native scrolling (contract binding table).
      this.arrowNudgeBinding('nudge-up', 'arrowup', 0, -1),
      this.arrowNudgeBinding('nudge-down', 'arrowdown', 0, 1),
      this.arrowNudgeBinding('nudge-left', 'arrowleft', -1, 0),
      this.arrowNudgeBinding('nudge-right', 'arrowright', 1, 0),
      {
        // Zoom in (US3): '=' normalizes both Mod+= and Mod++ (canvas-shortcuts.normalizeKey).
        // G3: fires (and blocks browser page zoom) only when the canvas is the active target;
        // elsewhere the browser's own zoom proceeds untouched (FR-016).
        id: 'zoom-in',
        combo: { keys: ['='], mod: true },
        isApplicable: () => this.isCanvasActiveTarget(),
        action: () => this.zoomIn(),
      },
      {
        id: 'zoom-out',
        combo: { keys: ['-'], mod: true },
        isApplicable: () => this.isCanvasActiveTarget(),
        action: () => this.zoomOut(),
      },
      {
        id: 'zoom-reset',
        combo: { keys: ['0'], mod: true },
        isApplicable: () => this.isCanvasActiveTarget(),
        action: () => this.fitToView(),
      },
    ];
  }

  /** Build one arrow-key nudge binding; `(ux, uy)` is the unit direction. */
  private arrowNudgeBinding(id: string, key: string, ux: number, uy: number): ShortcutBinding {
    return {
      id,
      combo: { keys: [key] },
      isApplicable: () => this.hasSelection(),
      action: (event: ShortcutEvent) => {
        const step = event.shiftKey ? NUDGE_STEP * NUDGE_COARSE_FACTOR : NUDGE_STEP;
        this.store.nudgeSelection(ux * step, uy * step);
      },
    };
  }

  private hasSelection(): boolean {
    const sel = this.store.selection();
    return sel.nodes.length > 0 || sel.edges.length > 0;
  }

  private hasAnyElements(): boolean {
    return this.nodes().length > 0 || this.edges().length > 0 || this.stickyNotes().length > 0;
  }

  /** G3: the canvas is the active zoom target when the pointer is over it or focus is within. */
  private isCanvasActiveTarget(): boolean {
    return this.pointerInside() || this.hostEl.nativeElement.contains(document.activeElement);
  }

  /** Paste path shared by the Mod+V binding and the toolbar button: store + Foblex sync. */
  paste(): void {
    this.syncSelectionToFlow(this.store.pasteClipboard());
  }

  /** Select-all path (Mod+A): set the store selection, then mirror it into Foblex. */
  selectAll(): void {
    this.store.selectAllElements();
    const sel = this.store.selection();
    this.flow()?.select(sel.nodes, sel.edges, false);
  }

  /** Duplicate path (Mod+D): store duplicate, then sync the new selection into Foblex. Skips
   *  the Foblex sync when nothing duplicable was selected (e.g. an edges-only selection). */
  duplicate(): void {
    const ids = this.store.duplicateSelection();
    if (ids.length) this.syncSelectionToFlow(ids);
  }

  /**
   * Undo path shared by the Mod+Z binding and the toolbar button. Guarded on `canUndo()`
   * so it is a genuine no-op at the history start: `store.undo()` already early-returns
   * there WITHOUT clearing its selection signal, so an unconditional `flow.clearSelection()`
   * would wipe Foblex's visual selection while the store kept it — a phantom selection
   * (Foblex's ClearSelection emits no fSelectionChange to resync). The router still claims
   * the keystroke and preventDefaults regardless (the binding has no isApplicable).
   */
  undo(): void {
    if (!this.store.canUndo()) return;
    this.store.undo();
    this.flow()?.clearSelection();
  }

  /** Redo path shared by the Mod+Shift+Z binding and the toolbar button. Guarded on
   * `canRedo()` for the same reason `undo()` guards on `canUndo()` (see above). */
  redo(): void {
    if (!this.store.canRedo()) return;
    this.store.redo();
    this.flow()?.clearSelection();
  }

  /**
   * Push a programmatic selection into the store (source of truth) and then Foblex.
   * Store first, then `select(nodeIds, edgeIds, false)` — the `isSelectedChanged=false`
   * arg suppresses the deferred emission Foblex would otherwise fire, which would leave a
   * stale (fSelectionChange) landing a tick later (research.md R2). Used by
   * paste/duplicate/select-all in later stories.
   */
  syncSelectionToFlow(nodeIds: string[], edgeIds: string[] = []): void {
    this.store.setSelection({ nodes: nodeIds, edges: edgeIds });
    this.flow()?.select(nodeIds, edgeIds, false);
  }

  /** Clear the selection everywhere: store signal + Foblex (synchronous, emits nothing). */
  clearAllSelection(): void {
    this.store.setSelection({ nodes: [], edges: [] });
    this.flow()?.clearSelection();
  }

  /* Public canvas controls used by canvas-controls.component (T040). */
  zoomIn(): void {
    this.zoom()?.zoomIn();
  }
  zoomOut(): void {
    this.zoom()?.zoomOut();
  }
  fitToView(): void {
    const canvas = this.canvasCmp();
    if (!canvas) return;
    // Empty/degenerate canvas: fitToScreen is a no-op (its bounding box is zero, so it never
    // changes the transform and never fires fCanvasChange). Settle directly at 100% centered —
    // a sane view, and no clamp flag is left dangling (US2 edge case, FR-004).
    if (!this.hasAnyElements()) {
      canvas.resetScaleAndCenter(true);
      return;
    }
    // fitToScreen defers the transform mutation via afterNextRender, so getScale() is still the
    // OLD scale synchronously after this call — a synchronous clamp here never sees the ballooned
    // fit scale. Mark a pending clamp and finish it in onCanvasTransformChange(), which fires once
    // the fit has actually applied (Foblex RedrawCanvasWithAnimation → emitCanvasChangeEvent).
    this.fitClampPending = true;
    canvas.fitToScreen({ x: 48, y: 48 }, true);
  }

  /**
   * Post-fit clamp (US2, research R2, contract C3). fitToScreen bypasses the interactive
   * [0.25, 2.5] zoom clamp and would balloon a small/single-node diagram far past 100%. Once the
   * fit has applied and this transform-change fires, cap zoom-in at 100%: if the fit scale is > 1
   * (or non-finite for a degenerate box) supersede it with resetScaleAndCenter (scale 1, centered).
   * Only a fit we requested is clamped — manual zoom keeps its 25%–250% range; large diagrams
   * (scale ≤ 1) keep today's padded zoom-out (FR-004/005/006).
   */
  onCanvasTransformChange(): void {
    if (!this.fitClampPending) return;
    this.fitClampPending = false;
    const canvas = this.canvasCmp();
    if (!canvas) return;
    const s = canvas.getScale();
    if (!Number.isFinite(s) || s > 1) canvas.resetScaleAndCenter(true);
  }

  private stripConnector(connectorId: string, suffix: string): string | null {
    return connectorId.endsWith(suffix) ? connectorId.slice(0, -suffix.length) : null;
  }
}
