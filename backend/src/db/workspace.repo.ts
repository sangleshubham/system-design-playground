/**
 * Repository for `workspaces` rows — one row per issued access key (data-model.md §
 * Workspace, research R2/R4). The server persists only the key's SHA-256 hash; the raw
 * key never reaches this layer. `last_used_at` is refreshed by the auth middleware,
 * throttled to at most once per minute.
 */
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';

export interface Workspace {
  id: string;
  keyHash: string;
  createdAt: string;
  lastUsedAt: string;
}

interface WorkspaceRow {
  id: string;
  key_hash: string;
  created_at: string;
  last_used_at: string;
}

function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    keyHash: row.key_hash,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export class WorkspaceRepo {
  constructor(private readonly db: Database) {}

  /** Create a workspace for an already-hashed key. Returns the stored row. */
  create(keyHash: string): Workspace {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO workspaces (id, key_hash, created_at, last_used_at) VALUES (?, ?, ?, ?)',
      )
      .run(id, keyHash, now, now);
    return { id, keyHash, createdAt: now, lastUsedAt: now };
  }

  /** The auth lookup: resolve a workspace from a presented key's hash. */
  findByKeyHash(keyHash: string): Workspace | null {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE key_hash = ?').get(keyHash) as
      | WorkspaceRow
      | undefined;
    return row ? rowToWorkspace(row) : null;
  }

  /** Refresh `last_used_at`. The caller decides how often (middleware throttles to ≥1/min). */
  touchLastUsed(id: string, at: string = new Date().toISOString()): void {
    this.db.prepare('UPDATE workspaces SET last_used_at = ? WHERE id = ?').run(at, id);
  }
}
