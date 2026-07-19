/**
 * Auth middleware unit tests (T007, contracts/auth-api.md). Mounts the middleware on a tiny
 * Express app with a probe route and drives it with supertest to assert: the no-oracle 401
 * envelope, the 429-before-hashing gate, success plumbing onto res.locals, and the
 * throttled last_used_at refresh.
 */
import { describe, it, expect } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createAuthMiddleware } from '../../src/auth/auth.middleware.js';
import { FixedWindowRateLimiter } from '../../src/http/rate-limit.js';
import { createDatabase } from '../../src/db/database.js';
import { generateKey, hashKey } from '../../src/auth/key.js';

function makeMwApp() {
  const db = createDatabase(':memory:');
  const failLimiter = new FixedWindowRateLimiter({ limit: 10 });
  const key = generateKey();
  const workspace = db.workspaces.create(hashKey(key));
  const app: Express = express();
  app.use(express.json());
  app.use(createAuthMiddleware({ workspaces: db.workspaces, failLimiter }));
  app.get('/probe', (_req, res) => {
    res.json({ workspaceId: res.locals.workspaceId });
  });
  return { app, db, key, workspace, failLimiter };
}

describe('auth middleware', () => {
  it('resolves a valid key onto res.locals.workspaceId and calls next', async () => {
    const { app, key, workspace } = makeMwApp();
    const res = await request(app).get('/probe').set('X-Access-Key', key);
    expect(res.status).toBe(200);
    expect(res.body.workspaceId).toBe(workspace.id);
  });

  it('accepts a mangled key (lowercase, hyphenated, aliased) — normalization', async () => {
    const { app, key, workspace } = makeMwApp();
    const mangled = `${key.slice(0, 4)}-${key.slice(4, 8)}-${key.slice(8)}`.toLowerCase();
    const res = await request(app).get('/probe').set('X-Access-Key', mangled);
    expect(res.status).toBe(200);
    expect(res.body.workspaceId).toBe(workspace.id);
  });

  it('returns a byte-identical 401 invalid_key for missing, malformed, and unknown keys (no oracle)', async () => {
    const { app } = makeMwApp();
    const missing = await request(app).get('/probe');
    const malformed = await request(app).get('/probe').set('X-Access-Key', 'not-a-key');
    const unknown = await request(app).get('/probe').set('X-Access-Key', generateKey());

    for (const res of [missing, malformed, unknown]) {
      expect(res.status).toBe(401);
    }
    // Identical envelopes — the failure reveals nothing about which check failed.
    expect(malformed.body).toEqual(missing.body);
    expect(unknown.body).toEqual(missing.body);
    expect(missing.body.error.code).toBe('invalid_key');
  });

  it('gates the IP with 429 after 10 failures — the 11th attempt never hashes', async () => {
    const { app } = makeMwApp();
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/probe').set('X-Access-Key', '000000000000');
      expect(res.status).toBe(401);
    }
    const gated = await request(app).get('/probe').set('X-Access-Key', '000000000000');
    expect(gated.status).toBe(429);
    expect(gated.body.error.code).toBe('rate_limited');
  });

  it('never counts successful validations against the limiter', async () => {
    const { app, key } = makeMwApp();
    for (let i = 0; i < 15; i++) {
      const res = await request(app).get('/probe').set('X-Access-Key', key);
      expect(res.status).toBe(200);
    }
  });

  it('refreshes last_used_at only when the previous touch is over a minute old', async () => {
    const { app, db, key, workspace } = makeMwApp();

    // Immediately after creation: within the throttle window, so last_used_at is untouched.
    await request(app).get('/probe').set('X-Access-Key', key);
    expect(db.workspaces.findByKeyHash(hashKey(key))?.lastUsedAt).toBe(workspace.lastUsedAt);

    // Backdate the row past the window; the next request should refresh it.
    const stale = new Date(Date.now() - 2 * 60_000).toISOString();
    db.workspaces.touchLastUsed(workspace.id, stale);
    await request(app).get('/probe').set('X-Access-Key', key);
    const after = db.workspaces.findByKeyHash(hashKey(key))?.lastUsedAt;
    expect(after).not.toBe(stale);
    expect(Date.parse(after!)).toBeGreaterThan(Date.parse(stale));
  });
});
