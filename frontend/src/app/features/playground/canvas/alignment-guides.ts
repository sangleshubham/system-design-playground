/**
 * Pure alignment-guide geometry (US5; data-model §2; contract ui-components §2; research R3).
 *
 * VISUAL-ONLY: this module never moves anything — it only reports where guide lines should be
 * drawn while a node is dragged. Foblex's magnetic components were rejected because they snap the
 * dropped position on drag-end with no opt-out (research R3, FR-021); these guides are computed
 * here and painted by a dumb overlay that leaves positions untouched.
 *
 * All coordinates are CANVAS space (the same space as `DesignNode.x/y`). The canvas host samples
 * live DOM rects during a drag and converts them to canvas space before calling in; keeping this
 * module free of Angular/DOM makes the geometry unit-testable in plain numbers.
 */

/** Axis-aligned rectangle in canvas space (top-left origin) — a node's bounds. */
export interface GuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GuideOrientation = 'vertical' | 'horizontal';

/** Which alignment produced the guide — a styling hook for the renderer (edge vs center). */
export type GuideKind = 'edge' | 'center';

export interface AlignmentGuide {
  orientation: GuideOrientation;
  /** Canvas x (vertical guide) or canvas y (horizontal guide) the alignment sits on. */
  position: number;
  /** Extent of the line along its axis, spanning both the dragged bounds and the matched peer. */
  start: number;
  end: number;
  kind: GuideKind;
}

/**
 * Half-window (canvas px) within which two lines count as aligned; alignment is inclusive at
 * exactly this distance. A tuning value (spec Assumptions) — nudge freely.
 */
export const ALIGN_TOLERANCE = 6;

interface Candidate {
  pos: number;
  kind: GuideKind;
}

/** A rect's three x-lines: left edge, horizontal center, right edge. */
function xCandidates(r: GuideRect): Candidate[] {
  return [
    { pos: r.x, kind: 'edge' },
    { pos: r.x + r.width / 2, kind: 'center' },
    { pos: r.x + r.width, kind: 'edge' },
  ];
}

/** A rect's three y-lines: top edge, vertical center, bottom edge. */
function yCandidates(r: GuideRect): Candidate[] {
  return [
    { pos: r.y, kind: 'edge' },
    { pos: r.y + r.height / 2, kind: 'center' },
    { pos: r.y + r.height, kind: 'edge' },
  ];
}

/**
 * Bounding box (canvas space) of one or more rects — the dragged group's overall bounds for
 * multi-drag (US5 scenario 4). Returns `null` for an empty list.
 */
export function boundingBox(rects: readonly GuideRect[]): GuideRect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * The single nearest alignment on one axis between the dragged bounds and any peer. Like matches
 * like (edge↔edge, center↔center); the guide snaps to the PEER's line (the stable reference — the
 * dragged item is never moved) and spans both rects. Returns the closest match within tolerance,
 * or `null`. "Nearest per axis" keeps dense canvases from flooding with lines (data-model §2).
 */
function nearestOnAxis(
  dragged: GuideRect,
  peers: readonly GuideRect[],
  tolerance: number,
  orientation: GuideOrientation,
): AlignmentGuide | null {
  const draggedLines = orientation === 'vertical' ? xCandidates(dragged) : yCandidates(dragged);
  let best: AlignmentGuide | null = null;
  let bestDelta = Infinity;

  for (const peer of peers) {
    const peerLines = orientation === 'vertical' ? xCandidates(peer) : yCandidates(peer);
    for (const dl of draggedLines) {
      for (const pl of peerLines) {
        if (dl.kind !== pl.kind) continue;
        const delta = Math.abs(dl.pos - pl.pos);
        if (delta > tolerance || delta >= bestDelta) continue;
        bestDelta = delta;
        best =
          orientation === 'vertical'
            ? {
                orientation,
                position: pl.pos,
                start: Math.min(dragged.y, peer.y),
                end: Math.max(dragged.y + dragged.height, peer.y + peer.height),
                kind: dl.kind,
              }
            : {
                orientation,
                position: pl.pos,
                start: Math.min(dragged.x, peer.x),
                end: Math.max(dragged.x + dragged.width, peer.x + peer.width),
                kind: dl.kind,
              };
      }
    }
  }
  return best;
}

/**
 * Guides to show for a dragged rect against its peers: at most one vertical and one horizontal
 * (the nearest alignment on each axis). Empty when nothing aligns within tolerance.
 */
export function detectAlignments(
  dragged: GuideRect,
  peers: readonly GuideRect[],
  tolerance: number = ALIGN_TOLERANCE,
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const vertical = nearestOnAxis(dragged, peers, tolerance, 'vertical');
  if (vertical) guides.push(vertical);
  const horizontal = nearestOnAxis(dragged, peers, tolerance, 'horizontal');
  if (horizontal) guides.push(horizontal);
  return guides;
}

/**
 * Cheap structural equality so the canvas host repaints only when guides actually change (OnPush
 * + signal writes gated on real changes — no change-detection storm during drag, Principle V).
 */
export function guidesEqual(a: readonly AlignmentGuide[], b: readonly AlignmentGuide[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.orientation !== y.orientation ||
      x.position !== y.position ||
      x.start !== y.start ||
      x.end !== y.end ||
      x.kind !== y.kind
    ) {
      return false;
    }
  }
  return true;
}
