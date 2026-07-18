# Data Model: Canvas Editing Shortcuts & Navigation Aids

**Feature**: 003-canvas-editing-shortcuts | **Date**: 2026-07-11

All entities are **frontend, in-memory** state. No backend models, API payloads, or persisted schemas change. Existing entities (`DesignNode`, `DesignEdge`, `StickyNote` in `frontend/src/app/core/models.ts`) are reused unmodified.

---

## 1. ClipboardBuffer *(new — `PlaygroundStore`)*

The single, transient capture produced by Copy. At most one exists; a new Copy replaces it; it dies with the store instance (per-page provider), so navigating away or reloading discards it (FR-007).

| Field | Type | Description |
|---|---|---|
| `components` | `CopiedComponent[]` | Copied component nodes, positions normalized (see below) |
| `stickyNotes` | `CopiedStickyNote[]` | Copied sticky notes, positions normalized |
| `connections` | `CopiedConnection[]` | Connections internal to the copied set |
| `origin` | `{ x: number; y: number }` | Bounding-box top-left of the captured items at copy time — the paste cascade's base point |
| `pasteCount` | `number` | Paste generations consumed from this buffer; starts 0, +1 per paste; a new Copy resets it |

**Representation**: store signal `clipboard: Signal<ClipboardBuffer | null>` (`null` = nothing copied).

### CopiedComponent

| Field | Type | Source | Notes |
|---|---|---|---|
| `componentId` | `string` | `DesignNode.componentId` | Catalog reference — same canvas ⇒ always valid (spec: same-canvas scope) |
| `displayName` | `string` | `DesignNode.displayName` | Custom rename preserved (FR-001) |
| `note` | `string` | `DesignNode.note` | Attached note text preserved (FR-001) |
| `dx`, `dy` | `number` | `node.x - origin.x`, `node.y - origin.y` | Offsets from capture origin — preserve relative layout (FR-003) |

**Deliberately absent**: `id`. The buffer is id-free; identities are minted at paste time.

### CopiedStickyNote

| Field | Type | Notes |
|---|---|---|
| `text` | `string` | Sticky note content |
| `dx`, `dy` | `number` | Offsets from capture origin |

### CopiedConnection

| Field | Type | Notes |
|---|---|---|
| `sourceIndex` | `number` | Index into `components` of the source endpoint |
| `targetIndex` | `number` | Index into `components` of the target endpoint |

Index-pair encoding makes every paste remap trivially: pasted node ids are generated in `components` order, so `connections` resolve by position. A connection is captured **iff both endpoints are in the copied selection** (FR-001, spec scenario 3).

### Validation rules

- Copy with empty selection ⇒ no-op; existing buffer **preserved** (FR-008).
- Paste with `clipboard === null` ⇒ no-op; Paste controls disabled (FR-008).
- Selection containing only sticky notes ⇒ valid buffer with `components: []`, `connections: []` (spec edge case).
- Capture never mutates the design; materialization goes through one `commit()` (FR-006).

### State transitions

```
            copySelection() w/ selection            copySelection() w/ selection
  (null) ─────────────────────────────▶ (buffer) ──────────────────────────────▶ (new buffer, pasteCount 0)
                                          │  ▲
                            paste()       │  │ pasteCount += 1 (same buffer)
                                          ▼  │
                                        (buffer)
  any state ── store destroyed (navigate away / reload) ──▶ gone
```

### Derived paste placement

`pastePosition(generation n, item) = origin + (n × PASTE_OFFSET, n × PASTE_OFFSET) + (dx, dy)` with `PASTE_OFFSET = 24` canvas px (tuning constant, spec Assumptions). Generation = `pasteCount + 1` at the moment of pasting (FR-003/FR-004 cascade). Duplicate materializes at generation 1 from a throwaway capture of the live selection, leaving `clipboard` untouched (FR-014).

---

## 2. AlignmentGuide *(new — transient, `AlignmentGuidesComponent`)*

A guide line shown while dragging; exists only during a drag; never persisted; never affects positions (FR-020/FR-021).

| Field | Type | Description |
|---|---|---|
| `orientation` | `'vertical' \| 'horizontal'` | Line direction |
| `position` | `number` | Canvas-space x (vertical) or y (horizontal) of the alignment |
| `start`, `end` | `number` | Extent along the guide covering the dragged bounds and matched peer |
| `kind` | `'edge' \| 'center'` | Which alignment matched (styling hook) |

**Supporting transient state** (component-internal): peer rects cached at `fDragStarted`; dragged-group bounding box sampled per animation frame; `ALIGN_TOLERANCE` (small px constant, tuning value). Rules: guides derive from the dragged group's **overall bounds** for multi-drag (spec US5 scenario 4); only nearest matches per axis render (edge case: many-node canvases don't fill with lines); all guides clear on `fDragEnded` or when alignment is lost.

---

## 3. ContextMenuState *(new — transient, `CanvasComponent` / `CanvasContextMenuComponent`)*

| Field | Type | Description |
|---|---|---|
| `open` | `boolean` | Menu visibility |
| `anchor` | `{ x: number; y: number }` | Screen coordinates of the right-click (CDK Overlay anchor) |
| `zone` | `'selection' \| 'canvas'` | Right-clicked a node/sticky-note/selection vs empty canvas — decides entries (FR-017/FR-018) |

Entry set by zone: `selection` → Copy, Duplicate, Delete; `canvas` → Paste, Select All. Each entry carries a disabled predicate (see `contracts/ui-components.md`). Menu closes on action, outside click, Escape, or scroll/drag start (edge case: never interrupts an in-progress gesture — `contextmenu` during drag is ignored).

---

## 4. PlaygroundStore extensions *(changed — `state/playground.store.ts`)*

New state:

| Member | Type | Purpose |
|---|---|---|
| `clipboard` | `signal<ClipboardBuffer \| null>` | §1 |
| `canPaste` | `computed<boolean>` | `clipboard() !== null && !locked()` — drives Paste button/menu disabled state |
| `canCopy` | `computed<boolean>` | selection non-empty `&& !locked()` |
| *(private)* coalescing state | `{ key: string; expiresAt: number } \| null` | Nudge-burst window (R7) |

New/changed behavior (full signatures in `contracts/store-api.md`): `copySelection()`, `pasteClipboard()`, `duplicateSelection()`, `nudgeSelection(dx, dy)` via coalesced commit, `selectAllElements()`. All mutating paths route through the existing `commit()` gate (or its new coalesced variant), inheriting: undo history (`past`/`future`, `MAX_HISTORY = 100` unchanged), redo-stack clearing, autosave triggering via signal writes (FR-025), and lock refusal (FR-022).

---

## 5. Existing entities referenced (unchanged)

| Entity | Where | Role here |
|---|---|---|
| `DesignNode { id, componentId, displayName, note, x, y }` | `core/models.ts` | Copy source / paste product |
| `DesignEdge { id, sourceNodeId, targetNodeId }` | `core/models.ts` | Copy source / paste product |
| `StickyNote { id, text, x, y }` | `core/models.ts` | Copy source / paste product |
| `Selection { nodes: string[]; edges: string[] }` | store signal | Copy/duplicate/nudge/delete operand; select-all target |
| `Snapshot { nodes, edges, stickyNotes }` | store (history) | Unchanged undo/redo unit |

**Id remapping note**: pasted entities get fresh `crypto.randomUUID()` ids via the store's existing `newId()`. Foblex connector ids are derived (`nodeId + '__out'/'__in'`, `canvas.component.ts:26-27`), so remapped node ids automatically produce valid connector endpoints — no extra mapping table needed.
