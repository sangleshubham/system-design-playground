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

  it('shows the Next-level CTA when passed and a next level (by order) exists', () => {
    const fixture = TestBed.createComponent(ResultsDialogComponent);
    fixture.componentRef.setInput('result', { ...result, passed: true, total: 100 });
    fixture.componentRef.setInput('nextLevelId', 'level-2');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Next level');
    expect(text).toContain('Level complete');

    let emitted: string | undefined;
    fixture.componentInstance.next.subscribe((id) => (emitted = id));
    fixture.componentInstance.onNext();
    expect(emitted).toBe('level-2');
  });

  it('hides the Next-level CTA on a fail, and on the last level even when passed', () => {
    const failed = TestBed.createComponent(ResultsDialogComponent);
    failed.componentRef.setInput('result', result);
    failed.componentRef.setInput('nextLevelId', 'level-2');
    failed.detectChanges();
    expect((failed.nativeElement as HTMLElement).textContent).not.toContain('Next level');

    const last = TestBed.createComponent(ResultsDialogComponent);
    last.componentRef.setInput('result', { ...result, passed: true, total: 100 });
    last.detectChanges();
    expect((last.nativeElement as HTMLElement).textContent).not.toContain('Next level');
  });
});
