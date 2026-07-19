/**
 * Progress orchestration over a workspace's progress row (feature 005): unlock checks, the
 * resume pointer, and atomic completion/unlock on a passing attempt. Completion is monotonic —
 * re-running a passed level never revokes it (data-model.md § Progress, FR-024). Every method
 * is scoped to the caller's workspace (resolved from res.locals by the auth middleware).
 */
import type { DbContext } from '../db/database.js';
import type { contentService } from './content.service.js';
import type { Level, Progress } from '../models/index.js';

export class ProgressService {
  constructor(
    private readonly db: DbContext,
    private readonly content: typeof contentService,
  ) {}

  get(workspaceId: string): Progress {
    return this.db.progress.get(workspaceId);
  }

  isUnlocked(workspaceId: string, level: Level): boolean {
    return level.order <= this.get(workspaceId).unlockedThroughOrder;
  }

  /** The level blocking access to `level` (the prerequisite by order), if any. */
  blockingLevel(workspaceId: string, level: Level): Level | undefined {
    if (this.isUnlocked(workspaceId, level)) return undefined;
    return this.content.getLevelByOrder(level.order - 1);
  }

  /** Update the resume pointer (FR-029). */
  touch(workspaceId: string, levelId: string): void {
    this.db.progress.update(workspaceId, (p) => ({ ...p, lastTouchedLevelId: levelId }));
  }

  /**
   * Record a passing attempt: mark the level complete and advance the unlock frontier.
   * Returns the id of the level newly unlocked by THIS pass, or null.
   */
  recordPass(workspaceId: string, level: Level): { unlockedLevelId: string | null } {
    let unlockedLevelId: string | null = null;
    this.db.progress.update(workspaceId, (p) => {
      const completedLevelIds = p.completedLevelIds.includes(level.id)
        ? p.completedLevelIds
        : [...p.completedLevelIds, level.id];
      const before = p.unlockedThroughOrder;
      const unlockedThroughOrder = Math.max(before, level.order + 1);
      if (unlockedThroughOrder > before) {
        const unlocked = this.content.getLevelByOrder(level.order + 1);
        unlockedLevelId = unlocked ? unlocked.id : null;
      }
      return { ...p, completedLevelIds, unlockedThroughOrder };
    });
    return { unlockedLevelId };
  }
}
