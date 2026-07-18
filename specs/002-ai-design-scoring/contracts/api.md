# API Contract: AI Design Scoring

**Feature**: `002-ai-design-scoring` | Base path: `/api/v1` (versioned, per constitution IV)

Feature 001 endpoints are unchanged. Two new operations on one resource:

## POST /api/v1/levels/:levelId/ai-review

Produce (or fetch from cache) an AI review of the level's **saved** design — the client
flushes autosave first, same rule as RUN.

**Body** (all optional):

```json
{ "force": false, "deep": false }
```

- `force: true` → bypass the design-hash cache and re-call the model, replacing the
  stored review for this exact design.
- `deep: true` → use the deep-review model (`DEEPSEEK_DEEP_MODEL`, default
  `deepseek-v4-pro`) instead of the default (`deepseek-v4-flash`). The cache lookup
  uses the selected model, so a flash review and a pro review of the same design
  coexist as separate rows.

**200** — review (cached or fresh; `cached` tells which):

```json
{
  "review": {
    "id": "a1b2…",
    "levelId": "level-2",
    "designHash": "9f3c…",
    "model": "deepseek-v4-flash",
    "reasoningEffort": "high",
    "createdAt": "2026-07-09T12:00:00.000Z",
    "payload": {
      "score": 78,
      "verdict": "Solid 3-tier core; resilience and observability are the gaps.",
      "dimensions": [
        { "name": "requirements-fit", "score": 85, "comment": "…" },
        { "name": "scalability",      "score": 75, "comment": "…" },
        { "name": "reliability",      "score": 60, "comment": "…" },
        { "name": "efficiency",       "score": 88, "comment": "…" },
        { "name": "operability",      "score": 55, "comment": "…" }
      ],
      "strengths": ["…", "…"],
      "gaps": ["…", "…"],
      "realWorldComparison": {
        "referenceArchitecture": "Classic production 3-tier: ALB → autoscaled stateless app fleet → primary/replica PostgreSQL with a Redis look-aside cache…",
        "matches": ["…"],
        "differences": ["…"]
      },
      "nextSteps": ["…"]
    },
    "usage": { "promptTokens": 3120, "completionTokens": 4480, "latencyMs": 41250 }
  },
  "cached": false
}
```

**Errors** (`{ "error": { "code": string, "message": string } }`):

| Status | `code` | When | UI treatment |
|---|---|---|---|
| 404 | `level_not_found` | unknown level | as 001 |
| 423 | `level_locked` | locked level | as 001 |
| 422 | `design_empty` | saved design has no nodes | "add components first" |
| 422 | `design_too_large` | > 200 nodes | trim design |
| 409 | `ai_review_in_flight` | same level already running | show existing progress |
| 503 | `ai_not_configured` | no `DEEPSEEK_API_KEY` | hide/disable button + notice |
| 503 | `ai_rate_limited` | upstream 429 | retryable notice |
| 502 | `ai_auth_failed` | upstream 401 | "check server API key" |
| 502 | `ai_out_of_credit` | upstream 402 | "top up DeepSeek balance" |
| 502 | `ai_upstream_error` | upstream 5xx / network | retryable notice |
| 502 | `ai_malformed_output` | invalid JSON after 1 repair retry | retryable notice |
| 504 | `ai_timeout` | exceeded `DEEPSEEK_TIMEOUT_MS` | retryable notice |

**Guarantees**: never affects attempts/completion/unlocking (FR-005); failed calls
persist nothing (FR-010); at most one upstream call in flight per level (R4); response
time ≤ timeout + small overhead, p95 ≤ 120 s (SC-001).

## GET /api/v1/levels/:levelId/ai-review

Latest stored review for the level's **current** saved design, plus availability info —
lets the UI restore state after reload without spending tokens.

**200**:

```json
{
  "available": true,            // false ⇒ ai_not_configured
  "models": { "default": "deepseek-v4-flash", "deep": "deepseek-v4-pro" },
  "review": { …same shape as POST, or null… },
  "stale": false                // true ⇒ stored review exists but design changed since
}
```

- `review` is the newest row matching `(levelId, currentDesignHash)` across both
  configured models (default and deep reviews coexist; newest wins); if none,
  `review: null` and `stale: true` when older reviews exist for other hashes.
- 404/423 as above. Never calls upstream.

## Upstream contract (backend → DeepSeek, for reference)

`POST {DEEPSEEK_BASE_URL}/chat/completions`, `Authorization: Bearer <key>`:

```json
{
  "model": "deepseek-v4-flash",
  "messages": [
    { "role": "system", "content": "<rubric + JSON schema + real-world comparison instruction>" },
    { "role": "user", "content": "<question + serialized design + derived facts>" }
  ],
  "thinking": { "type": "enabled" },
  "reasoning_effort": "high",
  "stream": false
}
```

Response handling: parse `choices[0].message.content` (strip fences → JSON.parse → zod);
`message.reasoning_content` is discarded; `usage` mapped to `promptTokens`/
`completionTokens`. Sampler params (`temperature` etc.) are omitted — no-ops in thinking
mode (research R1/R3). `deep: true` swaps `model` to the configured deep model
(`deepseek-v4-pro`); everything else is identical. The system message is byte-stable and
the prompt is ordered [rubric → question → design] so DeepSeek's automatic prefix
caching applies to repeat calls (research R9, FR-014).
