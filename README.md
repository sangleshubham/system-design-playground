# System Design Playground

A personal, single-user, gamified system design practice site. Drag infrastructure
components from a categorized palette onto a pan/zoom canvas, wire them into directed
data flows, watch a mission checklist auto-verify in real time, then press **RUN** for a
rule-based five-dimension score (Missions, Flow, Topology, Efficiency, Resilience; pass
≥ 90) that unlocks the next level. Supporting surfaces: a challenge map grouped into
Acts with sequential unlocking, autosave/resume with a home view, and a free-form
sandbox.

- **Frontend**: Angular 20 (standalone components, Signals), `@foblex/flow` canvas
- **Backend**: Express 5 + `better-sqlite3` + `zod`, deterministic scoring rule engine
- **Content**: JSON seeds (components, acts, levels) validated at startup
- **State**: SQLite (`backend/data/app.db`) for designs, attempts, and progress

Design docs live under [`specs/001-system-design-playground/`](specs/001-system-design-playground/)
(spec, plan, data model, API contract, quickstart).

## Prerequisites

- Node.js 22 (LTS) + npm
- No database setup — the SQLite file is created on first backend start

## Development (two terminals)

```bash
# Terminal 1 — Express API on :3000 (seeds + validates content JSON on boot)
cd backend && npm install && npm run dev

# Terminal 2 — Angular dev server on :4200 (proxies /api → :3000)
cd frontend && npm install && npm start
```

Open http://localhost:4200.

## Tests & lint

```bash
# From the repo root (delegates into both projects):
npm test          # backend: scoring/mission/API (vitest + supertest); frontend: store + component smoke tests
npm run lint      # eslint in both projects

# Or per project:
cd backend  && npm run lint && npm test
cd frontend && npm run lint && npm test
```

## Production build & run

```bash
npm run build       # builds the Angular SPA, then compiles the backend (tsc)
npm run start:prod  # NODE_ENV=production; serves the API + built SPA on :3000
```

Open http://localhost:3000. In production the backend serves
`frontend/dist/frontend/browser` statically with a history-API fallback to
`index.html` for non-`/api` routes. Override the static directory with `CLIENT_DIR` and
the port with `PORT` if needed.

## Content authoring — adding a level

Content is plain JSON under `backend/content/`, validated by `zod` at startup
(`content.service.ts` fails fast and names the offending file/field). Shapes are defined
in [`backend/src/models/index.ts`](backend/src/models/index.ts) and documented in
[`specs/001-system-design-playground/data-model.md`](specs/001-system-design-playground/data-model.md).

**To add a level**, create `backend/content/levels/level-N.json` with:

| Field | Notes |
|---|---|
| `id` | e.g. `"level-13"` (unique) |
| `actId` | must reference an act in `acts.json` |
| `order` | **global 1-based; must stay unique and contiguous from 1** — this defines the unlock chain |
| `title`, `summary`, `narrative` | card title, one-line summary, and markdown story |
| `difficulty` | `easy` \| `medium` \| `hard` \| `expert` \| `legendary` |
| `objectives` | learning-objective chips (strings) |
| `specs` | `functional`, `nonFunctional`, `constraints`, `capacity` (string lists), `budgetPerHr` (number, Efficiency cap), optional `latencyTargetMs`, `tradeoff`, optional `bonus` |
| `missions` | ≥ 1 non-bonus mission (see kinds below) |
| `topologyRules`, `resilienceRules` | declarative scoring rules (see kinds below) |
| `recommendedComponentIds` | must all exist in `components.json` |
| `hints` | ordered strings, all free to reveal |

**Mission kinds** (checked identically by the live checklist and the Missions score):

- `{ "kind": "add", "componentId": "cdn", "label": "Add a CDN", "bonus"?: true }`
  — satisfied when ≥ 1 node of that component type is on the canvas.
- `{ "kind": "connect", "fromComponentId": "client", "toComponentId": "cdn", "label": "Route the client through the CDN" }`
  — satisfied when an edge runs from a `from`-type node to a `to`-type node (matched by
  component **type**, so renamed nodes still count). Add `"bonus": true` to make a
  mission score-only (never blocks completion).

**Topology rule kinds** (start at 100, deduct per violation):

- `{ "kind": "forbidden-edge", "fromComponentId": "...", "toComponentId": "...", "message": "..." }`
- `{ "kind": "required-between", "viaComponentId": "...", "fromComponentId": "...", "toComponentId": "...", "message": "..." }`

**Resilience rule kinds**:

- `{ "kind": "no-spof", "componentId": "...", "message": "..." }` — requires ≥ 2 instances.
- `{ "kind": "requires-companion", "componentId": "...", "companionComponentId": "...", "message": "..." }`
  — e.g. a message queue that needs a connected dead-letter queue.

**To add a component**, append to `backend/content/components.json`: `id` (kebab-case),
`name`, `tech` label, `category` (`user`/`networking`/`compute`/`storage`/`caching`/
`messaging`/`services`), `description`, non-negative `costPerHr` and `latencyMs`, and an
`icon` key resolved by the frontend icon registry.

Restart the backend after editing content; validation errors print the exact file and
field to fix.
