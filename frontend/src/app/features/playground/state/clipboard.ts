/**
 * Pure clipboard capture/materialize logic for same-canvas copy/paste (data-model.md §1,
 * research.md R5). No Angular imports — unit-testable in isolation. The store owns the
 * `clipboard` signal and calls these helpers.
 *
 * The buffer is id-free: components carry only their catalog reference, custom name/note,
 * and offsets from the capture's bounding-box origin, and connections are encoded as index
 * pairs into `components`. Because paste mints node ids in `components` order, those index
 * pairs remap to fresh ids by position — no id bookkeeping, immune to collisions.
 */
import type { DesignEdge, DesignNode, StickyNote } from '../../../core/models.js';
import type { Selection } from './playground.store.js';

/** Canvas-px offset applied per paste generation — a below-right cascade. Tuning constant. */
export const PASTE_OFFSET = 24;

export interface CopiedComponent {
  componentId: string;
  displayName: string;
  note: string;
  /** Offset from the capture bounding-box origin — preserves relative layout (FR-003). */
  dx: number;
  dy: number;
}

export interface CopiedStickyNote {
  text: string;
  dx: number;
  dy: number;
}

export interface CopiedConnection {
  /** Indices into {@link ClipboardBuffer.components} of the two endpoints. */
  sourceIndex: number;
  targetIndex: number;
}

export interface ClipboardBuffer {
  components: CopiedComponent[];
  stickyNotes: CopiedStickyNote[];
  connections: CopiedConnection[];
  /** Bounding-box top-left of the captured items — the paste cascade's base point. */
  origin: { x: number; y: number };
  /** Paste generations consumed from this buffer; 0 at capture, +1 per paste. */
  pasteCount: number;
}

export interface MaterializedClipboard {
  nodes: DesignNode[];
  edges: DesignEdge[];
  stickyNotes: StickyNote[];
}

/**
 * Capture the current selection into an id-free buffer, or `null` when nothing pasteable is
 * selected — no components and no sticky notes (an empty or edges-only selection). Positions
 * are normalized to the selection's bounding-box top-left. A connection is captured **iff
 * both** endpoints are among the selected components (FR-001, spec scenario 3) — the edge's
 * own selection state is irrelevant, so copying two connected nodes brings their link along.
 *
 * The store's selection model keeps component-node ids and sticky-note ids together in
 * `selection.nodes`, so both are filtered from that one set here.
 */
export function captureSelection(
  nodes: readonly DesignNode[],
  edges: readonly DesignEdge[],
  stickyNotes: readonly StickyNote[],
  selection: Selection,
): ClipboardBuffer | null {
  const selectedIds = new Set(selection.nodes);
  const components = nodes.filter((n) => selectedIds.has(n.id));
  const notes = stickyNotes.filter((s) => selectedIds.has(s.id));
  if (components.length === 0 && notes.length === 0) return null;

  const originX = Math.min(...components.map((c) => c.x), ...notes.map((s) => s.x));
  const originY = Math.min(...components.map((c) => c.y), ...notes.map((s) => s.y));

  const indexByNodeId = new Map<string, number>();
  components.forEach((c, i) => indexByNodeId.set(c.id, i));

  const connections: CopiedConnection[] = [];
  for (const e of edges) {
    const sourceIndex = indexByNodeId.get(e.sourceNodeId);
    const targetIndex = indexByNodeId.get(e.targetNodeId);
    if (sourceIndex !== undefined && targetIndex !== undefined) {
      connections.push({ sourceIndex, targetIndex });
    }
  }

  return {
    components: components.map((c) => ({
      componentId: c.componentId,
      displayName: c.displayName,
      note: c.note,
      dx: c.x - originX,
      dy: c.y - originY,
    })),
    stickyNotes: notes.map((s) => ({ text: s.text, dx: s.x - originX, dy: s.y - originY })),
    connections,
    origin: { x: originX, y: originY },
    pasteCount: 0,
  };
}

/**
 * Materialize a buffer into fresh entities for the given paste generation. New node ids are
 * minted in `components` order so index-pair connections resolve by position. Placement is
 * `origin + generation × PASTE_OFFSET + (dx, dy)` (FR-003/FR-004 cascade); pass
 * `generation = 1` for a first paste or a duplicate.
 */
export function materialize(
  buffer: ClipboardBuffer,
  generation: number,
  newId: () => string,
): MaterializedClipboard {
  const shift = generation * PASTE_OFFSET;
  const baseX = buffer.origin.x + shift;
  const baseY = buffer.origin.y + shift;

  const nodeIds = buffer.components.map(() => newId());
  const nodes: DesignNode[] = buffer.components.map((c, i) => ({
    id: nodeIds[i],
    componentId: c.componentId,
    displayName: c.displayName,
    note: c.note,
    x: Math.round(baseX + c.dx),
    y: Math.round(baseY + c.dy),
  }));

  const edges: DesignEdge[] = buffer.connections.map((conn) => ({
    id: newId(),
    sourceNodeId: nodeIds[conn.sourceIndex],
    targetNodeId: nodeIds[conn.targetIndex],
  }));

  const stickyNotes: StickyNote[] = buffer.stickyNotes.map((s) => ({
    id: newId(),
    text: s.text,
    x: Math.round(baseX + s.dx),
    y: Math.round(baseY + s.dy),
  }));

  return { nodes, edges, stickyNotes };
}
