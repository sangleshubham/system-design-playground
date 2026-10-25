import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LabMapPage } from './lab-map.page';
import { ContentApi } from '../../core/api/content.api';
import type { MapView } from '../../core/models';

const fixtureMap: MapView = {
  acts: [
    {
      id: 'act-1',
      order: 1,
      title: 'The Fundamentals',
      description: 'Master the building blocks.',
      completedCount: 1,
      levelCount: 2,
      levels: [
        {
          id: 'level-1',
          order: 1,
          title: 'The Static App',
          difficulty: 'easy',
          summary: 'Serve static content.',
          objectives: ['CDN'],
          missionCount: 4,
          status: 'completed',
          best: 100,
        },
        {
          id: 'level-2',
          order: 2,
          title: 'The 3-Tier Web App',
          difficulty: 'medium',
          summary: 'Scale the tiers.',
          objectives: ['Load Balancer'],
          missionCount: 5,
          status: 'unlocked',
        },
      ],
    },
    {
      id: 'act-2',
      order: 2,
      title: 'Async & Real-Time',
      description: 'Decouple with queues.',
      completedCount: 0,
      levelCount: 1,
      levels: [
        {
          id: 'level-8',
          order: 8,
          title: 'Chat System',
          difficulty: 'hard',
          summary: 'Real-time messaging.',
          objectives: ['WebSocket Server'],
          missionCount: 6,
          status: 'unlocked',
        },
      ],
    },
  ],
  totals: { completed: 1, levels: 3 },
};

function textOf(el: HTMLElement): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('LabMapPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LabMapPage],
      providers: [
        provideRouter([]),
        { provide: ContentApi, useValue: { getMap: () => of(fixtureMap) } },
      ],
    });
  });

  it('renders lab totals and per-act progress from a fixture map response', () => {
    const fixture = TestBed.createComponent(LabMapPage);
    fixture.detectChanges();
    const text = textOf(fixture.nativeElement);
    expect(text).toContain('1/3 completed');
    expect(text).toContain('1/2');
    expect(text).toContain('The Static App');
    expect(text).toContain('Chat System');
  });

  it('renders no locked/dimmed cards and no "unlocked" totals copy (feature 007)', () => {
    const fixture = TestBed.createComponent(LabMapPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.level-card.locked')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.level-card')).toHaveLength(3);
    expect(textOf(fixture.nativeElement)).not.toMatch(/unlocked/i);
  });

  it('search narrows the grid to matching level cards', () => {
    const fixture = TestBed.createComponent(LabMapPage);
    fixture.detectChanges();
    fixture.componentInstance.setSearch('chat');
    fixture.detectChanges();
    const text = textOf(fixture.nativeElement);
    expect(text).toContain('Chat System');
    expect(text).not.toContain('The Static App');
  });

  it('difficulty chip filter narrows the grid', () => {
    const fixture = TestBed.createComponent(LabMapPage);
    fixture.detectChanges();
    fixture.componentInstance.toggleDifficulty('hard');
    fixture.detectChanges();
    const text = textOf(fixture.nativeElement);
    expect(text).toContain('Chat System');
    expect(text).not.toContain('The Static App');
  });

  it('shows an empty-state message when nothing matches', () => {
    const fixture = TestBed.createComponent(LabMapPage);
    fixture.detectChanges();
    fixture.componentInstance.setSearch('nonexistent-query-xyz');
    fixture.detectChanges();
    const text = textOf(fixture.nativeElement);
    expect(text).toContain('No levels match');
  });
});
