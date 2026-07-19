/**
 * Auth API contract suite (T011, contracts/auth-api.md § Test obligations). Drives the real
 * app through supertest, controlling the `X-Access-Key` header directly (so it uses
 * `request(app)`, not the pre-authed `api` helper).
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp } from '../helpers.js';
import { hashKey } from '../../src/auth/key.js';

const GROUPED_KEY = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

describe('Auth API (contracts/auth-api.md)', () => {
  it('POST /auth/keys → 201 with a 14-char grouped key that round-trips through GET /auth/session', async () => {
    const { app } = makeApp();

    const created = await request(app).post('/api/v1/auth/keys');
    expect(created.status).toBe(201);
    expect(created.body.key).toMatch(GROUPED_KEY);
    expect(typeof created.body.createdAt).toBe('string');

    const session = await request(app)
      .get('/api/v1/auth/session')
      .set('X-Access-Key', created.body.key);
    expect(session.status).toBe(200);
    expect(session.body.createdAt).toBe(created.body.createdAt);
    expect(typeof session.body.lastUsedAt).toBe('string');
  });

  it('normalizes lowercase, un-hyphenated, and aliased (o→0, i→1) keys to the same workspace', async () => {
    const { app, db } = makeApp();
    // Seed a deterministic key containing 0 and 1 so the alias forms are exercised.
    const normalized = '0123456789AB';
    db.workspaces.create(hashKey(normalized));

    const forms = [
      normalized, // canonical: 0123456789AB
      '0123-4567-89AB', // hyphenated
      '0123456789ab', // lowercase
      'OI23456789AB', // aliases: O→0, I→1
    ];
    for (const form of forms) {
      const res = await request(app).get('/api/v1/auth/session').set('X-Access-Key', form);
      expect(res.status, `form ${form}`).toBe(200);
    }
  });

  it('answers missing, malformed, and unknown keys with identical 401 invalid_key envelopes (no oracle)', async () => {
    const { app } = makeApp();
    const missing = await request(app).get('/api/v1/map');
    const malformed = await request(app).get('/api/v1/map').set('X-Access-Key', 'nope');
    const unknown = await request(app).get('/api/v1/map').set('X-Access-Key', '000000000000');

    for (const res of [missing, malformed, unknown]) expect(res.status).toBe(401);
    expect(malformed.body).toEqual(missing.body);
    expect(unknown.body).toEqual(missing.body);
    expect(missing.body.error.code).toBe('invalid_key');
  });

  it('rate-limits the 11th failed validation from one IP with 429; successes are never counted', async () => {
    const { app, key } = makeApp();

    // Ten valid calls first — successes must not consume the failure budget.
    for (let i = 0; i < 10; i++) {
      const ok = await request(app).get('/api/v1/auth/session').set('X-Access-Key', key);
      expect(ok.status).toBe(200);
    }

    // Ten failures are allowed (401), the eleventh is gated (429).
    for (let i = 0; i < 10; i++) {
      const bad = await request(app).get('/api/v1/auth/session').set('X-Access-Key', '000000000000');
      expect(bad.status).toBe(401);
    }
    const gated = await request(app).get('/api/v1/auth/session').set('X-Access-Key', '000000000000');
    expect(gated.status).toBe(429);
    expect(gated.body.error.code).toBe('rate_limited');
  });

  it('GET /api/v1/health requires no key', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
