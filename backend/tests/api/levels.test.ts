import { describe, it, expect } from 'vitest';
import { makeApp, level1Solution, lastLevelId } from '../helpers.js';

describe('GET /api/v1/levels/:levelId', () => {
  it('returns the full level with a null design on a fresh DB', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/levels/level-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('level-1');
    expect(res.body.missions.length).toBeGreaterThan(0);
    expect(res.body.design).toBeNull();
  });

  it('a fresh workspace can open the LAST level by order (no unlock chain, feature 007)', async () => {
    const { api } = makeApp();
    const id = lastLevelId();
    const res = await api.get(`/api/v1/levels/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.design).toBeNull();
  });

  it('returns 404 for an unknown level', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/levels/level-999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});

describe('PUT /api/v1/levels/:levelId/design', () => {
  it('rejects a self-loop edge with 400 and a specific message', async () => {
    const { api } = makeApp();
    const res = await api
      .put('/api/v1/levels/level-1/design')
      .send({
        nodes: [{ id: 'a', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 }],
        edges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'a' }],
        notes: [],
        revealedHintCount: 0,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/self-connection/i);
  });

  it('rejects a duplicate edge pair with 400', async () => {
    const { api } = makeApp();
    const nodes = [
      { id: 'a', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 },
      { id: 'b', componentId: 'cdn', displayName: 'CDN', note: '', x: 1, y: 1 },
    ];
    const res = await api
      .put('/api/v1/levels/level-1/design')
      .send({
        nodes,
        edges: [
          { id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' },
          { id: 'e2', sourceNodeId: 'a', targetNodeId: 'b' },
        ],
        notes: [],
        revealedHintCount: 0,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/already connected/i);
  });

  it('rejects an unknown componentId with 400', async () => {
    const { api } = makeApp();
    const res = await api
      .put('/api/v1/levels/level-1/design')
      .send({
        nodes: [{ id: 'a', componentId: 'made-up', displayName: 'X', note: '', x: 0, y: 0 }],
        edges: [],
        notes: [],
        revealedHintCount: 0,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/unknown componentid/i);
  });

  it('saves a valid design and returns updatedAt; GET then returns it', async () => {
    const { api } = makeApp();
    const { nodes, edges } = level1Solution();
    const put = await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes, edges, notes: [], revealedHintCount: 1 });
    expect(put.status).toBe(200);
    expect(typeof put.body.updatedAt).toBe('string');

    const get = await api.get('/api/v1/levels/level-1');
    expect(get.body.design.nodes).toHaveLength(4);
    expect(get.body.design.edges).toHaveLength(3);
    expect(get.body.design.revealedHintCount).toBe(1);
  });

  it('a fresh workspace can save a design on the LAST level by order (feature 007)', async () => {
    const { api } = makeApp();
    const id = lastLevelId();
    const { nodes, edges } = level1Solution();
    const put = await api
      .put(`/api/v1/levels/${id}/design`)
      .send({ nodes, edges, notes: [], revealedHintCount: 0 });
    expect(put.status).toBe(200);
    expect(typeof put.body.updatedAt).toBe('string');

    const get = await api.get(`/api/v1/levels/${id}`);
    expect(get.body.design.nodes).toHaveLength(4);
  });
});
