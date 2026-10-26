# Feature 008 — systemdesign.io question bank, questions 21–55

**Branch**: `008-systemdesign-io-remaining` (from `007-systemdesign-io-questions`) ·
**Status**: approved plan, implementation in units

## Goal

Make the remaining questions (21–55) of <https://systemdesign.io> solvable in the
playground, using the same machinery as feature 007: per-level tips, a Read tab of the
question's linked resources, `sourceUrl`, and a tests-only reference design that must pass.

## Decisions (user-approved)

- **Merge** (same policy as 007): Q24 "Notification Service at Scale" upgrades the existing
  `level-6` Notification System in place (same id). Every other question becomes a new level.
- Q22 "Top K Elements: App Store Rankings / Bestsellers" is a new level distinct from
  `level-23` (that one is real-time sliding windows; Q22 is the real-time-vs-batch choice,
  built as a fast approximate path plus an exact batch recount).
- **Q31 "IoC / Dependency Injection Framework" is skipped**: an in-process library design has
  no honest mapping onto infrastructure components.
- Q52 "Distributed Botnet" is framed as coordinating a fleet of machines you own
  (MapReduce-style master/workers), which is what the source page's tips describe.
- Pages with candidate-written problem descriptions (Q46, Q49, Q54) use that text as the
  problem statement; their remaining notes become tips. Pages with no links (Q26, Q54) ship
  with an empty Read tab.
- Difficulty: Easy→easy, Medium→medium, Hard→hard, Very Hard→expert, unless the dossier
  overrides it (with a reason).
- 6 new components (see content-dossier.md). 33 new levels (`level-25`…`level-57`, orders
  25–57) in 6 new acts (act-5…act-10).

## Requirements

- FR-1 Components `auth-service`, `feature-flag-service`, `ml-model-server`,
  `trace-collector`, `external-api`, `batch-processor` exist with `tile-*` icons.
- FR-2 Every new level (and upgraded level-6) has `tips`, `resources` and `sourceUrl`
  matching content-dossier.md exactly.
- FR-3 Every level has a reference design that the existing harness
  (`backend/tests/content/reference-solutions.test.ts`) asserts passes with
  Missions/Flow/Topology/Resilience = 100.

See `plan.md` for units and `content-dossier.md` for per-level content.
