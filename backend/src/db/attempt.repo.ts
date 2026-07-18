/**
 * Repository for `attempts` rows. The full Attempt (scores, feedback, design snapshot)
 * is stored as a JSON `payload`; best-score-per-level is derived, never stored.
 */
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { Attempt } from '../models/index.js';

interface AttemptRow {
  id: string;
  level_id: string;
  payload: string;
  created_at: string;
}

export class AttemptRepo {
  constructor(private readonly db: Database) {}

  /** Persist an attempt. Returns the stored attempt (with its generated id). */
  create(levelId: string, attempt: Omit<Attempt, 'id'>): Attempt {
    const id = randomUUID();
    const stored: Attempt = { id, ...attempt };
    this.db
      .prepare('INSERT INTO attempts (id, level_id, payload, created_at) VALUES (?, ?, ?, ?)')
      .run(id, levelId, JSON.stringify(stored), attempt.createdAt);
    return stored;
  }

  listByLevelId(levelId: string): Attempt[] {
    const rows = this.db
      .prepare('SELECT * FROM attempts WHERE level_id = ? ORDER BY created_at DESC')
      .all(levelId) as AttemptRow[];
    return rows.map((r) => JSON.parse(r.payload) as Attempt);
  }

  /** Highest total for a level, or null if never attempted. */
  bestByLevelId(levelId: string): number | null {
    const attempts = this.listByLevelId(levelId);
    if (attempts.length === 0) return null;
    return attempts.reduce((max, a) => Math.max(max, a.total), 0);
  }
}
