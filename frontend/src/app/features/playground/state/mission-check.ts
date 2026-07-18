/**
 * Client-side mission-check semantics. This is the SECOND of exactly two homes for the
 * mission rules (the first is backend/src/services/mission.service.ts). They must stay
 * identical (SC-006) — any change updates both + both test suites. See data-model.md
 * § Mission.
 *
 *  - `add`     satisfied iff >= 1 node with that componentId.
 *  - `connect` satisfied iff >= 1 edge from a node of fromComponentId to a node of
 *              toComponentId (by component TYPE, so renamed nodes still count — FR-016).
 */
import type { DesignEdge, DesignNode, Mission } from '../../../core/models.js';

export function isMissionSatisfied(
  mission: Mission,
  nodes: DesignNode[],
  edges: DesignEdge[],
): boolean {
  if (mission.kind === 'add') {
    return nodes.some((n) => n.componentId === mission.componentId);
  }
  const compOf = new Map(nodes.map((n) => [n.id, n.componentId]));
  return edges.some(
    (e) =>
      compOf.get(e.sourceNodeId) === mission.fromComponentId &&
      compOf.get(e.targetNodeId) === mission.toComponentId,
  );
}
