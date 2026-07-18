/**
 * Mission auto-check semantics — the SINGLE SOURCE OF TRUTH shared by the live checklist
 * (mirrored client-side) and the Missions scoring dimension (SC-006). Pure, no I/O.
 *
 *  - `add`     satisfied iff >= 1 node has that componentId.
 *  - `connect` satisfied iff >= 1 edge whose SOURCE node's componentId = fromComponentId
 *              and TARGET node's componentId = toComponentId. Matching is by component
 *              TYPE, so renamed nodes still count (FR-016).
 */
import type { DesignEdge, DesignNode, Mission } from '../models/index.js';

export interface DesignGraphInput {
  nodes: Pick<DesignNode, 'id' | 'componentId'>[];
  edges: Pick<DesignEdge, 'sourceNodeId' | 'targetNodeId'>[];
}

export interface MissionState {
  missionId: string;
  satisfied: boolean;
}

/** nodeId -> componentId */
export function componentByNodeId(design: DesignGraphInput): Map<string, string> {
  return new Map(design.nodes.map((n) => [n.id, n.componentId]));
}

function hasComponent(design: DesignGraphInput, componentId: string): boolean {
  return design.nodes.some((n) => n.componentId === componentId);
}

function hasConnection(design: DesignGraphInput, from: string, to: string): boolean {
  const compOf = componentByNodeId(design);
  return design.edges.some(
    (e) => compOf.get(e.sourceNodeId) === from && compOf.get(e.targetNodeId) === to,
  );
}

export function isMissionSatisfied(mission: Mission, design: DesignGraphInput): boolean {
  if (mission.kind === 'add') {
    return hasComponent(design, mission.componentId);
  }
  return hasConnection(design, mission.fromComponentId, mission.toComponentId);
}

export function evaluateMissions(missions: Mission[], design: DesignGraphInput): MissionState[] {
  return missions.map((m) => ({ missionId: m.id, satisfied: isMissionSatisfied(m, design) }));
}
