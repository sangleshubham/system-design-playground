# Research: Canvas Controls & Viewport Fixes

**Feature**: `006-fix-canvas-controls` | **Date**: 2026-07-19
**Method**: Three parallel codebase-research agents (fullscreen/popups, zoom/fit-to-screen,
styling/access-key) over `frontend/` and the installed `@foblex/flow` 19.0.0 typings/bundle.

All paths below are relative to the repo root. No NEEDS CLARIFICATION items remain —
the two open product questions (fit-to-screen ceiling, copy-key mechanism) were resolved
with the requester during specification (ceiling = **100%**, mechanism = **toolbar button
only**) and are recorded in the spec's Assumptions.

---

## R1 — Why popups are invisible in full-screen, and how to fix it (US1)

### Findings (root cause)

Full-screen is requested on the inner canvas section only:

- `frontend/src/app/features/playground/playground.page.html:56-59` — `<section class="pg-canvas-area" #canvasArea>` is passed as `[fullscreenTarget]` to `app-canvas-controls`; the section contains only the cost indicator, the canvas, and the controls.
- `frontend/src/app/features/playground/canvas/canvas-controls.component.ts:103-110` — `toggleFullscreen()` calls `target.requestFullscreen()` / `document.exitFullscreen()`. State tracked via `document:fullscreenchange` (lines 53–56).
- Sandbox page has identical wiring (`frontend/src/app/features/sandbox/sandbox.page.html:51`).

All three popups render **outside** that subtree, so the browser does not paint them while
`#canvasArea` holds the fullscreen top layer:

| Popup | Rendered where | Evidence |
|---|---|---|
| Reset confirmation | CDK Overlay container on `document.body` | `frontend/src/app/shared/confirm-dialog.service.ts:11-29` (CDK `Overlay.create` + `ComponentPortal`), triggered from `canvas-controls.component.ts:80-88` |
| Results/scoring dialog | Inline, **sibling of `.playground`** (ancestor of `#canvasArea`) | `playground.page.html:71-81`; host CSS `position: fixed; inset: 0; z-index: 200` (`results-dialog.component.scss:1-8`) |
| AI-review panel | Inline, sibling of `.playground`, in `@defer` | `playground.page.html:83-91`; identical host CSS (`ai-review-panel.component.scss:1-8`) |

`position: fixed` + high `z-index` are irrelevant: per the Fullscreen API, non-descendants
of the fullscreen element are simply not painted. No `:fullscreen` CSS or custom
`OverlayContainer` exists anywhere in `src` (verified by grep).

### Decision

Two-part fix, no new dependencies:

1. **CDK overlays (Reset confirm + the sibling conflict dialog)**: register Angular CDK's
   built-in **`FullscreenOverlayContainer`** in `frontend/src/app/app.config.ts`:
   `{ provide: OverlayContainer, useClass: FullscreenOverlayContainer }` (both classes from
   `@angular/cdk/overlay`, already a dependency). It re-parents the overlay container into
   `document.fullscreenElement` on `fullscreenchange` and back to `body` on exit — open
   overlays move with it, so exactly one instance ever exists (FR-003). Fixes the confirm
   dialog on **both** playground and sandbox pages at once.
2. **Inline dialogs (results, AI-review)**: move their `@if` blocks inside the
   `<section class="pg-canvas-area" #canvasArea>` element in `playground.page.html` so they
   are descendants of the fullscreen element. Their existing `position: fixed; inset: 0`
   host styling keeps covering the whole viewport in normal mode and the whole screen in
   fullscreen mode (inside a fullscreen element, the viewport IS that element). Both blocks
   are `@if`-driven off single signals, so duplicate/stale instances are impossible by
   construction (FR-003). Verify `z-index: 200` still beats the in-section toolbars
   (`z-index: 10`, `canvas-controls.component.scss:1-20`) — it does.

Browser-denied fullscreen is already handled (`.catch(() => undefined)` on the request);
popups then simply render in normal mode, which satisfies the edge case.

### Alternatives considered

- **Fullscreen the page root instead of `#canvasArea`** — rejected: changes the product's
  fullscreen semantics (would drag the palette/context panel into fullscreen); the spec
  assumes the existing fullscreen mechanism is retained.
- **Convert all three popups to native `<dialog>.showModal()`** (top-layer elements stack
  above fullscreen) — rejected: refactors three components plus the shared confirm service
  for no extra benefit over the two-line provider + template move.
- **Hand-rolled `fullscreenchange` re-parenting service** — rejected: CDK already ships
  exactly this (`FullscreenOverlayContainer`); writing our own violates simplicity.

---

## R2 — Capping fit-to-screen zoom at 100% (US2)

### Findings (current behavior: UNBOUNDED zoom-in)

- Every fit path funnels through **one method**: `CanvasComponent.fitToView()`
  (`frontend/src/app/features/playground/canvas/canvas.component.ts:648-650`), which calls
  `this.canvasCmp()?.fitToScreen({ x: 48, y: 48 }, true)` — padding 48px, animated.
  Call sites: toolbar Fit button (`canvas-controls.component.ts:96-98`), keyboard `Mod+0`
  (`canvas.component.ts:546-551`), and post-auto-tidy (`canvas-controls.component.ts:74-78`,
  a 60 ms `setTimeout` after dagre layout). This makes FR-005 cheap: clamp once, cover all.
- Interactive zoom **is** clamped to 25%–250% via `<f-canvas fZoom [fZoomMinimum]="0.25"
  [fZoomMaximum]="2.5">` (`canvas.component.html:12`) — but that clamp lives in
  `FZoomDirective`'s `SetZoom` handler only (bundle `foblex-flow.mjs:19304-19329`).
- `fitToScreen` **bypasses the clamp entirely**: `FitToFlow.fitToParent` sets
  `transform.scale = Math.min(parentW/contentW, parentH/contentH)` with no min/max
  (bundle `foblex-flow.mjs:888-896`). Signature is `fitToScreen(padding?: IPoint,
  animated?: boolean)` (`index.d.ts:367`) — **no max-scale parameter exists**, and neither
  README nor typings document any cap option.
- Useful public APIs on `FCanvasComponent` (`index.d.ts:361-392`): `getScale(): number`
  (returns `transform.scale` synchronously — the model value, not an animated
  interpolation), `setScale(scale, toPosition?)`, and `resetScaleAndCenter(animated?)`
  (scale to 1.0 = exactly 100%, centered).
- No zoom-percentage readout exists in the UI; no existing tests cover fit/clamp behavior
  (`canvas-shortcuts.spec.ts` only verifies shortcut routing).

### Decision

**Post-fit clamp inside `CanvasComponent.fitToView()`** (single choke point):

```
fitToScreen({x: 48, y: 48}, true);
const s = getScale();                    // synchronous model value = fit target scale
if (!Number.isFinite(s) || s > 1) resetScaleAndCenter(true);
```

- The transform model updates synchronously inside `fitToScreen` (animation is
  presentation-only), so `getScale()` immediately returns the fit's target scale. When it
  exceeds 1.0, `resetScaleAndCenter(true)` supersedes it in the same task — before the next
  paint — so the user sees a single animated settle at exactly 100%, centered. That is
  precisely the US2 acceptance behavior for small/empty/single-node diagrams.
- Large diagrams (`s ≤ 1`) keep today's behavior byte-for-byte: animated fit with 48px
  padding (FR-006).
- The `!Number.isFinite(s)` guard covers the empty-canvas edge (division by a zero-size
  content box).
- The manual zoom range (25%–250%) is untouched (spec assumption).

> **Correction (found during runtime verification, 2026-07-19).** The assumption above —
> that "the transform model updates synchronously inside `fitToScreen`" — is **wrong** for
> `@foblex/flow` 19. `FCanvasComponent.fitToScreen()` defers its work via
> `_afterRedraw(() => afterNextRender(cb))`; the `FitToFlow` handler that sets
> `transform.scale` runs **after the next render**. So `getScale()` called synchronously
> right after `fitToScreen()` returns the *old* scale, the `s > 1` check is always false,
> and the clamp never fires (the single node balloons to ~3.76×). **Corrected implementation:**
> the clamp is deferred to the `(fCanvasChange)` output on `<f-canvas>`, which Foblex fires
> from `RedrawCanvasWithAnimation → emitCanvasChangeEvent` once the fit has applied. A
> `fitClampPending` flag set in `fitToView()` is consumed by `onCanvasTransformChange()`,
> which then reads the (now-updated) `getScale()` and calls `resetScaleAndCenter(true)` when
> `> 1` or non-finite. Empty canvas is handled up front (`hasAnyElements()` false →
> `resetScaleAndCenter` directly), since `fitToScreen` no-ops on a zero-size box and would
> otherwise leave the flag dangling. Manual zoom is unaffected — the flag is only set by a
> fit. Verified in-browser: single node fits at scale 1.0; 250%/25% manual bounds intact.

### Alternatives considered

- **Pre-compute the fit scale from a content bounding box and choose the call up front** —
  rejected: duplicates library-internal rect math (node DOM measurement, padding
  arithmetic) that `fitToScreen` already does; more code, more drift risk, same outcome.
- **Patch/fork `@foblex/flow` to clamp `fitToParent`** — rejected: Constitution III
  (stack discipline) and maintenance burden; app-side clamp uses only public API.
- **`setScale(1, center)` instead of `resetScaleAndCenter`** — rejected:
  `resetScaleAndCenter` both clamps and centers in one documented call; hand-computing the
  center point duplicates it.

---

## R3 — Distinguishable Full-screen vs Fit-to-screen icons (US3)

### Findings

Both buttons live in the bottom toolbar (`canvas-controls.component.html:56-78`) and use
near-identical four-corner-bracket SVGs from `frontend/src/app/shared/icon.registry.ts`:

- `fit` (line 31): `M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4` — rounded corner brackets.
- `fullscreen` (line 34): `M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5` — square corner brackets.

At 1em toolbar size these are visually the same glyph. Tooltips exist today:
`title="Fit to view (⌘0)"` / `aria-label="Fit to view"` and `title="Fullscreen"` /
`aria-label="Fullscreen"` (`canvas-controls.component.html:63-66`). Icons render via the
shared `svg()` helper (24×24 viewBox, `stroke="currentColor"`, stroke-width 2).

### Decision

- **Keep `fullscreen` as the corner-bracket glyph** (it is the universal fullscreen icon)
  and **replace `fit`** in `icon.registry.ts` with a "content inside a frame" glyph:
  corner brackets **plus a small centered rectangle** (e.g. add
  `<rect x="9" y="9" width="6" height="6" rx="1"/>` to the existing bracket path), reading
  as "fit content within bounds" — distinct at toolbar size because one glyph has a filled
  center and the other is empty.
- **Add a `fullscreen-exit` icon** (inward-pointing brackets: `M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5`)
  and switch the button's icon + label on the existing `isFullscreen` signal — reinforces
  which control is fullscreen and communicates state.
- **Align labels with the spec's wording** (FR-008): `title`/`aria-label` become
  "Full screen" / "Exit full screen" and "Fit to screen (⌘0)" / "Fit to screen".

### Alternatives considered

- **Icon library (Material icons, Lucide, …)** — rejected: new dependency for two glyphs;
  the hand-rolled registry is the established pattern (Constitution III justification bar).
- **Change the fullscreen glyph instead** — rejected: corner brackets are the convention
  for fullscreen; fit-to-screen has no single convention, so it is the right one to change.

---

## R4 — Single white drawable canvas (US4)

### Findings

- Page background is white: `body { background-color: var(--surface-0); }`
  (`frontend/src/styles.scss:44`), `--surface-0: #ffffff` (`frontend/src/styles/_tokens.scss:49`).
- The gray drawable area is **one token**: `--canvas-bg: #f8fafc` (slate-50) at
  `_tokens.scss:72`, painted by both `.pg-canvas-area` (`playground.page.scss:108-113`) and
  `f-flow` (`canvas.component.scss:8-13`). Dark theme: `--canvas-bg: #0f172a` at `_tokens.scss:133`.
- Dot grid: `<f-circle-pattern [color]="dotColor()" [radius]="1.4">`
  (`canvas.component.html:13-15`); `dotColor` is a signal synced from `--canvas-dot`
  (`#cbd5e1` light, `_tokens.scss:73`) by an effect (`canvas.component.ts:175-185`).
- Contrast context: node cards and minimap are `--surface-raised` (#ffffff) with 1px
  `--border-subtle` (#e2e8f0) borders and soft shadows (`design-node.component.scss:7-28`,
  `canvas.component.scss:20-32`) — on a pure-white canvas they lose the slight
  tone-on-tone separation they had on slate-50 and rely on borders/shadows alone.

### Decision

- Change the **light-theme token only**: `--canvas-bg: var(--surface-0)` (resolves to
  `#ffffff`) at `_tokens.scss:72`. One edit covers both painted surfaces; the dark theme
  keeps `#0f172a` untouched (spec assumption — no half-changed dark mode).
- Keep `--canvas-dot: #cbd5e1` — slate-300 dots remain faintly but clearly visible on
  white (FR-011); adjust only if visual QA disagrees (fallback: `#c2cdd9`).
- **Contrast check task** (FR-010): verify node cards, minimap, and popups against the
  white canvas at 100% zoom in light theme. Documented fallback if borders read too weak:
  bump card/minimap border to `--border-strong` (#cbd5e1) — a two-selector change in the
  playground feature, no token changes.

### Alternatives considered

- **Hardcode `#fff` in the two SCSS files** — rejected: breaks theme awareness and misses
  future consumers of the token; the token is the single source of truth.
- **Remove the dot grid** — rejected: spec explicitly retains it for spatial reference.
- **Also whiten the dark theme** — rejected: spec scopes the change to the light theme.

---

## R5 — "Copy my key" control on the canvas (US5)

### Findings

- The **full 12-char key is available client-side**: `KeyService`
  (`frontend/src/app/core/key.service.ts`) persists it in `localStorage` under
  `sdp.accessKey` (line 5) and exposes `key()` (full raw key or `null`, line 19) and
  `hasKey` computed (line 21). Key format helpers live in `core/key-format.ts`
  (`canonicalKey`, `groupKey`, `maskKey` — mask is display-only; storage is always full).
- A reusable clipboard pattern exists: `WelcomePage.copyKey()`
  (`frontend/src/app/features/welcome/welcome.page.ts:62-70`) uses
  `navigator.clipboard.writeText` with a 1.5 s "✓ Copied" signal — **but** it flips the
  copied state before awaiting the promise, so it cannot distinguish failure. The canvas
  button must await success and branch (FR-015). No `@angular/cdk/clipboard` usage exists.
- Insertion point: `CanvasControlsComponent`
  (`frontend/src/app/features/playground/canvas/canvas-controls.component.{ts,html,scss}`) —
  already injects services and hosts both toolbars; shared by playground **and** sandbox
  pages, so the button appears on both (same workspace key — desirable). New icons register
  in `frontend/src/app/shared/icon.registry.ts` via `<app-icon>`.

### Decision

- Add a **"Copy my key" button** to the canvas controls (top toolbar, after Reset, with the
  existing divider pattern), visible only when `KeyService.hasKey()` is true (edge case:
  no key → control absent, nothing to copy).
- Handler: read `keys.key()`, call `navigator.clipboard.writeText(key)`, **await** it;
  on resolve show a 1.5 s "Copied ✓" state (icon/label swap — same immediate-feedback
  pattern as Welcome); on reject (or clipboard API absent) show a 1.5 s non-blocking
  "Copy failed" state on the same button (FR-015). No keyboard shortcut (spec assumption —
  avoids colliding with the existing copy-selection shortcut).
- Register a `key` icon (and a `check` icon if not present) in `icon.registry.ts`.
- Copied value is `keys.key()` verbatim — complete canonical key, never `maskKey` output (FR-014).

### Alternatives considered

- **`@angular/cdk/clipboard`** — rejected: `navigator.clipboard` is the established
  in-repo pattern and needs no extra module; CDK adds nothing for a single string copy.
- **Keyboard shortcut for copy-key** — rejected during specification (conflicts with
  copy-selection Mod+C).
- **Reuse the Welcome `copyKey()` verbatim** — rejected: it reports success on failure;
  the new handler awaits the promise (and the Welcome page can be left as-is — out of scope).

---

## R6 — Testing approach (constitution quality gate)

### Findings

- Frontend tests: Vitest via `ng test --no-watch`, co-located `*.spec.ts`; ESLint via
  `npm run lint`. Existing canvas specs: `canvas-shortcuts.spec.ts` (shortcut routing only),
  `tidy.spec.ts` (layout + undo commit), `canvas-controls.component.spec.ts` /
  `canvas.component.spec.ts` (no zoom/fit coverage).

### Decision

Unit/smoke coverage added with the feature (no new test tooling):

1. `fitToView()` clamp: mock `FCanvasComponent` (`getScale`, `fitToScreen`,
   `resetScaleAndCenter`) — assert clamp fires for scale > 1 and non-finite, not for ≤ 1.
2. Copy-key handler: mock `navigator.clipboard` — assert full-key write, copied state on
   resolve, error state on reject, button hidden when `hasKey()` is false.
3. `app.config.ts` provider: assert `OverlayContainer` resolves to
   `FullscreenOverlayContainer`.
4. Icon registry: assert `fit`, `fullscreen`, `fullscreen-exit`, `key` entries exist and
   `fit` ≠ `fullscreen` markup.
5. Visual/manual checks (background, contrast, fullscreen popups, icon legibility) are
   scripted in `quickstart.md` — they are inherently visual (SC-003, SC-004).
