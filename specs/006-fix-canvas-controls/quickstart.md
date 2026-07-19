# Quickstart: Canvas Controls & Viewport Fixes

**Feature**: `006-fix-canvas-controls`
Validation guide — proves the feature end-to-end. Contracts: see
[contracts/ui-contracts.md](contracts/ui-contracts.md); state rules: see
[data-model.md](data-model.md); decisions: see [research.md](research.md).

## Prerequisites

- Node.js ≥ 22, npm
- Repo installed: `cd backend && npm install`, `cd frontend && npm install`
- A workspace access key (create one via the Welcome page on first run)

## Run the app

```bash
cd backend && npm run dev       # Express API (reads .env)
cd frontend && npm start        # Angular dev server → http://localhost:8000
```

## Run the automated gates

```bash
cd frontend && npm run lint     # ESLint — must be clean
cd frontend && npm test         # Vitest: fit clamp, copy-key states, overlay provider, icon registry
```

Expected: all suites green, including the new specs listed in research.md R6.

---

## US1 — Popups work in full-screen (P1)

1. Open a level playground, add a couple of nodes.
2. Click the **Full screen** button (bottom toolbar) → canvas area goes fullscreen.
3. Click **Reset** (top toolbar).
   - ✅ Confirmation popup appears immediately **on top of the fullscreen canvas**.
   - ✅ **Cancel** closes it, canvas unchanged; repeat and **Confirm** resets the canvas —
     all without leaving fullscreen (SC-001).
4. Still fullscreen, submit a design to open the **results popup**, then the **AI review**
   panel → both visible and interactive in fullscreen.
5. Open any popup in fullscreen, then press Esc / exit fullscreen.
   - ✅ Exactly one popup instance remains, correctly positioned (FR-003).
6. Repeat step 3 on the **sandbox** page (shared controls) → same behavior.
7. Deny fullscreen (e.g., browser setting) → clicking Reset still shows the popup in
   normal mode (edge case).

## US2 — Fit-to-screen caps at 100% (P1)

1. Place **one small node**, click **Fit to screen**.
   - ✅ View settles centered at actual size — node does NOT balloon (zoom ≤ 100%, SC-002).
2. Verify the same via `Ctrl/Cmd+0` and via **Tidy** (fit runs after auto-layout) (FR-005).
3. Build a diagram **wider than the viewport**, click Fit to screen.
   - ✅ Zooms OUT until everything is visible with comfortable (48px) padding (FR-006).
4. Empty canvas → Fit to screen settles at a sane centered view, no extreme zoom (edge case).
5. Manual zoom `+`/`−` still ranges 25%–250% as before (SC-006 regression check).

## US3 — Distinguishable icons (P2)

1. Look at the bottom toolbar.
   - ✅ **Fit to screen** (brackets + inner rectangle) and **Full screen** (empty brackets)
     are clearly different glyphs at toolbar size (SC-003).
2. Hover each → tooltips read "Fit to screen (⌘0/Ctrl+0)" and "Full screen" (FR-008).
3. Enter fullscreen → the fullscreen button switches to an **exit** glyph and its tooltip
   reads "Exit full screen".
4. Check at a ~768 px wide window → icons remain distinguishable (FR-017).

## US4 — White drawable canvas (P2)

1. In the **light theme**, open the playground.
   - ✅ The drawable area is white edge-to-edge — no gray zone between page and canvas
     (SC-004).
   - ✅ Dot grid still faintly visible (FR-011).
   - ✅ Node cards, minimap, toolbars, and popups remain clearly separated from the white
     background via borders/shadows (FR-010). If cards visually bleed into the canvas,
     apply the documented fallback (contracts C6-G3 / research R4).
2. Toggle to **dark theme** → canvas appearance unchanged from before this feature
   (dark `--canvas-bg` untouched).

## US5 — Copy my key (P3)

1. With a workspace key active, find the **Copy my key** button in the canvas controls.
2. Click it → button shows a brief **Copied ✓** state (~1.5 s) (FR-013).
3. Paste into a text editor.
   - ✅ Pasted value is the complete key — matches what the Welcome/enter-key flow accepts,
     not the masked `••••-XXXX` form (SC-005, FR-014).
4. Paste it into the Welcome page "enter key" flow in a private window → session works.
5. Failure path: deny clipboard permission (or run in a context without
   `navigator.clipboard`) and click → button shows a non-blocking **error** state, no
   silent failure, no crash (FR-015).
6. Clear the key (Switch key) → the button is absent on the canvas (edge case).
7. Confirm the button also appears and works on the **sandbox** page.

---

## Regression sweep (SC-006)

- Zoom in/out buttons and `Mod+=`/`Mod+-` (25%–250%), pan, undo/redo, copy/paste selection,
  delete, lock, tidy — all behave exactly as before.
- `cd frontend && npm test` and `npm run lint` green; `cd backend && npm test` untouched
  and green.
