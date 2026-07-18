import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ResultsDialogComponent } from './results-dialog.component';
import type { AttemptResult } from '../../../core/models';

const result: AttemptResult = {
  attemptId: 'a1',
  scores: { missions: 100, flow: 90, topology: 85, efficiency: 95, resilience: 70 },
  total: 89.5,
  passed: false,
  feedback: [
    {
      dimension: 'efficiency',
      score: 95,
      findings: [
        { ok: true, message: 'Total cost $4.20/hr is within the $6.00/hr budget.' },
        { ok: false, message: 'Critical path latency 260ms exceeds the 200ms target.' },
      ],
    },
  ],
};

describe('ResultsDialogComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ResultsDialogComponent] });
  });

  it('renders the total, dimension label, and findings from a fixture attempt', () => {
    const fixture = TestBed.createComponent(ResultsDialogComponent);
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('89.5');
    expect(text).toContain('Efficiency');
    expect(text).toContain('within the $6.00/hr budget');
    expect(text).toContain('exceeds the 200ms target');
  });

  it('shows the Next-level CTA only when passed with an unlocked level', () => {
    const fixture = TestBed.createComponent(ResultsDialogComponent);
    fixture.componentRef.setInput('result', { ...result, passed: true, total: 100, unlockedLevelId: 'level-2' });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Next level');
    expect(text).toContain('Level complete');
  });
});
