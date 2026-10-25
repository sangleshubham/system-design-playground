/**
 * Frontend mirror of the backend shared types (backend/src/models). Kept in sync by hand;
 * the mission-check semantics live in exactly two places (backend mission.service +
 * the playground store) by design — see data-model.md § Mission.
 *
 * MIRROR-DRIFT NOTE: the backend validates Component.icon against the 42-id
 * COMPONENT_ICON_IDS enum in backend/src/models/index.ts; here Component.icon stays
 * `string` — the frontend's safety net is the componentIconName fallback resolver, not
 * the type.
 */

export type Category =
  | 'user'
  | 'networking'
  | 'compute'
  | 'storage'
  | 'caching'
  | 'messaging'
  | 'services';

export interface Component {
  id: string;
  name: string;
  tech: string;
  category: Category;
  description: string;
  costPerHr: number;
  latencyMs: number;
  icon: string;
}

export interface Act {
  id: string;
  order: number;
  title: string;
  description: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'legendary';

export type Mission =
  | { id: string; kind: 'add'; componentId: string; label: string; bonus?: boolean }
  | {
      id: string;
      kind: 'connect';
      fromComponentId: string;
      toComponentId: string;
      label: string;
      bonus?: boolean;
    };

export type TopologyRule =
  | { kind: 'forbidden-edge'; fromComponentId: string; toComponentId: string; message: string }
  | {
      kind: 'required-between';
      viaComponentId: string;
      fromComponentId: string;
      toComponentId: string;
      message: string;
    };

export type ResilienceRule =
  | { kind: 'no-spof'; componentId: string; message: string }
  | {
      kind: 'requires-companion';
      componentId: string;
      companionComponentId: string;
      message: string;
    };

export interface LevelSpecs {
  functional: string[];
  nonFunctional: string[];
  constraints: string[];
  budgetPerHr: number;
  latencyTargetMs?: number;
  capacity: string[];
  tradeoff: string;
  bonus?: string;
}

export interface Level {
  id: string;
  actId: string;
  order: number;
  title: string;
  difficulty: Difficulty;
  summary: string;
  narrative: string;
  objectives: string[];
  specs: LevelSpecs;
  missions: Mission[];
  topologyRules: TopologyRule[];
  resilienceRules: ResilienceRule[];
  recommendedComponentIds: string[];
  hints: string[];
}

export interface DesignNode {
  id: string;
  componentId: string;
  displayName: string;
  note: string;
  x: number;
  y: number;
}

export interface DesignEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface Design {
  id: string;
  levelId: string | null;
  name: string | null;
  nodes: DesignNode[];
  edges: DesignEdge[];
  notes: StickyNote[];
  revealedHintCount: number;
  updatedAt: string;
}

export interface DesignUpsertRequest {
  nodes: DesignNode[];
  edges: DesignEdge[];
  notes: StickyNote[];
  revealedHintCount: number;
}

export type Dimension = 'missions' | 'flow' | 'topology' | 'efficiency' | 'resilience';

export interface Finding {
  ok: boolean;
  message: string;
}

export interface DimensionFeedback {
  dimension: Dimension;
  score: number;
  findings: Finding[];
}

export interface Scores {
  missions: number;
  flow: number;
  topology: number;
  efficiency: number;
  resilience: number;
}

export interface Attempt {
  id: string;
  levelId: string;
  scores: Scores;
  total: number;
  passed: boolean;
  feedback: DimensionFeedback[];
  designSnapshot: { nodes: DesignNode[]; edges: DesignEdge[] };
  createdAt: string;
}

export interface AttemptResult {
  attemptId: string;
  scores: Scores;
  total: number;
  passed: boolean;
  feedback: DimensionFeedback[];
}

/** GET /levels/:id — the full level plus the saved design (or null). */
export type LevelPayload = Level & { design: Design | null };

/* --------- View models composed by the backend (map / home) --------- */

/** Every level is open (feature 007 removed the unlock chain); passing marks it complete. */
export type LevelStatus = 'unlocked' | 'completed';

export interface MapLevelCard {
  id: string;
  order: number;
  title: string;
  difficulty: Difficulty;
  summary: string;
  objectives: string[];
  missionCount: number;
  status: LevelStatus;
  best?: number | null;
}

export interface MapAct {
  id: string;
  order: number;
  title: string;
  description: string;
  completedCount: number;
  levelCount: number;
  levels: MapLevelCard[];
}

export interface MapView {
  acts: MapAct[];
  totals: { completed: number; levels: number };
}

export interface HomeView {
  lab: { completed: number; levels: number; percent: number };
  continue: { levelId: string; title: string; updatedAt: string } | null;
  recommendedNext: { levelId: string; title: string } | null;
}

export interface SandboxSummary {
  id: string;
  name: string | null;
  updatedAt: string;
  nodeCount: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; [key: string]: unknown };
}

/* --------- AI design review (feature 002) --------- */

export type AiDimensionName =
  | 'requirements-fit'
  | 'scalability'
  | 'reliability'
  | 'efficiency'
  | 'operability';

export interface AiDimension {
  name: AiDimensionName;
  score: number;
  comment: string;
}

export interface AiReviewPayload {
  score: number;
  verdict: string;
  dimensions: AiDimension[];
  strengths: string[];
  gaps: string[];
  realWorldComparison: {
    referenceArchitecture: string;
    matches: string[];
    differences: string[];
  };
  nextSteps: string[];
}

export interface AiReview {
  id: string;
  levelId: string;
  designHash: string;
  model: string;
  reasoningEffort: 'high' | 'max';
  payload: AiReviewPayload;
  usage: { promptTokens: number; completionTokens: number; latencyMs: number };
  createdAt: string;
}

export interface AiReviewPostResponse {
  review: AiReview;
  cached: boolean;
}

export interface AiReviewGetResponse {
  available: boolean;
  models: { default: string; deep: string };
  review: AiReview | null;
  stale: boolean;
}
