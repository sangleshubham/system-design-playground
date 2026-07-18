# Feature Specification: AI Design Scoring (DeepSeek Reasoning Review)

**Feature Branch**: `002-ai-design-scoring`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "Implement the DeepSeek API to score the system design. Model
to use: DeepSeek V4 Pro with reasoning. The model should get a question and the system I
designed as input and it will score my system design against real-world systems."

## Context

Feature 001 ships a deterministic rule engine behind `POST /api/v1/levels/:levelId/attempts`
(five dimensions, pass ≥ 90, unlocks levels, always < 5 s). Its plan explicitly reserved
room for this feature: *"LLM feedback may layer on later behind the same contract."*
This feature adds an **advisory AI review**: the level's challenge (the "question") and
the learner's saved design graph are sent to DeepSeek's reasoning model, which returns a
score, per-dimension commentary, and — the differentiator — a comparison against how
real-world production systems solve the same problem. The AI review never gates
progression; the rule engine remains the sole pass/fail authority.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Request an AI review of my level design (Priority: P1)

After building a design for a level (typically after RUN), the learner clicks
"AI Review". The system sends the level's challenge text, design spec, and the saved
design graph to the reasoning model and renders: an overall score (0–100), scores and
commentary per dimension, concrete strengths and gaps, and a "how real systems do it"
comparison naming realistic reference architectures. A "Deep review" option re-runs
the same request on the premium reasoning model (`deepseek-v4-pro`) when the learner
wants a stronger critique.

**Why this priority**: This is the entire requested capability; everything else refines it.

**Independent Test**: On `/playground/level-2` with a saved design and a configured API
key, click "AI Review" and receive a rendered review with score, dimensions, and a
real-world comparison section.

**Acceptance Scenarios**:

1. **Given** a saved non-empty design for an unlocked level and a configured DeepSeek key,
   **When** the learner requests an AI review, **Then** within the latency budget a review
   renders containing an overall score 0–100, at least 3 dimension entries with comments,
   at least 2 strengths, at least 2 gaps, and a real-world comparison narrative.
2. **Given** the review is in flight, **When** the learner waits, **Then** the UI shows a
   progress state (model is reasoning) and allows cancelling without breaking the page.
3. **Given** an empty canvas, **When** the learner requests a review, **Then** the request
   is refused locally with guidance to add components first (no tokens spent).

---

### User Story 2 - Reviews persist and repeat requests are free (Priority: P2)

A completed review is stored with the exact design it scored. Reopening the level (or
re-requesting a review for an unchanged design) shows the stored review instantly
without calling the paid API again. The learner can explicitly force a fresh review.

**Why this priority**: Reasoning calls are slow and metered; without caching the feature
is annoying and wasteful, but it still works without this story.

**Independent Test**: Request a review, reload the page, reopen the review — it appears
instantly; server logs show no second upstream call.

**Acceptance Scenarios**:

1. **Given** a stored review for the current design, **When** the learner requests a
   review again, **Then** the stored review is returned without an upstream API call.
2. **Given** a stored review, **When** the learner modifies the design and requests a
   review, **Then** a fresh upstream review is produced and stored alongside history.
3. **Given** a stored review, **When** the learner uses "Re-run review", **Then** a fresh
   upstream call is made even though the design is unchanged.

---

### User Story 3 - Graceful behavior when AI is unavailable (Priority: P3)

Without an API key (or when the provider errors/times out), the playground remains fully
usable: RUN, scoring, and unlocking all work; the AI review affordance explains why it is
unavailable instead of failing cryptically.

**Why this priority**: Protects the core loop of feature 001; the app must never regress
because an optional paid dependency is absent.

**Independent Test**: Unset the API key, restart the backend, click "AI Review" — a clear
"not configured" message appears; RUN still returns rule-engine results in < 5 s.

**Acceptance Scenarios**:

1. **Given** no `DEEPSEEK_API_KEY`, **When** a review is requested, **Then** the API
   responds with a distinct "not configured" error and the UI shows a friendly notice.
2. **Given** the upstream API times out or returns 5xx/429/402, **When** a review is
   requested, **Then** the UI shows a retryable, human-readable error and nothing is stored.
3. **Given** any AI failure, **When** the learner presses RUN, **Then** rule-based scoring
   and level unlocking behave exactly as in feature 001.

---

### Edge Cases

- Model returns malformed or non-JSON output → one automatic repair retry, then a clean
  failure (no partial review stored).
- Design exceeds the serialization cap (pathologically large graphs) → refuse with a
  clear message before spending tokens.
- Concurrent review requests for the same level → second request returns the in-flight
  result or is rejected as "already running" (no double spend).
- Level locked or unknown → same 423/404 semantics as attempts.
- Review requested while the design has unsaved changes → client flushes autosave first
  (same rule as RUN).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an AI review action for any unlocked level with a saved,
  non-empty design.
- **FR-002**: The review input MUST include the level's challenge ("question": brief,
  design spec, missions) and the saved design graph (components, names, connections).
- **FR-003**: The review MUST be produced by a DeepSeek reasoning model with
  thinking/reasoning enabled. The default model is `deepseek-v4-flash`; the learner
  MAY request a "deep review" that uses `deepseek-v4-pro` for a stronger critique.
  The model that produced each review MUST be recorded with it.
  *(Amended 2026-07-11: originally pinned to `deepseek-v4-pro` only; changed after
  verifying V4 Flash supports the same thinking mode at ~3× lower output cost.)*
- **FR-004**: The rendered review MUST include: overall score 0–100, per-dimension scores
  with commentary, strengths, gaps, a real-world systems comparison, and suggested next
  steps.
- **FR-005**: The AI review MUST be advisory only — it MUST NOT affect pass/fail,
  completion, unlocking, or best-score records from feature 001.
- **FR-006**: Reviews MUST be persisted with the design snapshot hash, model id, token
  usage, and latency; the latest review per level MUST be retrievable after reload.
- **FR-007**: A repeat request for an unchanged design MUST be served from storage with
  no upstream call; an explicit force flag MUST bypass the cache.
- **FR-008**: The API key MUST live only in backend environment configuration; it MUST
  never reach the browser, logs, or persisted data.
- **FR-009**: When unconfigured, the backend MUST report a distinct "not configured"
  status and the frontend MUST degrade gracefully.
- **FR-010**: Upstream failures (timeout, 402 balance, 429 rate limit, 5xx, malformed
  output after retry) MUST map to distinct, human-readable errors; failed reviews MUST
  NOT be persisted.
- **FR-011**: Model output MUST be schema-validated before storage/rendering; invalid
  output triggers exactly one repair retry.
- **FR-012**: The review UI MUST show an in-progress state with elapsed time and support
  cancellation.
- **FR-013**: An empty canvas MUST be rejected client- and server-side before any
  upstream call.
- **FR-014**: The model prompt MUST keep its static instruction prefix byte-stable
  across calls (rubric/schema first, level question next, design graph last) so the
  provider's automatic prefix caching reduces repeat input cost.

### Key Entities

- **AiReview**: A stored evaluation — level id, design hash, model id, reasoning effort,
  structured review payload (score, dimensions, strengths, gaps, real-world comparison,
  next steps), token usage, latency, created timestamp.
- **Review Request**: The assembled model input — challenge text, design spec, missions,
  serialized design graph; bounded in size; never stores the API key.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A review for a typical level design (≤ 50 nodes) completes in ≤ 120 s p95,
  with visible progress the entire time.
- **SC-002**: 100% of rendered reviews contain a numeric 0–100 score, ≥ 3 dimensions,
  ≥ 2 strengths, ≥ 2 gaps, and a non-empty real-world comparison.
- **SC-003**: Re-opening a review for an unchanged design renders in < 500 ms with zero
  upstream tokens spent.
- **SC-004**: With AI unconfigured or failing, RUN latency and behavior are unchanged
  from feature 001 (rule scoring < 5 s, unlocking intact).
- **SC-005**: A malformed-output episode ends in a clean, retryable error — never a
  stored partial review or a broken results dialog.

## Assumptions

- Single-user personal deployment (as feature 001); no per-user quotas or auth needed.
- The operator supplies their own DeepSeek API key and accepts per-review token cost
  (default flash reviews ≈ $0.003–0.005; opt-in deep reviews ≈ $0.01–0.02).
- Reviews target level designs; sandbox designs are out of scope for this feature
  (no level "question" exists there — a future feature may add user-supplied prompts).
- Network egress to `api.deepseek.com` is available from the backend host.
- The existing five rule dimensions stay authoritative; AI dimensions are allowed to
  differ (they describe architecture quality, not rule compliance).
