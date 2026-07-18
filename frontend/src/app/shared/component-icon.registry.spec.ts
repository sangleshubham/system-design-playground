import { describe, it, expect } from 'vitest';
import type { Category } from '../core/models.js';
import { COMPONENT_ICONS, componentIconName } from './component-icon.registry.js';

const CATEGORIES: Category[] = [
  'user',
  'networking',
  'compute',
  'storage',
  'caching',
  'messaging',
  'services',
];

// The pre-existing icon.registry.ts keys (category icons + UI glyphs) as of before this
// feature's merge. COMPONENT_ICONS keys must never collide with any of these (contract § 7 #4).
const PRE_EXISTING_ICON_REGISTRY_KEYS = [
  'user',
  'networking',
  'compute',
  'storage',
  'caching',
  'messaging',
  'services',
  'lock',
  'play',
  'undo',
  'redo',
  'copy',
  'paste',
  'zoom-in',
  'zoom-out',
  'fit',
  'lock-canvas',
  'tidy',
  'fullscreen',
  'trash',
  'note',
  'check',
  'star',
  'search',
  'close',
  'plus',
  'back',
  'save',
  'refresh',
  'alert',
];

describe('component-icon.registry', () => {
  describe('fallback coverage (FR-007)', () => {
    for (const category of CATEGORIES) {
      it(`fallback-${category} exists and is a non-empty <svg> string`, () => {
        const key = `fallback-${category}`;
        const value = COMPONENT_ICONS[key];
        expect(value).toBeTruthy();
        expect(typeof value).toBe('string');
        expect(value.startsWith('<svg')).toBe(true);
      });

      it(`componentIconName falls back to fallback-${category} for an unknown id`, () => {
        expect(componentIconName('some-unknown-id', category)).toBe(`fallback-${category}`);
      });

      it(`componentIconName('nonsense', '${category}') returns fallback-${category}`, () => {
        expect(componentIconName('nonsense', category)).toBe(`fallback-${category}`);
      });
    }
  });

  describe('namespace safety', () => {
    it('no COMPONENT_ICONS key collides with a pre-existing icon.registry UI/category key', () => {
      const componentIconKeys = Object.keys(COMPONENT_ICONS);
      const preExisting = new Set(PRE_EXISTING_ICON_REGISTRY_KEYS);
      for (const key of componentIconKeys) {
        expect(preExisting.has(key)).toBe(false);
      }
    });
  });

  describe('component id vocabulary (contract § 7)', () => {
    const componentIds = Object.keys(COMPONENT_ICONS).filter(
      (k) => k.startsWith('aws-') || k.startsWith('tile-'),
    );

    it('has exactly 42 component ids (23 aws-* + 19 tile-*)', () => {
      expect(componentIds).toHaveLength(42);
    });

    it('completeness (FR-001): every component id resolves to a non-empty <svg> string', () => {
      for (const id of componentIds) {
        const value = COMPONENT_ICONS[id];
        expect(value).toBeTruthy();
        expect(typeof value).toBe('string');
        expect(value.startsWith('<svg')).toBe(true);
      }
    });

    it('uniqueness (FR-005): the 42 component SVG strings are pairwise distinct', () => {
      const values = componentIds.map((id) => COMPONENT_ICONS[id]);
      expect(new Set(values).size).toBe(42);
    });
  });

  describe('AWS entries (FR-001, FR-006)', () => {
    const awsIds = Object.keys(COMPONENT_ICONS).filter((k) => k.startsWith('aws-'));

    it('has exactly 23 aws-* ids', () => {
      expect(awsIds).toHaveLength(23);
    });

    it('every aws-* entry is a non-empty <svg> string', () => {
      for (const id of awsIds) {
        const value = COMPONENT_ICONS[id];
        expect(value).toBeTruthy();
        expect(typeof value).toBe('string');
        expect(value.startsWith('<svg')).toBe(true);
      }
    });

    it('the 23 aws-* SVG strings are pairwise distinct', () => {
      const values = awsIds.map((id) => COMPONENT_ICONS[id]);
      expect(new Set(values).size).toBe(23);
    });
  });

  describe('componentIconName resolver', () => {
    it('passes a known component id through unchanged', () => {
      expect(componentIconName('aws-s3', 'storage')).toBe('aws-s3');
    });

    for (const category of CATEGORIES) {
      it(`falls back to fallback-${category} for an unknown id (category: ${category})`, () => {
        expect(componentIconName('nonsense', category)).toBe(`fallback-${category}`);
      });
    }
  });
});
