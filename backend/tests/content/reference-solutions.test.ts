/**
 * Reference-solution harness (feature 007). Every shipped level must have a hand-authored
 * reference design in tests/content/solutions/<level-id>.json that the REAL scoring engine
 * passes with full marks on missions (bonus included), flow, topology and resilience.
 * This keeps level content solvable: a mission or rule that no sensible design can satisfy
 * fails here, with the failing findings printed for the content author.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { DesignEdgeSchema, DesignNodeSchema } from '../../src/models/index.js';
import { contentService } from '../../src/services/content.service.js';
import { validateDesignGraph } from '../../src/services/design-validation.js';
import { evaluateDesign, PASS_THRESHOLD } from '../../src/services/scoring/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOLUTIONS_DIR = join(HERE, 'solutions');

const SolutionSchema = z.object({
  nodes: z.array(DesignNodeSchema),
  edges: z.array(DesignEdgeSchema),
});

contentService.load();
const componentsById = new Map(contentService.getComponents().map((c) => [c.id, c]));
const levels = contentService.getLevels();

function solutionPath(levelId: string): string {
  return join(SOLUTIONS_DIR, `${levelId}.json`);
}

describe('reference solutions', () => {
  it('has no solution file for a level that does not exist', () => {
    const levelIds = new Set(levels.map((l) => l.id));
    const orphans = readdirSync(SOLUTIONS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .filter((id) => !levelIds.has(id));
    expect(orphans, 'solution files without a matching level').toEqual([]);
  });

  for (const level of levels) {
    it(`${level.id} (${level.title}): the reference design passes with full marks`, () => {
      const file = solutionPath(level.id);
      expect(existsSync(file), `missing reference solution ${file}`).toBe(true);

      const solution = SolutionSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
      expect(() => validateDesignGraph({ ...solution, notes: [] }, contentService)).not.toThrow();

      const result = evaluateDesign({
        level,
        nodes: solution.nodes,
        edges: solution.edges,
        componentsById,
      });

      const failing = result.feedback.flatMap((d) =>
        d.findings.filter((f) => !f.ok).map((f) => `  [${d.dimension} ${d.score}] ${f.message}`),
      );
      const report =
        `${level.id}: total ${result.total}, scores ${JSON.stringify(result.scores)}` +
        (failing.length ? `\nFailing findings:\n${failing.join('\n')}` : '');

      // Missions can cap at 100 without the bonus; the reference must satisfy bonus ones too.
      const unmetMissions = result.feedback
        .find((d) => d.dimension === 'missions')!
        .findings.filter((f) => !f.ok)
        .map((f) => f.message);
      expect(unmetMissions, report).toEqual([]);
      expect(result.scores.missions, report).toBe(100);
      expect(result.scores.flow, report).toBe(100);
      expect(result.scores.topology, report).toBe(100);
      expect(result.scores.resilience, report).toBe(100);
      expect(result.total, report).toBeGreaterThanOrEqual(PASS_THRESHOLD);
      expect(result.passed, report).toBe(true);
    });
  }
});
