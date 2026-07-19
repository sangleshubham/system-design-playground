import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { createAuthMiddleware } from '../auth/auth.middleware.js';
import { authPublicRouter, authSessionRouter } from './auth.route.js';
import { componentsRouter } from './components.route.js';
import { levelsRouter } from './levels.route.js';
import { attemptsRouter } from './attempts.route.js';
import { mapRouter } from './map.route.js';
import { progressRouter } from './progress.route.js';
import { sandboxRouter } from './sandbox.route.js';
import { aiReviewRouter } from './ai-review.route.js';

/**
 * Assembles the /api/v1 router. Mount order is load-bearing (research R9): the public
 * key-creation route first, then the auth wall, then every key-scoped route. Everything
 * below the middleware requires a valid `X-Access-Key`.
 */
export function apiRouter(deps: AppDeps): Router {
  const router = Router();

  // Public — no key required.
  router.use(authPublicRouter(deps));

  // The auth wall: resolves the workspace onto res.locals or answers 401/429.
  router.use(
    createAuthMiddleware({ workspaces: deps.db.workspaces, failLimiter: deps.failLimiter }),
  );

  // Key-scoped from here down.
  router.use(authSessionRouter(deps));
  router.use(componentsRouter(deps));
  router.use(mapRouter(deps));
  router.use(progressRouter(deps));
  router.use(levelsRouter(deps));
  router.use(attemptsRouter(deps));
  router.use(sandboxRouter(deps));
  router.use(aiReviewRouter(deps));
  return router;
}
