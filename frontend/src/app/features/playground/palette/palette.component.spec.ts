import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PaletteComponent } from './palette.component';
import { PlaygroundStore } from '../state/playground.store';
import { COMPONENT_ICONS } from '../../../shared/component-icon.registry';
import type { Component, Level } from '../../../core/models';

const components: Component[] = [
  { id: 'client', name: 'Client', tech: 'Browser', category: 'user', description: 'the user', costPerHr: 0, latencyMs: 0, icon: 'user' },
  { id: 'cdn', name: 'CDN', tech: 'CloudFront', category: 'networking', description: 'edge cache', costPerHr: 0.2, latencyMs: 15, icon: 'networking' },
  { id: 'web-server', name: 'Web Server', tech: 'Node', category: 'compute', description: 'app tier', costPerHr: 0.4, latencyMs: 25, icon: 'compute' },
  { id: 'sql-database', name: 'SQL Database', tech: 'PostgreSQL', category: 'storage', description: 'db', costPerHr: 0.5, latencyMs: 20, icon: 'storage' },
  { id: 'cache', name: 'Cache', tech: 'Redis', category: 'caching', description: 'fast reads', costPerHr: 0.3, latencyMs: 2, icon: 'caching' },
  { id: 'message-queue', name: 'Message Queue', tech: 'Kafka', category: 'messaging', description: 'buffer', costPerHr: 0.5, latencyMs: 12, icon: 'messaging' },
  { id: 'monitoring', name: 'Monitoring', tech: 'Prometheus', category: 'services', description: 'metrics', costPerHr: 0.3, latencyMs: 50, icon: 'services' },
  { id: 'blob-storage', name: 'Blob Storage', tech: 'S3', category: 'storage', description: 'object storage', costPerHr: 0.1, latencyMs: 30, icon: 'aws-s3' },
  { id: 'mystery-box', name: 'Mystery Box', tech: 'Unknown', category: 'storage', description: 'unrecognized icon', costPerHr: 0.1, latencyMs: 10, icon: 'not-real' },
];

const level = {
  id: 'level-1',
  actId: 'act-1',
  order: 1,
  title: 'T',
  difficulty: 'easy',
  summary: '',
  narrative: '',
  objectives: [],
  specs: { functional: [], nonFunctional: [], constraints: [], budgetPerHr: 3, capacity: [], tradeoff: '' },
  missions: [{ id: 'm1', kind: 'add', componentId: 'client', label: 'Add Client' }],
  topologyRules: [],
  resilienceRules: [],
  recommendedComponentIds: ['client', 'cdn'],
  hints: [],
} as unknown as Level;

describe('PaletteComponent', () => {
  let store: PlaygroundStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PaletteComponent], providers: [PlaygroundStore] });
    store = TestBed.inject(PlaygroundStore);
    store.setCatalog(components);
    store.hydrate(level, null);
  });

  it('renders all seven category groups in "all" mode', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    fixture.componentInstance.mode.set('all');
    fixture.detectChanges();
    expect(fixture.componentInstance.groups()).toHaveLength(7);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Networking');
    expect(text).toContain('Storage');
  });

  it('recommended mode shows only recommended components with NEEDED badges', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    fixture.componentInstance.mode.set('recommended');
    fixture.detectChanges();
    const groups = fixture.componentInstance.groups();
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((c) => c.id).sort()).toEqual(['cdn', 'client']);
    expect(fixture.componentInstance.isNeeded('client')).toBe(true);
    expect(fixture.componentInstance.isNeeded('cache')).toBe(false);
  });

  it('search filters components by name/tech/category as you type', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    fixture.componentInstance.mode.set('all');
    fixture.componentInstance.search.set('redis');
    fixture.detectChanges();
    const groups = fixture.componentInstance.groups();
    const ids = groups.flatMap((g) => g.items.map((c) => c.id));
    expect(ids).toEqual(['cache']);
  });

  it('shows a metadata card (description, cost, latency) on hover', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    fixture.componentInstance.mode.set('all');
    fixture.detectChanges();
    const cache = components.find((c) => c.id === 'cache')!;
    fixture.componentInstance.hovered.set(cache);
    fixture.detectChanges();
    const card = document.querySelector('.metadata-card') as HTMLElement | null;
    expect(card).not.toBeNull();
    const text = card?.textContent ?? '';
    expect(text).toContain('fast reads');
    expect(text).toContain('$0.30/hr');
    expect(text).toContain('2ms');
  });

  it('toggles between recommended and all', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    const cmp = fixture.componentInstance;
    cmp.mode.set('recommended');
    cmp.toggleMode();
    expect(cmp.mode()).toBe('all');
    cmp.toggleMode();
    expect(cmp.mode()).toBe('recommended');
  });

  it('resolves a known catalog icon (aws-s3) through iconFor and renders that SVG in the DOM', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    fixture.componentInstance.mode.set('all');
    fixture.detectChanges();
    const blob = components.find((c) => c.id === 'blob-storage')!;
    expect(fixture.componentInstance.iconFor(blob)).toBe('aws-s3');

    // The rendered <app-icon> sanitizes COMPONENT_ICONS['aws-s3'] into an inner <span>'s
    // innerHTML. Rather than a brittle whole-string match (the browser/jsdom HTML parser may
    // re-serialize whitespace), assert the distinctive aws-s3 fill color (#7AA116, unique among
    // the registry's tiles) shows up in one of the palette's .pal-icon cells.
    expect(COMPONENT_ICONS['aws-s3']).toContain('#7AA116');
    const el = fixture.nativeElement as HTMLElement;
    const palIconHtml = Array.from(el.querySelectorAll('.pal-icon')).map((n) => n.innerHTML);
    expect(palIconHtml.some((html) => html.includes('#7AA116'))).toBe(true);
  });

  it('resolves an unknown catalog icon to fallback-<category> (FR-007)', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    fixture.componentInstance.mode.set('all');
    fixture.detectChanges();
    const mystery = components.find((c) => c.id === 'mystery-box')!;
    expect(fixture.componentInstance.iconFor(mystery)).toBe('fallback-storage');
  });

  it('no .pal-icon element carries a data-category attribute', () => {
    const fixture = TestBed.createComponent(PaletteComponent);
    fixture.componentInstance.mode.set('all');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const palIcons = Array.from(el.querySelectorAll('.pal-icon'));
    expect(palIcons.length).toBeGreaterThan(0);
    for (const icon of palIcons) {
      expect(icon.hasAttribute('data-category')).toBe(false);
    }
  });
});
