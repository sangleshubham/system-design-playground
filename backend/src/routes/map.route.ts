/**
 * Challenge map: composes acts → level cards with completion status plus lab-wide totals.
 * Every level is open (feature 007 removed the unlock chain), so a card is 'unlocked' until
 * passed, then 'completed' (data-model.md § Derived/View Models: MapView; contracts/api.md
 * GET /map).
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import type { Level } from '../models/index.js';
import { requireWorkspaceId } from '../auth/auth.middleware.js';

type LevelStatus = 'unlocked' | 'completed';

function statusFor(level: Level, completedLevelIds: string[]): LevelStatus {
  return completedLevelIds.includes(level.id) ? 'completed' : 'unlocked';
}

export function mapRouter(deps: AppDeps): Router {
  const router = Router();

  router.get('/map', (_req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const progress = deps.progress.get(workspaceId);
    const levels = deps.content.getLevels();

    const acts = deps.content.getActs().map((act) => {
      const cards = levels
        .filter((level) => level.actId === act.id)
        .map((level) => ({
          id: level.id,
          order: level.order,
          title: level.title,
          difficulty: level.difficulty,
          summary: level.summary,
          objectives: level.objectives,
          missionCount: level.missions.length,
          status: statusFor(level, progress.completedLevelIds),
          best: deps.db.attempts.bestByLevelId(workspaceId, level.id),
        }));

      return {
        id: act.id,
        order: act.order,
        title: act.title,
        description: act.description,
        completedCount: cards.filter((c) => c.status === 'completed').length,
        levelCount: cards.length,
        levels: cards,
      };
    });

    res.json({
      acts,
      totals: {
        completed: progress.completedLevelIds.length,
        levels: levels.length,
      },
    });
  });

  return router;
}
