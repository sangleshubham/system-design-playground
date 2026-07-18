import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { componentsRouter } from './components.route.js';
import { levelsRouter } from './levels.route.js';
import { attemptsRouter } from './attempts.route.js';
import { mapRouter } from './map.route.js';
import { progressRouter } from './progress.route.js';
import { sandboxRouter } from './sandbox.route.js';
import { aiReviewRouter } from './ai-review.route.js';

/** Assembles the /api/v1 router from every feature sub-router. */
export function apiRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(componentsRouter(deps));
  router.use(mapRouter(deps));
  router.use(progressRouter(deps));
  router.use(levelsRouter(deps));
  router.use(attemptsRouter(deps));
  router.use(sandboxRouter(deps));
  router.use(aiReviewRouter(deps));
  return router;
}
