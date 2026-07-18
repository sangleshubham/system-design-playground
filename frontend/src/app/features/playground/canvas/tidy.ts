/**
 * Auto-arrange ("tidy"): run a dagre layered layout over the design graph (left→right)
 * and return top-left positions per node id. The caller applies them as one undoable
 * store mutation (US2 scenario 6: connections are unchanged). See research.md R6.
 */
import dagre from '@dagrejs/dagre';
import type { DesignEdge, DesignNode } from '../../../core/models.js';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 68;

export function tidyLayout(
  nodes: DesignNode[],
  edges: DesignEdge[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 36, ranksep: 90, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    if (ids.has(e.sourceNodeId) && ids.has(e.targetNodeId)) {
      g.setEdge(e.sourceNodeId, e.targetNodeId);
    }
  }

  dagre.layout(g);

  for (const id of ids) {
    const node = g.node(id);
    if (node) {
      // dagre gives center coordinates; convert to top-left.
      positions.set(id, {
        x: Math.round(node.x - NODE_WIDTH / 2),
        y: Math.round(node.y - NODE_HEIGHT / 2),
      });
    }
  }
  return positions;
}
