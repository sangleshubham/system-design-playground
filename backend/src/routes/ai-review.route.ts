/**
 * AI review routes:
 *   POST /levels/:levelId/ai-review — produce, or serve from the design-hash cache, an AI
 *                                     review of the level's SAVED design.
 *   GET  /levels/:levelId/ai-review — latest stored review for the current saved design plus
 *                                     availability info (restore after reload; never upstream).
 *
 * Level/lock guards mirror attempts.route.ts (404 / 423). Every typed AiReviewError is
 * translated to the status+code in contracts/api.md. No secret ever reaches the response:
 * error messages come from the typed errors, never from the raw upstream body or key.
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { AiReviewRequestSchema, type AiReviewErrorCode } from '../models/ai-review.js';
import { ApiHttpError, badRequest } from '../http/http-error.js';
import { AiReviewError } from '../services/ai/errors.js';
import { requireWorkspaceId } from '../auth/auth.middleware.js';

/** Contract error table (contracts/api.md): AI error code → HTTP status. */
const AI_ERROR_STATUS: Record<AiReviewErrorCode, number> = {
  level_not_found: 404,
  level_locked: 423,
  design_empty: 422,
  design_too_large: 422,
  ai_review_in_flight: 409,
  ai_not_configured: 503,
  ai_rate_limited: 503,
  ai_auth_failed: 502,
  ai_out_of_credit: 502,
  ai_upstream_error: 502,
  ai_malformed_output: 502,
  ai_timeout: 504,
};

export function aiReviewRouter(deps: AppDeps): Router {
  const router = Router();

  /** Shared level/lock guards (as attempts.route.ts): 404 unknown, 423 locked. */
  function resolveLevel(workspaceId: string, levelId: string) {
    const level = deps.content.getLevelById(levelId);
    if (!level) throw new ApiHttpError(404, 'level_not_found', `Unknown level "${levelId}".`);
    if (!deps.progress.isUnlocked(workspaceId, level))
      throw new ApiHttpError(423, 'level_locked', 'This level is locked.');
    return level;
  }

  router.post('/levels/:levelId/ai-review', async (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const level = resolveLevel(workspaceId, req.params.levelId);

    const parsed = AiReviewRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Invalid request body: expected optional { force?, deep? } booleans.');

    try {
      const { review, cached } = await deps.aiReviewService.review(workspaceId, level, {
        force: parsed.data.force,
        deep: parsed.data.deep,
      });
      res.json({ review, cached });
    } catch (err) {
      if (err instanceof AiReviewError) {
        throw new ApiHttpError(AI_ERROR_STATUS[err.code], err.code, err.message);
      }
      throw err;
    }
  });

  // Read-only: the latest stored review for the current saved design + availability. Lets the
  // UI restore state after reload without spending tokens; never calls upstream.
  router.get('/levels/:levelId/ai-review', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const level = resolveLevel(workspaceId, req.params.levelId);
    res.json(deps.aiReviewService.getStored(workspaceId, level));
  });

  return router;
}
