import { describe, it, expect } from 'vitest';
import { evaluateDesign, PASS_THRESHOLD, WEIGHTS } from '../../src/services/scoring/index.js';
import { componentsById, level } from './fixtures.js';
import { level1Solution } from '../helpers.js';

const level1 = level('level-1');
const catalog = componentsById();

describe('scoring total (level-1)', () => {
  it('empty canvas yields a valid low score and never crashes', () => {
    const r = evaluateDesign({ level: level1, nodes: [], edges: [], componentsById: catalog });
    expect(r.total).toBeLessThan(PASS_THRESHOLD);
    expect(r.passed).toBe(false);
    expect(r.feedback).toHaveLength(5);
  });

  it('the known level-1 solution scores 100 and passes', () => {
    const { nodes, edges } = level1Solution();
    const r = evaluateDesign({ level: level1, nodes, edges, componentsById: catalog });
    expect(r.scores).toEqual({
      missions: 100,
      flow: 100,
      topology: 100,
      efficiency: 100,
      resilience: 100,
    });
    expect(r.total).toBe(100);
    expect(r.passed).toBe(true);
  });

  it('the total is the correctly weighted mean of the five dimensions', () => {
    const { nodes, edges } = level1Solution();
    const r = evaluateDesign({ level: level1, nodes, edges, componentsById: catalog });
    const expected =
      r.scores.missions * WEIGHTS.missions +
      r.scores.flow * WEIGHTS.flow +
      r.scores.topology * WEIGHTS.topology +
      r.scores.efficiency * WEIGHTS.efficiency +
      r.scores.resilience * WEIGHTS.resilience;
    expect(r.total).toBeCloseTo(Math.round(expected * 10) / 10, 5);
  });

  it('weights sum to 1', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('pass requires total >= 90', () => {
    // Drop the blob-storage companion: resilience fails, total should fall below the gate.
    const { nodes, edges } = level1Solution();
    const trimmedNodes = nodes.filter((n) => n.componentId !== 'blob-storage');
    const trimmedEdges = edges.filter((e) => e.targetNodeId !== 'n4');
    const r = evaluateDesign({
      level: level1,
      nodes: trimmedNodes,
      edges: trimmedEdges,
      componentsById: catalog,
    });
    expect(r.scores.resilience).toBeLessThan(100);
    expect(r.passed).toBe(r.total >= 90);
  });
});
