/**
 * Flow dimension: graph reachability. Every non-Client node must be reachable from a
 * Client node; orphans are penalized and named. No Client at all scores 0.
 */
import {
  clientNodeIds,
  nodeLabel,
  reachableFrom,
  type ResolvedGraph,
  type RuleResult,
} from './graph.js';

export function scoreFlow(g: ResolvedGraph): RuleResult {
  const clients = clientNodeIds(g);
  const nonClient = g.nodes.filter((n) => n.componentId !== 'client');

  if (clients.length === 0) {
    if (g.nodes.length === 0) {
      return { score: 0, findings: [{ ok: false, message: 'The canvas is empty — start with a Client.' }] };
    }
    return {
      score: 0,
      findings: [
        { ok: false, message: 'No Client on the canvas — every request must originate from the user.' },
      ],
    };
  }

  if (nonClient.length === 0) {
    return {
      score: 100,
      findings: [{ ok: true, message: 'Add components downstream of the Client to build a flow.' }],
    };
  }

  const reachable = reachableFrom(g, clients);
  const orphans = nonClient.filter((n) => !reachable.has(n.id));
  const reachableCount = nonClient.length - orphans.length;
  const score = Math.round((100 * reachableCount) / nonClient.length);

  const findings: RuleResult['findings'] = [];
  if (orphans.length === 0) {
    findings.push({
      ok: true,
      message: `All ${nonClient.length} components are reachable from the Client.`,
    });
  } else {
    findings.push({
      ok: true,
      message: `${reachableCount}/${nonClient.length} components are wired into the flow.`,
    });
    for (const o of orphans) {
      findings.push({
        ok: false,
        message: `${nodeLabel(g, o)} is orphaned — nothing connects it to the Client's request path.`,
      });
    }
  }
  return { score, findings };
}
