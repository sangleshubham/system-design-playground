/**
 * Workspace scoping & sharing contract suite (T017 US1 slice + T020 US3), covering
 * contracts/scoped-api-changes.md obligations 1, 2, 5 and spec FR-010:
 *   - association: a design saved with key A appears under A, not under a fresh key B;
 *   - isolation: two workspaces never observe each other's data on any list/get endpoint;
 *   - coexistence: the same level saved in both workspaces lives independently;
 *   - fresh-install parity: a new key's GET /map matches the pristine snapshot;
 *   - shared access (FR-010): a second client on the SAME key has full edit/delete rights.
 */
import { describe, it, expect } from 'vitest';
import { makeApp, mintWorkspace, authedApi, level1Solution } from '../helpers.js';

async function saveLevel1(api: ReturnType<typeof makeApp>['api']): Promise<void> {
  const { nodes, edges } = level1Solution();
  await api.put('/api/v1/levels/level-1/design').send({ nodes, edges, notes: [], revealedHintCount: 0 });
}

describe('workspace association (US1)', () => {
  it('a design saved with key A appears in A’s sandbox list; a fresh key B starts empty', async () => {
    const { app, db, api: a } = makeApp();
    const created = await a.post('/api/v1/sandbox/designs').send({ name: 'A-design' });
    expect(created.status).toBe(201);

    const aList = await a.get('/api/v1/sandbox/designs');
    expect(aList.body.map((d: { id: string }) => d.id)).toContain(created.body.id);

    const { api: b } = mintWorkspace(app, db);
    const bList = await b.get('/api/v1/sandbox/designs');
    expect(bList.status).toBe(200);
    expect(bList.body).toEqual([]);
  });
});

describe('workspace isolation (US3, obligations 1 & 5)', () => {
  it('B cannot observe A’s designs, attempts, progress, or reviews on any endpoint', async () => {
    const { app, db, api: a } = makeApp();

    // A builds up state: a sandbox design, a level design, an attempt, and progress.
    const sandbox = await a.post('/api/v1/sandbox/designs').send({ name: 'secret' });
    await saveLevel1(a);
    await a.post('/api/v1/levels/level-1/attempts'); // passes → completes level-1

    const { api: b } = mintWorkspace(app, db);

    // Sandbox list/get: invisible.
    expect((await b.get('/api/v1/sandbox/designs')).body).toEqual([]);
    expect((await b.get(`/api/v1/sandbox/designs/${sandbox.body.id}`)).status).toBe(404);

    // Level design: B's level-1 has no saved design.
    const bLevel = await b.get('/api/v1/levels/level-1');
    expect(bLevel.status).toBe(200);
    expect(bLevel.body.design).toBeNull();

    // Attempts: B has none.
    const bAttempts = await b.get('/api/v1/levels/level-1/attempts');
    expect(bAttempts.body.attempts).toEqual([]);
    expect(bAttempts.body.best).toBeNull();

    // Progress: B is a fresh install — level-1 is not completed for B (A's pass didn't leak).
    const bMap = await b.get('/api/v1/map');
    const bLevels = bMap.body.acts.flatMap((act: { levels: unknown[] }) => act.levels);
    const l1 = bLevels.find((l: { id: string }) => l.id === 'level-1');
    expect(l1.status).toBe('unlocked');
    expect(l1.best).toBeNull();
    expect(bMap.body.totals.completed).toBe(0);
  });

  it('a fresh key’s GET /map equals the fresh-install snapshot (obligation 5)', async () => {
    const { app, db, api: a } = makeApp();
    // A completes level-1 to diverge its own map.
    await saveLevel1(a);
    await a.post('/api/v1/levels/level-1/attempts');

    const pristine = await makeApp().api.get('/api/v1/map');
    const { api: b } = mintWorkspace(app, db);
    const bMap = await b.get('/api/v1/map');

    expect(bMap.body).toEqual(pristine.body);
  });

  it('the same level saved in two workspaces coexists (obligation 2)', async () => {
    const { app, db, api: a } = makeApp();
    const { api: b } = mintWorkspace(app, db);

    await saveLevel1(a);
    await b.put('/api/v1/levels/level-1/design').send({
      nodes: [{ id: 'x', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 }],
      edges: [],
      notes: [],
      revealedHintCount: 0,
    });

    const aDesign = (await a.get('/api/v1/levels/level-1')).body.design;
    const bDesign = (await b.get('/api/v1/levels/level-1')).body.design;
    expect(aDesign.nodes.length).toBe(4); // A's full solution
    expect(bDesign.nodes.length).toBe(1); // B's single node
    expect(aDesign.id).not.toBe(bDesign.id);
  });
});

describe('shared access — same key, full rights (FR-010, obligation on scoped-api-changes)', () => {
  it('a second client using the SAME key can edit and delete a design the first created', async () => {
    const { app, api: first } = makeApp();
    const created = await first.post('/api/v1/sandbox/designs').send({ name: 'shared' });
    const id = created.body.id;

    // Second person, same key → same workspace (no new workspace row).
    const second = authedApi(app, first.key);

    // Full edit rights.
    const edited = await second.put(`/api/v1/sandbox/designs/${id}`).send({
      nodes: [{ id: 'n', componentId: 'client', displayName: 'Client', note: '', x: 0, y: 0 }],
      edges: [],
      notes: [],
      name: 'renamed-by-second',
    });
    expect(edited.status).toBe(200);

    // The first client sees the second's edit.
    const seen = await first.get(`/api/v1/sandbox/designs/${id}`);
    expect(seen.body.name).toBe('renamed-by-second');
    expect(seen.body.nodes.length).toBe(1);

    // Full delete rights.
    const del = await second.delete(`/api/v1/sandbox/designs/${id}`);
    expect(del.status).toBe(204);
    expect((await first.get(`/api/v1/sandbox/designs/${id}`)).status).toBe(404);
  });
});
