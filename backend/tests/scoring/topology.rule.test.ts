import { describe, it, expect } from 'vitest';
import { scoreTopology } from '../../src/services/scoring/topology.rule.js';
import { edge, graph, level, node } from './fixtures.js';
import type { Level } from '../../src/models/index.js';

// level-1 rules: forbidden-edge client->web-server, required-between via=cdn (client->web-server)
const level1 = level('level-1');

describe('topology.rule (level-1)', () => {
  it('a design with no topology rules scores 100', () => {
    const noRules: Level = { ...level1, topologyRules: [] };
    const client = node('client');
    const r = scoreTopology(noRules, graph(noRules, [client], []));
    expect(r.score).toBe(100);
  });

  it('a compliant design (client -> cdn -> web-server) scores 100', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const r = scoreTopology(
      level1,
      graph(level1, [client, cdn, web], [edge(client, cdn), edge(cdn, web)]),
    );
    expect(r.score).toBe(100);
  });

  it('a forbidden edge is penalized (isolated with a single-rule level)', () => {
    const onlyForbidden: Level = {
      ...level1,
      topologyRules: [
        {
          kind: 'forbidden-edge',
          fromComponentId: 'client',
          toComponentId: 'web-server',
          message: 'No direct Client → Web Server edge.',
        },
      ],
    };
    const client = node('client');
    const web = node('web-server');
    const violated = scoreTopology(onlyForbidden, graph(onlyForbidden, [client, web], [edge(client, web)]));
    expect(violated.score).toBe(0);
    expect(violated.findings.filter((f) => !f.ok)).toHaveLength(1);

    // Same rule, but the forbidden pair is absent -> 100.
    const cdn = node('cdn');
    const clean = scoreTopology(
      onlyForbidden,
      graph(onlyForbidden, [client, cdn, web], [edge(client, cdn), edge(cdn, web)]),
    );
    expect(clean.score).toBe(100);
  });

  it('a required-between bypass (client -> reverse-proxy -> web-server) is penalized', () => {
    const client = node('client');
    const proxy = node('reverse-proxy');
    const web = node('web-server');
    const r = scoreTopology(
      level1,
      graph(level1, [client, proxy, web], [edge(client, proxy), edge(proxy, web)]),
    );
    // required-between violated (bypasses cdn), forbidden-edge not present -> 50
    expect(r.score).toBe(50);
    expect(r.findings.some((f) => !f.ok && /CDN/i.test(f.message))).toBe(true);
  });

  it('both rules violated scores 0', () => {
    const client = node('client');
    const web = node('web-server');
    const r = scoreTopology(level1, graph(level1, [client, web], [edge(client, web)]));
    expect(r.score).toBe(0);
  });
});
