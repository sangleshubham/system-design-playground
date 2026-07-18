# Implementation Plan: Interactive System Design Playground

**Branch**: `001-system-design-playground` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-system-design-playground/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A personal, single-user, gamified system design practice site. The core is an
interactive playground: drag infrastructure components from a categorized palette onto
a pan/zoom canvas, wire them into directed data flows, watch a mission checklist
auto-verify in real time, then press RUN for a rule-based five-dimension score
(Missions, Flow, Topology, Efficiency, Resilience; pass ≥ 90) that unlocks the next
level. Supporting surfaces: a challenge map grouped into Acts with sequential
unlocking, autosave/resume with a minimal home view, and a free-form sandbox.

Technical approach: Angular SPA (standalone components, Signals for state, Foblex Flow
for the node/edge canvas) talking to an Express REST API under `/api/v1/`. Content
(components, acts, levels, missions) is seeded from JSON; user state (designs,
attempts, progress) persists in SQLite. Scoring is a deterministic rule engine on the
backend. No auth, no payments, no multi-user features.

## Technical Context

**Language/Version**: TypeScript 5.x on both tiers; Node.js 22 (LTS)

**Primary Dependencies**:
- Frontend: Angular 20 (standalone components, Signals, built-in control flow),
  `@foblex/flow` for the canvas (nodes, connector-based edges, external-palette drag,
  zoom/pan), Angular CDK (overlays, a11y)
- Backend: Express 5, `better-sqlite3` (synchronous, zero-config single-user DB),
  `zod` for request/content validation

**Storage**: SQLite file (`backend/data/app.db`) for user state (designs, attempts,
progress, sandbox designs); versioned JSON seed files for content (component catalog,
acts, levels, missions, hints)

**Testing**: Vitest on both tiers (Angular CLI unit-test runner for frontend;
Vitest + supertest for backend API); smoke tests for each interactive component per
constitution

**Target Platform**: Desktop/tablet browsers (viewport ≥ 768 px), served locally or on
a small personal server; single deployment = single user

**Project Type**: Web application (frontend + backend)

**Performance Goals**: 60 fps canvas interaction with 50 nodes; < 100 ms perceived
feedback on every canvas action and mission check; RUN evaluation < 5 s (rule engine
target < 200 ms); initial home load < 3 s

**Constraints**: Constitution-mandated stack (Angular + Express — React Flow from the
original reference is excluded); rule-based scoring at launch (LLM feedback may layer
on later behind the same contract); autosave loses ≤ a few seconds of edits;
route-level lazy loading mandatory

**Scale/Scope**: Single user; catalog of ~42 components in 7 categories; level schema
supports 70 levels / 9 Acts with the first two Acts (≥ 12 levels) seeded; 5 lazy routes
(home, lab map, playground, sandbox list, sandbox canvas)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Verdict | Evidence |
|---|-----------|---------|----------|
| I | Interactivity-First | ✅ PASS | The product *is* the interaction: drag-drop canvas, live mission auto-checks, RUN scoring loop. No static-text-only surface exists; the map and home views are navigational, feeding the playground. |
| II | Simplicity & Ease of Use | ✅ PASS | Home → map → level = 2 clicks (FR-032, SC-001); < 100 ms feedback (FR-008, SC-002); shared UI library keeps controls consistent. UX review gate applies to the playground before release. |
| III | Fixed Technology Stack | ✅ PASS | Angular 20 + TypeScript frontend; Node.js + Express backend. Third-party additions (`@foblex/flow`, `better-sqlite3`, `zod`, Angular CDK) all integrate within the stack and are justified in [research.md](./research.md). React Flow explicitly rejected. |
| IV | Modular Component Architecture | ✅ PASS | Lazy standalone routes per surface; playground decomposed into palette / canvas / context-panel components; shared library (`frontend/src/app/shared/`) for badges, cards, theme toggle; versioned REST contracts under `/api/v1/` documented in [contracts/api.md](./contracts/api.md) before implementation. |
| V | Performance & Responsiveness | ✅ PASS | Route-level code splitting; canvas targets 60 fps at 50 nodes (SC-002); home < 3 s; desktop/tablet responsive with graceful phone degradation. |

**Post-Phase-1 re-check**: design artifacts (data model, contracts, structure below)
introduce no violations. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-system-design-playground/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── api.md           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.ts                    # Express app assembly (middleware, routes, errors)
│   ├── server.ts                 # Entry point
│   ├── routes/                   # /api/v1 routers: components, map, levels,
│   │                             #   designs, attempts, progress, sandbox
│   ├── services/
│   │   ├── content.service.ts    # Loads + validates JSON seed content
│   │   ├── mission.service.ts    # Mission auto-check rules over a design graph
│   │   ├── scoring/              # Rule engine: one module per dimension
│   │   │   ├── missions.rule.ts
│   │   │   ├── flow.rule.ts
│   │   │   ├── topology.rule.ts
│   │   │   ├── efficiency.rule.ts
│   │   │   └── resilience.rule.ts
│   │   └── progress.service.ts   # Unlock chain, best scores, resume pointer
│   ├── db/                       # SQLite init, migrations, repositories
│   └── models/                   # Shared TS types + zod schemas
├── content/                      # JSON seeds: components.json, acts.json, levels/*.json
├── data/                         # SQLite database file (gitignored)
└── tests/                        # Vitest + supertest: scoring rules, missions, API

frontend/
├── src/app/
│   ├── core/                     # API client services, app-level providers, theme
│   ├── shared/                   # Difficulty badge, progress bar, cards, icons, dialogs
│   ├── features/
│   │   ├── home/                 # Lab progress, continue card, recommended next
│   │   ├── lab-map/              # Acts, level cards, search, lock states
│   │   ├── playground/
│   │   │   ├── palette/          # Search, recommended toggle, metadata cards
│   │   │   ├── canvas/           # Foblex Flow wrapper, node/edge components, controls
│   │   │   ├── context-panel/    # Brief, specs, missions, hints
│   │   │   ├── results/          # Score + per-dimension feedback dialog
│   │   │   └── state/            # Signal store: graph, history (undo/redo), autosave
│   │   └── sandbox/              # Design list + free-form canvas (reuses canvas/palette)
│   └── app.routes.ts             # Lazy route definitions
└── src/styles/                   # Design tokens, light/dark themes
frontend/tests/                   # Component smoke tests (colocated *.spec.ts also allowed)
```

**Structure Decision**: Web application layout mandated by the constitution —
`frontend/` (Angular workspace) and `backend/` (Express service) at the repository
root, each with its own `src/` and tests. The playground feature is decomposed so the
canvas and palette are reused verbatim by the sandbox.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally empty.
