import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, loadContent } from '../helpers.js';
import { contentService } from '../../src/services/content.service.js';

describe('GET /api/v1/progress', () => {
  it('fresh DB: nothing completed, no continue, level-1 recommended', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/progress');
    expect(res.status).toBe(200);
    expect(res.body.lab).toEqual({ completed: 0, levels: 12, percent: 0 });
    expect(res.body.continue).toBeNull();
    expect(res.body.recommendedNext).toEqual({ levelId: 'level-1', title: expect.any(String) });
  });

  it('after touching + saving a level, continue points at it with the design timestamp', async () => {
    const { app } = makeApp();
    // Opening the level touches the resume pointer; saving creates the design (updatedAt).
    await request(app).get('/api/v1/levels/level-1');
    const save = await request(app)
      .put('/api/v1/levels/level-1/design')
      .send({ nodes: [], edges: [], notes: [], revealedHintCount: 0 });

    const res = await request(app).get('/api/v1/progress');
    expect(res.body.continue).toEqual({
      levelId: 'level-1',
      title: expect.any(String),
      updatedAt: save.body.updatedAt,
    });
    // Not completed yet, so level-1 is still the recommended next.
    expect(res.body.recommendedNext.levelId).toBe('level-1');
  });

  it('all levels complete: 100%, no recommended next', async () => {
    loadContent();
    const { app, db } = makeApp();
    const allIds = contentService.getLevels().map((l) => l.id);
    db.progress.save({
      completedLevelIds: allIds,
      unlockedThroughOrder: allIds.length + 1,
      lastTouchedLevelId: null,
    });

    const res = await request(app).get('/api/v1/progress');
    expect(res.body.lab).toEqual({ completed: 12, levels: 12, percent: 100 });
    expect(res.body.recommendedNext).toBeNull();
  });
});
