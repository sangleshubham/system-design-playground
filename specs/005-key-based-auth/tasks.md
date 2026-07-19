# Tasks: Key-Based Authentication & Design Sharing

**Input**: Design documents from `/specs/005-key-based-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: INCLUDED — the constitution mandates smoke tests for interactive components, and each contract file ends with explicit test obligations (auth-api.md, scoped-api-changes.md, ui-auth-surfaces.md). Colocated `*.spec.ts` files ride along with their implementation task; dedicated tasks exist for the backend contract suites.

**Organization**: Tasks are grouped by user story (P1–P3 from spec.md) so each story is an independently implementable, testable increment.

## Format: `[ID] [P?] [Story] Description (Model · effort)`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, prerequisites met)
- **[Story]**: US1–US4 mapping to spec.md user stories
- Every task names exact file path(s)
- **(Model · effort)**: Recommended executor — `Sonnet 5` or `Opus 4.8` — and `/effort` level, assigned by task complexity (see Model Plan below)

## Model Plan (Sonnet 5 vs Opus 4.8 by complexity)

**Assignment rationale**:
- **Sonnet 5** — tasks fully pinned by the contracts and research decisions: key utilities (alphabet/regex/normalization given verbatim in R1), repo scoping (mechanical param threading), UI pages whose states are enumerated in ui-auth-surfaces.md, and all test suites (obligations are itemized per contract).
- **Opus 4.8** — the four judgment-heavy tasks: **T003** schema-v2 migration (drop/recreate detection must never touch a healthy v2 DB), **T007** auth middleware (no-oracle 401s, limiter interplay, security blast radius), **T021** concurrency preconditions (409 semantics across two save paths without breaking existing clients), **T024** wiring conflicts into the playground **autosave** loop (regression risk in the canvas's most delicate state machine).

**Switch checkpoints** (`/model` + `/effort` at these boundaries):

| Checkpoint | Model · effort | Covers |
|---|---|---|
| Phase 1 start | Sonnet 5 · medium | T001–T002 (key utils, rate limiter) |
| Phase 2 start | **Opus 4.8 · medium** | T003 (schema v2 + migration) |
| After T003 | Sonnet 5 · medium | T004–T006 (workspace repo, scoping) |
| Before T007 | **Opus 4.8 · high** | T007 (auth middleware) |
| After T007 | Sonnet 5 · medium | T008–T020 (routes, threading, tests, US1–US3) |
| US4 start | **Opus 4.8 · high** | T021 (409 preconditions) |
| After T021 | Sonnet 5 · medium | T022–T023 (tests, dialog) |
| Before T024 | **Opus 4.8 · medium** | T024 (autosave/save-path wiring) |
| After T024 | Sonnet 5 · medium | T025–T027 (polish) |

**Model economy**: 23 of 27 tasks are Sonnet 5-assignable (85%); Opus 4.8 is reserved for the migration, the middleware, and the two concurrency tasks.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Self-contained primitives with zero dependencies on the rest of the codebase — both fully specified by research R1/R2/R7.

- [X] T001 [P] Key utilities in `backend/src/auth/key.ts`: `generateKey()` (12 chars, Crockford Base32 via `crypto.randomBytes` rejection sampling), `formatKey()` (`XXXX-XXXX-XXXX` display grouping), `normalizeKey()` (uppercase; strip `-`/spaces; `O→0`, `I→1`, `L→1`), `isValidShape()` (`^[0-9A-HJKMNP-TV-Z]{12}$`), `hashKey()` (hex SHA-256 via `node:crypto`). Unit tests in `backend/tests/auth/key.test.ts`: display↔normalize round-trip, alias mapping, shape rejection, alphabet exclusions (no I/L/O/U) (Sonnet 5 · medium)
- [X] T002 [P] Fixed-window rate limiter in `backend/src/http/rate-limit.ts`: `Map<ip, {count, windowStart}>` per bucket, 60 s windows, buckets `validateFail` (limit 10) and `create` (limit 5), lazy pruning, injectable clock. Unit tests in `backend/tests/auth/rate-limit.test.ts`: 11th failure blocks, window rollover resets, successes never counted, buckets independent (Sonnet 5 · medium)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Workspace-scoped persistence + the auth wall. After this phase every `/api/v1` route (except `/health`, `POST /auth/keys`) requires a key and serves only that key's data.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — the existing test suite must be green again at the checkpoint.

- [X] T003 Schema v2 in `backend/src/db/database.ts` per [data-model.md](./data-model.md): new `workspaces` table; `workspace_id` column on `designs`/`attempts`/`progress`/`ai_reviews`; constraint changes (`UNIQUE (workspace_id, level_id)`, progress `PRIMARY KEY (workspace_id)`, ai_reviews 4-column UNIQUE); new indexes; `PRAGMA user_version = 2` stamp with drop-and-recreate only when `user_version < 2` AND legacy tables exist (research R5 — a healthy v2 file must never be dropped) (**Opus 4.8 · medium**)
- [X] T004 `WorkspaceRepo` in `backend/src/db/workspace.repo.ts` (`create()`, `findByKeyHash()`, `touchLastUsed()`); add `workspaces` to `DbContext` in `backend/src/db/database.ts` (Sonnet 5 · medium)
- [X] T005 [P] Scope `DesignRepo` in `backend/src/db/design.repo.ts`: leading `workspaceId` param on every method; level upsert keyed on `(workspace_id, level_id)`; sandbox list/get/update/delete scoped (Sonnet 5 · medium)
- [X] T006 [P] Scope remaining repos: `backend/src/db/attempt.repo.ts` (workspaceId on insert/list), `backend/src/db/progress.repo.ts` (keyed by `workspace_id`, lazy-seed first-run defaults per research R10), `backend/src/db/ai-review.repo.ts` (workspaceId joins the upsert conflict key and all lookups) (Sonnet 5 · medium)
- [X] T007 Auth middleware in `backend/src/auth/auth.middleware.ts` per [contracts/auth-api.md](./contracts/auth-api.md): 429 check *before* any hashing; read `X-Access-Key` → shape-check → hash → `findByKeyHash`; failure → record in limiter + 401 `invalid_key` with byte-identical envelope for missing/malformed/unknown (no oracle); success → `res.locals.workspaceId` + `touchLastUsed` throttled to ≥1/min. Middleware tests in `backend/tests/auth/auth.middleware.test.ts` (**Opus 4.8 · high**)
- [X] T008 Auth endpoints in `backend/src/routes/auth.route.ts` (`POST /auth/keys` → 201 `{key, createdAt}` behind the `create` limiter; `GET /auth/session` → 200 `{createdAt, lastUsedAt}`); mount order in `backend/src/routes/index.ts`: auth route → auth middleware → all existing routes; wire limiter + repo through `backend/src/app.ts`/`backend/src/deps.ts` (Sonnet 5 · medium)
- [X] T009 Thread `workspaceId` from `res.locals` through every existing route and service: `backend/src/routes/{map,progress,levels,attempts,sandbox,ai-review,components}.route.ts`, `backend/src/services/progress.service.ts`, `backend/src/services/mission.service.ts`, `backend/src/services/ai/ai-review.service.ts` (cache key gains workspaceId, research R10) (Sonnet 5 · medium)
- [X] T010 Update `backend/tests/helpers.ts`: mint a workspace + key per test app, export an authed-request helper; migrate all existing suites under `backend/tests/{api,ai,scoring,content}/` to authed calls so the pre-feature suite is green again (Sonnet 5 · medium)
- [X] T011 Auth contract suite in `backend/tests/auth/auth-api.test.ts` — the five obligations in [contracts/auth-api.md](./contracts/auth-api.md): create→probe round-trip, normalization equivalence (lowercase / un-hyphenated / `o`↔`0`), no-oracle 401 envelopes, 429 on 11th failure with successes uncounted, keyless `/health` (Sonnet 5 · medium)

**Checkpoint**: Foundation ready — `cd backend && npm test` fully green; user stories can now proceed (US1 → US2 → US3 → US4, or in parallel).

---

## Phase 3: User Story 1 - Instant workspace on first visit (Priority: P1) 🎯 MVP

**Goal**: Fresh browser → choice screen → create key → key revealed once (copy + loss warning) → playground; designs save under the key; reopening the browser skips the gate entirely.

**Independent Test**: quickstart.md Scenario B — fresh profile reaches a working playground with a new key in ≤3 clicks (SC-001); browser restart lands in the workspace with zero prompts (SC-002).

### Implementation for User Story 1

- [X] T012 [P] [US1] `KeyService` in `frontend/src/app/core/key.service.ts`: signal hydrated from `localStorage['sdp.accessKey']` at construction; `key()`, `hasKey()`, `setKey()`, `clear()`; spec in `frontend/src/app/core/key.service.spec.ts` (Sonnet 5 · medium)
- [X] T013 [P] [US1] Auth API client in `frontend/src/app/core/api/auth.api.ts`: `createKey()` → `POST /api/v1/auth/keys`; `getSession(candidateKey?)` → `GET /api/v1/auth/session`, setting `X-Access-Key` explicitly when probing a candidate (Sonnet 5 · medium)
- [X] T014 [US1] Functional `keyInterceptor` in `frontend/src/app/core/key.interceptor.ts` per [contracts/ui-auth-surfaces.md](./contracts/ui-auth-surfaces.md): attach `X-Access-Key` when stored; 401 `invalid_key` → `KeyService.clear()` + toast + redirect `/welcome`; 429 → cooldown toast, key untouched; network/5xx untouched. Register in `frontend/src/app/app.config.ts` ahead of `httpErrorInterceptor`; spec in `frontend/src/app/core/key.interceptor.spec.ts` (Sonnet 5 · medium)
- [X] T015 [US1] Guards in `frontend/src/app/core/key.guard.ts` (`keyGuard` → redirect `/welcome` when keyless; `noKeyGuard` → bounce keyed visitors to `/`); wire `keyGuard` onto all five existing routes and add lazy `/welcome` route in `frontend/src/app/app.routes.ts`; spec in `frontend/src/app/core/key.guard.spec.ts` (Sonnet 5 · medium)
- [X] T016 [US1] `WelcomePage` (create flow + key reveal) in `frontend/src/app/features/welcome/welcome.page.ts` + `.html` + `.scss` per [contracts/ui-auth-surfaces.md](./contracts/ui-auth-surfaces.md): two equal actions; create → reveal state (`XXXX-XXXX-XXXX` monospace, Clipboard-API copy with <100 ms "Copied" feedback, loss warning, "I saved my key — start designing" persists via `KeyService` then routes `/`); 429 inline cooldown; spec in `frontend/src/app/features/welcome/welcome.page.spec.ts` (render both actions, key persisted only after acknowledgement) (Sonnet 5 · medium)
- [X] T017 [US1] Association contract test in `backend/tests/api/workspace-scoping.test.ts` (US1 slice): design saved with key A appears in A's `GET /sandbox/designs`; a freshly created key B starts with an empty list (spec US1 acceptance 4) (Sonnet 5 · medium)

**Checkpoint**: MVP — quickstart Scenario B passes end-to-end; ship/demo-able.

---

## Phase 4: User Story 2 - Pick up work on any device (Priority: P2)

**Goal**: "I have a key" flow restores the full profile on any device; "Switch key" forgets the device without touching server data.

**Independent Test**: quickstart.md Scenario C — second browser + typed key (lowercase, no hyphens) loads the workspace in <3 s (SC-006); wrong key rejected inline with nothing persisted; switch-key returns the gate on next visit.

### Implementation for User Story 2

- [X] T018 [US2] Enter-key flow on `frontend/src/app/features/welcome/welcome.page.ts` + `.html`: input with live normalization/auto-grouping (paste-friendly); submit probes `getSession(candidate)`; 200 → persist + route `/`; 401 → inline "That key doesn't match any workspace" and **no** persistence (FR-007); 429 → cooldown message; network failure → retryable error with input preserved (spec edge case); extend `welcome.page.spec.ts` (401 leaves localStorage empty) (Sonnet 5 · medium)
- [X] T019 [P] [US2] Session affordance in the root shell `frontend/src/app/app.html` + `frontend/src/app/app.ts`: compact workspace menu visible only when a key is stored — masked stub (last 4 chars, never the full key) + **Switch key** action calling `KeyService.clear()` and routing `/welcome` (no server call, FR-005); smoke spec alongside in `frontend/src/app/app.spec.ts` (Sonnet 5 · medium)

**Checkpoint**: US1 + US2 — a key created on machine A fully restores on machine B.

---

## Phase 5: User Story 3 - Share designs by sharing the key (Priority: P3)

**Goal**: Anyone holding the key is an equal owner; workspaces are mutually invisible. (No new UI — sharing *is* the US2 enter-key flow performed by a second person; this phase proves the semantics.)

**Independent Test**: quickstart.md Scenarios C(2) + E — second person's browser opens the shared designs with full access; a different key sees none of it.

### Implementation for User Story 3

- [X] T020 [US3] Isolation + shared-access contract suite in `backend/tests/api/workspace-scoping.test.ts` per [contracts/scoped-api-changes.md](./contracts/scoped-api-changes.md) obligations 1/2/5: two-workspace invisibility fanned out over every listed endpoint; same level saved in both workspaces coexists; fresh key's `GET /map` equals the fresh-install snapshot; FR-010 full access — a second Supertest client using the *same* key edits and deletes a design the first client created (Sonnet 5 · medium)

**Checkpoint**: Sharing semantics proven at the API level; browser walkthrough deferred to T026.

---

## Phase 6: User Story 4 - Two people, one key, nothing breaks (Priority: P3)

**Goal**: Simultaneous same-key use stays stable; concurrent edits resolve last-write-wins with a reload/overwrite warning; saves are never blended (SC-005).

**Independent Test**: quickstart.md Scenario D — two browsers on one key; stale save raises the conflict dialog; stored document afterwards is exactly one writer's payload.

### Implementation for User Story 4

- [X] T021 [US4] Optimistic preconditions per [contracts/scoped-api-changes.md](./contracts/scoped-api-changes.md): `backend/src/db/design.repo.ts` update methods accept optional `baseUpdatedAt` and report staleness without writing; `backend/src/routes/levels.route.ts` + `backend/src/routes/sandbox.route.ts` accept the new optional Zod field and return 409 `{error: {code: 'stale_write'}, current: <full stored design>}` on mismatch; omitted `baseUpdatedAt` writes unconditionally; `DELETE` keeps no precondition (**Opus 4.8 · high**)
- [X] T022 [US4] Concurrency contract suite in `backend/tests/api/concurrency.test.ts` — obligations 3/4: stale PUT → 409 with `current`; resend with `current.updatedAt` → 200; omitted field → 200; two sequential saves from one base → second 409s and the stored document is byte-identical to the first save (never a blend, SC-005) (Sonnet 5 · medium)
- [X] T023 [P] [US4] Conflict dialog in `frontend/src/app/shared/`: reuse/extend the existing `confirm-dialog.component.ts` + `confirm-dialog.service.ts` pattern if its two-action API fits, else add `conflict-dialog.component.ts` per [contracts/ui-auth-surfaces.md](./contracts/ui-auth-surfaces.md) — message + **Reload their version** / **Overwrite** choices, dismissal leaves the canvas untouched; smoke spec alongside (Sonnet 5 · medium)
- [X] T024 [US4] Wire conflicts into both save paths: `frontend/src/app/core/api/sandbox.api.ts` + `frontend/src/app/core/api/levels.api.ts` send `baseUpdatedAt` and surface typed 409s; `frontend/src/app/features/sandbox/sandbox.page.ts` and the playground autosave state (`frontend/src/app/features/playground/state/autosave.ts` + `playground.page.ts`) track the last-known `updatedAt`, adopt the fresh value on every 200, and on 409 **pause autosave**, raise the dialog, then reload (`current` replaces canvas) or overwrite (resend with `current.updatedAt`); never silent-retry; extend the autosave + sandbox specs (**Opus 4.8 · medium**)

**Checkpoint**: All four stories functional — quickstart Scenario D passes in two real browsers.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T025 [P] Full sweep: `cd backend && npm run lint && npm test`; `cd frontend && npm run lint && npm test` — all suites green, zero lint errors (Sonnet 5 · low)
- [X] T026 Runtime validation of [quickstart.md](./quickstart.md) Scenarios A–E (use the project's `/verify` skill to build, launch, and drive the app), including the sign-off greps: `rg -i "accessKey|X-Access-Key" frontend/src` shows the key only in header attachment + localStorage code, and backend log lines contain no key material (FR-012, R3) (Sonnet 5 · medium)
- [X] T027 [P] Constitution Principle II release gate on the new surfaces: welcome→first exercise click count ≤3 (SC-001), <100 ms perceived feedback on copy/normalize interactions, terminology consistent with existing modules ("workspace", "key"); record results in the quickstart sign-off checklist (Sonnet 5 · low)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — T001 ∥ T002 immediately
- **Foundational (Phase 2)**: T003 → T004 → (T005 ∥ T006) → T007 (needs T001, T002, T004) → T008 → T009 → T010 → T011. BLOCKS all stories
- **US1 (Phase 3)**: after Phase 2. (T012 ∥ T013) → T014 → T015 → T016; T017 anytime after Phase 2
- **US2 (Phase 4)**: after US1 (extends `welcome.page.ts`, uses `KeyService`)
- **US3 (Phase 5)**: after Phase 2 only — T020 is backend-independent of US1/US2 code
- **US4 (Phase 6)**: T021 → T022; T023 after Phase 2; T024 needs T021 + T023 (and touches pages that exist independent of US1–US3)
- **Polish (Phase 7)**: after all desired stories; T026 needs US1+US2 in place for Scenarios B–C

### Cross-story independence

US3 and US4's backend halves (T020, T021–T022) depend only on the Foundation, so they can run in parallel with the US1/US2 frontend work if staffed.

### Parallel Opportunities

```text
Phase 1:  T001 ∥ T002
Phase 2:  T005 ∥ T006 (after T004)
Phase 3:  T012 ∥ T013; T017 ∥ any frontend task
Phase 4:  T018 ∥ T019
Phase 6:  T023 ∥ T021/T022
Phase 7:  T025 ∥ T027
Cross-phase (if staffed): {T020, T021→T022} ∥ {US1/US2 frontend}
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001–T002) → Phase 2 (T003–T011) — the auth wall + green legacy suite
2. Phase 3 (T012–T017) → **STOP and VALIDATE**: quickstart Scenario B in a real browser
3. Demo: create key → design → restart browser → still yours

### Incremental Delivery

1. + US2 (T018–T019) → Scenario C → cross-device identity works
2. + US3 (T020) → Scenario E → sharing semantics proven
3. + US4 (T021–T024) → Scenario D → concurrency safe
4. Polish (T025–T027) → release gates recorded

Each story lands without breaking the previous ones; the dev database resets once at the first post-T003 launch (research R5 — expected, spec-sanctioned).
