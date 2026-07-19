import { describe, expect, it } from 'vitest';
import {
  KEY_LENGTH,
  formatKey,
  generateKey,
  hashKey,
  isValidShape,
  normalizeKey,
} from '../../src/auth/key.js';

describe('generateKey', () => {
  it('produces 12 characters from the Crockford alphabet (no I/L/O/U)', () => {
    for (let i = 0; i < 200; i++) {
      const key = generateKey();
      expect(key).toHaveLength(KEY_LENGTH);
      expect(key).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
      expect(key).not.toMatch(/[ILOU]/);
    }
  });

  it('produces distinct keys across a sample', () => {
    const sample = new Set(Array.from({ length: 500 }, () => generateKey()));
    expect(sample.size).toBe(500);
  });
});

describe('formatKey / normalizeKey round trip', () => {
  it('groups as XXXX-XXXX-XXXX (14 chars) and normalizes back to the same key', () => {
    const key = generateKey();
    const display = formatKey(key);
    expect(display).toHaveLength(14);
    expect(display).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(normalizeKey(display)).toBe(key);
  });
});

describe('normalizeKey', () => {
  it('uppercases and strips hyphens and whitespace', () => {
    expect(normalizeKey(' ab3k-9xq2 m7td ')).toBe('AB3K9XQ2M7TD');
  });

  it('applies Crockford aliases: O→0, I→1, L→1', () => {
    expect(normalizeKey('Ol0oIiLl')).toBe('01001111');
  });

  it('is idempotent', () => {
    const once = normalizeKey('ab3k-9xq2-m7td');
    expect(normalizeKey(once)).toBe(once);
  });
});

describe('isValidShape', () => {
  it('accepts every generated key after normalization', () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidShape(normalizeKey(formatKey(generateKey())))).toBe(true);
    }
  });

  it('rejects wrong lengths, excluded letters, and lowercase input', () => {
    expect(isValidShape('')).toBe(false);
    expect(isValidShape('AB3K9XQ2M7T')).toBe(false); // 11 chars
    expect(isValidShape('AB3K9XQ2M7TDX')).toBe(false); // 13 chars
    expect(isValidShape('UB3K9XQ2M7TD')).toBe(false); // U never valid
    expect(isValidShape('ab3k9xq2m7td')).toBe(false); // must be normalized first
  });
});

describe('hashKey', () => {
  it('is a deterministic hex SHA-256 and never echoes the key', () => {
    const key = generateKey();
    const hash = hashKey(key);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashKey(key));
    expect(hash).not.toContain(key);
  });

  it('differs for different keys', () => {
    expect(hashKey('AB3K9XQ2M7TD')).not.toBe(hashKey('AB3K9XQ2M7TE'));
  });
});
