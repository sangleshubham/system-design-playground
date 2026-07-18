# Tasks: Canvas Editing Shortcuts & Navigation Aids

**Input**: Design documents from `/specs/003-canvas-editing-shortcuts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (all present)

**Tests**: INCLUDED — the constitution mandates smoke tests for interactive components and the plan (research R11) commits to unit tests for all pure-logic modules. Test tasks accompany each story.

**Organization**: Tasks are grouped by user story (P1–P5 from spec.md) so each story is an independently implementable, testable increment.

## Format: `[ID] [P?] [Story] Description (Model · effort)`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, prerequisites met)
- **[Story]**: US1–US5 mapping to spec.md user stories
- Every task names exact file path(s)
- **(Model · effort)**: Recommended executor — `Sonnet 5` or `Opus 4.8` — and `/effort` level, assigned by task complexity (see Model Plan below)

## Model Plan (per user request: Sonnet 5 vs Opus 4.8 by complexity)

**Assignment rationale**:
- **Sonnet 5** — tasks whose behavior is fully pinned down by the contracts (pure functions, dumb components, buttons, icons, tests with enumerated cases). Nothing to discover, low blast radius.
- **Opus 4.8** — tasks touching the undo-history engine, Foblex timing caveats (deferred selection, zone-less events, drag lifecycle), cross-cutting guard semantics, or live DOM/rAF performance work. Wrong-looking-but-plausible implementations are easy here; deeper reasoning pays for itself.

**Switch checkpoints** (`/model` + `/effort` at phase boundaries):

| Checkpoint | Model · effort | Covers |
|---|---|---|
| Phase 1 | Sonnet 5 · low | T001 |
| Phase 2 start | **Opus 4.8 · high** | T002–T004 (router core + canvas wiring), then Sonnet 5 · medium for T005 |
| Phase 3 (US1) | Sonnet 5 · high for T006–T007 → **Opus 4.8 · high** for T008, T010 → Sonnet 5 for T009, T011–T012 |
| Phase 4 (US2) | Sonnet 5 · medium throughout (T013–T014) |
| Phase 5 (US3) | **Opus 4.8 · high** for T015 first; stay Opus (medium) for T016, T020–T021; Sonnet 5 for T017–T019, T022 |
| Phase 6 (US4) | Sonnet 5 · high for T023, T025; **Opus 4.8 · medium** for T024 |
| Phase 7 (US5) | Sonnet 5 for T026–T028, T030; **Opus 4.8 · xhigh** for T029 (hardest task of the feature) |
| Phase 8 | Sonnet 5 · low for T031, T034; **Opus 4.8 · medium** for T032–T033 |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Minimal shared assets — no new dependencies to install (plan: zero new deps).

- [X] T001 [P] Register `copy` and `paste` SVG icons following existing icon conventions in `frontend/src/app/shared/icon.registry.ts` (Sonnet 5 · low)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The keyboard router and Foblex selection-sync helpers that US1, US2, US3, and US4 all dispatch through. Contract: `contracts/keyboard-shortcuts.md`; research R1, R2, R10.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create the keyboard router module in `frontend/src/app/features/playground/canvas/canvas-shortcuts.ts`: platform `Mod` resolution (metaKey on macOS, ctrlKey elsewhere; wrong-modifier events never match), guard chain G1 text-editing (target is INPUT/TEXTAREA/inside `[contenteditable]` → ignore entirely, no preventDefault) then G2 lock (`locked()` → inert), a typed binding table `{ combo, action, preventDefaultWhen, isApplicable }`, key normalization (`+`/`=` equivalence, Shift detection, arrow keys), and a `handleKeydown(event)` dispatcher — pure/DI-free so it is unit-testable without component scaffolding (Opus 4.8 · high)
- [X] T003 Host the router in `frontend/src/app/features/playground/canvas/canvas.component.ts`: single `document:keydown` listener per canvas instance delegating to `handleKeydown`, and migrate the existing Delete/Backspace handling (`canvas.component.ts:156-166`) into a router binding with byte-for-byte identical behavior (Opus 4.8 · high)
- [X] T004 Add programmatic selection-sync helpers in `frontend/src/app/features/playground/canvas/canvas.component.ts`: `syncSelectionToFlow(nodeIds, edgeIds)` → set store `selection` first, then `flow.select(nodeIds, edgeIds, false)` (suppressed event, per research R2 deferred-tick caveat); `clearAllSelection()` → store clear + `flow.clearSelection()`; obtain `FFlowComponent` via `viewChild` (Opus 4.8 · medium)
- [X] T005 [P] Unit tests for the router in `frontend/src/app/features/playground/canvas/canvas-shortcuts.spec.ts`: guard ordering (text-editing beats everything; lock blocks all), platform modifier matching, wrong-modifier no-match, Delete parity, preventDefault rules per binding (Sonnet 5 · medium)

**Checkpoint**: Foundation ready — existing Delete behavior unchanged (regression-check it), router tested. User stories can begin.

---

## Phase 3: User Story 1 — Copy and Paste a Canvas Selection (Priority: P1) 🎯 MVP

**Goal**: Same-canvas copy/paste of selections (components + sticky notes + internal connections, names/notes preserved), cascading offset, atomic undo, toolbar buttons. Spec US1; contracts `store-api.md` + `ui-components.md` §3; data-model §1.

**Independent Test**: Select two connected components → `Ctrl+C`, `Ctrl+V` → wired duplicate appears offset below-right with names/notes intact and becomes the selection; one `Ctrl+Z` removes it entirely (quickstart US1).

- [X] T006 [P] [US1] Create pure clipboard logic in `frontend/src/app/features/playground/state/clipboard.ts`: types `ClipboardBuffer`/`CopiedComponent`/`CopiedStickyNote`/`CopiedConnection` (data-model §1, id-free, index-pair connections); `captureSelection(nodes, edges, stickyNotes, selection)` — bounding-box-origin normalization, both-endpoints edge filter, displayName/note preservation, notes-only selections valid; `materialize(buffer, generation, newId)` — fresh ids in `components` order, index-pair edge resolution, `PASTE_OFFSET = 24` cascade placement; no Angular imports (Sonnet 5 · high)
- [X] T007 [P] [US1] Unit tests in `frontend/src/app/features/playground/state/clipboard.spec.ts`: relative-layout preservation, dangling-connection exclusion, sticky-notes-only capture, name/note fidelity, cascade math for generations 1–3, all materialized ids fresh and edge endpoints valid (Sonnet 5 · medium) *(after T006)*
- [X] T008 [US1] Integrate clipboard into `frontend/src/app/features/playground/state/playground.store.ts` per `contracts/store-api.md`: `clipboard` signal, `canCopy`/`canPaste` computed, `copySelection()` (no-op on empty selection preserving buffer; never touches history/OS clipboard), `pasteClipboard()` (single `commit()` ⇒ one undo step, pasteCount increment, selection set to pasted ids, returns ids, lock/null guards in-store) (Opus 4.8 · high) *(after T006)*
- [X] T009 [P] [US1] Store tests in `frontend/src/app/features/playground/state/playground.store.spec.ts`: paste is exactly one undo step (undo removes all pasted items), redo stack cleared on paste, empty-selection copy preserves buffer, null-buffer paste no-op, locked ⇒ both no-op, repeated pastes cascade, `canCopy`/`canPaste` transitions (Sonnet 5 · medium) *(after T008)*
- [X] T010 [US1] Register `Mod+C`/`Mod+V` bindings in `frontend/src/app/features/playground/canvas/canvas.component.ts` (router from T002): copy → `store.copySelection()`; paste → `store.pasteClipboard()` then `syncSelectionToFlow(pastedIds)` (T004); preventDefault when dispatched; text-editing guard leaves field-level copy/paste native (Opus 4.8 · medium) *(after T004, T008)*
- [X] T011 [P] [US1] Add Copy/Paste toolbar buttons in `frontend/src/app/features/playground/canvas/canvas-controls.component.ts` and `.html`: placed beside Undo/Redo/Delete, enabled by `store.canCopy()`/`store.canPaste()`, platform-aware shortcut tooltips ("Copy (⌘C)" / "(Ctrl+C)"), icons from T001, same store calls as keyboard (Sonnet 5 · low) *(after T008)*
- [X] T012 [P] [US1] Smoke tests in `frontend/src/app/features/playground/canvas/canvas-controls.component.spec.ts`: Copy/Paste buttons render, disabled states follow `canCopy`/`canPaste`, click invokes store methods (Sonnet 5 · low) *(after T011)*

**Checkpoint**: MVP complete — run quickstart US1 on BOTH playground and sandbox pages. `git commit`.

---

## Phase 4: User Story 2 — Undo and Redo from the Keyboard (Priority: P2)

**Goal**: `Mod+Z` / `Mod+Shift+Z` identical to the existing toolbar Undo/Redo; no Ctrl+Y. Spec US2; research R9.

**Independent Test**: Move a component → `Ctrl+Z` restores position; `Ctrl+Shift+Z` reapplies; `Ctrl+Y` does nothing; keys are no-ops at history bounds and while locked/typing (quickstart US2).

- [X] T013 [US2] Register `Mod+Z` → `store.undo()` and `Mod+Shift+Z` → `store.redo()` bindings in `frontend/src/app/features/playground/canvas/canvas.component.ts`, each followed by `flow.clearSelection()` (store already resets its selection signal on undo/redo); explicitly no `Mod+Y` binding; preventDefault on dispatch; history-bound no-ops come free from the store (Sonnet 5 · medium) *(after Phase 2)*
- [X] T014 [P] [US2] Router tests in `frontend/src/app/features/playground/canvas/canvas-shortcuts.spec.ts`: Mod+Z/Mod+Shift+Z dispatch, Shift discrimination (plain Z never redoes), Mod+Y unbound, locked inert, text-editing ignored (Sonnet 5 · low) *(after T013)*

**Checkpoint**: US1 + US2 both work. `git commit`.

---

## Phase 5: User Story 3 — Keyboard Shortcut Pack (Priority: P3)

**Goal**: Select-all, Escape deselect, duplicate, arrow nudge (Shift = 10×, burst = one undo step), keyboard zoom. Spec US3; contracts `store-api.md`; research R6–R8.

**Independent Test**: `Ctrl+A` selects everything; `Esc` clears; `Ctrl+D` duplicates without touching the clipboard; arrows nudge (burst undoes in one step); `Ctrl+=`/`-`/`0` zoom/fit only when the canvas is the active target (quickstart US3).

- [X] T015 [US3] Add `commitCoalesced(key, mutator, windowMs = 500)` to `frontend/src/app/features/playground/state/playground.store.ts`: first call in a burst snapshots like `commit()` (clearing redo stack), same-key calls inside the sliding window mutate without new snapshots, plain `commit()` closes any open window, expiry closes the burst — preserve `MAX_HISTORY` trimming and `structuredClone` snapshot semantics exactly (Opus 4.8 · high) *(after Phase 2)*
- [X] T016 [US3] Add `nudgeSelection(dx, dy)` to `frontend/src/app/features/playground/state/playground.store.ts`: moves selected components AND selected sticky notes via `commitCoalesced('nudge', …)`; constants `NUDGE_STEP = 8`, coarse factor 10 (callers pass final dx/dy); empty-selection and locked no-ops in-store (Opus 4.8 · medium) *(after T015)*
- [X] T017 [P] [US3] Add `selectAllElements()` to `frontend/src/app/features/playground/state/playground.store.ts`: selection = every node id + edge id + sticky-note selection per store's selection model; empty-canvas and locked no-ops; no history entry (selection is not in `Snapshot`) (Sonnet 5 · low) *(after Phase 2)*
- [X] T018 [US3] Add `duplicateSelection()` to `frontend/src/app/features/playground/state/playground.store.ts`: `captureSelection` → `materialize` at generation 1 (reusing `clipboard.ts` from T006) in one `commit()`, selection set to duplicates, `clipboard` signal untouched (Sonnet 5 · medium) *(after T006, T008)*
- [X] T019 [P] [US3] Store tests in `frontend/src/app/features/playground/state/playground.store.spec.ts` (fake timers): nudge burst = one undo step, interleaved foreign commit splits bursts, window expiry splits bursts, Shift-coarse math at call site, duplicate leaves clipboard intact and is one undo step, selectAll covers nodes+edges+notes, locked/empty no-ops (Sonnet 5 · medium) *(after T016–T018)*
- [X] T020 [US3] Register pack bindings in `frontend/src/app/features/playground/canvas/canvas.component.ts`: `Mod+A` → `selectAllElements()` + `flow.select(allNodeIds, allEdgeIds, false)`; `Escape` → `clearAllSelection()` (T004; G1 keeps editor-Escape native); `Mod+D` → `duplicateSelection()` + selection sync; `Arrow*`/`Shift+Arrow*` → `nudgeSelection` with step×10 for Shift — preventDefault ONLY when selection is non-empty so page scroll survives empty-selection arrows (contract binding table) (Opus 4.8 · medium) *(after T016–T018)*
- [X] T021 [US3] Register zoom bindings with active-target scoping in `frontend/src/app/features/playground/canvas/canvas.component.ts`: track pointer-over/focus-within on the canvas host; `Mod+Plus`/`Mod+=` → `FZoomDirective.zoomIn()`, `Mod+Minus` → `zoomOut()`, `Mod+0` → existing `fitToView()`; preventDefault (blocking browser page zoom) only when canvas-scoped — elsewhere browser zoom must work untouched (G3, FR-016) (Opus 4.8 · medium) *(after Phase 2)*
- [X] T022 [P] [US3] Router tests in `frontend/src/app/features/playground/canvas/canvas-shortcuts.spec.ts`: zoom scope guard (in-canvas dispatch+preventDefault vs out-of-canvas untouched), arrow preventDefault-only-with-selection rule, Mod+A/Escape/Mod+D dispatch, all inert when locked/typing (Sonnet 5 · medium) *(after T020, T021)*

**Checkpoint**: Shortcut pack complete — quickstart US3 on both pages. `git commit`.

---

## Phase 6: User Story 4 — Right-Click Context Menu (Priority: P4)

**Goal**: Right-click menu — selection zone: Copy/Duplicate/Delete; canvas zone: Paste/Select All — with disabled predicates, native-menu suppression inside the canvas only. Spec US4; contract `ui-components.md` §1; research R4.

**Independent Test**: Right-click a selected component → menu with Copy/Duplicate/Delete (browser menu suppressed); right-click empty canvas → Paste/Select All with Paste disabled when nothing copied; every entry's result identical to its shortcut (quickstart US4).

- [X] T023 [P] [US4] Create `frontend/src/app/features/playground/canvas/canvas-context-menu.component.ts` (standalone, OnPush) on `@angular/cdk/overlay`: flexible connected position at click point with viewport-edge fallback, zone-driven entries with disabled predicates (`canCopy`/`canPaste`/selection non-empty/canvas non-empty, all locked-aware), `action` output emitting `'copy'|'paste'|'duplicate'|'delete'|'selectAll'`, dismissal on entry click/outside click/Escape/window blur (Sonnet 5 · high) *(after Phase 3; duplicate entry needs T018)*
- [X] T024 [US4] Wire zones in `frontend/src/app/features/playground/canvas/canvas.component.ts` and `.html`: `(contextmenu)` on node/sticky-note wrappers (zone `selection` — right-clicking an unselected item selects it first) and canvas background (zone `canvas`), `preventDefault()` only inside the canvas host, ignore while a drag/connection gesture is in progress (`fDragStarted`/`fDragEnded` flag), route `action` output to the exact same store/flow calls as the keyboard router (Opus 4.8 · medium) *(after T023)*
- [X] T025 [P] [US4] Smoke tests in `frontend/src/app/features/playground/canvas/canvas-context-menu.component.spec.ts`: zone entry sets, disabled predicates (incl. locked ⇒ mutating entries disabled), action emission + close-on-action (Sonnet 5 · medium) *(after T023)*

**Checkpoint**: Context menu live — quickstart US4. `git commit`.

---

## Phase 7: User Story 5 — Alignment Guides While Dragging (Priority: P5)

**Goal**: Visual-only guide lines during drag (edge/center alignment within tolerance, nearest-per-axis, group bounds for multi-drag) — never snapping. Spec US5; contract `ui-components.md` §2; research R3 (Foblex magnetic components are forbidden — they snap on drag-end).

**Independent Test**: Drag a node slowly past another — guides appear on alignment and vanish on drag end; the node lands exactly where released (zero snap); smooth on a ~20-node canvas (quickstart US5).

- [X] T026 [P] [US5] Create pure geometry module `frontend/src/app/features/playground/canvas/alignment-guides.ts`: rect types, `detectAlignments(draggedBounds, peerRects, tolerance)` → `AlignmentGuide[]` (data-model §2) checking edges + centers per axis, nearest-match-per-axis selection, guide span covering dragged bounds + matched peer, group-bounds helper for multi-drag; `ALIGN_TOLERANCE` constant; no Angular/DOM imports (Sonnet 5 · high)
- [X] T027 [P] [US5] Unit tests in `frontend/src/app/features/playground/canvas/alignment-guides.spec.ts`: edge vs center matches, tolerance boundary (inside/at/outside), nearest-per-axis wins among multiple candidates, span computation, multi-rect group bounds (Sonnet 5 · medium) *(after T026)*
- [X] T028 [P] [US5] Create dumb renderer `frontend/src/app/features/playground/canvas/alignment-guides.component.ts` (standalone, OnPush): `guides` input → absolutely-positioned overlay lines in canvas space (vertical/horizontal, `kind` styling hook), empty input renders nothing; styles in component or `canvas.component.scss` (Sonnet 5 · medium) *(after T026)*
- [X] T029 [US5] Integrate live drag tracking in `frontend/src/app/features/playground/canvas/canvas.component.ts` and `.html`: bracket with `(fDragStarted)`/`(fDragEnded)`, cache peer node DOM rects once at drag start, rAF-throttled pointermove sampling of dragged node element rects (Foblex position model only updates at finalize — DOM is the live source), convert screen→canvas coordinates using current scale/position (`FCanvasComponent.getScale()`/`getPosition()`), feed `detectAlignments` → guides signal → `<app-alignment-guides>`; guarantee zero position mutation, guides cleared on drag end, no change-detection storms (OnPush + signal writes only on guide changes), 60 fps on ~20-node canvas (Opus 4.8 · xhigh) *(after T026, T028)*
- [X] T030 [P] [US5] Smoke test in `frontend/src/app/features/playground/canvas/alignment-guides.component.spec.ts`: renders lines for synthetic guides, clears when input empties (Sonnet 5 · low) *(after T028)*

**Checkpoint**: All five stories functional — quickstart US5 incl. the no-snap drop check. `git commit`.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T031 [P] Lint + build pass: `cd frontend && npm run lint && npm run build`, fix all new-code findings across the files touched by this feature (Sonnet 5 · low)
- [X] T032 Full quickstart validation on BOTH pages (level playground + sandbox) per `specs/003-canvas-editing-shortcuts/quickstart.md`, including cross-cutting gates (SC-002 parity walk, SC-004 lock/typing safety, FR-025 reload-persistence, FR-007 clipboard-cleared-on-reload) — use the project `verify` skill to drive the app (Opus 4.8 · medium) — **playground 14/14 + sandbox 11/11 pass**. Two bugs found & fixed during validation: (1) `detectPlatform()` used `??` which kept an empty `userAgentData.platform`, misdetecting the platform and breaking every Cmd/Ctrl shortcut in headless/privacy-hardened Chrome → changed to `||`; (2) `onCanvasContextMenu` lacked `stopPropagation()`, so CDK's outside-click dispatcher instantly dismissed the canvas-zone menu (Paste/Select All never appeared) → added it. Regression tests added for both (5 new specs).
- [X] T033 Performance validation per Constitution II/V: drag with guides on ~20-node canvas stays smooth (60 fps target, no long tasks in DevTools performance trace), every shortcut responds < 100 ms perceived; tune `ALIGN_TOLERANCE`/rAF path in `frontend/src/app/features/playground/canvas/canvas.component.ts` if needed (Opus 4.8 · medium) — **Cmd+D handler+CD = 24.8 ms (< 100 ms); ZERO browser long-tasks during continuous guide-active drag on a 28-node canvas.** No tuning needed. (Headless rAF frame-interval numbers are dominated by the CDP drive loop, not real rendering; long-task count is the reliable jank signal.)
- [X] T034 [P] Accessibility/discoverability pass on new controls in `frontend/src/app/features/playground/canvas/canvas-controls.component.html` and `canvas-context-menu.component.ts`: aria-labels, platform-correct shortcut hints in tooltips/menu entries (Sonnet 5 · low)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none — start immediately
- **Phase 2 (Foundational)**: after Phase 1 — **BLOCKS all user stories** (router + selection sync)
- **Phase 3 (US1)**: after Phase 2 — no other story dependencies 🎯 MVP
- **Phase 4 (US2)**: after Phase 2 only (independent of US1)
- **Phase 5 (US3)**: after Phase 2; T018 (duplicate) additionally needs T006+T008 from US1
- **Phase 6 (US4)**: after Phase 3 (menu invokes copy/paste) and T018 (duplicate entry)
- **Phase 7 (US5)**: after Phase 2 only — fully independent of US1–US4
- **Phase 8 (Polish)**: after all desired stories

### Key task-level dependencies

- T002 → T003 → T004 (same file, sequential); T005 after T002
- T006 → {T007, T008}; T008 → {T009, T010, T011}; T011 → T012
- T015 → T016 → {T019, T020}; T018 needs T006+T008; T021 independent within phase
- T023 → {T024, T025}; T026 → {T027, T028} → T029; T028 → T030

### Parallel Opportunities

- **Cross-story**: after Phase 2, US2 (T013–T014), US5 pure parts (T026–T028), and US1 (T006…) can proceed in parallel — different files
- **Within US1**: T006 ∥ nothing initially; then T007 ∥ T008; then T009 ∥ T010 ∥ T011
- **Within US3**: T017 ∥ T015-chain ∥ T021; T019 ∥ T020 after their prerequisites
- **Within US5**: T026 ∥ (nothing), then T027 ∥ T028

## Parallel Example: after Phase 2 completes

```bash
# Three independent workstreams (different files):
Task A (Sonnet 5 · high):  T006 clipboard.ts pure logic            [US1]
Task B (Sonnet 5 · medium): T013 undo/redo key bindings            [US2]
Task C (Sonnet 5 · high):  T026 alignment-guides.ts geometry       [US5]
```

## Implementation Strategy

**MVP first (recommended)**: Phase 1 → Phase 2 → Phase 3 (US1) → STOP & VALIDATE quickstart US1 on both pages → commit/demo. Copy/paste alone is the headline value (product decision: clipboard before undo keys).

**Incremental delivery**: then US2 (30-minute win — engine already exists), US3, US4, US5 — validating and committing at every checkpoint. Each story leaves the app releasable.

**Model economy note**: 21 of 34 tasks are Sonnet 5-assignable (62%); Opus 4.8 is reserved for the 13 tasks touching undo-engine semantics, Foblex timing, guard correctness, and the rAF drag overlay — with T029 as the single xhigh-effort task.

## Notes

- Constants (`PASTE_OFFSET = 24`, `NUDGE_STEP = 8`, coarse ×10, `WINDOW_MS = 500`, `ALIGN_TOLERANCE`) are tuning values (spec Assumptions) — define once, tweak freely
- Never enable Foblex `withA11y` keyboard or `f-magnetic-lines`/`f-magnetic-rects` (research R1/R3 — conflicts and forced snapping)
- All store mutations go through `commit()`/`commitCoalesced()` — direct signal writes outside the gate break undo/autosave (store-api invariant 1)
- Commit after each task or logical group; every checkpoint = independently testable increment
