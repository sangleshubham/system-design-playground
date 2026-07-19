/**
 * Repository for `progress` rows, one per workspace (feature 005, data-model.md § Progress).
 * A workspace's first read lazily seeds the first-run state (unlockedThroughOrder = 1, no
 * completions) — the same defaults the old singleton used, so a brand-new key sees a fresh
 * install (research R10). `update` is transactional so completion/unlock advances stay atomic.
 */
import type { Database } from 'better-sqlite3';
import type { Progress } from '../models/index.js';

interface ProgressRow {
  workspace_id: string;
  unlocked_through_order: number;
  last_touched_level_id: string | null;
  completed_level_ids: string;
}

export class ProgressRepo {
  constructor(private readonly db: Database) {}

  private ensureRow(workspaceId: string): ProgressRow {
    const row = this.db
      .prepare('SELECT * FROM progress WHERE workspace_id = ?')
      .get(workspaceId) as ProgressRow | undefined;
    if (row) return row;
    this.db
      .prepare(
        'INSERT INTO progress (workspace_id, unlocked_through_order, last_touched_level_id, completed_level_ids) VALUES (?, 1, NULL, ?)',
      )
      .run(workspaceId, JSON.stringify([]));
    return this.db
      .prepare('SELECT * FROM progress WHERE workspace_id = ?')
      .get(workspaceId) as ProgressRow;
  }

  get(workspaceId: string): Progress {
    const row = this.ensureRow(workspaceId);
    return {
      unlockedThroughOrder: row.unlocked_through_order,
      lastTouchedLevelId: row.last_touched_level_id,
      completedLevelIds: JSON.parse(row.completed_level_ids) as string[],
    };
  }

  save(workspaceId: string, progress: Progress): void {
    this.ensureRow(workspaceId);
    this.db
      .prepare(
        'UPDATE progress SET unlocked_through_order = ?, last_touched_level_id = ?, completed_level_ids = ? WHERE workspace_id = ?',
      )
      .run(
        progress.unlockedThroughOrder,
        progress.lastTouchedLevelId,
        JSON.stringify(progress.completedLevelIds),
        workspaceId,
      );
  }

  /** Read-modify-write a workspace's progress row inside a single transaction. */
  update(workspaceId: string, mutator: (current: Progress) => Progress): Progress {
    const txn = this.db.transaction(() => {
      const next = mutator(this.get(workspaceId));
      this.save(workspaceId, next);
      return next;
    });
    return txn();
  }
}
