# Quickstart: Validating Canvas Editing Shortcuts & Navigation Aids

**Feature**: 003-canvas-editing-shortcuts — runnable end-to-end validation per user story. Details live in [spec.md](./spec.md) (acceptance scenarios), [data-model.md](./data-model.md), and [contracts/](./contracts/).

## Prerequisites & setup

```bash
# from repo root — two terminals
cd backend  && npm install && npm run dev      # Express API (tsx watch)
cd frontend && npm install && npm start        # Angular dev server → http://localhost:8000
```

Open http://localhost:8000, then either a level (Lab Map → any level) or a sandbox design (Sandbox → open/create). **Run every scenario below on BOTH pages** — behavior must be identical (FR-026). On macOS read `Ctrl` as `Cmd`.

Automated checks:

```bash
cd frontend && npm test    # ng test --no-watch (Vitest) — store/clipboard/shortcut/geometry units + component smoke tests
cd frontend && npm run lint
```

*(The project's `verify` skill can drive these UI flows at runtime for drag-based checks.)*

## US1 — Copy/Paste (P1)

1. Drag two components from the palette, connect them, rename one, add a note to it. Marquee-select both.
2. `Ctrl+C` then `Ctrl+V` → **expect**: a duplicate pair appears offset below-right, connected identically, rename + note preserved, and the pasted items are now the selection (highlighted). Toolbar Copy/Paste buttons exist and mirror this (Paste was disabled before the first copy).
3. `Ctrl+V` again → second copy lands offset further (no stacking).
4. Select one node that has a connection to an *unselected* node; copy/paste → the dangling connection is **not** duplicated.
5. Include a sticky note in the selection; copy/paste → note comes along, relative position kept.
6. Press `Ctrl+Z` once after a paste → the **entire** pasted set disappears in one step.
7. Empty checks: click empty canvas (nothing selected) + `Ctrl+C` → nothing changes, old buffer still pastes. On a fresh page `Ctrl+V` → nothing happens; Paste button disabled.
8. Click into a rename field, `Ctrl+C`/`Ctrl+V` → normal text copy/paste inside the field only.
9. Toggle canvas Lock → Copy/Paste (keys, buttons, menu) all inert; unlock → working again.

## US2 — Undo/Redo keys (P2)

1. Move a component. `Ctrl+Z` → returns to prior position (identical to toolbar Undo).
2. `Ctrl+Shift+Z` → move reapplied. `Ctrl+Y` must do **nothing** (not bound).
3. Spam `Ctrl+Z` past history start → silent no-ops, no errors in console.
4. While typing in a note editor, `Ctrl+Z` → text-field undo only; canvas unchanged.
5. Locked → both keys inert.

## US3 — Shortcut pack (P3)

1. `Ctrl+A` → every component, connection, and sticky note selected; on an empty canvas → no-op.
2. `Escape` → selection cleared. While editing a sticky note, `Escape` → cancels the edit (existing behavior), does not just deselect.
3. Select a group, `Ctrl+D` → offset duplicate appears; previously copied clipboard content still pastes unchanged afterward.
4. Arrow keys nudge the selection by a small step; `Shift+Arrow` ≈ 10×. Rapid burst of presses then `Ctrl+Z` → whole burst reverts in **one** step. With nothing selected, arrows scroll the page normally.
5. Pointer over canvas: `Ctrl+=` zooms in, `Ctrl+-` zooms out, `Ctrl+0` fits the design; browser page zoom must NOT change. Pointer/focus outside the canvas (e.g., in the palette/header): the same keys perform normal browser zoom.
6. All of the above inert while locked or while typing.

## US4 — Context menu (P4)

1. Right-click a selected component → menu: Copy, Duplicate, Delete; browser menu suppressed. Each entry's result is identical to its shortcut.
2. Right-click empty canvas → menu: Paste, Select All; Paste disabled when nothing copied.
3. Menu dismisses on outside click and Escape. Right-click outside the canvas (e.g., page header) → native browser menu appears normally.
4. Locked → mutating entries disabled.

## US5 — Alignment guides (P5)

1. Drag a component slowly past another → a guide line appears when edges or centers align (within tolerance), and disappears when alignment is lost or on drop.
2. Watch the drop position: the node lands **exactly** where the pointer released — never snapped (compare against FR-021; this is the key difference from Foblex's built-in magnetic lines).
3. Multi-select two nodes and drag the group near a third → guides derive from the group's overall bounds.
4. On a dense canvas (~20+ nodes), drag around → only nearest-match guides render; drag stays smooth (60 fps target, no jank).

## Cross-cutting acceptance gates

- **SC-002 parity**: every new keyboard action is also reachable via a visible control (toolbar or context menu) — walk the map in [contracts/keyboard-shortcuts.md](./contracts/keyboard-shortcuts.md).
- **SC-004 safety**: full pass of lock + text-editing checks above with zero canvas mutations.
- **Persistence (FR-025)**: after paste/duplicate/nudge, wait ~2 s (autosave debounce), reload the page → changes persisted; clipboard is empty again (FR-007).
- **Constitution II**: all interactions respond < 100 ms perceived; no instruction needed beyond standard conventions.
