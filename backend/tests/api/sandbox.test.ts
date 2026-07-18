import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp } from '../helpers.js';

describe('Sandbox designs API', () => {
  it('create → 201 empty design, then appears in the list with a node count', async () => {
    const { app } = makeApp();

    const empty = await request(app).get('/api/v1/sandbox/designs');
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);

    const created = await request(app).post('/api/v1/sandbox/designs').send({ name: 'My Design' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      levelId: null,
      name: 'My Design',
      nodes: [],
      edges: [],
      notes: [],
    });
    expect(created.body.id).toBeTruthy();

    const list = await request(app).get('/api/v1/sandbox/designs');
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id: created.body.id, name: 'My Design', nodeCount: 0 });
  });

  it('create requires a non-empty name → 400', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/v1/sandbox/designs').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('update graph and rename; the list reflects the new name and node count', async () => {
    const { app } = makeApp();
    const created = await request(app).post('/api/v1/sandbox/designs').send({ name: 'Draft' });
    const id = created.body.id;

    const update = await request(app)
      .put(`/api/v1/sandbox/designs/${id}`)
      .send({
        name: 'Renamed',
        nodes: [{ id: 'n1', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 }],
        edges: [],
        notes: [],
      });
    expect(update.status).toBe(200);
    expect(update.body.updatedAt).toBeTruthy();

    const got = await request(app).get(`/api/v1/sandbox/designs/${id}`);
    expect(got.body.name).toBe('Renamed');
    expect(got.body.nodes).toHaveLength(1);

    const list = await request(app).get('/api/v1/sandbox/designs');
    expect(list.body[0]).toMatchObject({ name: 'Renamed', nodeCount: 1 });
  });

  it('rejects an invalid graph on update → 400 (unknown componentId)', async () => {
    const { app } = makeApp();
    const created = await request(app).post('/api/v1/sandbox/designs').send({ name: 'Draft' });
    const res = await request(app)
      .put(`/api/v1/sandbox/designs/${created.body.id}`)
      .send({
        nodes: [{ id: 'n1', componentId: 'nope', displayName: 'X', note: '', x: 0, y: 0 }],
        edges: [],
        notes: [],
      });
    expect(res.status).toBe(400);
  });

  it('delete → 204, then the design is gone', async () => {
    const { app } = makeApp();
    const created = await request(app).post('/api/v1/sandbox/designs').send({ name: 'Temp' });
    const id = created.body.id;

    const del = await request(app).delete(`/api/v1/sandbox/designs/${id}`);
    expect(del.status).toBe(204);

    const got = await request(app).get(`/api/v1/sandbox/designs/${id}`);
    expect(got.status).toBe(404);
  });

  it('unknown ids return 404 on get, update, and delete', async () => {
    const { app } = makeApp();
    expect((await request(app).get('/api/v1/sandbox/designs/missing')).status).toBe(404);
    expect(
      (
        await request(app)
          .put('/api/v1/sandbox/designs/missing')
          .send({ nodes: [], edges: [], notes: [] })
      ).status,
    ).toBe(404);
    expect((await request(app).delete('/api/v1/sandbox/designs/missing')).status).toBe(404);
  });
});
