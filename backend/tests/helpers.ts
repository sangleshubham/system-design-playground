/** Test helpers: build the Express app backed by a fresh in-memory database. */
import { createApp, type CreateAppOptions } from '../src/app.js';
import { createDatabase, type DbContext } from '../src/db/database.js';
import { contentService } from '../src/services/content.service.js';
import type { DesignNode, DesignEdge } from '../src/models/index.js';

export function makeApp(
  options: Omit<CreateAppOptions, 'db'> = {},
): { app: ReturnType<typeof createApp>; db: DbContext } {
  const db = createDatabase(':memory:');
  const app = createApp({ db, ...options });
  return { app, db };
}

export function loadContent(): void {
  contentService.load();
}

/** The canonical level-1 passing design: Client → CDN → Web Server → Blob Storage. */
export function level1Solution(): { nodes: DesignNode[]; edges: DesignEdge[] } {
  const nodes: DesignNode[] = [
    { id: 'n1', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 },
    { id: 'n2', componentId: 'cdn', displayName: 'CDN', note: '', x: 200, y: 0 },
    { id: 'n3', componentId: 'web-server', displayName: 'Web Server', note: '', x: 400, y: 0 },
    { id: 'n4', componentId: 'blob-storage', displayName: 'Blob Storage', note: '', x: 600, y: 0 },
  ];
  const edges: DesignEdge[] = [
    { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' },
    { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3' },
    { id: 'e3', sourceNodeId: 'n3', targetNodeId: 'n4' },
  ];
  return { nodes, edges };
}
