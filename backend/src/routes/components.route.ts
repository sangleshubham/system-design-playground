import { Router } from 'express';
import type { AppDeps } from '../deps.js';

/** GET /api/v1/components — full catalog for the palette. */
export function componentsRouter(deps: AppDeps): Router {
  const router = Router();
  router.get('/components', (_req, res) => {
    res.json(deps.content.getComponents());
  });
  return router;
}
