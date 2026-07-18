/**
 * Builds the two-message DeepSeek prompt (research R7). Ordering is mandated by R9/FR-014:
 * a byte-stable system rubric first, then the user message with the level question BEFORE
 * the serialized design, so DeepSeek's automatic prefix caching hits on repeat calls. The
 * SYSTEM_PROMPT constant carries NO timestamps or per-call values — it must stay
 * byte-identical across every request.
 *
 * A design over the 200-node cap throws DesignTooLargeError before any token is spent.
 */
import type { Component, DesignEdge, DesignNode, Level } from '../../models/index.js';
import type { ChatMessage } from './deepseek.client.js';
import { DesignTooLargeError } from './errors.js';

export const MAX_NODES = 200;

/**
 * Byte-stable system message (rubric + exact JSON schema + real-world-comparison
 * instruction). Do NOT interpolate any per-call value here (R9).
 */
export const SYSTEM_PROMPT = `You are a principal software engineer grading a system-design exercise. A learner has built a design on a canvas for a specific level, and you must review it with rigor, fairness, and concrete, actionable feedback.

Score the design on exactly these five dimensions, each an integer 0-100:
- requirements-fit: how well the design satisfies the level's functional and non-functional requirements and constraints.
- scalability: how the design handles growth in load, data, and traffic (statelessness, horizontal scaling, partitioning, caching).
- reliability: fault tolerance and availability (redundancy, absence of single points of failure, failover, durability).
- efficiency: cost- and latency-effectiveness relative to the stated budget and latency targets.
- operability: how observable, deployable, and maintainable the system is in production.

Also compare the design against how production systems solve this class of problem. Name concrete, realistic reference architectures, patterns, and stacks — never fabricate vendors or products. Explain where the design matches real-world practice and where it diverges and why that matters.

Respond with a SINGLE JSON object and nothing else — no markdown, no code fences, no prose before or after. The object MUST match this exact schema:

{
  "score": <integer 0-100, overall>,
  "verdict": "<one-line summary>",
  "dimensions": [
    { "name": "requirements-fit", "score": <integer 0-100>, "comment": "<specific, actionable>" },
    { "name": "scalability", "score": <integer 0-100>, "comment": "<specific, actionable>" },
    { "name": "reliability", "score": <integer 0-100>, "comment": "<specific, actionable>" },
    { "name": "efficiency", "score": <integer 0-100>, "comment": "<specific, actionable>" },
    { "name": "operability", "score": <integer 0-100>, "comment": "<specific, actionable>" }
  ],
  "strengths": ["<at least two>", "..."],
  "gaps": ["<at least two>", "..."],
  "realWorldComparison": {
    "referenceArchitecture": "<how production systems solve this problem class>",
    "matches": ["<where the design mirrors reality>", "..."],
    "differences": ["<where it diverges and why it matters>", "..."]
  },
  "nextSteps": ["<at least one concrete improvement>", "..."]
}

Rules: include all five dimensions in the given order; every score is an integer 0-100; provide at least two strengths, at least two gaps, and at least one next step; keep comments concrete and tied to the specific design.`;

export interface BuildPromptArgs {
  level: Level;
  nodes: DesignNode[];
  edges: DesignEdge[];
  componentsById: Map<string, Component>;
}

/** Display label for a node: its display name if set, else the catalog component name. */
function nodeLabel(node: DesignNode, componentsById: Map<string, Component>): string {
  const name = node.displayName.trim();
  if (name) return name;
  return componentsById.get(node.componentId)?.name ?? node.componentId;
}

/** Total cost/hr — mirrors efficiency.rule.ts so the model sees the same figure the engine uses. */
function totalCostPerHr(nodes: DesignNode[], componentsById: Map<string, Component>): number {
  return nodes.reduce((sum, n) => sum + (componentsById.get(n.componentId)?.costPerHr ?? 0), 0);
}

function renderQuestion(level: Level): string {
  const s = level.specs;
  const lines: string[] = [];
  lines.push(`# Level: ${level.title} (difficulty: ${level.difficulty})`);
  lines.push('');
  lines.push('## Brief');
  lines.push(level.summary);
  lines.push('');
  lines.push(level.narrative);
  if (level.objectives.length > 0) {
    lines.push('');
    lines.push('## Objectives');
    for (const o of level.objectives) lines.push(`- ${o}`);
  }
  lines.push('');
  lines.push('## Functional requirements');
  for (const f of s.functional) lines.push(`- ${f}`);
  lines.push('');
  lines.push('## Non-functional requirements');
  for (const nf of s.nonFunctional) lines.push(`- ${nf}`);
  if (s.constraints.length > 0) {
    lines.push('');
    lines.push('## Constraints');
    for (const c of s.constraints) lines.push(`- ${c}`);
  }
  lines.push('');
  lines.push(`Budget: $${s.budgetPerHr.toFixed(2)}/hr`);
  if (s.latencyTargetMs !== undefined) lines.push(`Latency target: ${s.latencyTargetMs}ms`);
  lines.push(`Key tradeoff: ${s.tradeoff}`);
  if (s.bonus) lines.push(`Bonus goal: ${s.bonus}`);

  const required = level.missions.filter((m) => !m.bonus);
  const bonus = level.missions.filter((m) => m.bonus);
  if (required.length > 0) {
    lines.push('');
    lines.push('## Required missions');
    for (const m of required) lines.push(`- ${m.label}`);
  }
  if (bonus.length > 0) {
    lines.push('');
    lines.push('## Bonus missions');
    for (const m of bonus) lines.push(`- ${m.label}`);
  }
  return lines.join('\n');
}

function renderDesign(args: BuildPromptArgs): string {
  const { nodes, edges, componentsById } = args;
  const lines: string[] = [];
  lines.push('# Learner design');
  lines.push('');
  lines.push('## Components');
  for (const n of nodes) {
    const comp = componentsById.get(n.componentId);
    const catalog = comp?.name ?? n.componentId;
    const tech = comp?.tech ?? 'unknown';
    const category = comp?.category ?? 'unknown';
    let line = `- ${nodeLabel(n, componentsById)} (catalog: ${catalog}, tech: ${tech}, category: ${category})`;
    const note = n.note.trim();
    if (note) line += ` — learner note: "${note}"`;
    lines.push(line);
  }

  lines.push('');
  lines.push('## Connections (directed)');
  if (edges.length === 0) {
    lines.push('- (none)');
  } else {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const e of edges) {
      const src = byId.get(e.sourceNodeId);
      const tgt = byId.get(e.targetNodeId);
      const from = src ? nodeLabel(src, componentsById) : e.sourceNodeId;
      const to = tgt ? nodeLabel(tgt, componentsById) : e.targetNodeId;
      lines.push(`- ${from} -> ${to}`);
    }
  }

  lines.push('');
  lines.push('## Derived facts');
  lines.push(`- Node count: ${nodes.length}`);
  lines.push(`- Total cost: $${totalCostPerHr(nodes, componentsById).toFixed(2)}/hr`);

  return lines.join('\n');
}

/** Assemble the [system, user] message pair. Throws DesignTooLargeError above MAX_NODES. */
export function buildReviewPrompt(args: BuildPromptArgs): ChatMessage[] {
  if (args.nodes.length > MAX_NODES) {
    throw new DesignTooLargeError();
  }
  const userContent = `${renderQuestion(args.level)}\n\n${renderDesign(args)}`;
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}
