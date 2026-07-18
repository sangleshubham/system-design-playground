import { describe, it, expect } from 'vitest';
import {
  buildReviewPrompt,
  SYSTEM_PROMPT,
  MAX_NODES,
} from '../../src/services/ai/review-prompt.js';
import { DesignTooLargeError } from '../../src/services/ai/errors.js';
import { componentsById, level, node, edge } from '../scoring/fixtures.js';
import type { DesignEdge, DesignNode } from '../../src/models/index.js';

const level1 = level('level-1');
const comps = componentsById();

function smallDesign(): { nodes: DesignNode[]; edges: DesignEdge[] } {
  const client = node('client', 'n1', 'Client');
  const web = node('web-server', 'n2', 'Web Server');
  const blob = node('blob-storage', 'n3', 'Blob Storage');
  return { nodes: [client, web, blob], edges: [edge(client, web), edge(web, blob)] };
}

describe('buildReviewPrompt', () => {
  it('emits a [system, user] message pair with the byte-stable system rubric first', () => {
    const { nodes, edges } = smallDesign();
    const messages = buildReviewPrompt({ level: level1, nodes, edges, componentsById: comps });
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe('system');
    expect(messages[0]!.content).toBe(SYSTEM_PROMPT);
    expect(messages[1]!.role).toBe('user');
  });

  it('keeps the system message byte-identical across different levels and designs (R9)', () => {
    const a = buildReviewPrompt({ ...smallDesign(), level: level1, componentsById: comps });
    const b = buildReviewPrompt({
      level: level('level-2'),
      nodes: [node('client', 'x1', 'C')],
      edges: [],
      componentsById: comps,
    });
    expect(a[0]!.content).toBe(b[0]!.content);
  });

  it('names all five AI dimensions in the system rubric', () => {
    for (const dim of ['requirements-fit', 'scalability', 'reliability', 'efficiency', 'operability']) {
      expect(SYSTEM_PROMPT).toContain(dim);
    }
  });

  it('orders the user message with the level question BEFORE the design (R9)', () => {
    const { nodes, edges } = smallDesign();
    const user = buildReviewPrompt({ level: level1, nodes, edges, componentsById: comps })[1]!.content;
    const questionIdx = user.indexOf(level1.title);
    const designIdx = user.indexOf('# Learner design');
    expect(questionIdx).toBeGreaterThanOrEqual(0);
    expect(designIdx).toBeGreaterThan(questionIdx);
  });

  it('includes derived facts: node count and total cost/hr', () => {
    const { nodes, edges } = smallDesign();
    const user = buildReviewPrompt({ level: level1, nodes, edges, componentsById: comps })[1]!.content;
    expect(user).toContain(`Node count: ${nodes.length}`);
    const expectedCost = nodes
      .reduce((sum, n) => sum + (comps.get(n.componentId)?.costPerHr ?? 0), 0)
      .toFixed(2);
    expect(user).toContain(`Total cost: $${expectedCost}/hr`);
  });

  it('includes learner notes when present', () => {
    const client = node('client', 'n1', 'Client');
    client.note = 'entry point for all traffic';
    const user = buildReviewPrompt({
      level: level1,
      nodes: [client],
      edges: [],
      componentsById: comps,
    })[1]!.content;
    expect(user).toContain('entry point for all traffic');
  });

  it('throws DesignTooLargeError above the 200-node cap, before any token is spent', () => {
    const nodes: DesignNode[] = Array.from({ length: MAX_NODES + 1 }, (_, i) =>
      node('client', `n${i}`, `C${i}`),
    );
    expect(() => buildReviewPrompt({ level: level1, nodes, edges: [], componentsById: comps })).toThrow(
      DesignTooLargeError,
    );
  });

  it('accepts a design exactly at the cap', () => {
    const nodes: DesignNode[] = Array.from({ length: MAX_NODES }, (_, i) =>
      node('client', `n${i}`, `C${i}`),
    );
    expect(() =>
      buildReviewPrompt({ level: level1, nodes, edges: [], componentsById: comps }),
    ).not.toThrow();
  });
});
