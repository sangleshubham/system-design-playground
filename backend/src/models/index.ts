/**
 * Shared domain types + zod schemas for the System Design Playground.
 *
 * Two data domains (see data-model.md):
 *  - Content (read-only): components, acts, levels, missions, rules — authored as JSON,
 *    validated with the *Schema exports at server start.
 *  - User state (mutable): designs, attempts, progress — persisted in SQLite.
 *
 * Types are inferred from the zod schemas so the two never drift. The frontend mirrors
 * these shapes in frontend/src/app/core/models.ts.
 *
 * MIRROR-DRIFT NOTE: COMPONENT_ICON_IDS below is a hand-mirror of the frontend icon
 * registry's component entries (frontend/src/app/shared/component-icon.registry.ts) —
 * the registry keys are the source of truth for these 42 ids. Keep the two in sync by hand.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Content: Component                                                  */
/* ------------------------------------------------------------------ */

export const CATEGORIES = [
  'user',
  'networking',
  'compute',
  'storage',
  'caching',
  'messaging',
  'services',
] as const;

export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

/** The 42 valid component icon ids — hand-mirror of the frontend registry's component
 *  entries (frontend/src/app/shared/component-icon.registry.ts). Order: the 23 aws-* ids
 *  in catalog order, then the 19 tile-* ids in catalog order. fallback-* ids are
 *  deliberately EXCLUDED — they are runtime-only (FR-007) and must never be valid content. */
export const COMPONENT_ICON_IDS = [
  'aws-route-53',
  'aws-cloudfront',
  'aws-elastic-load-balancing',
  'aws-api-gateway',
  'aws-waf',
  'aws-ec2',
  'aws-lambda',
  'aws-managed-flink',
  'aws-mwaa',
  'aws-sagemaker-ai',
  'aws-bedrock',
  'aws-rds',
  'aws-dynamodb',
  'aws-s3',
  'aws-opensearch',
  'aws-timestream',
  'aws-neptune',
  'aws-redshift',
  'aws-elasticache',
  'aws-sqs',
  'aws-sns',
  'aws-cloudwatch',
  'aws-cloud-map',
  'tile-client',
  'tile-rate-limiter',
  'tile-reverse-proxy',
  'tile-prompt-router',
  'tile-websocket-server',
  'tile-chunking-service',
  'tile-reranker',
  'tile-vector-database',
  'tile-context-store',
  'tile-bloom-filter',
  'tile-dead-letter-queue',
  'tile-notification-service',
  'tile-payment-service',
  'tile-zookeeper-etcd',
  'tile-circuit-breaker',
  'tile-log-aggregator',
  'tile-guardrail-service',
  'tile-llm-observability',
  'tile-model-registry',
] as const;

export const ComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tech: z.string(),
  category: CategorySchema,
  description: z.string().min(1),
  costPerHr: z.number().min(0),
  latencyMs: z.number().min(0),
  icon: z.enum(COMPONENT_ICON_IDS),
});
export type Component = z.infer<typeof ComponentSchema>;

/* ------------------------------------------------------------------ */
/* Content: Act                                                        */
/* ------------------------------------------------------------------ */

export const ActSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
});
export type Act = z.infer<typeof ActSchema>;

/* ------------------------------------------------------------------ */
/* Content: Mission                                                    */
/* ------------------------------------------------------------------ */

export const MissionSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    kind: z.literal('add'),
    componentId: z.string().min(1),
    label: z.string().min(1),
    bonus: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('connect'),
    fromComponentId: z.string().min(1),
    toComponentId: z.string().min(1),
    label: z.string().min(1),
    bonus: z.boolean().optional(),
  }),
]);
export type Mission = z.infer<typeof MissionSchema>;

/* ------------------------------------------------------------------ */
/* Content: Topology / Resilience rules                                */
/* ------------------------------------------------------------------ */

export const TopologyRuleSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('forbidden-edge'),
    fromComponentId: z.string().min(1),
    toComponentId: z.string().min(1),
    message: z.string().min(1),
  }),
  z.object({
    kind: z.literal('required-between'),
    viaComponentId: z.string().min(1),
    fromComponentId: z.string().min(1),
    toComponentId: z.string().min(1),
    message: z.string().min(1),
  }),
]);
export type TopologyRule = z.infer<typeof TopologyRuleSchema>;

export const ResilienceRuleSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('no-spof'),
    componentId: z.string().min(1),
    message: z.string().min(1),
  }),
  z.object({
    kind: z.literal('requires-companion'),
    componentId: z.string().min(1),
    companionComponentId: z.string().min(1),
    message: z.string().min(1),
  }),
]);
export type ResilienceRule = z.infer<typeof ResilienceRuleSchema>;

/* ------------------------------------------------------------------ */
/* Content: Level                                                      */
/* ------------------------------------------------------------------ */

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'legendary'] as const;
export const DifficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const LevelSpecsSchema = z.object({
  functional: z.array(z.string()),
  nonFunctional: z.array(z.string()),
  constraints: z.array(z.string()),
  budgetPerHr: z.number().min(0),
  latencyTargetMs: z.number().min(0).optional(),
  capacity: z.array(z.string()),
  tradeoff: z.string().min(1),
  bonus: z.string().optional(),
});
export type LevelSpecs = z.infer<typeof LevelSpecsSchema>;

export const LevelSchema = z.object({
  id: z.string().min(1),
  actId: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  difficulty: DifficultySchema,
  summary: z.string().min(1),
  narrative: z.string().min(1),
  objectives: z.array(z.string()),
  specs: LevelSpecsSchema,
  missions: z.array(MissionSchema).min(1),
  topologyRules: z.array(TopologyRuleSchema),
  resilienceRules: z.array(ResilienceRuleSchema),
  recommendedComponentIds: z.array(z.string()),
  hints: z.array(z.string()),
});
export type Level = z.infer<typeof LevelSchema>;

/* ------------------------------------------------------------------ */
/* User state: Design                                                  */
/* ------------------------------------------------------------------ */

export const DesignNodeSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  displayName: z.string(),
  note: z.string(),
  x: z.number(),
  y: z.number(),
});
export type DesignNode = z.infer<typeof DesignNodeSchema>;

export const DesignEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
});
export type DesignEdge = z.infer<typeof DesignEdgeSchema>;

export const StickyNoteSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  x: z.number(),
  y: z.number(),
});
export type StickyNote = z.infer<typeof StickyNoteSchema>;

export const DesignSchema = z.object({
  id: z.string().min(1),
  levelId: z.string().nullable(),
  name: z.string().nullable(),
  nodes: z.array(DesignNodeSchema),
  edges: z.array(DesignEdgeSchema),
  notes: z.array(StickyNoteSchema),
  revealedHintCount: z.number().int().min(0),
  updatedAt: z.string(),
});
export type Design = z.infer<typeof DesignSchema>;

/** The mutable graph payload (nodes/edges/notes only) shared by all upsert routes. */
export const DesignGraphSchema = z.object({
  nodes: z.array(DesignNodeSchema),
  edges: z.array(DesignEdgeSchema),
  notes: z.array(StickyNoteSchema),
});
export type DesignGraph = z.infer<typeof DesignGraphSchema>;

/** Request body for PUT /levels/:levelId/design. `baseUpdatedAt` is the optimistic-concurrency
 *  precondition (research R6): the updatedAt the client loaded. Omitted → unconditional write. */
export const DesignUpsertRequestSchema = z.object({
  nodes: z.array(DesignNodeSchema),
  edges: z.array(DesignEdgeSchema),
  notes: z.array(StickyNoteSchema),
  revealedHintCount: z.number().int().min(0),
  baseUpdatedAt: z.string().optional(),
});
export type DesignUpsertRequest = z.infer<typeof DesignUpsertRequestSchema>;

/** Request body for POST /sandbox/designs. */
export const SandboxCreateRequestSchema = z.object({
  name: z.string().min(1),
});
export type SandboxCreateRequest = z.infer<typeof SandboxCreateRequestSchema>;

/** Request body for PUT /sandbox/designs/:id — graph, optional rename, optional
 *  `baseUpdatedAt` concurrency precondition (research R6). Omitted → unconditional write. */
export const SandboxUpsertRequestSchema = z.object({
  nodes: z.array(DesignNodeSchema),
  edges: z.array(DesignEdgeSchema),
  notes: z.array(StickyNoteSchema),
  name: z.string().min(1).optional(),
  baseUpdatedAt: z.string().optional(),
});
export type SandboxUpsertRequest = z.infer<typeof SandboxUpsertRequestSchema>;

/* ------------------------------------------------------------------ */
/* User state: Attempt + scoring feedback                              */
/* ------------------------------------------------------------------ */

export const DIMENSIONS = ['missions', 'flow', 'topology', 'efficiency', 'resilience'] as const;
export const DimensionSchema = z.enum(DIMENSIONS);
export type Dimension = z.infer<typeof DimensionSchema>;

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
  designSnapshot: Pick<Design, 'nodes' | 'edges'>;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* User state: Progress                                                */
/* ------------------------------------------------------------------ */

export interface Progress {
  completedLevelIds: string[];
  lastTouchedLevelId: string | null;
}

/* ------------------------------------------------------------------ */
/* API error envelope                                                  */
/* ------------------------------------------------------------------ */

export interface ApiError {
  error: { code: string; message: string };
}
