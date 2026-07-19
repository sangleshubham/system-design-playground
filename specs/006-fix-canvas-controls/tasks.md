# Tasks: Canvas Controls & Viewport Fixes

**Input**: Design documents from `/specs/006-fix-canvas-controls/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: INCLUDED — plan.md Technical Context and research.md R6 explicitly require unit tests (fit clamp, copy-key handler, overlay-container provider, icon registry), and the constitution's quality gate mandates smoke coverage for interactive components.

**Organization**: Tasks are grouped by user story (US1–US5 from spec.md) so each story is independently implementable and testable. This feature is **frontend-only** — `backend/` is untouched.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US5)
- Every task names exact file paths relative to the repo root

## Path Conventions

Web application layout: `frontend/` + `backend/` at repo root. All edits land under `frontend/src/`. Test specs are co-located `*.spec.ts` files (Vitest via `ng test --no-watch`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a green baseline before touching shared canvas components. No scaffolding or new dependencies are needed (Constitution III — `FullscreenOverlayContainer` ships in the existing `@angular/cdk`).

- [X] T001 Verify baseline gates on branch `006-fix-canvas-controls`: `cd frontend && npm install && npm run lint && npm test` — all green before any edits; record any pre-existing failures so they are not attributed to this feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None required. All five stories edit existing, already-wired components; there is no shared prerequisite code to build first. Research anchors (file:line references in research.md) were verified 2026-07-19 on this branch — re-verify only after a rebase (plan.md Wave 0).

**Checkpoint**: Setup green — user stories US1, US2, US3, US4 can all start immediately and in parallel. US5 must wait for US3 (shared files, see Dependencies).

---

## Phase 3: User Story 1 - Confirmation and result popups work in full-screen (Priority: P1) 🎯 MVP

**Goal**: The Reset confirmation, results/scoring, and AI-review popups render on top of the full-screen canvas and stay single-instance across fullscreen enter/exit (FR-001, FR-002, FR-003). Fix covers both playground and sandbox pages via the shared confirm dialog.

**Independent Test**: Enter full-screen, click Reset → confirmation popup appears on top of the full-screen canvas; Confirm and Cancel both work. Repeat for the results and AI-review popups. Exit fullscreen with a popup open → exactly one instance remains (quickstart.md §US1).

### Implementation for User Story 1

- [X] T002 [P] [US1] Register the CDK fullscreen overlay container in `frontend/src/app/app.config.ts`: import `OverlayContainer` and `FullscreenOverlayContainer` from `@angular/cdk/overlay` and add `{ provide: OverlayContainer, useClass: FullscreenOverlayContainer }` to the `providers` array (contract C1, research R1). No changes to `ConfirmDialogService`/`ConflictDialogService`
- [X] T003 [P] [US1] Move the `<app-results-dialog>` and `<app-ai-review-panel>` `@if` blocks (currently siblings of `.playground` at lines ~71–91) **inside** `<section class="pg-canvas-area" #canvasArea>` in `frontend/src/app/features/playground/playground.page.html` — keep trigger conditions (`result()` signal; `aiReviewOpen() && store.level()` with its `@defer`) byte-for-byte unchanged so exactly one instance exists per popup (contract C2, research R1)
- [X] T004 [P] [US1] Add provider unit test in `frontend/src/app/app.config.spec.ts` (new file): configure TestBed with `appConfig` providers and assert `TestBed.inject(OverlayContainer) instanceof FullscreenOverlayContainer` (contract C1 test hook, research R6.3)
- [X] T005 [US1] Verify US1: run `cd frontend && npm test` (touched specs green), then execute quickstart.md §US1 — fullscreen Reset confirm/cancel, results + AI-review popups in fullscreen, single instance after exit, sandbox page repeat, denied-fullscreen fallback

**Checkpoint**: US1 fully functional and independently testable — popups work in full-screen on playground AND sandbox

---

## Phase 4: User Story 2 - Fit-to-screen never over-zooms (Priority: P1)

**Goal**: Every fit-to-screen path (toolbar button, `Mod+0`, post-auto-tidy) caps zoom-in at 100% while large diagrams keep zooming out with 48px padding (FR-004, FR-005, FR-006). Manual zoom range 25%–250% untouched.

**Independent Test**: With a single small node, click Fit to screen → view settles centered at ≤ 100% (node does not balloon). With a diagram wider than the viewport → zooms out until everything is visible with padding (quickstart.md §US2).

### Tests for User Story 2

- [X] T006 [P] [US2] Add fit-clamp unit tests in `frontend/src/app/features/playground/canvas/canvas.component.spec.ts`: mock `FCanvasComponent` (`fitToScreen`, `getScale`, `resetScaleAndCenter`) and assert `resetScaleAndCenter(true)` is called when `getScale()` returns > 1 and when it returns `NaN`/`Infinity`, and is NOT called when it returns ≤ 1 (contract C3 test hook, research R6.1) — write first; tests must fail against current unclamped `fitToView()`

### Implementation for User Story 2

- [X] T007 [US2] Implement the post-fit clamp in `fitToView()` in `frontend/src/app/features/playground/canvas/canvas.component.ts` (~line 648): after `this.canvasCmp()?.fitToScreen({ x: 48, y: 48 }, true)`, read `const s = getScale()` synchronously and call `resetScaleAndCenter(true)` when `!Number.isFinite(s) || s > 1` (research R2, contract C3). Signature stays `fitToView(): void` — no call-site edits; only public `@foblex/flow` APIs; do not touch `fZoomMinimum`/`fZoomMaximum`
- [X] T008 [US2] Verify US2: T006 tests now pass; execute quickstart.md §US2 — small node ≤ 100% via button, `Ctrl/Cmd+0`, and Tidy; large diagram still zooms out with padding; empty canvas settles sanely; manual zoom still 25%–250%

**Checkpoint**: US1 and US2 both work independently — both P1 breakages fixed

---

## Phase 5: User Story 3 - Full-screen and fit-to-screen buttons are distinguishable (Priority: P2)

**Goal**: The Fit-to-screen and Full-screen toolbar buttons use visually distinct glyphs with clear labels, and the fullscreen button swaps to an exit icon/label while fullscreen is active (FR-007, FR-008).

**Independent Test**: View the bottom toolbar — the two icons are clearly different at toolbar size; tooltips read "Fit to screen (⌘0)" and "Full screen"; entering fullscreen switches the button to an exit glyph labeled "Exit full screen" (quickstart.md §US3).

### Implementation for User Story 3

- [X] T009 [P] [US3] Update `frontend/src/app/shared/icon.registry.ts`: replace the `fit` glyph with corner brackets **plus** a centered inner rect (add `<rect x="9" y="9" width="6" height="6" rx="1"/>` to the existing bracket path); add new `fullscreen-exit` entry with inward-pointing brackets (`M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5`); keep `fullscreen` and all other entries byte-identical (research R3, contract C5, data-model E5). Use the existing `svg()` helper (24×24 viewBox, `stroke="currentColor"`, stroke-width 2)
- [X] T010 [P] [US3] Add icon registry unit test in `frontend/src/app/shared/icon.registry.spec.ts` (new file): assert entries `fit`, `fullscreen`, `fullscreen-exit` exist and that `fit` markup ≠ `fullscreen` markup (regression guard for the original bug; contract C5 G2, research R6.4)
- [X] T011 [US3] Switch the fullscreen button on the `isFullscreen` signal in `frontend/src/app/features/playground/canvas/canvas-controls.component.html` (+ `.ts` if a helper is needed): icon `fullscreen` ⇄ `fullscreen-exit`, `title`/`aria-label` "Full screen" ⇄ "Exit full screen"; update the fit button to `title="Fit to screen (⌘0)"` / `aria-label="Fit to screen"` (contract C4 G1–G3). Depends on T009 (icon names)
- [X] T012 [US3] Verify US3: registry spec green; execute quickstart.md §US3 — glyphs distinct at toolbar size, tooltips correct, exit glyph while fullscreen, still distinguishable at ~768 px viewport

**Checkpoint**: US3 complete — this unblocks US5 (shared files)

---

## Phase 6: User Story 4 - The drawable canvas has a single white background (Priority: P2)

**Goal**: In the light theme the entire drawable canvas renders white (no gray zone), the dot grid stays faintly visible, and node cards/minimap/popups keep adequate contrast; dark theme untouched (FR-009, FR-010, FR-011).

**Independent Test**: Open the playground in the light theme — canvas is white edge-to-edge with faint dots and clearly separated cards/minimap; toggle dark theme — appearance unchanged from before the feature (quickstart.md §US4).

### Implementation for User Story 4

- [X] T013 [P] [US4] Change the light-theme token in `frontend/src/styles/_tokens.scss` (line ~72): `--canvas-bg: #f8fafc` → `--canvas-bg: var(--surface-0)`; leave light `--canvas-dot: #cbd5e1` and the entire dark-theme block (`--canvas-bg: #0f172a`, `--canvas-dot: #334155`) byte-identical; introduce no hardcoded colors elsewhere (research R4, contract C6, data-model E4)
- [X] T014 [US4] Verify US4: execute quickstart.md §US4 — white edge-to-edge in light theme (both `.pg-canvas-area` and `f-flow` surfaces), dot grid faintly visible (FR-011), node cards/minimap/popups distinguishable (FR-010), dark theme unchanged. Only if visual QA fails, apply the documented fallbacks: dots `#c2cdd9` (contract C6 G3) and/or card/minimap borders upgraded to `--border-strong` (research R4)

**Checkpoint**: US1–US4 all independently functional

---

## Phase 7: User Story 5 - Copy my own access key from the canvas (Priority: P3)

**Goal**: A "Copy my key" button in the shared canvas controls copies the full, unmasked access key to the clipboard with awaited success/failure feedback (1.5 s copied/error states), hidden when no key exists (FR-012–FR-015). Appears on playground and sandbox via the shared component.

**Independent Test**: With a workspace key active, click "Copy my key" → "Copied ✓" state shows; pasted value is the complete canonical key that the Welcome enter-key flow accepts. Deny clipboard → non-blocking error state. Clear the key → button absent (quickstart.md §US5).

**⚠️ Depends on US3 (T009, T011)** — shares `icon.registry.ts` and `canvas-controls.component.{ts,html}`.

### Tests for User Story 5

- [X] T015 [P] [US5] Add copy-key unit tests in `frontend/src/app/features/playground/canvas/canvas-controls.component.spec.ts`: mock `navigator.clipboard.writeText` and `KeyService` — assert (a) the **full** key from `KeyService.key()` is written (never `maskKey()` output), (b) `copied` state on resolve and auto-revert after 1.5 s (fake timers), (c) `error` state on reject and when the clipboard API is absent, (d) button not rendered when `hasKey()` is false (contract C4 G4–G6, research R6.2) — write first; tests must fail before T017

### Implementation for User Story 5

- [X] T016 [US5] Add `key` icon (and `check` icon if not already present) to `frontend/src/app/shared/icon.registry.ts` via the existing `svg()` helper (data-model E5, contract C5 G1). Depends on T009 landing first (same file)
- [X] T017 [US5] Implement the "Copy my key" button in `frontend/src/app/features/playground/canvas/canvas-controls.component.ts`, `.html`, and `.scss`: inject `KeyService` (`frontend/src/app/core/key.service.ts`, read-only); render the button in the top toolbar after Reset with the existing divider pattern, only when `keys.hasKey()`; on click **await** `navigator.clipboard.writeText(keys.key()!)` — resolve → `copyState` signal `'copied'`, reject/missing API → `'error'`, both auto-revert to `'idle'` after 1.5 s with icon/label swap on the button (data-model E3, contract C4 G4–G8, research R5). No keyboard shortcut (spec assumption — avoids Mod+C collision)
- [X] T018 [US5] Verify US5: T015 tests pass; execute quickstart.md §US5 — copy/paste roundtrip matches the full key, key works in a private-window Welcome flow, clipboard-denied error state, button absent after Switch key, button present and working on the sandbox page

**Checkpoint**: All five user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Integration gates, adversarial review, and full regression sweep (plan.md Wave 3).

- [X] T019 Run the static gates and fix anything red: `cd frontend && npm run lint && npm test` (all suites including the four new/extended specs); confirm `cd backend && npm test` is untouched and green
- [X] T020 [P] Adversarial code review of the full feature diff against FR-001…FR-017 and the constitution: verify no `maskKey` output reaches the copy path (FR-014), the single-popup invariant across fullscreen transitions (FR-003), the dark-theme block is byte-identical (C6 G2), no direct `fitToScreen` call sites bypass `fitToView()` (FR-005), and shared components have no playground/sandbox forks (Constitution IV) — report findings with file:line and fix per the conflict matrix
- [X] T021 [P] Execute the full quickstart.md validation end-to-end, including the SC-006 regression sweep: zoom buttons and `Mod+=`/`Mod+-` (25%–250%), pan, undo/redo, copy/paste selection, delete, lock, tidy all behave as before; visual checks on desktop and ~768 px tablet viewport (FR-017)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Empty — no blocking prerequisites for this feature
- **US1 (Phase 3), US2 (Phase 4), US3 (Phase 5), US4 (Phase 6)**: All depend only on Setup; fully parallel with each other (disjoint file sets, plan.md conflict matrix)
- **US5 (Phase 7)**: Depends on **US3** completing (T009/T011 share `icon.registry.ts` and `canvas-controls.component.{ts,html}` with T016/T017). US5 does NOT depend on US1, US2, or US4
- **Polish (Phase 8)**: Depends on all five user stories being complete

### User Story Dependencies

| Story | Priority | Depends on | Files written |
|---|---|---|---|
| US1 | P1 | — | `app.config.ts`, `playground.page.html`, `app.config.spec.ts` |
| US2 | P1 | — | `canvas.component.ts`, `canvas.component.spec.ts` |
| US3 | P2 | — | `icon.registry.ts`, `canvas-controls.component.{html,ts}`, `icon.registry.spec.ts` |
| US4 | P2 | — | `_tokens.scss` |
| US5 | P3 | **US3** | `canvas-controls.component.{ts,html,scss,spec.ts}`, `icon.registry.ts` |

### Within Each User Story

- Test tasks (T006, T015) are written first and must fail before their implementation tasks (T007, T017)
- Icon registry entries land before the templates that reference them (T009 → T011, T016 → T017)
- Each story ends with its quickstart verification task — complete it before starting a lower-priority story (constitution workflow rule)

### Parallel Opportunities

- **Wave 1** (after T001): T002, T003, T004 (US1) ∥ T006 (US2) ∥ T009, T010 (US3) ∥ T013 (US4) — up to 7 tasks across 4 stories, all disjoint files
- **Wave 2** (as US3 lands): T015, T016 → T017 (US5) can run alongside any still-running US1/US2/US4 tasks
- **Wave 3** (after all stories): T020 ∥ T21 review/QA in parallel; T019 is the integration gate
- Agent pre-selection per wave (agent type, model, effort) is defined in plan.md §Agent Execution Model

---

## Parallel Example: Wave 1 (all four independent stories at once)

```bash
# After T001, launch simultaneously — disjoint file sets per the conflict matrix:
Task T002: "Register FullscreenOverlayContainer provider in frontend/src/app/app.config.ts"
Task T003: "Move dialogs inside #canvasArea in frontend/src/app/features/playground/playground.page.html"
Task T004: "Provider unit test in frontend/src/app/app.config.spec.ts"
Task T006: "Fit-clamp tests in frontend/src/app/features/playground/canvas/canvas.component.spec.ts"
Task T009: "Replace fit glyph, add fullscreen-exit in frontend/src/app/shared/icon.registry.ts"
Task T010: "Icon registry test in frontend/src/app/shared/icon.registry.spec.ts"
Task T013: "Light --canvas-bg → var(--surface-0) in frontend/src/styles/_tokens.scss"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Phase 2 is empty — proceed directly
3. Complete Phase 3: US1 (T002–T005)
4. **STOP and VALIDATE**: quickstart.md §US1 on playground AND sandbox
5. Ship — the destructive-action (Reset) trust break is fixed

### Incremental Delivery

1. US1 → validate → ship (MVP: fullscreen popups fixed)
2. US2 → validate → ship (both P1 breakages fixed)
3. US3 → validate → ship (P2: distinguishable icons) — unblocks US5
4. US4 → validate → ship (P2: white canvas)
5. US5 → validate → ship (P3: copy key)
6. Phase 8 gates before merge

### Parallel Team/Agent Strategy

With multiple developers or subagents (plan.md §Agent Execution Model):

1. T001 together
2. Wave 1: A→US1, B→US2, C→US3, D→US4 in parallel
3. Wave 2: US5 starts the moment US3 lands (may overlap US1/US2/US4)
4. Wave 3: T019 gate + T020/T021 in parallel; findings loop back as fix tasks per the conflict matrix

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- No new dependencies, routes, or endpoints anywhere in this feature (Constitution III); `backend/` is never edited
- US3 before US5 is the ONLY inter-story ordering constraint (shared files)
- Workers should run `npm test -- --run <touched spec>` before reporting a task done; T019 remains the integration gate
- Commit after each task or logical group; stop at any checkpoint to validate the story independently
