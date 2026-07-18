/**
 * Topology dimension: interpret the level's declarative structural rules.
 *  - forbidden-edge:   violated when a direct edge matches the component pair.
 *  - required-between: violated when a from->to PATH exists that bypasses `via`
 *                      (i.e. from can still reach to after removing all `via` nodes).
 * Start at 100 and lose an equal share per violated rule.
 */
import type { Level, TopologyRule } from '../../models/index.js';
import { reachableFrom, type ResolvedGraph, type RuleResult } from './graph.js';

function nodeIdsOf(g: ResolvedGraph, componentId: string): string[] {
  return g.nodes.filter((n) => n.componentId === componentId).map((n) => n.id);
}

function forbiddenEdgePresent(g: ResolvedGraph, from: string, to: string): boolean {
  return g.edges.some(
    (e) =>
      g.componentIdByNode.get(e.sourceNodeId) === from &&
      g.componentIdByNode.get(e.targetNodeId) === to,
  );
}

function bypassPathExists(g: ResolvedGraph, from: string, to: string, via: string): boolean {
  const fromIds = nodeIdsOf(g, from);
  const toIds = new Set(nodeIdsOf(g, to));
  if (fromIds.length === 0 || toIds.size === 0) return false;
  const blocked = new Set(nodeIdsOf(g, via));
  // A from-node that is itself a via-node cannot start a bypassing path.
  const starts = fromIds.filter((id) => !blocked.has(id));
  const reachable = reachableFrom(g, starts, blocked);
  for (const t of toIds) {
    if (reachable.has(t)) return true;
  }
  return false;
}

function isViolated(rule: TopologyRule, g: ResolvedGraph): boolean {
  if (rule.kind === 'forbidden-edge') {
    return forbiddenEdgePresent(g, rule.fromComponentId, rule.toComponentId);
  }
  return bypassPathExists(g, rule.fromComponentId, rule.toComponentId, rule.viaComponentId);
}

export function scoreTopology(level: Level, g: ResolvedGraph): RuleResult {
  const rules = level.topologyRules;
  if (rules.length === 0) {
    return { score: 100, findings: [{ ok: true, message: 'No structural constraints on this level.' }] };
  }
  const findings = rules.map((r) => {
    const violated = isViolated(r, g);
    return { ok: !violated, message: r.message };
  });
  const violations = findings.filter((f) => !f.ok).length;
  const score = Math.round((100 * (rules.length - violations)) / rules.length);
  return { score, findings };
}
