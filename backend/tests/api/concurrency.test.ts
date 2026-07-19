/**
 * Optimistic-concurrency contract suite (T022, contracts/scoped-api-changes.md obligations
 * 3 & 4, research R6, SC-005). Covers both design save paths — PUT /levels/:id/design and
 * PUT /sandbox/designs/:id — for the `baseUpdatedAt` precondition:
 *   - a stale precondition → 409 stale_write carrying the winning `current` row;
 *   - resending with `current.updatedAt` → 200;
 *   - omitting `baseUpdatedAt` → 200 unconditionally;
 *   - a two-save race → the second 409s and the stored document equals the first save,
 *     never a blend.
 */
import { describe, it, expect } from 'vitest';
import { makeApp, level1Solution } from '../helpers.js';

const node = (id: string, componentId = 'client') => ({
  id,
  componentId,
  displayName: 'X',
  note: '',
  x: 0,
  y: 0,
});

describe('level design concurrency (PUT /levels/:id/design)', () => {
  it('stale baseUpdatedAt → 409 with current; resend with current.updatedAt → 200', async () => {
    const { api } = makeApp();
    const { nodes, edges } = level1Solution();

    const first = await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes, edges, notes: [], revealedHintCount: 0 });
    expect(first.status).toBe(200);
    const base = first.body.updatedAt;

    // A concurrent writer advances the row.
    const second = await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes: [node('a')], edges: [], notes: [], revealedHintCount: 0, baseUpdatedAt: base });
    expect(second.status).toBe(200);

    // Our stale save (still on `base`) is refused.
    const stale = await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes: [node('b')], edges: [], notes: [], revealedHintCount: 0, baseUpdatedAt: base });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('stale_write');
    expect(stale.body.current.updatedAt).toBe(second.body.updatedAt);
    expect(stale.body.current.nodes).toHaveLength(1);
    expect(stale.body.current.nodes[0].id).toBe('a'); // the winning writer's payload

    // Overwrite: resend using the current updatedAt as the new precondition.
    const overwrite = await api.put('/api/v1/levels/level-1/design').send({
      nodes: [node('b')],
      edges: [],
      notes: [],
      revealedHintCount: 0,
      baseUpdatedAt: stale.body.current.updatedAt,
    });
    expect(overwrite.status).toBe(200);
    const reloaded = await api.get('/api/v1/levels/level-1');
    expect(reloaded.body.design.nodes[0].id).toBe('b');
  });

  it('omitting baseUpdatedAt writes unconditionally (200)', async () => {
    const { api } = makeApp();
    await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes: [node('a')], edges: [], notes: [], revealedHintCount: 0 });
    const res = await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes: [node('b')], edges: [], notes: [], revealedHintCount: 0 });
    expect(res.status).toBe(200);
  });

  it('a two-save race from one base: the second 409s and the store is never a blend (SC-005)', async () => {
    const { api } = makeApp();
    const created = await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes: [node('base')], edges: [], notes: [], revealedHintCount: 0 });
    const base = created.body.updatedAt;

    const saveA = await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes: [node('a1'), node('a2')], edges: [], notes: [], revealedHintCount: 0, baseUpdatedAt: base });
    const saveB = await api
      .put('/api/v1/levels/level-1/design')
      .send({ nodes: [node('b1')], edges: [], notes: [], revealedHintCount: 0, baseUpdatedAt: base });

    expect(saveA.status).toBe(200);
    expect(saveB.status).toBe(409);

    // The stored document is exactly A's payload — not a merge of A and B.
    const stored = (await api.get('/api/v1/levels/level-1')).body.design;
    expect(stored.nodes.map((n: { id: string }) => n.id)).toEqual(['a1', 'a2']);
  });
});

describe('sandbox design concurrency (PUT /sandbox/designs/:id)', () => {
  it('stale baseUpdatedAt → 409 with current; resend with current.updatedAt → 200', async () => {
    const { api } = makeApp();
    const created = await api.post('/api/v1/sandbox/designs').send({ name: 'draft' });
    const id = created.body.id;
    const base = created.body.updatedAt;

    const advance = await api
      .put(`/api/v1/sandbox/designs/${id}`)
      .send({ nodes: [node('a')], edges: [], notes: [], baseUpdatedAt: base });
    expect(advance.status).toBe(200);

    const stale = await api
      .put(`/api/v1/sandbox/designs/${id}`)
      .send({ nodes: [node('b')], edges: [], notes: [], baseUpdatedAt: base });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('stale_write');
    expect(stale.body.current.updatedAt).toBe(advance.body.updatedAt);
    expect(stale.body.current.nodes[0].id).toBe('a');

    const overwrite = await api
      .put(`/api/v1/sandbox/designs/${id}`)
      .send({ nodes: [node('b')], edges: [], notes: [], baseUpdatedAt: stale.body.current.updatedAt });
    expect(overwrite.status).toBe(200);
  });

  it('omitting baseUpdatedAt writes unconditionally (200)', async () => {
    const { api } = makeApp();
    const created = await api.post('/api/v1/sandbox/designs').send({ name: 'draft' });
    const id = created.body.id;
    await api.put(`/api/v1/sandbox/designs/${id}`).send({ nodes: [node('a')], edges: [], notes: [] });
    const res = await api.put(`/api/v1/sandbox/designs/${id}`).send({ nodes: [node('b')], edges: [], notes: [] });
    expect(res.status).toBe(200);
  });
});
