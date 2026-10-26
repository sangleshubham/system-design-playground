# Plan — Feature 008

Stack unchanged (Angular 20 + Express 5, constitution). No new dependencies, no schema
change (feature 007 already added `tips`, `resources`, `sourceUrl`).

## Units (linear chain; each worktree branches from the previous unit's `agent/` branch,
because level `order` must stay unique and contiguous at every step)

| # | Unit | Builder |
|---|---|---|
| U4 | 6 new components + `tile-*` icons, icon-id mirror, count tests 44 → 50 | Codex |
| C4 | act-5 Everyday Products (levels 25–31) + level-6 upgrade (Q24) + solutions | Codex |
| C5 | act-6 Live Counts & Presence (levels 32–38) + solutions | Codex |
| C6 | act-7 Rides, Ranking & Experiments (levels 39–43) + solutions | Codex |
| C7 | act-8 Money & Flash Sales (levels 44–47) + solutions | Codex |
| C8 | act-9 Batch & Coordination (levels 48–52) + solutions | Codex |
| C9 | act-10 Running Distributed Systems (levels 53–57) + solutions | Codex |

C4 (login) and C7 (payments) are content-only JSON — no auth or payment code — so they stay
with Codex.

## Verification

Each unit: `npm test` and `npm run lint` at repo root (Codex sandbox: content + scoring
tests, frontend tests and lint; supertest API tests need sockets and are run by the
orchestrator). The reference-solution harness gates every level. Final pass: `verify` skill.
