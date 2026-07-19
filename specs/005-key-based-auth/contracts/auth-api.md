# Contract: Auth API

**Feature**: `005-key-based-auth` | Base path: `/api/v1` | Style: JSON over REST
**Error envelope** (unchanged, from `http/http-error.ts`): `{ "error": { "code": string, "message": string } }`

## Authentication scheme

Every `/api/v1/*` request **except** `GET /health` and `POST /auth/keys` MUST carry:

```
X-Access-Key: <raw key, any accepted form>
```

Accepted forms: with or without hyphens/spaces, any case, Crockford aliases
(`o→0`, `i/l→1`). The server normalizes, shape-checks
(`^[0-9A-HJKMNP-TV-Z]{12}$` after normalization), hashes, and resolves the workspace.

| Failure | Status | `error.code` |
|---|---|---|
| Header missing, malformed, or key unknown | 401 | `invalid_key` |
| Too many failed validations from this IP (>10/min) | 429 | `rate_limited` |

Keys MUST never appear in URLs, query strings, or log lines (FR-012). The response to
a failed validation MUST NOT distinguish "malformed" from "unknown" (no oracle).

---

## POST /auth/keys

Create a workspace and issue its key. Public (no `X-Access-Key`).

**Request**: empty body.

**Response — 201 Created** *(the only payload in the system that ever contains a raw key)*:

```json
{
  "key": "AB3K-9XQ2-M7TD",
  "createdAt": "2026-07-18T10:15:00.000Z"
}
```

- `key`: display form — 12 Crockford Base32 characters grouped `4-4-4` (14 chars total).

**Errors**:

| Status | `error.code` | When |
|---|---|---|
| 429 | `rate_limited` | >5 creations/min from one IP |

---

## GET /auth/session

Probe a key / load session facts. Requires `X-Access-Key`.

**Response — 200 OK**:

```json
{
  "createdAt": "2026-07-18T10:15:00.000Z",
  "lastUsedAt": "2026-07-18T11:02:41.000Z"
}
```

**Errors**: 401 `invalid_key`, 429 `rate_limited` (per scheme table above).

**Usage contract**: the welcome page's "I have a key" flow calls this before storing
the key locally; a 200 is the *only* signal that permits persisting the key to
localStorage (FR-006/FR-007).

---

## Rate-limiter behavior (server-internal contract)

- Fixed 60-second window per client IP, in-memory (single-node deployment).
- Counted events: 401 `invalid_key` on any route (10/window) and `POST /auth/keys`
  requests (5/window). Successful validations are never counted.
- On limit: 429 immediately, without hashing or DB lookup.
- Window state resets on process restart (accepted; documented in research R7).

## Test obligations (contract tests, Supertest)

1. `POST /auth/keys` returns 201, a 14-char grouped key, and the key round-trips
   through `GET /auth/session` → 200.
2. Normalization: the same key entered lowercase, un-hyphenated, and with `o`
   substituted for `0` all resolve to the same workspace.
3. Missing/unknown/malformed `X-Access-Key` on a protected route → 401 `invalid_key`
   with identical envelopes (no oracle).
4. 11th failed validation inside a minute from one IP → 429 `rate_limited`; a valid
   key from the same IP immediately after remains 200 only if under the failure limit
   (successes not counted).
5. `GET /api/v1/health` requires no key.
