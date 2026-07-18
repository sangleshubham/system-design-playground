# Contract: UI Surfaces — Palette Chip & Design Node Tile

**Feature**: 004-aws-component-icons | **Date**: 2026-07-12
**Scope**: the two surfaces that render component icons — palette entry chips and canvas
design nodes — plus the shared rendering rules. Design rationale: [research.md R8](../research.md);
resolver contract: [icon-registry.md § 4](./icon-registry.md).

## 1. Shared rules (both surfaces)

- **Resolution**: the `<app-icon>` `name` MUST come from `componentIconName(component.icon,
  component.category)` — never from the raw `icon` field or the bare category (FR-007:
  identical fallback everywhere).
- **Tile fills its box**: registry SVGs are `1em`-sized on a 64×64 viewBox, so each surface
  sets the icon box's `font-size` equal to its box edge; the opaque tile covers the box
  exactly (no letterboxing, no pastel showing through).
- **Corner treatment**: square (radius 0). Corner clipping comes from the *container*
  (`border-radius` + `overflow: hidden`) — the SVG artwork itself is never edited (FR-006).
  Both surfaces set `border-radius: 0`, giving a fully square tile with one mechanism for
  AWS, companion, and fallback tiles alike (SC-004). *(2026-07-12: reversed from the original
  rounded-square choice — see research R8.)*
- **Pastel retirement is icon-scoped**: only the icon-chip `--category-*-bg/-fg` rules on
  these two surfaces are deleted. Every other `--category-*` token consumer in the app is
  out of scope and unchanged (spec clarification 2026-07-11).
- **Accessibility/theming**: `<app-icon>`'s `aria-hidden="true"` span is unchanged (names sit
  beside the icons as text). Tiles are opaque fixed brand colors and MUST NOT be theme-tinted;
  the surrounding card surfaces (`--surface-*`) keep contrast responsibility (spec edge case).
- **Non-component glyphs untouched**: search, note, play, lock, etc. keep rendering from the
  existing UI-glyph entries (FR-004 carve-out).

## 2. Palette entry chip — `features/playground/palette/`

### `palette.component.html`

| | Contract |
|---|---|
| Before | `<span class="pal-icon" [attr.data-category]="c.category"><app-icon [name]="c.icon" /></span>` |
| After | `<span class="pal-icon"><app-icon [name]="iconFor(c)" /></span>` — `data-category` attribute dropped (its only consumer was the pastel CSS below) |

### `palette.component.ts`

Expose the resolver to the template (pure, OnPush-safe):

```ts
iconFor(c: CatalogComponent): string {
  return componentIconName(c.icon, c.category);
}
```

### `palette.component.scss` — `.pal-icon`

| Property | Before | After |
|---|---|---|
| `width`/`height` | 28px / 28px | unchanged (no layout shift) |
| `border-radius` | 7px | **0** (square tile, 2026-07-12) |
| `font-size` | 16px | **28px** (tile fills the chip) |
| `overflow` | — | **hidden** (clips tile to the square box) |
| 7 × `.pal-icon[data-category='…']` pastel rules | present | **deleted** |

### `palette.component.spec.ts` additions

1. A rendered entry's `<app-icon>` receives the resolved id (e.g. `blob-storage` → `aws-s3`).
2. An entry whose catalog `icon` is unknown renders `fallback-<category>` (FR-007 smoke).
3. No `.pal-icon` element carries a `data-category` attribute anymore.

## 3. Canvas design node — `features/playground/canvas/design-node.component.*`

### `design-node.component.ts`

| | Contract |
|---|---|
| Before | `readonly iconName = computed(() => this.component()?.icon ?? this.category());` |
| After | `readonly iconName = computed(() => componentIconName(this.component()?.icon ?? '', this.category()));` |

`''` is never a registry key, so a node with no resolved catalog component (deleted/unknown
`componentId`) also lands on the category fallback tile — strictly better than today's raw
category-glyph fallback and identical in shape to the unknown-icon path. The
`[attr.data-category]` binding on `.card` stays (harmless hook; other node styling may use it
later), but no icon CSS keys off it anymore.

### `design-node.component.scss` — `.icon`

| Property | Before | After |
|---|---|---|
| `width`/`height` | 34px / 34px | unchanged (no layout shift; node card width 170px untouched) |
| `border-radius` | 9px | **0** (square tile, 2026-07-12) |
| `font-size` | 20px | **34px** |
| `overflow` | — | **hidden** |
| 7 × `.card[data-category='…'] .icon` pastel rules | present | **deleted** |

### Spec additions (canvas/design-node tests)

1. A node for `dns` renders `<app-icon name="aws-route-53">`.
2. A node whose component is `undefined` renders `fallback-services` (default category path).
3. A node whose component has an unknown `icon` renders `fallback-<its category>`.

## 4. Size & legibility budget (SC-006)

Rendered tile sizes: 28px (palette), 34px × canvas zoom (design node; zoom range per
playground store). All entries are vector (FR-008) — crispness at any zoom is inherent;
legibility at 28px is verified visually in [quickstart.md](../quickstart.md) step 4.
