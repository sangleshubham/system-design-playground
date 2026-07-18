# Research: AWS Component Icons

**Feature**: 004-aws-component-icons | **Date**: 2026-07-11

All Technical Context unknowns resolved. Sources: the user-supplied AWS Architecture Icons
asset package (release 04302026, downloaded from the URL in spec.md and inspected directly),
context7 documentation for the AWS icon package structure (`/awslabs/aws-icons-for-plantuml`,
which documents the official Service/Resource/Category/Group package layout), context7
resolution of companion icon libraries (`/lucide-icons/lucide`, `/tabler/tabler-icons`), and
the existing codebase (`icon.registry.ts`, `app-icon.component.ts`, `content.service.ts`,
`_tokens.scss`).

---

## R1. Icon delivery mechanism — extend the existing inline-SVG registry

**Decision**: Add `frontend/src/app/shared/component-icon.registry.ts` exporting a
`COMPONENT_ICONS: Record<string, string>` map of full `<svg>` strings, spread into the
existing `ICONS` map by `icon.registry.ts`. `<app-icon>` (DomSanitizer +
`innerHTML`) renders them exactly as it renders today's glyphs — its contract does not change.

**Rationale**: This is the codebase's established pattern ("Kept dependency-free" —
`icon.registry.ts` header). It satisfies FR-009 (assets ship in the bundle, no runtime
fetch), gives a single lookup point for the FR-007 fallback and FR-005 uniqueness test, and
requires no changes to any consumer of `<app-icon>`. Measured cost: the 23 AWS 48px SVGs
total 87,285 bytes raw; after stripping prolog/title/ids and adding 19 companion tiles
(~200 bytes each) + 7 fallbacks, ~95 KB source ≈ 28 KB gzipped — acceptable against
SC-005 and the 3 s dashboard budget (Principle V).

**Alternatives considered**:
- *Static SVG files under `frontend/public/` + `<img src>`*: per-icon HTTP requests, no
  single validation point, bypasses the existing `<app-icon>` mechanism, and `<img>` can't
  participate in the tile composition for companion icons. Rejected.
- *SVG sprite sheet*: build tooling complexity (sprite generation step in the Angular
  build) for zero user-visible benefit at 49 icons. Rejected.
- *Base64 data-URIs in CSS*: worse compression than inline XML, harder to test. Rejected.

## R2. AWS asset family and size — Architecture-Service-Icons, 48px SVG directory

**Decision**: Source all 23 AWS icons from
`Architecture-Service-Icons_04302026/Arch_<Category>/48/Arch_<Service>_48.svg`.

**Rationale**: The spec pins the Service family (full-color tiles; clarified with the user).
Within the package, every size directory (16/32/48/64) contains the same vector artwork on a
`viewBox="0 0 64 64"` canvas — the directories differ only in intended raster export size, so
one canonical directory is enough; 48 is AWS's default diagram size and every mapped service
was verified present there (file list + byte sizes recorded during planning; total 87,285
bytes). SVG scales losslessly for every size the app renders (FR-008).

**Alternatives considered**: Resource-Icons family (outline style — rejected by user in
clarification), 64px directory (identical artwork, no benefit), PNGs (raster, violates FR-008).

## R3. SVG hygiene — minimal mechanical cleanup, artwork untouched

**Decision**: The extraction script strips, per file: the XML prolog (`<?xml ...?>`), the
`<title>` element, and all `id="..."` attributes; and rewrites the root element's
`width`/`height` to `1em` so CSS `font-size` controls rendered size (the
convention every existing registry icon uses). Nothing else changes — paths, fills, and
structure ship exactly as AWS authored them.

**Refinement (recorded during T001 implementation)**: the release-04302026 package is *not*
uniformly formatted. 22 of the 23 mapped files are older Sketch exports (`<?xml?>` prolog +
`<title>` + `width="64px" height="64px"` + 4-space indentation); `Arch_Amazon-API-Gateway_48.svg`
is a newer export with **no** prolog, **no** `<title>`, bare `width="64" height="64"` (no `px`),
and a trailing newline. The script therefore (a) extracts from the first `<svg` to the last
`</svg>` (dropping prolog *and* trailing newline symmetrically; transforms 2/3 become no-ops on
files that lack a `<title>`/`id`), and (b) generalizes the root width/height rewrite to match
`64px` *or* `64`, scoped to the opening `<svg>` tag so the inner background `<rect width="64"
height="64">` is never touched. A scan confirmed none of the 23 files use `url(#…)`/gradients/
clipPaths/`xlink:href`, so stripping every `id` is safe; the script hard-fails on any `url(#`
occurrence to guard future refreshes. `viewBox`, paths, fills, and proportions remain
byte-identical (FR-006 preserved).

**Rationale**: The prolog is invalid inside `innerHTML`; `<title>` would produce stray
tooltips; duplicate `id` attributes across 23 inlined icons (AWS uses `id="Icon-Architecture/48/..."`
on groups) risk DOM id collisions when several icons render at once; `1em` sizing is required
for the surfaces' existing font-size-based sizing to keep working. These are packaging
adjustments, not artwork modifications — FR-006 (no recolor/redraw/distort/rotate) is
preserved; every `fill`, path, and proportion is byte-identical.

**Alternatives considered**: `svgo` optimization — rejected: new dev dependency (Principle
III scrutiny) and unnecessary; AWS 48px SVGs are already small and hand-verified regex
cleanup is auditable in the committed script.

## R4. Companion glyph sourcing — vendor 19 Lucide path sets, no npm package

**Decision**: Copy the inner path markup of the 19 mapped Lucide glyphs (24×24, 2px stroke)
into `component-icon.registry.ts` as string constants, with the Lucide ISC license notice in
the file header. No `lucide-angular`/`lucide` npm dependency.

**Rationale**: Constitution Principle III demands justification for every new library; for 19
static strings a runtime dependency (plus its Angular wrapper components and tree-shaking
configuration) is unjustifiable. Vendoring matches the registry's dependency-free convention
and freezes the glyph artwork (immune to upstream redesigns). Lucide's ISC license permits
redistribution with the notice retained. Lucide was chosen over Tabler (5,945 icons, MIT) with
the user — both share the 24×24/2px-stroke grid; Lucide is the de-facto standard and covers
all 19 concepts. Glyph names in the spec table are explicitly indicative: at implementation
time each is verified against lucide.dev and may be substituted by a closer glyph without
spec change (the tile id, color, and component assignment are what's fixed).

**Alternatives considered**:
- *`lucide-angular` npm package*: runtime dependency + component indirection for 19 icons;
  fails Principle III proportionality. Rejected.
- *Iconify*: meta-aggregator, runtime icon loading model conflicts with FR-009. Rejected.
- *Simple Icons brand logos*: offered to the user during specify; not selected (uneven
  shapes, gaps for concept components like Circuit Breaker).

## R5. Companion tile composition — build AWS-format SVGs at registry definition time

**Decision**: A `tile(fill: string, glyph24: string): string` helper composes each companion
icon as a full SVG in the exact shape of an AWS Service icon:

```
<svg viewBox="0 0 64 64" width="1em" height="1em">
  <rect width="64" height="64" fill="{fill}"/>
  <g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"
     stroke-linejoin="round" transform="translate(12 12) scale(1.6667)">{glyph24}</g>
</svg>
```

The 24×24 glyph scales to 40×40 centered in the 64×64 tile (12px margins), visually matching
the glyph-to-tile ratio of AWS Service icons; white stroke at effective ~3.3px weight reads
equivalently to AWS's white artwork on saturated fills.

**Rationale**: Companion icons become structurally identical to AWS icons (same viewBox, same
root sizing, same tile-with-glyph anatomy), so every downstream rule — sizing, corner
rounding, uniqueness testing — treats all 49 entries uniformly (SC-004). Colors come from the
spec's mapping table (extracted from the pinned package: Networking `#8C4FFF`, Database
`#C925D1`, App-Integration/Management `#E7157B`, AI `#01A88D`, dark navy `#232F3E`).

**Alternatives considered**: CSS-composed tiles (background-color on the container + plain
glyph icon) — rejected: splits the tile definition across registry and per-surface CSS,
breaks "one registry entry = one complete icon", and makes the uniqueness test meaningless.

## R6. Icon identifier scheme — component-stable ids, two prefixes

**Decision**: `components.json` icon values become: `aws-<service-slug>` for the 23 AWS
icons (e.g. `aws-route-53`, `aws-s3`, `aws-elastic-load-balancing`) and `tile-<component-id>`
for the 19 companion icons (e.g. `tile-bloom-filter`, `tile-rate-limiter`). The full
vocabulary is enumerated in data-model.md.

**Rationale**: AWS ids name the *service* (the icon is the service's icon — reusable if
another component ever maps to the same service is prevented by FR-005 anyway); companion ids
name the *component*, so a future glyph substitution (R4) is a registry-internal edit with no
content-data ripple. Prefixes make the icon class self-describing in content review and keep
the component-icon namespace disjoint from existing UI glyph names (verified: no collisions).

**Alternatives considered**: raw Lucide glyph names as ids (`gauge`, `filter`) — rejected:
couples content data to an indicative glyph choice; renaming the glyph would require a
content change. Bare service names without prefix — rejected: ambiguous against UI glyphs.

## R7. Validation — backend Zod enum, frontend runtime fallback

**Decision**: `backend/src/models/index.ts` gains
`export const COMPONENT_ICON_IDS = [ ...42 ids ] as const;` and the Component schema's
`icon: z.string().min(1)` becomes `icon: z.enum(COMPONENT_ICON_IDS)`. On the frontend,
`componentIconName(icon: string, category: Category): string` returns `icon` when present in
the merged registry, else `fallback-<category>` — used by both the palette and the design
node. Seven `fallback-<category>` entries render the existing category stroke glyph white on
a `#232F3E` navy tile via the R5 composer.

**Rationale**: Satisfies FR-007's two halves exactly: startup content validation rejects
unknown ids (the ContentService already fails fast on schema violations with per-file error
messages), and rendering can never produce a blank even if content and registry drift (e.g.
during future icon refreshes). The hand-mirrored constant follows the repo's documented
convention (`models.ts` header: "Kept in sync by hand"). Fallback ids are runtime-only — they
are deliberately *not* in the enum, so content cannot reference them directly.

**Alternatives considered**: sharing the id list via a common package — rejected: the repo
has no shared package infrastructure and its convention is hand-mirroring; introducing
workspace tooling for one constant fails proportionality. Frontend-only validation —
rejected: FR-007 explicitly requires startup content validation.

## R8. Surface changes — palette chip and design node consume tiles; pastels stay elsewhere

**Decision**: The palette entry chip (`.pal-icon`, 28×28, radius 7px) keeps its box but drops
all seven `data-category` pastel background/color rules — the tile SVG brings its own fill;
`font-size` rises to 28px so the tile fills the chip, and `overflow: hidden` + the existing
border-radius clip the tile corners. The design node's `.icon` span gets the same
treatment at its current size, and `iconName()` switches from `component()?.icon ?? category()`
to `componentIconName(...)`. Node cards' pastel `data-category` backgrounds and all other
pastel token uses are untouched (per clarification: pastels no longer drive icon fills but
remain elsewhere).

**Rationale**: Smallest change that delivers SC-004 uniform tiles on both surfaces; rounding
via container clipping keeps AWS artwork unmodified (FR-006 — the artwork string is
untouched; the container crops corners of the background fill only, the standard treatment in
diagram tooling) while honoring the spec's "rounded square tile / consistent corner
treatment". No layout shifts: chip and icon boxes keep their dimensions.

**Alternatives considered**: adding `rx` to tile rects and AWS rects — rejected: editing AWS
artwork violates FR-006. Leaving palette chip pastel backgrounds behind the tiles — rejected:
invisible (tiles are opaque) dead CSS that contradicts the clarified color decision.

**Update (2026-07-12)**: Per user request, the corner treatment is reversed from rounded to
**fully square** — both surfaces set `border-radius: 0` (`.pal-icon` 7px→0, `.icon` 9px→0).
This is a CSS-only change: the tile SVG artwork is still untouched (FR-006 holds), box
dimensions and `overflow: hidden` are unchanged (no layout shift), and the same
container-clipping mechanism now clips to a square instead of a rounded box.

## R9. Extraction script — committed, build-time only

**Decision**: `frontend/tools/generate-component-icons.mjs` (plain Node, no dependencies)
takes the path to an unzipped AWS icon package, reads the 23 mapped files (mapping table
inline), applies R3 cleanup, and prints/writes the `AWS_ICONS` section of
`component-icon.registry.ts`. The 13.4 MB zip itself is **not** committed — only the ~90 KB
of generated registry content is; the script + the pinned download URL (in spec.md) make
regeneration reproducible.

**Rationale**: Supports the spec edge case "icon release updates must be a data/asset swap,
not a redesign"; keeps the repo light; makes the AWS-artwork provenance auditable (reviewers
can diff regenerated output against the committed registry).

**Alternatives considered**: committing the zip (13.4 MB of dead weight; rejected), manual
one-off copy-paste with no script (unreproducible next refresh; rejected), downloading at
build time (network dependency in builds, violates the spirit of FR-009; rejected).

## R10. Licensing — compatible, with notices

**Decision**: Proceed with both sources. Add source-attribution header comments to
`component-icon.registry.ts`: AWS Architecture Icons (© Amazon Web Services, used per the
package's included usage terms for architecture diagramming; release 04302026, download URL
recorded) and Lucide (ISC notice retained verbatim).

**Rationale**: AWS publishes the icon set expressly for building architecture diagrams
(package ships with usage guidance; unmodified use honored via FR-006/R3). Lucide's ISC
license requires only notice retention. Both are compatible with an internal learning app;
FR-006 compliance is enforced structurally by R3's whitelist-only transformations.

**Alternatives considered**: n/a — legal posture, not a design choice.
