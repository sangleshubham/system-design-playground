# Implementation Plan: AI Design Scoring (DeepSeek Reasoning Review)

**Branch**: `002-ai-design-scoring` | **Date**: 2026-07-09 (amended 2026-07-11: flash default + pro deep-review opt-in) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-ai-design-scoring/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add an advisory AI review to the playground: on demand, the backend sends the level's
challenge ("question") and the learner's saved design graph to a DeepSeek reasoning
model (`deepseek-v4-flash` by default — thinking enabled, `reasoning_effort: high` —
with an opt-in "deep review" on `deepseek-v4-pro`) and stores the
returned structured review — overall score, five AI dimensions with commentary,
strengths, gaps, a real-world-systems comparison, and next steps. Reviews are
content-addressed by design hash (repeat views are free and instant), the API key stays
server-side, and every failure mode degrades gracefully: the deterministic rule engine
from feature 001 remains the only pass/fail and unlocking authority.

Technical approach: one new Express route (`/api/v1/levels/:levelId/ai-review`
POST + GET) backed by an isolated `ai/` service package (DeepSeek client via native
`fetch`, prompt builder, zod-validated output, SQLite `ai_reviews` table). Frontend adds
an "AI Review" panel to the existing results/context surfaces with in-progress, cached,
error, and not-configured states — no new routes, no canvas changes.

## Technical Context

**Language/Version**: TypeScript 5.x on both tiers; Node.js 22 (LTS — native `fetch`/`AbortController`)

**Primary Dependencies**:
- Backend: Express 5, `better-sqlite3`, `zod` (all already in the project). **No new
  runtime dependency** — DeepSeek's OpenAI-compatible REST API is called with native
  `fetch` ([research.md R2](./research.md#r2-api-access--plain-fetch-no-sdk)).
- Upstream service: DeepSeek `POST /chat/completions`, model `deepseek-v4-flash`
  (default) or `deepseek-v4-pro` (deep review), `thinking: {type: enabled}`,
  `reasoning_effort: high` (R1)
- Frontend: Angular 20 standalone components + Signals (existing patterns; no new libs)

**Storage**: SQLite (`backend/data/app.db`) — new `ai_reviews` table keyed by
`(levelId, designHash, model)`; content seeds unchanged

**Testing**: Vitest + supertest with an injectable/stubbed DeepSeek client (no live API
in tests); fixture-driven zod-schema tests for malformed-output handling; frontend
component smoke tests for the review panel states

**Target Platform**: Same as 001 — local/personal server, desktop/tablet browsers;
backend host needs egress to `api.deepseek.com`

**Project Type**: Web application (existing `frontend/` + `backend/`)

**Performance Goals**: AI review ≤ 120 s p95 with continuous progress UI (SC-001);
cached review < 500 ms (SC-003); rule-based RUN untouched at < 5 s (SC-004)

**Constraints**: Constitution-mandated stack (Angular + Express); AI strictly advisory
(FR-005); `DEEPSEEK_API_KEY` backend-env only (FR-008); thinking mode ignores sampler
params — omit them (R1); JSON contract enforced by prompt + zod + one repair retry, not
by `response_format` (R3); byte-stable prompt prefix to exploit DeepSeek's automatic
prefix caching (R9, FR-014)

**Scale/Scope**: Single user; one upstream call per (level, design, model) tuple;
designs ≤ 50 nodes typical, 200-node serialization cap; ~$0.003–0.005 per default
(flash) review, ~$0.01–0.02 per deep (pro) review (R5)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Verdict | Evidence |
|---|-----------|---------|----------|
| I | Interactivity-First | ✅ PASS | The review is a hands-on feedback loop on an artifact the learner built: request → reasoned critique → revise design → re-review. Rendered inside the interactive results/context surfaces; no static content pages added. |
| II | Simplicity & Ease of Use | ✅ PASS | One button, four states (idle/in-progress/review/error), zero configuration UI — the key is an env var. Cached reviews reopen instantly; unavailability shows one friendly notice (FR-009). |
| III | Fixed Technology Stack | ✅ PASS | Angular 20 + Express 5 only. Zero new npm dependencies: native `fetch` replaces an SDK (R2); `zod` and `better-sqlite3` reused. DeepSeek is an external HTTP service, not a stack change. |
| IV | Modular Component Architecture | ✅ PASS | Backend: isolated `services/ai/` package (client, prompt, service) behind one interface; single new versioned route documented in [contracts/api.md](./contracts/api.md) before implementation. Frontend: one standalone review-panel component + one core API service; canvas/palette/store untouched. |
| V | Performance & Responsiveness | ✅ PASS | Long upstream call is opt-in and off the RUN path (SC-004); in-flight guard prevents duplicate spend; cached path < 500 ms; no bundle growth beyond one lazy-loaded panel component. |

**Post-Phase-1 re-check**: data model (one table), contract (one resource), and
structure below introduce no violations. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/002-ai-design-scoring/
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
│   ├── config/
│   │   └── ai.config.ts              # NEW: typed env config (key, model, effort, timeout)
│   ├── routes/
│   │   ├── index.ts                  # MODIFIED: mount aiReviewRouter
│   │   └── ai-review.route.ts        # NEW: POST/GET /levels/:levelId/ai-review
│   ├── services/
│   │   └── ai/
│   │       ├── deepseek.client.ts    # NEW: fetch wrapper (auth, thinking, timeout, error map)
│   │       ├── review-prompt.ts      # NEW: system rubric + question/design serialization
│   │       ├── design-hash.ts        # NEW: canonical graph → sha256
│   │       ├── errors.ts             # NEW: typed AiReviewError taxonomy (contract error codes)
│   │       └── ai-review.service.ts  # NEW: orchestration — cache, in-flight guard, retry, persist
│   ├── db/
│   │   ├── database.ts               # MODIFIED: ai_reviews DDL added to idempotent initSchema()
│   │   └── ai-review.repo.ts         # NEW: upsert/findByKey/findLatestForHash/hasAnyForLevel
│   └── models/
│       └── ai-review.ts              # NEW: TS types + zod schemas (payload + API responses)
└── tests/
    ├── api/ai-review.test.ts         # NEW: supertest with stubbed client (all error codes)
    └── ai/…                          # NEW: prompt snapshot, hash canonicalization, client parse/retry

frontend/
├── src/app/
│   ├── core/api/
│   │   └── ai-review.api.ts          # NEW: typed client for the new endpoints
│   └── features/playground/
│       ├── results/
│       │   └── ai-review-panel.component.*   # NEW: idle / running(elapsed, cancel) / review / error + deep-review toggle
│       ├── context-panel/            # MODIFIED: "AI Review" entry point + availability state
│       └── playground.page.ts        # MODIFIED: fetches availability, owns panel open/close
└── (canvas/, palette/, state/ unchanged)
```

**Note (post-implementation)**: no `db/migrations/` folder was introduced — this project's
existing convention is a single idempotent `initSchema()` in `database.ts` (see
`tasks.md` § Path Conventions), so the `ai_reviews` table DDL was added there instead, as
feature 001's tables already are.

**Structure Decision**: Extends the existing web-application layout mandated by the
constitution. All AI concerns live in `backend/src/services/ai/` behind
`ai-review.service.ts`, so a future provider swap (or the sandbox follow-up) touches one
package. The frontend adds a single standalone panel component wired into the existing
results/context surfaces — the 001 canvas, palette, and store contracts are untouched.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally empty.
