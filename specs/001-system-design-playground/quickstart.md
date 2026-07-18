# Quickstart & Validation: Interactive System Design Playground

**Date**: 2026-07-08 | **Plan**: [plan.md](./plan.md) |
**Contracts**: [contracts/api.md](./contracts/api.md)

## Prerequisites

- Node.js 22 (LTS) + npm
- No database setup — SQLite file is created on first backend start

## Setup & Run (development)

```bash
# Backend (terminal 1) — starts Express on :3000, seeds/validates content JSON
cd backend
npm install
npm run dev

# Frontend (terminal 2) — Angular dev server on :4200, proxies /api → :3000
cd frontend
npm install
npm start
```

Open http://localhost:4200 — the home view should load in under 3 seconds.

## Automated checks

```bash
cd backend  && npm run lint && npm test   # scoring rules, mission checks, API (supertest)
cd frontend && npm run lint && npm test   # signal store, undo/redo, component smoke tests
cd frontend && npm run build              # production build must succeed
```

Expected: all green. Scoring/mission tests are table-driven against seeded levels
(SC-006 gate).

## End-to-end validation scenarios

Run in order on a fresh database (`rm backend/data/app.db` to reset).

### V1 — Core loop (US1, SC-001, SC-004)
1. From home, click into the Architecture Lab map, then level 1 — **≤ 3 clicks**, an
   editable canvas with palette + brief appears.
2. Drag the recommended components onto the canvas; each drop checks off its "Add …"
   mission instantly.
3. Connect them per the missions; "Connect …" items check off; counter reads full.
4. Press **RUN** → five dimension scores + per-dimension feedback in **< 5 s**.
5. Score ≥ 90 → level marked complete, next-level navigation offered.

### V2 — Editing ergonomics (US2)
1. Search the palette; toggle "recommended" ↔ "show all"; open a component metadata
   card (description, $/hr, ms).
2. Rename a node (double-click), attach a note, drop a sticky note.
3. Make 5 edits → undo ×5 → redo ×2; verify exact state each step.
4. Tidy → readable auto-layout, connections unchanged; toggle fullscreen and
   zoom/fit/lock controls.
5. Attempt a self-loop and a duplicate edge → both rejected with visible feedback.

### V3 — Progression (US3)
1. Fresh DB: map shows only level 1 unlocked; clicking a locked level does nothing
   (lock icon shown); `GET /api/v1/levels/level-3` returns **423**.
2. Complete level 1 (V1) → map shows level 2 unlocked, Act progress "1/N".
3. Search filters by title fragment and difficulty.

### V4 — Persistence & resume (US4, SC-005)
1. Build a partial design on level 2; wait ~2 s (autosave); kill the browser.
2. Reopen → home shows "Continue where you left off → level 2"; one click restores
   nodes, edges, renames, notes, and mission states exactly.
3. Verify best score shown after multiple attempts equals the max total.

### V5 — Sandbox (US5)
1. Open `/sandbox`, create a design; full catalog available; no missions/RUN UI.
2. Build freely, reopen from the sandbox list, rename it, delete it.

### V6 — Performance spot-checks (SC-002)
1. Place ~50 nodes (sandbox); pan/zoom/drag stays visibly smooth (DevTools FPS meter
   ≈ 60), drops/connects respond < 100 ms.
2. Toggle dark mode → whole UI, including canvas nodes/edges, re-themes instantly.

## Production smoke

```bash
cd frontend && npm run build
cd backend  && npm run start:prod   # serves API + built SPA on :3000
```

Open http://localhost:3000 — repeat V1 end-to-end once.
