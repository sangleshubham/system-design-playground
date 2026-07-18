/** Dependencies threaded into every route factory. */
import type { DbContext } from './db/database.js';
import type { contentService } from './services/content.service.js';
import type { ProgressService } from './services/progress.service.js';
import type { AiConfig } from './config/ai.config.js';
import type { AiReviewService } from './services/ai/ai-review.service.js';

export interface AppDeps {
  db: DbContext;
  content: typeof contentService;
  progress: ProgressService;
  aiConfig: AiConfig;
  aiReviewService: AiReviewService;
}
