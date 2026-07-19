/**
 * Evaluation routes:
 *  POST /levels/:levelId/attempts — score the level's SAVED design, persist the attempt,
 *                                   and on a pass atomically record completion + unlock.
 *  GET  /levels/:levelId/attempts — attempt history (newest first) + best total.
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import type { Attempt } from '../models/index.js';
import { locked, notFound } from '../http/http-error.js';
import { evaluateDesign } from '../services/scoring/index.js';
import { requireWorkspaceId } from '../auth/auth.middleware.js';

export function attemptsRouter(deps: AppDeps): Router {
  const router = Router();
  const componentsById = new Map(deps.content.getComponents().map((c) => [c.id, c]));

  router.post('/levels/:levelId/attempts', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const level = deps.content.getLevelById(req.params.levelId);
    if (!level) throw notFound(`Unknown level "${req.params.levelId}".`);
    if (!deps.progress.isUnlocked(workspaceId, level)) throw locked('This level is locked.');

    // Evaluate whatever was last saved. An empty/absent design is a valid low score.
    const design = deps.db.designs.getByLevelId(workspaceId, level.id);
    const nodes = design?.nodes ?? [];
    const edges = design?.edges ?? [];

    const result = evaluateDesign({ level, nodes, edges, componentsById });

    const attempt: Omit<Attempt, 'id'> = {
      levelId: level.id,
      scores: result.scores,
      total: result.total,
      passed: result.passed,
      feedback: result.feedback,
      designSnapshot: { nodes, edges },
      createdAt: new Date().toISOString(),
    };
    const saved = deps.db.attempts.create(workspaceId, level.id, attempt);

    let unlockedLevelId: string | null = null;
    if (result.passed) {
      unlockedLevelId = deps.progress.recordPass(workspaceId, level).unlockedLevelId;
    }

    res.json({
      attemptId: saved.id,
      scores: result.scores,
      total: result.total,
      passed: result.passed,
      feedback: result.feedback,
      ...(unlockedLevelId ? { unlockedLevelId } : {}),
    });
  });

  router.get('/levels/:levelId/attempts', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const level = deps.content.getLevelById(req.params.levelId);
    if (!level) throw notFound(`Unknown level "${req.params.levelId}".`);
    const attempts = deps.db.attempts.listByLevelId(workspaceId, level.id);
    const best = deps.db.attempts.bestByLevelId(workspaceId, level.id);
    res.json({ attempts, best });
  });

  return router;
}
