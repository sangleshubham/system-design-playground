# Implementation Plan: AWS Component Icons

**Branch**: `004-aws-component-icons` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-aws-component-icons/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the 7 generic category icons used by all 42 palette components with a per-component icon set: 23 official AWS Architecture "Service" icons (full-color tiles, pinned release 2026-04-30) for components with a concept-level AWS equivalent, and 19 companion tiles (vendored Lucide glyphs rendered white on saturated AWS-palette-colored tiles) for the rest. The authoritative component → icon mapping, tile colors, and fallback rules live in the spec's Component Icon Mapping table.

Technical approach: extend the existing inline-SVG icon registry pattern (`icon.registry.ts` + `<app-icon>`) with a new `component-icon.registry.ts` holding all 42 component tiles plus 7 navy fallback tiles — **zero new npm dependencies** (AWS SVGs are extracted from the user-supplied asset package by a small checked-in Node script; the 19 Lucide glyphs are vendored as path strings under their ISC license). `backend/content/components.json` icon values change from category names to specific icon ids, validated at startup by a `z.enum` of the 42 known ids (hand-mirrored constant, per the repo's existing frontend/backend mirror convention). Surfaces: palette entry chips and canvas design nodes swap to the tiles; pastel category tokens stay for node cards and section styling. No API shape changes, no new endpoints.

## Technical Context

**Language/Version**: TypeScript ~5.9 (strict), Angular 20.3 — standalone components, `ChangeDetectionStrategy.OnPush`, signals. Backend: Node.js + Express 5.2, Zod 4.4.

**Primary Dependencies**: **No new dependencies** (Constitution Principle III). Reuses the existing `<app-icon>` component (DomSanitizer `bypassSecurityTrustHtml` over registry strings). `lucide-angular`, `@iconify`, and shipping raw SVG files as static assets were all evaluated and rejected (see research.md R1, R4). `@foblex/flow` untouched.

**Storage**: N/A — the only data change is `backend/content/components.json` icon field values (42 strings) plus the Zod icon-id enum in `backend/src/models/index.ts`.

**Testing**: Frontend `ng test --no-watch` (Vitest) with co-located `*.spec.ts`; backend `vitest run` under `backend/tests/`. New tests: registry completeness + uniqueness (FR-005), fallback resolution (FR-007), palette/node tile rendering smoke checks, backend content-validation rejection of unknown icon ids. ESLint via `npm run lint` in both packages.

**Target Platform**: Evergreen desktop/tablet browsers (viewports ≥ 768 px), same as the existing app.

**Project Type**: Web application (`frontend/` + `backend/`); this feature is frontend-heavy with a small backend content/validation change.

**Performance Goals**: Component icon registry adds ~95 KB source (~28 KB gzipped) of inline SVG to the shared bundle — within SC-005 (playground load +≤10%) and Constitution Principle V (dashboard < 3 s). Icons are static vector strings rendered once per component under OnPush; no runtime fetches (FR-009), no animation-path impact (60 fps untouched).

**Constraints**: AWS artwork must ship byte-meaningful-unmodified — extraction may only strip XML prolog/`<title>`/`id` attributes and normalize root `width`/`height` to `1em`; no recoloring or redrawing (FR-006). All 42 icons must be visually unique (FR-005). Unknown icon ids must fail startup content validation and render the navy fallback tile if ever encountered at runtime (FR-007). Icon assets bundled, never fetched externally (FR-009). Catalog semantics (names, tech, cost, latency, missions, scoring) untouched (FR-010).

**Scale/Scope**: 42 component tiles + 7 fallback tiles = 49 new registry entries; 2 render surfaces (palette entries, canvas design nodes); 1 content file + 1 schema touched on the backend; ~2 new frontend files, ~4 edited; 1 checked-in extraction script for future AWS icon-release refreshes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Verdict | Evidence |
|---|-----------|---------|----------|
| I | Interactivity-First | ✅ PASS | No passive content is added; the feature upgrades the iconography of the existing hands-on canvas/palette, strengthening the drag-and-drop learning loop by teaching real-world AWS visual vocabulary in the same interaction. |
| II | Simplicity & Ease of Use | ✅ PASS | Zero new flows, clicks, or controls — the same surfaces simply become more scannable (industry-standard icons; SC-006 requires distinguishing any two components by icon alone). Visual language stays consistent across palette and canvas (single tile system, SC-004). |
| III | Fixed Technology Stack (NON-NEGOTIABLE) | ✅ PASS | Zero new libraries. AWS SVGs and 19 Lucide glyph paths are vendored as inline strings into the existing registry pattern; the tempting `lucide-angular` npm dependency was explicitly rejected (research R4). Angular + Express untouched. |
| IV | Modular Component Architecture | ✅ PASS | New registry lives in the existing `shared/` library consumed by feature modules; `<app-icon>` public contract is unchanged; catalog stays content-driven through the existing versioned `GET /api/v1/components` endpoint (response shape unchanged — only icon string values differ, documented in contracts/components-api.md). |
| V | Performance & Responsiveness | ✅ PASS | +~28 KB gzipped of static strings, no runtime fetches, no per-frame work, OnPush preserved; bundle impact quantified in Technical Context and verified in quickstart step 6 against SC-005. |

**Gate result (pre-Phase 0)**: PASS — no violations; Complexity Tracking intentionally empty.

**Gate result (post-Phase 1 re-check)**: PASS — the design artifacts introduce no new dependencies, no new endpoints, and no new UI surfaces; the only new mechanisms are a second registry file (mirroring an established pattern) and a build-time extraction script that never ships to the browser.

## Project Structure

### Documentation (this feature)

```text
specs/004-aws-component-icons/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── components-api.md       # GET /api/v1/components icon-field contract + validation
│   ├── icon-registry.md        # Registry entries, id scheme, tile composition, fallback
│   └── ui-surfaces.md          # Palette chip + design-node tile rendering rules
├── checklists/
│   └── requirements.md  # Spec quality checklist (complete, all pass)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── tools/
│   └── generate-component-icons.mjs        # NEW — reads the unzipped AWS icon package, emits the
│                                           #   23 cleaned AWS SVG strings for the registry (build-time
│                                           #   only, committed for future icon-release refreshes)
├── src/app/
│   ├── core/
│   │   └── models.ts                       # UNCHANGED — Component.icon stays `string` (mirror note added)
│   ├── shared/
│   │   ├── icon.registry.ts                # CHANGED — spreads COMPONENT_ICONS into ICONS; UI glyphs untouched
│   │   ├── component-icon.registry.ts      # NEW — 23 AWS SVGs + 19 companion tiles + 7 fallback tiles,
│   │   │                                   #   tile() composer, componentIconName() fallback resolver
│   │   ├── component-icon.registry.spec.ts # NEW — completeness (42 ids), uniqueness (FR-005), fallback (FR-007)
│   │   └── app-icon.component.ts           # UNCHANGED — public contract preserved
│   └── features/playground/
│       ├── palette/
│       │   ├── palette.component.html      # CHANGED — chip renders tile via componentIconName()
│       │   ├── palette.component.scss      # CHANGED — pastel chip backgrounds removed; tile sizing/radius
│       │   └── palette.component.spec.ts   # CHANGED — tile rendering assertions
│       └── canvas/
│           └── design-node.component.ts    # CHANGED — iconName() uses componentIconName(); tile styling

backend/
├── content/
│   └── components.json                     # CHANGED — 42 icon values: category names → specific icon ids
├── src/models/
│   └── index.ts                            # CHANGED — COMPONENT_ICON_IDS const + icon: z.enum(...)
└── tests/
    └── content/
        └── icon-ids.test.ts                # NEW — catalog validation rejects unknown icon ids (FR-007)
```

**Structure Decision**: Web application layout (existing `frontend/` + `backend/`). Icon assets live as inline strings in a new `shared/component-icon.registry.ts` beside the existing `icon.registry.ts`, so `<app-icon>` and every consuming surface keep their current contracts; the palette and design node only swap which name they resolve. The backend change is confined to content data plus its Zod schema — the API surface, routes, and services are untouched. The extraction script is committed under `frontend/tools/` so a future AWS icon-release refresh is a re-run + regenerate, satisfying the spec's "icon refresh = asset swap" edge case.

## Complexity Tracking

> No constitution violations — this table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
