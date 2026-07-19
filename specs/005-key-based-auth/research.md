# Research: Key-Based Authentication & Design Sharing

**Feature**: `005-key-based-auth` | **Date**: 2026-07-18

All decisions below resolve the open technical questions for the spec's requirements
(FR-001 … FR-012). No NEEDS CLARIFICATION markers remain.

## R1. Key format: 12-character Crockford Base32, displayed as `XXXX-XXXX-XXXX`

**Decision**: Generate keys server-side as 12 characters drawn from the Crockford
Base32 alphabet (`0-9`, `A-Z` excluding `I`, `L`, `O`, `U`), from `crypto.randomBytes`.
Display and share grouped as `XXXX-XXXX-XXXX` (14 characters including hyphens — the
SC-003 ceiling). Entry is case-insensitive; hyphens/spaces are stripped; `o/O → 0` and
`i/I/l/L → 1` are normalized per Crockford's decode rules, so a key read aloud or
hand-typed survives the round trip.

**Rationale**:
- 12 base32 chars = 60 bits of entropy ≈ 1.15 × 10¹⁸ possible keys. Even at 1,000,000
  active workspaces and an attacker guessing at the full allowed rate (R7: 10
  attempts/min ≈ 5.26M/year), the chance of hitting *any* valid key in a year is
  ~0.00046% — under the SC-004 ceiling of 0.001% with two orders of magnitude to spare
  at realistic scale (≤10k workspaces: ~0.0000046%).
- Crockford's alphabet exists precisely for the "read aloud, type on first attempt"
  requirement (SC-003): no ambiguous glyphs, defined normalization for the ones humans
  confuse anyway.
- `crypto.randomBytes` is a CSPRNG in Node's standard library — no new dependency.

**Alternatives considered**:
- **Raw SHA-256 hex (the original suggestion)**: 64 characters — violates SC-003
  (≤14 chars). Rejected as the *user-facing* key; SHA-256 is used server-side instead
  (R2), which honors the intent (cryptographic strength) where it belongs.
- **UUIDv4**: 36 characters, mixed alphabet — too long to relay verbally.
- **8-char nanoid (~41 bits)**: fits in 8 chars but at 1M workspaces the yearly guess
  probability rises to ~2.4%, three orders of magnitude over SC-004. Rejected.
- **Word-based phrases (`correct-horse-…`)**: memorable but 20+ characters. Rejected.

## R2. Server-side key storage: SHA-256 hash only, never the raw key

**Decision**: The server persists only `sha256(normalizedKey)` (hex) as the workspace's
`key_hash`. Lookup on every request hashes the presented key and does an indexed
equality match. The raw key exists server-side only transiently in the create-key
response.

**Rationale**:
- The key is a bearer credential; storing it hashed means a leaked database does not
  leak working credentials — the standard API-token pattern.
- A *fast* hash (SHA-256, not bcrypt/argon2) is appropriate here because keys carry 60
  bits of CSPRNG entropy — offline brute force of 2⁶⁰ SHA-256 preimages is not a
  realistic threat, and per-request key-derivation cost (bcrypt at ~100ms) would
  violate the perceived-latency budget (Constitution II) on every API call.
- Deterministic hashing (no salt) is required anyway: the hash *is* the lookup index.

**Alternatives considered**:
- **Store raw keys**: simpler to debug, but any DB read (backup, log, SQL browser)
  exposes every user's credential. Rejected.
- **bcrypt/argon2 per request**: unnecessary for high-entropy tokens; adds ~100ms per
  API call. Rejected.

## R3. Key transport: `X-Access-Key` request header via an Angular interceptor

**Decision**: Every API request except `/health` and `POST /auth/keys` carries the raw
key in an `X-Access-Key` header. A dedicated Angular HTTP interceptor
(`key.interceptor.ts`) attaches it from the stored session; the backend auth middleware
validates it. Keys never appear in URLs, query strings, or request/response logs
(the existing `requestLogger` logs method + path + status only — verified).

**Rationale**:
- FR-012 forbids keys in URLs. Headers don't land in browser history, server access
  logs, or `Referer` headers.
- A custom header (vs `Authorization: Bearer`) makes the scheme self-describing,
  avoids implying OAuth/JWT semantics to future readers, and is trivially greppable.
- The interceptor pattern is already established in the codebase
  (`core/http-error.interceptor.ts`), so this follows existing convention.

**Alternatives considered**:
- **`Authorization: Bearer <key>`**: equally sound; rejected only to avoid signaling a
  token-issuing auth server that doesn't exist.
- **Cookie**: automatic attachment is convenient but adds CSRF surface and complicates
  the explicit "enter key on another device" flow. Rejected.
- **Key in URL path/query**: violates FR-012 outright. Rejected.

## R4. Workspace scoping: `workspace_id` column on all four user-data tables

**Decision**: New `workspaces` table (`id`, `key_hash` UNIQUE, `created_at`,
`last_used_at`). Add `workspace_id TEXT NOT NULL REFERENCES workspaces(id)` to
`designs`, `attempts`, `progress`, and `ai_reviews`. Constraint changes:
- `designs.level_id UNIQUE` → `UNIQUE (workspace_id, level_id)`
- `progress` singleton (`id = 1 CHECK`) → `PRIMARY KEY (workspace_id)`
- `ai_reviews UNIQUE (level_id, design_hash, model)` →
  `UNIQUE (workspace_id, level_id, design_hash, model)`
Every repository method gains a `workspaceId` parameter; the auth middleware resolves
it once per request and hands it to routes via `res.locals`.

**Rationale**: The clarified spec says the key owns *everything* user-specific
(Clarifications, 2026-07-18). Scoping at the table level with composite uniqueness is
the smallest change that makes cross-workspace leakage structurally impossible rather
than a per-query discipline.

**Alternatives considered**:
- **Scope only designs; leave progress/attempts global**: contradicted by the
  clarification. Rejected.
- **Separate SQLite file per workspace**: strong isolation but breaks better-sqlite3's
  single-connection simplicity, WAL handling, and the injected-DB test pattern. Rejected.
- **Keep `ai_reviews` global as a content-addressed cache**: marginally better cache
  hit rate, but FR-010 gives shared-key users "visibility into the workspace's AI
  review history", which requires per-workspace listing; a global cache also leaks
  review timing across workspaces. Rejected.

## R5. Schema migration: `PRAGMA user_version` bump with dev-data reset

**Decision**: Stamp the schema version with `PRAGMA user_version = 2`. On open, if the
database file reports `user_version < 2` **and** contains the old (unscoped) tables,
drop and recreate them. Fresh databases are created directly at version 2.

**Rationale**: The spec's Assumptions state there is no production data and development
data may be reset. A drop-and-recreate keeps `initSchema` idempotent and avoids
building a column-backfill migration for data that is explicitly disposable.

**Alternatives considered**:
- **ALTER TABLE + backfill into a "legacy" workspace**: preserves dev data and gives
  the old anonymous data a home, but invents a workspace nobody holds the key to.
  Rejected as scope creep for disposable data.
- **A migrations framework (e.g., knex, drizzle)**: new dependency prohibited-by-default
  under Constitution III for a one-time reset. Rejected.

## R6. Concurrency: last-write-wins with a `baseUpdatedAt` precondition and 409

**Decision**: Design-mutating endpoints (`PUT /levels/:levelId/design`,
`PUT /sandbox/designs/:id`) accept an optional `baseUpdatedAt` field — the `updatedAt`
the client loaded. If it is present and differs from the stored row's `updated_at`, the
server rejects with **409** and envelope
`{ error: { code: 'stale_write', message: … }, current: <the winning design> }`.
The client shows the FR-011 warning ("someone saved a newer version — overwrite or
reload?"); "overwrite" resends the save with the *current* `updatedAt` as the new
precondition (or omits it to force). Requests without `baseUpdatedAt` write
unconditionally, preserving pure last-write-wins as the floor. Each save is a single
synchronous better-sqlite3 statement, so writes are atomic — no torn documents (SC-005).

**Rationale**: `updated_at` already exists on every design row, so the precondition
needs no schema change. Optimistic concurrency detection is the cheapest mechanism that
turns silent overwrites into the mandated warning while keeping the backend stateless.

**Alternatives considered**:
- **HTTP `ETag`/`If-Match`**: the standards-correct spelling, but the app's existing
  contracts put document metadata in JSON bodies, and ETags complicate the Angular
  client for zero user-visible gain here. Rejected for consistency.
- **Integer version counter**: equivalent semantics but adds a column when a suitable
  timestamp already exists. Rejected.
- **Exclusive edit locks / real-time sync**: explicitly rejected in spec clarification
  (Session 2026-07-18).

## R7. Rate limiting: hand-rolled in-memory fixed-window limiter, no new dependency

**Decision**: A small middleware (`http/rate-limit.ts`, ~40 lines) keeps a
`Map<ip, {count, windowStart}>` and enforces per-IP limits: **10 failed key
validations per minute** (401s on any authenticated route and on `GET /auth/session`)
and **5 key creations per minute** (`POST /auth/keys`). Exceeding the limit returns
**429** with envelope code `rate_limited`. Successful validations do not count against
the window. The map is pruned lazily on access.

**Rationale**:
- Feeds directly into the SC-004 math (R1): 10/min is the "maximum rate the system
  allows".
- Constitution III requires each new library to be justified; ~40 lines of testable
  TypeScript beats importing `express-rate-limit` for one counter on a single-node app.
- In-memory state is acceptable because the deployment target is one Node process
  (Technical Context: single-node); a restart resetting counters is harmless.

**Alternatives considered**:
- **`express-rate-limit`**: battle-tested, but a dependency for a Map and a clock.
  Rejected under Constitution III minimalism.
- **Redis-backed limiter**: multi-node correctness the deployment doesn't need. Rejected.
- **CAPTCHA / lockout**: spec Assumptions explicitly exclude additional factors.

## R8. Frontend session: localStorage + signal-based `KeyService`, route guard, welcome gate

**Decision**:
- `core/key.service.ts` owns the session: reads `localStorage['sdp.accessKey']` at
  startup into an Angular signal, exposes `key()`, `hasKey()`, `setKey()`, `clear()`.
- A `keyGuard` (`CanActivate` on every existing route) redirects to `/welcome` when no
  key is stored (FR-001/FR-002).
- New lazy `/welcome` route hosts the choice screen: **Create a new key** (calls
  `POST /auth/keys`, shows the key once with copy button + "I saved my key"
  acknowledgement per FR-004) and **I have a key** (input with live normalization,
  validated via `GET /auth/session`; unknown key → inline error per FR-007).
- The interceptor clears the session and redirects to `/welcome` only on a 401 whose
  envelope code is `invalid_key` (never on network failures — the spec's
  backend-unreachable edge case shows a retryable error instead).
- A "Switch key" affordance in the shared shell forgets the stored key (FR-005) without
  touching server data.

**Rationale**: localStorage is the spec's "browser remembers the key" (FR-005) — it
survives restarts, is origin-scoped, and is the only client-side persistence the app
already uses conceptually (theme service). Signals match the Angular 20 codebase style.
Guard + lazy `/welcome` keeps the gate out of every feature bundle (Constitution IV/V).

**Alternatives considered**:
- **sessionStorage**: dies with the tab — breaks "later visits go straight in" (US1).
- **IndexedDB**: capability overkill for one string. Rejected.
- **Storing only a session cookie set by the server**: contradicts R3's cookie
  rejection. Rejected.

## R9. Auth API surface: two endpoints, everything else middleware

**Decision**: The feature adds exactly two endpoints under `/api/v1/auth`:
- `POST /auth/keys` → 201 `{ key, createdAt }` — creates a workspace; the **only**
  response that ever contains a raw key. Public (no key required), rate-limited (R7).
- `GET /auth/session` → 200 `{ createdAt, lastUsedAt }` with a valid `X-Access-Key`,
  401 `invalid_key` otherwise — the "does this key work?" probe used by the welcome
  page and by returning devices. Failed attempts count toward the rate limit.
All other `/api/v1/*` routes (everything except `/health` and `/auth/keys`) sit behind
the auth middleware and return 401 `invalid_key` without a valid key. Static learning
content (`/components`, `/levels/:id` metadata, `/map` structure) is intentionally
behind the key too: `/map` already merges per-user progress, and a single uniform rule
("no key, no API") is simpler to enforce and test than a public/private split.

**Rationale**: Smallest API surface that satisfies FR-001–FR-008; uniform middleware
placement makes "which routes are protected" a one-line answer (Constitution II
simplicity, IV contract clarity).

**Alternatives considered**:
- **Dedicated `POST /auth/keys/validate` with the key in the body**: works, but
  duplicates what the middleware already does and creates a second code path where raw
  keys transit request bodies. `GET /auth/session` reuses the standard header path.
  Rejected.
- **Leaving read-only content endpoints public**: viable, but creates a per-route
  protection matrix to document and test for zero user value (the SPA always has a key
  once past the gate). Rejected.

## R10. AI review + attempts flows under scoping

**Decision**: `ai-review`, `attempts`, `progress`, `levels`, `map`, and `sandbox`
routes all read `workspaceId` from `res.locals` (set by the middleware) and pass it to
repos/services. `AiReviewService`'s cache lookup key becomes
`(workspaceId, levelId, designHash, model)`. `ProgressService` seeds a fresh progress
row per workspace on first read (same defaults the singleton used).

**Rationale**: Mechanical consequence of R4; recorded so the tasks phase can enumerate
touch points: `deps.ts` stays unchanged, route files and repo signatures change,
`content.service.ts` (static seed data) does not.

**Alternatives considered**: none — follows from R4/R9.
