import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { makeApp } from '../helpers.js';
import { ComponentSchema } from '../../src/models/index.js';
import { contentService } from '../../src/services/content.service.js';

describe('GET /api/v1/components', () => {
  it('returns 200 with the full 44-component catalog, each valid', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/components');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(44);
    for (const c of res.body) {
      expect(ComponentSchema.safeParse(c).success).toBe(true);
    }
  });

  it('covers all seven categories', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/components');
    const categories = new Set(res.body.map((c: { category: string }) => c.category));
    expect([...categories].sort()).toEqual(
      ['caching', 'compute', 'messaging', 'networking', 'services', 'storage', 'user'].sort(),
    );
  });
});

describe('content validation', () => {
  it('loads and validates every seed file without throwing', () => {
    expect(() => contentService.load()).not.toThrow();
    expect(contentService.getComponents().length).toBe(44);
    const levelFiles = readdirSync(new URL('../../content/levels/', import.meta.url))
      .filter((file) => file.endsWith('.json'));
    const acts = JSON.parse(
      readFileSync(new URL('../../content/acts.json', import.meta.url), 'utf8'),
    );
    expect(contentService.getLevels().length).toBe(levelFiles.length);
    expect(contentService.getActs().length).toBe(acts.length);
  });

  it('has unique, contiguous level orders starting at 1', () => {
    contentService.load();
    const orders = contentService
      .getLevels()
      .map((l) => l.order)
      .sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));
  });

  it('every recommended and mission componentId exists in the catalog', () => {
    contentService.load();
    for (const level of contentService.getLevels()) {
      for (const id of level.recommendedComponentIds) {
        expect(contentService.getComponentById(id), `${level.id} recommends ${id}`).toBeDefined();
      }
      for (const m of level.missions) {
        if (m.kind === 'add') {
          expect(contentService.getComponentById(m.componentId)).toBeDefined();
        } else {
          expect(contentService.getComponentById(m.fromComponentId)).toBeDefined();
          expect(contentService.getComponentById(m.toComponentId)).toBeDefined();
        }
      }
    }
  });
});
