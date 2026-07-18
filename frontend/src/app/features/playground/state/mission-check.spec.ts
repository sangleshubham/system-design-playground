import { describe, it, expect } from 'vitest';
import { isMissionSatisfied } from './mission-check';
import type { DesignEdge, DesignNode, Mission } from '../../../core/models';

const node = (id: string, componentId: string): DesignNode => ({
  id,
  componentId,
  displayName: componentId,
  note: '',
  x: 0,
  y: 0,
});
const edge = (id: string, s: string, t: string): DesignEdge => ({
  id,
  sourceNodeId: s,
  targetNodeId: t,
});

describe('isMissionSatisfied', () => {
  const addMission: Mission = { id: 'a', kind: 'add', componentId: 'cdn', label: 'Add CDN' };
  const connectMission: Mission = {
    id: 'c',
    kind: 'connect',
    fromComponentId: 'client',
    toComponentId: 'cdn',
    label: 'Connect',
  };

  it('add: satisfied only when a node of that componentId exists', () => {
    expect(isMissionSatisfied(addMission, [], [])).toBe(false);
    expect(isMissionSatisfied(addMission, [node('n1', 'cdn')], [])).toBe(true);
  });

  it('connect: satisfied only for a matching directed edge', () => {
    const nodes = [node('n1', 'client'), node('n2', 'cdn')];
    expect(isMissionSatisfied(connectMission, nodes, [])).toBe(false);
    // wrong direction does not count
    expect(isMissionSatisfied(connectMission, nodes, [edge('e', 'n2', 'n1')])).toBe(false);
    expect(isMissionSatisfied(connectMission, nodes, [edge('e', 'n1', 'n2')])).toBe(true);
  });

  it('matches by component type, so renamed nodes still count (FR-016)', () => {
    const nodes = [
      { ...node('n1', 'client'), displayName: 'My Users' },
      { ...node('n2', 'cdn'), displayName: 'Edge' },
    ];
    expect(isMissionSatisfied(connectMission, nodes, [edge('e', 'n1', 'n2')])).toBe(true);
  });
});
