/**
 * Efficiency dimension: cost vs budget, and (when a target is set) critical-path latency
 * vs the non-functional latency target. Overage scales the penalty; findings echo the
 * actual figures (FR-019). When both apply, the score is their average.
 */
import type { Level } from '../../models/index.js';
import {
  clientNodeIds,
  longestLatencyFrom,
  money,
  type ResolvedGraph,
  type RuleResult,
} from './graph.js';

function totalCost(g: ResolvedGraph): number {
  return g.nodes.reduce(
    (sum, n) => sum + (g.componentsById.get(n.componentId)?.costPerHr ?? 0),
    0,
  );
}

/** Max node-latency sum over any Client->sink path (0 if there is no Client). */
function criticalPathLatency(g: ResolvedGraph): number {
  const clients = clientNodeIds(g);
  if (clients.length === 0) return 0;
  const memo = new Map<string, number>();
  let worst = 0;
  for (const c of clients) {
    worst = Math.max(worst, longestLatencyFrom(g, c, memo, new Set()));
  }
  return worst;
}

export function scoreEfficiency(level: Level, g: ResolvedGraph): RuleResult {
  const budget = level.specs.budgetPerHr;
  const cost = totalCost(g);
  const costScore = cost <= budget ? 100 : Math.max(0, Math.round((100 * budget) / cost));
  const findings: RuleResult['findings'] = [
    {
      ok: cost <= budget,
      message:
        cost <= budget
          ? `Total cost ${money(cost)} is within the ${money(budget)} budget.`
          : `Total cost ${money(cost)} exceeds the ${money(budget)} budget.`,
    },
  ];

  const target = level.specs.latencyTargetMs;
  let score = costScore;
  if (target !== undefined) {
    const latency = criticalPathLatency(g);
    const latencyScore =
      latency <= target ? 100 : Math.max(0, Math.round((100 * target) / latency));
    findings.push({
      ok: latency <= target,
      message:
        latency <= target
          ? `Critical path latency ${latency}ms is within the ${target}ms target.`
          : `Critical path latency ${latency}ms exceeds the ${target}ms target.`,
    });
    score = Math.round((costScore + latencyScore) / 2);
  }

  return { score, findings };
}
