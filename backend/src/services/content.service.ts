/**
 * Loads and validates all JSON seed content (components, acts, levels) at startup.
 * Fails fast with a clear message naming the offending file/field so a bad seed can
 * never reach a request. See data-model.md § Content.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  ActSchema,
  ComponentSchema,
  LevelSchema,
  type Act,
  type Component,
  type Level,
} from '../models/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = process.env.CONTENT_DIR
  ? resolve(process.env.CONTENT_DIR)
  : resolve(HERE, '../../content');

export class ContentError extends Error {}

function formatZodError(file: string, error: z.ZodError): string {
  const lines = error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
  return `Invalid content in ${file}:\n${lines.join('\n')}`;
}

function readJson(file: string): unknown {
  const full = join(CONTENT_DIR, file);
  let raw: string;
  try {
    raw = readFileSync(full, 'utf8');
  } catch {
    throw new ContentError(`Content file not found: ${full}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new ContentError(`Content file is not valid JSON: ${file} (${(e as Error).message})`);
  }
}

function parseOrThrow<T>(schema: z.ZodType<T>, file: string, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ContentError(formatZodError(file, result.error));
  }
  return result.data;
}

class ContentService {
  private components: Component[] = [];
  private componentsById = new Map<string, Component>();
  private acts: Act[] = [];
  private actsById = new Map<string, Act>();
  private levels: Level[] = [];
  private levelsById = new Map<string, Level>();
  private levelsByOrder = new Map<number, Level>();
  private loaded = false;

  /** Idempotent: loads + validates every seed. Throws ContentError on any problem. */
  load(): void {
    if (this.loaded) return;

    // Components
    const components = parseOrThrow(
      z.array(ComponentSchema),
      'components.json',
      readJson('components.json'),
    );
    const seenComponentIds = new Set<string>();
    for (const c of components) {
      if (seenComponentIds.has(c.id)) {
        throw new ContentError(`Duplicate component id "${c.id}" in components.json`);
      }
      seenComponentIds.add(c.id);
    }

    // Acts
    const acts = parseOrThrow(z.array(ActSchema), 'acts.json', readJson('acts.json'));
    const seenActIds = new Set<string>();
    for (const a of acts) {
      if (seenActIds.has(a.id)) {
        throw new ContentError(`Duplicate act id "${a.id}" in acts.json`);
      }
      seenActIds.add(a.id);
    }

    // Levels: one file per level under levels/
    const levelsDir = join(CONTENT_DIR, 'levels');
    let levelFiles: string[];
    try {
      levelFiles = readdirSync(levelsDir)
        .filter((f) => f.endsWith('.json'))
        .sort();
    } catch {
      throw new ContentError(`Levels directory not found: ${levelsDir}`);
    }
    if (levelFiles.length === 0) {
      throw new ContentError(`No level files found in ${levelsDir}`);
    }

    const levels: Level[] = [];
    for (const file of levelFiles) {
      const rel = join('levels', file);
      const level = parseOrThrow(LevelSchema, rel, readJson(rel));
      this.validateLevelReferences(rel, level, seenComponentIds, seenActIds);
      levels.push(level);
    }

    // Order must be unique and contiguous from 1 (defines the unlock chain — FR-024).
    const orders = levels.map((l) => l.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        throw new ContentError(
          `Level orders must be unique and contiguous starting at 1; got [${orders.join(', ')}]`,
        );
      }
    }
    const seenLevelIds = new Set<string>();
    for (const l of levels) {
      if (seenLevelIds.has(l.id)) {
        throw new ContentError(`Duplicate level id "${l.id}"`);
      }
      seenLevelIds.add(l.id);
    }

    // Commit
    this.components = components;
    this.componentsById = new Map(components.map((c) => [c.id, c]));
    this.acts = acts.slice().sort((a, b) => a.order - b.order);
    this.actsById = new Map(acts.map((a) => [a.id, a]));
    this.levels = levels.slice().sort((a, b) => a.order - b.order);
    this.levelsById = new Map(levels.map((l) => [l.id, l]));
    this.levelsByOrder = new Map(levels.map((l) => [l.order, l]));
    this.loaded = true;
  }

  private validateLevelReferences(
    file: string,
    level: Level,
    componentIds: Set<string>,
    actIds: Set<string>,
  ): void {
    const requireComponent = (id: string, where: string) => {
      if (!componentIds.has(id)) {
        throw new ContentError(`${file}: ${where} references unknown componentId "${id}"`);
      }
    };

    if (!actIds.has(level.actId)) {
      throw new ContentError(`${file}: references unknown actId "${level.actId}"`);
    }

    for (const id of level.recommendedComponentIds) {
      requireComponent(id, `recommendedComponentIds`);
    }

    let nonBonusCount = 0;
    for (const m of level.missions) {
      if (!m.bonus) nonBonusCount++;
      if (m.kind === 'add') {
        requireComponent(m.componentId, `mission ${m.id}`);
      } else {
        requireComponent(m.fromComponentId, `mission ${m.id} (from)`);
        requireComponent(m.toComponentId, `mission ${m.id} (to)`);
      }
    }
    if (nonBonusCount === 0) {
      throw new ContentError(`${file}: at least one non-bonus mission is required`);
    }

    for (const r of level.topologyRules) {
      requireComponent(r.fromComponentId, `topology rule`);
      requireComponent(r.toComponentId, `topology rule`);
      if (r.kind === 'required-between') requireComponent(r.viaComponentId, `topology rule (via)`);
    }
    for (const r of level.resilienceRules) {
      requireComponent(r.componentId, `resilience rule`);
      if (r.kind === 'requires-companion') {
        requireComponent(r.companionComponentId, `resilience rule (companion)`);
      }
    }
  }

  getComponents(): Component[] {
    return this.components;
  }

  getComponentById(id: string): Component | undefined {
    return this.componentsById.get(id);
  }

  getActs(): Act[] {
    return this.acts;
  }

  getActById(id: string): Act | undefined {
    return this.actsById.get(id);
  }

  getLevels(): Level[] {
    return this.levels;
  }

  getLevelById(id: string): Level | undefined {
    return this.levelsById.get(id);
  }

  getLevelByOrder(order: number): Level | undefined {
    return this.levelsByOrder.get(order);
  }
}

export const contentService = new ContentService();
