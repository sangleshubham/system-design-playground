# Tasks: AWS Component Icons

**Input**: Design documents from `/specs/004-aws-component-icons/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: INCLUDED — the constitution mandates smoke tests for interactive components, and the plan commits to registry-invariant and content-validation tests (plan.md § Technical Context). Test tasks accompany each story.

**Organization**: Tasks are grouped by user story (P1–P3 from spec.md) so each story is an independently implementable, testable increment.

## Format: `[ID] [P?] [Story] Description (Model · effort)`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, prerequisites met)
- **[Story]**: US1–US3 mapping to spec.md user stories
- Every task names exact file path(s)
- **(Model · effort)**: Recommended executor — `Sonnet 5` or `Opus 4.8` — and `/effort` level, assigned by task complexity (see Model Plan below)

## Model Plan (Sonnet 5 vs Opus 4.8 by complexity)

**Assignment rationale**:
- **Sonnet 5** — tasks whose behavior is fully pinned by the contracts (registry composition, CSS deltas, enumerated test cases, content-value edits). Nothing to discover, low blast radius.
- **Opus 4.8** — the two judgment-heavy tasks: the SVG extraction script (id/gradient-reference subtleties where a plausible regex silently breaks artwork) and companion-glyph selection (aesthetic verification at 28 px with license-correct vendoring).

**Switch checkpoints** (`/model` + `/effort` at these boundaries):

| Checkpoint | Model · effort | Covers |
|---|---|---|
| Phase 1 start | **Opus 4.8 · medium** | T001 (extraction script); T002 runs alongside |
| Phase 2 start | Sonnet 5 · medium | T003–T009 (registry infra + all of US1) |
| Phase 4 start (US2) | **Opus 4.8 · medium** | T010 (glyph verification + vendoring) |
| After T010 | Sonnet 5 · medium | T011–T019 (US2 wrap-up, US3, Polish) |

**Model economy**: 17 of 19 tasks are Sonnet 5-assignable (89%); Opus 4.8 is reserved for the two tasks where a wrong-but-plausible result is easy.

---

## Phase 1: Setup

**Purpose**: Build-time tooling and source assets for AWS artwork extraction

- [X] T001 [P] Author the extraction script `frontend/tools/generate-component-icons.mjs` per [contracts/icon-registry.md § 5](./contracts/icon-registry.md): plain Node (`node:fs`/`node:path` only), inline mapping of the 23 `aws-*` ids → package paths from [data-model.md § 2](./data-model.md), whitelist transforms from § 3 (strip XML prolog, strip `<title>`, strip `id` attributes, root `width`/`height` → `1em`), deterministic output of the `AWS_ICONS` registry section, nonzero exit naming any missing file. **Caution**: strip only `id` attributes that nothing references — if artwork uses `url(#…)` (gradients/clipPaths), uniquify those ids with a per-icon prefix instead of stripping; rendering fidelity (FR-006) takes precedence, and if this case occurs, update research.md R3 and contracts/icon-registry.md § 3 to record the actual whitelist. (Opus 4.8 · medium)
- [X] T002 [P] Download the pinned AWS icon package (URL in [spec.md](./spec.md) § Input, release 2026-04-30) and unzip it to a working directory **outside the repo** (the 13.4 MB zip is never committed); verify all 23 source files listed in [data-model.md § 2](./data-model.md) exist under `Architecture-Service-Icons_04302026/`. (Sonnet 5 · low)

**Checkpoint**: Extraction tooling ready — script + package available for US1.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The registry module every story renders through

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create `frontend/src/app/shared/component-icon.registry.ts` per [contracts/icon-registry.md](./contracts/icon-registry.md): attribution header (AWS terms + verbatim Lucide ISC notice, § 8), `tile(fill, glyph24)` composer (§ 6), the 7 `fallback-<category>` entries (`tile('#232F3E', …)` reusing each existing category glyph's inner markup from `icon.registry.ts`), exported `COMPONENT_ICONS: Record<string, string>` (fallbacks only for now), and the pure resolver `componentIconName(icon, category)` (§ 4). (Sonnet 5 · medium)
- [X] T004 Spread `COMPONENT_ICONS` into `ICONS` in `frontend/src/app/shared/icon.registry.ts` (UI glyphs untouched, contract § 1) and create `frontend/src/app/shared/component-icon.registry.spec.ts` with the two invariants already satisfiable: fallback coverage for all 7 categories and namespace safety (spread adds keys, replaces none) — contract § 7 #3–4. (Sonnet 5 · low)

**Checkpoint**: Foundation ready — registry, composer, resolver, and fallbacks exist and are tested; the app still renders legacy icons (nothing consumes the new entries yet).

---

## Phase 3: User Story 1 - Recognize Real AWS Services on the Canvas (Priority: P1) 🎯 MVP

**Goal**: The 23 AWS-mapped components display their official AWS Architecture Service icons in the palette and on canvas nodes.

**Independent Test**: Open the playground; each of the 23 AWS-mapped components (spec.md mapping table) shows its official AWS icon in the palette and as a canvas node after being dragged on (quickstart step 4.1).

### Implementation for User Story 1

- [X] T005 [US1] Run `node frontend/tools/generate-component-icons.mjs <package-path>` (T001 script, T002 package) and add the generated 23 `aws-*` entries to `frontend/src/app/shared/component-icon.registry.ts`; spot-check one entry (e.g. `aws-s3`) against its package source file for whitelist-only differences. (Sonnet 5 · low)
- [X] T006 [P] [US1] Update `backend/content/components.json`: set the 23 AWS-mapped components' `icon` values to their `aws-*` ids per [data-model.md § 2](./data-model.md) (e.g. `blob-storage` → `aws-s3`); leave the 19 companion components' values untouched for now. (Sonnet 5 · low)
- [X] T007 [P] [US1] Palette surface per [contracts/ui-surfaces.md § 2](./contracts/ui-surfaces.md): in `frontend/src/app/features/playground/palette/palette.component.html` drop the `data-category` attribute and render `<app-icon [name]="iconFor(c)" />`; in `palette.component.ts` add `iconFor(c) { return componentIconName(c.icon, c.category); }`; in `palette.component.scss` set `.pal-icon` `font-size: 28px`, add `overflow: hidden`, delete the 7 `.pal-icon[data-category=…]` pastel rules (box size 28×28 and radius 7px unchanged). (Sonnet 5 · medium)
- [X] T008 [P] [US1] Design-node surface per [contracts/ui-surfaces.md § 3](./contracts/ui-surfaces.md): in `frontend/src/app/features/playground/canvas/design-node.component.ts` change `iconName` to `computed(() => componentIconName(this.component()?.icon ?? '', this.category()))`; in `design-node.component.scss` set `.icon` `font-size: 34px`, add `overflow: hidden`, delete the 7 `.card[data-category=…] .icon` pastel rules (box 34×34, radius 9px, card width 170px unchanged). (Sonnet 5 · medium)
- [X] T009 [US1] Tests: extend `frontend/src/app/shared/component-icon.registry.spec.ts` (all 23 `aws-*` entries non-empty, start with `<svg`, pairwise distinct); extend `frontend/src/app/features/playground/palette/palette.component.spec.ts` (an entry with `icon: 'aws-s3'` renders `<app-icon>` with that name; no `.pal-icon` carries `data-category`); extend the design-node coverage in `frontend/src/app/features/playground/canvas/canvas.component.spec.ts` or a new `design-node.component.spec.ts` (a `dns` node renders `aws-route-53`). (Sonnet 5 · medium)

**Checkpoint**: US1 fully functional — 23 AWS icons on both surfaces. Interim state (expected): the 19 companion components still carry legacy category ids, which the resolver passes through to the old stroke glyphs — rendered without pastel tiles until US2. `cd frontend && npm test` green.

---

## Phase 4: User Story 2 - One Coherent Visual Language for Every Component (Priority: P2)

**Goal**: The 19 non-AWS components render as white Lucide glyphs on saturated AWS-palette tiles, dimensionally identical to the AWS tiles — one coherent icon system.

**Independent Test**: View the full palette (Show all components (42)) and a canvas with an AWS-mapped node next to a companion-mapped node: uniform tile size/shape/weight, no two icons identical (quickstart steps 4.2–4.4).

### Implementation for User Story 2

- [X] T010 [US2] Verify each of the 19 indicative Lucide glyphs ([data-model.md § 2](./data-model.md)) on lucide.dev for 28 px legibility and concept fit; substitute a closer glyph where warranted (registry-internal — allowed without spec change per research R4/R6); vendor each glyph's inner path markup (24×24 grid, 2 px stroke) as constants and add the 19 `tile-*` entries to `frontend/src/app/shared/component-icon.registry.ts` using the `tile()` composer with the spec-fixed fills (`#232F3E`, `#8C4FFF`, `#01A88D`, `#E7157B`, `#C925D1`). (Opus 4.8 · medium)
- [X] T011 [P] [US2] Update `backend/content/components.json`: set the 19 companion components' `icon` values to their `tile-*` ids per [data-model.md § 2](./data-model.md) — after this, zero legacy category names remain in content. (Sonnet 5 · low)
- [X] T012 [US2] Complete the registry invariants in `frontend/src/app/shared/component-icon.registry.spec.ts`: completeness — every one of the 42 vocabulary ids resolves to a non-empty `<svg` string (FR-001); uniqueness — all 42 component SVG strings pairwise distinct (FR-005) — [contracts/icon-registry.md § 7](./contracts/icon-registry.md) #1–2. (Sonnet 5 · low)

**Checkpoint**: US1 + US2 — the full 42-component palette reads as one designed tile system; `npm test` green in frontend.

---

## Phase 5: User Story 3 - Complete and Safe Replacement (Priority: P3)

**Goal**: Legacy category icons fully retired for components; unknown icon ids are rejected at startup and degrade to the navy fallback tile at runtime.

**Independent Test**: Corrupt one `icon` value in a copy of the content and confirm the server refuses to start naming the field (quickstart step 3); force an unknown id through a component input in tests and see the `fallback-<category>` tile render on both surfaces.

### Implementation for User Story 3

- [X] T013 [P] [US3] Backend schema per [contracts/components-api.md § 3](./contracts/components-api.md): in `backend/src/models/index.ts` add `export const COMPONENT_ICON_IDS = […] as const;` (23 `aws-*` then 19 `tile-*`, catalog order; `fallback-*` excluded) and change `ComponentSchema.icon` from `z.string().min(1)` to `z.enum(COMPONENT_ICON_IDS)`; add mirror-drift notes naming the counterpart file to the headers of `backend/src/models/index.ts` and `frontend/src/app/core/models.ts` (frontend `Component.icon` stays `string`). **Depends on T006 + T011** (all 42 content values migrated — the enum rejects legacy names). (Sonnet 5 · medium)
- [X] T014 [P] [US3] Backend test `backend/tests/content/icon-ids.test.ts` per [contracts/components-api.md § 4](./contracts/components-api.md): shipped `backend/content/components.json` parses against the updated schema; all 42 shipped `icon` values pairwise distinct; a component object with `icon: "storage"` (legacy) and one with an unknown string both fail `ComponentSchema`. (Sonnet 5 · medium)
- [X] T015 [P] [US3] Frontend fallback tests per [contracts/ui-surfaces.md](./contracts/ui-surfaces.md) § 2–3 and [icon-registry.md § 7](./contracts/icon-registry.md) #3: in `component-icon.registry.spec.ts`, `componentIconName('nonsense', c)` returns `fallback-<c>` for all 7 categories and known ids pass through; in `palette.component.spec.ts`, an entry with an unknown `icon` renders the fallback tile; in the design-node coverage, `component === undefined` renders `fallback-services` and an unknown `icon` renders `fallback-<its category>`. (Sonnet 5 · medium)
- [X] T016 [US3] Legacy retirement sweep: grep `frontend/src` for remaining `--category-*-bg`/`--category-*-fg` and `data-category` usages — confirm the only survivors are non-icon consumers (node-card/section styling per spec clarification), with zero icon-chip usages on the two surfaces; confirm UI glyphs (`search`, `note`, `play`, `lock`, …) still render from `icon.registry.ts` unchanged (FR-004). Run the manual negative startup check: copy content, corrupt one `icon`, `CONTENT_DIR=<copy> npm run dev` fails with `ContentError` naming `components.json` (quickstart step 3). (Sonnet 5 · low)

**Checkpoint**: All three stories independently verified; `npm test` green in both packages.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Provenance, performance, and full-feature validation against the success criteria

- [X] T017 [P] Provenance check (SC-002, FR-006): rerun `node frontend/tools/generate-component-icons.mjs <package-path>` and diff its output against the committed `AWS_ICONS` section of `frontend/src/app/shared/component-icon.registry.ts` — must be byte-identical (quickstart step 2). (Sonnet 5 · low)
- [X] T018 [P] Performance check (SC-005, FR-009): `cd frontend && npm run build`, compare main-bundle size against the pre-feature baseline (budget ≈ +28 KB gzipped, plan.md § Technical Context); confirm in browser devtools that no icon network requests occur while using the playground (quickstart step 5). (Sonnet 5 · low)
- [X] T019 Full validation pass: run every quickstart step 1–6 (automated gates, provenance, negative startup, visual acceptance including zoom legibility SC-006 and the 42-icon uniqueness scan SC-003, performance, one level end-to-end for FR-010 non-regression); `npm run lint` and `npm test` in both `frontend/` and `backend/`. (Sonnet 5 · medium)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 and T002 can run in parallel immediately
- **Foundational (Phase 2)**: Independent of Phase 1 (registry skeleton needs no AWS assets) — but BLOCKS all user stories; T004 depends on T003
- **US1 (Phase 3)**: T005 needs T001 + T002 + T003; T006 is free-standing; T007/T008 need T003/T004; T009 needs T005 + T007 + T008
- **US2 (Phase 4)**: T010 needs T003; T011 free-standing; T012 needs T005 + T010
- **US3 (Phase 5)**: T013 needs T006 + T011 (enum rejects legacy values — do not land earlier); T014 needs T013; T015 needs T003 (fallbacks) and the T007/T008 surfaces; T016 needs T007 + T008 + T011
- **Polish (Phase 6)**: T017 needs T005; T018/T019 need all stories complete

### User Story Dependencies

- **US1 (P1)**: Only Setup + Foundational — no dependence on other stories
- **US2 (P2)**: Only Foundational (glyph vendoring is independent of AWS extraction); shares the surfaces US1 already switched, so after US1 it is pure registry + content work
- **US3 (P3)**: The backend enum (T013) requires US1's and US2's content migrations to be complete; fallback tests only need Foundational + the switched surfaces

### Parallel Opportunities

- T001 ∥ T002 (Phase 1)
- T006 ∥ T007 ∥ T008 after Phase 2 (different files: content JSON, palette files, node files)
- T011 ∥ T010 (content vs registry)
- T013 ∥ T014-after-T013 ∥ T015 span backend/frontend — T013 ∥ T015 fully parallel
- T017 ∥ T018 (script diff vs build)

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch together:
Task: "T006 Update backend/content/components.json — 23 aws-* icon values"
Task: "T007 Palette surface changes in frontend/src/app/features/playground/palette/*"
Task: "T008 Design-node surface changes in frontend/src/app/features/playground/canvas/design-node.component.*"
# T005 runs beside them once T001+T002 are done; T009 closes the story after T005/T007/T008.
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001–T002, Opus 4.8 for the script) + Phase 2 (T003–T004, switch to Sonnet 5)
2. Phase 3 (T005–T009) → **STOP and VALIDATE**: 23 official AWS icons visible on both surfaces (quickstart 4.1) — this alone delivers the feature's core value
3. Known-good interim state: companion components render legacy glyphs un-tiled until US2

### Incremental Delivery

1. US1 → demo: real AWS iconography on the canvas (MVP)
2. US2 (switch to Opus 4.8 for T010, back to Sonnet 5 after) → demo: one coherent 42-tile system
3. US3 → demo: validation gate + fallback safety; legacy fully retired
4. Polish → SC-001…SC-006 all verified via quickstart

### Notes

- [P] tasks = different files, no unmet dependencies
- Commit after each task or logical group; each checkpoint is a safe stopping point
- The AWS zip and its unzipped package stay outside the repo — only the generated registry section and the script are committed (research R9)

---

## Phase 7: Corner Treatment Refinement — Square Tiles (follow-up, 2026-07-12)

**Context**: Post-implementation change request — component icon tiles currently render with
rounded corners (the spec's original "rounded square tile"); the user wants fully **square**
tiles. This **reverses** the corner-treatment decision recorded in research R8 / ui-surfaces
§1. It is a **CSS-only** change on the two icon surfaces: the container's clipping
`border-radius` drops to `0`. The tile SVG artwork is not edited (FR-006 still holds — only
the box's corner clipping changes), tile dimensions and `overflow: hidden` are unchanged (no
layout shift), and no existing test asserts a corner radius, so no test changes are required.

**Independent Test**: Open the palette and a canvas with a placed node — both the palette
chips and the canvas node icons show square (un-rounded) tiles; all other styling (size,
fills, spacing) is unchanged.

- [X] T020 [P] Square the palette chip: in `frontend/src/app/features/playground/palette/palette.component.scss`, change the `.pal-icon` `border-radius: 7px` to `0` (keep `width`/`height` 28px and `overflow: hidden`). (Sonnet 5 · low)
- [X] T021 [P] Square the design node: in `frontend/src/app/features/playground/canvas/design-node.component.scss`, change the `.icon` `border-radius: 9px` to `0` (keep `width`/`height` 34px and `overflow: hidden`). (Sonnet 5 · low)
- [X] T022 Record the reversed decision in the design docs: in `specs/004-aws-component-icons/contracts/ui-surfaces.md` update the §1 "Corner treatment" bullet and the `border-radius` rows in the §2 and §3 tables to "square (radius 0)"; in `specs/004-aws-component-icons/research.md` add a dated note to R8 that the 2026-07-12 request reverses the rounded-corner choice to square. (Sonnet 5 · low)
- [X] T023 Verify: `cd frontend && npm run lint && npm test` stay green, and visually confirm square-cornered tiles on both surfaces (palette chip + a placed canvas node). (Sonnet 5 · low)

**Checkpoint**: Both icon surfaces render square tiles; frontend lint + tests green; docs reflect the square-tile decision.
