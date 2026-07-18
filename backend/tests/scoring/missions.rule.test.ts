import { describe, it, expect } from 'vitest';
import { scoreMissions } from '../../src/services/scoring/missions.rule.js';
import { edge, graph, level, node } from './fixtures.js';

const level1 = level('level-1');

describe('missions.rule (level-1)', () => {
  it('empty canvas scores 0 and does not crash', () => {
    const r = scoreMissions(level1, graph(level1, [], []));
    expect(r.score).toBe(0);
    expect(r.findings.length).toBeGreaterThan(0);
  });

  it('all required missions satisfied scores 100', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const r = scoreMissions(
      level1,
      graph(level1, [client, cdn, web], [edge(client, cdn), edge(cdn, web)]),
    );
    expect(r.score).toBe(100);
  });

  it('partial completion scores between 0 and 100', () => {
    const client = node('client');
    const cdn = node('cdn');
    const r = scoreMissions(level1, graph(level1, [client, cdn], [edge(client, cdn)]));
    // 2 of 5 required (add client, add cdn, connect client->cdn) => 3/5 = 60
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
  });

  it('bonus mission adds points but is capped at 100', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const mon = node('monitoring');
    const withBonus = scoreMissions(
      level1,
      graph(level1, [client, cdn, web, mon], [edge(client, cdn), edge(cdn, web)]),
    );
    expect(withBonus.score).toBe(100);
  });

  it('renamed nodes still satisfy missions by component type (FR-016)', () => {
    const client = node('client', 'c', 'My Users');
    const cdn = node('cdn', 'x', 'Edge Cache');
    const web = node('web-server', 'w', 'Origin');
    const r = scoreMissions(
      level1,
      graph(level1, [client, cdn, web], [edge(client, cdn), edge(cdn, web)]),
    );
    expect(r.score).toBe(100);
  });
});
