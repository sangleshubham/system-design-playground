# Quickstart: Key-Based Authentication & Design Sharing

**Feature**: `005-key-based-auth`
Validation guide — proves the feature end-to-end. Contracts: see
[contracts/auth-api.md](contracts/auth-api.md),
[contracts/scoped-api-changes.md](contracts/scoped-api-changes.md),
[contracts/ui-auth-surfaces.md](contracts/ui-auth-surfaces.md).

## Prerequisites

- Node.js ≥ 22, npm
- Repo installed: `cd backend && npm install`, `cd frontend && npm install`
- Note: the first post-feature launch resets the dev database (schema v2 migration,
  research R5). Delete `backend/data/app.db*` manually if in doubt.

## Run the test suites

```bash
cd backend && npm test         # Vitest + Supertest: auth contract, scoping, 409/429 paths
cd frontend && npm test        # Vitest: guards, interceptor, welcome page, conflict dialog
cd backend && npm run lint && cd ../frontend && npm run lint
```

**Expected**: all green; new suites cover the test obligations listed at the bottom of
each contract file.

## Start the app

```bash
cd backend && npm run dev      # API on :3000
cd frontend && npm start       # SPA on :4200 (proxies /api)
```

## Scenario A — API smoke (curl)

```bash
# 1. Health needs no key
curl -s localhost:3000/api/v1/health                      # → {"status":"ok"}

# 2. Protected route without a key → 401 invalid_key
curl -s localhost:3000/api/v1/map | jq .error.code        # → "invalid_key"

# 3. Create a key (the only response ever containing one)
KEY=$(curl -s -X POST localhost:3000/api/v1/auth/keys | jq -r .key)
echo "$KEY"                                               # → e.g. AB3K-9XQ2-M7TD (14 chars)

# 4. Session probe — normalization: lowercase, no hyphens, same workspace
curl -s -H "X-Access-Key: $(echo "$KEY" | tr -d '-' | tr 'A-Z' 'a-z')" \
  localhost:3000/api/v1/auth/session | jq .createdAt      # → 200 with timestamp

# 5. Scoped data: map now loads; progress is fresh-install default
curl -s -H "X-Access-Key: $KEY" localhost:3000/api/v1/map | jq .

# 6. Rate limit: 11 bad keys in a minute → 429
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code} " -H "X-Access-Key: 000000000000" \
    localhost:3000/api/v1/auth/session
done                                                       # → ten 401s then 429
```

## Scenario B — First visit & auto-recognition (US1, SC-001/SC-002)

1. Open `http://localhost:4200` in a fresh browser profile → redirected to `/welcome`
   with the two choices (FR-002).
2. Click **Create a new key** → key revealed as `XXXX-XXXX-XXXX` with copy button and
   loss warning (FR-004). Note the key.
3. Click **I saved my key — start designing** → dashboard. Count the clicks: ≤3 to the
   first interactive exercise (SC-001).
4. Save a sandbox design. Close and reopen the browser → straight to the workspace, no
   prompt (SC-002).

## Scenario C — Second device & sharing (US2/US3, SC-006)

1. Open a different browser (or private window) → `/welcome`.
2. **I have a key** → type the key lowercase without hyphens → full workspace loads
   (designs, progress) within 3 s (SC-006).
3. Enter a plausible-but-wrong key first to see the inline rejection (FR-007) — nothing
   is stored.
4. **Switch key** from the header menu → back to `/welcome`; reopening still prompts
   (FR-005); re-entering the key restores everything.

## Scenario D — Concurrency (US4, SC-005)

1. Open the same sandbox design under the same key in two browsers A and B.
2. Save from A (succeeds), then save from B **without reloading** → conflict dialog:
   reload vs overwrite (FR-011); pick *Overwrite* → B's version wins; pick *Reload*
   in a repeat run → B adopts A's version, local edits discarded.
3. Verify the stored design afterwards is exactly one writer's document — never a
   blend (SC-005): `curl -s -H "X-Access-Key: $KEY" localhost:3000/api/v1/sandbox/designs/<id> | jq .`

## Scenario E — Isolation (spec: two workspaces never observe each other)

1. Create a second key via curl (Scenario A step 3).
2. `GET /sandbox/designs` with each key → each sees only its own list.
3. `GET /map` with the new key → fresh-install progress, untouched by workspace 1.

## Sign-off checklist

- [X] All Scenario A curl outputs match — run live 2026-07-19: health keyless 200; keyless
      `/map` → 401 `invalid_key`; `POST /auth/keys` → 14-char key; lowercase/un-hyphenated
      probe → 200; fresh map `unlockedThroughOrder: 1`; failed-validation window → 429 (the
      limiter counts 401s across all routes per IP, so the keyless `/map` above consumes one).
- [X] Scenarios B–E behave as described — B/C driven in headless Chrome (9/9 checks); D
      (real 409 → conflict dialog → Overwrite wins) driven in Chrome; E proven by
      `tests/api/workspace-scoping.test.ts` + Scenario A second-key isolation.
- [X] `rg -i "accessKey|X-Access-Key" frontend/src` shows the key only in header attachment
      (`key.interceptor.ts`, `auth.api.ts` candidate probe) and the localStorage slot
      (`key.service.ts`) — never in router navigation or URLs (FR-012).
- [X] Backend request log lines contain no key material (R3) — `requestLogger` logs only
      method + path + status + duration; live log grep for the issued key returned 0 matches.

## Constitution Principle II release gate (T027)

- [X] **SC-001 — welcome → first interactive exercise ≤3 clicks**: measured **3** clicks in
      the browser (Create a new key → I saved my key → level-1 card → `/playground/level-1`).
- [X] **<100 ms perceived feedback**: copy shows "✓ Copied" synchronously before the async
      clipboard write; key entry normalizes/auto-groups on each keystroke (local, no network).
- [X] **Terminology consistent with existing modules**: the gate, header ("Your workspace" /
      masked stub), and messages use "workspace" and "key" throughout.

## Automated coverage (T025)

- Backend: `npm run lint` clean, `npm test` **150 passing**, `tsc --noEmit` clean.
- Frontend: `npm run lint` clean, `npm test` **216 passing**, `ng build` clean.
