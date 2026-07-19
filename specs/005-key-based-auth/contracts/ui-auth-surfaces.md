# Contract: Auth UI Surfaces

**Feature**: `005-key-based-auth` | Frontend: Angular 20 standalone, lazy routes
Constitution gates: II (3-click rule, <100 ms perceived feedback), IV (standalone
lazy component, shared UI in `shared/`), V (no impact on dashboard load budget).

## Route & guard topology

| Surface | Route | Loading | Guard |
|---|---|---|---|
| Welcome gate | `/welcome` (new) | lazy standalone `WelcomePage` | `noKeyGuard` — a stored key redirects *away* to `/` |
| All existing routes (`/`, `/lab`, `/playground/:levelId`, `/sandbox`, `/sandbox/:designId`) | unchanged | unchanged | `keyGuard` — no stored key redirects to `/welcome` |

The key never appears in any route URL or query parameter (FR-012).

## WelcomePage (FR-001, FR-002)

Two visually equal actions, both reachable in one interaction:

1. **"Create a new key"** → `POST /auth/keys` → transitions to the **key reveal**
   state (below). Disabled + spinner while in flight; 429 shows a "try again in a
   minute" inline message.
2. **"I have a key"** → inline input.
   - Live normalization as the user types (uppercase, hyphens auto-grouped); input
     never blocks paste.
   - Submit → `GET /auth/session` with the candidate key. 200 → persist key, route to
     `/`. 401 → inline "That key doesn't match any workspace — check it and try
     again." (key NOT persisted, FR-007). 429 → inline cooldown message. Network
     failure → retryable error, input preserved (spec edge case).

## Key reveal state (FR-004)

- Shows the key once, formatted `XXXX-XXXX-XXXX`, in a large monospace block.
- **Copy** button (Clipboard API) with instant "Copied" feedback (<100 ms, local).
- Warning text: losing the key permanently loses access; there is no recovery.
- Primary action **"I saved my key — start designing"** persists the key via
  `KeyService` and routes to `/`. The raw key is never shown again anywhere in the UI.

## Shared shell: session affordance (FR-005)

- A compact "workspace" menu in the existing header/shell shows a masked key stub
  (last 4 characters only — never the full key) and one action: **Switch key** →
  clears localStorage via `KeyService.clear()`, routes to `/welcome`. No server call.
- Server data is untouched by switching (US2 acceptance 3).

## Conflict dialog (FR-011) — shared component

`shared/` dialog invoked by sandbox and playground save paths on 409 `stale_write`:

- Message: the design changed since it was loaded (someone else — or another tab —
  saved a newer version).
- Choices: **Reload their version** (replace canvas with `current`, discard local
  edits) | **Overwrite** (resend save with `current.updatedAt` as `baseUpdatedAt`).
- No silent auto-retry; dismissing the dialog leaves the canvas untouched and unsaved.

## Interceptor behavior (client-side contract)

| Condition | Action |
|---|---|
| Any API request, key present | attach `X-Access-Key` header |
| Response 401 `invalid_key` | clear stored key, redirect `/welcome` (with a toast explaining why) |
| Response 429 `rate_limited` | surface cooldown toast; do NOT clear the key |
| Network/5xx | existing `http-error.interceptor` behavior; key untouched |

## Smoke-test obligations (Vitest, per constitution quality gate)

1. `keyGuard` redirects keyless navigation to `/welcome`; `noKeyGuard` bounces
   keyed visitors off `/welcome`.
2. WelcomePage renders both actions; create-flow reveals a formatted key and only
   persists after the acknowledgement click.
3. Enter-flow: 401 leaves localStorage empty and shows the inline error.
4. Interceptor attaches the header when a key is stored and clears the session on
   401 `invalid_key`.
5. Conflict dialog renders both choices and emits the chosen action.
