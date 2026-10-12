# Research: AI Design Scoring (DeepSeek Reasoning Review)

**Feature**: `002-ai-design-scoring` | **Date**: 2026-07-09

All facts below were verified against the live DeepSeek API documentation
(api-docs.deepseek.com via Context7) on 2026-07-09, because the model family
post-dates prior knowledge. Re-verified 2026-07-11 (flash thinking support,
reasoning-effort levels, automatic prefix caching) — R1/R5 updated and R9 added
per the owner's model-strategy decision.

## R1. Model & reasoning mode

- **Decision**: Default `deepseek-flash` with thinking enabled — request body
  `"thinking": {"type": "enabled"}` plus `"reasoning_effort": "high"`. A per-request
  "deep review" opt-in (`deep: true`) switches to `deepseek-v4-pro` with identical
  settings.
- **Rationale**: Owner decision 2026-07-11 (amends the original spec input, which
  pinned V4 Pro). Verified against live docs: V4 Flash supports the **same thinking
  mode**, 1M context, and 384K max output as V4 Pro, at ~3× lower output price
  ($0.28 vs $0.87 per 1M output tokens). Reviews are advisory, so the cheap
  reasoning model is the right default; Pro remains one click away for a stronger
  critique. Both models: reasoning output arrives in `message.reasoning_content`,
  the final answer in `message.content`; OpenAI-compatible wire format.
- **Alternatives considered**:
  - `deepseek-v4-pro` as sole model — original spec pin; best critique quality but
    ~3× the cost for every review; retained as the deep-review option instead.
  - `deepseek-reasoner` (V3.2 thinking mode) — superseded; rejected.
  - Anthropic/OpenAI models — out of scope; user specified DeepSeek.
- **Notes**: In thinking mode `temperature`, `top_p`, `presence_penalty`,
  `frequency_penalty` are ignored (documented no-ops) — omit them entirely.
  `reasoning_effort` supports only `high` / `max` — `low`/`medium` are mapped to
  `high` server-side, so effort tuning below `high` is **not** a cost lever;
  default `high` (configurable via `DEEPSEEK_REASONING_EFFORT`).

## R2. API access — plain fetch, no SDK

- **Decision**: Call `POST https://api.deepseek.com/chat/completions` with Node 22's
  native `fetch` + `AbortController`; `Authorization: Bearer $DEEPSEEK_API_KEY`.
  Non-streaming (`"stream": false`).
- **Rationale**: One endpoint, one call shape. Avoids adding the `openai` npm package
  for a single POST (Constitution III/IV: fixed stack, justified additions only).
  Non-streaming keeps the Express handler and tests simple; the UI needs a final
  document, not token-by-token rendering.
- **Alternatives considered**:
  - `openai` SDK pointed at DeepSeek's base URL — works (docs use it), but a new
    dependency solely for retries/typing we already get from zod + a 30-line client.
  - Streaming SSE to the browser — richer progress UX, but doubles complexity across
    both tiers; deferred until proven necessary (progress spinner + elapsed timer meets
    SC-001).

## R3. Structured output strategy

- **Decision**: Prompt-enforced JSON (system prompt pins an exact schema and
  "respond with a single JSON object, no markdown"), then defensive extraction:
  strip code fences if present → `JSON.parse` → validate with zod
  (`AiReviewPayloadSchema`). On failure, exactly one repair retry that echoes the
  parse error and demands schema-conformant JSON. `reasoning_content` is ignored for
  parsing (never contains the contract payload) and never persisted.
- **Rationale**: DeepSeek documents `response_format: {"type": "json_object"}` for
  **non-thinking** mode; the docs' feature matrix does not guarantee it in thinking
  mode, and this feature requires thinking. Prompt + validate + one retry is
  provider-behavior-proof and satisfies FR-011/SC-005.
- **Alternatives considered**:
  - `response_format: json_object` with thinking enabled — undocumented combination;
    silently relying on it risks breakage on provider updates.
  - Two-pass (reason in call 1, format in cheap call 2) — 2× latency and cost; rejected.
  - Tool-call extraction — tool calls are also listed for non-thinking mode; rejected.

## R4. Synchronous request vs. background job

- **Decision**: Synchronous `POST /api/v1/levels/:levelId/ai-review` with a 120 s
  upstream abort (configurable), client-side cancel, and a per-level in-flight guard
  (second concurrent request → `409`).
- **Rationale**: Single-user deployment (001 constraint); a job queue + polling adds
  states, tables, and endpoints with zero benefit at N=1. Express 5 handles a long
  async handler fine; the existing `<5 s` guarantee applies to `/attempts`, which is
  untouched.
- **Alternatives considered**: 202 + poll endpoint, SSE progress channel — both
  deferred; the contract leaves room (a future `status` field) without breaking.

## R5. Caching & cost control

- **Decision**: Persist every successful review in SQLite keyed by
  `(levelId, designHash, model)` where `designHash = sha256` of a canonicalized
  design graph (sorted nodes: id/componentId/displayName; sorted edges:
  source→target; notes excluded). Cache hit → return stored review, zero upstream
  spend. `force: true` bypasses. Failed calls are never stored.
- **Rationale**: FR-006/007, SC-003. Reasoning calls cost real money and tens of
  seconds; the design graph is small and canonically hashable. Notes are excluded
  from the hash because they don't change the architecture being scored — but they
  ARE included in the prompt when present (they may carry design intent).
- **Alternatives considered**: TTL cache (wrong tool — designs are content-addressed,
  not time-sensitive); caching in memory only (lost on restart, violates FR-006).
- **Cost estimate** (docs pricing, 2026-07): output dominates — reasoning bills as
  output. V4 Flash $0.28/M output ⇒ a default review (≈ 3–5K prompt + 1–8K output)
  costs **≈ $0.003–0.005**; V4 Pro $0.87/M output ⇒ a deep review costs
  **≈ $0.01–0.02**. Flash and Pro reviews for the same design coexist as separate
  rows because `model` is part of the cache key.

## R6. Secrets & configuration

- **Decision**: Backend-only env vars, read once at startup into a typed config:
  `DEEPSEEK_API_KEY` (required to enable the feature), `DEEPSEEK_MODEL`
  (default `deepseek-v4-pro`), `DEEPSEEK_BASE_URL` (default
  `https://api.deepseek.com`), `DEEPSEEK_REASONING_EFFORT` (default `high`),
  `DEEPSEEK_TIMEOUT_MS` (default `120000`). Missing key → feature reports
  `503 ai_not_configured`; a config probe field lets the frontend hide/disable the
  button. The key never appears in logs, errors, responses, or the DB.
- **Rationale**: FR-008/009; standard twelve-factor handling; keeps the frontend
  bundle secret-free by construction.
- **Alternatives considered**: key in SQLite settings table (worse: backup leakage,
  needs UI); frontend-supplied key per request (violates FR-008 outright).

## R7. Prompt & rubric design

- **Decision**: Two-message prompt.
  - **System**: role ("principal engineer grading a system-design exercise"), the
    fixed JSON schema, the scoring rubric — five AI dimensions:
    `requirements-fit`, `scalability`, `reliability`, `efficiency`, `operability`
    — each 0–100 with weight documented in the payload, and the instruction to compare
    the design against real-world production reference architectures for the same
    problem class (name concrete, realistic patterns/stacks; no fabricated vendors).
  - **User**: the level "question" (brief, design spec, missions incl. bonus) + the
    serialized design: component list (display name, catalog component, tech,
    category, learner note) and adjacency list of directed edges, plus derived facts
    the rule engine already computes (total cost/hr, node count) to anchor numbers.
- **Rationale**: FR-002/004; the model sees exactly what the learner saw plus what
  they built. Derived facts reduce hallucinated arithmetic. Graph ≤ 50 nodes
  serializes to ~1–3K tokens — negligible against a 1M context; cap serialization at
  200 nodes (FR edge case) as a sanity guard.
- **Alternatives considered**: sending raw canvas JSON (wasteful, coordinates are
  noise); image/screenshot input (V4 Pro is text-only per docs: `"input": ["text"]`).

## R8. Error taxonomy mapping

- **Decision**: Upstream → API error mapping (all with stable `code` strings):
  missing key → `503 ai_not_configured`; abort/timeout → `504 ai_timeout`;
  DeepSeek 401 → `502 ai_auth_failed` (operator problem, not client);
  402 → `502 ai_out_of_credit`; 429 → `503 ai_rate_limited` (retryable);
  5xx/network → `502 ai_upstream_error`; schema-invalid after retry →
  `502 ai_malformed_output`. Concurrent duplicate → `409 ai_review_in_flight`;
  empty design → `422 design_empty`; locked/unknown level → `423`/`404` (as 001).
- **Rationale**: FR-010, SC-005; distinct codes let the UI choose retry vs. configure
  vs. wait messaging without string matching.

## R9. Upstream prompt-prefix caching

- **Decision**: Order every prompt as [static system rubric + JSON schema] →
  [level question] → [serialized design last], and keep the system message
  byte-identical across calls (no timestamps, request ids, or other per-call values
  in the prefix).
- **Rationale**: DeepSeek's context caching is fully automatic — no code, flags, or
  cache-control API — but a hit requires an **identical prefix starting from token
  0**; partial matches mid-input never hit. With this ordering, every review after
  the first pays cache-hit input pricing ($0.0028–0.003625/M) on the rubric, and
  repeat reviews of the same level also hit on the question — only the design graph
  is fresh input. Honest sizing: input is only ~3–5K tokens (~$0.001–0.002
  cache-miss), so this saves fractions of a cent per call; output/reasoning tokens
  dominate cost, and the design-hash cache (R5) remains the primary cost control.
  The ordering costs nothing, so it is mandated anyway (FR-014).
- **Alternatives considered**: explicit cache-control (Anthropic-style breakpoints)
  — does not exist on DeepSeek; nothing to configure. Putting the design before the
  question — strictly worse for cache locality, no benefit.
