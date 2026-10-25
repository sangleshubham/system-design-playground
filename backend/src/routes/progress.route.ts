/**
 * Home view (FR-029): lab progress %, the "continue where you left off" card (the last
 * touched level + its saved design's timestamp), and the recommended next level (first
 * uncompleted level by order; feature 007 removed the unlock chain). Nulls when N/A. See
 * contracts/api.md GET /progress.
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { requireWorkspaceId } from '../auth/auth.middleware.js';

export function progressRouter(deps: AppDeps): Router {
  const router = Router();

  router.get('/progress', (_req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const progress = deps.progress.get(workspaceId);
    const levels = deps.content.getLevels();
    const completed = progress.completedLevelIds.length;
    const levelCount = levels.length;
    const percent = levelCount === 0 ? 0 : Math.round((completed / levelCount) * 100);

    // Continue: only meaningful when the last touched level has saved work to resume to.
    let cont: { levelId: string; title: string; updatedAt: string } | null = null;
    if (progress.lastTouchedLevelId) {
      const level = deps.content.getLevelById(progress.lastTouchedLevelId);
      const design = level ? deps.db.designs.getByLevelId(workspaceId, level.id) : null;
      if (level && design) {
        cont = { levelId: level.id, title: level.title, updatedAt: design.updatedAt };
      }
    }

    // Recommended next: first uncompleted level by global order (null if all done).
    // `getLevels()` is already sorted by order.
    const completedIds = new Set(progress.completedLevelIds);
    const next = levels.find((l) => !completedIds.has(l.id));
    const recommendedNext = next ? { levelId: next.id, title: next.title } : null;

    res.json({
      lab: { completed, levels: levelCount, percent },
      continue: cont,
      recommendedNext,
    });
  });

  return router;
}
