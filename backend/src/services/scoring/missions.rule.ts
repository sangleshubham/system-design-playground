/**
 * Missions dimension: fraction of required missions satisfied (×100), with bonus missions
 * adding up to +10 (capped at 100). Reuses the shared mission semantics (SC-006).
 */
import type { Level } from '../../models/index.js';
import { evaluateMissions } from '../mission.service.js';
import type { ResolvedGraph, RuleResult } from './graph.js';

export function scoreMissions(level: Level, g: ResolvedGraph): RuleResult {
  const states = evaluateMissions(level.missions, { nodes: g.nodes, edges: g.edges });
  const satisfiedById = new Map(states.map((s) => [s.missionId, s.satisfied]));

  const required = level.missions.filter((m) => !m.bonus);
  const bonus = level.missions.filter((m) => m.bonus);

  const requiredSatisfied = required.filter((m) => satisfiedById.get(m.id)).length;
  const bonusSatisfied = bonus.filter((m) => satisfiedById.get(m.id)).length;

  const base = required.length === 0 ? 100 : (100 * requiredSatisfied) / required.length;
  const bonusPoints = bonus.length === 0 ? 0 : (10 * bonusSatisfied) / bonus.length;
  const score = Math.round(Math.min(100, base + bonusPoints));

  const findings = level.missions.map((m) => {
    const ok = satisfiedById.get(m.id) ?? false;
    const tag = m.bonus ? ' (bonus)' : '';
    return {
      ok,
      message: ok ? `${m.label}${tag} ✓` : `${m.label}${tag} — not yet satisfied`,
    };
  });
  findings.unshift({
    ok: requiredSatisfied === required.length,
    message: `${requiredSatisfied}/${required.length} required missions complete${
      bonus.length ? `, ${bonusSatisfied}/${bonus.length} bonus` : ''
    }.`,
  });

  return { score, findings };
}
