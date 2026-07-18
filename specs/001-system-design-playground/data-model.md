# Data Model: Interactive System Design Playground

**Date**: 2026-07-08 | **Plan**: [plan.md](./plan.md)

Two data domains with different lifecycles:

- **Content** (read-only at runtime): components, acts, levels, missions, hints —
  authored as JSON under `backend/content/`, validated with zod at server start.
- **User state** (mutable): designs, attempts, progress, sandbox designs — SQLite.

TypeScript interfaces below are the shared shapes (`backend/src/models/`, mirrored in
`frontend/src/app/core/api/`); persistence notes follow each entity.

## Content Entities

### Component

```ts
interface Component {
  id: string;               // stable slug, e.g. "load-balancer"
  name: string;             // "Load Balancer"
  tech: string;             // technology label, e.g. "HAProxy/ALB"
  category: 'user' | 'networking' | 'compute' | 'storage'
          | 'caching' | 'messaging' | 'services';
  description: string;
  costPerHr: number;        // USD/hr, >= 0
  latencyMs: number;        // >= 0
  icon: string;             // icon key resolved by the frontend icon registry
}
```

- Catalog: ~42 entries in `content/components.json`.
- Validation: unique `id`; category one of the seven; cost/latency non-negative.

### Act

```ts
interface Act {
  id: string;               // "act-1"
  order: number;            // 1-based, unique
  title: string;            // "The Fundamentals"
  description: string;
}
```

### Level

```ts
interface Level {
  id: string;               // "level-1"
  actId: string;            // FK → Act
  order: number;            // global 1-based order; defines the unlock chain
  title: string;            // "The Static App"
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'legendary';
  summary: string;          // short card description
  narrative: string;        // "The Challenge" story text (markdown)
  objectives: string[];     // learning-objective chips
  specs: {
    functional: string[];
    nonFunctional: string[];       // includes latency target text
    constraints: string[];
    budgetPerHr: number;           // USD/hr cap for Efficiency scoring
    latencyTargetMs?: number;      // machine-readable target for Efficiency
    capacity: string[];            // scale assumptions
    tradeoff: string;              // the conceptual lesson
    bonus?: string;
  };
  missions: Mission[];
  topologyRules: TopologyRule[];   // structural predicates for Topology scoring
  resilienceRules: ResilienceRule[];
  recommendedComponentIds: string[];
  hints: string[];                 // ordered, all free
}
```

- Validation: `order` unique and contiguous across the catalog (defines FR-024's
  chain); `recommendedComponentIds` ⊆ catalog ids; at least one non-bonus mission.

### Mission

```ts
type Mission =
  | { id: string; kind: 'add';     componentId: string; label: string; bonus?: boolean }
  | { id: string; kind: 'connect'; fromComponentId: string; toComponentId: string;
      label: string; bonus?: boolean };
```

- Check rules (single source of truth in `mission.service`, used by both the live
  checklist and the Missions scoring dimension — SC-006):
  - `add`: satisfied iff ≥ 1 node of `componentId` exists on the canvas.
  - `connect`: satisfied iff ≥ 1 edge exists whose source node is of
    `fromComponentId` and target node is of `toComponentId` (by component type, so
    renamed nodes still count — FR-016).
  - `bonus` missions never block completion; they feed the score only.

### TopologyRule / ResilienceRule

```ts
type TopologyRule =
  | { kind: 'forbidden-edge'; fromComponentId: string; toComponentId: string; message: string }
  | { kind: 'required-between'; viaComponentId: string;
      fromComponentId: string; toComponentId: string; message: string };

type ResilienceRule =
  | { kind: 'no-spof'; componentId: string; message: string }        // needs >= 2 instances
  | { kind: 'requires-companion'; componentId: string;
      companionComponentId: string; message: string };               // e.g. queue → DLQ
```

- Declarative per-level data interpreted by the scoring rule modules; adding a new
  rule kind is a backend-only change.

## User-State Entities

### Design (one per level, plus sandbox designs)

```ts
interface Design {
  id: string;                    // uuid
  levelId: string | null;        // null → sandbox design
  name: string | null;           // sandbox designs are nameable; level designs null
  nodes: DesignNode[];
  edges: DesignEdge[];
  notes: StickyNote[];
  revealedHintCount: number;     // 0..hints.length (level designs only)
  updatedAt: string;             // ISO timestamp
}

interface DesignNode {
  id: string;                    // uuid
  componentId: string;           // FK → Component (immutable type — FR-016)
  displayName: string;           // defaults to component name; user-renamable
  note: string;                  // per-node note, '' if none
  x: number; y: number;
}

interface DesignEdge {
  id: string;
  sourceNodeId: string;          // directed: source → target
  targetNodeId: string;
}

interface StickyNote {
  id: string;
  text: string;
  x: number; y: number;
}
```

- Invariants (enforced on write): no self-loop edges; no duplicate
  (sourceNodeId, targetNodeId) pairs; edge endpoints must reference existing nodes
  (FR-005).
- Persistence: SQLite `designs` table; `nodes`/`edges`/`notes` stored as a JSON
  document column (single-user, always read/written whole). Unique index on
  `levelId` (nullable, so many sandbox rows).

### Attempt

```ts
interface Attempt {
  id: string;
  levelId: string;
  scores: { missions: number; flow: number; topology: number;
            efficiency: number; resilience: number };   // each 0–100
  total: number;                 // weighted mean, 0–100
  passed: boolean;               // total >= 90
  feedback: DimensionFeedback[]; // per-dimension findings
  designSnapshot: Pick<Design, 'nodes' | 'edges'>;      // what was evaluated
  createdAt: string;
}

interface DimensionFeedback {
  dimension: 'missions' | 'flow' | 'topology' | 'efficiency' | 'resilience';
  score: number;
  findings: { ok: boolean; message: string }[];  // pass/fail lines, with figures
}
```

- Persistence: SQLite `attempts` table (JSON columns for scores/feedback/snapshot);
  indexed by `levelId`. Best score per level is derived (`MAX(total)`), not stored.

### Progress (single row — the one user)

```ts
interface Progress {
  completedLevelIds: string[];    // derived-cached from passing attempts
  unlockedThroughOrder: number;   // highest unlocked level order (starts at 1)
  lastTouchedLevelId: string | null;   // resume pointer (FR-029)
}
```

- State transitions:
  - App first run → `unlockedThroughOrder = 1`, nothing completed.
  - Attempt with `total >= 90` on level of order N → level added to
    `completedLevelIds`; `unlockedThroughOrder = max(current, N + 1)` (FR-024).
  - Opening any playground level → `lastTouchedLevelId` updated.
  - Completion is monotonic: re-running a passed level never revokes it.

## Relationships

```text
Act 1──* Level 1──* Mission
             │ 1──* TopologyRule / ResilienceRule
             │ 1──0..1 Design (level design)      Design *──1 Component (per node)
             │ 1──* Attempt
Progress (singleton) — derived from Attempts + Level.order
Sandbox: Design rows with levelId = null (0..*)
```

## Derived/View Models (API-composed, not stored)

- **MapView**: acts with level cards annotated `locked | unlocked | completed`,
  per-act counts, lab totals — composed from Levels + Progress.
- **HomeView**: lab progress %, continue card (lastTouchedLevel + its design
  timestamp), recommended next (first unlocked, uncompleted level by order).
