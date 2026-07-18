# Contract: PlaygroundStore API extensions

**Feature**: 003-canvas-editing-shortcuts | **File**: `frontend/src/app/features/playground/state/playground.store.ts` (+ pure helpers in `state/clipboard.ts`)

All methods below are additive. Existing store members (`nodes`, `edges`, `stickyNotes`, `selection`, `locked`, `canUndo`, `canRedo`, `undo()`, `redo()`, `commit()`, `deleteSelection()`, `moveNodes()`, …) keep their contracts unchanged.

## New readable state

```ts
readonly clipboard: Signal<ClipboardBuffer | null>;  // shape: data-model.md §1
readonly canCopy: Signal<boolean>;   // selection non-empty && !locked()
readonly canPaste: Signal<boolean>;  // clipboard() !== null && !locked()
```

## copySelection(): void

- **Given** a non-empty selection: captures selected components, selected sticky notes, and every edge whose **both** endpoints are selected, into a fresh `ClipboardBuffer` (positions normalized to the capture bounding-box origin; `displayName`/`note` preserved; `pasteCount = 0`). Replaces any prior buffer.
- **Given** an empty selection: **no-op**; prior buffer preserved. (FR-001, FR-008)
- **Given** `locked()`: no-op (FR-022).
- Never mutates the design; never touches undo history; never writes the OS clipboard (FR-007).

## pasteClipboard(): string[] *(returns pasted element ids: node ids + sticky-note ids)*

- **Given** `clipboard() === null` or `locked()`: no-op, returns `[]` (FR-008, FR-022).
- Otherwise, in **one** `commit()` (⇒ exactly one undo step, FR-006; redo stack cleared as per existing engine):
  1. Materializes components/sticky notes with fresh `newId()` ids at `origin + generation × (24, 24) + (dx, dy)` where `generation = pasteCount + 1` (FR-003/FR-004).
  2. Materializes connections by resolving `CopiedConnection` index pairs against the freshly minted node ids (FR-001).
  3. Increments `pasteCount` on the buffer.
  4. Sets `selection` to exactly the pasted elements (FR-005). *(Caller — the canvas — mirrors this into Foblex via `flow.select(..., false)`.)*
- Autosave fires through existing signal tracking; no new persistence wiring (FR-025).

## duplicateSelection(): string[]

- Equivalent to `capture(currentSelection)` → materialize at generation 1 — **without reading or writing `clipboard`** (FR-014). Same atomic-commit, selection, lock, and empty-selection no-op semantics as paste/copy.

## nudgeSelection(dx: number, dy: number): void

- Moves every selected component and selected sticky note by `(dx, dy)` canvas px (FR-015). Steps are supplied by the caller (`NUDGE_STEP` / `× 10` — named constants).
- **Coalescing contract**: routed through `commitCoalesced('nudge', …, WINDOW_MS ≈ 500)`:
  - First call of a burst: pushes one history snapshot (like `commit()`), opens the window.
  - Subsequent calls with the same key while the window is open: mutate state, push **no** snapshot, slide the window.
  - Window expiry **or any other commit (of any kind)** closes the burst; the next nudge starts a new undo step.
  - Consequence: undo after a burst restores pre-burst positions in **one** step (FR-015 scenario 5).
- Empty selection or `locked()`: no-op.

## selectAllElements(): void

- Sets `selection` to every node id and edge id, and marks all sticky notes selected (select-all covers components, connections, and sticky notes — FR-012).
- No-op on an empty canvas; **allowed while locked? No** — inert under lock per "block everything" (FR-022).
- Pure state write: no history entry (selection is not part of `Snapshot`), matching existing selection semantics.

## commitCoalesced(key: string, mutator: () => void, windowMs: number): void *(private)*

- Generalization of `commit()` implementing the window semantics above; `commit()` itself must close any open window (so e.g. nudge → delete → nudge yields three distinct undo steps).

## Invariants (all methods)

1. Every design mutation flows through `commit()`/`commitCoalesced()` — no direct signal writes outside the gate (preserves undo, autosave, `MAX_HISTORY = 100`; FR-025).
2. `locked()` refusal happens inside the store (defense in depth; UI guards are cosmetic duplicates) (FR-022).
3. Pure capture/materialize logic lives in `state/clipboard.ts` with no Angular imports — unit-testable in isolation (plan: testing approach R11).
