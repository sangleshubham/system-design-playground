/**
 * Enforces the design-graph invariants on write (data-model.md § Design, FR-005):
 *  - every node.componentId is a known catalog component,
 *  - no self-loop edges,
 *  - no duplicate (source, target) edge pairs,
 *  - edge endpoints reference existing nodes.
 * Throws a 400 ApiHttpError with a specific message on the first violation.
 */
import { badRequest } from '../http/http-error.js';
import type { contentService } from './content.service.js';
import type { DesignGraph } from '../models/index.js';

export function validateDesignGraph(graph: DesignGraph, content: typeof contentService): void {
  const nodeIds = new Set<string>();
  for (const n of graph.nodes) {
    if (nodeIds.has(n.id)) {
      throw badRequest(`Duplicate node id "${n.id}".`);
    }
    nodeIds.add(n.id);
    if (!content.getComponentById(n.componentId)) {
      throw badRequest(`Unknown componentId "${n.componentId}" on node "${n.id}".`);
    }
  }

  const seenPairs = new Set<string>();
  for (const e of graph.edges) {
    if (e.sourceNodeId === e.targetNodeId) {
      throw badRequest('Self-connections are not allowed.');
    }
    if (!nodeIds.has(e.sourceNodeId) || !nodeIds.has(e.targetNodeId)) {
      throw badRequest(`Edge "${e.id}" references a node that does not exist.`);
    }
    const pair = `${e.sourceNodeId}->${e.targetNodeId}`;
    if (seenPairs.has(pair)) {
      throw badRequest('These nodes are already connected.');
    }
    seenPairs.add(pair);
  }
}
