import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ComponentSchema } from '../../src/models/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_JSON_PATH = join(HERE, '../../content/components.json');

function loadShippedComponents(): unknown[] {
  return JSON.parse(readFileSync(COMPONENTS_JSON_PATH, 'utf8'));
}

/** Minimal valid Component object per the schema; tests vary only `icon`. */
function makeComponent(icon: string) {
  return {
    id: 'test-component',
    name: 'Test Component',
    tech: 'Test Tech',
    category: 'compute',
    description: 'A component used only for icon-id validation tests.',
    costPerHr: 0,
    latencyMs: 0,
    icon,
  };
}

describe('icon id content validation', () => {
  it('parses the shipped components.json against the icon-enum schema', () => {
    const raw = loadShippedComponents();
    const result = z.array(ComponentSchema).safeParse(raw);
    expect(result.success).toBe(true);
  });

  it('has 42 pairwise-distinct icon values across the shipped catalog', () => {
    const raw = loadShippedComponents();
    const components = z.array(ComponentSchema).parse(raw);
    expect(components).toHaveLength(42);
    const icons = components.map((c) => c.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('rejects a legacy category name ("storage") as an icon value', () => {
    const result = ComponentSchema.safeParse(makeComponent('storage'));
    expect(result.success).toBe(false);
  });

  it('rejects an unknown icon id', () => {
    const result = ComponentSchema.safeParse(makeComponent('not-a-real-icon'));
    expect(result.success).toBe(false);
  });
});
