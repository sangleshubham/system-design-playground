import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { makeApp, level1Solution } from '../helpers.js';
import type { AiConfig } from '../../src/config/ai.config.js';
import type { DeepSeekClient, DeepSeekResult } from '../../src/services/ai/deepseek.client.js';
import type { AiReviewPayload } from '../../src/models/ai-review.js';
import {
  AiAuthFailedError,
  AiOutOfCreditError,
  AiRateLimitedError,
  AiTimeoutError,
  AiUpstreamError,
} from '../../src/services/ai/errors.js';

const AI_CONFIG: AiConfig = {
  enabled: true,
  apiKey: 'test-key',
  model: 'deepseek-v4-flash',
  deepModel: 'deepseek-v4-pro',
  baseUrl: 'https://api.deepseek.test',
  reasoningEffort: 'high',
  timeoutMs: 5000,
};

const VALID_PAYLOAD: AiReviewPayload = {
  score: 78,
  verdict: 'Solid 3-tier core.',
  dimensions: [
    { name: 'requirements-fit', score: 85, comment: 'Covers the brief.' },
    { name: 'scalability', score: 75, comment: 'Scales horizontally.' },
    { name: 'reliability', score: 60, comment: 'Single point of failure.' },
    { name: 'efficiency', score: 88, comment: 'Cost-efficient.' },
    { name: 'operability', score: 55, comment: 'No observability.' },
  ],
  strengths: ['Clear tiering', 'Good caching'],
  gaps: ['No retries', 'No monitoring'],
  realWorldComparison: {
    referenceArchitecture: 'Classic 3-tier with a cache.',
    matches: ['Uses a CDN'],
    differences: ['No multi-region failover'],
  },
  nextSteps: ['Add a replica database'],
};

function result(content: string, overrides: Partial<DeepSeekResult> = {}): DeepSeekResult {
  return {
    content,
    reasoningDiscarded: false,
    usage: { promptTokens: 100, completionTokens: 200 },
    latencyMs: 1,
    ...overrides,
  };
}

function fakeClient(complete: DeepSeekClient['complete']): DeepSeekClient {
  return { complete };
}

/** Row count in `ai_reviews` — used to assert a failed call persisted nothing (FR-010). */
function aiReviewCount(db: ReturnType<typeof makeApp>['db']): number {
  return (db.db.prepare('SELECT COUNT(*) as c FROM ai_reviews').get() as { c: number }).c;
}

async function saveLevel1Solution(app: ReturnType<typeof makeApp>['app']): Promise<void> {
  const { nodes, edges } = level1Solution();
  await request(app)
    .put('/api/v1/levels/level-1/design')
    .send({ nodes, edges, notes: [], revealedHintCount: 0 });
}

/** Save a distinct design (extra node) so its hash differs from the base solution. */
async function saveEditedLevel1Design(app: ReturnType<typeof makeApp>['app']): Promise<void> {
  const { nodes, edges } = level1Solution();
  const edited = [
    ...nodes,
    { id: 'n5', componentId: 'load-balancer', displayName: 'Load Balancer', note: '', x: 800, y: 0 },
  ];
  await request(app)
    .put('/api/v1/levels/level-1/design')
    .send({ nodes: edited, edges, notes: [], revealedHintCount: 0 });
}

describe('POST /api/v1/levels/:levelId/ai-review', () => {
  it('returns a 200 review matching the contract shape', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const res = await request(app).post('/api/v1/levels/level-1/ai-review').send({});

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(false);
    expect(res.body.review.model).toBe('deepseek-v4-flash');
    expect(res.body.review.payload.score).toBe(78);
    expect(res.body.review.payload.dimensions).toHaveLength(5);
    expect(res.body.review.payload.realWorldComparison.referenceArchitecture).toBe(
      'Classic 3-tier with a cache.',
    );
    expect(res.body.review.usage).toEqual({
      promptTokens: 100,
      completionTokens: 200,
      latencyMs: 1,
    });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('repairs a malformed first response with exactly one retry', async () => {
    const complete = vi
      .fn<DeepSeekClient['complete']>()
      .mockResolvedValueOnce(result('not valid json'))
      .mockResolvedValueOnce(result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const res = await request(app).post('/api/v1/levels/level-1/ai-review').send({});

    expect(res.status).toBe(200);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('returns 502 ai_malformed_output after two invalid responses, no upstream calls beyond the retry', async () => {
    const complete = vi.fn(async () => result('still not json'));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const res = await request(app).post('/api/v1/levels/level-1/ai-review').send({});

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('ai_malformed_output');
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('returns 422 design_empty before any upstream call', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    // Fresh in-memory DB: level-1 has no saved design yet.

    const res = await request(app).post('/api/v1/levels/level-1/ai-review').send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('design_empty');
    expect(complete).not.toHaveBeenCalled();
  });

  it('rejects a concurrent second request with 409 while the first is in flight', async () => {
    let resolveComplete!: (value: DeepSeekResult) => void;
    const pending = new Promise<DeepSeekResult>((resolve) => {
      resolveComplete = resolve;
    });
    const complete = vi.fn(() => pending);
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    // supertest's Test is lazy — it only fires once `.then`/`.end` is invoked — so attach
    // a handler immediately to kick off request 1 before request 2 is sent.
    let firstStatus = -1;
    const first = request(app)
      .post('/api/v1/levels/level-1/ai-review')
      .send({})
      .then((res) => {
        firstStatus = res.status;
      });
    await new Promise((r) => setTimeout(r, 20));
    const second = await request(app).post('/api/v1/levels/level-1/ai-review').send({});

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ai_review_in_flight');

    resolveComplete(result(JSON.stringify(VALID_PAYLOAD)));
    await first;
    expect(firstStatus).toBe(200);
  });

  it('uses the configured deep model when deep: true', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const res = await request(app).post('/api/v1/levels/level-1/ai-review').send({ deep: true });

    expect(res.status).toBe(200);
    expect(res.body.review.model).toBe('deepseek-v4-pro');
    expect(complete.mock.calls[0][0].model).toBe('deepseek-v4-pro');
  });

  it('returns 404 for an unknown level and 423 for a locked level, never calling upstream', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });

    const notFound = await request(app).post('/api/v1/levels/no-such-level/ai-review').send({});
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('level_not_found');

    const locked = await request(app).post('/api/v1/levels/level-5/ai-review').send({});
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe('level_locked');

    expect(complete).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/levels/:levelId/ai-review — cache & persistence (US2)', () => {
  it('serves a repeat request from the stored review with ZERO extra upstream calls', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const first = await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);
    expect(complete).toHaveBeenCalledTimes(1);

    const second = await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.review.id).toBe(first.body.review.id); // same stored row
    expect(complete).toHaveBeenCalledTimes(1); // no new upstream call
  });

  it('force: true re-calls the model and replaces the stored row', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const first = await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    const forced = await request(app).post('/api/v1/levels/level-1/ai-review').send({ force: true });

    expect(forced.status).toBe(200);
    expect(forced.body.cached).toBe(false);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(forced.body.review.id).not.toBe(first.body.review.id); // row replaced

    // The replacement is now the cached row for the unchanged design.
    const afterForce = await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    expect(afterForce.body.cached).toBe(true);
    expect(afterForce.body.review.id).toBe(forced.body.review.id);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('flash and deep (pro) reviews of the same design coexist as separate cached rows', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const flash = await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    const pro = await request(app).post('/api/v1/levels/level-1/ai-review').send({ deep: true });
    expect(flash.body.review.model).toBe('deepseek-v4-flash');
    expect(pro.body.review.model).toBe('deepseek-v4-pro');
    expect(complete).toHaveBeenCalledTimes(2); // one per model — neither was a cache hit

    // Each model now serves its own cached row.
    const flashAgain = await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    const proAgain = await request(app).post('/api/v1/levels/level-1/ai-review').send({ deep: true });
    expect(flashAgain.body.cached).toBe(true);
    expect(flashAgain.body.review.model).toBe('deepseek-v4-flash');
    expect(proAgain.body.cached).toBe(true);
    expect(proAgain.body.review.model).toBe('deepseek-v4-pro');
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('a design edit changes the hash, so the next request is a fresh (uncached) review', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    expect(complete).toHaveBeenCalledTimes(1);

    await saveEditedLevel1Design(app);
    const afterEdit = await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    expect(afterEdit.body.cached).toBe(false);
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

describe('GET /api/v1/levels/:levelId/ai-review (US2 restore)', () => {
  it('reports availability and models, with no review before one is requested', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const res = await request(app).get('/api/v1/levels/level-1/ai-review');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      available: true,
      models: { default: 'deepseek-v4-flash', deep: 'deepseek-v4-pro' },
      review: null,
      stale: false,
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('returns the stored review for the current design without calling upstream', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const posted = await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    const res = await request(app).get('/api/v1/levels/level-1/ai-review');

    expect(res.status).toBe(200);
    expect(res.body.review.id).toBe(posted.body.review.id);
    expect(res.body.stale).toBe(false);
    expect(complete).toHaveBeenCalledTimes(1); // GET added no upstream call
  });

  it('returns the newest review across models for the current design', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    await request(app).post('/api/v1/levels/level-1/ai-review').send({});
    const pro = await request(app).post('/api/v1/levels/level-1/ai-review').send({ deep: true });

    const res = await request(app).get('/api/v1/levels/level-1/ai-review');
    expect(res.body.review.id).toBe(pro.body.review.id); // pro was created last → newest wins
    expect(res.body.review.model).toBe('deepseek-v4-pro');
  });

  it('flags stale=true once the design changes after a review exists', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);
    await request(app).post('/api/v1/levels/level-1/ai-review').send({});

    await saveEditedLevel1Design(app);
    const res = await request(app).get('/api/v1/levels/level-1/ai-review');

    expect(res.body.review).toBeNull();
    expect(res.body.stale).toBe(true);
  });

  it('applies the same 404/423 level guards and never calls upstream', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });

    const notFound = await request(app).get('/api/v1/levels/no-such-level/ai-review');
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('level_not_found');

    const locked = await request(app).get('/api/v1/levels/level-5/ai-review');
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe('level_locked');

    expect(complete).not.toHaveBeenCalled();
  });
});

/** Contract error table (contracts/api.md): upstream failure → HTTP status + code. */
const FAILURE_CASES: Array<[new () => Error, number, string]> = [
  [AiAuthFailedError, 502, 'ai_auth_failed'],
  [AiOutOfCreditError, 502, 'ai_out_of_credit'],
  [AiRateLimitedError, 503, 'ai_rate_limited'],
  [AiUpstreamError, 502, 'ai_upstream_error'],
  [AiTimeoutError, 504, 'ai_timeout'],
];

describe('POST /api/v1/levels/:levelId/ai-review — upstream failure matrix (US3)', () => {
  for (const [ErrCls, status, code] of FAILURE_CASES) {
    it(`maps a client-thrown ${ErrCls.name} to ${status} ${code} and persists nothing`, async () => {
      const complete = vi.fn(async () => {
        throw new ErrCls();
      });
      const { app, db } = makeApp({ aiConfig: AI_CONFIG, aiClient: fakeClient(complete) });
      await saveLevel1Solution(app);

      const res = await request(app).post('/api/v1/levels/level-1/ai-review').send({});

      expect(res.status).toBe(status);
      expect(res.body.error.code).toBe(code);
      expect(aiReviewCount(db)).toBe(0); // FR-010: a failed call persists nothing
    });
  }
});

describe('AI review unavailable — playground unaffected (US3 regression guard, SC-004)', () => {
  const AI_CONFIG_DISABLED: AiConfig = {
    enabled: false,
    apiKey: undefined,
    model: 'deepseek-v4-flash',
    deepModel: 'deepseek-v4-pro',
    baseUrl: 'https://api.deepseek.test',
    reasoningEffort: 'high',
    timeoutMs: 5000,
  };

  it('POST ai-review short-circuits to 503 ai_not_configured before any upstream call', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app, db } = makeApp({ aiConfig: AI_CONFIG_DISABLED, aiClient: fakeClient(complete) });
    await saveLevel1Solution(app);

    const res = await request(app).post('/api/v1/levels/level-1/ai-review').send({});

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ai_not_configured');
    expect(complete).not.toHaveBeenCalled();
    expect(aiReviewCount(db)).toBe(0);
  });

  it('GET ai-review reports available: false with no review, never calling upstream', async () => {
    const complete = vi.fn(async () => result(JSON.stringify(VALID_PAYLOAD)));
    const { app } = makeApp({ aiConfig: AI_CONFIG_DISABLED, aiClient: fakeClient(complete) });

    const res = await request(app).get('/api/v1/levels/level-1/ai-review');

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.review).toBeNull();
    expect(complete).not.toHaveBeenCalled();
  });

  it('RUN (attempts) behaves exactly as feature 001 with no DEEPSEEK_API_KEY (SC-004)', async () => {
    const { app } = makeApp({ aiConfig: AI_CONFIG_DISABLED });
    await saveLevel1Solution(app);

    const res = await request(app).post('/api/v1/levels/level-1/attempts');

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.total).toBe(100);
    expect(res.body.unlockedLevelId).toBe('level-2');
  });
});
