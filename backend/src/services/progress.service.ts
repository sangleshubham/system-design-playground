/**
 * Progress orchestration over a workspace's progress row (feature 005): the resume pointer
 * and atomic completion on a passing attempt. Completion is monotonic — re-running a passed
 * level never revokes it (data-model.md § Progress, FR-024). Every level is always open
 * (feature 007 removed the unlock chain); passing only marks a level complete. Every method
 * is scoped to the caller's workspace (resolved from res.locals by the auth middleware).
 */
import type { DbContext } from '../db/database.js';
import type { Level, Progress } from '../models/index.js';

export class ProgressService {
  constructor(private readonly db: DbContext) {}

  get(workspaceId: string): Progress {
    return this.db.progress.get(workspaceId);
  }

  /** Update the resume pointer (FR-029). */
  touch(workspaceId: string, levelId: string): void {
    this.db.progress.update(workspaceId, (p) => ({ ...p, lastTouchedLevelId: levelId }));
  }

  /** Record a passing attempt: mark the level complete (idempotent, transactional). */
  recordPass(workspaceId: string, level: Level): void {
    this.db.progress.update(workspaceId, (p) =>
      p.completedLevelIds.includes(level.id)
        ? p
        : { ...p, completedLevelIds: [...p.completedLevelIds, level.id] },
    );
  }
}
