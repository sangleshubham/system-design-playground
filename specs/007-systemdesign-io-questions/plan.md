# Plan — Feature 007

Stack unchanged (Angular 20 + Express 5, constitution). No new dependencies.

## Units (linear chain; each worktree branches from the previous unit's `agent/` branch)

| # | Unit | Builder |
|---|---|---|
| U1 | Remove unlock chain (backend + frontend + tests) | complex-implementer |
| U2 | Content schema (`tips`, `resources`, `sourceUrl`), frontend model mirror, 2 new components + tile icons, reference-solution test harness | complex-implementer |
| U3 | Context panel Brief / Read tabs | Codex |
| C1 | acts.json (4 acts), re-order, upgrade 8 overlapping levels, Pastebin, reference solutions for all Act 1–2 levels | Codex |
| C2 | Act 3 levels (14–18) + solutions | Codex |
| C3 | Act 4 levels (19–24) + solutions | Codex |

## U1 — Remove the unlock chain

- `ProgressService.isUnlocked`/blocker logic removed; `levels`, `attempts`, `ai-review`
  routes no longer return 423 for levels. `recordPass` only adds to `completedLevelIds`.
- `/map`: level status is `'unlocked' | 'completed'` only; drop `unlockedThroughOrder` from
  responses (map totals, progress). Attempt response no longer carries `unlockedLevelId`.
- `/progress` "recommended next" = first uncompleted level by order.
- DB column `unlocked_through_order` may stay (harmless) or be dropped via the existing
  drop-and-recreate migration — builder's choice, documented.
- Frontend: remove locked card state, locked playground screen, 423 handling, and the
  "next level unlocked" messaging in results; keep "next level" navigation if it exists.
- Update `contracts/` docs of earlier specs only if they are the living API reference.
- Tests updated: no test may expect a 423 or a locked status.

## U2 — Schema + harness

- `backend/src/models/index.ts`: `ResourceSchema`, `LevelSchema` gets
  `tips: z.array(z.string().min(1)).default([])`,
  `resources: z.array(ResourceSchema).default([])`, `sourceUrl: z.string().url().optional()`.
  `url` must be http(s).
- `frontend/src/app/core/models.ts` mirror.
- Components `key-generation-service` and `geo-index` in `components.json`
  (values in content-dossier.md); icons `tile-key-generation-service`, `tile-geo-index`
  added to `TILE_ICONS` (Lucide-style 24×24 paths like the others — not the AWS block) and to
  `COMPONENT_ICON_IDS` (42 → 44; update count comments). Palette must show them.
- Harness: `backend/tests/content/reference-solutions.test.ts` loads every
  `backend/tests/content/solutions/<level-id>.json` (`{ nodes: DesignNode[], edges: DesignEdge[] }`)
  and, using the real content service + `evaluateDesign`, asserts for each level:
  a solution file exists, `passed`, total ≥ 90, and missions/flow/topology/resilience = 100.
  Also asserts every level id has a solution (so new levels can't ship without one).
  U2 itself ships solutions for the current 12 levels unchanged (C1 updates them).
- Content test: every `resources[].url` is unique within a level and http(s).

## Verification

Each unit: `npm test` and `npm run lint` at repo root. UI units additionally verified with
the project `verify` skill.
