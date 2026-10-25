import { describe, it, expect } from 'vitest';
import { makeApp, level1Solution } from '../helpers.js';
import { contentService } from '../../src/services/content.service.js';

describe('GET /api/v1/map', () => {
  it('fresh DB: every level is unlocked (feature 007), totals reflect all shipped levels', async () => {
    const { api } = makeApp();
    const levels = contentService.getLevels();
    const res = await api.get('/api/v1/map');
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ completed: 0, levels: levels.length });
    expect(res.body.acts.map((a: { id: string }) => a.id)).toEqual(
      contentService.getActs().map((a) => a.id),
    );

    const all = res.body.acts.flatMap((a: { levels: { status: string }[] }) => a.levels);
    expect(all).toHaveLength(levels.length);
    expect(all.every((l: { status: string }) => l.status === 'unlocked')).toBe(true);
    for (const act of res.body.acts) {
      const expected = levels.filter((l) => l.actId === act.id);
      expect(act.levelCount).toBe(expected.length);
      expect(act.levels.map((l: { id: string }) => l.id)).toEqual(expected.map((l) => l.id));
    }

    const act1 = res.body.acts.find((a: { id: string }) => a.id === 'act-1');
    expect(act1.completedCount).toBe(0);

    const level1 = act1.levels.find((l: { id: string }) => l.id === 'level-1');
    expect(level1.status).toBe('unlocked');
    expect(level1.missionCount).toBeGreaterThan(0);
    expect(level1.best).toBeNull();
  });

  it('after a passing level-1 attempt, level-1 is completed and act-1 progress updates', async () => {
    const { api } = makeApp();
    const { nodes, edges } = level1Solution();
    await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes, edges, notes: [], revealedHintCount: 0 });
    await api.post('/api/v1/levels/level-1/attempts');

    const res = await api.get('/api/v1/map');
    const act1 = res.body.acts.find((a: { id: string }) => a.id === 'act-1');
    expect(act1.completedCount).toBe(1);
    expect(act1.levelCount).toBe(
      contentService.getLevels().filter((l) => l.actId === act1.id).length,
    );

    const level1 = act1.levels.find((l: { id: string }) => l.id === 'level-1');
    expect(level1.status).toBe('completed');
    expect(level1.best).toBeGreaterThanOrEqual(90);

    const others = res.body.acts
      .flatMap((a: { levels: { id: string; status: string }[] }) => a.levels)
      .filter((l: { id: string }) => l.id !== 'level-1');
    expect(others.every((l: { status: string }) => l.status === 'unlocked')).toBe(true);

    expect(res.body.totals).toEqual({ completed: 1, levels: contentService.getLevels().length });
  });
});
