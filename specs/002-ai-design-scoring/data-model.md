# Data Model: AI Design Scoring

**Feature**: `002-ai-design-scoring` | **Date**: 2026-07-09
**Depends on**: feature 001 entities (`Level`, `Design`, `DesignNode`, `DesignEdge`, `Component`)

## Entities

### AiReview

A persisted, advisory evaluation of one exact design for one level by one model.

| Field | Type | Notes |
|---|---|---|
| `id` | string (uuid) | PK |
| `levelId` | string | FK → levels content; part of cache key |
| `designHash` | string (64 hex) | sha256 of the canonical design (see below); part of cache key |
| `model` | string | `deepseek-flash` (default) or `deepseek-v4-pro` (deep review); part of cache key |
| `reasoningEffort` | string | `high` \| `max` (as configured at call time) |
| `payload` | JSON (`AiReviewPayload`) | The validated review document (below) |
| `promptTokens` | integer | from upstream `usage` |
| `completionTokens` | integer | includes reasoning tokens (billed as output) |
| `latencyMs` | integer | wall-clock upstream duration |
| `createdAt` | ISO datetime | |

**Uniqueness**: `UNIQUE(levelId, designHash, model)` — a forced re-run replaces the row
(upsert) so "latest review for this exact design" is unambiguous.

**SQLite DDL**

```sql
CREATE TABLE ai_reviews (
  id                TEXT PRIMARY KEY,
  level_id          TEXT NOT NULL,
  design_hash       TEXT NOT NULL,
  model             TEXT NOT NULL,
  reasoning_effort  TEXT NOT NULL,
  payload           TEXT NOT NULL,            -- JSON, zod-validated before write
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  UNIQUE (level_id, design_hash, model)
);
CREATE INDEX idx_ai_reviews_level ON ai_reviews (level_id, created_at DESC);
```

### AiReviewPayload (model output — zod-validated)

The single JSON object the model must return; stored verbatim in `payload`.

```ts
const AiDimension = z.object({
  name: z.enum(['requirements-fit', 'scalability', 'reliability', 'efficiency', 'operability']),
  score: z.number().int().min(0).max(100),
  comment: z.string().min(1),
});

export const AiReviewPayloadSchema = z.object({
  score: z.number().int().min(0).max(100),        // overall
  verdict: z.string().min(1),                     // one-line summary
  dimensions: z.array(AiDimension).length(5),
  strengths: z.array(z.string().min(1)).min(2),
  gaps: z.array(z.string().min(1)).min(2),
  realWorldComparison: z.object({
    referenceArchitecture: z.string().min(1),     // how production systems solve this
    matches: z.array(z.string()),                 // where the design mirrors reality
    differences: z.array(z.string()),             // where it diverges and why it matters
  }),
  nextSteps: z.array(z.string().min(1)).min(1),
});
```

Validation failure → one repair retry (research R3); second failure →
`ai_malformed_output`, nothing persisted (FR-010/011).

### ReviewRequest (transient — never persisted)

Assembled per call by `review-prompt.ts`:

- `question`: level brief + design spec (functional/nonfunctional) + missions
  (required and bonus) — the same content surfaces the learner sees.
- `design`: serialized graph —
  - components: `displayName (catalog name, tech, category)` + learner note if any
  - flows: adjacency list of directed edges by display name
  - derived facts from existing services: node count, total cost/hr
- `constraints`: serialization cap 200 nodes (`422 design_too_large` above it).
- prompt order: static system rubric first, level question next, design last —
  byte-stable prefix for DeepSeek's automatic context caching (research R9, FR-014).

### AiConfig (process-level, from env)

| Env var | Default | Behavior |
|---|---|---|
| `DEEPSEEK_API_KEY` | — | absent → feature disabled (`ai_not_configured`) |
| `DEEPSEEK_MODEL` | `deepseek-flash` | default review model; cache-key participant |
| `DEEPSEEK_DEEP_MODEL` | `deepseek-v4-pro` | used when the request sets `deep: true` |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | |
| `DEEPSEEK_REASONING_EFFORT` | `high` | `high` \| `max` |
| `DEEPSEEK_TIMEOUT_MS` | `120000` | upstream abort |

## designHash canonicalization

`sha256` over a deterministic serialization of the design (research R5):

1. nodes → `{ componentId, displayName }[]` sorted by node id — **positions and notes
   excluded** (layout/annotation don't change the architecture being scored)
2. edges → `"sourceNodeId->targetNodeId"[]` sorted lexically
3. `JSON.stringify` of `{ nodes, edges }` → sha256 hex

Any node/edge/rename change ⇒ new hash ⇒ cache miss ⇒ fresh review.

## State transitions

```
(no review) ──POST──▶ in-flight ──success──▶ stored (cache hit for same hash)
                         │
                         ├─cancel/timeout/upstream error/invalid output──▶ (no review) + error code
                         └─second POST while running──▶ 409 ai_review_in_flight

stored ──design edited (hash changes)──▶ (no review for new hash; old rows remain as history)
stored ──POST force:true──▶ in-flight ──success──▶ stored (row replaced for that hash)
```

## Relationships

- `AiReview.levelId` → 001 level content (read-only).
- `AiReview.designHash` → derived from the 001 `Design` for that level at call time;
  reviews are content-addressed, deliberately **not** FK'd to `attempts` — a review can
  exist without a RUN and survives design edits as history.
- No changes to any feature-001 table.
