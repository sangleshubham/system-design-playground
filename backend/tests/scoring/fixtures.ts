/** Shared fixtures for the scoring rule tests, built against the real seeded levels. */
import { contentService } from '../../src/services/content.service.js';
import { resolveGraph, type ResolvedGraph } from '../../src/services/scoring/graph.js';
import type { Component, DesignEdge, DesignNode, Level } from '../../src/models/index.js';

contentService.load();

export function componentsById(): Map<string, Component> {
  return new Map(contentService.getComponents().map((c) => [c.id, c]));
}

export function level(id: string): Level {
  const l = contentService.getLevelById(id);
  if (!l) throw new Error(`missing test level ${id}`);
  return l;
}

let counter = 0;
export function node(componentId: string, id?: string, displayName?: string): DesignNode {
  const nid = id ?? `n${++counter}`;
  return { id: nid, componentId, displayName: displayName ?? componentId, note: '', x: 0, y: 0 };
}

export function edge(source: DesignNode, target: DesignNode, id?: string): DesignEdge {
  return { id: id ?? `${source.id}->${target.id}`, sourceNodeId: source.id, targetNodeId: target.id };
}

export function graph(lvl: Level, nodes: DesignNode[], edges: DesignEdge[]): ResolvedGraph {
  return resolveGraph({ level: lvl, nodes, edges, componentsById: componentsById() });
}
