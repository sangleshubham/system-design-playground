import { describe, it, expect } from 'vitest';
import { scoreResilience } from '../../src/services/scoring/resilience.rule.js';
import { edge, graph, level, node } from './fixtures.js';

const level1 = level('level-1'); // requires-companion web-server -> blob-storage
const level2 = level('level-2'); // no-spof web-server

describe('resilience.rule', () => {
  it('no-spof with a single instance fails the rule', () => {
    const client = node('client');
    const lb = node('load-balancer');
    const web = node('web-server');
    const db = node('sql-database');
    const r = scoreResilience(
      level2,
      graph(level2, [client, lb, web, db], [edge(client, lb), edge(lb, web), edge(web, db)]),
    );
    expect(r.score).toBe(0);
    expect(r.findings.some((f) => !f.ok)).toBe(true);
  });

  it('no-spof with two instances passes the rule', () => {
    const client = node('client');
    const lb = node('load-balancer');
    const web1 = node('web-server', 'w1');
    const web2 = node('web-server', 'w2');
    const db = node('sql-database');
    const r = scoreResilience(
      level2,
      graph(
        level2,
        [client, lb, web1, web2, db],
        [edge(client, lb), edge(lb, web1), edge(lb, web2), edge(web1, db), edge(web2, db)],
      ),
    );
    expect(r.score).toBe(100);
  });

  it('requires-companion satisfied when companion exists and is connected', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const blob = node('blob-storage');
    const r = scoreResilience(
      level1,
      graph(level1, [client, cdn, web, blob], [edge(client, cdn), edge(cdn, web), edge(web, blob)]),
    );
    expect(r.score).toBe(100);
  });

  it('requires-companion fails when the companion is missing', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const r = scoreResilience(
      level1,
      graph(level1, [client, cdn, web], [edge(client, cdn), edge(cdn, web)]),
    );
    expect(r.score).toBe(0);
    expect(r.findings.some((f) => !f.ok)).toBe(true);
  });

  it('requires-companion is vacuously satisfied when the component is absent', () => {
    const client = node('client');
    const cdn = node('cdn');
    const r = scoreResilience(level1, graph(level1, [client, cdn], [edge(client, cdn)]));
    expect(r.score).toBe(100);
  });

  it('surfaces a generic single-point-of-failure advisory without changing the score', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const blob = node('blob-storage');
    const r = scoreResilience(
      level1,
      graph(level1, [client, cdn, web, blob], [edge(client, cdn), edge(cdn, web), edge(web, blob)]),
    );
    // requires-companion satisfied -> score 100, but the linear chain still has SPOFs.
    expect(r.score).toBe(100);
    expect(r.findings.some((f) => /single point of failure/i.test(f.message))).toBe(true);
  });
});
