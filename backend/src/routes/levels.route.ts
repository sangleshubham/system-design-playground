/**
 * Level playground routes:
 *  GET /levels/:levelId          — full level payload + saved design (or null); 404 unknown.
 *                                  Every level is open (feature 007: no unlock chain).
 *  PUT /levels/:levelId/design   — debounced-autosave upsert of the working canvas
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { DesignUpsertRequestSchema } from '../models/index.js';
import { badRequest, notFound, sendStaleWrite } from '../http/http-error.js';
import { validateDesignGraph } from '../services/design-validation.js';
import { requireWorkspaceId } from '../auth/auth.middleware.js';

export function levelsRouter(deps: AppDeps): Router {
  const router = Router();

  router.get('/levels/:levelId', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const level = deps.content.getLevelById(req.params.levelId);
    if (!level) throw notFound(`Unknown level "${req.params.levelId}".`);

    // Opening a level sets the resume pointer (FR-029).
    deps.progress.touch(workspaceId, level.id);
    const design = deps.db.designs.getByLevelId(workspaceId, level.id);
    res.json({ ...level, design });
  });

  router.put('/levels/:levelId/design', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const level = deps.content.getLevelById(req.params.levelId);
    if (!level) throw notFound(`Unknown level "${req.params.levelId}".`);

    const parsed = DesignUpsertRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(
        `Invalid design payload: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
    const { nodes, edges, notes, revealedHintCount, baseUpdatedAt } = parsed.data;
    validateDesignGraph({ nodes, edges, notes }, deps.content);

    const outcome = deps.db.designs.upsertLevelDesign(
      workspaceId,
      level.id,
      { nodes, edges, notes },
      revealedHintCount,
      baseUpdatedAt,
    );
    if (outcome.status === 'stale') {
      // Never touch the resume pointer on a rejected write.
      sendStaleWrite(res, outcome.current);
      return;
    }

    deps.progress.touch(workspaceId, level.id);
    res.json({ updatedAt: outcome.updatedAt });
  });

  return router;
}
