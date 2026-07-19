/**
 * Repository for `attempts` rows, scoped by `workspace_id` (feature 005). The full Attempt
 * (scores, feedback, design snapshot) is stored as a JSON `payload`; best-score-per-level
 * is derived per workspace, never stored.
 */
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { Attempt } from '../models/index.js';

interface AttemptRow {
  id: string;
  workspace_id: string;
  level_id: string;
  payload: string;
  created_at: string;
}

export class AttemptRepo {
  constructor(private readonly db: Database) {}

  /** Persist an attempt for a workspace. Returns the stored attempt (with its generated id). */
  create(workspaceId: string, levelId: string, attempt: Omit<Attempt, 'id'>): Attempt {
    const id = randomUUID();
    const stored: Attempt = { id, ...attempt };
    this.db
      .prepare(
        'INSERT INTO attempts (id, workspace_id, level_id, payload, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, workspaceId, levelId, JSON.stringify(stored), attempt.createdAt);
    return stored;
  }

  listByLevelId(workspaceId: string, levelId: string): Attempt[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM attempts WHERE workspace_id = ? AND level_id = ? ORDER BY created_at DESC',
      )
      .all(workspaceId, levelId) as AttemptRow[];
    return rows.map((r) => JSON.parse(r.payload) as Attempt);
  }

  /** Highest total for a level within a workspace, or null if never attempted. */
  bestByLevelId(workspaceId: string, levelId: string): number | null {
    const attempts = this.listByLevelId(workspaceId, levelId);
    if (attempts.length === 0) return null;
    return attempts.reduce((max, a) => Math.max(max, a.total), 0);
  }
}
