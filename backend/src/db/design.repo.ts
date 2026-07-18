/**
 * Repository for `designs` rows. One row per level design (level_id set, name null) and
 * zero-or-more sandbox rows (level_id null, name set). The graph lives in a single JSON
 * `document` column — single-user, always read/written whole (data-model.md § Design).
 */
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { Design, DesignGraph } from '../models/index.js';

interface DesignRow {
  id: string;
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

function nowIso(): string {
  return new Date().toISOString();
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

  getById(id: string): Design | null {
    const row = this.db.prepare('SELECT * FROM designs WHERE id = ?').get(id) as
      | DesignRow
      | undefined;
    return row ? rowToDesign(row) : null;
  }

  /* ---------------- Level designs ---------------- */

  getByLevelId(levelId: string): Design | null {
    const row = this.db.prepare('SELECT * FROM designs WHERE level_id = ?').get(levelId) as
      | DesignRow
      | undefined;
    return row ? rowToDesign(row) : null;
  }

  /** Upsert the working canvas for a level. Returns the new updatedAt timestamp. */
  upsertLevelDesign(
    levelId: string,
    graph: DesignGraph,
    revealedHintCount: number,
  ): { updatedAt: string } {
    const updatedAt = nowIso();
    const doc: StoredDocument = {
      nodes: graph.nodes,
      edges: graph.edges,
      notes: graph.notes,
      revealedHintCount,
    };
    const existing = this.db.prepare('SELECT id FROM designs WHERE level_id = ?').get(levelId) as
      | { id: string }
      | undefined;
    if (existing) {
      this.db
        .prepare('UPDATE designs SET document = ?, updated_at = ? WHERE level_id = ?')
        .run(JSON.stringify(doc), updatedAt, levelId);
    } else {
      this.db
        .prepare(
          'INSERT INTO designs (id, level_id, name, document, updated_at) VALUES (?, ?, NULL, ?, ?)',
        )
        .run(randomUUID(), levelId, JSON.stringify(doc), updatedAt);
    }
    return { updatedAt };
  }

  /* ---------------- Sandbox designs ---------------- */

  listSandbox(): { id: string; name: string | null; updatedAt: string; nodeCount: number }[] {
    const rows = this.db
      .prepare('SELECT * FROM designs WHERE level_id IS NULL ORDER BY updated_at DESC')
      .all() as DesignRow[];
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

  createSandbox(name: string): Design {
    const id = randomUUID();
    const updatedAt = nowIso();
    const doc: StoredDocument = { nodes: [], edges: [], notes: [], revealedHintCount: 0 };
    this.db
      .prepare(
        'INSERT INTO designs (id, level_id, name, document, updated_at) VALUES (?, NULL, ?, ?, ?)',
      )
      .run(id, name, JSON.stringify(doc), updatedAt);
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

  getSandboxById(id: string): Design | null {
    const row = this.db
      .prepare('SELECT * FROM designs WHERE id = ? AND level_id IS NULL')
      .get(id) as DesignRow | undefined;
    return row ? rowToDesign(row) : null;
  }

  /** Update a sandbox design's graph and/or name. Returns null if the id is unknown. */
  updateSandbox(id: string, graph: DesignGraph, name?: string): { updatedAt: string } | null {
    const row = this.db
      .prepare('SELECT * FROM designs WHERE id = ? AND level_id IS NULL')
      .get(id) as DesignRow | undefined;
    if (!row) return null;
    const updatedAt = nowIso();
    const doc: StoredDocument = {
      nodes: graph.nodes,
      edges: graph.edges,
      notes: graph.notes,
      revealedHintCount: 0,
    };
    const nextName = name ?? row.name;
    this.db
      .prepare('UPDATE designs SET document = ?, name = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(doc), nextName, updatedAt, id);
    return { updatedAt };
  }

  deleteSandbox(id: string): boolean {
    const info = this.db
      .prepare('DELETE FROM designs WHERE id = ? AND level_id IS NULL')
      .run(id);
    return info.changes > 0;
  }
}
