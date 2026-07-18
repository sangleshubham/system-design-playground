import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AlignmentGuide } from './alignment-guides.js';

/**
 * Canvas→overlay(screen) mapping: `overlayPx = offset + canvasCoord × scale`.
 *
 * The overlay lives OUTSIDE the Foblex transform: `f-canvas` projects only `[fNode]` / `f-connection`
 * children through selective `<ng-content select=...>`, so an overlay placed inside it would be
 * dropped (never rendered). Painting outside also keeps guide lines a crisp, constant thickness at
 * every zoom. The canvas host feeds the live transform each frame; this renderer projects the
 * canvas-space guides to screen. Identity by default so canvas-space guides render 1:1 (smoke test).
 */
export interface GuideViewport {
  scale: number;
  x: number;
  y: number;
}

const IDENTITY: GuideViewport = { scale: 1, x: 0, y: 0 };

/** Guide-line thickness in SCREEN px — constant across zoom because we render outside the transform. */
const THICKNESS = 1.5;

/**
 * Dumb alignment-guide overlay (US5; contract ui-components §2). Renders one absolutely-positioned
 * line per guide and nothing else — no detection, no store, no DOM measuring. All detection lives
 * in the canvas host + `alignment-guides.ts`. Empty `guides` ⇒ renders nothing.
 */
@Component({
  selector: 'app-alignment-guides',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (g of guides(); track $index) {
      <div
        class="guide"
        [class.center]="g.kind === 'center'"
        [class.vertical]="g.orientation === 'vertical'"
        [class.horizontal]="g.orientation === 'horizontal'"
        [style.left.px]="lineLeft(g)"
        [style.top.px]="lineTop(g)"
        [style.width.px]="lineWidth(g)"
        [style.height.px]="lineHeight(g)"
      ></div>
    }
  `,
  styles: [
    `
      :host {
        --guide-color: #ec4899;
        position: absolute;
        inset: 0;
        overflow: visible;
        pointer-events: none;
        z-index: 6;
      }

      .guide {
        position: absolute;
        background: var(--guide-color);
      }

      /* 'center' alignments read as dashed lines (the data-model kind styling hook); edge
         alignments stay solid. Direction follows the guide orientation. */
      .guide.center.vertical {
        background: repeating-linear-gradient(
          to bottom,
          var(--guide-color) 0 4px,
          transparent 4px 8px
        );
      }
      .guide.center.horizontal {
        background: repeating-linear-gradient(
          to right,
          var(--guide-color) 0 4px,
          transparent 4px 8px
        );
      }
    `,
  ],
})
export class AlignmentGuidesComponent {
  /** Guides to draw, in CANVAS space (data-model §2). Empty ⇒ nothing renders. */
  readonly guides = input<AlignmentGuide[]>([]);
  /** Live canvas→screen transform from the host. Defaults to identity for direct/testing use. */
  readonly transform = input<GuideViewport>(IDENTITY);

  lineLeft(g: AlignmentGuide): number {
    const t = this.transform();
    return g.orientation === 'vertical'
      ? t.x + g.position * t.scale - THICKNESS / 2
      : t.x + g.start * t.scale;
  }

  lineTop(g: AlignmentGuide): number {
    const t = this.transform();
    return g.orientation === 'horizontal'
      ? t.y + g.position * t.scale - THICKNESS / 2
      : t.y + g.start * t.scale;
  }

  lineWidth(g: AlignmentGuide): number {
    return g.orientation === 'vertical' ? THICKNESS : (g.end - g.start) * this.transform().scale;
  }

  lineHeight(g: AlignmentGuide): number {
    return g.orientation === 'horizontal' ? THICKNESS : (g.end - g.start) * this.transform().scale;
  }
}
