/**
 * Auth endpoints (contracts/auth-api.md, research R9). Exactly two:
 *   POST /auth/keys    — public, `create`-limited: mint a workspace and return its key once.
 *   GET  /auth/session — behind the auth wall: probe a key / load session facts.
 *
 * `authPublicRouter` is mounted BEFORE the auth middleware (key creation needs no key);
 * `authSessionRouter` is mounted AFTER it (the middleware resolves the workspace). Ordering
 * is set in routes/index.ts.
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import type { Workspace } from '../db/workspace.repo.js';
import { clientIp } from '../auth/auth.middleware.js';
import { formatKey, generateKey, hashKey } from '../auth/key.js';
import { ApiHttpError } from '../http/http-error.js';

const RATE_LIMITED_MESSAGE = 'Too many attempts from this address. Try again in a minute.';

/** POST /auth/keys — create a workspace and issue its display-form key (the only raw-key response). */
export function authPublicRouter(deps: AppDeps): Router {
  const router = Router();

  router.post('/auth/keys', (req, res) => {
    const ip = clientIp(req);
    if (deps.createLimiter.isLimited(ip)) {
      throw new ApiHttpError(429, 'rate_limited', RATE_LIMITED_MESSAGE);
    }
    deps.createLimiter.record(ip);

    const raw = generateKey();
    const workspace = deps.db.workspaces.create(hashKey(raw));
    res.status(201).json({ key: formatKey(raw), createdAt: workspace.createdAt });
  });

  return router;
}

/** GET /auth/session — the workspace was resolved by the middleware onto res.locals. */
export function authSessionRouter(_deps: AppDeps): Router {
  const router = Router();

  router.get('/auth/session', (_req, res) => {
    const workspace = res.locals.workspace as Workspace;
    res.json({ createdAt: workspace.createdAt, lastUsedAt: workspace.lastUsedAt });
  });

  return router;
}
