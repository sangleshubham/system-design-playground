# Phase 0 Research: Interactive System Design Playground

**Date**: 2026-07-08 | **Plan**: [plan.md](./plan.md)

All Technical Context unknowns are resolved below. The central question was how to
deliver a React-Flow-class canvas experience inside the constitution-mandated
Angular + Express stack.

## R1. Node/Edge Canvas Library

- **Decision**: `@foblex/flow` (Foblex Flow), wrapped in our own `canvas/` feature
  components so the rest of the app never imports it directly.
- **Rationale**: It is the only mature Angular-native flow-editor library (MIT,
  standalone-component support, SSR-safe). Verified against current docs (Context7,
  `/foblex/f-flow`): external-palette drag-in via the `fExternalItem` directive,
  connector-to-connector directed connections with create/reassign events, pan/zoom
  (`fZoom`, pinch support), selection/drag events (`fDraggable`, `fMoveNodes`),
  fit-to-view, and canvas background patterns. Critically, **the library does not own
  graph state** — the app owns nodes/edges/validation — which is exactly what we need
  for missions auto-checking, snapshot-based undo/redo, and autosave from a single
  Signal store. Caveats absorbed into our wrapper: no React-Flow-style `[nodes]`/
  `addEdge()` API; edges are output-connector → input-connector, so each node template
  defines its handles; we must handle `fCreateConnection` events and update state
  ourselves (this is where self-loop/duplicate-edge rejection lives, satisfying
  FR-005).
- **Alternatives considered**:
  - *React Flow (xyflow)* — suggested in the original feature notes; rejected: React
    renderer, prohibited by Constitution Principle III.
  - *ngx-graph (Swimlane)* — visualization-oriented (auto-layout DAG rendering), weak
    interactive-editing story (no palette drag, no connection dragging); rejected.
  - *JointJS / Rete.js / Drawflow* — framework-agnostic DOM libraries; integration via
    manual DOM bridging loses Angular change detection and adds licensing cost
    (JointJS+); rejected.
  - *Custom SVG + Angular CDK drag-drop* — full control but re-implements connection
    dragging, zoom/pan math, and hit-testing; weeks of effort for table-stakes
    features; kept as fallback only if Foblex Flow hits a blocking limitation.

## R2. Frontend State Management & Undo/Redo

- **Decision**: Plain Angular Signals in a `PlaygroundStore` (an injectable service per
  playground instance): `nodes`, `edges`, `notes` signals plus computed signals for
  mission satisfaction and palette filtering. Undo/redo via a bounded snapshot history
  (immutable graph snapshots pushed on each committed mutation, ~100 entries; node
  *moves* coalesced on drag-end so dragging isn't 60 snapshots).
- **Rationale**: Single-user, single-document state — NgRx ceremony (actions, reducers,
  effects) adds nothing. Immutable snapshots make undo/redo trivial and are cheap at
  the 50-node scale (SC-002). Computed signals give the < 100 ms mission re-check for
  free on every graph mutation (FR-015, FR-008).
- **Alternatives considered**: *NgRx Store + undo-redo meta-reducer* (overkill,
  violates constitution simplicity bias); *command-pattern inverse operations* (less
  memory but more code and more bug surface than snapshots; unnecessary at this scale).

## R3. Persistence

- **Decision**: SQLite via `better-sqlite3` for all user state (designs, attempts,
  progress, sandbox designs, revealed hints). Content (components, acts, levels) ships
  as JSON seed files in `backend/content/`, validated with `zod` at server start.
  Design autosave: frontend debounces graph changes (~2 s idle, plus flush on
  route-leave/`visibilitychange`) and `PUT`s the full design document.
- **Rationale**: Single user means zero concurrency pressure — `better-sqlite3`'s
  synchronous API keeps repository code trivial, survives crashes (satisfying FR-027 /
  SC-005 where localStorage-only would be lost across browsers), and needs no server
  setup. Content-as-JSON keeps authoring 70 levels a text-editing task with schema
  validation, no admin UI.
- **Alternatives considered**: *localStorage only* (no backend durability, breaks
  resume-across-browsers, and leaves scoring client-side); *lowdb/JSON files for user
  state* (no transactional safety mid-write); *PostgreSQL* (operational overhead
  unjustified for one user).

## R4. Scoring Engine (five dimensions, rule-based)

- **Decision**: Deterministic rule engine in `backend/src/services/scoring/`, one
  module per dimension, each returning `{score: 0–100, findings: Finding[]}`; total =
  weighted mean (Missions 30%, Flow 20%, Topology 20%, Efficiency 15%, Resilience
  15%), pass at total ≥ 90. Dimension logic over the design graph:
  - **Missions** — fraction of required missions satisfied (reusing the same
    `mission.service` the live checklist uses, guaranteeing SC-006 consistency).
  - **Flow** — graph reachability: every non-Client node reachable from a Client node;
    orphaned components and dead-end flows penalized with named findings.
  - **Topology** — level-declared structural rules (e.g., "cache sits between app and
    DB", "no Client directly to database"), expressed as reusable graph predicates in
    level JSON.
  - **Efficiency** — Σ component cost/hr vs. level budget; critical-path latency sum
    vs. non-functional target; overage scales the penalty and is echoed in feedback
    with actual figures (FR-019).
  - **Resilience** — redundancy checks (single points of failure on the critical
    path, presence of LB before replicated tiers, DLQ on queues where required).
- **Rationale**: Deterministic scoring is testable (pure functions over a graph),
  instant (< 200 ms, well inside the 5 s budget), free, and explainable — findings map
  1:1 to per-dimension feedback strings. The response contract (scores + findings) is
  designed so an LLM-narrative layer can be added later without any API change
  (spec assumption honored).
- **Alternatives considered**: *LLM scoring at launch* (non-deterministic pass/fail on
  a ≥ 90 gate frustrates learners, adds latency/cost/keys; deferred to a later
  enhancement); *frontend-only scoring* (duplicates mission logic and leaves progress
  writable from devtools — harmless single-user but makes attempts/best-score records
  meaningless).

## R5. Drag-and-Drop from Palette

- **Decision**: Foblex Flow's `fExternalItem` directive on palette entries, carrying
  `{componentId}` as drag data; drop handler materializes a node at the drop position.
  Sticky notes use the same mechanism with a `note` pseudo-component.
- **Rationale**: Purpose-built for this exact pattern (verified in current docs);
  avoids bridging Angular CDK's DragDrop into Foblex's canvas coordinate space
  manually.
- **Alternatives considered**: *Angular CDK DragDrop into canvas* — requires manual
  screen→canvas coordinate transform under zoom/pan; redundant.

## R6. Auto-Arrange ("tidy")

- **Decision**: `@dagrejs/dagre` layered layout run on demand (tidy button): compute
  positions from the directed graph, write them back into the node signals as one
  undoable mutation.
- **Rationale**: Dagre is the standard lightweight layered-DAG layout, framework-
  agnostic pure function — fits app-owned state perfectly and is undoable like any
  other mutation (US2 scenario 6).
- **Alternatives considered**: *elkjs* (better layouts, ~10× bundle size and async
  worker setup — revisit only if dagre output disappoints); *hand-rolled grid snap*
  (ignores edge structure, poor readability).

## R7. Theming (light default + dark toggle)

- **Decision**: CSS custom properties as design tokens in `src/styles/`, switched by a
  `data-theme` attribute on `<html>`; preference persisted to localStorage and applied
  before first paint. Canvas node/edge colors consume the same tokens.
- **Rationale**: Zero-dependency, instant switching, and Foblex Flow templates are
  plain Angular components so tokens flow through naturally. Theme is a pure client
  preference — no API round-trip needed (FR-031).
- **Alternatives considered**: *Angular Material theming* (would pull in a whole
  component system we don't otherwise need; shared UI is custom per the visual notes).

## R8. Testing & Tooling

- **Decision**: Vitest as the unit runner on both tiers — Angular CLI's Vitest builder
  for frontend (Karma is deprecated), Vitest + supertest against the Express app for
  backend. Scoring rules and mission checks get table-driven pure-function tests
  (SC-006). ESLint (angular-eslint + typescript-eslint) and Prettier repo-wide, per
  the constitution's lint gate. Interactive components each get a render + primary-
  action smoke test.
- **Alternatives considered**: *Karma/Jasmine* (deprecated); *Jest* (second config
  ecosystem when Vitest covers both tiers uniformly).

## R9. Frontend/Backend Integration in Dev & Deploy

- **Decision**: Dev — Angular dev server proxies `/api` to Express (standard
  `proxy.conf.json`); two `npm start` processes. Deploy — Angular production build is
  served statically by the same Express instance (SPA fallback to `index.html`),
  giving a single personal-server process.
- **Rationale**: Simplest thing that works for one user; no CORS in production, no
  reverse proxy required.
- **Alternatives considered**: *separate static host + API host* (two deployables for
  a personal site — unnecessary).
