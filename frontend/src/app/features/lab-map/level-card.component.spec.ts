import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LevelCardComponent } from './level-card.component';
import { ToastService } from '../../core/toast.service';
import type { MapLevelCard } from '../../core/models';

const lockedCard: MapLevelCard = {
  id: 'level-2',
  order: 2,
  title: 'The 3-Tier Web App',
  difficulty: 'easy',
  summary: 'Scale beyond a single server.',
  objectives: ['Load Balancer'],
  missionCount: 5,
  status: 'locked',
};

const unlockedCard: MapLevelCard = { ...lockedCard, id: 'level-1', order: 1, status: 'unlocked' };
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

  it('locked card does not navigate on click and shows an unlock toast instead', () => {
    const fixture = TestBed.createComponent(LevelCardComponent);
    fixture.componentRef.setInput('card', lockedCard);
    fixture.detectChanges();

    fixture.componentInstance.activate();

    expect(navigate).not.toHaveBeenCalled();
    const toast = TestBed.inject(ToastService);
    expect(toast.toasts()).toHaveLength(1);
    expect(toast.toasts()[0].message).toContain('Complete level 1');
  });

  it('unlocked card navigates to its playground route', () => {
    const fixture = TestBed.createComponent(LevelCardComponent);
    fixture.componentRef.setInput('card', unlockedCard);
    fixture.detectChanges();

    fixture.componentInstance.activate();

    expect(navigate).toHaveBeenCalledWith(['/playground', 'level-1']);
  });

  it('completed card renders a checkmark and the best score', () => {
    const fixture = TestBed.createComponent(LevelCardComponent);
    fixture.componentRef.setInput('card', completedCard);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Best: 97');
  });
});
