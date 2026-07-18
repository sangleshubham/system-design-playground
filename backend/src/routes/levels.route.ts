/**
 * Level playground routes:
 *  GET /levels/:levelId          — full level payload + saved design (or null); 423 locked, 404 unknown
 *  PUT /levels/:levelId/design   — debounced-autosave upsert of the working canvas
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { DesignUpsertRequestSchema } from '../models/index.js';
import { badRequest, locked, notFound } from '../http/http-error.js';
import { validateDesignGraph } from '../services/design-validation.js';

export function levelsRouter(deps: AppDeps): Router {
  const router = Router();

  router.get('/levels/:levelId', (req, res) => {
    const level = deps.content.getLevelById(req.params.levelId);
    if (!level) throw notFound(`Unknown level "${req.params.levelId}".`);

    if (!deps.progress.isUnlocked(level)) {
      const blocker = deps.progress.blockingLevel(level);
      throw locked(
        blocker
          ? `Complete "${blocker.title}" (level ${blocker.order}) to unlock this level.`
          : 'This level is locked.',
        { blockingLevelId: blocker?.id ?? null, blockingLevelOrder: blocker?.order ?? null },
      );
    }

    // Opening a level sets the resume pointer (FR-029).
    deps.progress.touch(level.id);
    const design = deps.db.designs.getByLevelId(level.id);
    res.json({ ...level, design });
  });

  router.put('/levels/:levelId/design', (req, res) => {
    const level = deps.content.getLevelById(req.params.levelId);
    if (!level) throw notFound(`Unknown level "${req.params.levelId}".`);
    if (!deps.progress.isUnlocked(level)) {
      throw locked('This level is locked.');
    }

    const parsed = DesignUpsertRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(
        `Invalid design payload: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
    const { nodes, edges, notes, revealedHintCount } = parsed.data;
    validateDesignGraph({ nodes, edges, notes }, deps.content);

    const result = deps.db.designs.upsertLevelDesign(level.id, { nodes, edges, notes }, revealedHintCount);
    deps.progress.touch(level.id);
    res.json(result);
  });

  return router;
}
