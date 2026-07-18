# Contract: Components API & Content Validation

**Feature**: 004-aws-component-icons | **Date**: 2026-07-12
**Scope**: `GET /api/v1/components` response semantics and the startup content-validation gate for icon ids. Design rationale: [research.md R6, R7](../research.md); vocabulary: [data-model.md § 2](../data-model.md).

## 1. Endpoint (shape unchanged)

`GET /api/v1/components` (`backend/src/routes/components.route.ts`) continues to return the full
catalog as a JSON array of `Component` objects. **No route, method, status code, or field is
added, removed, or retyped** — this is not a breaking API change and requires no `/api/v2/`
(Constitution: Technology Stack & Constraints). The only change is the *vocabulary* of the
existing `icon: string` field.

### Component object — field-level contract

| Field | Type | Change |
|---|---|---|
| `id`, `name`, `tech`, `category`, `description`, `costPerHr`, `latencyMs` | unchanged | **None** (FR-010) |
| `icon` | `string` | Value domain changes from the 7 category names (`user`, `networking`, …) to exactly one of the 42 component-icon ids (`aws-*` / `tile-*`) enumerated in [data-model.md § 2](../data-model.md) |

### Example — `blob-storage` entry

```jsonc
// Before                                   // After
{                                           {
  "id": "blob-storage",                       "id": "blob-storage",
  "icon": "storage",                          "icon": "aws-s3",
  ...                                         ...   // every other field byte-identical
}                                           }
```

## 2. Consumer contract

- Consumers MUST treat `icon` as an **opaque icon-registry key**, resolved exclusively through
  the frontend resolver `componentIconName(icon, category)` ([icon-registry.md § 4](./icon-registry.md)).
- Consumers MUST NOT assume `icon === category` (true before this feature, false after) and
  MUST NOT switch on specific icon-id values.
- Unknown ids MUST degrade to the category fallback tile at render time (FR-007) — the API
  never guarantees the frontend registry and content are the same age (e.g. mid-refresh).

## 3. Backend schema change (`backend/src/models/index.ts`)

```ts
/** The 42 valid component icon ids — mirror of the frontend registry's component entries.
 *  fallback-* ids are deliberately excluded: they are runtime-only (FR-007). */
export const COMPONENT_ICON_IDS = [
  'aws-route-53', /* … 22 more aws-* … */
  'tile-client',  /* … 18 more tile-* … */
] as const;

// ComponentSchema: icon: z.string().min(1)  →  icon: z.enum(COMPONENT_ICON_IDS)
```

- Full 42-value list: [data-model.md § 2](../data-model.md). Order: the 23 `aws-*` ids first
  (catalog order), then the 19 `tile-*` ids (catalog order).
- The constant is hand-mirrored with the frontend registry keys per the repo's documented
  mirror convention (`models.ts` headers on both sides). A mirror-drift note MUST be added to
  both file headers naming the counterpart file.
- `fallback-<category>` ids MUST NOT appear in the enum — content cannot reference them.

## 4. Startup validation contract (FR-007, first half)

Existing mechanism, new coverage — `ContentService.load()` already parses `components.json`
with `z.array(ComponentSchema)` and fails fast with `ContentError` before the server accepts
requests. With the enum in place:

| Condition | Outcome |
|---|---|
| Every `icon` ∈ `COMPONENT_ICON_IDS` | Server starts; catalog served |
| Any unknown/typo'd `icon` value | Startup aborts with `ContentError`: `Invalid content in components.json:` followed by the offending index + field path (e.g. `  - 13.icon: Invalid enum value …`) |
| Two components sharing an icon id | Rejected by review + registry uniqueness test (FR-005); the schema alone does not forbid duplicates — the authoritative 1:1 mapping is the spec table, asserted by `component-icon.registry.spec.ts` and `backend/tests/content/icon-ids.test.ts` |

### Test contract (`backend/tests/content/icon-ids.test.ts`)

1. The shipped `backend/content/components.json` parses successfully against the updated schema.
2. All 42 shipped `icon` values are pairwise distinct (FR-005, content side).
3. A component object with `icon: "storage"` (legacy value) or any unknown string **fails**
   `ComponentSchema` parsing (regression gate for the vocabulary switch).
