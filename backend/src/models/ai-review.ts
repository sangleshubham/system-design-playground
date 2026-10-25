/**
 * Zod schemas + TS types for the AI design review feature (data-model.md,
 * contracts/api.md). `AiReviewPayloadSchema` validates the model's own JSON output;
 * `AiReview` is the persisted record; the error-code union drives the HTTP error
 * mapping in ai-review.route.ts.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Model output payload                                                */
/* ------------------------------------------------------------------ */

export const AI_DIMENSIONS = [
  'requirements-fit',
  'scalability',
  'reliability',
  'efficiency',
  'operability',
] as const;
export const AiDimensionNameSchema = z.enum(AI_DIMENSIONS);
export type AiDimensionName = z.infer<typeof AiDimensionNameSchema>;

export const AiDimensionSchema = z.object({
  name: AiDimensionNameSchema,
  score: z.number().int().min(0).max(100),
  comment: z.string().min(1),
});
export type AiDimension = z.infer<typeof AiDimensionSchema>;

export const AiReviewPayloadSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.string().min(1),
  dimensions: z.array(AiDimensionSchema).length(5),
  strengths: z.array(z.string().min(1)).min(2),
  gaps: z.array(z.string().min(1)).min(2),
  realWorldComparison: z.object({
    referenceArchitecture: z.string().min(1),
    matches: z.array(z.string()),
    differences: z.array(z.string()),
  }),
  nextSteps: z.array(z.string().min(1)).min(1),
});
export type AiReviewPayload = z.infer<typeof AiReviewPayloadSchema>;

/* ------------------------------------------------------------------ */
/* Persisted record                                                    */
/* ------------------------------------------------------------------ */

export interface AiReviewUsage {
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export interface AiReview {
  id: string;
  levelId: string;
  designHash: string;
  model: string;
  reasoningEffort: 'high' | 'max';
  payload: AiReviewPayload;
  usage: AiReviewUsage;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Request/response contracts                                          */
/* ------------------------------------------------------------------ */

export const AiReviewRequestSchema = z.object({
  force: z.boolean().optional(),
  deep: z.boolean().optional(),
});
export type AiReviewRequest = z.infer<typeof AiReviewRequestSchema>;

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

/* ------------------------------------------------------------------ */
/* Error codes (contracts/api.md)                                      */
/* ------------------------------------------------------------------ */

export const AI_REVIEW_ERROR_CODES = [
  'level_not_found',
  'design_empty',
  'design_too_large',
  'ai_review_in_flight',
  'ai_not_configured',
  'ai_rate_limited',
  'ai_auth_failed',
  'ai_out_of_credit',
  'ai_upstream_error',
  'ai_malformed_output',
  'ai_timeout',
] as const;
export type AiReviewErrorCode = (typeof AI_REVIEW_ERROR_CODES)[number];
