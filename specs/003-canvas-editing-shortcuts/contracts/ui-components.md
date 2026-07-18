# Contract: UI Components (context menu, alignment guides, toolbar additions)

**Feature**: 003-canvas-editing-shortcuts | **Scope**: internal Angular UI contracts (no REST endpoints added by this feature)

## 1. CanvasContextMenuComponent *(new, standalone, OnPush)*

`frontend/src/app/features/playground/canvas/canvas-context-menu.component.ts` — rendered via `@angular/cdk/overlay` (flexible connected position at the click point, viewport-edge aware).

### Inputs / Outputs

| Member | Type | Contract |
|---|---|---|
| `state` *(input)* | `ContextMenuState` (data-model.md §3) | `zone: 'selection'` → entries Copy, Duplicate, Delete; `zone: 'canvas'` → entries Paste, Select All (FR-017/FR-018) |
| `disabled predicates` *(inputs or injected store reads)* | per entry | Copy/Duplicate/Delete: selection non-empty && !locked; Paste: `canPaste()`; Select All: canvas non-empty && !locked (FR-019, FR-022) |
| `action` *(output)* | `'copy' \| 'paste' \| 'duplicate' \| 'delete' \| 'selectAll'` | Emitted once per chosen entry; menu closes after emit |

### Behavior contract

- Opens only from `(contextmenu)` events inside the canvas host; the handler calls `preventDefault()` there and **only** there — native right-click elsewhere in the app is untouched (FR-019, spec Assumptions).
- Dismisses on: entry click, outside click, Escape, window blur. Never opens during an in-progress drag/connection gesture (spec edge case).
- Every action emits to `CanvasComponent`, which invokes the **same** store/flow methods as the keyboard router — outcome parity is a contract, not a convention (FR-019, SC-003).
- While locked: mutating entries render disabled; chosen-anyway (keyboard nav) actions are still refused by the store (FR-022).

## 2. AlignmentGuidesComponent *(new, standalone, OnPush)*

`frontend/src/app/features/playground/canvas/alignment-guides.component.ts` + pure geometry in `alignment-guides.ts`.

### Inputs / Outputs

| Member | Type | Contract |
|---|---|---|
| `guides` *(input)* | `AlignmentGuide[]` (data-model.md §2) | Renders one line per guide in a canvas-space overlay; empty array → renders nothing |

*(The component is a dumb renderer; detection lives in the canvas host + `alignment-guides.ts`.)*

### Detection contract (canvas host + geometry module)

- Active only between `(fDragStarted)` and `(fDragEnded)`; peer node rects cached once at drag start (performance: Principle V, 60 fps).
- Per animation frame (rAF-throttled, ≤ 1 computation/frame): compute dragged-group **overall bounds** (multi-drag, US5 scenario 4); compare edges + centers against peers within `ALIGN_TOLERANCE` px; emit at most the nearest match per axis (edge case: no line-flooding).
- **Never mutates positions** — output is exclusively the `guides` array; `(fMoveNodes)` payloads are untouched (FR-021). Guides clear on drag end or alignment loss (FR-020/021).
- Foblex `f-magnetic-lines` / `f-magnetic-rects` / deprecated `f-line-alignment` **must not** appear in the template (they snap on drag-end — research R3).

## 3. CanvasControlsComponent additions *(changed)*

`canvas-controls.component.ts/.html`

| Control | Placement | Enabled predicate | Action |
|---|---|---|---|
| **Copy** button | Edit cluster, beside existing Undo/Redo/Delete | `store.canCopy()` | `store.copySelection()` |
| **Paste** button | Beside Copy | `store.canPaste()` | Same paste path as keyboard (canvas method → store + Foblex selection sync) |

- Icons registered in `shared/icon.registry.ts` (copy, paste) following existing icon conventions.
- Tooltips include the platform shortcut hint (e.g., "Copy (⌘C)" / "(Ctrl+C)") — discoverability, Principle II.
- Existing Undo/Redo buttons unchanged; keyboard now shares their exact store calls (FR-009/FR-010).

## 4. CanvasComponent wiring summary *(changed — integration contract)*

- Hosts the keyboard router (`contracts/keyboard-shortcuts.md`) via `document:keydown`, one instance per canvas.
- Mirrors programmatic selection into Foblex with `flow.select(nodeIds, edgeIds, false)` / `flow.selectAll()` / `flow.clearSelection()`; store `selection` signal remains the single source of truth for copy/duplicate/nudge/delete (research R2).
- After `undo()`/`redo()` from any entry point: `flow.clearSelection()` (store already resets its selection).
- Exposes `(contextmenu)` handlers on node, sticky-note, and canvas-background zones feeding `ContextMenuState`.
- Both host pages (playground, sandbox) receive all behavior through this shared component with zero page-specific code (FR-026).
