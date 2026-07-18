# Tasks: Interactive System Design Playground

**Input**: Design documents from `/specs/001-system-design-playground/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included where the constitution or spec demands them — table-driven tests for
scoring/mission rules (SC-006), API contract tests, and a render+primary-action smoke
test for every interactive component (constitution, Development Workflow). No
full TDD ceremony beyond that.

**Organization**: Tasks are grouped by user story so each story is an independently
testable increment.

## Guidance for the implementing agent (read first)

- Before any task, read `specs/001-system-design-playground/plan.md`,
  `research.md`, `data-model.md`, and `contracts/api.md`. They contain the exact
  entity shapes, API responses, and scoring weights — do not invent alternatives.
- Constitution (`.specify/memory/constitution.md`) is binding: Angular + TypeScript
  frontend, Node.js + **Express** backend only. No React, no NestJS/Fastify.
- Canvas library is `@foblex/flow`. Key caveats (from research.md R1): the app owns
  all graph state; connections are connector-to-connector (each node template declares
  `fNodeOutput`/`fNodeInput` handles); handle `fCreateConnection` /
  `fMoveNodes` events yourself and update the Signal store; use `sourceId`/`targetId`
  event properties; palette drag-in uses the `fExternalItem` directive. Do NOT assume
  React-Flow-style `[nodes]`/`addEdge()` APIs — check the Foblex docs when unsure.
- All numeric/product constants live in the design docs: pass threshold **90**,
  dimension weights **Missions 30 / Flow 20 / Topology 20 / Efficiency 15 /
  Resilience 15**, autosave debounce ~**2 s**, undo history **100** snapshots,
  feedback latency **< 100 ms**, RUN response **< 5 s**.
- Every canvas interaction must give visible feedback; keep components `OnPush` and
  use `@for (…; track …)` in templates — 60 fps at 50 nodes is a hard requirement.
- After each phase checkpoint, run the matching scenario from `quickstart.md` (V1–V6).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

Web app per plan.md: `backend/` (Express + TypeScript) and `frontend/` (Angular 20
workspace) at the repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Two runnable skeleton projects with lint, formatting, proxy, and design tokens

- [X] T001 Create repository skeleton: root `package.json` (private, npm scripts `dev:backend`, `dev:frontend`, `test`, `lint` that delegate into the two projects), root `.gitignore` (node_modules, dist, `backend/data/`), and root `README.md` stub pointing at `specs/001-system-design-playground/quickstart.md`
- [X] T002 Scaffold Angular app in `frontend/` with Angular CLI v20 (`ng new` — standalone components, SCSS, routing, skip tests boilerplate); strip placeholder content from `frontend/src/app/app.html`; set app title "System Design Playground"; install `@foblex/flow`, `@dagrejs/dagre`, `@angular/cdk`
- [X] T003 Scaffold Express backend in `backend/`: `package.json` (ESM), `tsconfig.json` (strict, NodeNext), deps `express@5`, `better-sqlite3`, `zod`; devDeps `tsx`, `vitest`, `supertest`, `@types/express`, `@types/better-sqlite3`, `@types/supertest`; scripts `dev` (`tsx watch src/server.ts`), `test` (`vitest run`), `build` (`tsc`), `start:prod`
- [X] T004 [P] Configure linting/formatting in `frontend/`: `angular-eslint` + `typescript-eslint` flat config in `frontend/eslint.config.js`, Prettier config shared at repo root `.prettierrc`
- [X] T005 [P] Configure linting in `backend/`: `typescript-eslint` flat config in `backend/eslint.config.js`, reuse root `.prettierrc`
- [X] T006 [P] Create `frontend/proxy.conf.json` proxying `/api` → `http://localhost:3000` and wire it into the `serve` target of `frontend/angular.json`
- [X] T007 [P] Create design-token stylesheets in `frontend/src/styles/`: `_tokens.scss` defining CSS custom properties for both themes on `:root[data-theme='light']` / `:root[data-theme='dark']` (indigo/violet primary, green RUN action, amber NEEDED badge, pastel category colors for the 7 component categories, difficulty colors easy-green → legendary-purple, surface/border/text scales), plus `styles.scss` with resets, typography, rounded-card and soft-shadow utility classes per spec §Visual Notes

**Checkpoint**: `npm run dev:backend` and `npm run dev:frontend` both start (blank app, no API yet); lint passes in both projects

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, seeded content, database, Express app skeleton, Angular shell — everything every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Define all shared types + zod schemas in `backend/src/models/index.ts` exactly per data-model.md: `Component`, `Act`, `Level` (with `specs` block incl. `budgetPerHr`, `latencyTargetMs`), `Mission` (discriminated union `add`/`connect` with optional `bonus`), `TopologyRule` (`forbidden-edge`, `required-between`), `ResilienceRule` (`no-spof`, `requires-companion`), `Design`/`DesignNode`/`DesignEdge`/`StickyNote`, `Attempt`/`DimensionFeedback`, `Progress`; export zod schemas for every content type and for the design-upsert request body
- [X] T009 [P] Author `backend/content/components.json`: the full 42-component catalog from spec §FR-009 — User(1): Client; Networking(7): DNS, CDN, Load Balancer, API Gateway, Rate Limiter, Reverse Proxy (Nginx), Prompt Router; Compute(9): Web Server, WebSocket Server, Worker, Stream Processor, Task Scheduler, Embedding Service, LLM Inference, Chunking Service, Reranker; Storage(9): SQL Database (PostgreSQL), NoSQL Database (Cassandra), Blob Storage (S3), Search Index (Elasticsearch), Time-Series DB (InfluxDB), Graph Database (Neo4j), Data Warehouse (Snowflake), Vector Database (Pinecone), Context Store; Caching(2): Cache (Redis), Bloom Filter; Messaging(3): Message Queue (Kafka/SQS), Pub/Sub (SNS), Dead Letter Queue; Services(10): Notification Service, Payment Service (Stripe), ZooKeeper/etcd, Monitoring & Alerting, Service Registry (Consul), Circuit Breaker, Log Aggregator (ELK), Guardrail Service, LLM Observability, Model Registry — each with kebab-case `id`, `tech` label, 1–2 sentence `description`, plausible `costPerHr` (Client = 0) and `latencyMs` (Client = 0), and an `icon` key
- [X] T010 [P] Author `backend/content/acts.json` (Act 1 "The Fundamentals", Act 2 "Async & Real-Time") and the first 3 level files in `backend/content/levels/` (`level-1.json` "The Static App", `level-2.json` "The 3-Tier Web App", `level-3.json` "URL Shortener"): each per the `Level` schema with narrative (markdown, 2–3 paragraphs of story), objectives chips, full `specs` block (functional/nonFunctional/constraints lists, `budgetPerHr`, `latencyTargetMs`, capacity, tradeoff, optional bonus), 5–8 missions (`add` + `connect`, ≥1 bonus like "Add Monitoring"), 1–3 `topologyRules`, 1–2 `resilienceRules`, `recommendedComponentIds`, and 3 ordered `hints`; global `order` 1–3
- [X] T011 [P] Author the remaining 9 seed levels in `backend/content/levels/` completing Act 1 (`level-4` Rate Limiter, `level-5` Key-Value Store, `level-6` Notification System, `level-7` Unique ID Generator) and Act 2 (`level-8` Chat System, `level-9` News Feed, `level-10` Search Autocomplete, `level-11` Web Crawler, `level-12` YouTube-style Video Platform) with the same completeness bar as T010; difficulties ramp easy → medium → hard
- [X] T012 Implement `backend/src/services/content.service.ts`: load + zod-validate all JSON seeds at startup (fail fast with a clear message naming the bad file/field), verify level `order` values are unique and contiguous from 1 and all `recommendedComponentIds`/mission component ids exist in the catalog; expose `getComponents()`, `getActs()`, `getLevels()`, `getLevelById()`, `getLevelByOrder()`
- [X] T013 Implement SQLite layer in `backend/src/db/`: `database.ts` (open `backend/data/app.db`, `mkdir -p`, WAL mode, idempotent schema creation for tables `designs` (id, level_id UNIQUE nullable, name, document JSON, updated_at), `attempts` (id, level_id, payload JSON, created_at), `progress` (singleton row: unlocked_through_order, last_touched_level_id, completed_level_ids JSON)); repositories `design.repo.ts`, `attempt.repo.ts`, `progress.repo.ts` with typed CRUD used by later routes; support `DB_PATH=:memory:` env override for tests
- [X] T014 Implement Express skeleton in `backend/src/app.ts` + `backend/src/server.ts`: JSON body middleware, `/api/v1` router, error envelope `{error:{code,message}}` per contracts/api.md (400/404/423/500), central error handler, request logging; first route `GET /api/v1/components` returning the catalog; `app.ts` exports the app (no `listen`) so supertest can import it
- [X] T015 [P] Create frontend API layer in `frontend/src/app/core/`: `models.ts` mirroring the shared types, `api/` services (`content.api.ts`, `levels.api.ts`, `progress.api.ts`, `sandbox.api.ts`) — thin typed `HttpClient` wrappers matching every endpoint in contracts/api.md, with an HTTP error interceptor mapping the error envelope to a user-visible toast service in `core/toast.service.ts`
- [X] T016 [P] Create app shell in `frontend/src/app/`: `app.routes.ts` with lazy standalone routes `/` (home), `/lab` (map), `/playground/:levelId`, `/sandbox`, `/sandbox/:designId`; top nav layout (app name, nav links, theme toggle); `core/theme.service.ts` persisting `data-theme` to localStorage plus a pre-paint inline script in `frontend/src/index.html` to avoid theme flash (FR-031)
- [X] T017 [P] Build shared UI in `frontend/src/app/shared/`: `difficulty-badge` (color-coded per tier), `progress-bar`, `stat-card`, `confirm-dialog` (CDK overlay), and `icon.registry.ts` + `app-icon` component with inline SVGs for the 7 category icons and UI glyphs (lock, play, undo, redo, zoom, fit, lock-canvas, tidy, fullscreen, trash, note)
- [X] T018 Backend test harness: `backend/vitest.config.ts`, `backend/tests/helpers.ts` (build app with in-memory DB), and `backend/tests/api/components.test.ts` asserting `GET /api/v1/components` → 200 with 42 items and valid schema; also assert content validation passes for every seed file

**Checkpoint**: backend serves the catalog; frontend shell renders with working theme toggle; `npm test` green in backend

---

## Phase 3: User Story 1 - Solve a Design Challenge in the Playground (Priority: P1) 🎯 MVP

**Goal**: Open `/playground/level-1`, read the brief, drag + connect components, watch
missions auto-check live, press RUN, get 5-dimension scores + feedback, pass ≥ 90 →
level complete.

**Independent Test**: quickstart.md scenario V1 on a fresh DB (navigate directly to
`/playground/level-1`; the map page does not exist yet).

### Backend — evaluation engine

- [X] T019 [US1] Implement `backend/src/services/mission.service.ts`: `evaluateMissions(missions, design) → {missionId, satisfied}[]` — `add` satisfied iff ≥ 1 node with that `componentId`; `connect` satisfied iff ≥ 1 edge whose source node's componentId = `fromComponentId` and target's = `toComponentId` (match by component type, never `displayName` — FR-016); pure function, no I/O
- [X] T020 [P] [US1] Implement `backend/src/services/scoring/missions.rule.ts` (score = 100 × satisfied-required/total-required, bonus missions add up to +10 capped at 100, findings per mission) and `backend/src/services/scoring/flow.rule.ts` (BFS from all Client nodes; penalize unreachable non-Client nodes and nodes with no path back into the flow; findings name each orphaned component)
- [X] T021 [P] [US1] Implement `backend/src/services/scoring/topology.rule.ts`: interpret the level's declarative rules — `forbidden-edge` (deduct + finding when an edge matches the component pair) and `required-between` (deduct + finding when a from→to path exists that does not pass through `viaComponentId`); start each design at 100 and subtract per violation
- [X] T022 [P] [US1] Implement `backend/src/services/scoring/efficiency.rule.ts`: total cost = Σ `costPerHr` over nodes vs `specs.budgetPerHr` (proportional penalty, finding states both figures, e.g. "Total cost $4.20/hr is within the $6.00/hr budget"); critical-path latency = max path latency sum from Client to any sink vs `specs.latencyTargetMs` when set (finding states both figures) — FR-019 edge cases from spec §Edge Cases
- [X] T023 [P] [US1] Implement `backend/src/services/scoring/resilience.rule.ts`: `no-spof` (require ≥ 2 nodes of the named componentId, else finding) and `requires-companion` (if any node of componentId exists, a companion node must exist and be connected to it); plus a generic single-point-of-failure finding when every Client path funnels through exactly one node of a non-Client type
- [X] T024 [US1] Implement `backend/src/services/scoring/index.ts`: run all five rules, weighted total (missions .30, flow .20, topology .20, efficiency .15, resilience .15) rounded to 1 decimal, `passed = total >= 90`, assemble `DimensionFeedback[]` with per-finding `{ok, message}`; must be pure and complete in < 200 ms for a 50-node design
- [X] T025 [US1] Table-driven tests in `backend/tests/scoring/` (one file per rule + `total.test.ts`): for each rule ≥ 5 cases incl. empty canvas (low score, no crash), perfect level-1 solution scoring ≥ 90 total, budget-overage figures echoed in findings, orphaned-node findings, SPOF detection; fixtures built against the real seeded `level-1.json`
- [X] T026 [US1] Implement `backend/src/services/progress.service.ts`: read/init the singleton progress row (`unlockedThroughOrder` starts at 1), `isUnlocked(level)`, `recordAttempt(level, attempt)` — on pass, add to `completedLevelIds` and advance `unlockedThroughOrder` to `max(current, order+1)` atomically (completion is monotonic per data-model.md), `touch(levelId)` for the resume pointer
- [X] T027 [US1] Implement level + design routes in `backend/src/routes/levels.route.ts`: `GET /api/v1/levels/:levelId` (full level + saved design or null; 423 with blocking-level info when locked; 404 unknown) and `PUT /api/v1/levels/:levelId/design` (zod-validate body; enforce invariants — no self-loop, no duplicate (source,target) pair, edge endpoints exist, componentIds known → 400 with specific message; upsert via design.repo; update `lastTouchedLevelId`; return `{updatedAt}`)
- [X] T028 [US1] Implement attempts routes in `backend/src/routes/attempts.route.ts`: `POST /api/v1/levels/:levelId/attempts` (load saved design — empty design evaluates fine; run scoring; persist attempt with design snapshot; on pass record completion/unlock; response exactly per contracts/api.md incl. optional `unlockedLevelId`) and `GET /api/v1/levels/:levelId/attempts` (`{attempts, best}`)
- [X] T029 [US1] API contract tests in `backend/tests/api/levels.test.ts` and `backend/tests/api/attempts.test.ts`: locked level → 423; design upsert invariants → 400 with message; empty-canvas attempt → 200 low score; passing attempt (post the known level-1 solution design) → `passed: true`, `unlockedLevelId: 'level-2'`, best score reflects max

### Frontend — playground

- [X] T030 [US1] Implement the playground Signal store in `frontend/src/app/features/playground/state/playground.store.ts`: signals `nodes`, `edges`, `stickyNotes`, `selection`, `level`; actions `addNodeFromPalette(componentId, position)` (uuid, displayName = component name), `connect(sourceNodeId, targetNodeId)` (reject self-loop + duplicate → set a `rejectionFeedback` signal for the UI, FR-005), `moveNodes`, `deleteSelection`; computed `missionStates` re-implementing exactly the T019 semantics client-side (single spec source: data-model.md §Mission) and `missionProgress` ("3/6" counting non-bonus); unit tests in `playground.store.spec.ts` covering add/connect/delete/mission auto-check/uncheck (US1 scenario 6)
- [X] T031 [US1] Build the canvas in `frontend/src/app/features/playground/canvas/canvas.component.ts` using Foblex Flow: `<f-flow fDraggable>` + `<f-canvas fZoom>`; render nodes from the store via `@for(track node.id)` with a custom node template `design-node.component.ts` (category-colored card, category icon, displayName, tech label, one `fNodeOutput` + one `fNodeInput` connector); render edges via `f-connection` from store edges; handle `fCreateConnection` (use `sourceId`/`targetId` event props) → `store.connect`, `fMoveNodes` → position updates, drop of external palette items → `store.addNodeFromPalette` at drop position; Delete/Backspace deletes selection; subtle dot-grid canvas background from theme tokens
- [X] T032 [US1] Build the palette (basic) in `frontend/src/app/features/playground/palette/palette.component.ts`: "Recommended" section listing `level.recommendedComponentIds` with amber NEEDED badges, followed by all components grouped under the 7 category headings; every entry draggable onto the canvas via `[fExternalItem]` carrying `{componentId}`; component card shows icon + name + tech label
- [X] T033 [US1] Build the context panel in `frontend/src/app/features/playground/context-panel/context-panel.component.ts`: "The Challenge" narrative (rendered markdown), collapsible spec sections (Functional, Non-Functional, Constraints, Budget as "$X.XX/hr limit", Capacity, Key Trade-off, Bonus), live Mission checklist bound to `store.missionStates` (checkmark animation on satisfy, unchecks on delete, bonus rows star-marked, "n/m" counter), and Hints accordion revealing `level.hints` one at a time (all free), persisting `revealedHintCount` into the design document
- [X] T034 [US1] Assemble the playground page in `frontend/src/app/features/playground/playground.page.ts`: three-column layout (palette | canvas | context panel); top bar with "← Back to Lab", "Level {n}: {title}", difficulty badge, and the green RUN button; on route load fetch `GET /levels/:levelId` (423 → friendly locked screen with link back, 404 → not-found message per spec edge case), hydrate store from saved design; RUN → `PUT` the current design then `POST /attempts`, disable button with spinner while in flight
- [X] T035 [US1] Build the results dialog in `frontend/src/app/features/playground/results/results-dialog.component.ts`: total score dial, five per-dimension score bars, findings list per dimension with pass/fail icons and messages, pass state (≥ 90) shows celebration + "Next level →" CTA (navigates to `unlockedLevelId`), fail state shows "Revise & re-run" keeping canvas intact (US1 scenario 5)
- [X] T036 [US1] Smoke tests in the playground feature (`*.spec.ts` colocated): canvas renders nodes/edges from a seeded store and a palette drop adds a node; palette renders 7 groups and search-less basic list; context panel checks a mission off when the store satisfies it; results dialog renders scores + findings from a fixture attempt

**Checkpoint**: quickstart V1 passes end-to-end on `/playground/level-1` — this is the MVP

---

## Phase 4: User Story 2 - Full Canvas Editing & Palette Ergonomics (Priority: P2)

**Goal**: Undo/redo, rename, notes, sticky notes, canvas control bar, tidy, fullscreen,
palette search + recommended toggle + metadata cards, invalid-connection feedback.

**Independent Test**: quickstart.md scenario V2 on any level.

- [X] T037 [US2] Add snapshot history to `frontend/src/app/features/playground/state/playground.store.ts`: immutable `{nodes, edges, stickyNotes}` snapshots pushed on every committed mutation, bounded to 100; coalesce node moves so a drag commits one snapshot on drag-end; `undo()`, `redo()`, `canUndo`/`canRedo` computed (drive disabled toolbar states — spec edge case), `resetCanvas()` clears after confirm-dialog and is itself undoable; extend `playground.store.spec.ts` with a 5-edits → undo×5 → redo×2 exactness test (US2 scenario 4)
- [X] T038 [P] [US2] Upgrade the palette in `frontend/src/app/features/playground/palette/palette.component.ts`: search box filtering by name/tech/category as-you-type; toggle "Recommended" ↔ "Show all components (42)"; metadata card on hover/click (CDK overlay: description, cost "$X.XX/hr", latency "Xms") per FR-011; "Drag to add notes" sticky-note palette item (`fExternalItem` with a `note` marker)
- [X] T039 [US2] Node editing in `frontend/src/app/features/playground/canvas/design-node.component.ts`: double-click label → inline rename input (Enter commits, Esc cancels; store keeps `componentId` unchanged — FR-016); hover note affordance opening a small popover editor writing `node.note`; sticky-note canvas element `sticky-note.component.ts` (editable text, movable, deletable, amber paper styling)
- [X] T040 [US2] Canvas control bar + toolbar in `frontend/src/app/features/playground/canvas/canvas-controls.component.ts`: bottom bar — zoom in/out (canvas API), fit-to-view, lock toggle (disables all mutations, visual lock state), fullscreen (Fullscreen API on the playground element); top toolbar — undo/redo (disabled via `canUndo`/`canRedo`), delete-selection, reset (with confirm); all buttons from the shared icon set with tooltips
- [X] T041 [US2] Tidy/auto-arrange in `frontend/src/app/features/playground/canvas/tidy.ts`: build a dagre graph (`@dagrejs/dagre`, rankdir LR, sensible node dimensions/margins) from store nodes/edges, apply computed positions as ONE undoable store mutation (US2 scenario 6: connections unchanged)
- [X] T042 [US2] Rejection + feedback UX: `rejectionFeedback` signal renders a toast ("Self-connections aren't allowed", "These nodes are already connected") and a brief shake animation on the offending node; extend smoke tests to cover search filtering, recommended toggle, metadata card, rename keeps missions satisfied, tidy preserves edge count, and lock blocks edits

**Checkpoint**: quickstart V2 passes; playground feels like a real editor

---

## Phase 5: User Story 3 - Challenge Map with Acts & Sequential Unlocking (Priority: P3)

**Goal**: `/lab` map — Acts with progress, rich level cards, lock states, search;
completing a level unlocks the next.

**Independent Test**: quickstart.md scenario V3 on a fresh DB.

- [X] T043 [US3] Implement `GET /api/v1/map` in `backend/src/routes/map.route.ts` composing acts → level cards with `status: locked|unlocked|completed` (from progress.service), per-act `completedCount`/`levelCount`, and lab `totals` exactly per contracts/api.md; API tests in `backend/tests/api/map.test.ts`: fresh DB → only level-1 unlocked; after a passing level-1 attempt → level-2 unlocked and act count "1/7"
- [X] T044 [US3] Build the map page in `frontend/src/app/features/lab-map/lab-map.page.ts`: header with lab title + overall progress bar ("n/12 completed", unlocked count); one section per Act (title, description, act progress "n/m") containing level cards
- [X] T045 [P] [US3] Build the level card in `frontend/src/app/features/lab-map/level-card.component.ts`: level number, title, difficulty badge (shared component), summary, objective chips, mission count; states — locked (lock icon, dimmed, non-clickable, click shows a "Complete level {n-1} to unlock" toast), unlocked (Enter →  `/playground/:levelId`), completed (checkmark + best score when available)
- [X] T046 [US3] Add search/filter to the map page: text input filtering level cards by title/summary/objective keywords plus difficulty chips (Easy…Legendary) as toggles; empty-state message when nothing matches; smoke tests — locked card does not navigate, filter narrows the grid, act progress renders from a fixture map response

**Checkpoint**: quickstart V3 passes; progression loop is closed (map → play → unlock → map)

---

## Phase 6: User Story 4 - Progress Persistence & Resume (Priority: P4)

**Goal**: Continuous autosave, home view with Continue / Recommended-next / lab
progress, best scores; work survives browser restarts.

**Independent Test**: quickstart.md scenario V4.

- [X] T047 [US4] Implement autosave in `frontend/src/app/features/playground/state/autosave.ts`: effect on store graph signals debounced ~2 s → `PUT /levels/:levelId/design`; immediate flush on route deactivation and `visibilitychange: hidden`; tiny "Saved ✓ / Saving…" indicator in the playground top bar; RUN already flushes first (T034) — verify ordering; store unit test for debounce + flush behavior
- [X] T048 [US4] Implement `GET /api/v1/progress` in `backend/src/routes/progress.route.ts` per contracts/api.md (`lab` percent, `continue` from `lastTouchedLevelId` + design `updatedAt`, `recommendedNext` = first unlocked uncompleted level by order, nulls when N/A); API tests in `backend/tests/api/progress.test.ts` covering fresh DB, after-touch, and all-complete cases
- [X] T049 [US4] Build the home page in `frontend/src/app/features/home/home.page.ts`: welcome header, Architecture Lab progress card (progress bar + "Enter Lab" → `/lab`), "Continue where you left off" card (level title + relative time, one click → `/playground/:levelId` — FR-029/SC-001 3-click rule), "Recommended next" card, link card to Sandbox; hide continue/recommended gracefully when null; smoke test with fixture progress response
- [X] T050 [P] [US4] Surface best scores: map level cards show best total for completed/attempted levels (extend `GET /api/v1/map` card payload with `best` in `backend/src/routes/map.route.ts` + test), and the results dialog shows "Best: n" alongside the new total (from `GET /levels/:levelId/attempts`)

**Checkpoint**: quickstart V4 passes — close the browser mid-design, reopen, one-click resume with exact state

---

## Phase 7: User Story 5 - Free-Form Sandbox (Priority: P5)

**Goal**: Unbounded canvas with the full palette, no missions/scoring; designs saved,
listed, renamable, deletable.

**Independent Test**: quickstart.md scenario V5.

- [X] T051 [US5] Implement sandbox CRUD in `backend/src/routes/sandbox.route.ts` per contracts/api.md: list (`id`, `name`, `updatedAt`, `nodeCount`), create (name → 201 empty Design), get, update (content and/or rename, same graph invariants as level designs), delete → 204; designs are `designs` rows with `level_id NULL`; API tests in `backend/tests/api/sandbox.test.ts` incl. rename and 404s
- [X] T052 [US5] Build sandbox UI in `frontend/src/app/features/sandbox/`: `sandbox-list.page.ts` (design cards with name/updated/node count, create dialog, rename inline, delete with confirm) and `sandbox.page.ts` at `/sandbox/:designId` reusing the palette + canvas + history + autosave from the playground feature with `level = null` — full catalog always shown, no context panel, no RUN/missions UI (FR-030); smoke test asserting no mission/RUN elements render in sandbox mode

**Checkpoint**: quickstart V5 passes — all five user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Theme completeness, responsiveness, production serving, performance, docs

- [X] T053 [P] Dark-mode completeness pass: audit every surface (home, map, playground incl. canvas nodes/edges/grid/sticky notes, dialogs, toasts) renders correctly under `data-theme='dark'`; fix any hard-coded colors to tokens from `frontend/src/styles/_tokens.scss`
- [X] T054 [P] Responsive pass for ≥ 768 px viewports: map grid reflows, playground panels become collapsible drawers on tablet widths, controls stay reachable; graceful phone degradation (no horizontal-scroll breakage) per constitution Principle V
- [X] T055 Production serving: in `backend/src/app.ts` serve `frontend/dist/**` statically with SPA fallback to `index.html` for non-`/api` routes when `NODE_ENV=production`; add root scripts `build` (frontend build + backend tsc) and `start:prod`; verify quickstart "Production smoke" section works on :3000
- [X] T056 Performance validation per SC-002/SC-003: sandbox with ~50 nodes — verify ≈60 fps pan/zoom/drag (DevTools FPS meter), < 100 ms drop/connect feedback, RUN round-trip < 5 s; fix findings (OnPush everywhere, `track` functions, avoid re-render storms on drag by keeping positions in Foblex during drag and committing on drag-end)
- [X] T057 Run all quickstart.md scenarios V1–V6 end-to-end on a fresh database; fix every discrepancy found and re-run until clean; confirm all backend + frontend tests and lint pass (`npm run lint && npm test` in both projects)
- [X] T058 [P] Write root `README.md`: what the project is, prerequisites, dev setup (two terminals), test/lint commands, production build/run, content-authoring guide (how to add a level JSON: schema fields, mission kinds, rule kinds, ordering)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational. Backend engine tasks (T019–T025) and frontend store (T030) can start in parallel
- **US2 (Phase 4)**: depends on US1 (extends its store/palette/canvas files)
- **US3 (Phase 5)**: depends on Foundational + progress.service (T026); UI independent of US2
- **US4 (Phase 6)**: depends on US1 (design PUT, attempts) and benefits from US3 (map best-scores in T050)
- **US5 (Phase 7)**: depends on US1 canvas/palette + US2 history/autosave reuse (T037, T047)
- **Polish (Phase 8)**: depends on all desired stories

### Key task-level dependencies

- T019 (mission semantics) blocks T020 and is the twin spec for T030's client-side `missionStates`
- T024 needs T020–T023; T028 needs T024 + T026 + T027
- T031/T032/T033 need T030; T034 needs T031–T033; T035 needs T034
- T041 (tidy) and T047 (autosave) both mutate through the T037 history — do T037 first
- T050 extends T043's map payload

### Parallel Opportunities

```text
Phase 1: T004, T005, T006, T007 together after T001–T003
Phase 2: T009, T010, T011 (content authoring) ∥ T015, T016, T017 (frontend shell) after T008
Phase 3: backend track (T019 → T020–T023 in parallel → T024 → T025) ∥ frontend track (T030 → T031/T032/T033 in parallel)
Phase 4: T038 ∥ T037; then T039–T042
Phase 8: T053, T054, T058 in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phases 1–2 (Setup + Foundational)
2. Phase 3 (US1) — **stop and validate quickstart V1** on `/playground/level-1`
3. This alone is a demoable product: the full design-build-score loop

### Incremental Delivery

Each subsequent phase ends at a quickstart scenario gate (V2 → V5). Ship/validate after
each. Suggested order matches phases: editor ergonomics (US2) before the map (US3)
because playground feel is the product's core bet; swap 4↔5 if you want the
progression loop earlier.

### Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Commit after each task or logical group; stop at any checkpoint to validate
- The mission-check semantics live in exactly two places (T019 backend, T030 frontend)
  by design — any change must update both + both test suites (SC-006)

---

## Phase 9: Playground UI Fixes & Polish (post-launch)

**Context**: Follow-up issues found while using the shipped playground (with reference
screenshots of a target UI). Scope is deliberately tight — fix the three concrete
defects first; treat the reference visuals as a smoothness guide, not a spec to
re-implement wholesale. No backend/API contract changes.

**Reported issues**:
1. The component palette does not scroll on its own — the whole page scrolls instead.
2. Components placed on the canvas cannot be dragged/moved.
3. A live cost indicator (e.g. `$20.0 / $22.0 /hr`) should sit at the canvas top-left.

**Independent Test**: On a fresh DB open `/playground/level-5` with "Show all
components (42)" — the palette scrolls internally while the topbar/canvas stay fixed; a
placed node drags smoothly and stays put; the top-left cost pill updates live as
components are added/removed and turns amber/red when total cost exceeds the budget.

### Issue 1 — Palette scrolls independently, not the page

- [X] T059 [US2] Contain the palette height so only its list scrolls: in `frontend/src/app/features/playground/playground.page.scss` add `grid-template-rows: minmax(0, 1fr)` to `.pg-body`, and in `frontend/src/app/features/sandbox/sandbox.page.scss` add the same to `.sb-body` (the palette host + its `.groups` `overflow-y:auto` are already correct — the missing row track is what lets the column grow the page). Verify on `/playground/level-5` (Show all 42) and in a sandbox design: the palette scrolls internally; topbar, canvas, and context panel stay fixed; no page-level scrollbar appears.

### Issue 2 — Placed nodes are draggable

- [X] T060 [US2] Fix node dragging in `frontend/src/app/features/playground/canvas/canvas.component.html` (and `.ts` if needed): placed nodes don't move. Suspected cause — `[fNodePosition]="{ x: node.x, y: node.y }"` is a new object literal on every change detection (the autosave status signal re-runs CD periodically), which makes Foblex reset the node to the stored position and fight the drag. Confirm the correct `@foblex/flow` pattern first (use `find-docs`/context7 for `@foblex/flow` node dragging + `fNodePosition`), then apply it: memoize a stable per-node position object (keyed by node id, replaced only when x/y actually change) or otherwise stop rebinding a fresh literal each CD, keeping the drag-end commit via `fMoveNodes` → `store.moveNodes` intact. Keep `fDraggable` / `fNode` / `[fNodeDraggingDisabled]="locked()"` wiring. Verify: dragging a node follows the cursor and it stays where dropped, connections stay attached, undo/redo restores positions, and lock still disables movement.
- [X] T061 [US2] Add a drag regression guard in `frontend/src/app/features/playground/canvas/canvas.component.spec.ts`: call `onMoveNodes` with a moved node and assert the store commits the new x/y (one undo snapshot recorded), and that a subsequent change-detection pass does not revert the stored position — locking in the fix from T060.

### Issue 3 — Live cost indicator (canvas top-left)

- [X] T062 [P] [US1] Create `frontend/src/app/features/playground/canvas/cost-indicator.component.ts` (+ `.scss`): OnPush component injecting `PlaygroundStore`; a computed sums `costPerHr` over placed nodes (`store.component(node.componentId)?.costPerHr`) and reads the budget from `store.level()?.specs.budgetPerHr`. Render a pill `$X.X / $Y.Y /hr` (total / budget, 1 decimal) — green/success when total ≤ budget, amber→danger when over; when there is no level budget (sandbox), show just `$X.X /hr`. Colors/tokens only (dark-mode safe).
- [X] T063 [US1] Mount the indicator top-left of the canvas: add `<app-cost-indicator />` inside `.pg-canvas-area` in `frontend/src/app/features/playground/playground.page.html` and inside `.sb-canvas-area` in `frontend/src/app/features/sandbox/sandbox.page.html`, absolutely positioned top-left above the canvas (not overlapping the drawer toggles/controls). Verify the pill updates live as nodes are added/removed and reflects the level budget.
- [X] T064 [P] [US1] Smoke test `frontend/src/app/features/playground/canvas/cost-indicator.component.spec.ts`: seed the store with a level (budget) + a couple of costed nodes; assert the rendered total and budget figures and that the over-budget state class flips when node costs exceed the budget.

### Polish — smoothness pass (curated from reference; optional, keep scope tight)

- [X] T065 [P] Canvas interaction smoothness in `frontend/src/app/features/playground/canvas/canvas.component.scss` + `design-node.component.scss`: `cursor: grab`/`grabbing` on nodes, subtle hover elevation and connector hover affordance, no drag jank; purely cosmetic — do not change graph behavior.
- [X] T066 [P] Results dialog enrichment in `frontend/src/app/features/playground/results/results-dialog.component.*` (reference screenshots 2–3): add a letter grade beside the total (A ≥ 90, B ≥ 80, …) and a small stat-tile row derived client-side from the evaluated design/attempt — Nodes, Edges, and total Cost/hr (Latency/Uptime need a backend field and are out of scope unless added later); ensure the findings list scrolls within the dialog. No API change.
- [X] T067 [P] Optional canvas minimap: if `@foblex/flow` provides a minimap, render it bottom-right of the canvas (matching the reference) behind a small toggle; skip if it complicates the drag fix. Verify it doesn't intercept node drags.
- [X] T068 Verify Phase 9: dark-mode + ≥768px responsiveness of the cost indicator and any polish; run `npm run lint && npm test && npm run build` in `frontend/` green; manually re-check the Independent Test above on `/playground/level-5`.

### Phase 9 Dependencies & Parallel Opportunities

- T059, T060, T062 touch different files → can run in parallel. T061 needs T060; T063/T064 need T062.
- Fixes (T059–T064) before polish (T065–T067); T068 runs last.
- MVP for this phase = T059 + T060 + T062 + T063 (the three reported issues); tests and polish follow.
