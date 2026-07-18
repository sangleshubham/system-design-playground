/**
 * Shared graph utilities for the scoring rules. All rules operate on a resolved graph
 * where each node carries its Component (for cost/latency) plus adjacency maps.
 */
import type { Component, DesignEdge, DesignNode, Level } from '../../models/index.js';

export interface RuleResult {
  score: number;
  findings: { ok: boolean; message: string }[];
}

export interface ScoreInput {
  level: Level;
  nodes: DesignNode[];
  edges: DesignEdge[];
  /** componentId -> Component (catalog lookup) */
  componentsById: Map<string, Component>;
}

export interface ResolvedGraph {
  nodes: DesignNode[];
  edges: DesignEdge[];
  componentsById: Map<string, Component>;
  /** nodeId -> componentId */
  componentIdByNode: Map<string, string>;
  /** nodeId -> outgoing neighbor nodeIds */
  out: Map<string, string[]>;
  /** nodeId -> incoming neighbor nodeIds */
  in: Map<string, string[]>;
}

export function resolveGraph(input: ScoreInput): ResolvedGraph {
  const componentIdByNode = new Map(input.nodes.map((n) => [n.id, n.componentId]));
  const out = new Map<string, string[]>();
  const inn = new Map<string, string[]>();
  for (const n of input.nodes) {
    out.set(n.id, []);
    inn.set(n.id, []);
  }
  for (const e of input.edges) {
    if (out.has(e.sourceNodeId)) out.get(e.sourceNodeId)!.push(e.targetNodeId);
    if (inn.has(e.targetNodeId)) inn.get(e.targetNodeId)!.push(e.sourceNodeId);
  }
  return {
    nodes: input.nodes,
    edges: input.edges,
    componentsById: input.componentsById,
    componentIdByNode,
    out,
    in: inn,
  };
}

export function nodesOfComponent(g: ResolvedGraph, componentId: string): DesignNode[] {
  return g.nodes.filter((n) => n.componentId === componentId);
}

export function clientNodeIds(g: ResolvedGraph): string[] {
  return g.nodes.filter((n) => n.componentId === 'client').map((n) => n.id);
}

/** Node ids reachable from any of `starts` following outgoing edges, excluding `blocked`. */
export function reachableFrom(
  g: ResolvedGraph,
  starts: string[],
  blocked: Set<string> = new Set(),
): Set<string> {
  const seen = new Set<string>();
  const queue: string[] = [];
  for (const s of starts) {
    if (!blocked.has(s) && !seen.has(s)) {
      seen.add(s);
      queue.push(s);
    }
  }
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of g.out.get(cur) ?? []) {
      if (!blocked.has(next) && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/**
 * Longest sum of node latencies along any path starting at `start`, treating the graph as
 * a DAG (a back-edge into the current path contributes 0, breaking cycles safely).
 */
export function longestLatencyFrom(
  g: ResolvedGraph,
  start: string,
  memo: Map<string, number>,
  stack: Set<string>,
): number {
  if (stack.has(start)) return 0;
  const cached = memo.get(start);
  if (cached !== undefined) return cached;
  const componentId = g.componentIdByNode.get(start);
  const selfLatency = componentId ? (g.componentsById.get(componentId)?.latencyMs ?? 0) : 0;
  stack.add(start);
  let best = 0;
  for (const next of g.out.get(start) ?? []) {
    best = Math.max(best, longestLatencyFrom(g, next, memo, stack));
  }
  stack.delete(start);
  const total = selfLatency + best;
  memo.set(start, total);
  return total;
}

export function money(n: number): string {
  return `$${n.toFixed(2)}/hr`;
}

/** Human label for a node in findings: its display name if renamed, else the component name. */
export function nodeLabel(g: ResolvedGraph, node: DesignNode): string {
  const comp = g.componentsById.get(node.componentId);
  const base = comp?.name ?? node.componentId;
  return node.displayName && node.displayName !== base ? `${node.displayName} (${base})` : base;
}
