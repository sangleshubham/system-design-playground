import { describe, it, expect, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AiReviewPanelComponent } from './ai-review-panel.component';
import { AiReviewApi } from '../../../core/api/ai-review.api';
import type { AiReview, AiReviewGetResponse, AiReviewPostResponse } from '../../../core/models';

/** GET response with no stored review — the common "nothing cached yet" default. */
const NO_STORED_REVIEW: AiReviewGetResponse = {
  available: true,
  models: { default: 'deepseek-v4-flash', deep: 'deepseek-v4-pro' },
  review: null,
  stale: false,
};

const review: AiReview = {
  id: 'r1',
  levelId: 'level-2',
  designHash: 'hash1',
  model: 'deepseek-v4-flash',
  reasoningEffort: 'high',
  payload: {
    score: 78,
    verdict: 'Solid core; resilience is the gap.',
    dimensions: [
      { name: 'requirements-fit', score: 85, comment: 'Covers the brief.' },
      { name: 'scalability', score: 75, comment: 'Scales horizontally.' },
      { name: 'reliability', score: 60, comment: 'Single point of failure.' },
      { name: 'efficiency', score: 88, comment: 'Cost-efficient.' },
      { name: 'operability', score: 55, comment: 'No observability.' },
    ],
    strengths: ['Clear tiering', 'Good caching'],
    gaps: ['No retries', 'No monitoring'],
    realWorldComparison: {
      referenceArchitecture: 'Classic 3-tier with a cache.',
      matches: ['Uses a CDN'],
      differences: ['No multi-region failover'],
    },
    nextSteps: ['Add a replica database'],
  },
  usage: { promptTokens: 100, completionTokens: 200, latencyMs: 5000 },
  createdAt: new Date().toISOString(),
};

const response: AiReviewPostResponse = { review, cached: false };

function setup(fakeApi: Partial<AiReviewApi>) {
  // The panel GETs the stored review on open (US2); default to "nothing cached" unless a
  // test provides its own getReview, so the existing flows exercise the fresh-review path.
  const api: Partial<AiReviewApi> = { getReview: () => of(NO_STORED_REVIEW), ...fakeApi };
  TestBed.configureTestingModule({
    imports: [AiReviewPanelComponent],
    providers: [{ provide: AiReviewApi, useValue: api }],
  });
  const fixture = TestBed.createComponent(AiReviewPanelComponent);
  fixture.componentRef.setInput('levelId', 'level-2');
  return fixture;
}

function text(fixture: ReturnType<typeof setup>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('AiReviewPanelComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks the request and shows guidance when the canvas is empty (FR-013)', () => {
    const requestReview = vi.fn();
    const fixture = setup({ requestReview });
    fixture.componentRef.setInput('canvasEmpty', true);
    fixture.detectChanges();

    expect(requestReview).not.toHaveBeenCalled();
    expect(fixture.componentInstance.state()).toBe('error');
    expect(text(fixture)).toContain('Add at least one component');
  });

  it('waits on idle for a never-reviewed design, then Start runs, ticks the timer, and Cancel aborts', () => {
    vi.useFakeTimers();
    let tornDown = false;
    const requestReview = vi.fn(
      () =>
        new Observable<AiReviewPostResponse>(() => {
          return () => {
            tornDown = true;
          };
        }),
    );
    const fixture = setup({ requestReview });
    fixture.detectChanges();

    // A never-reviewed design waits on the idle start screen (flash vs deep choice) — no auto-run.
    expect(requestReview).not.toHaveBeenCalled();
    expect(fixture.componentInstance.state()).toBe('idle');

    fixture.componentInstance.start();
    fixture.detectChanges();
    expect(requestReview).toHaveBeenCalledWith('level-2', { deep: false });
    expect(fixture.componentInstance.state()).toBe('running');

    vi.advanceTimersByTime(3000);
    fixture.detectChanges();
    expect(fixture.componentInstance.elapsedSeconds()).toBe(3);
    expect(text(fixture)).toContain('3s elapsed');

    fixture.componentInstance.cancel();
    fixture.detectChanges();
    expect(tornDown).toBe(true);
    expect(fixture.componentInstance.state()).toBe('idle');
  });

  it('renders the review state with score, dimensions, and real-world comparison', () => {
    const fixture = setup({ requestReview: () => of(response) });
    fixture.detectChanges();

    fixture.componentInstance.start(); // idle → running → review
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('review');
    const rendered = text(fixture);
    expect(rendered).toContain('78');
    expect(rendered).toContain('Solid core; resilience is the gap.');
    expect(rendered).toContain('Requirements Fit');
    expect(rendered).toContain('Clear tiering');
    expect(rendered).toContain('No retries');
    expect(rendered).toContain('Classic 3-tier with a cache.');
    expect(rendered).toContain('Add a replica database');
  });

  it('renders a retryable error with a Retry action that re-requests', () => {
    const requestReview = vi
      .fn()
      .mockReturnValueOnce(throwError(() => ({ code: 'ai_timeout', message: 'The AI review timed out.' })))
      .mockReturnValueOnce(of(response));
    const fixture = setup({ requestReview });
    fixture.detectChanges();

    fixture.componentInstance.start(); // idle → error (first request throws)
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('error');
    expect(text(fixture)).toContain('The AI review timed out.');
    expect(text(fixture)).toContain('Retry');

    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(requestReview).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.state()).toBe('review');
  });

  it('sends deep: true when the deep-review checkbox is ticked before Start', () => {
    const requestReview = vi.fn(() => of(response));
    const fixture = setup({ requestReview });
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('idle');
    expect(requestReview).not.toHaveBeenCalled();

    fixture.componentInstance.toggleDeep(); // tick the "Deep review" checkbox
    fixture.componentInstance.start();
    fixture.detectChanges();
    expect(requestReview).toHaveBeenCalledWith('level-2', { deep: true });
  });

  it('restores a stored review on open without calling upstream (US2)', () => {
    const getReview = vi.fn(
      (): Observable<AiReviewGetResponse> => of({ ...NO_STORED_REVIEW, review }),
    );
    const requestReview = vi.fn(() => of(response));
    const fixture = setup({ getReview, requestReview });
    fixture.detectChanges();

    expect(getReview).toHaveBeenCalledWith('level-2');
    expect(requestReview).not.toHaveBeenCalled(); // served from cache, no upstream
    expect(fixture.componentInstance.state()).toBe('review');
    expect(fixture.componentInstance.fromCache()).toBe(true);
    const rendered = text(fixture);
    expect(rendered).toContain('Cached');
    expect(rendered).toContain('Solid core; resilience is the gap.');
  });

  it('shows the design-changed note and waits on idle when GET reports stale (US2)', () => {
    const getReview = vi.fn(
      (): Observable<AiReviewGetResponse> => of({ ...NO_STORED_REVIEW, review: null, stale: true }),
    );
    const requestReview = vi.fn(() => of(response));
    const fixture = setup({ getReview, requestReview });
    fixture.detectChanges();

    expect(requestReview).not.toHaveBeenCalled(); // no auto-run on a changed design
    expect(fixture.componentInstance.state()).toBe('idle');
    expect(fixture.componentInstance.designChanged()).toBe(true);
    expect(text(fixture)).toContain('Your design changed since the last review');
  });

  it('re-runs with force: true from a restored review (US2)', () => {
    const getReview = vi.fn(
      (): Observable<AiReviewGetResponse> => of({ ...NO_STORED_REVIEW, review }),
    );
    const requestReview = vi.fn(() => of({ review, cached: false }));
    const fixture = setup({ getReview, requestReview });
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('review');

    fixture.componentInstance.rerun();
    fixture.detectChanges();
    expect(requestReview).toHaveBeenCalledWith('level-2', { deep: false, force: true });
    expect(fixture.componentInstance.state()).toBe('review');
    expect(fixture.componentInstance.fromCache()).toBe(false); // freshly generated
  });

  it('shows a not-configured notice when GET reports the feature is unavailable', () => {
    const getReview = vi.fn(
      (): Observable<AiReviewGetResponse> => of({ ...NO_STORED_REVIEW, available: false }),
    );
    const requestReview = vi.fn(() => of(response));
    const fixture = setup({ getReview, requestReview });
    fixture.detectChanges();

    expect(requestReview).not.toHaveBeenCalled();
    expect(fixture.componentInstance.state()).toBe('error');
    expect(text(fixture)).toContain('not configured');
  });
});
