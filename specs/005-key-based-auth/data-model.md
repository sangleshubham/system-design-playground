# Data Model: Key-Based Authentication & Design Sharing

**Feature**: `005-key-based-auth` | **Date**: 2026-07-18
**Sources**: spec.md (Key Entities, FR-003…FR-012), research.md (R1, R2, R4, R5, R6)

## Entity overview

```text
Workspace 1 ──── * Design      (sandbox rows: level_id NULL; level rows: one per level)
Workspace 1 ──── * Attempt
Workspace 1 ──── 1 Progress
Workspace 1 ──── * AiReview
AccessKey (client-side / transient) ──hash──> Workspace.key_hash
DeviceSession (client-side only, localStorage) ── holds one raw AccessKey
```

The **Access Key** itself is never a server-side entity: the server stores only its
SHA-256 hash on the workspace row (research R2). The **Device Session** lives entirely
in the browser (`localStorage['sdp.accessKey']`) and has no server representation.

## New entity: Workspace

One row per issued key. Owns all user-specific data (spec Clarifications 2026-07-18).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | `randomUUID()` — internal identifier, never shown to users |
| `key_hash` | TEXT | NOT NULL, UNIQUE | hex `sha256(normalizedKey)`; the auth lookup index |
| `created_at` | TEXT | NOT NULL | ISO-8601 |
| `last_used_at` | TEXT | NOT NULL | ISO-8601; touched (throttled to ≥1/min) by the auth middleware |

**Validation rules**
- The *normalized key* hashed into `key_hash` is exactly 12 Crockford Base32 characters
  (`^[0-9A-HJKMNP-TV-Z]{12}$`). Normalization (research R1): uppercase, strip `-` and
  spaces, map `O→0`, `I→1`, `L→1`.
- Presented keys failing the shape check are rejected *before* hashing (cheap 401, still
  counted by the rate limiter).

**Lifecycle**: created by `POST /auth/keys`; never expires, never deleted (FR-009).
No state transitions. Workspace deletion is explicitly out of scope (spec Outstanding).

## Modified entity: Design

| Column | Type | Change | Notes |
|---|---|---|---|
| `id` | TEXT | unchanged | PRIMARY KEY, `randomUUID()` |
| `workspace_id` | TEXT | **new** — NOT NULL, REFERENCES `workspaces(id)` | owner |
| `level_id` | TEXT | constraint change | was `UNIQUE`; now `UNIQUE (workspace_id, level_id)` — one level canvas *per workspace* |
| `name` | TEXT | unchanged | sandbox rows only |
| `document` | TEXT | unchanged | whole-graph JSON, written atomically per save (SC-005) |
| `updated_at` | TEXT | unchanged | doubles as the optimistic-concurrency token (research R6) |

**Concurrency rule (FR-011)**: a mutating request carrying `baseUpdatedAt ≠ updated_at`
is rejected with 409 `stale_write` and the current row; a request without
`baseUpdatedAt`, or whose value matches, writes and refreshes `updated_at`
(last-write-wins).

**Indexes**: `idx_designs_workspace_sandbox ON designs (workspace_id, updated_at DESC)`
for the sandbox list; the composite UNIQUE covers level lookups.

## Modified entity: Attempt

| Column | Type | Change |
|---|---|---|
| `id` | TEXT | unchanged (PRIMARY KEY) |
| `workspace_id` | TEXT | **new** — NOT NULL, REFERENCES `workspaces(id)` |
| `level_id` | TEXT | unchanged |
| `payload` | TEXT | unchanged (JSON: scores, feedback, design snapshot) |
| `created_at` | TEXT | unchanged |

**Index change**: `idx_attempts_level (level_id)` → `idx_attempts_ws_level
(workspace_id, level_id)`. Best-score-per-level stays derived, now per workspace.

## Modified entity: Progress

Was a singleton (`id = 1 CHECK`); becomes one row per workspace.

| Column | Type | Change |
|---|---|---|
| `workspace_id` | TEXT | **new** — PRIMARY KEY, REFERENCES `workspaces(id)` (replaces `id INTEGER CHECK (id = 1)`) |
| `unlocked_through_order` | INTEGER | unchanged |
| `last_touched_level_id` | TEXT | unchanged |
| `completed_level_ids` | TEXT | unchanged (JSON array) |

**Seeding rule**: first read for a workspace with no row inserts the same defaults the
old singleton used (research R10). No UI change — the map simply starts fresh per key.

## Modified entity: AiReview

| Column | Type | Change |
|---|---|---|
| `workspace_id` | TEXT | **new** — NOT NULL, REFERENCES `workspaces(id)` |
| *(all other columns)* | | unchanged |

**Uniqueness change**: `UNIQUE (level_id, design_hash, model)` →
`UNIQUE (workspace_id, level_id, design_hash, model)`. The content-addressed review
cache is per-workspace (research R4): identical designs in different workspaces get
independent reviews and histories (FR-010 visibility).

**Index change**: `idx_ai_reviews_level (level_id, created_at DESC)` →
`(workspace_id, level_id, created_at DESC)`.

## Client-side state (no server tables)

| Item | Where | Rules |
|---|---|---|
| Raw access key | `localStorage['sdp.accessKey']` | written on create/enter (FR-005); removed by "Switch key" and by 401 `invalid_key`; never written to URLs (FR-012) |
| In-memory session | `KeyService` signal | hydrated from localStorage at bootstrap; drives `keyGuard` routing |

## Migration (research R5)

- Schema version stamped via `PRAGMA user_version = 2`.
- On open: `user_version < 2` **and** legacy tables present → `DROP TABLE` the four
  user-data tables, recreate at v2. Fresh files are created directly at v2.
- Sanctioned by spec Assumptions: no production data exists; dev data is disposable.
- `foreign_keys = ON` is already set in `createDatabase` — FK references above are
  enforced.

## Repository/service signature impact (summary for tasks phase)

| Unit | Change |
|---|---|
| `DesignRepo` | every method gains leading `workspaceId: string`; level upsert keys on `(workspace_id, level_id)`; mutating methods accept optional `baseUpdatedAt` and report staleness |
| `AttemptRepo` | leading `workspaceId` on insert/list |
| `ProgressRepo` | keyed by `workspace_id`; lazy seed on first read |
| `AiReviewRepo` | `workspaceId` joins the upsert conflict key and all lookups |
| `WorkspaceRepo` (**new**) | `create()`, `findByKeyHash()`, `touchLastUsed()` |
| `ProgressService`, `AiReviewService`, `MissionService` | thread `workspaceId` through from `res.locals` |
| `DbContext` | gains `workspaces: WorkspaceRepo` |
