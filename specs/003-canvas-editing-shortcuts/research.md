# Phase 0 Research: Canvas Editing Shortcuts & Navigation Aids

**Feature**: 003-canvas-editing-shortcuts | **Date**: 2026-07-11

All findings below were verified against the *installed* `@foblex/flow` **19.0.0** type declarations (`frontend/node_modules/@foblex/flow/index.d.ts`) and runtime bundle (`fesm2022/foblex-flow.mjs`), cross-checked with the official Foblex Flow docs (Context7 `/websites/flow_foblex`). Line references are to `index.d.ts` unless noted.

---

## R1. Keyboard shortcut handling: custom document-level router (not Foblex `withA11y`)

**Decision**: Implement a single keyboard router in the canvas layer (new `canvas-shortcuts.ts`, hosted by `CanvasComponent` via a `document:keydown` listener), extending the guard pattern already used for Delete/Backspace at `canvas.component.ts:156-166`. Do **not** enable Foblex's `withA11y(...)` keyboard layer.

**Rationale**:
- Foblex 19 ships an opt-in a11y keyboard layer (`withA11y`, index.d.ts:7829-7909) with defaults `selectAll: ['a']`, `zoomIn: ['+','=']`, `zoomOut: ['-','_']`, `zoomReset: ['0']`, `deleteSelected: ['Delete','Backspace']`. Enabling it alongside the app's existing Delete handler would double-drive deletion and selection (the package docs warn exactly this).
- The a11y layer cannot cover most of this feature: no copy/paste/duplicate/undo/redo keys, no lock-aware guard, no nudge-burst undo coalescing, no Ctrl+0 → fit-to-design mapping (its `zoomReset` resets scale, not fit).
- One router gives a single place for the three global guards required by the spec: text-editing guard (FR-023), lock guard (FR-022), and Cmd/Ctrl platform mapping (FR-024).

**Alternatives considered**:
- `withA11y(...)` keyboard layer — rejected: conflicts with existing handlers, covers < half the required bindings, no lock/coalescing semantics.
- Scattered per-key `@HostListener`s across components — rejected: guard logic would be duplicated; harder to test; the shortcut→action table belongs in one testable module.

## R2. Programmatic selection: Foblex `FFlowComponent` APIs + explicit store sync

**Decision**: Use `FFlowComponent.selectAll()`, `select(nodes, connections, isSelectedChanged)`, `clearSelection()`, `getSelection()` (index.d.ts:2180-2197), obtained via `viewChild(FFlowComponent)`. On every programmatic selection change, update the store's `selection` signal directly in the same action, and call `select(..., /* isSelectedChanged */ false)` to suppress a stale later emission.

**Rationale**: Verified runtime behavior — `select()`/`selectAll()` do **not** emit `(fSelectionChange)` immediately (the event fires on the *next* user interaction if `isSelectedChanged=true`), and both defer execution by one tick internally. Relying on the event for store sync would leave the store stale exactly when copy/select-all needs it. Making the store the source of truth (canvas syncs *user-driven* selection via `(fSelectionChange)` as today; *programmatic* selection writes the store first) removes the race. `clearSelection()` is synchronous and never emits — pairs with Escape and with undo/redo's existing selection reset.

**Alternatives considered**:
- Waiting on `(fSelectionChange)` after programmatic calls — rejected: event is deferred/suppressed by design; racy.
- Toggling Foblex's internal selection CSS/classes — rejected: fights library internals, breaks on upgrade.

## R3. Alignment guides: custom visual-only overlay (Foblex magnetic components rejected)

**Decision**: Build a custom `AlignmentGuidesComponent` overlay + pure geometry module. During a drag (bracketed by `(fDragStarted)`/`(fDragEnded)` on `f-flow[fDraggable]`), cache peer node rects once, then on rAF-throttled pointer movement compute edge/center alignments of the dragged node(s) bounding box within a small tolerance and render vertical/horizontal guide lines in an absolutely-positioned overlay. Guides never modify positions; overlay clears on drag end.

**Rationale**: The spec's product decision (FR-020/FR-021, user-confirmed) is *visual guides only, never snap*. Verified in the 19.0.0 runtime: Foblex's `f-magnetic-lines` (index.d.ts:5202) and `f-magnetic-rects` (5222) render lines during drag but **apply a snap delta to the final position on drag-end** (`DragNodeFinalize.handle()` → `calculateMagneticSnaps` → `_applySnapToDelta`), and expose **no input to disable snapping** — presence of the component implies snap. `f-line-alignment` is deprecated in favor of the magnetic components. Therefore no library configuration can satisfy FR-021.

**Alternatives considered**:
- `f-magnetic-lines` with `threshold` tuning — rejected: snaps `(fMoveNodes)` positions on drop; violates FR-021.
- Patching/forking the library — rejected: Constitution III (stack discipline) and maintenance burden.
- Deriving guides from `(fNodePositionChange)` — rejected: the position model updates at drag *finalize*, not continuously; DOM-rect sampling during pointermove is the only live signal, and rAF-throttling keeps it within the 60 fps budget.

## R4. Context menu: standalone component on Angular CDK Overlay

**Decision**: New `CanvasContextMenuComponent` (standalone, OnPush) rendered through `@angular/cdk/overlay` with a flexible-connected position strategy anchored to the right-click point. `(contextmenu)` handlers on node/sticky-note elements and on the canvas background call `event.preventDefault()` (suppressing the native menu only within the canvas area, FR-019) and open the menu with a zone discriminator (`selection` vs `canvas`). Entries: Copy/Duplicate/Delete (selection zone), Paste/Select All (canvas zone), each with disabled predicates.

**Rationale**: Verified — Foblex 19 has **no** context-menu output (zero `contextmenu` hits in index.d.ts), so DOM handling is required. CDK 20.2 is already a project dependency; its overlay solves outside-click dismissal, Escape handling, viewport-edge repositioning, and z-index management. Foblex runs outside the Angular zone for its own events, but a plain Angular `(contextmenu)` binding runs in-zone — no zone workarounds needed.

**Alternatives considered**:
- Hand-rolled absolutely-positioned `<div>` — rejected: re-implements dismissal/edge-flip logic CDK already provides.
- `@angular/material` menu — rejected: Material is not an installed dependency; adding it violates the zero-new-deps stance.

## R5. Clipboard model: id-free relative capture in the store, materialize-on-paste

**Decision**: `PlaygroundStore` gains a `clipboard` signal holding an id-free capture: copied components (componentId, displayName, note) and sticky notes with positions normalized to the capture's bounding-box origin, plus connections encoded as **index pairs into the copied component list** (no node ids stored). Paste materializes fresh entities with `crypto.randomUUID()` ids (existing `newId()` helper), applies the cascade offset, inserts via one `commit()` (atomic undo, FR-006), and sets both store and Foblex selection to the pasted items (FR-005). Duplicate (Ctrl+D) reuses capture+materialize directly from the current selection without touching the clipboard signal (FR-014). Buffer is discarded with the store instance (per-page provider) — leaving the design or reloading clears it (FR-007).

**Rationale**: Index-pair connection encoding makes the buffer immune to id collisions and trivially remappable on every paste. Normalized offsets preserve relative layout (FR-003) regardless of where the cascade places the copy. Routing through the existing `commit()` gate inherits undo, autosave, and lock semantics for free. Verified: Foblex ships no clipboard (README lists copy/paste-adjacent features only as example-app implementations), and Foblex connector ids derive from node ids (`nodeId + '__out'/'__in'`, `canvas.component.ts:26-27`), so remapped node ids automatically yield valid new connector ids.

**Alternatives considered**:
- Storing raw `DesignNode[]`/`DesignEdge[]` snapshots with original ids, remapping at paste — rejected: id bookkeeping at paste time is where duplication bugs live; index pairs are simpler and testable.
- OS clipboard (`navigator.clipboard`) serialization — rejected: explicitly out of scope per product decision (same-canvas only, FR-007); avoids permissions and malformed-payload handling.

## R6. Paste cascade & duplicate offset

**Decision**: A single named constant `PASTE_OFFSET = 24` canvas px. Paste position = source bounding-box origin + `(n × PASTE_OFFSET, n × PASTE_OFFSET)` where `n` is the paste generation (per-buffer counter, reset on every new copy). Duplicate uses generation 1 semantics from the live selection. Exact value is a tuning constant (spec Assumptions) — one place to change.

**Rationale**: Deterministic below-right cascade satisfies FR-003/FR-004 (no exact stacking) with zero collision-detection complexity; matches the small-offset convention of mainstream design tools.

**Alternatives considered**: Viewport-center or cursor-position paste — rejected by product decision in spec Q&A; smart free-space search — rejected: complexity without user demand.

## R7. Nudge with burst coalescing: store-level coalesced commit

**Decision**: Add a coalesced commit path to `PlaygroundStore` (e.g., `commitCoalesced(key, mutator, windowMs ≈ 500)`): the first nudge in a burst pushes a history snapshot exactly like `commit()`; subsequent nudges with the same key inside a sliding window mutate state without pushing new snapshots; any other commit type (or window expiry) closes the burst. Arrow = small step, Shift+Arrow = 10× step (both named constants, e.g., 8 px / 80 px — tuning values per spec Assumptions). Nudge moves both selected components and selected sticky notes (FR-015); Foblex re-renders from the two-way `[fNodePosition]` model bindings, verified safe for programmatic updates while not dragging (`FNodeDirective.position` is a ModelSignal, index.d.ts:2004-2034).

**Rationale**: FR-015 mandates burst-as-one-undo-step; naive per-keypress commits would flood the 100-entry history cap (FR-025) and thrash `structuredClone`. A sliding time window handles both discrete presses and key auto-repeat with one mechanism, keyed so unrelated commits interleave correctly.

**Alternatives considered**:
- Commit on `keyup` (transaction end) — rejected: misses interleaved-direction bursts and lost-keyup edge cases (window blur); timers are simpler and testable.
- One commit per keypress — rejected: floods history; violates FR-015 scenario 5.

## R8. Keyboard zoom: reuse `FZoomDirective` + existing fit-to-view

**Decision**: Ctrl/Cmd+Plus → `FZoomDirective.zoomIn()`, Ctrl/Cmd+Minus → `zoomOut()` (both already accessed via `viewChild(FZoomDirective)` for the toolbar, `canvas.component.ts:169-173`), Ctrl/Cmd+0 → existing `fitToView()` (`FCanvasComponent.fitToScreen({x:48,y:48}, true)`, per FR-016 "fit the full design into view"). `event.preventDefault()` is called only when the canvas is the active target — defined as pointer over, or focus within, the canvas host — so browser page zoom keeps working elsewhere (FR-016 + spec edge case).

**Rationale**: Zero new zoom machinery; the directive exposes exactly the needed methods (`zoomIn/zoomOut/getZoomValue/reset`, index.d.ts:5107-5164). `fitToScreen` already respects the FF1009 render-readiness caveat in existing code.

**Alternatives considered**: `setZoom(...)` with manual step math — rejected: `zoomIn/zoomOut` already apply the configured step centered on the canvas.

## R9. Undo/redo keys: delegate to the existing store engine

**Decision**: Ctrl/Cmd+Z → `store.undo()`, Ctrl/Cmd+Shift+Z → `store.redo()` (sole redo binding per product decision). After either, call `FFlowComponent.clearSelection()` so the visual selection matches the store, which already clears its `selection` signal on undo/redo (`playground.store.ts:286-304`). At history bounds the store methods are already no-ops (FR-011).

**Rationale**: The engine (snapshot stacks, `MAX_HISTORY = 100`, drag coalescing, autosave-triggering signal writes) is complete and battle-tested behind the toolbar buttons — the feature is purely a new invocation path (FR-009/FR-010: "identical effect to the toolbar buttons").

**Alternatives considered**: none warranted — any second history mechanism would violate simplicity and risk divergence.

## R10. Guards: lock and text-editing, applied once

**Decision**: Two predicate guards in the shortcut router, evaluated before any dispatch: (1) **lock guard** — `store.locked()` true ⇒ every feature shortcut, toolbar button, and menu entry is inert/disabled ("block everything", FR-022); (2) **text-editing guard** — event target is `INPUT`/`TEXTAREA`/`[contenteditable]` ⇒ the router ignores the event entirely, preserving native text behavior including the browser's own text undo and field-level Ctrl+C/V (FR-023, mirrors the existing guard at `canvas.component.ts:159-161`). The same predicates back the disabled states of toolbar buttons and context-menu entries (single source of truth).

**Rationale**: Centralizing the guards is what makes SC-004 (zero unintended mutations while locked/typing) testable as unit tests over the router rather than N per-component checks.

**Alternatives considered**: Per-action checks scattered in components — rejected: guaranteed drift.

## R11. Testing approach

**Decision**: Pure-logic modules get direct Vitest unit tests (`clipboard.ts` capture/materialize/index-remap; `alignment-guides.ts` geometry; `canvas-shortcuts.ts` key→action mapping and guards; store: paste atomicity/cascade, nudge coalescing, select-all). Components get smoke tests per the constitution gate (context menu renders entries + disabled states; guides overlay renders lines for a synthetic alignment; controls show Copy/Paste with correct disabled predicates). Runner: `ng test --no-watch` (Vitest), co-located `*.spec.ts` as in the existing suite (`playground.store.spec.ts`, `canvas.component.spec.ts`).

**Rationale**: The spec's acceptance scenarios map almost 1:1 onto store/router unit tests, which are fast and deterministic; UI-surface verification for drag interactions is covered by the project's existing runtime-verification skill (see quickstart).

---

## Resolved unknowns summary

| Unknown (from Technical Context) | Resolution |
|---|---|
| Does Foblex 19 support programmatic selection? | Yes — `selectAll/select/clearSelection/getSelection` on `FFlowComponent`; deferred-tick + suppressed-event caveats documented (R2) |
| Can Foblex provide visual-only alignment guides? | No — magnetic components always snap on drag-end; custom overlay required (R3) |
| Keyboard layer: build vs `withA11y`? | Build — a11y layer conflicts with existing handlers and covers a minority of bindings (R1) |
| Zoom from keyboard? | Reuse `FZoomDirective.zoomIn/zoomOut` + existing `fitToView()` (R8) |
| Context menu support in library? | None — DOM `(contextmenu)` + CDK Overlay (R4) |
| Clipboard/undo in library? | None shipped — app-side; undo engine already exists in store (R5, R9) |
| Single-undo-step nudge bursts? | New coalesced-commit path in store with sliding window (R7) |

No `NEEDS CLARIFICATION` items remain.
