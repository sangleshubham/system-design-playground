/**
 * Repository for `designs` rows, scoped by `workspace_id` (feature 005, data-model.md §
 * Design). One row per (workspace, level) design (level_id set, name null) and zero-or-more
 * sandbox rows per workspace (level_id null, name set). The graph lives in a single JSON
 * `document` column — always read/written whole (SC-005, atomic saves).
 *
 * Optimistic concurrency (FR-011, research R6): mutating methods accept an optional
 * `baseUpdatedAt` — the `updatedAt` the client loaded. When present and it no longer equals
 * the stored `updated_at`, the write is refused and the current row returned
 * (`{ status: 'stale' }`) so the route can answer 409. Omitting it writes unconditionally
 * (pure last-write-wins floor).
 */
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { Design, DesignGraph } from '../models/index.js';

interface DesignRow {
  id: string;
  workspace_id: string;
  level_id: string | null;
  name: string | null;
  document: string;
  updated_at: string;
}

interface StoredDocument {
  nodes: Design['nodes'];
  edges: Design['edges'];
  notes: Design['notes'];
  revealedHintCount: number;
}

/** Result of a design write. `stale` carries the winning row for the 409 body (research R6). */
export type DesignSaveOutcome =
  | { status: 'saved'; updatedAt: string }
  | { status: 'stale'; current: Design };

/** A sandbox write additionally distinguishes an unknown id (→ 404). */
export type SandboxSaveOutcome = DesignSaveOutcome | { status: 'not_found' };

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * The next `updated_at` for a row, guaranteed to strictly exceed its previous value. Two
 * saves landing in the same millisecond would otherwise share a timestamp, breaking the
 * optimistic-concurrency token (research R6) — this keeps the token monotonic per row.
 */
function nextUpdatedAt(previous?: string): string {
  const now = nowIso();
  if (previous && Date.parse(now) <= Date.parse(previous)) {
    return new Date(Date.parse(previous) + 1).toISOString();
  }
  return now;
}

function rowToDesign(row: DesignRow): Design {
  const doc = JSON.parse(row.document) as StoredDocument;
  return {
    id: row.id,
    levelId: row.level_id,
    name: row.name,
    nodes: doc.nodes ?? [],
    edges: doc.edges ?? [],
    notes: doc.notes ?? [],
    revealedHintCount: doc.revealedHintCount ?? 0,
    updatedAt: row.updated_at,
  };
}

export class DesignRepo {
  constructor(private readonly db: Database) {}

  getById(workspaceId: string, id: string): Design | null {
    const row = this.db
      .prepare('SELECT * FROM designs WHERE id = ? AND workspace_id = ?')
      .get(id, workspaceId) as DesignRow | undefined;
    return row ? rowToDesign(row) : null;
  }

  /* ---------------- Level designs ---------------- */

  getByLevelId(workspaceId: string, levelId: string): Design | null {
    const row = this.db
      .prepare('SELECT * FROM designs WHERE workspace_id = ? AND level_id = ?')
      .get(workspaceId, levelId) as DesignRow | undefined;
    return row ? rowToDesign(row) : null;
  }

  /**
   * Upsert the working canvas for a level within a workspace. Returns the new updatedAt,
   * or `stale` with the current row when `baseUpdatedAt` no longer matches. A first save
   * (no existing row) always writes — there is nothing to conflict with.
   */
  upsertLevelDesign(
    workspaceId: string,
    levelId: string,
    graph: DesignGraph,
    revealedHintCount: number,
    baseUpdatedAt?: string,
  ): DesignSaveOutcome {
    const existing = this.db
      .prepare('SELECT * FROM designs WHERE workspace_id = ? AND level_id = ?')
      .get(workspaceId, levelId) as DesignRow | undefined;

    if (existing && baseUpdatedAt !== undefined && existing.updated_at !== baseUpdatedAt) {
      return { status: 'stale', current: rowToDesign(existing) };
    }

    const updatedAt = nextUpdatedAt(existing?.updated_at);
    const doc: StoredDocument = {
      nodes: graph.nodes,
      edges: graph.edges,
      notes: graph.notes,
      revealedHintCount,
    };
    if (existing) {
      this.db
        .prepare('UPDATE designs SET document = ?, updated_at = ? WHERE workspace_id = ? AND level_id = ?')
        .run(JSON.stringify(doc), updatedAt, workspaceId, levelId);
    } else {
      this.db
        .prepare(
          'INSERT INTO designs (id, workspace_id, level_id, name, document, updated_at) VALUES (?, ?, ?, NULL, ?, ?)',
        )
        .run(randomUUID(), workspaceId, levelId, JSON.stringify(doc), updatedAt);
    }
    return { status: 'saved', updatedAt };
  }

  /* ---------------- Sandbox designs ---------------- */

  listSandbox(
    workspaceId: string,
  ): { id: string; name: string | null; updatedAt: string; nodeCount: number }[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM designs WHERE workspace_id = ? AND level_id IS NULL ORDER BY updated_at DESC',
      )
      .all(workspaceId) as DesignRow[];
    return rows.map((r) => {
      const doc = JSON.parse(r.document) as StoredDocument;
      return {
        id: r.id,
        name: r.name,
        updatedAt: r.updated_at,
        nodeCount: doc.nodes?.length ?? 0,
      };
    });
  }

  createSandbox(workspaceId: string, name: string): Design {
    const id = randomUUID();
    const updatedAt = nowIso();
    const doc: StoredDocument = { nodes: [], edges: [], notes: [], revealedHintCount: 0 };
    this.db
      .prepare(
        'INSERT INTO designs (id, workspace_id, level_id, name, document, updated_at) VALUES (?, ?, NULL, ?, ?, ?)',
      )
      .run(id, workspaceId, name, JSON.stringify(doc), updatedAt);
    return {
      id,
      levelId: null,
      name,
      nodes: [],
      edges: [],
      notes: [],
      revealedHintCount: 0,
      updatedAt,
    };
  }

  getSandboxById(workspaceId: string, id: string): Design | null {
    const row = this.db
      .prepare('SELECT * FROM designs WHERE id = ? AND workspace_id = ? AND level_id IS NULL')
      .get(id, workspaceId) as DesignRow | undefined;
    return row ? rowToDesign(row) : null;
  }

  /**
   * Update a sandbox design's graph and/or name within a workspace. Returns `not_found`
   * for an unknown id, `stale` on a `baseUpdatedAt` mismatch, else the new updatedAt.
   */
  updateSandbox(
    workspaceId: string,
    id: string,
    graph: DesignGraph,
    name?: string,
    baseUpdatedAt?: string,
  ): SandboxSaveOutcome {
    const row = this.db
      .prepare('SELECT * FROM designs WHERE id = ? AND workspace_id = ? AND level_id IS NULL')
      .get(id, workspaceId) as DesignRow | undefined;
    if (!row) return { status: 'not_found' };

    if (baseUpdatedAt !== undefined && row.updated_at !== baseUpdatedAt) {
      return { status: 'stale', current: rowToDesign(row) };
    }

    const updatedAt = nextUpdatedAt(row.updated_at);
    const doc: StoredDocument = {
      nodes: graph.nodes,
      edges: graph.edges,
      notes: graph.notes,
      revealedHintCount: 0,
    };
    const nextName = name ?? row.name;
    this.db
      .prepare('UPDATE designs SET document = ?, name = ?, updated_at = ? WHERE id = ? AND workspace_id = ?')
      .run(JSON.stringify(doc), nextName, updatedAt, id, workspaceId);
    return { status: 'saved', updatedAt };
  }

  deleteSandbox(workspaceId: string, id: string): boolean {
    const info = this.db
      .prepare('DELETE FROM designs WHERE id = ? AND workspace_id = ? AND level_id IS NULL')
      .run(id, workspaceId);
    return info.changes > 0;
  }
}
