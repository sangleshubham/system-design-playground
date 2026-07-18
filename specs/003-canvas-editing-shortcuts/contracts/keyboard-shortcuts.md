# Contract: Keyboard Shortcut Map

**Feature**: 003-canvas-editing-shortcuts | **Scope**: UI contract (no REST surface — this feature adds no backend endpoints; existing `/api/v1/` endpoints are reused unchanged)

Single dispatch point: the canvas keyboard router (`canvas-shortcuts.ts`, hosted by `CanvasComponent` on `document:keydown`). No other component may bind these keys.

## Platform rule (FR-024)

`Mod` = `metaKey` on macOS, `ctrlKey` on Windows/Linux. Detection via platform check once; the router matches on the resolved modifier. Shortcuts with the *wrong* modifier for the platform do not match.

## Global guards — evaluated in order, before any dispatch

| # | Guard | Rule | FR |
|---|---|---|---|
| G1 | Text-editing | If `event.target` is `INPUT`, `TEXTAREA`, or inside `[contenteditable]` → router ignores the event entirely (no preventDefault); native field behavior (incl. field-level Ctrl+C/V/Z) wins | FR-023 |
| G2 | Lock | If `store.locked()` → every binding below is inert (no action, and no preventDefault except none needed) | FR-022 |
| G3 | Zoom target scope | Zoom bindings only: match only when the canvas is the *active target* (pointer over the canvas host, or focus within it); otherwise the browser's page zoom proceeds untouched | FR-016 |

## Bindings

| Binding | Action (contract) | preventDefault | Applicability guard (drives disabled states too) | FR |
|---|---|---|---|---|
| `Mod+C` | `store.copySelection()` | Yes (when dispatched) | selection non-empty; no-op preserving buffer otherwise | FR-001/002/008 |
| `Mod+V` | `store.pasteClipboard()` then sync Foblex selection to pasted items | Yes | `store.canPaste()` | FR-003–006/008 |
| `Mod+D` | `store.duplicateSelection()` then sync Foblex selection | Yes (browser bookmark default suppressed) | selection non-empty | FR-014 |
| `Mod+Z` | `store.undo()` then `flow.clearSelection()` | Yes | no-op at history start | FR-009/011 |
| `Mod+Shift+Z` | `store.redo()` then `flow.clearSelection()` | Yes | no-op at history end; **no other redo binding** (no Ctrl+Y) | FR-010/011 |
| `Mod+A` | `store.selectAllElements()` + `flow.select(nodeAndNoteIds, edgeIds, false)` | Yes | canvas non-empty; no-op on empty canvas | FR-012 |
| `Escape` | Clear selection: store + `flow.clearSelection()` | No | Only when not text-editing (G1 keeps editor Escape semantics) | FR-013 |
| `ArrowUp/Down/Left/Right` | `store.nudgeSelection(dx, dy)` — step `NUDGE_STEP` | Yes when selection non-empty (blocks page scroll); **No** when selection empty (page scroll preserved — spec edge case) | selection non-empty | FR-015 |
| `Shift+Arrow*` | Same, step `NUDGE_STEP × 10` | Same rule | selection non-empty | FR-015 |
| `Mod+Plus` / `Mod+=` | `zoom.zoomIn()` | Yes (blocks page zoom) | G3 | FR-016 |
| `Mod+Minus` | `zoom.zoomOut()` | Yes (blocks page zoom) | G3 | FR-016 |
| `Mod+0` | `fitToView()` (fit full design) | Yes (blocks page-zoom reset) | G3 | FR-016 |
| `Delete` / `Backspace` | *(existing behavior, unchanged)* `store.deleteSelection()` | existing | existing guard, now shared via G1/G2 | spec Assumptions |

## Behavioral invariants

1. Every action above produces an outcome **identical** to its toolbar/menu equivalent (SC-003, FR-019) — bindings call the same store/flow methods, never parallel logic.
2. A rapid burst of nudges (same or mixed directions, incl. key auto-repeat) inside the coalescing window forms **one** undo step (FR-015; window semantics in `store-api.md`).
3. No binding fires during text editing or while locked — testable as router unit tests (SC-004).
4. The router is mounted once per canvas instance; both host pages (playground, sandbox) get identical behavior (FR-026).
