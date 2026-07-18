import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, level1Solution } from '../helpers.js';

async function saveSolution(app: ReturnType<typeof makeApp>['app']): Promise<void> {
  const { nodes, edges } = level1Solution();
  await request(app)
    .put('/api/v1/levels/level-1/design')
    .send({ nodes, edges, notes: [], revealedHintCount: 0 });
}

describe('POST /api/v1/levels/:levelId/attempts', () => {
  it('scores an empty canvas as a valid low score (never an error)', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/v1/levels/level-1/attempts');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeLessThan(90);
    expect(res.body.passed).toBe(false);
    expect(res.body.unlockedLevelId).toBeUndefined();
  });

  it('passes the known level-1 solution and unlocks level-2', async () => {
    const { app } = makeApp();
    await saveSolution(app);
    const res = await request(app).post('/api/v1/levels/level-1/attempts');
    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.total).toBe(100);
    expect(res.body.unlockedLevelId).toBe('level-2');

    // level-2 is now reachable.
    const l2 = await request(app).get('/api/v1/levels/level-2');
    expect(l2.status).toBe(200);
  });

  it('returns 423 for a locked level attempt', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/v1/levels/level-5/attempts');
    expect(res.status).toBe(423);
  });

  it('best score reflects the maximum total across attempts', async () => {
    const { app } = makeApp();
    // First attempt: empty (low). Then save solution and attempt again (100).
    await request(app).post('/api/v1/levels/level-1/attempts');
    await saveSolution(app);
    await request(app).post('/api/v1/levels/level-1/attempts');

    const history = await request(app).get('/api/v1/levels/level-1/attempts');
    expect(history.status).toBe(200);
    expect(history.body.attempts.length).toBe(2);
    expect(history.body.best).toBe(100);
    // newest first
    expect(history.body.attempts[0].total).toBe(100);
  });
});
