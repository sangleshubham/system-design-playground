# Quickstart: Validating AWS Component Icons

**Feature**: 004-aws-component-icons — runnable end-to-end validation per user story.
Details live in [spec.md](./spec.md) (acceptance scenarios + the authoritative Component
Icon Mapping table), [data-model.md](./data-model.md), and [contracts/](./contracts/).

## Prerequisites & setup

```bash
# from repo root — two terminals
cd backend  && npm install && npm run dev      # Express API (tsx watch); content validation runs at startup
cd frontend && npm install && npm start        # Angular dev server → http://localhost:8000
```

Open http://localhost:8000 and enter the playground (any level via Lab Map, or Sandbox) so
both icon surfaces are visible: the component palette (left) and the canvas.

## 1. Automated gates

```bash
cd backend  && npm test        # vitest — includes tests/content/icon-ids.test.ts (42 valid ids, uniqueness, legacy values rejected)
cd frontend && npm test        # ng test --no-watch (Vitest) — component-icon.registry.spec.ts invariants (completeness FR-001, uniqueness FR-005, fallback FR-007, namespace safety) + palette/design-node tile smoke tests
cd backend  && npm run lint
cd frontend && npm run lint
```

**Expected**: all green. The registry invariants are the machine check for SC-001/SC-003.

## 2. AWS artwork provenance (FR-006, SC-002)

```bash
# Download the pinned package (URL in spec.md § Input), unzip, then:
node frontend/tools/generate-component-icons.mjs /path/to/unzipped-package
```

**Expected**: script exits 0 and its regenerated `AWS_ICONS` output is byte-identical to the
committed section of `frontend/src/app/shared/component-icon.registry.ts` (diff is empty) —
proving the shipped AWS artwork is the package artwork under the whitelist-only cleanup in
[contracts/icon-registry.md § 3](./contracts/icon-registry.md). Spot-check SC-002 by opening
any source SVG (e.g. `…/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg`) next to
the rendered Blob Storage tile.

## 3. Startup validation rejects unknown ids (FR-007, US3)

```bash
cp -r backend/content /tmp/icons-bad-content
# edit /tmp/icons-bad-content/components.json — change one "icon" value to "not-a-real-icon"
cd backend && CONTENT_DIR=/tmp/icons-bad-content npm run dev
```

**Expected**: the server refuses to start with a `ContentError` naming
`components.json` and the offending entry's `icon` path. Restore by restarting without
`CONTENT_DIR`.

## 4. Visual acceptance — US1 (AWS icons) & US2 (coherent tiles)

In the palette and after dragging each onto the canvas:

1. **Blob Storage** shows the Amazon S3 icon; **DNS** shows Route 53 (US1 scenarios 1–2).
   Spot-check further rows against the spec's 23-row AWS table.
2. **Bloom Filter** shows a white filter glyph on a magenta `#C925D1` tile; **Circuit
   Breaker** a white zap-off glyph on pink `#E7157B` (US2 scenario 1; colors per the
   19-row companion table).
3. Place an AWS-mapped node next to a companion-mapped node: equal tile size, same corner
   rounding, consistent visual weight (US2 scenario 2 / SC-004).
4. Scan the full palette (toggle "Show all components (42)"): every component has an icon,
   no two identical (SC-003), no legacy pastel category chips remain on component entries
   (FR-004/SC-001) — while the search/note/toolbar glyphs are unchanged.
5. Zoom the canvas to its extremes: tiles stay crisp and distinguishable (FR-008/SC-006).

## 5. Performance check (SC-005, Constitution V)

```bash
cd frontend && npm run build   # note the main bundle size, compare against the pre-feature build
```

**Expected**: initial-bundle growth ≈ 28 KB gzipped (registry strings only — budget in
[plan.md § Technical Context](./plan.md)); playground initial load stays within +10% of the
pre-feature baseline. No new network requests for icons appear in the browser devtools
Network tab while using the playground (FR-009).

## 6. Non-regression (FR-010)

Component names, tech labels, hover metadata (cost/latency/description), mission checks, and
scoring behave exactly as before — the change is visual only. Run one level end-to-end
(place components, connect, submit) and confirm no behavioral difference.
