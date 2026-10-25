# Feature 007 — systemdesign.io question bank

**Branch**: `007-systemdesign-io-questions` · **Status**: approved plan, implementation in units

## Goal

Make the first 20 questions of <https://systemdesign.io> solvable in the playground, with
correct, test-verified reference solutions, a per-level **Read** section listing the
question's recommended resources, the question's "details you should know" shown as
**tips**, and no unlock chain (every level is playable from the start).

## Decisions (user-approved)

- **Merge**: the 8 questions that already exist as levels are upgraded in place (same ids,
  progress survives); the other 12 are new levels. 24 levels total in 4 acts.
- **Reference solutions are tests-only**: they live in `backend/tests/content/solutions/`,
  are never served by the API, and are asserted to pass.
- **Unlock chain removed everywhere**: no level is ever locked; passing a level only marks it
  complete. Level `order` is display order only (still unique + contiguous from 1).
- Difficulty for new levels follows the site (Easy→easy, Medium→medium, Hard→hard,
  Very Hard→expert); existing levels keep their difficulty.
- The source pages have no problem statement and no solution of their own ("In progress");
  problem statements are authored from the title + details + linked write-ups.

## Requirements

- FR-1 Level content gains optional `tips: string[]`, `resources: Resource[]`
  (`{ title, url, kind: 'article'|'video'|'paper'|'discussion'|'course' }`) and
  `sourceUrl?: string` (the systemdesign.io question page). Absent → treated as empty.
- FR-2 Context panel has **Brief** and **Read** tabs. Brief = existing content plus a
  "Things to consider" block (tips). Read = resources grouped by kind, each opening in a
  new tab (`target="_blank" rel="noopener noreferrer"`), plus a credit line linking
  `sourceUrl`. Empty states when a level has no tips/resources.
- FR-3 Two new components: `key-generation-service`, `geo-index` (see content-dossier.md),
  with new `tile-*` icons.
- FR-4 Unlock chain removed (see unit U1 in plan.md).
- FR-5 Every level has a reference design; a backend content test asserts each one scores
  `passed === true`, total ≥ 90, and Missions/Flow/Topology/Resilience each = 100.
- FR-6 All 20 questions' tips and resources match the source pages (content-dossier.md is
  the verbatim record).

See `plan.md` for units and `content-dossier.md` for per-level content.
