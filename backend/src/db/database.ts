/**
 * SQLite bootstrap. Opens backend/data/app.db (created on first run), enables WAL, and
 * creates the schema idempotently at v2. `DB_PATH=:memory:` gives each test an isolated DB.
 *
 * Schema v2 (feature 005, research R5): every user-data table is scoped by `workspace_id`
 * (FK → workspaces). Migration is a drop-and-recreate: on open, if the file reports
 * `user_version < 2` AND legacy (unscoped) tables exist, the four user-data tables are
 * dropped and recreated. A healthy v2 file (`user_version = 2`) is NEVER dropped. Dev data
 * is disposable (spec Assumptions); no column backfill is attempted.
 *
 * Returns a DbContext bundling the raw connection and every repository so the Express app
 * can be constructed with an injected database (see app.ts / tests/helpers.ts).
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { DesignRepo } from './design.repo.js';
import { AttemptRepo } from './attempt.repo.js';
import { ProgressRepo } from './progress.repo.js';
import { AiReviewRepo } from './ai-review.repo.js';
import { WorkspaceRepo } from './workspace.repo.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Current schema version stamped into `PRAGMA user_version`. */
const SCHEMA_VERSION = 2;

export interface DbContext {
  db: DatabaseType;
  workspaces: WorkspaceRepo;
  designs: DesignRepo;
  attempts: AttemptRepo;
  progress: ProgressRepo;
  aiReviews: AiReviewRepo;
}

function resolveDbPath(explicit?: string): string {
  const p = explicit ?? process.env.DB_PATH;
  if (p) return p === ':memory:' ? ':memory:' : resolve(p);
  return resolve(HERE, '../../data/app.db');
}

/** True when the pre-feature-005 (unscoped) `designs` table is present. */
function hasLegacyTables(db: DatabaseType): boolean {
  const designsExists =
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'designs'")
      .get() !== undefined;
  if (!designsExists) return false;
  // A v2 `designs` table has a `workspace_id` column; a legacy one does not.
  const columns = db.prepare('PRAGMA table_info(designs)').all() as { name: string }[];
  return !columns.some((c) => c.name === 'workspace_id');
}

/** Idempotent schema creation at v2 (data-model.md). Every user-data table is workspace-scoped. */
function createSchemaV2(db: DatabaseType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id           TEXT PRIMARY KEY,
      key_hash     TEXT NOT NULL UNIQUE,
      created_at   TEXT NOT NULL,
      last_used_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS designs (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      level_id     TEXT,
      name         TEXT,
      document     TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      UNIQUE (workspace_id, level_id)
    );
    CREATE INDEX IF NOT EXISTS idx_designs_workspace_sandbox
      ON designs (workspace_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS attempts (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      level_id     TEXT NOT NULL,
      payload      TEXT NOT NULL,
      created_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_ws_level ON attempts (workspace_id, level_id);

    CREATE TABLE IF NOT EXISTS progress (
      workspace_id           TEXT PRIMARY KEY REFERENCES workspaces(id),
      unlocked_through_order INTEGER NOT NULL,
      last_touched_level_id  TEXT,
      completed_level_ids    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_reviews (
      id                TEXT PRIMARY KEY,
      workspace_id      TEXT NOT NULL REFERENCES workspaces(id),
      level_id          TEXT NOT NULL,
      design_hash       TEXT NOT NULL,
      model             TEXT NOT NULL,
      reasoning_effort  TEXT NOT NULL,
      payload           TEXT NOT NULL,
      prompt_tokens     INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      latency_ms        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      UNIQUE (workspace_id, level_id, design_hash, model)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_reviews_ws_level
      ON ai_reviews (workspace_id, level_id, created_at DESC);
  `);
}

/**
 * Bring the schema to v2. Drops the legacy user-data tables only when the file predates v2
 * AND still carries the unscoped tables — a healthy v2 file is left untouched (research R5).
 */
function migrateToV2(db: DatabaseType): void {
  const version = db.pragma('user_version', { simple: true }) as number;

  if (version < SCHEMA_VERSION && hasLegacyTables(db)) {
    // Disposable dev data (spec Assumptions): drop child-first, then recreate at v2.
    db.exec(`
      DROP TABLE IF EXISTS ai_reviews;
      DROP TABLE IF EXISTS attempts;
      DROP TABLE IF EXISTS progress;
      DROP TABLE IF EXISTS designs;
      DROP TABLE IF EXISTS workspaces;
    `);
  }

  createSchemaV2(db);

  if (version < SCHEMA_VERSION) {
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  }
}

export function createDatabase(dbPath?: string): DbContext {
  const path = resolveDbPath(dbPath);
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  if (path !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  migrateToV2(db);
  return {
    db,
    workspaces: new WorkspaceRepo(db),
    designs: new DesignRepo(db),
    attempts: new AttemptRepo(db),
    progress: new ProgressRepo(db),
    aiReviews: new AiReviewRepo(db),
  };
}
