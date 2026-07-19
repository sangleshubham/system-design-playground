# Data Model: Canvas Controls & Viewport Fixes

**Feature**: `006-fix-canvas-controls` | **Date**: 2026-07-19

No persisted entities are created or modified — the feature is pure UI state. The access
key is read (never written) from the existing `KeyService` store. Entities below are
client-side state definitions the implementation must respect.

## E1 — CanvasViewState (existing, behavior amended)

Owned by `@foblex/flow` transform model, accessed via `FCanvasComponent`.

| Field | Type | Rules |
|---|---|---|
| `scale` | `number` | Interactive zoom clamps to **[0.25, 2.5]** (`fZoomMinimum`/`fZoomMaximum`, unchanged). Fit-to-screen result clamps to **≤ 1.0** (new, FR-004). |
| `position` | `IPoint` | When the fit clamp triggers, content is **centered** (`resetScaleAndCenter`). |

**State transitions (fitToView, FR-004/005/006)**:

```
fitToView()
  ├─ fitToScreen({x:48, y:48}, animated) → scale' = min(hostW/contentW, hostH/contentH)
  ├─ scale' ≤ 1.0 and finite  → keep (zoom-out path, padding preserved)   [FR-006]
  └─ scale' > 1.0 or non-finite → resetScaleAndCenter(animated) → scale = 1.0, centered  [FR-004]
```

Invariant: every fit trigger (toolbar, `Mod+0`, post-tidy) passes through `fitToView()` —
no other call site may invoke `fitToScreen` directly (FR-005).

## E2 — FullscreenState (existing, unchanged shape)

Owned by `CanvasControlsComponent`.

| Field | Type | Rules |
|---|---|---|
| `isFullscreen` | `signal<boolean>` | Derived from `document.fullscreenElement` on `fullscreenchange`. Now also drives the button's icon (`fullscreen` ⇄ `fullscreen-exit`) and label ("Full screen" ⇄ "Exit full screen") (FR-007/008). |
| `fullscreenTarget` | `input<HTMLElement \| null>` | Unchanged: the `#canvasArea` section. |

**Popup-visibility invariant (FR-001/002/003)**: while `isFullscreen` is true, every popup
must be a DOM descendant of `document.fullscreenElement` — CDK overlays via
`FullscreenOverlayContainer` (re-parents automatically on `fullscreenchange`), inline
dialogs by living inside `#canvasArea`. At most **one** instance of each popup exists at
any time (both inline dialogs are single-`@if` driven; the CDK container moves, never clones).

## E3 — CopyKeyControlState (new)

Owned by `CanvasControlsComponent`; key value owned by `KeyService` (read-only here).

| Field | Type | Rules |
|---|---|---|
| `copyState` | `signal<'idle' \| 'copied' \| 'error'>` | Starts `idle`. Non-`idle` states auto-revert after **1.5 s** (FR-013/015). |
| visibility | derived | Button rendered only when `KeyService.hasKey()` is true (edge case: no key → no control). |
| copied value | `string` | Always `KeyService.key()` verbatim — full 12-char canonical key, **never** `maskKey()` output (FR-014). |

**State transitions**:

```
idle --click--> writeText(key) pending
  pending --resolve--> copied --1.5s--> idle     [FR-013]
  pending --reject / clipboard API absent--> error --1.5s--> idle   [FR-015]
```

Both `copied` and `error` render visibly on the button itself (icon/label swap) —
non-blocking, no dialogs (FR-015, FR-016 < 100 ms perceived feedback).

## E4 — Theme tokens (existing, one value changed)

Defined in `frontend/src/styles/_tokens.scss`; consumed by `.pg-canvas-area`, `f-flow`,
and the dot-grid sync effect.

| Token | Light (new) | Light (old) | Dark (unchanged) | Rule |
|---|---|---|---|---|
| `--canvas-bg` | `var(--surface-0)` → `#ffffff` | `#f8fafc` | `#0f172a` | Light theme only (FR-009); dark theme stays internally consistent (edge case). |
| `--canvas-dot` | `#cbd5e1` (unchanged) | `#cbd5e1` | `#334155` | Must remain faintly visible on white (FR-011); fallback `#c2cdd9` only if visual QA fails. |

Contrast rule (FR-010): node cards, minimap, and popups keep ≥ 1px `--border-subtle`
borders + existing shadows against the white canvas; documented fallback is upgrading those
two component borders to `--border-strong` (no token edits).

## E5 — Icon registry entries (shared/icon.registry.ts)

| Name | Status | Rule |
|---|---|---|
| `fit` | REPLACED | Corner brackets + centered inner rect — must be distinguishable from `fullscreen` at 1em (FR-007, SC-003). |
| `fullscreen` | unchanged | Outward corner brackets (universal glyph). |
| `fullscreen-exit` | NEW | Inward corner brackets; shown while `isFullscreen`. |
| `key` | NEW | Copy-my-key button glyph (US5). |
| `check` | NEW (if absent) | Copied-confirmation glyph (US5). |

All entries use the existing `svg()` helper contract: 24×24 viewBox, `stroke=currentColor`,
stroke-width 2, `fill=none` (except deliberate fills), 1em sizing.
