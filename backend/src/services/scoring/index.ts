/**
 * Scoring engine entry point. Runs all five dimension rules, computes the weighted total
 * (Missions .30, Flow .20, Topology .20, Efficiency .15, Resilience .15), and assembles
 * the per-dimension feedback. Pure and fast (< 200 ms for a 50-node design).
 */
import type {
  Component,
  DesignEdge,
  DesignNode,
  DimensionFeedback,
  Level,
  Scores,
} from '../../models/index.js';
import { resolveGraph, type ScoreInput } from './graph.js';
import { scoreMissions } from './missions.rule.js';
import { scoreFlow } from './flow.rule.js';
import { scoreTopology } from './topology.rule.js';
import { scoreEfficiency } from './efficiency.rule.js';
import { scoreResilience } from './resilience.rule.js';

export const WEIGHTS = {
  missions: 0.3,
  flow: 0.2,
  topology: 0.2,
  efficiency: 0.15,
  resilience: 0.15,
} as const;

export const PASS_THRESHOLD = 90;

export interface EvaluationResult {
  scores: Scores;
  total: number;
  passed: boolean;
  feedback: DimensionFeedback[];
}

export interface EvaluateArgs {
  level: Level;
  nodes: DesignNode[];
  edges: DesignEdge[];
  componentsById: Map<string, Component>;
}

export function evaluateDesign(args: EvaluateArgs): EvaluationResult {
  const input: ScoreInput = {
    level: args.level,
    nodes: args.nodes,
    edges: args.edges,
    componentsById: args.componentsById,
  };
  const g = resolveGraph(input);

  const missions = scoreMissions(args.level, g);
  const flow = scoreFlow(g);
  const topology = scoreTopology(args.level, g);
  const efficiency = scoreEfficiency(args.level, g);
  const resilience = scoreResilience(args.level, g);

  const scores: Scores = {
    missions: missions.score,
    flow: flow.score,
    topology: topology.score,
    efficiency: efficiency.score,
    resilience: resilience.score,
  };

  const totalRaw =
    scores.missions * WEIGHTS.missions +
    scores.flow * WEIGHTS.flow +
    scores.topology * WEIGHTS.topology +
    scores.efficiency * WEIGHTS.efficiency +
    scores.resilience * WEIGHTS.resilience;
  const total = Math.round(totalRaw * 10) / 10;

  const feedback: DimensionFeedback[] = [
    { dimension: 'missions', score: missions.score, findings: missions.findings },
    { dimension: 'flow', score: flow.score, findings: flow.findings },
    { dimension: 'topology', score: topology.score, findings: topology.findings },
    { dimension: 'efficiency', score: efficiency.score, findings: efficiency.findings },
    { dimension: 'resilience', score: resilience.score, findings: resilience.findings },
  ];

  return { scores, total, passed: total >= PASS_THRESHOLD, feedback };
}
