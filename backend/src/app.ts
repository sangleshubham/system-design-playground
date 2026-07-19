/**
 * Express app assembly. Exports a `createApp` factory (no `listen`) so supertest can
 * import the app directly and tests can inject an in-memory database.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { createDatabase, type DbContext } from './db/database.js';
import { contentService } from './services/content.service.js';
import { ProgressService } from './services/progress.service.js';
import { errorHandler } from './http/http-error.js';
import { apiRouter } from './routes/index.js';
import type { AppDeps } from './deps.js';
import { loadAiConfig, type AiConfig } from './config/ai.config.js';
import { createDeepSeekClient, type DeepSeekClient } from './services/ai/deepseek.client.js';
import { createAiReviewService } from './services/ai/ai-review.service.js';
import { FixedWindowRateLimiter } from './http/rate-limit.js';

export interface CreateAppOptions {
  db?: DbContext;
  /** Override the AI config (tests enable the feature without real env vars). */
  aiConfig?: AiConfig;
  /** Inject a stubbed DeepSeek client so no test ever hits the live API. */
  aiClient?: DeepSeekClient;
}

/** Minimal request logger: method, path, status, duration. */
function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

export function createApp(options: CreateAppOptions = {}): Express {
  // Content is read-only and shared; loading is idempotent and fails fast on bad seeds.
  contentService.load();

  const db = options.db ?? createDatabase();
  const progress = new ProgressService(db, contentService);

  const aiConfig = options.aiConfig ?? loadAiConfig();

  const componentsById = new Map(contentService.getComponents().map((c) => [c.id, c]));
  const aiClient =
    options.aiClient ??
    createDeepSeekClient({
      // Never called while disabled; the service short-circuits on !config.enabled.
      apiKey: aiConfig.apiKey ?? '',
      baseUrl: aiConfig.baseUrl,
      timeoutMs: aiConfig.timeoutMs,
    });
  const aiReviewService = createAiReviewService({
    config: aiConfig,
    client: aiClient,
    designs: db.designs,
    reviews: db.aiReviews,
    componentsById,
  });

  // Per-IP rate-limit buckets (research R7): 10 failed validations/min, 5 key creations/min.
  const failLimiter = new FixedWindowRateLimiter({ limit: 10 });
  const createLimiter = new FixedWindowRateLimiter({ limit: 5 });

  const deps: AppDeps = {
    db,
    content: contentService,
    progress,
    aiConfig,
    aiReviewService,
    failLimiter,
    createLimiter,
  };

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(requestLogger);

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1', apiRouter(deps));

  // Unmatched API routes get the JSON error envelope, not Express's default HTML page.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Unknown API endpoint.' } });
  });

  // Production: serve the built Angular SPA with a history-API fallback for client routes.
  if (process.env.NODE_ENV === 'production') {
    const here = dirname(fileURLToPath(import.meta.url));
    const clientDir =
      process.env.CLIENT_DIR ?? resolve(here, '../../frontend/dist/frontend/browser');
    app.use(express.static(clientDir));
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Let unmatched API routes fall through to the JSON 404; everything else is the SPA.
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(resolve(clientDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
