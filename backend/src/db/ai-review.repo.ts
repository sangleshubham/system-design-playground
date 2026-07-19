/**
 * Repository for `ai_reviews` rows, scoped by `workspace_id` (feature 005). Content-addressed
 * per workspace by `(workspace_id, level_id, design_hash, model)` — `upsertReview` replaces
 * the row for that exact key (forced re-runs overwrite; data-model.md § AiReview uniqueness).
 * Identical designs in different workspaces get independent reviews and histories (FR-010).
 * Failed upstream calls persist nothing — callers only call `upsertReview` after success.
 */
import type { Database } from 'better-sqlite3';
import type { AiReview, AiReviewPayload } from '../models/ai-review.js';

interface AiReviewRow {
  id: string;
  workspace_id: string;
  level_id: string;
  design_hash: string;
  model: string;
  reasoning_effort: string;
  payload: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  created_at: string;
}

function rowToAiReview(row: AiReviewRow): AiReview {
  return {
    id: row.id,
    levelId: row.level_id,
    designHash: row.design_hash,
    model: row.model,
    reasoningEffort: row.reasoning_effort as AiReview['reasoningEffort'],
    payload: JSON.parse(row.payload) as AiReviewPayload,
    usage: {
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      latencyMs: row.latency_ms,
    },
    createdAt: row.created_at,
  };
}

export class AiReviewRepo {
  constructor(private readonly db: Database) {}

  /** Insert a review, or replace the existing row for the same (workspace, level, hash, model). */
  upsertReview(workspaceId: string, review: AiReview): void {
    this.db
      .prepare(
        `INSERT INTO ai_reviews
           (id, workspace_id, level_id, design_hash, model, reasoning_effort, payload,
            prompt_tokens, completion_tokens, latency_ms, created_at)
         VALUES (@id, @workspaceId, @levelId, @designHash, @model, @reasoningEffort, @payload,
                 @promptTokens, @completionTokens, @latencyMs, @createdAt)
         ON CONFLICT (workspace_id, level_id, design_hash, model) DO UPDATE SET
           id = excluded.id,
           reasoning_effort = excluded.reasoning_effort,
           payload = excluded.payload,
           prompt_tokens = excluded.prompt_tokens,
           completion_tokens = excluded.completion_tokens,
           latency_ms = excluded.latency_ms,
           created_at = excluded.created_at`,
      )
      .run({
        id: review.id,
        workspaceId,
        levelId: review.levelId,
        designHash: review.designHash,
        model: review.model,
        reasoningEffort: review.reasoningEffort,
        payload: JSON.stringify(review.payload),
        promptTokens: review.usage.promptTokens,
        completionTokens: review.usage.completionTokens,
        latencyMs: review.usage.latencyMs,
        createdAt: review.createdAt,
      });
  }

  findByKey(
    workspaceId: string,
    levelId: string,
    designHash: string,
    model: string,
  ): AiReview | null {
    const row = this.db
      .prepare(
        'SELECT * FROM ai_reviews WHERE workspace_id = ? AND level_id = ? AND design_hash = ? AND model = ?',
      )
      .get(workspaceId, levelId, designHash, model) as AiReviewRow | undefined;
    return row ? rowToAiReview(row) : null;
  }

  /**
   * Newest review for this exact design across all configured models within a workspace.
   * `rowid DESC` breaks ties when two rows share a millisecond-resolution `created_at`
   * (e.g. flash then pro, requested back-to-back) so the most recently inserted row wins.
   */
  findLatestForHash(workspaceId: string, levelId: string, designHash: string): AiReview | null {
    const row = this.db
      .prepare(
        `SELECT * FROM ai_reviews
         WHERE workspace_id = ? AND level_id = ? AND design_hash = ?
         ORDER BY created_at DESC, rowid DESC
         LIMIT 1`,
      )
      .get(workspaceId, levelId, designHash) as AiReviewRow | undefined;
    return row ? rowToAiReview(row) : null;
  }

  hasAnyForLevel(workspaceId: string, levelId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM ai_reviews WHERE workspace_id = ? AND level_id = ? LIMIT 1')
      .get(workspaceId, levelId) as unknown;
    return row !== undefined;
  }
}
