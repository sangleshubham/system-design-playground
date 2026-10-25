import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LevelCardComponent } from './level-card.component';
import type { MapLevelCard } from '../../core/models';

const unlockedCard: MapLevelCard = {
  id: 'level-1',
  order: 1,
  title: 'The Static App',
  difficulty: 'easy',
  summary: 'Serve static content.',
  objectives: ['CDN'],
  missionCount: 4,
  status: 'unlocked',
};

/** A far-down level on a fresh workspace — still open (feature 007 removed the unlock chain). */
const lastCard: MapLevelCard = { ...unlockedCard, id: 'level-12', order: 12 };
const completedCard: MapLevelCard = { ...unlockedCard, status: 'completed', best: 97 };

describe('LevelCardComponent', () => {
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigate = vi.fn();
    TestBed.configureTestingModule({
      imports: [LevelCardComponent],
      providers: [{ provide: Router, useValue: { navigate } }],
    });
  });

  it('any uncompleted card navigates, however far down the order (no unlock chain)', () => {
    const fixture = TestBed.createComponent(LevelCardComponent);
    fixture.componentRef.setInput('card', lastCard);
    fixture.detectChanges();

    fixture.componentInstance.activate();

    expect(navigate).toHaveBeenCalledWith(['/playground', 'level-12']);
    const el = fixture.nativeElement.querySelector('.level-card') as HTMLElement;
    expect(el.getAttribute('aria-disabled')).toBeNull();
  });

  it('unlocked card navigates to its playground route', () => {
    const fixture = TestBed.createComponent(LevelCardComponent);
    fixture.componentRef.setInput('card', unlockedCard);
    fixture.detectChanges();

    fixture.componentInstance.activate();

    expect(navigate).toHaveBeenCalledWith(['/playground', 'level-1']);
  });

  it('completed card renders a checkmark and the best score, and still navigates', () => {
    const fixture = TestBed.createComponent(LevelCardComponent);
    fixture.componentRef.setInput('card', completedCard);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Best: 97');

    fixture.componentInstance.activate();
    expect(navigate).toHaveBeenCalledWith(['/playground', 'level-1']);
  });
});
