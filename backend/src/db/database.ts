/**
 * SQLite bootstrap. Opens backend/data/app.db (created on first run), enables WAL, and
 * creates the schema idempotently. `DB_PATH=:memory:` gives each test an isolated DB.
 *
 * Returns a DbContext bundling the raw connection and the three repositories so the
 * Express app can be constructed with an injected database (see app.ts / tests/helpers.ts).
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

const HERE = dirname(fileURLToPath(import.meta.url));

export interface DbContext {
  db: DatabaseType;
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

function initSchema(db: DatabaseType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      level_id TEXT UNIQUE,
      name TEXT,
      document TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      level_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_level ON attempts (level_id);

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      unlocked_through_order INTEGER NOT NULL,
      last_touched_level_id TEXT,
      completed_level_ids TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_reviews (
      id                TEXT PRIMARY KEY,
      level_id          TEXT NOT NULL,
      design_hash       TEXT NOT NULL,
      model             TEXT NOT NULL,
      reasoning_effort  TEXT NOT NULL,
      payload           TEXT NOT NULL,
      prompt_tokens     INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      latency_ms        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      UNIQUE (level_id, design_hash, model)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_reviews_level ON ai_reviews (level_id, created_at DESC);
  `);
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
  initSchema(db);
  return {
    db,
    designs: new DesignRepo(db),
    attempts: new AttemptRepo(db),
    progress: new ProgressRepo(db),
    aiReviews: new AiReviewRepo(db),
  };
}
