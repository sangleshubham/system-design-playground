# UI Contracts: Canvas Controls & Viewport Fixes

**Feature**: `006-fix-canvas-controls` | **Date**: 2026-07-19

No REST/API contracts change (no backend involvement). This feature's external interfaces
are UI contracts: component inputs/behaviors and app-level providers other code relies on.
Each contract lists its consumer-visible guarantees; implementation details live in
[research.md](../research.md) and phase scopes in [plan.md](../plan.md).

---

## C1 — App-level overlay container provider (US1)

**File**: `frontend/src/app/app.config.ts`

```ts
import { OverlayContainer, FullscreenOverlayContainer } from '@angular/cdk/overlay';
// providers: [..., { provide: OverlayContainer, useClass: FullscreenOverlayContainer }]
```

**Guarantees**
- G1: Every CDK overlay in the app (confirm dialog, conflict dialog, future overlays)
  renders inside `document.fullscreenElement` while fullscreen is active, `document.body`
  otherwise.
- G2: An overlay open across a fullscreen enter/exit transition moves with the container —
  it is never duplicated and never orphaned (FR-003).
- G3: No per-dialog code changes are required in `ConfirmDialogService` /
  `ConflictDialogService` — they remain consumers of the injected `Overlay`.

**Test hook**: `TestBed.inject(OverlayContainer) instanceof FullscreenOverlayContainer`.

---

## C2 — Playground page template: dialog placement (US1)

**File**: `frontend/src/app/features/playground/playground.page.html`

**Guarantees**
- G1: `<app-results-dialog>` and `<app-ai-review-panel>` `@if` blocks render **inside**
  `<section class="pg-canvas-area" #canvasArea>` (descendants of the fullscreen target).
- G2: Trigger conditions are unchanged (`result()` signal; `aiReviewOpen() && store.level()`
  with the existing `@defer`), so exactly one instance exists per popup at all times.
- G3: In normal (non-fullscreen) mode the dialogs still overlay the **entire viewport**
  (their `:host { position: fixed; inset: 0; z-index: 200 }` styling is untouched).
- G4: While fullscreen, dialogs stack above the in-section toolbars (`z-index` 200 > 10)
  and the cost indicator.

---

## C3 — `CanvasComponent.fitToView()` behavioral contract (US2)

**File**: `frontend/src/app/features/playground/canvas/canvas.component.ts`

**Signature unchanged**: `fitToView(): void` — existing callers (toolbar `fit()`, `Mod+0`
shortcut, post-tidy `setTimeout`) require no edits (FR-005).

**Guarantees**
- G1: After the call settles, `getScale() ≤ 1.0` whenever the diagram could fit at or above
  actual size; the view is centered in that case (FR-004).
- G2: Diagrams larger than the viewport keep today's behavior byte-for-byte: animated
  zoom-out with `{x: 48, y: 48}` padding until fully visible (FR-006).
- G3: Empty/degenerate canvas (non-finite fit scale) settles at scale 1.0, centered
  (edge case; no NaN/Infinity ever applied to the transform).
- G4: Only public `@foblex/flow` APIs are used (`fitToScreen`, `getScale`,
  `resetScaleAndCenter`); the interactive zoom clamp `[0.25, 2.5]` is not modified.
- G5: The clamp resolves in the same fit gesture — the correction is applied on the
  transform-change that `fitToScreen` produces (one settle to 100%; FR-016). *(Revised: the
  decision is deferred to `(fCanvasChange)`, not synchronous — see research.md R2 Correction;
  `fitToScreen` mutates the transform after the next render, so a synchronous `getScale()` is
  stale.)*

**Test hook**: mock `FCanvasComponent`; call `fitToView()` then `onCanvasTransformChange()`
and assert `resetScaleAndCenter` is called iff `getScale()` returns `> 1` or non-finite, and
is NOT called on a bare `onCanvasTransformChange()` (manual zoom — no pending fit).

---

## C4 — `CanvasControlsComponent`: toolbar contract (US3 + US5)

**Files**: `frontend/src/app/features/playground/canvas/canvas-controls.component.{ts,html,scss}`

**Guarantees — icons/labels (US3)**
- G1: Fit button renders icon `fit` (new glyph) with `title="Fit to screen (⌘0 / Ctrl+0
  per platform hint)"` and `aria-label="Fit to screen"`.
- G2: Fullscreen button renders icon `fullscreen` + `title`/`aria-label` "Full screen" when
  `isFullscreen()` is false; icon `fullscreen-exit` + "Exit full screen" when true.
- G3: The two glyphs are visually distinct at 1em toolbar size (SC-003 usability check).

**Guarantees — copy key (US5)**
- G4: A "Copy my key" button exists in the canvas controls, rendered **only** when
  `KeyService.hasKey()` is true.
- G5: Click ⇒ `navigator.clipboard.writeText(KeyService.key())` with the **full canonical
  key** — never masked/truncated (FR-012/014).
- G6: The write is awaited: resolve ⇒ `copied` visual state; reject or missing clipboard
  API ⇒ `error` visual state; both auto-revert after 1.5 s; neither blocks the canvas
  (FR-013/015, data-model E3).
- G7: No keyboard shortcut is bound to this action (spec assumption; existing `Mod+C`
  copy-selection is untouched).
- G8: The component stays shared: identical behavior on playground and sandbox pages, no
  page-specific forks (Constitution IV).

---

## C5 — Icon registry contract (US3 + US5)

**File**: `frontend/src/app/shared/icon.registry.ts`

**Guarantees**
- G1: Entries `fit` (replaced), `fullscreen` (unchanged), `fullscreen-exit` (new),
  `key` (new), `check` (new if absent) exist and render through the existing `svg()`
  helper (24×24, stroke-based, 1em).
- G2: `fit` markup ≠ `fullscreen` markup (regression guard for the original bug).
- G3: No other existing entries are modified (undo/redo/zoom/lock/etc. untouched).

---

## C6 — Theme token contract (US4)

**File**: `frontend/src/styles/_tokens.scss`

**Guarantees**
- G1: Light theme (`:root, :root[data-theme='light']`): `--canvas-bg: var(--surface-0)`
  (computes to `#ffffff`) — the only token value change in this feature (FR-009).
- G2: Dark theme block is byte-identical to before (`--canvas-bg: #0f172a`,
  `--canvas-dot: #334155`) (edge case: dark theme consistency).
- G3: `--canvas-dot` light value stays `#cbd5e1` unless visual QA (quickstart §US4) fails
  FR-011, in which case the documented fallback `#c2cdd9` applies.
- G4: Consumers are unchanged: `.pg-canvas-area`, `f-flow`, and the dot-color sync effect
  keep reading the same tokens — no hardcoded colors introduced.
