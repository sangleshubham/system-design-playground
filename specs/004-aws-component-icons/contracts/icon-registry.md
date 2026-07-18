# Contract: Component Icon Registry

**Feature**: 004-aws-component-icons | **Date**: 2026-07-12
**Scope**: `frontend/src/app/shared/component-icon.registry.ts` (new), its merge into
`icon.registry.ts`, the id grammar, tile composition, fallback resolution, and the
generation script. Design rationale: [research.md R1–R7, R9, R10](../research.md).

## 1. Module exports

```ts
// component-icon.registry.ts
export const COMPONENT_ICONS: Record<string, string>;                  // 49 entries, § 2
export function componentIconName(icon: string, category: Category): string;  // § 4
```

`icon.registry.ts` merges the map into the existing registry — UI glyphs untouched:

```ts
export const ICONS: Record<string, string> = {
  /* …existing category icons + UI glyphs, unchanged… */
  ...COMPONENT_ICONS,
};
```

`<app-icon>` (`app-icon.component.ts`) is **not modified**: it keeps resolving
`ICONS[name]` and sanitizing via `bypassSecurityTrustHtml`. Its `name` input remains the
public contract for every surface.

## 2. Entries — 49 total

| Class | Count | Key grammar | Value construction |
|---|---|---|---|
| AWS Service icons | 23 | `aws-<service-slug>` (names the AWS *service*) | Generated from the pinned package by the § 5 script; normalization per § 3 |
| Companion tiles | 19 | `tile-<component-id>` (names the *component*) | `tile(fill, glyph24)` composer, § 6; fills fixed by [data-model.md § 2](../data-model.md) |
| Fallback tiles | 7 | `fallback-<category>` (one per `Category`) | `tile('#232F3E', <existing category stroke glyph inner markup>)` — runtime-only, never valid content (FR-007) |

Exact key list: [data-model.md § 2–3](../data-model.md). Keys MUST NOT collide with any
existing `ICONS` UI-glyph key (guaranteed by the prefixes; asserted by test, § 7).

## 3. AWS entry normalization (FR-006 whitelist)

Source files: `Architecture-Service-Icons_04302026/Arch_<Category>/48/Arch_<Service>_48.svg`
(release 2026-04-30, `viewBox="0 0 64 64"`). The **only** permitted transformations:

1. Slice from the first `<svg` to the last `</svg>` — this symmetrically drops the XML prolog
   (`<?xml … ?>`, invalid inside `innerHTML`) and any trailing newline, keeping all *internal*
   whitespace verbatim.
2. Remove the `<title>…</title>` element — prevents stray native tooltips (no-op on files that
   lack one).
3. Remove all `id="…"` attributes — prevents duplicate-id DOM collisions across instances.
   Verified safe for this release: none of the 23 mapped files reference an id via `url(#…)`,
   `xlink:href`, gradients, clipPaths, or masks (the script hard-fails on any `url(#` as a
   future-refresh guard).
4. Normalize the **root** `<svg>` element's `width`/`height` to `1em` — registry sizing
   convention (CSS `font-size` controls rendered size). The rewrite matches the value whether
   it is `64px` *or* `64` (the package is heterogeneous: most files are older Sketch exports
   with `64px`, but `Arch_Amazon-API-Gateway_48.svg` is a newer export with bare `64` and no
   prolog/`<title>`). The match is scoped to the opening tag, so the inner `<rect width="64"
   height="64">` background and any `stroke-width` are never touched; `viewBox` is untouched, so
   proportions are identical.

**Prohibited** (FR-006): any change to paths, fills, gradients, proportions, structure,
`viewBox`, element order — no recoloring, redrawing, distortion, rotation, or cropping.
Anything not in the whitelist ships byte-identical to the AWS package.

## 4. Fallback resolver (FR-007, second half)

```ts
componentIconName(icon: string, category: Category): string
// → icon                     if icon is a key of the merged ICONS map
// → `fallback-${category}`   otherwise (never '', never a missing key)
```

- Pure function; no logging, no throwing — content problems are the startup gate's job
  ([components-api.md § 4](./components-api.md)).
- Both render surfaces MUST resolve through this function ([ui-surfaces.md](./ui-surfaces.md))
  so fallback behavior is pixel-identical everywhere.
- All 7 `fallback-<category>` keys MUST exist, so the resolver's result always renders a tile
  (never `<app-icon>`'s empty-string branch).

## 5. Generation script — `frontend/tools/generate-component-icons.mjs`

| Aspect | Contract |
|---|---|
| Runtime | Plain Node (`node:fs`, `node:path` only — zero dependencies); build-time only, never bundled |
| Input | CLI arg: path to the **unzipped** AWS icon package (the 13.4 MB zip is NOT committed; download URL pinned in [spec.md](../spec.md)) |
| Mapping | The 23 `aws-*` id → source-file pairs live inline in the script, matching [data-model.md § 2](../data-model.md) |
| Transform | Exactly the § 3 whitelist — nothing else |
| Output | The `AWS_ICONS` section of `component-icon.registry.ts` (deterministic: same package in → byte-identical output), written/printed for paste-or-pipe into the registry |
| Failure | Nonzero exit naming any mapped file missing from the package (guards future icon-release refreshes) |

A future AWS icon-release refresh = download new package → rerun script → regenerate
section → review diff (spec edge case "asset swap, not a redesign").

## 6. Companion/fallback tile composer

```ts
const tile = (fill: string, glyph24: string): string =>
  `<svg viewBox="0 0 64 64" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg">` +
  `<rect width="64" height="64" fill="${fill}"/>` +
  `<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" ` +
  `stroke-linejoin="round" transform="translate(12 12) scale(1.6667)">${glyph24}</g>` +
  `</svg>`;
```

- `glyph24`: inner path markup of a Lucide glyph (24×24 grid, 2px stroke) for companion
  tiles; the existing category stroke-glyph inner markup for fallback tiles.
- Geometry: glyph scales to 40×40 centered with 12px margins — matches the glyph-to-tile
  ratio of AWS Service icons (SC-004 uniformity).
- Fills: exactly the hex values in the spec's mapping table; fallback fill `#232F3E`.
- Lucide glyph choices are registry-internal: substituting a closer glyph later changes no
  content data and no id ([research R4/R6](../research.md)).

## 7. Invariants — `component-icon.registry.spec.ts`

1. **Completeness** (FR-001): all 42 component ids from the vocabulary resolve to a non-empty
   string starting with `<svg`.
2. **Uniqueness** (FR-005): the 42 component SVG strings are pairwise distinct.
3. **Fallback coverage** (FR-007): `fallback-<c>` exists for every one of the 7 categories;
   `componentIconName('nonsense', c)` returns it.
4. **Namespace safety**: no `COMPONENT_ICONS` key was already present in `ICONS` before the
   spread (spread must add 49 keys, replace none).

## 8. Licensing header (file-level requirement)

`component-icon.registry.ts` MUST open with source attributions: AWS Architecture Icons
(© Amazon Web Services — used unmodified per the package's usage terms; release 04302026;
download URL as pinned in spec.md) and the verbatim Lucide ISC license notice
([research R10](../research.md)).
