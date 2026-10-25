/**
 * Feature 007 level fields: `tips`, `resources`, `sourceUrl`. Resource/source URLs are
 * rendered as links, so only http(s) is accepted, and a level may not list a URL twice.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import { LevelSchema, ResourceSchema } from '../../src/models/index.js';
import { ContentError, ContentService } from '../../src/services/content.service.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(HERE, '../../content');

function shippedLevel1(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(CONTENT_DIR, 'levels/level-1.json'), 'utf8'));
}

const article = { title: 'An article', url: 'https://example.com/a', kind: 'article' };

describe('LevelSchema tips / resources / sourceUrl', () => {
  it('defaults tips and resources to [] and leaves sourceUrl undefined', () => {
    const raw = shippedLevel1();
    delete raw['tips'];
    delete raw['resources'];
    delete raw['sourceUrl'];
    const level = LevelSchema.parse(raw);
    expect(level.tips).toEqual([]);
    expect(level.resources).toEqual([]);
    expect(level.sourceUrl).toBeUndefined();
  });

  it('accepts tips, http(s) resources of every kind, and an https sourceUrl', () => {
    const kinds = ['article', 'video', 'paper', 'discussion', 'course'];
    const level = LevelSchema.parse({
      ...shippedLevel1(),
      tips: ['How do you avoid collisions?'],
      resources: kinds.map((kind, i) => ({ title: kind, url: `http://example.com/${i}`, kind })),
      sourceUrl: 'https://systemdesign.io/question/design-url-shortening-service-like-tinyurl',
    });
    expect(level.tips).toHaveLength(1);
    expect(level.resources.map((r) => r.kind)).toEqual(kinds);
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com/x', 'not a url', ''])(
    'rejects a resource url %j',
    (url) => {
      expect(ResourceSchema.safeParse({ ...article, url }).success).toBe(false);
    },
  );

  it('rejects a non-http(s) sourceUrl', () => {
    const result = LevelSchema.safeParse({ ...shippedLevel1(), sourceUrl: 'javascript:alert(1)' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown resource kind, an empty title, and an empty tip', () => {
    expect(ResourceSchema.safeParse({ ...article, kind: 'podcast' }).success).toBe(false);
    expect(ResourceSchema.safeParse({ ...article, title: '' }).success).toBe(false);
    expect(LevelSchema.safeParse({ ...shippedLevel1(), tips: [''] }).success).toBe(false);
  });
});

describe('ContentService resource validation', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  /** A copy of the shipped content with level-1 replaced by `level1` (only level). */
  function fixtureDir(level1: Record<string, unknown>): string {
    dir = mkdtempSync(join(tmpdir(), 'sdp-content-'));
    cpSync(join(CONTENT_DIR, 'components.json'), join(dir, 'components.json'));
    cpSync(join(CONTENT_DIR, 'acts.json'), join(dir, 'acts.json'));
    cpSync(join(CONTENT_DIR, 'levels'), join(dir, 'levels'), { recursive: true });
    writeFileSync(join(dir, 'levels/level-1.json'), JSON.stringify(level1));
    return dir;
  }

  it('loads a level with distinct resource urls', () => {
    const svc = new ContentService(
      fixtureDir({
        ...shippedLevel1(),
        resources: [article, { ...article, url: 'https://example.com/b' }],
      }),
    );
    svc.load();
    expect(svc.getLevelById('level-1')?.resources).toHaveLength(2);
  });

  it('rejects a duplicate resource url within a level, naming the file', () => {
    const svc = new ContentService(
      fixtureDir({ ...shippedLevel1(), resources: [article, { ...article, title: 'Again' }] }),
    );
    expect(() => svc.load()).toThrow(ContentError);
    expect(() => svc.load()).toThrow(/levels\/level-1\.json: duplicate resource url/);
  });

  it('rejects a javascript: resource url at load, naming the file and field', () => {
    const svc = new ContentService(
      fixtureDir({ ...shippedLevel1(), resources: [{ ...article, url: 'javascript:alert(1)' }] }),
    );
    expect(() => svc.load()).toThrow(/levels\/level-1\.json[\s\S]*resources\.0\.url/);
  });
});
