# Tasks: AI Design Scoring (DeepSeek Reasoning Review)

**Input**: Design documents from `/specs/002-ai-design-scoring/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: INCLUDED — the plan's Testing section and the constitution's quality gates
(smoke test per interactive component; stubbed DeepSeek client, no live API in tests)
explicitly require them.

**Organization**: Tasks are grouped by user story (US1 request review, US2 persistence
& cache, US3 graceful degradation) so each story is independently implementable and
testable.

## Format: `[ID] [P?] [Story] Description (Model · effort)`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 — user story phases only
- Every task ends with its recommended executor: **(Sonnet 5 · low|medium|high)** or
  **(Opus 4.8 · medium|high)** — see the Model & Effort Assignment section below.

## Path Conventions (verified against the existing codebase)

- Backend schema: idempotent `initSchema()` in `backend/src/db/database.ts` — **no
  migrations folder**; repos follow the `*.repo.ts` class + `DbContext` pattern.
- Routes: `backend/src/routes/*.route.ts` factory functions over `AppDeps`
  (`backend/src/deps.ts`), mounted in `backend/src/routes/index.ts`.
- Typed HTTP errors: `backend/src/http/http-error.ts`.
- Backend tests: `backend/tests/api/*.test.ts` (supertest via `tests/helpers.ts`,
  `DB_PATH=:memory:`) and per-domain dirs like `backend/tests/scoring/` → new
  `backend/tests/ai/`.
- Frontend API clients: `frontend/src/app/core/api/*.api.ts` (NOT `*.service.ts`).
- Components: standalone, signals-based, `*.component.{ts,html,scss,spec.ts}`.

---

## Model & Effort Assignment

**Method**: Opus 4.8 takes the four tasks where design judgment drives quality and
mistakes are expensive to detect (prompt rubric, upstream client semantics, service
orchestration, cache correctness). Sonnet 5 takes everything with a precise written
contract to follow — routes, repos, UI states, and all tests — at effort proportional
to branching complexity.

| Executor | Tasks | Why |
|---|---|---|
| **Opus 4.8 · high** | T005, T006, T010 | Prompt rubric quality decides review quality; client owns timeout/abort/error semantics; service owns retry + in-flight + parse orchestration |
| **Opus 4.8 · medium** | T017 | Cache-key semantics (force/deep/model interplay) — subtle but narrow |
| **Sonnet 5 · high** | T011, T013, T015, T023 | Broad but fully specified: contract error table, 4-state UI panel, exhaustive test matrices |
| **Sonnet 5 · medium** | T002, T003, T004, T008, T009, T014, T016, T018, T019, T020, T021, T022, T025 | Well-defined single-concern implementation/tests |
| **Sonnet 5 · low** | T001, T007, T012, T024, T026 | Mechanical: config, thin client, lint, docs |

**Practical `/model` checkpoints** (minimizes switching, matches your per-phase flow):

1. `/model sonnet` (effort medium) → Phase 1 (T001–T003)
2. `/model opus` (effort high) → Phase 2 (T004–T009; T004/T007–T009 ride along fine)
3. Stay on `opus` for T010–T011, then `/model sonnet` → rest of Phase 3 (T012–T016)
4. `/model opus` (effort medium) for T017, then `/model sonnet` → T018–T020
5. `/model sonnet` → Phases 5–6 (T021–T026)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Config, types, and storage that every story needs

- [X] T001 [P] Create `backend/src/config/ai.config.ts`: typed `AiConfig` read once from
  env — `DEEPSEEK_API_KEY` (absence ⇒ `enabled: false`), `DEEPSEEK_MODEL` (default
  `deepseek-flash`), `DEEPSEEK_DEEP_MODEL` (default `deepseek-v4-pro`),
  `DEEPSEEK_BASE_URL` (default `https://api.deepseek.com`),
  `DEEPSEEK_REASONING_EFFORT` (`high`|`max`, default `high`), `DEEPSEEK_TIMEOUT_MS`
  (default `120000`). The key must never appear in logs, errors, or serialized output
  (FR-008). (Sonnet 5 · low)
- [X] T002 [P] Create `backend/src/models/ai-review.ts`: zod schemas + TS types per
  data-model.md — `AiReviewPayloadSchema` (int score 0–100; verdict; exactly 5
  dimensions from the fixed enum; ≥2 strengths; ≥2 gaps; `realWorldComparison`
  {referenceArchitecture, matches, differences}; ≥1 nextSteps), `AiReview` record,
  POST body schema `{ force?: boolean, deep?: boolean }`, and the error-code union
  from contracts/api.md. (Sonnet 5 · medium)
- [X] T003 Add `ai_reviews` table to `initSchema()` in `backend/src/db/database.ts`
  (DDL from data-model.md incl. `UNIQUE(level_id, design_hash, model)` and
  `idx_ai_reviews_level`); create `backend/src/db/ai-review.repo.ts` with
  `upsertReview`, `findByKey(levelId, designHash, model)`,
  `findLatestForHash(levelId, designHash)`, `hasAnyForLevel(levelId)`; register the
  repo in `DbContext`. Depends on T002. (Sonnet 5 · medium)

**Checkpoint**: `npm test` in backend still green; new table created in `:memory:` DBs.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The three pure building blocks (hash, prompt, client) every story calls

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create `backend/src/services/ai/design-hash.ts`: canonicalization per
  data-model.md — nodes → `{componentId, displayName}` sorted by node id (positions
  and notes excluded), edges → `"sourceNodeId->targetNodeId"` sorted lexically,
  `JSON.stringify({nodes, edges})` → sha256 hex. (Sonnet 5 · medium)
- [X] T005 [P] Create `backend/src/services/ai/review-prompt.ts`: byte-stable system
  message (principal-engineer role, five-dimension rubric, exact JSON schema text,
  real-world-comparison instruction, "single JSON object, no markdown" — NO
  timestamps or per-call values, FR-014/R9); user message ordered question → design
  (components with catalog name/tech/category/learner note, directed adjacency list,
  derived facts: node count + total cost/hr from existing scoring services); >200
  nodes ⇒ throw `DesignTooLargeError` before any token is spent. (Opus 4.8 · high)
- [X] T006 [P] Create `backend/src/services/ai/deepseek.client.ts`: `fetch` wrapper for
  `POST {baseUrl}/chat/completions` — bearer auth, `thinking: {type: "enabled"}`,
  `reasoning_effort`, `stream: false`, NO sampler params (R1); `AbortController`
  timeout plus caller-supplied `AbortSignal` (client cancel); map upstream results to
  typed errors: 401→`AiAuthFailedError`, 402→`AiOutOfCreditError`,
  429→`AiRateLimitedError`, 5xx/network→`AiUpstreamError`, abort→`AiTimeoutError`;
  return `{ content, reasoningDiscarded, usage: {promptTokens, completionTokens},
  latencyMs }`. Define a narrow `DeepSeekClient` interface so tests inject a stub.
  (Opus 4.8 · high)
- [X] T007 [P] Tests in `backend/tests/ai/design-hash.test.ts`: node/edge order
  independence, position & note exclusion, rename ⇒ new hash, edge change ⇒ new
  hash. Depends on T004. (Sonnet 5 · low)
- [X] T008 [P] Tests in `backend/tests/ai/review-prompt.test.ts`: system-prompt
  snapshot (byte-stability guard), question-precedes-design ordering, derived facts
  present, 201-node design throws. Depends on T005. (Sonnet 5 · medium)
- [X] T009 [P] Tests in `backend/tests/ai/deepseek-client.test.ts` with stubbed global
  fetch: happy path (content + usage mapping), each status→error mapping, timeout
  abort, external cancel. Depends on T006. (Sonnet 5 · medium)

**Checkpoint**: Foundation ready — hash/prompt/client each unit-tested in isolation.

---

## Phase 3: User Story 1 — Request an AI review of my level design (Priority: P1) 🎯 MVP

**Goal**: Click "AI Review" on a saved level design → within the latency budget render
score, 5 dimensions with commentary, strengths, gaps, real-world comparison, next
steps; deep-review toggle picks `deepseek-v4-pro`; progress state with elapsed time
and cancel.

**Independent Test**: On `/playground/level-2` with a saved design and
`DEEPSEEK_API_KEY` set, click "AI Review" → rendered review per SC-002. (No
persistence yet — every request calls upstream; that is US2.)

### Implementation for User Story 1

- [X] T010 [US1] Create `backend/src/services/ai/ai-review.service.ts`: orchestration —
  load saved design via `DesignRepo` (no nodes ⇒ `DesignEmptyError`, FR-013); build
  prompt (T005); select model (`deep: true` ⇒ `config.deepModel`); call client
  (T006); parse `message.content` (strip code fences → `JSON.parse` → zod from
  T002); on parse/validation failure exactly ONE repair retry echoing the error and
  demanding schema-conformant JSON (FR-011), second failure ⇒
  `AiMalformedOutputError`; per-level in-flight guard (in-memory Map) ⇒
  `AiReviewInFlightError` for concurrent requests (R4); return the assembled review
  (id, hash, model, payload, usage, latency). Persistence is deliberately NOT wired
  here — T017 (US2) adds it behind this same return path. (Opus 4.8 · high)
- [X] T011 [US1] Create `backend/src/routes/ai-review.route.ts` with
  `POST /levels/:levelId/ai-review`: reuse existing level/lock checks (404
  `level_not_found` / 423 `level_locked` as attempts.route.ts does); validate body
  with T002 schema; translate every typed error to the contract table in
  contracts/api.md (422 `design_empty`, 422 `design_too_large`, 409
  `ai_review_in_flight`, 503 `ai_not_configured`, 503 `ai_rate_limited`, 502
  `ai_auth_failed`/`ai_out_of_credit`/`ai_upstream_error`/`ai_malformed_output`,
  504 `ai_timeout`) via `backend/src/http/http-error.ts`; respond
  `{ review, cached: false }`. Extend `AppDeps` in `backend/src/deps.ts` (aiConfig,
  aiReviewService) and mount the router in `backend/src/routes/index.ts`.
  Depends on T010. (Sonnet 5 · high)
- [X] T012 [P] [US1] Create `frontend/src/app/core/api/ai-review.api.ts` (follow
  `levels.api.ts` style): `requestReview(levelId, {force?, deep?}, signal?)` POST
  with `AbortSignal` passthrough for cancellation; parse error bodies to
  `{ code, message }`. (Sonnet 5 · low)
- [X] T013 [US1] Create
  `frontend/src/app/features/playground/results/ai-review-panel.component.{ts,html,scss}`:
  standalone + signals; states idle → running (elapsed-seconds timer, Cancel button
  that aborts the request, FR-012) → review (overall score, verdict, 5 dimension
  rows with score+comment, strengths, gaps, real-world comparison block, next
  steps) → error (human message per error code, Retry where retryable); deep-review
  toggle ("Deep review — slower, stronger model") sent as `deep: true`; local
  empty-canvas guard blocks the request with guidance (FR-013 client side).
  Depends on T012. (Sonnet 5 · high)
- [X] T014 [US1] Wire the entry point in
  `frontend/src/app/features/playground/context-panel/context-panel.component.{ts,html,scss}`:
  "AI Review" button (disabled with hint when canvas is empty), flush design
  autosave before requesting (same rule as RUN), lazy-import the panel component so
  the main bundle is unchanged (Principle V). Depends on T013. (Sonnet 5 · medium)
- [X] T015 [P] [US1] Backend tests in `backend/tests/api/ai-review.test.ts` (supertest
  via `tests/helpers.ts`, stubbed `DeepSeekClient`): 200 success shape matches
  contract; malformed first response + valid repair ⇒ 200 with exactly 2 upstream
  calls; malformed twice ⇒ 502 `ai_malformed_output`; empty design ⇒ 422 before any
  upstream call; concurrent second request ⇒ 409; `deep: true` ⇒ client called with
  `deepseek-v4-pro`; 404/423 level guards. Depends on T011. (Sonnet 5 · high)
- [X] T016 [P] [US1] Frontend smoke tests in
  `frontend/src/app/features/playground/results/ai-review-panel.component.spec.ts`:
  renders all four states, cancel aborts the in-flight request, deep toggle sends
  `deep: true`, empty-canvas guard blocks. Depends on T013. (Sonnet 5 · medium)

**Checkpoint**: US1 fully functional — fresh review renders end-to-end (quickstart V1
minus caching); all tests green with no live API.

---

## Phase 4: User Story 2 — Reviews persist and repeat requests are free (Priority: P2)

**Goal**: Successful reviews stored keyed by `(levelId, designHash, model)`; unchanged
design ⇒ instant stored review, zero upstream spend; `force` re-runs; reviews survive
reload via GET.

**Independent Test**: Quickstart V2 + V3 — repeat POST returns `"cached": true` in
< 500 ms with no upstream call; page reload restores the review via GET.

### Implementation for User Story 2

- [X] T017 [US2] Wire persistence + cache into
  `backend/src/services/ai/ai-review.service.ts`: before upstream, compute hash
  (T004) and look up `(levelId, hash, selectedModel)` in `AiReviewRepo` — hit and
  not `force` ⇒ return stored review flagged `cached: true` (FR-007); after a
  successful upstream call, `upsertReview` (replaces the row for that exact key —
  forced re-runs overwrite, FR-006); failed calls persist NOTHING (FR-010); flash
  and pro reviews of the same design coexist as separate rows (R5). Depends on
  T003 + T010. (Opus 4.8 · medium)
- [X] T018 [US2] Add `GET /levels/:levelId/ai-review` to
  `backend/src/routes/ai-review.route.ts` per contracts/api.md: `available` from
  config, `models: { default, deep }`, `review` = newest row matching the CURRENT
  saved design's hash across both models (null if none), `stale: true` when only
  other-hash reviews exist; 404/423 guards; never calls upstream. Depends on T017.
  (Sonnet 5 · medium)
- [X] T019 [US2] Frontend restore & re-run in `ai-review-panel.component.ts` +
  `ai-review.api.ts`: `getReview(levelId)` on panel open ⇒ render stored review
  instantly; "cached" badge when POST returns `cached: true`; "Re-run review"
  button sending `force: true`; stale indicator ("design changed since this
  review") when GET reports `stale`. Depends on T018 + T013. (Sonnet 5 · medium)
- [X] T020 [P] [US2] Tests: extend `backend/tests/api/ai-review.test.ts` — repeat POST
  serves stored review with ZERO client-stub invocations; `force: true` re-calls and
  replaces the row; GET returns newest for current hash, `stale` correct after a
  design edit, flash + pro rows coexist; frontend spec: restore-on-open renders
  stored review. Depends on T018 + T019. (Sonnet 5 · medium)

**Checkpoint**: US1 + US2 — quickstart V1–V3 pass; repeat requests spend zero tokens.

---

## Phase 5: User Story 3 — Graceful behavior when AI is unavailable (Priority: P3)

**Goal**: Without a key (or on any upstream failure) the playground is fully usable;
the AI affordance explains itself; RUN/scoring/unlocking from feature 001 are
untouched.

**Independent Test**: Quickstart V4 — unset `DEEPSEEK_API_KEY`, restart backend: POST
⇒ 503 `ai_not_configured`, GET ⇒ `available: false`, UI shows a friendly notice, RUN
still scores in < 5 s.

### Implementation for User Story 3

- [X] T021 [P] [US3] Harden the not-configured and failure paths across
  `backend/src/services/ai/ai-review.service.ts` + `ai-review.route.ts`:
  `config.enabled === false` short-circuits BEFORE hash/prompt work with
  `ai_not_configured` (FR-009); audit that no error message, log line, or response
  ever contains the API key or raw prompt (FR-008); every mapped error body is
  `{ error: { code, message } }` with a human-readable message per contracts/api.md.
  (Sonnet 5 · medium)
- [X] T022 [P] [US3] Frontend degradation in `ai-review-panel.component.*` +
  `context-panel.component.*`: GET `available: false` ⇒ disable the button with a
  "not configured on this server" notice instead of an error dialog; per-code error
  messaging — retryable (`ai_timeout`/`ai_upstream_error`/`ai_rate_limited` ⇒ Retry
  button), operator problems (`ai_auth_failed`/`ai_out_of_credit` ⇒ explain, no
  retry), in-flight (409 ⇒ point to running review). Depends on T019. (Sonnet 5 ·
  medium)
- [X] T023 [US3] Failure-matrix tests in `backend/tests/api/ai-review.test.ts` +
  `backend/tests/ai/deepseek-client.test.ts`: stubbed upstream 401/402/429/5xx/
  timeout ⇒ contract status+code, nothing persisted after any failure (assert row
  count unchanged); regression guard: with no `DEEPSEEK_API_KEY`,
  `POST /levels/:levelId/attempts` (RUN) behaves exactly as feature 001 (reuse
  existing attempts test setup, SC-004). Depends on T021. (Sonnet 5 · high)

**Checkpoint**: All three stories independently functional; quickstart V1–V5 coverage.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T024 [P] Lint + format both tiers (`npm run lint` in backend/ and frontend/);
  verify the review panel is lazy-loaded (inspect build output — main bundle size
  unchanged, Principle V). (Sonnet 5 · low)
- [X] T025 Execute quickstart.md V1–V6 end-to-end: V6 (automated tests, no key) first,
  then V1–V5 against the live API with a real `DEEPSEEK_API_KEY` (costs ≈ one flash
  review + one pro review); fix any drift found. (Sonnet 5 · medium)
  - [X] V6 — `backend && npm test` (109/109) and `frontend && npm test` (57/57) green
    with no `DEEPSEEK_API_KEY` set.
  - [X] V1 — fresh flash review on level-2: 29.8s (≤120s), score 60, 5 dimensions,
    ≥2 strengths/gaps, non-empty real-world comparison.
  - [X] V2 — repeat unchanged: `cached: true` in 9ms; design edit ⇒ fresh review
    (new id); `force: true` on unchanged design ⇒ fresh review (row replaced);
    `deep: true` ⇒ fresh `deepseek-v4-pro` review (67s, its own cache row), repeat
    ⇒ cached.
  - [X] V3 — GET restores the newest review (the pro run) after "reload".
  - [X] V4 — key removed + backend restarted: POST ⇒ 503 `ai_not_configured`, GET ⇒
    `available: false` (still serves the last stored review), RUN unaffected
    (passed, total 100, 8ms).
  - [X] V5 — empty-canvas level ⇒ 422 `design_empty` (no upstream call); locked
    level ⇒ 423; two concurrent POSTs ⇒ one 200, one 409 `ai_review_in_flight`.
  - [X] UI spot-check (puppeteer) — playground → AI Review renders the restored
    (cached) review: score, 5 dimensions, strengths/gaps, real-world comparison,
    next steps, "Cached" badge — no extra upstream call.
  - No drift found beyond what T026 already corrected (plan.md file tree,
    quickstart.md port).
- [X] T026 [P] Constitution gate re-check + docs: 3-click rule (playground → AI Review
  = 1 click), < 100 ms perceived button feedback, consistent terminology; correct
  any spec/plan/quickstart drift discovered during implementation in
  `specs/002-ai-design-scoring/`. (Sonnet 5 · low)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none — start immediately (T001 ∥ T002, then T003)
- **Phase 2 (Foundational)**: needs Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: needs Phase 2 — MVP
- **Phase 4 (US2)**: needs T003 + T010 (service exists to wire cache into)
- **Phase 5 (US3)**: needs Phase 3 (route/panel exist to harden); T022 also needs T019
- **Phase 6 (Polish)**: needs all desired stories complete

### Task-Level Dependencies

```text
T001 ─┐                    T004 ─ T007
T002 ─┼─ T003              T005 ─ T008        (T004,T005,T006 parallel)
      │                    T006 ─ T009
      └────────────────────┬───────────────
US1:  T010 → T011 → T015   │   T012 → T013 → T014, T016
US2:  T017 → T018 → T019 → T020
US3:  T021 ∥ T022 → T023
Polish: T024 ∥ T026, then T025
```

### Parallel Opportunities

- Phase 1: T001 ∥ T002
- Phase 2: T004 ∥ T005 ∥ T006, then T007 ∥ T008 ∥ T009
- Phase 3: backend track (T010→T011) ∥ frontend track (T012→T013→T014); then T015 ∥ T016
- Phase 5: T021 ∥ T022
- Phase 6: T024 ∥ T026

## Parallel Example: User Story 1

```bash
# Two independent tracks after Phase 2:
Track A (backend):  T010 ai-review.service.ts → T011 ai-review.route.ts
Track B (frontend): T012 ai-review.api.ts → T013 ai-review-panel → T014 context-panel

# Then both test tasks together:
Task: "T015 backend supertest matrix in backend/tests/api/ai-review.test.ts"
Task: "T016 panel smoke tests in ai-review-panel.component.spec.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 (T001–T009) — foundation, fully unit-tested
2. Phase 3 (T010–T016) — fresh reviews render end-to-end
3. **STOP and VALIDATE**: quickstart V1 with a live key; demo
4. Note: without US2 every request spends tokens (~$0.003–0.005 flash) — ship US2
   next to stop the meter

### Incremental Delivery

1. Setup + Foundational → tested building blocks
2. US1 → independent test → demo (MVP)
3. US2 → repeat requests free, reviews survive reload → demo
4. US3 → pull the API key, verify nothing else degrades → done
5. Polish → lint, live quickstart run, constitution gates

## Notes

- All error semantics come from contracts/api.md — implement against that table, not
  ad-hoc strings.
- The DeepSeek client is injected everywhere; NO test may hit the live API
  (quickstart V6 guarantee).
- Commit after each task or logical group; stop at any checkpoint to validate.
