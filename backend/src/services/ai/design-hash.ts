/**
 * Canonical design hash (data-model.md § designHash, research R5). Two designs that
 * describe the same architecture — regardless of node/edge ordering, canvas position,
 * or notes — produce the same sha256, so the review cache is content-addressed.
 *
 * Canonicalization:
 *   1. nodes → { componentId, displayName } sorted by node id (positions & notes excluded)
 *   2. edges → "sourceNodeId->targetNodeId" sorted lexically
 *   3. JSON.stringify({ nodes, edges }) → sha256 hex
 */
import { createHash } from 'node:crypto';
import type { DesignEdge, DesignNode } from '../../models/index.js';

export function designHash(nodes: DesignNode[], edges: DesignEdge[]): string {
  const canonicalNodes = nodes
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((n) => ({ componentId: n.componentId, displayName: n.displayName }));

  const canonicalEdges = edges
    .map((e) => `${e.sourceNodeId}->${e.targetNodeId}`)
    .sort();

  const canonical = JSON.stringify({ nodes: canonicalNodes, edges: canonicalEdges });
  return createHash('sha256').update(canonical).digest('hex');
}
