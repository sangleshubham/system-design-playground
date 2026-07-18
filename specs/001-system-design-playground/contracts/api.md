# API Contract: Interactive System Design Playground

**Base URL**: `/api/v1` | **Format**: JSON | **Auth**: none (single-user)
**Date**: 2026-07-08 | **Data shapes**: see [data-model.md](../data-model.md)

Conventions:
- Errors: `{ "error": { "code": string, "message": string } }` with appropriate HTTP
  status (`400` validation, `404` unknown id, `423` locked level, `500` unexpected).
- All ids are strings; timestamps are ISO-8601.
- Breaking changes require a new `/api/v2` prefix (constitution).

## Content

### GET /api/v1/components
Full component catalog for the palette.
- **200** → `Component[]` (see data-model)

### GET /api/v1/map
The challenge map view (acts, level cards, lock/completion states, totals).
- **200** →
  ```json
  {
    "acts": [{
      "id": "act-1", "order": 1, "title": "The Fundamentals",
      "completedCount": 1, "levelCount": 7,
      "levels": [{
        "id": "level-1", "order": 1, "title": "The Static App",
        "difficulty": "easy", "summary": "...", "objectives": ["CDN", "Caching"],
        "missionCount": 6, "status": "completed"   // "locked" | "unlocked" | "completed"
      }]
    }],
    "totals": { "completed": 1, "levels": 12, "unlockedThroughOrder": 2 }
  }
  ```

### GET /api/v1/levels/:levelId
Full playground payload for an unlocked level.
- **200** → `Level` (narrative, specs, missions, hints, recommendedComponentIds)
  plus `"design": Design | null` (saved canvas, if any)
- **423** if the level is locked (FR-024) — body names the blocking level.
- **404** unknown id.

## Designs (autosave)

### PUT /api/v1/levels/:levelId/design
Upsert the working canvas for a level (debounced autosave — FR-027).
- **Body**: `{ nodes: DesignNode[], edges: DesignEdge[], notes: StickyNote[], revealedHintCount: number }`
- **200** → `{ "updatedAt": "..." }`; also sets `lastTouchedLevelId`.
- **400** on invariant violation (self-loop, duplicate edge, dangling edge endpoint,
  unknown componentId).
- **423** if locked.

## Evaluation

### POST /api/v1/levels/:levelId/attempts
Evaluate the level's **saved** design (client flushes autosave before RUN).
- **200** →
  ```json
  {
    "attemptId": "…",
    "scores": { "missions": 100, "flow": 90, "topology": 85,
                "efficiency": 95, "resilience": 70 },
    "total": 89.5,
    "passed": false,
    "feedback": [{
      "dimension": "efficiency", "score": 95,
      "findings": [
        { "ok": true,  "message": "Total cost $4.20/hr is within the $6.00/hr budget." },
        { "ok": false, "message": "Critical path latency 260ms exceeds the 200ms target." }
      ]
    }],
    "unlockedLevelId": "level-3"        // present only when this pass unlocks a level
  }
  ```
- Guarantees: responds < 5 s (SC-003); evaluating an empty canvas is a valid low-score
  response, never an error; a passing total (≥ 90) atomically records completion and
  advances the unlock frontier (FR-020, FR-022, FR-024).
- **423** if locked; **404** unknown level.

### GET /api/v1/levels/:levelId/attempts
Attempt history for a level, newest first.
- **200** → `{ "attempts": Attempt[], "best": number | null }`

## Progress & Home

### GET /api/v1/progress
Everything the home view needs (FR-029).
- **200** →
  ```json
  {
    "lab": { "completed": 3, "levels": 12, "percent": 25 },
    "continue": { "levelId": "level-4", "title": "Rate Limiter",
                  "updatedAt": "…" },                 // null if never played
    "recommendedNext": { "levelId": "level-4", "title": "Rate Limiter" }  // null if done
  }
  ```

## Sandbox

### GET /api/v1/sandbox/designs
- **200** → `[{ "id", "name", "updatedAt", "nodeCount" }]`

### POST /api/v1/sandbox/designs
- **Body**: `{ "name": string }` → **201** → full empty `Design`

### GET /api/v1/sandbox/designs/:id
- **200** → `Design`; **404** unknown.

### PUT /api/v1/sandbox/designs/:id
Upsert content and/or rename: same body as level design plus optional `"name"`.
- **200** → `{ "updatedAt": "..." }`; **400** on invariant violation.

### DELETE /api/v1/sandbox/designs/:id
- **204**; **404** unknown.

## Non-API Contracts (frontend-internal)

- **Theme**: pure client concern — `data-theme` attribute + localStorage; no endpoint.
- **Mission live-checking**: performed client-side by the same rule semantics as the
  server's Missions dimension (shared spec in data-model.md § Mission); the server
  remains authoritative at RUN time. Divergence between the two is a bug (SC-006).
- **Routes** (lazy): `/` (home), `/lab` (map), `/playground/:levelId`, `/sandbox`,
  `/sandbox/:designId`.
