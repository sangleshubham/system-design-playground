# Quickstart: AI Design Scoring — Validation Guide

**Feature**: `002-ai-design-scoring`
Contracts: [contracts/api.md](./contracts/api.md) · Data model: [data-model.md](./data-model.md)

## Prerequisites

- Feature 001 running locally (backend :3000, frontend :8000 via `proxy.conf.json`)
- A DeepSeek API key with balance (platform.deepseek.com)
- A saved, non-empty design on an unlocked level (e.g. `level-2`)

```bash
export DEEPSEEK_API_KEY=sk-…          # required; feature is disabled without it
# optional overrides:
# export DEEPSEEK_MODEL=deepseek-v4-flash       # default review model
# export DEEPSEEK_DEEP_MODEL=deepseek-v4-pro    # used when POST body has deep:true
# export DEEPSEEK_REASONING_EFFORT=high
# export DEEPSEEK_TIMEOUT_MS=120000
(cd backend && npm run dev)
(cd frontend && npm start)            # ng serve --port 8000, proxied to :3000
```

## V1 — Fresh review (US1, SC-001/SC-002)

```bash
time curl -s -X POST http://localhost:3000/api/v1/levels/level-2/ai-review \
  -H 'Content-Type: application/json' -d '{}' | tee /tmp/review.json | \
  python3 -c "import json,sys; r=json.load(sys.stdin)['review']['payload']; \
print(r['score'], len(r['dimensions']), len(r['strengths']), len(r['gaps']), bool(r['realWorldComparison']['referenceArchitecture']))"
```

**Expected**: completes ≤ 120 s; prints an int 0–100, `5`, ≥ `2`, ≥ `2`, `True`.
In the UI: playground → "AI Review" shows a progress state with elapsed time, then the
rendered review with the real-world comparison section.

## V2 — Cache hit (US2, SC-003)

Re-run the same command **without changing the design**:

**Expected**: returns in < 500 ms with `"cached": true`; backend log shows no upstream
call. Then edit the design (add any node), save, re-run → `"cached": false`, new review.
`{"force": true}` on an unchanged design also produces `"cached": false`.
`{"deep": true}` produces a fresh `deepseek-v4-pro` review (its own cache row —
`review.model` confirms); repeating `{"deep": true}` unchanged is then cached too.

## V3 — Restore after reload (US2)

```bash
curl -s http://localhost:3000/api/v1/levels/level-2/ai-review | python3 -m json.tool | head
```

**Expected**: `available: true`, `review` non-null for the current design; reload the
playground page — the review re-renders without a new upstream call.

## V4 — Graceful degradation (US3, SC-004)

```bash
unset DEEPSEEK_API_KEY   # restart backend afterwards
curl -s -X POST http://localhost:3000/api/v1/levels/level-2/ai-review -d '{}' \
  -H 'Content-Type: application/json'
```

**Expected**: `503 {"error":{"code":"ai_not_configured",…}}`; GET returns
`available: false`; the UI shows the not-configured notice; **RUN still scores in < 5 s
and unlocking works** (feature 001 unaffected).

## V5 — Guards (FR-013, edge cases)

- Empty canvas: reset the design → POST → `422 design_empty`, no tokens spent.
- Concurrency: fire two POSTs in parallel → second gets `409 ai_review_in_flight`.
- Locked level: POST to a locked level id → `423`.

## V6 — Automated tests (no live API)

```bash
(cd backend && npm test)     # ai-review route/service tests run against a stubbed client:
                             # success, malformed-output retry→502, timeout→504,
                             # 401/402/429 mapping, cache hit, in-flight 409, hash canonicalization
(cd frontend && npm test)    # review-panel smoke tests: idle/running/review/error/not-configured
```

**Expected**: all green; no test requires `DEEPSEEK_API_KEY`.

## Cost note

Each fresh review ≈ 3–5K prompt + 1–8K completion tokens: **≈ $0.003–0.005** on the
default `deepseek-v4-flash`, **≈ $0.01–0.02** for a `deep: true` review on
`deepseek-v4-pro` (research R5). Repeat calls also hit DeepSeek's automatic prefix
cache on the static rubric/question portion of the prompt (R9). V1+V2 above spend
for exactly one review.
