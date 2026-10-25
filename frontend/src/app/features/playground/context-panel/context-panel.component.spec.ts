import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ContextPanelComponent } from './context-panel.component';
import { PlaygroundStore } from '../state/playground.store';
import type { Component, Level, Resource } from '../../../core/models';

const components: Component[] = [
  { id: 'client', name: 'Client', tech: 'Browser', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
  { id: 'cdn', name: 'CDN', tech: 'CloudFront', category: 'networking', description: '', costPerHr: 0.2, latencyMs: 15, icon: 'networking' },
];

const level = {
  id: 'level-1',
  actId: 'act-1',
  order: 1,
  title: 'The Static App',
  difficulty: 'easy',
  summary: '',
  narrative: 'Paragraph one.\n\nParagraph two.',
  objectives: ['CDN'],
  specs: { functional: ['serve pages'], nonFunctional: [], constraints: [], budgetPerHr: 3, capacity: [], tradeoff: 'edge vs freshness' },
  missions: [
    { id: 'm1', kind: 'add', componentId: 'client', label: 'Add Client' },
    { id: 'm2', kind: 'add', componentId: 'cdn', label: 'Add CDN' },
  ],
  topologyRules: [],
  resilienceRules: [],
  recommendedComponentIds: ['client', 'cdn'],
  hints: ['first hint', 'second hint'],
  tips: ['Consider cache invalidation.', 'Estimate peak traffic.'],
  resources: [],
} as unknown as Level;

describe('ContextPanelComponent', () => {
  let store: PlaygroundStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ContextPanelComponent], providers: [PlaygroundStore] });
    store = TestBed.inject(PlaygroundStore);
    store.setCatalog(components);
    store.hydrate(level, null);
  });

  it('renders the narrative and checks a mission off when the store satisfies it', () => {
    const fixture = TestBed.createComponent(ContextPanelComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.missionProgress().label).toBe('0/2');

    store.addNodeFromPalette('client', { x: 0, y: 0 });
    fixture.detectChanges();
    const m1 = fixture.componentInstance.missionStates().find((s) => s.mission.id === 'm1');
    expect(m1?.satisfied).toBe(true);
    expect(fixture.componentInstance.missionProgress().label).toBe('1/2');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paragraph one.');
    expect(text).toContain('1/2');
  });

  it('reveals hints one at a time', () => {
    const fixture = TestBed.createComponent(ContextPanelComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.revealedHints()).toEqual([]);
    fixture.componentInstance.revealHint();
    fixture.detectChanges();
    expect(fixture.componentInstance.revealedHints()).toEqual(['first hint']);
    expect(fixture.componentInstance.hasMoreHints()).toBe(true);
  });

  it('disables the AI Review button with a notice when the parent reports it unavailable (US3)', () => {
    const fixture = TestBed.createComponent(ContextPanelComponent);
    store.addNodeFromPalette('client', { x: 0, y: 0 }); // non-empty canvas isolates the availability check
    fixture.componentRef.setInput('aiAvailable', false);
    fixture.detectChanges();

    expect(fixture.componentInstance.aiReviewDisabled()).toBe(true);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.ai-review-btn');
    expect(button?.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "AI review isn't configured on this server.",
    );
  });

  it('leaves the AI Review button enabled by default while the canvas has components (US3)', () => {
    const fixture = TestBed.createComponent(ContextPanelComponent);
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    fixture.detectChanges();

    expect(fixture.componentInstance.aiReviewDisabled()).toBe(false);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.ai-review-btn');
    expect(button?.disabled).toBe(false);
  });

  function render(overrides: Partial<Level> = {}) {
    store.hydrate({ ...level, ...overrides }, null);
    const fixture = TestBed.createComponent(ContextPanelComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    return { fixture, root, tabs, panels };
  }

  it('defaults to Brief with labelled ARIA tabs and one tab stop', () => {
    const { root, tabs, panels } = render();
    expect(root.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Level context',
    );
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Brief', 'Read']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1]);
    for (const [index, tab] of tabs.entries()) {
      expect(tab.getAttribute('aria-controls')).toBe(panels[index].id);
      expect(panels[index].getAttribute('aria-labelledby')).toBe(tab.id);
    }
    expect(panels.map((panel) => panel.hidden)).toEqual([false, true]);
    expect(panels[0].textContent).toContain('The Challenge');
    expect(panels[0].textContent).toContain('Missions');
    expect(panels[0].textContent).toContain('Design Spec');
    expect(panels[0].textContent).toContain('Hints');
  });

  it('renders tips between Design Spec and Hints in Brief', () => {
    const { panels } = render();
    const headings = Array.from(panels[0].querySelectorAll('h3'));
    expect(headings.map((heading) => heading.textContent?.trim())).toEqual([
      'The Challenge',
      'Missions',
      'Design Spec',
      'Things to consider',
      'Hints (free)',
    ]);
    const tips = headings[3].parentElement?.querySelectorAll('li');
    expect(Array.from(tips ?? [], (tip) => tip.textContent)).toEqual(level.tips);
  });

  it('omits the tips section when there are no tips', () => {
    const { panels } = render({ tips: [] });
    expect(panels[0].textContent).not.toContain('Things to consider');
    expect(panels[0].textContent).toContain('Hints');
  });

  it('switches to Read and groups links by kind in the specified order', () => {
    const resources: Resource[] = [
      { kind: 'course', title: 'Design course', url: 'https://www.learn.example/course' },
      { kind: 'discussion', title: 'Design discussion', url: 'https://forum.example/thread' },
      { kind: 'paper', title: 'Design paper', url: 'https://papers.example/paper.pdf' },
      { kind: 'video', title: 'Design video', url: 'https://www.video.example/watch?v=1' },
      { kind: 'article', title: 'Design article', url: 'https://www.blog.example/post' },
      { kind: 'article', title: 'Another article', url: 'https://blog.example/another' },
    ];
    const { fixture, tabs, panels } = render({ resources });
    expect(tabs[1].querySelector('.chip')?.textContent?.trim()).toBe('6');
    tabs[1].click();
    fixture.detectChanges();

    expect(panels.map((panel) => panel.hidden)).toEqual([true, false]);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0]);
    expect(Array.from(panels[1].querySelectorAll('h3'), (h) => h.textContent)).toEqual([
      'Articles',
      'Videos',
      'Papers',
      'Discussions',
      'Courses',
    ]);
    const links = Array.from(panels[1].querySelectorAll<HTMLAnchorElement>('.resource a'));
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Design article',
      'Another article',
      'Design video',
      'Design paper',
      'Design discussion',
      'Design course',
    ]);
    for (const resource of resources) {
      const link = links.find((item) => item.textContent?.trim() === resource.title)!;
      expect(link.getAttribute('href')).toBe(resource.url);
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
      expect(link.parentElement?.querySelector('.resource-host')?.textContent).toBe(
        new URL(resource.url).hostname.replace(/^www\./, ''),
      );
      expect(link.closest('li')?.querySelector('app-icon svg')).not.toBeNull();
    }
  });

  it('renders a malformed resource URL with its title link and an empty host', () => {
    const { fixture, tabs, panels } = render({
      resources: [{ kind: 'article', title: 'Malformed link', url: 'not a url' }],
    });
    tabs[1].click();
    fixture.detectChanges();

    const link = panels[1].querySelector<HTMLAnchorElement>('.resource a')!;
    expect(link.textContent?.trim()).toBe('Malformed link');
    expect(link.getAttribute('href')).toBe('not a url');
    const host = panels[1].querySelector('.resource-host');
    expect(host).not.toBeNull();
    expect(host?.textContent).toBe('');
  });

  it('skips empty resource groups', () => {
    const { fixture, tabs, panels } = render({
      resources: [{ kind: 'paper', title: 'A paper', url: 'https://papers.example/paper' }],
    });
    tabs[1].click();
    fixture.detectChanges();
    expect(Array.from(panels[1].querySelectorAll('h3'), (h) => h.textContent)).toEqual(['Papers']);
    expect(panels[1].textContent).not.toContain('No reading list');
  });

  it('shows the empty reading state without a badge or source footer', () => {
    const { fixture, tabs, panels } = render({ resources: [] });
    tabs[1].click();
    fixture.detectChanges();
    expect(panels[1].textContent?.trim()).toBe('No reading list for this level yet.');
    expect(tabs[1].querySelector('.chip')).toBeNull();
    expect(panels[1].querySelector('.source-credit')).toBeNull();
  });

  it('credits sourceUrl even when the reading list is empty', () => {
    const sourceUrl = 'https://systemdesign.io/questions/static-app';
    const { fixture, tabs, panels } = render({ sourceUrl });
    tabs[1].click();
    fixture.detectChanges();
    const footer = panels[1].querySelector('footer')!;
    expect(footer.textContent?.replace(/\s+/g, ' ').trim()).toBe('Question from systemdesign.io');
    const link = footer.querySelector('a')!;
    expect(link.getAttribute('href')).toBe(sourceUrl);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('moves selection and focus with Left/Right, wrapping at either end', () => {
    const { fixture, tabs } = render();
    tabs[0].focus();
    for (const [from, to, key] of [
      [0, 1, 'ArrowRight'],
      [1, 0, 'ArrowRight'],
      [0, 1, 'ArrowLeft'],
      [1, 0, 'ArrowLeft'],
    ] as const) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      tabs[from].dispatchEvent(event);
      fixture.detectChanges();
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(tabs[to]);
      expect(tabs[to].getAttribute('aria-selected')).toBe('true');
      expect(tabs[to].tabIndex).toBe(0);
      expect(tabs[from].tabIndex).toBe(-1);
    }
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    tabs[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.activeTab()).toBe('brief');
  });

  it('resets to Brief when the level id changes and refreshes reading content', () => {
    const { fixture, tabs, panels } = render();
    tabs[1].click();
    fixture.detectChanges();
    store.hydrate(
      {
        ...level,
        id: 'level-2',
        tips: [],
        resources: [
          { kind: 'video', title: 'Next level video', url: 'https://video.example/next' },
        ],
      },
      null,
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab()).toBe('brief');
    expect(panels.map((panel) => panel.hidden)).toEqual([false, true]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].querySelector('.chip')?.textContent?.trim()).toBe('1');
    expect(panels[0].textContent).not.toContain('Things to consider');
    expect(panels[1].textContent).toContain('Next level video');
  });

  it('preserves the tab when the same level is hydrated again', () => {
    const { fixture, tabs } = render();
    tabs[1].click();
    fixture.detectChanges();
    store.hydrate({ ...level }, null);
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab()).toBe('read');
  });

  it('keeps AI Review visible and emits its event from Read', () => {
    const { fixture, root, tabs } = render();
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    let reviews = 0;
    fixture.componentInstance.aiReview.subscribe(() => reviews++);
    tabs[1].click();
    fixture.detectChanges();
    const button = root.querySelector<HTMLButtonElement>('.ai-review-btn')!;
    expect(button.closest('[role="tabpanel"]')).toBeNull();
    expect(button.disabled).toBe(false);
    button.click();
    expect(reviews).toBe(1);
  });
});
