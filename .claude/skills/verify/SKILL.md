---
name: verify
description: Build, launch, and drive the System Design Playground app to verify changes at the UI surface. Use when a change needs runtime verification (canvas interactions, palette drags, API behavior).
---

# Verify: System Design Playground

Angular 20 frontend (`frontend/`, Foblex Flow canvas) + Express/SQLite backend (`backend/`). No login; state is server-side SQLite seeded on boot.

## Launch

```bash
(cd backend && npm run dev)            # Express on http://localhost:3000, API under /api/v1
(cd frontend && npx ng serve --port 4300)   # dev server; proxy.conf.json forwards /api -> :3000
```

Ready when `curl http://localhost:3000/api/v1/map` returns JSON and `http://localhost:4300/` returns 200. There is NO `/api/v1/levels` list — level ids come from `/api/v1/map` (e.g. `level-2`).

## Drive (browser)

No Playwright in this repo. Use `puppeteer-core` (npm i in scratchpad) with system Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

- Playground page: `http://localhost:4300/playground/level-2`
- Palette items: `.pal-card` (name in `.pal-name`); drag onto canvas with smooth mouse move (~20 steps, 15ms apart) — Foblex tracks pointer events, single-jump moves don't register.
- Canvas nodes: `.node-host` (Foblex adds `.f-node`); card inside is `.card`; connectors `.conn-in` / `.conn-out`.
- Create a connection: smooth-drag from one node's `.conn-out` center to another's `.conn-in` center. Rendered edges: `f-connection path[f-connection-path]` with a non-empty `d`.
- Rejection toasts (duplicate/self connection) appear in body text, e.g. "already connected".

## Gotchas

- The Foblex default theme (`angular.json` styles) frames every `.f-node`; app overrides live at the bottom of `frontend/src/styles.scss` and must use BOTH selector forms (`f-flow .f-node, .f-flow .f-node`) or the theme's class variant wins.
- Drag-to-connect only works because `<f-connection-for-create />` is in `canvas.component.html` — if connecting silently does nothing, check it's still there.
- `npm test` in `frontend/` runs vitest through `ng test`; running `npx vitest` directly fails (no TestBed init).
