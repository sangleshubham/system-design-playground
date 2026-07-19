/** Dependencies threaded into every route factory. */
import type { DbContext } from './db/database.js';
import type { contentService } from './services/content.service.js';
import type { ProgressService } from './services/progress.service.js';
import type { AiConfig } from './config/ai.config.js';
import type { AiReviewService } from './services/ai/ai-review.service.js';
import type { FixedWindowRateLimiter } from './http/rate-limit.js';

export interface AppDeps {
  db: DbContext;
  content: typeof contentService;
  progress: ProgressService;
  aiConfig: AiConfig;
  aiReviewService: AiReviewService;
  /** Per-IP `validateFail` bucket (10/min) — 401s counted, gates with 429 (research R7). */
  failLimiter: FixedWindowRateLimiter;
  /** Per-IP `create` bucket (5/min) — guards POST /auth/keys. */
  createLimiter: FixedWindowRateLimiter;
}
