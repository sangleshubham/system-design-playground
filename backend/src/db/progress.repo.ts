/**
 * Repository for the singleton `progress` row (the one user). Initializes lazily to the
 * first-run state (unlockedThroughOrder = 1) and offers a transactional update so
 * completion/unlock advances are atomic (data-model.md § Progress).
 */
import type { Database } from 'better-sqlite3';
import type { Progress } from '../models/index.js';

interface ProgressRow {
  id: number;
  unlocked_through_order: number;
  last_touched_level_id: string | null;
  completed_level_ids: string;
}

const SINGLETON_ID = 1;

export class ProgressRepo {
  constructor(private readonly db: Database) {}

  private ensureRow(): ProgressRow {
    const row = this.db.prepare('SELECT * FROM progress WHERE id = ?').get(SINGLETON_ID) as
      | ProgressRow
      | undefined;
    if (row) return row;
    this.db
      .prepare(
        'INSERT INTO progress (id, unlocked_through_order, last_touched_level_id, completed_level_ids) VALUES (?, 1, NULL, ?)',
      )
      .run(SINGLETON_ID, JSON.stringify([]));
    return this.db.prepare('SELECT * FROM progress WHERE id = ?').get(SINGLETON_ID) as ProgressRow;
  }

  get(): Progress {
    const row = this.ensureRow();
    return {
      unlockedThroughOrder: row.unlocked_through_order,
      lastTouchedLevelId: row.last_touched_level_id,
      completedLevelIds: JSON.parse(row.completed_level_ids) as string[],
    };
  }

  save(progress: Progress): void {
    this.ensureRow();
    this.db
      .prepare(
        'UPDATE progress SET unlocked_through_order = ?, last_touched_level_id = ?, completed_level_ids = ? WHERE id = ?',
      )
      .run(
        progress.unlockedThroughOrder,
        progress.lastTouchedLevelId,
        JSON.stringify(progress.completedLevelIds),
        SINGLETON_ID,
      );
  }

  /** Read-modify-write the progress row inside a single transaction. */
  update(mutator: (current: Progress) => Progress): Progress {
    const txn = this.db.transaction(() => {
      const next = mutator(this.get());
      this.save(next);
      return next;
    });
    return txn();
  }
}
