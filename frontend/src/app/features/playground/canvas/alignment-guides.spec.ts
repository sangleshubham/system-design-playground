import { describe, it, expect } from 'vitest';
import {
  ALIGN_TOLERANCE,
  boundingBox,
  detectAlignments,
  guidesEqual,
  type AlignmentGuide,
  type GuideRect,
} from './alignment-guides';

/** A 100×50 rect at (x, y). */
function rect(x: number, y: number, width = 100, height = 50): GuideRect {
  return { x, y, width, height };
}

describe('alignment-guides geometry', () => {
  describe('boundingBox', () => {
    it('returns null for an empty list', () => {
      expect(boundingBox([])).toBeNull();
    });

    it('returns the single rect unchanged', () => {
      expect(boundingBox([rect(10, 20, 100, 50)])).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    });

    it('unions multiple rects into their overall bounds (multi-drag group)', () => {
      // (10,20)…(110,70) and (200,300)…(260,340) → (10,20)…(260,340)
      const box = boundingBox([rect(10, 20, 100, 50), rect(200, 300, 60, 40)]);
      expect(box).toEqual({ x: 10, y: 20, width: 250, height: 320 });
    });
  });

  describe('detectAlignments — edge matches', () => {
    it('reports a vertical guide when left edges line up (same-side edge)', () => {
      const dragged = rect(100, 400); // left edge x=100
      const peer = rect(100, 0); //     left edge x=100
      const guides = detectAlignments(dragged, [peer]);
      const vertical = guides.find((g) => g.orientation === 'vertical')!;
      expect(vertical).toBeTruthy();
      expect(vertical.kind).toBe('edge');
      expect(vertical.position).toBe(100);
    });

    it('reports a horizontal guide when top edges line up', () => {
      const dragged = rect(400, 50); // top edge y=50
      const peer = rect(0, 50); //     top edge y=50
      const guides = detectAlignments(dragged, [peer]);
      const horizontal = guides.find((g) => g.orientation === 'horizontal')!;
      expect(horizontal).toBeTruthy();
      expect(horizontal.kind).toBe('edge');
      expect(horizontal.position).toBe(50);
    });

    it('spans the line across both the dragged bounds and the matched peer', () => {
      // Vertical guide: span is min(top)…max(bottom) across both rects.
      const dragged = rect(100, 400, 100, 50); // y 400…450
      const peer = rect(100, 0, 100, 50); //      y 0…50
      const vertical = detectAlignments(dragged, [peer]).find((g) => g.orientation === 'vertical')!;
      expect(vertical.start).toBe(0); // min top
      expect(vertical.end).toBe(450); // max bottom
    });
  });

  describe('detectAlignments — center matches', () => {
    it('reports a center-kind guide when horizontal centers line up', () => {
      // dragged centerX = 150; peer centerX = 150 (different left edges, so only centers match)
      const dragged = rect(100, 400, 100, 50); // centerX 150
      const peer = rect(120, 0, 60, 50); //       centerX 150
      const vertical = detectAlignments(dragged, [peer]).find((g) => g.orientation === 'vertical')!;
      expect(vertical.kind).toBe('center');
      expect(vertical.position).toBe(150);
    });

    it('never matches a center line against an edge line', () => {
      // dragged left edge x=100; peer centerX=100 — different kinds must NOT align.
      const dragged = rect(100, 400, 100, 50); // left edge 100, center 150
      const peer = rect(70, 0, 60, 50); //        left edge 70, center 100
      const guides = detectAlignments(dragged, [peer]);
      expect(guides.some((g) => g.orientation === 'vertical')).toBe(false);
    });
  });

  describe('detectAlignments — tolerance boundary', () => {
    const peer = rect(100, 0);

    it('matches strictly inside tolerance', () => {
      const dragged = rect(100 + (ALIGN_TOLERANCE - 1), 400);
      expect(detectAlignments(dragged, [peer]).some((g) => g.orientation === 'vertical')).toBe(true);
    });

    it('matches exactly at tolerance (inclusive)', () => {
      const dragged = rect(100 + ALIGN_TOLERANCE, 400);
      expect(detectAlignments(dragged, [peer]).some((g) => g.orientation === 'vertical')).toBe(true);
    });

    it('does not match just outside tolerance', () => {
      const dragged = rect(100 + (ALIGN_TOLERANCE + 1), 400);
      expect(detectAlignments(dragged, [peer]).some((g) => g.orientation === 'vertical')).toBe(false);
    });
  });

  describe('detectAlignments — nearest-per-axis', () => {
    it('emits at most one vertical and one horizontal guide', () => {
      // dragged aligns with peerA on x and peerB on y simultaneously.
      const dragged = rect(200, 200, 100, 50);
      const peerA = rect(200, 900, 100, 50); // shares left edge x=200 (vertical)
      const peerB = rect(900, 200, 100, 50); // shares top edge y=200 (horizontal)
      const guides = detectAlignments(dragged, [peerA, peerB]);
      expect(guides.filter((g) => g.orientation === 'vertical')).toHaveLength(1);
      expect(guides.filter((g) => g.orientation === 'horizontal')).toHaveLength(1);
    });

    it('among multiple vertical candidates the closest one wins', () => {
      const dragged = rect(100, 400); // left edge x=100
      const near = rect(103, 0); //      left edge x=103 (delta 3)
      const far = rect(105, 0); //       left edge x=105 (delta 5, both within tolerance 6)
      const vertical = detectAlignments(dragged, [far, near]).find((g) => g.orientation === 'vertical')!;
      expect(vertical.position).toBe(103); // the nearer peer's line
    });
  });

  it('returns no guides when nothing is within tolerance', () => {
    expect(detectAlignments(rect(0, 0), [rect(500, 500)])).toEqual([]);
  });

  describe('guidesEqual', () => {
    const g = (): AlignmentGuide => ({
      orientation: 'vertical',
      position: 100,
      start: 0,
      end: 200,
      kind: 'edge',
    });

    it('is true for structurally identical guide lists', () => {
      expect(guidesEqual([g()], [g()])).toBe(true);
    });

    it('is false when lengths differ', () => {
      expect(guidesEqual([g()], [])).toBe(false);
    });

    it('is false when any field differs', () => {
      expect(guidesEqual([g()], [{ ...g(), position: 101 }])).toBe(false);
      expect(guidesEqual([g()], [{ ...g(), kind: 'center' }])).toBe(false);
    });
  });
});
