# Implementation Plan: Key-Based Authentication & Design Sharing

**Branch**: `005-key-based-auth` (work proceeds on `main`; no feature branch created) | **Date**: 2026-07-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-key-based-auth/spec.md`

## Summary

Replace the app's implicit single-user model with anonymous, shareable **access keys**:
a 12-character Crockford Base32 key (displayed `XXXX-XXXX-XXXX`, 60 bits entropy) is
the sole credential and identity. The server stores only the key's SHA-256 hash on a
new `workspaces` table and scopes **all** user data (designs, attempts, progress, AI
reviews) by `workspace_id`. The key travels in an `X-Access-Key` header attached by an
Angular interceptor — never in URLs. New surface: two auth endpoints
(`POST /auth/keys`, `GET /auth/session`), an auth middleware guarding every other
`/api/v1` route with per-IP rate limiting on failures, a lazy `/welcome` gate page
(create key / enter key), a route guard, a "Switch key" affordance, and last-write-wins
concurrency with a `baseUpdatedAt` precondition → 409 `stale_write` → reload/overwrite
dialog. Full decision log in [research.md](research.md) (R1–R10).

## Technical Context

**Language/Version**: TypeScript 5.9 on both tiers; Node.js ≥ 22 (backend), Angular 20 (frontend)

**Primary Dependencies**: Express 5, better-sqlite3 12, Zod 4 (backend); Angular 20 standalone + signals, RxJS 7.8, @foblex/flow canvas (frontend). **No new runtime dependencies** — key generation uses `node:crypto`; the rate limiter is ~40 lines in-repo (research R7)

**Storage**: SQLite via better-sqlite3 (`backend/data/app.db`, WAL). Schema bumped to `PRAGMA user_version = 2`: new `workspaces` table; `workspace_id` column + composite uniqueness on `designs`, `attempts`, `progress`, `ai_reviews` ([data-model.md](data-model.md))

**Testing**: Vitest both tiers; Supertest contract tests against `createApp({ db: inMemory })`. Test obligations enumerated per contract file

**Target Platform**: Single-node Node server + browser SPA (desktop/tablet ≥ 768 px)

**Project Type**: Web application — existing `backend/` + `frontend/` split

**Performance Goals**: Auth middleware adds ≤1 ms/request (one SHA-256 + one indexed lookup, synchronous better-sqlite3); dashboard load budget unchanged (welcome page is a lazy route); key entry/validation perceived response <100 ms UI feedback (spinner + inline states)

**Constraints**: Key ≤14 display chars with ≥60 bits entropy (SC-003/SC-004); raw keys never persisted server-side, never in URLs/logs (FR-012, R2/R3); failed-validation rate limit 10/min/IP, creation 5/min/IP (R7); atomic whole-document saves (SC-005)

**Scale/Scope**: Single-node learning deployment; ~10⁴ workspaces upper bound; touches all 4 DB tables, ~8 backend route files, ~6 new frontend files, 2 new endpoints

## Constitution Check

*GATE: evaluated pre-Phase 0 and re-checked post-Phase 1 design. Constitution v1.0.1.*

| # | Principle | Verdict | Evidence |
|---|---|---|---|
| I | Interactivity-First | PASS (n/a-with-note) | Auth is infrastructure, not a learning module; it adds no static content page. The welcome gate is a single interactive choice screen feeding straight into existing interactive features |
| II | Simplicity & Ease of Use | PASS | Gate adds one click before the dashboard; first interactive exercise remains ≤3 clicks *from the dashboard* (SC-001). All controls give <100 ms perceived feedback (local copy confirmation, spinners on network calls). Key normalization forgives case/hyphens/look-alikes — no manual needed |
| III | Fixed Technology Stack | PASS | Angular 20 + Express 5 only. Zero new runtime dependencies: `node:crypto` for generation/hashing, hand-rolled 40-line limiter justified in research R7 (alternative `express-rate-limit` rejected) |
| IV | Modular Component Architecture | PASS | `/welcome` is a lazy standalone component; conflict dialog lives in `shared/`; backend stays versioned REST under `/api/v1` with contracts documented **before** implementation (contracts/) |
| V | Performance & Responsiveness | PASS | No canvas-path changes (60 fps untouched); welcome route lazy-loaded so initial bundle grows ~0; middleware cost ≤1 ms; dashboard <3 s budget unaffected |

**Post-design re-check (after Phase 1 artifacts)**: PASS — no violations introduced by
the data model or contracts; Complexity Tracking below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-key-based-auth/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R10
├── data-model.md        # Phase 1 — Workspace entity, scoping changes, migration
├── quickstart.md        # Phase 1 — validation scenarios A–E
├── contracts/
│   ├── auth-api.md            # POST /auth/keys, GET /auth/session, header scheme, 429
│   ├── scoped-api-changes.md  # 401/409 deltas + scoping semantics on existing routes
│   └── ui-auth-surfaces.md    # /welcome gate, key reveal, switch-key, conflict dialog
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/
│   │   ├── key.ts                  # NEW — generate/normalize/hash keys (R1, R2)
│   │   └── auth.middleware.ts      # NEW — X-Access-Key → workspaceId in res.locals (R3)
│   ├── http/
│   │   ├── http-error.ts           # unchanged (envelope reused)
│   │   └── rate-limit.ts           # NEW — fixed-window per-IP limiter (R7)
│   ├── db/
│   │   ├── database.ts             # schema v2 + user_version migration (R5)
│   │   ├── workspace.repo.ts       # NEW — create/findByKeyHash/touchLastUsed
│   │   ├── design.repo.ts          # workspaceId params + baseUpdatedAt staleness (R6)
│   │   ├── attempt.repo.ts         # workspaceId params
│   │   ├── progress.repo.ts        # keyed by workspace_id, lazy seed
│   │   └── ai-review.repo.ts       # workspaceId in conflict key + lookups
│   ├── routes/
│   │   ├── auth.route.ts           # NEW — POST /auth/keys, GET /auth/session (R9)
│   │   ├── index.ts                # mount auth route + middleware ordering
│   │   └── *.route.ts              # thread workspaceId from res.locals (R10)
│   └── services/                   # progress/ai-review/mission: workspaceId params
└── tests/                          # contract + unit suites per contracts/*.md

frontend/
├── src/app/
│   ├── core/
│   │   ├── key.service.ts          # NEW — localStorage + signal session (R8)
│   │   ├── key.interceptor.ts      # NEW — attach header; 401 invalid_key handling
│   │   ├── key.guard.ts            # NEW — keyGuard + noKeyGuard
│   │   └── api/auth.api.ts         # NEW — createKey(), getSession()
│   ├── features/
│   │   ├── welcome/welcome.page.ts # NEW — lazy gate: create / enter key
│   │   └── */                      # sandbox + playground save paths: 409 handling
│   ├── shared/
│   │   └── conflict-dialog/        # NEW — reload-vs-overwrite dialog (FR-011)
│   └── app.routes.ts               # /welcome route + guards on existing routes
└── tests/                          # guard/interceptor/welcome/dialog smoke tests
```

**Structure Decision**: Existing web-application layout (`backend/` + `frontend/`) is
retained; the feature adds an `auth/` module on the backend and `core/` session
plumbing plus one lazy feature page on the frontend, matching the module boundaries
mandated by Constitution IV.

## Complexity Tracking

No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
