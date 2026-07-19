/**
 * Auth wall (research R3, contracts/auth-api.md). Every `/api/v1` route mounted after this
 * middleware requires a valid `X-Access-Key`. The flow, in order:
 *
 *   1. Rate-limit check FIRST — a limited IP gets a 429 with no hashing and no DB touch,
 *      so the limiter can never be used as a timing/existence oracle.
 *   2. Resolve the key: read header → normalize → shape-check → hash → workspace lookup.
 *      Missing, malformed, and unknown keys all fail with a BYTE-IDENTICAL 401 `invalid_key`
 *      (no oracle) and each failure is recorded against the per-IP limiter.
 *   3. On success, expose the workspace on `res.locals` and refresh `last_used_at`, throttled
 *      to at most once per minute so autosave traffic doesn't hammer the row.
 *
 * The raw key never leaves this module: it is hashed here and only the hash reaches the DB.
 */
import type { NextFunction, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../http/rate-limit.js';
import type { WorkspaceRepo } from '../db/workspace.repo.js';
import { hashKey, isValidShape, normalizeKey } from './key.js';

/** Single message for every auth failure — malformed and unknown are indistinguishable. */
const INVALID_KEY_MESSAGE = 'A valid access key is required.';
const RATE_LIMITED_MESSAGE = 'Too many attempts from this address. Try again in a minute.';
const TOUCH_INTERVAL_MS = 60_000;

export interface AuthMiddlewareDeps {
  workspaces: WorkspaceRepo;
  /** The `validateFail` bucket (limit 10/min): counts 401s, gates with 429. */
  failLimiter: FixedWindowRateLimiter;
  /** Clock override for the touch throttle (default Date.now). */
  now?: () => number;
}

/** Best-effort client IP for per-IP rate limiting. */
export function clientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/** Read the workspace id the auth middleware resolved, asserting it was mounted. */
export function requireWorkspaceId(res: Response): string {
  const id = res.locals.workspaceId as string | undefined;
  if (!id) throw new Error('workspaceId absent from res.locals — auth middleware not mounted.');
  return id;
}

export function createAuthMiddleware(deps: AuthMiddlewareDeps) {
  const clock = deps.now ?? Date.now;

  return function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const ip = clientIp(req);

    // (1) 429 before any crypto/DB work — no oracle for a limited IP.
    if (deps.failLimiter.isLimited(ip)) {
      res.status(429).json({ error: { code: 'rate_limited', message: RATE_LIMITED_MESSAGE } });
      return;
    }

    // (2) Every failure path is identical: record + the same 401 envelope.
    const fail = (): void => {
      deps.failLimiter.record(ip);
      res.status(401).json({ error: { code: 'invalid_key', message: INVALID_KEY_MESSAGE } });
    };

    const raw = req.header('X-Access-Key');
    if (!raw) return fail();

    const normalized = normalizeKey(raw);
    if (!isValidShape(normalized)) return fail();

    const workspace = deps.workspaces.findByKeyHash(hashKey(normalized));
    if (!workspace) return fail();

    // (3) Success — expose the workspace, refresh last_used_at at most once/min.
    const nowMs = clock();
    if (nowMs - Date.parse(workspace.lastUsedAt) >= TOUCH_INTERVAL_MS) {
      const iso = new Date(nowMs).toISOString();
      deps.workspaces.touchLastUsed(workspace.id, iso);
      workspace.lastUsedAt = iso;
    }
    res.locals.workspaceId = workspace.id;
    res.locals.workspace = workspace;
    next();
  };
}
