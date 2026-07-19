# Contract: Workspace Scoping & Concurrency Changes to Existing Endpoints

**Feature**: `005-key-based-auth` | Base path: `/api/v1`
Applies to every endpoint that existed before this feature. Shapes below show deltas
only; request/response bodies otherwise keep their feature 001/002 contracts.

## Universal delta

| Aspect | Before | After |
|---|---|---|
| Auth | none | `X-Access-Key` required (see `auth-api.md`); 401 `invalid_key` / 429 `rate_limited` possible on every route |
| Data visibility | one global dataset | rows scoped to the workspace resolved from the key; two workspaces can never observe each other's data |

Endpoints affected: `GET /map`, `GET /progress`, `GET /levels/:levelId`,
`PUT /levels/:levelId/design`, `POST /levels/:levelId/attempts`,
`GET /levels/:levelId/attempts`, `POST /levels/:levelId/ai-review`,
`GET /levels/:levelId/ai-review`, `GET /components`, and all `/sandbox/designs*`
routes. (`GET /components` serves static content but sits behind the same middleware —
uniform rule, research R9.)

## Per-workspace semantics

- **`GET /map` / `GET /progress`**: progress row is lazily seeded with first-run
  defaults on a workspace's first read — a brand-new key sees the same state a fresh
  install used to see.
- **`GET/POST /levels/:levelId/attempts`**: attempts list and best-score derivation
  consider only the caller's workspace.
- **AI review endpoints**: the `(designHash, model)` review cache is consulted
  per-workspace; histories never cross workspaces.

## Concurrency delta on design saves (FR-011, research R6)

Applies to `PUT /levels/:levelId/design` and `PUT /sandbox/designs/:id`.

**Request delta** — one new optional field:

```json
{ "...existing fields...": "...", "baseUpdatedAt": "2026-07-18T11:02:41.000Z" }
```

- `baseUpdatedAt` = the `updatedAt` the client received when it loaded the design.
- Omitted → unconditional write (pure last-write-wins floor).

**New response — 409 Conflict**, when `baseUpdatedAt` is present and does not equal
the stored `updated_at`:

```json
{
  "error": { "code": "stale_write", "message": "This design changed since you loaded it." },
  "current": { "...the full stored design, including its updatedAt...": "..." }
}
```

**Client contract on 409**: surface the FR-011 warning with the two mandated choices —
*reload* (adopt `current`, discard local edits) or *overwrite* (resend using
`current.updatedAt` as the new `baseUpdatedAt`). Never auto-retry silently.

**Success (200) responses** to both PUTs continue to return the fresh `updatedAt`,
which the client MUST adopt as its next `baseUpdatedAt`.

`DELETE /sandbox/designs/:id` takes no precondition — deletion is always explicit and
last-write-wins (a concurrent editor's next save recreates nothing; their 409 `current`
will be absent, surfaced as the existing 404 contract).

## Test obligations

1. Two workspaces: designs/attempts/progress/reviews created in A are invisible via
   B's key on every list/get endpoint (fan out over the endpoint table above).
2. Same level saved in two workspaces coexist (composite uniqueness).
3. `PUT` with stale `baseUpdatedAt` → 409 with `current`; resend with
   `current.updatedAt` → 200; omit `baseUpdatedAt` → 200 unconditionally.
4. Save race (two sequential saves with the same base): second gets 409; stored
   document equals the first save's payload — never a blend (SC-005).
5. Progress seeded per workspace: fresh key's `GET /map` matches the fresh-install
   snapshot.
