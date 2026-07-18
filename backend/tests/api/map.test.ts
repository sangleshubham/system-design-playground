import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, level1Solution } from '../helpers.js';

describe('GET /api/v1/map', () => {
  it('fresh DB: only level-1 unlocked, the rest locked, totals reflect all 12 levels', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/map');
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ completed: 0, levels: 12, unlockedThroughOrder: 1 });

    const act1 = res.body.acts.find((a: { id: string }) => a.id === 'act-1');
    expect(act1.levelCount).toBe(7);
    expect(act1.completedCount).toBe(0);

    const act2 = res.body.acts.find((a: { id: string }) => a.id === 'act-2');
    expect(act2.levelCount).toBe(5);

    const level1 = act1.levels.find((l: { id: string }) => l.id === 'level-1');
    expect(level1.status).toBe('unlocked');
    expect(level1.missionCount).toBeGreaterThan(0);
    expect(level1.best).toBeNull();

    const level2 = act1.levels.find((l: { id: string }) => l.id === 'level-2');
    expect(level2.status).toBe('locked');
  });

  it('after a passing level-1 attempt, level-2 unlocks and act-1 progress reads 1/7', async () => {
    const { app } = makeApp();
    const { nodes, edges } = level1Solution();
    await request(app)
      .put('/api/v1/levels/level-1/design')
      .send({ nodes, edges, notes: [], revealedHintCount: 0 });
    await request(app).post('/api/v1/levels/level-1/attempts');

    const res = await request(app).get('/api/v1/map');
    const act1 = res.body.acts.find((a: { id: string }) => a.id === 'act-1');
    expect(act1.completedCount).toBe(1);
    expect(act1.levelCount).toBe(7);

    const level1 = act1.levels.find((l: { id: string }) => l.id === 'level-1');
    expect(level1.status).toBe('completed');
    expect(level1.best).toBeGreaterThanOrEqual(90);

    const level2 = act1.levels.find((l: { id: string }) => l.id === 'level-2');
    expect(level2.status).toBe('unlocked');

    expect(res.body.totals.completed).toBe(1);
    expect(res.body.totals.unlockedThroughOrder).toBe(2);
  });
});
