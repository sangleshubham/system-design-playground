import { describe, it, expect } from 'vitest';
import { scoreEfficiency } from '../../src/services/scoring/efficiency.rule.js';
import { edge, graph, level, node } from './fixtures.js';
import type { Level } from '../../src/models/index.js';

// level-1: budgetPerHr 3.00, latencyTargetMs 300
const level1 = level('level-1');

describe('efficiency.rule (level-1)', () => {
  it('within budget: cost finding is ok and echoes both figures', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const r = scoreEfficiency(
      level1,
      graph(level1, [client, cdn, web], [edge(client, cdn), edge(cdn, web)]),
    );
    const cost = r.findings[0];
    expect(cost.ok).toBe(true);
    expect(cost.message).toContain('$3.00/hr');
    expect(cost.message).toMatch(/within/);
  });

  it('over budget: figures are echoed and the score drops', () => {
    const client = node('client');
    const llm1 = node('llm-inference', 'l1');
    const llm2 = node('llm-inference', 'l2');
    const r = scoreEfficiency(
      level1,
      graph(level1, [client, llm1, llm2], [edge(client, llm1), edge(client, llm2)]),
    );
    // cost = 5.00 > 3.00 budget
    expect(r.findings[0].ok).toBe(false);
    expect(r.findings[0].message).toContain('$5.00/hr');
    expect(r.findings[0].message).toContain('$3.00/hr');
    expect(r.findings[0].message).toMatch(/exceeds/);
    expect(r.score).toBeLessThan(100);
  });

  it('within latency target: latency finding is ok', () => {
    const client = node('client');
    const cdn = node('cdn');
    const web = node('web-server');
    const r = scoreEfficiency(
      level1,
      graph(level1, [client, cdn, web], [edge(client, cdn), edge(cdn, web)]),
    );
    expect(r.score).toBe(100);
    expect(r.findings[1].ok).toBe(true);
    expect(r.findings[1].message).toContain('300ms');
  });

  it('over latency target (within budget): latency finding echoes the figures', () => {
    const client = node('client');
    const llm = node('llm-inference');
    const r = scoreEfficiency(level1, graph(level1, [client, llm], [edge(client, llm)]));
    // latency 800ms > 300ms target; cost 2.50 <= 3.00 budget
    expect(r.findings[0].ok).toBe(true);
    expect(r.findings[1].ok).toBe(false);
    expect(r.findings[1].message).toContain('800ms');
    expect(r.findings[1].message).toContain('300ms');
    expect(r.score).toBeLessThan(100);
  });

  it('no latency target: score is cost-only with a single finding', () => {
    const noTarget: Level = {
      ...level1,
      specs: { ...level1.specs, latencyTargetMs: undefined },
    };
    const client = node('client');
    const cdn = node('cdn');
    const r = scoreEfficiency(noTarget, graph(noTarget, [client, cdn], [edge(client, cdn)]));
    expect(r.findings).toHaveLength(1);
    expect(r.score).toBe(100);
  });
});
