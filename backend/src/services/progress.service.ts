/**
 * Progress orchestration over the singleton progress row: unlock checks, the resume
 * pointer, and atomic completion/unlock on a passing attempt. Completion is monotonic —
 * re-running a passed level never revokes it (data-model.md § Progress, FR-024).
 */
import type { DbContext } from '../db/database.js';
import type { contentService } from './content.service.js';
import type { Level, Progress } from '../models/index.js';

export class ProgressService {
  constructor(
    private readonly db: DbContext,
    private readonly content: typeof contentService,
  ) {}

  get(): Progress {
    return this.db.progress.get();
  }

  isUnlocked(level: Level): boolean {
    return level.order <= this.get().unlockedThroughOrder;
  }

  /** The level blocking access to `level` (the prerequisite by order), if any. */
  blockingLevel(level: Level): Level | undefined {
    if (this.isUnlocked(level)) return undefined;
    return this.content.getLevelByOrder(level.order - 1);
  }

  /** Update the resume pointer (FR-029). */
  touch(levelId: string): void {
    this.db.progress.update((p) => ({ ...p, lastTouchedLevelId: levelId }));
  }

  /**
   * Record a passing attempt: mark the level complete and advance the unlock frontier.
   * Returns the id of the level newly unlocked by THIS pass, or null.
   */
  recordPass(level: Level): { unlockedLevelId: string | null } {
    let unlockedLevelId: string | null = null;
    this.db.progress.update((p) => {
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
