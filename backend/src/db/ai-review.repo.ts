/**
 * Repository for `ai_reviews` rows. Content-addressed by `(level_id, design_hash,
 * model)` — `upsertReview` replaces the row for that exact key (forced re-runs
 * overwrite; data-model.md § AiReview uniqueness). Failed upstream calls persist
 * nothing — callers only ever call `upsertReview` after a successful, validated call.
 */
import type { Database } from 'better-sqlite3';
import type { AiReview, AiReviewPayload } from '../models/ai-review.js';

interface AiReviewRow {
  id: string;
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

  /** Insert a review, or replace the existing row for the same (level, hash, model). */
  upsertReview(review: AiReview): void {
    this.db
      .prepare(
        `INSERT INTO ai_reviews
           (id, level_id, design_hash, model, reasoning_effort, payload,
            prompt_tokens, completion_tokens, latency_ms, created_at)
         VALUES (@id, @levelId, @designHash, @model, @reasoningEffort, @payload,
                 @promptTokens, @completionTokens, @latencyMs, @createdAt)
         ON CONFLICT (level_id, design_hash, model) DO UPDATE SET
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

  findByKey(levelId: string, designHash: string, model: string): AiReview | null {
    const row = this.db
      .prepare(
        'SELECT * FROM ai_reviews WHERE level_id = ? AND design_hash = ? AND model = ?',
      )
      .get(levelId, designHash, model) as AiReviewRow | undefined;
    return row ? rowToAiReview(row) : null;
  }

  /**
   * Newest review for this exact design across all configured models. `rowid DESC` breaks
   * ties when two rows share a millisecond-resolution `created_at` (e.g. flash then pro,
   * requested back-to-back) so the most recently inserted row still wins.
   */
  findLatestForHash(levelId: string, designHash: string): AiReview | null {
    const row = this.db
      .prepare(
        `SELECT * FROM ai_reviews
         WHERE level_id = ? AND design_hash = ?
         ORDER BY created_at DESC, rowid DESC
         LIMIT 1`,
      )
      .get(levelId, designHash) as AiReviewRow | undefined;
    return row ? rowToAiReview(row) : null;
  }

  hasAnyForLevel(levelId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM ai_reviews WHERE level_id = ? LIMIT 1')
      .get(levelId) as unknown;
    return row !== undefined;
  }
}
