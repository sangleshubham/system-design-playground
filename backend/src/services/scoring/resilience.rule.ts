/**
 * Resilience dimension: the level's declared redundancy rules drive the score.
 *  - no-spof:            requires >= 2 instances of a component.
 *  - requires-companion: if the component is present, a companion must exist AND be
 *                        connected to it by an edge (either direction).
 * The score is the fraction of declared rules satisfied. In addition, a generic
 * single-point-of-failure advisory finding is surfaced (it does not change the score).
 */
import type { Level, ResilienceRule } from '../../models/index.js';
import {
  clientNodeIds,
  nodeLabel,
  nodesOfComponent,
  reachableFrom,
  type ResolvedGraph,
  type RuleResult,
} from './graph.js';

function componentConnected(g: ResolvedGraph, aComp: string, bComp: string): boolean {
  return g.edges.some((e) => {
    const s = g.componentIdByNode.get(e.sourceNodeId);
    const t = g.componentIdByNode.get(e.targetNodeId);
    return (s === aComp && t === bComp) || (s === bComp && t === aComp);
  });
}

function ruleSatisfied(rule: ResilienceRule, g: ResolvedGraph): boolean {
  if (rule.kind === 'no-spof') {
    return nodesOfComponent(g, rule.componentId).length >= 2;
  }
  // requires-companion
  if (nodesOfComponent(g, rule.componentId).length === 0) return true; // vacuously ok
  const companionPresent = nodesOfComponent(g, rule.companionComponentId).length > 0;
  return companionPresent && componentConnected(g, rule.componentId, rule.companionComponentId);
}

/** Non-client nodes whose removal disconnects a client from a previously-reachable sink. */
function findGenericSpofs(g: ResolvedGraph): string[] {
  const clients = clientNodeIds(g);
  const nonClient = g.nodes.filter((n) => n.componentId !== 'client');
  if (clients.length === 0 || nonClient.length < 2) return [];

  const baseReachable = reachableFrom(g, clients);
  const sinks = [...baseReachable].filter(
    (id) => g.componentIdByNode.get(id) !== 'client' && (g.out.get(id)?.length ?? 0) === 0,
  );
  if (sinks.length === 0) return [];

  const spofs: string[] = [];
  for (const n of nonClient) {
    if (!baseReachable.has(n.id)) continue;
    const reachableWithout = reachableFrom(g, clients, new Set([n.id]));
    const disconnectsSink = sinks.some((s) => s !== n.id && !reachableWithout.has(s));
    if (disconnectsSink) spofs.push(n.id);
  }
  return spofs;
}

export function scoreResilience(level: Level, g: ResolvedGraph): RuleResult {
  const rules = level.resilienceRules;
  const findings: RuleResult['findings'] = [];

  let score = 100;
  if (rules.length > 0) {
    let satisfied = 0;
    for (const r of rules) {
      const ok = ruleSatisfied(r, g);
      if (ok) satisfied++;
      findings.push({ ok, message: r.message });
    }
    score = Math.round((100 * satisfied) / rules.length);
  } else {
    findings.push({ ok: true, message: 'No specific redundancy requirements on this level.' });
  }

  // Advisory-only SPOF note (does not affect the score).
  const spofIds = findGenericSpofs(g);
  if (spofIds.length > 0) {
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    const names = spofIds.map((id) => nodeLabel(g, byId.get(id)!));
    findings.push({
      ok: false,
      message: `Single point of failure: every request depends on ${names.join(
        ', ',
      )}. Consider adding redundancy.`,
    });
  } else if (g.nodes.length > 0) {
    findings.push({ ok: true, message: 'No single point of failure detected on the critical path.' });
  }

  return { score, findings };
}
