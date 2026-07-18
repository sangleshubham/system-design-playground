import { describe, it, expect } from 'vitest';
import { scoreFlow } from '../../src/services/scoring/flow.rule.js';
import { edge, graph, level, node } from './fixtures.js';

const level1 = level('level-1');

describe('flow.rule', () => {
  it('empty canvas scores 0', () => {
    const r = scoreFlow(graph(level1, [], []));
    expect(r.score).toBe(0);
  });

  it('nodes but no Client scores 0 with a clear finding', () => {
    const cdn = node('cdn');
    const web = node('web-server');
    const r = scoreFlow(graph(level1, [cdn, web], [edge(cdn, web)]));
    expect(r.score).toBe(0);
    expect(r.findings.some((f) => /Client/i.test(f.message))).toBe(true);
  });

  it('a lone Client (no downstream) scores 100', () => {
    const client = node('client');
    const r = scoreFlow(graph(level1, [client], []));
    expect(r.score).toBe(100);
  });

  it('all components reachable from the Client scores 100', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const r = scoreFlow(graph(level1, [client, cdn, web], [edge(client, cdn), edge(cdn, web)]));
    expect(r.score).toBe(100);
  });

  it('an orphaned node is penalized and named in a finding', () => {
    const client = node('client');
    const cdn = node('cdn');
    const orphan = node('web-server', 'orphan');
    const r = scoreFlow(graph(level1, [client, cdn, orphan], [edge(client, cdn)]));
    expect(r.score).toBeLessThan(100);
    expect(r.findings.some((f) => !f.ok && /orphan/i.test(f.message))).toBe(true);
  });
});
