import { describe, it, expect } from 'vitest';
import { ICONS } from './icon.registry';

// US3 + US5 (contract C5): the toolbar icons must exist and the fit/fullscreen glyphs must
// differ — the original bug was two near-identical corner-bracket SVGs that read as one glyph.
describe('icon registry', () => {
  it('defines the canvas-control entries fit, fullscreen, fullscreen-exit, key, check', () => {
    for (const name of ['fit', 'fullscreen', 'fullscreen-exit', 'key', 'check']) {
      expect(ICONS[name], `icon "${name}" should be registered`).toBeTruthy();
    }
  });

  it('renders the fit glyph distinctly from the fullscreen glyph (regression guard)', () => {
    expect(ICONS['fit']).not.toEqual(ICONS['fullscreen']);
  });

  it('every entry is a stroke-based <svg> from the shared helper', () => {
    for (const name of ['fit', 'fullscreen', 'fullscreen-exit', 'key']) {
      expect(ICONS[name]).toMatch(/^<svg /);
      expect(ICONS[name]).toContain('stroke="currentColor"');
    }
  });
});
