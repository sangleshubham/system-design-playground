/** Test helpers: build the Express app backed by a fresh in-memory database. */
import request from 'supertest';
import { createApp, type CreateAppOptions } from '../src/app.js';
import { createDatabase, type DbContext } from '../src/db/database.js';
import { contentService } from '../src/services/content.service.js';
import { generateKey, hashKey } from '../src/auth/key.js';
import type { DesignNode, DesignEdge } from '../src/models/index.js';

type SuperTestApp = ReturnType<typeof createApp>;
type Test = ReturnType<ReturnType<typeof request>['get']>;

/**
 * Supertest wrapper that attaches a workspace's `X-Access-Key` to every request, so feature
 * suites exercise the scoped, authed API without repeating the header. Auth-specific suites
 * (tests/auth/) drive `request(app)` directly to control the header precisely.
 */
export interface AuthedApi {
  key: string;
  get(url: string): Test;
  post(url: string): Test;
  put(url: string): Test;
  delete(url: string): Test;
}

export function authedApi(app: SuperTestApp, key: string): AuthedApi {
  const withKey = (t: Test): Test => t.set('X-Access-Key', key);
  return {
    key,
    get: (url) => withKey(request(app).get(url)),
    post: (url) => withKey(request(app).post(url)),
    put: (url) => withKey(request(app).put(url)),
    delete: (url) => withKey(request(app).delete(url)),
  };
}

/** Mint an additional workspace + authed client on an existing app (two-workspace tests). */
export function mintWorkspace(
  app: SuperTestApp,
  db: DbContext,
): { key: string; workspaceId: string; api: AuthedApi } {
  const key = generateKey();
  const workspace = db.workspaces.create(hashKey(key));
  return { key, workspaceId: workspace.id, api: authedApi(app, key) };
}

export function makeApp(options: Omit<CreateAppOptions, 'db'> = {}): {
  app: SuperTestApp;
  db: DbContext;
  key: string;
  workspaceId: string;
  api: AuthedApi;
} {
  const db = createDatabase(':memory:');
  const app = createApp({ db, ...options });
  // Mint a workspace + key so the default `api` is authenticated (feature 005).
  const key = generateKey();
  const workspace = db.workspaces.create(hashKey(key));
  return { app, db, key, workspaceId: workspace.id, api: authedApi(app, key) };
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
