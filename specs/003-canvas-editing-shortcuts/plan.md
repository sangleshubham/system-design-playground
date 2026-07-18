# Implementation Plan: Canvas Editing Shortcuts & Navigation Aids

**Branch**: `003-canvas-editing-shortcuts` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-canvas-editing-shortcuts/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Frontend-only feature adding five capabilities to the shared playground canvas (used by both the level playground and sandbox pages): (P1) same-canvas copy/paste of selections including internal connections, sticky notes, and custom names/notes; (P2) keyboard undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z); (P3) a keyboard shortcut pack (select-all, Escape deselect, duplicate, arrow-key nudge with Shift for coarse steps, keyboard zoom); (P4) a right-click context menu; (P5) visual-only alignment guides while dragging.

Technical approach: the existing `PlaygroundStore` undo/redo engine (`past`/`future` snapshot stacks behind a `commit()` gate) is reused as-is for every new mutation; a clipboard buffer (in-memory, id-free, relative-position capture) and a coalesced-commit variant for nudge bursts are added to the store. Foblex Flow 19.0.0's built-in programmatic selection APIs (`selectAll()`, `select()`, `clearSelection()`) and `FZoomDirective` (`zoomIn()`/`zoomOut()`) cover selection and zoom. A single document-level keyboard router (with text-editing and lock guards, following the existing Delete-key pattern) dispatches all shortcuts. The context menu is a new standalone component on Angular CDK Overlay (already a dependency). Alignment guides are a new custom visual-only overlay — Foblex's `f-magnetic-lines` was evaluated and rejected because it snaps positions on drag-end with no disable option, violating FR-021. **No backend, API, or dependency changes.**

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Angular 20.3 — standalone components, `ChangeDetectionStrategy.OnPush`, Angular Signals for state. Backend (Node.js/Express) is untouched by this feature.

**Primary Dependencies**: `@foblex/flow` 19.0.0 (canvas rendering, drag, selection, zoom), `@angular/cdk` 20.2 (Overlay for the context menu), RxJS 7.8 (edges only). **No new dependencies are introduced** (Constitution Principle III).

**Storage**: N/A (no new persistence). Existing auto-save (2 s debounce → `PUT /api/v1/levels/:id/design` and `PUT /api/v1/sandbox/designs/:id`) already tracks the graph signals, so paste/duplicate/nudge/undo persist with zero new wiring (FR-025). The clipboard buffer is in-memory only and intentionally not persisted (FR-007).

**Testing**: `ng test --no-watch` (Vitest runner) with co-located `*.spec.ts` files; ESLint via `npm run lint`. New unit tests for clipboard capture/materialization, nudge coalescing, and shortcut guards; smoke tests for the context menu and alignment-guide components (constitution quality gate).

**Target Platform**: Evergreen desktop/tablet browsers (viewports ≥ 768 px). macOS uses Cmd where Windows/Linux uses Ctrl (FR-024).

**Project Type**: Web application (`frontend/` + `backend/` at repo root); this feature touches `frontend/` only.

**Performance Goals**: 60 fps canvas drag with alignment guides active (guide computation rAF-throttled, peer rects cached at drag start); < 100 ms perceived response for every shortcut (Constitution Principle II); paste of a select-all-sized design (~120 nodes, the minimap render limit) lands as one commit without visible jank.

**Constraints**: Alignment guides are visual-only — must never alter drag positions (FR-021), which rules out Foblex's built-in magnetic components; every feature action is inert while the canvas is locked (FR-022); no shortcut may fire while typing in text fields (FR-023); paste/duplicate/nudge-burst each occupy exactly one undo step (FR-006, FR-015); the existing `MAX_HISTORY = 100` undo cap is unchanged (FR-025).

**Scale/Scope**: Designs up to ~120 nodes; two host pages (level playground, sandbox) sharing one `CanvasComponent` — behavior must be identical on both (FR-026); 5 prioritized user stories; ~4 new frontend files plus targeted edits to 4 existing ones.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Verdict | Evidence |
|---|-----------|---------|----------|
| I | Interactivity-First | ✅ PASS | The entire feature is direct-manipulation interaction: clipboard, keyboard editing, context menu, and live drag feedback on the existing hands-on canvas. No passive content is added. |
| II | Simplicity & Ease of Use | ✅ PASS | Uses universally known shortcut conventions (Ctrl+C/V/Z/A/D, Esc, arrows); zero new navigation (no click-depth change); every keyboard action has a visible toolbar/menu equivalent (SC-002); all actions give immediate visual feedback (< 100 ms goal, SC-003). No tooltip-chain needed — shortcuts mirror what users already know from other tools. |
| III | Fixed Technology Stack (NON-NEGOTIABLE) | ✅ PASS | Zero new libraries. Angular 20 + TypeScript only, reusing already-present `@foblex/flow` and `@angular/cdk`. The one tempting shortcut (Foblex `f-magnetic-lines`) was rejected on spec grounds, not replaced by a new dependency — guides are hand-built in Angular. |
| IV | Modular Component Architecture | ✅ PASS | All new code lives inside the existing `features/playground/` area as standalone components/helpers with defined inputs/outputs (documented in `contracts/`); the shared `CanvasComponent` remains the single canvas consumed by both routes. No backend changes → no new REST endpoints; existing versioned `/api/v1/` endpoints are reused unchanged. |
| V | Performance & Responsiveness | ✅ PASS | Guides overlay is rAF-throttled with rects cached at drag start; nudge bursts coalesce into single commits (no history/CD flood); OnPush maintained; no additional route weight outside the playground feature. 60 fps drag target stated in Technical Context and verified in quickstart. |

**Gate result (pre-Phase 0)**: PASS — no violations, Complexity Tracking intentionally empty.

**Gate result (post-Phase 1 re-check)**: PASS — the design artifacts introduce no new dependencies, no backend surface, and keep all additions inside the playground feature module. The custom alignment-guide overlay is the only non-trivial new mechanism and exists specifically to honor the spec's visual-only product decision.

## Project Structure

### Documentation (this feature)

```text
specs/003-canvas-editing-shortcuts/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── keyboard-shortcuts.md   # Key map, guards, platform rules
│   ├── store-api.md            # New PlaygroundStore method contracts
│   └── ui-components.md        # Context menu, guides overlay, toolbar additions
├── checklists/
│   └── requirements.md  # Spec quality checklist (complete, all pass)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── src/app/
│   ├── core/
│   │   └── models.ts                                  # UNCHANGED — DesignNode/DesignEdge/StickyNote reused
│   ├── features/playground/
│   │   ├── canvas/
│   │   │   ├── canvas.component.ts                    # CHANGED — keyboard router host, context-menu triggers,
│   │   │   │                                          #   programmatic selection sync, guides wiring
│   │   │   ├── canvas.component.html                  # CHANGED — context menu + guides overlay elements
│   │   │   ├── canvas.component.scss                  # CHANGED — overlay/guide styles
│   │   │   ├── canvas-controls.component.ts           # CHANGED — Copy/Paste buttons + disabled predicates
│   │   │   ├── canvas-controls.component.html         # CHANGED — Copy/Paste buttons
│   │   │   ├── canvas-shortcuts.ts                    # NEW — shortcut map, guards (text-editing, lock,
│   │   │   │                                          #   platform Cmd/Ctrl), action dispatch
│   │   │   ├── canvas-context-menu.component.ts       # NEW — CDK-Overlay context menu (standalone)
│   │   │   ├── alignment-guides.component.ts          # NEW — visual-only guide overlay (standalone)
│   │   │   └── alignment-guides.ts                    # NEW — pure geometry: rect alignment detection
│   │   └── state/
│   │       ├── playground.store.ts                    # CHANGED — clipboard signal, copy/paste/duplicate,
│   │       │                                          #   selectAll, nudge with coalesced commit
│   │       └── clipboard.ts                           # NEW — pure capture/materialize + id remap helpers
│   └── shared/
│       └── icon.registry.ts                           # CHANGED — copy/paste icons
└── src/app/features/playground/**/*.spec.ts           # NEW/CHANGED — co-located unit + smoke tests

backend/                                               # UNCHANGED — no API or model changes
```

**Structure Decision**: Web application layout (existing `frontend/` + `backend/`). All feature work is additive inside `frontend/src/app/features/playground/` — the shared canvas component and its per-page-provided `PlaygroundStore` — so both host pages (level playground and sandbox) inherit identical behavior automatically (FR-026). Pure logic (clipboard capture/materialization, alignment geometry, shortcut guards) is isolated in plain TypeScript modules (`clipboard.ts`, `alignment-guides.ts`, `canvas-shortcuts.ts`) for direct unit testing without component scaffolding.

## Complexity Tracking

> No constitution violations — this table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
