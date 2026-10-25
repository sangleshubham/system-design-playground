import { describe, it, expect } from 'vitest';
import { makeApp, level1Solution, lastLevelId } from '../helpers.js';

async function saveSolution(api: ReturnType<typeof makeApp>['api']): Promise<void> {
  const { nodes, edges } = level1Solution();
  await api
    .put('/api/v1/levels/level-1/design')
    .send({ nodes, edges, notes: [], revealedHintCount: 0 });
}

describe('POST /api/v1/levels/:levelId/attempts', () => {
  it('scores an empty canvas as a valid low score (never an error)', async () => {
    const { api } = makeApp();
    const res = await api.post('/api/v1/levels/level-1/attempts');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeLessThan(90);
    expect(res.body.passed).toBe(false);
    expect(res.body.unlockedLevelId).toBeUndefined();
  });

  it('passes the known level-1 solution and only marks it complete (no unlockedLevelId)', async () => {
    const { api } = makeApp();
    await saveSolution(api);
    const res = await api.post('/api/v1/levels/level-1/attempts');
    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.total).toBe(100);
    expect(res.body).not.toHaveProperty('unlockedLevelId');

    // Re-passing is idempotent: still exactly one completion.
    await api.post('/api/v1/levels/level-1/attempts');
    const progress = await api.get('/api/v1/progress');
    expect(progress.body.lab.completed).toBe(1);
  });

  it('a fresh workspace can attempt the LAST level by order (feature 007)', async () => {
    const { api } = makeApp();
    const res = await api.post(`/api/v1/levels/${lastLevelId()}/attempts`);
    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(false);
  });

  it('best score reflects the maximum total across attempts', async () => {
    const { api } = makeApp();
    // First attempt: empty (low). Then save solution and attempt again (100).
    await api.post('/api/v1/levels/level-1/attempts');
    await saveSolution(api);
    await api.post('/api/v1/levels/level-1/attempts');

    const history = await api.get('/api/v1/levels/level-1/attempts');
    expect(history.status).toBe(200);
    expect(history.body.attempts.length).toBe(2);
    expect(history.body.best).toBe(100);
    // newest first
    expect(history.body.attempts[0].total).toBe(100);
  });
});
