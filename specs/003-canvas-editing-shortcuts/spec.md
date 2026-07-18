# Feature Specification: Canvas Editing Shortcuts & Navigation Aids

**Feature Branch**: `003-canvas-editing-shortcuts`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Feature to do ctrl+z and copy paste to easy to navigate convas. Also suggets some more features which can make canvas navigation easy to use."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy and Paste a Canvas Selection (Priority: P1)

A designer building a system architecture selects one or more components on the canvas — possibly together with sticky notes and the connections between them — copies the selection, and pastes it back onto the same canvas. The pasted copy appears slightly offset from the original, fully wired the same way, so common patterns (for example, a web server paired with a cache) can be replicated in seconds instead of being rebuilt piece by piece.

**Why this priority**: This is the headline capability chosen by the product owner. Rebuilding repeated component groups by hand is the single biggest time sink when composing larger designs, and no workaround exists today.

**Independent Test**: Can be fully tested by selecting two connected components, invoking Copy then Paste, and confirming a wired duplicate appears offset from the original. Delivers standalone value with no other story implemented.

**Acceptance Scenarios**:

1. **Given** two connected components are selected (custom names and notes applied), **When** the user copies and then pastes, **Then** duplicates of both components appear slightly below-right of the originals, connected to each other the same way, with custom names and note text preserved, and the pasted items become the current selection.
2. **Given** a selection has been pasted once, **When** the user pastes again, **Then** the second copy appears offset further so copies never stack exactly on top of one another.
3. **Given** a selected component has a connection to a component that is NOT selected, **When** the selection is copied and pasted, **Then** that connection is not duplicated — only connections whose both endpoints were in the selection are recreated.
4. **Given** sticky notes are part of the selection, **When** copied and pasted, **Then** the sticky notes are duplicated along with the components, keeping their relative positions.
5. **Given** nothing is selected, **When** the user invokes Copy, **Then** nothing changes and any previously copied content is preserved.
6. **Given** nothing has been copied yet, **When** the user invokes Paste, **Then** nothing happens and the visible Paste controls appear disabled.
7. **Given** a paste has completed, **When** the user undoes, **Then** all pasted items are removed together in a single undo step.
8. **Given** the canvas is locked, **When** the user invokes Copy or Paste by any means, **Then** nothing happens.
9. **Given** the user is typing in a component rename field, note editor, or sticky note, **When** they press the copy/paste keys, **Then** normal text copy/paste happens inside that field and the canvas is unaffected.

---

### User Story 2 - Undo and Redo from the Keyboard (Priority: P2)

A designer makes a change they regret — moving, deleting, adding, or pasting something — and presses the standard undo key combination to reverse it, then the redo combination to reapply it, without reaching for the toolbar. The result is always identical to pressing the existing Undo/Redo toolbar buttons.

**Why this priority**: Undo/redo already exists via toolbar buttons; adding the universally expected keyboard access is the fastest, lowest-risk win in this feature set and directly answers the original request.

**Independent Test**: Move a component, press the undo key combination, and confirm the component returns to its previous position; press the redo combination and confirm the move is reapplied.

**Acceptance Scenarios**:

1. **Given** the user has just moved a component, **When** they press Ctrl+Z (Cmd+Z on Mac), **Then** the component returns to its prior position — exactly as if the Undo toolbar button had been pressed.
2. **Given** the user has just undone an action, **When** they press Ctrl+Shift+Z (Cmd+Shift+Z on Mac), **Then** the action is reapplied.
3. **Given** there is nothing left to undo (or redo), **When** the corresponding keys are pressed, **Then** nothing happens and no error is shown.
4. **Given** the user is typing in a text field on the canvas, **When** they press the undo keys, **Then** the keystroke applies to the text field (native text undo), not to the canvas.
5. **Given** the canvas is locked, **When** the undo or redo keys are pressed, **Then** nothing happens.

---

### User Story 3 - Keyboard Shortcut Pack for Fast Canvas Work (Priority: P3)

A designer works fluidly on the canvas using standard shortcuts: select everything at once, clear the selection, duplicate a selection in place, nudge selected items into position with the arrow keys, and control zoom from the keyboard — all without touching the mouse or toolbar.

**Why this priority**: These shortcuts multiply the value of the clipboard and undo work, but each is a convenience on top of already-achievable interactions, so they follow the two core stories.

**Independent Test**: On a canvas with several components, press select-all and confirm everything is selected; press Escape and confirm the selection clears; duplicate, nudge, and zoom via keys and confirm each behaves as specified.

**Acceptance Scenarios**:

1. **Given** a canvas containing components, connections, and sticky notes, **When** the user presses Ctrl+A (Cmd+A on Mac), **Then** every component, connection, and sticky note on the canvas becomes selected.
2. **Given** an active selection, **When** the user presses Escape, **Then** the selection is cleared (and any in-progress text editing keeps its existing Escape behavior).
3. **Given** an active selection, **When** the user presses Ctrl+D (Cmd+D on Mac), **Then** an offset duplicate of the selection appears (same rules as paste) and previously copied clipboard content is NOT altered.
4. **Given** an active selection, **When** the user presses an arrow key, **Then** the selected components and sticky notes move by a small fixed step in that direction; **When** Shift is held with the arrow key, **Then** they move by a step roughly ten times larger.
5. **Given** a burst of rapid consecutive nudges, **When** the user undoes, **Then** the burst reverses as a single undo step rather than one step per keypress.
6. **Given** the pointer/focus is on the canvas, **When** the user presses Ctrl+Plus, Ctrl+Minus, or Ctrl+0 (Cmd on Mac), **Then** the canvas zooms in, zooms out, or fits the whole design into view respectively — and the browser page itself does not zoom.
7. **Given** the canvas is locked or the user is typing in a text field, **When** any of these shortcuts are pressed, **Then** they have no effect on the canvas.

---

### User Story 4 - Right-Click Context Menu (Priority: P4)

A designer right-clicks a component or selection and gets a small menu with Copy, Duplicate, and Delete; right-clicking empty canvas space offers Paste and Select All. Trackpad users and those who don't memorize shortcuts get a discoverable path to every clipboard action.

**Why this priority**: Pure discoverability layer over actions delivered in earlier stories; valuable but not required for any capability to function.

**Independent Test**: Right-click a selected component and invoke each menu entry, confirming each produces the identical result to its keyboard/toolbar equivalent.

**Acceptance Scenarios**:

1. **Given** a component or selection, **When** the user right-clicks it, **Then** a context menu appears offering Copy, Duplicate, and Delete, and the browser's native context menu is suppressed.
2. **Given** empty canvas space, **When** the user right-clicks it, **Then** a context menu appears offering Paste and Select All.
3. **Given** an action is not currently applicable (e.g., Paste with nothing copied), **When** the menu is shown, **Then** that entry appears disabled.
4. **Given** any context menu entry is chosen, **When** it executes, **Then** the outcome is identical to invoking the same action via keyboard or toolbar.
5. **Given** the canvas is locked, **When** the user right-clicks, **Then** no canvas-changing menu action can be executed.

---

### User Story 5 - Alignment Guides While Dragging (Priority: P5)

While dragging a component, temporary guide lines appear whenever its edges or center line up with a nearby component's edges or center, helping the designer place items in tidy rows and columns by eye. The guides are purely visual — the drag is never pulled or snapped.

**Why this priority**: Highest polish and highest effort of the set; improves diagram tidiness but no workflow depends on it.

**Independent Test**: Drag one component slowly past another and confirm guide lines appear when their centers/edges align and disappear when alignment is lost or the drag ends.

**Acceptance Scenarios**:

1. **Given** a component is being dragged near another component, **When** their centers or edges come within a small alignment tolerance, **Then** a temporary guide line appears indicating the alignment.
2. **Given** a guide line is showing, **When** the dragged component moves out of alignment or the drag ends, **Then** the guide line disappears.
3. **Given** a guide line is showing, **When** the user continues dragging, **Then** the component follows the pointer exactly — its position is never snapped or adjusted by the guide.
4. **Given** multiple components are dragged together, **When** the group aligns with a nearby component, **Then** guides appear based on the dragged group's overall bounds.

---

### Edge Cases

- Copy invoked with an empty selection: no-op; previously copied content is preserved.
- Paste invoked with nothing copied: no-op; Paste button and menu entry shown disabled.
- Selection contains a connection whose endpoints are not both selected: that connection is excluded from the copy.
- Selection contains only sticky notes (no components): copy/paste/duplicate still work.
- User navigates to a different design or reloads the page: copied content is discarded; Paste becomes unavailable until a new copy is made (clipboard is scoped to the current canvas session).
- Keyboard shortcuts pressed while typing in a rename field, note editor, or sticky note: the canvas must not react; the text field keeps native behavior.
- Canvas locked: every action introduced by this feature (copy, paste, duplicate, select-all, deselect, nudge, undo, redo, zoom keys, context-menu actions) is inert.
- Undo/redo pressed at the boundary of history (nothing to undo/redo): silent no-op.
- Very large paste (e.g., select-all then paste on a big design): the paste still completes as one atomic, single-undo action.
- Repeated pastes without re-copying: each paste offsets further from the previous paste so nothing stacks exactly.
- Arrow-key nudge with nothing selected: no-op; page scrolling is not hijacked when nothing is selected.
- Zoom shortcuts pressed while the pointer/focus is outside the canvas: browser behaves normally (page zoom is not blocked globally).
- Right-click during an in-progress drag or connection creation: no context menu interrupts the gesture.
- Alignment guides with many nearby components: only guides for the nearest alignments are shown so the canvas does not fill with lines.

## Requirements *(mandatory)*

### Functional Requirements

**Clipboard (Copy/Paste)**

- **FR-001**: The system MUST let users copy the current selection, capturing: selected components (including their custom display names and attached note text), selected sticky notes, the relative positions of all copied items, and every connection whose both endpoints are within the selection.
- **FR-002**: Copy MUST be invocable via Ctrl+C (Cmd+C on Mac), a visible toolbar button, and the context menu.
- **FR-003**: Paste MUST be invocable via Ctrl+V (Cmd+V on Mac), a visible toolbar button, and the context menu, and MUST insert independent duplicates of the copied items (new identities, original items untouched) positioned slightly below-right of the source, preserving the copied items' relative layout.
- **FR-004**: Repeated pastes of the same copied content MUST cascade — each paste offset further than the previous — so copies never land exactly on top of one another.
- **FR-005**: After a paste, the pasted items MUST become the current selection.
- **FR-006**: Each paste (and each duplicate) MUST register as exactly one undoable action, regardless of how many items it inserted.
- **FR-007**: Copied content MUST be held only for the current canvas session — it is never written to the operating system clipboard, and navigating away from the design or reloading discards it.
- **FR-008**: Copy with an empty selection MUST be a no-op that preserves previously copied content; Paste with nothing copied MUST be a no-op; visible Paste controls MUST reflect the disabled state.

**Undo/Redo Keyboard Access**

- **FR-009**: Ctrl+Z (Cmd+Z on Mac) MUST perform undo with an effect identical to the existing Undo toolbar button.
- **FR-010**: Ctrl+Shift+Z (Cmd+Shift+Z on Mac) MUST perform redo with an effect identical to the existing Redo toolbar button; no other redo key combination is bound.
- **FR-011**: Undo/redo keys pressed when no further history exists MUST do nothing, without any error indication.

**Keyboard Shortcut Pack**

- **FR-012**: Ctrl+A (Cmd+A on Mac) MUST select every component, connection, and sticky note on the canvas.
- **FR-013**: Escape MUST clear the current canvas selection; existing Escape behavior inside text editors (cancel edit) MUST be preserved and take precedence.
- **FR-014**: Ctrl+D (Cmd+D on Mac) MUST duplicate the current selection using the same insertion rules as paste, WITHOUT altering previously copied clipboard content.
- **FR-015**: Arrow keys MUST nudge all selected components and sticky notes by a small fixed step; Shift+arrow MUST nudge by a step approximately ten times larger; a rapid burst of consecutive nudges MUST group into a single undo step.
- **FR-016**: Ctrl+Plus, Ctrl+Minus, and Ctrl+0 (Cmd on Mac) MUST zoom the canvas in, zoom out, and fit the full design into view respectively, and MUST prevent the browser's page zoom only while the canvas is the active target.

**Context Menu**

- **FR-017**: Right-clicking a component, sticky note, or existing selection MUST show a context menu offering Copy, Duplicate, and Delete.
- **FR-018**: Right-clicking empty canvas space MUST show a context menu offering Paste and Select All.
- **FR-019**: Context menu entries MUST appear disabled when their action is not currently applicable, MUST produce outcomes identical to the equivalent keyboard/toolbar action, and the browser's native context menu MUST be suppressed within the canvas area.

**Alignment Guides**

- **FR-020**: While a component (or group) is being dragged, the system MUST display temporary guide lines whenever the dragged item's edges or center align, within a small tolerance, with a nearby component's edges or center.
- **FR-021**: Alignment guides MUST be purely visual: they never snap, pull, or otherwise alter the dragged item's position, and they MUST disappear as soon as alignment is lost or the drag ends.

**Global Rules**

- **FR-022**: While the canvas is locked, every action introduced by this feature — copy, paste, duplicate, select-all, deselect, nudge, undo, redo, zoom shortcuts, and all context-menu actions — MUST be inert.
- **FR-023**: No canvas shortcut MUST fire while the user is typing in any text input, rename field, note editor, or sticky note; native text-editing behavior wins.
- **FR-024**: All shortcuts MUST use Cmd on macOS wherever Ctrl is specified for Windows/Linux.
- **FR-025**: Canvas changes produced by paste, duplicate, and nudge MUST persist exactly like manual edits (same auto-save behavior) and MUST participate in the existing undo history under its existing depth limit.
- **FR-026**: Both canvas surfaces (level playground and sandbox) MUST receive identical behavior for every capability in this feature.

### Key Entities

- **Clipboard Buffer**: A transient, in-memory capture of the most recent copy: the copied components (with custom names, note text, and positions relative to each other), copied sticky notes, and the connections internal to the copied set. Holds at most one capture (a new copy replaces it); discarded when the user leaves the design or reloads. Never persisted and never placed on the operating system clipboard.
- **Alignment Guide**: A temporary visual indicator (line) showing that a dragged item's edge or center currently lines up with a nearby component's edge or center. Exists only during a drag; carries no persistent data.
- **Canvas Selection** *(existing)*: The set of currently selected components, connections, and sticky notes; source for copy/duplicate/nudge/delete operations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can replicate a previously built group of three connected components in under 5 seconds using copy/paste, versus rebuilding it manually from the palette.
- **SC-002**: 100% of the editing actions introduced by this feature that are reachable via keyboard are also reachable via a visible control (toolbar button or context menu entry).
- **SC-003**: Undo and redo invoked from the keyboard take effect immediately (no perceptible delay) and match the toolbar buttons' results in 100% of cases.
- **SC-004**: Zero unintended canvas changes occur from shortcuts while the canvas is locked or while the user is typing in a text field, across the full acceptance test pass.
- **SC-005**: Pasted and duplicated copies preserve 100% of custom names, note text, sticky notes, and internal connections from the source selection.
- **SC-006**: In hands-on verification, users can visually align a dragged component with a neighbor using alignment guides on the first attempt at least 80% of the time.

## Assumptions

- Both canvas surfaces (level playground and sandbox) share the same canvas experience, so all behavior applies equally to both; no per-mode differences are needed.
- The existing undo history depth limit is unchanged; new action types simply participate in it.
- Exact nudge distances (small step and the ~10× Shift step) and the alignment-guide tolerance are visual tuning values to be finalized during implementation; the spec fixes only their relationships and behavior.
- Duplicate (Ctrl+D) uses the same offset placement rule as paste.
- The context menu is scoped to the canvas area only; the rest of the application keeps the browser's native right-click behavior.
- Copied content intentionally does NOT survive page reloads or transfer between designs, browser tabs, or applications — per product decision, the clipboard is same-canvas only.
- Explicitly out of scope (product decisions): Cut (Ctrl+X), snap-to-grid, cross-design paste, operating-system clipboard integration, and Ctrl+Y as a redo binding.
- Delete via keyboard (Delete/Backspace) already exists and is unchanged; the context menu's Delete entry reuses that existing behavior.
