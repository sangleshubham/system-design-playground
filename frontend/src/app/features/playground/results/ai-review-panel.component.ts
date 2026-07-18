import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import { AiReviewApi, type AiReviewApiError } from '../../../core/api/ai-review.api.js';
import { AppIcon } from '../../../shared/app-icon.component.js';
import type { AiReview } from '../../../core/models.js';

type PanelState = 'loading' | 'idle' | 'running' | 'review' | 'error';

const RETRYABLE_CODES = new Set(['ai_rate_limited', 'ai_upstream_error', 'ai_malformed_output', 'ai_timeout']);

const DIMENSION_LABELS: Record<string, string> = {
  'requirements-fit': 'Requirements Fit',
  scalability: 'Scalability',
  reliability: 'Reliability',
  efficiency: 'Efficiency',
  operability: 'Operability',
};

/**
 * Self-contained AI review flow. On open it GETs the stored review for the current saved
 * design (US2): a hit renders instantly with zero upstream spend; otherwise a never-reviewed
 * design runs a fresh review automatically, and a design that changed since an earlier review
 * lands on idle with a "design changed" note so the learner chooses to re-run.
 *
 * States: loading (restoring) → idle (start + deep toggle) / running (elapsed timer, Cancel
 * aborts the request, FR-012) → review (score, dimensions, strengths/gaps, real-world
 * comparison, next steps; "Re-run review" forces a fresh call, FR-006) → error (human message,
 * Retry when the error code is retryable). A cached/restored review is badged as such.
 */
@Component({
  selector: 'app-ai-review-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  templateUrl: './ai-review-panel.component.html',
  styleUrl: './ai-review-panel.component.scss',
})
export class AiReviewPanelComponent implements OnInit, OnDestroy {
  private readonly api = inject(AiReviewApi);

  readonly levelId = input.required<string>();
  /** Client-side guard (FR-013): blocks the request even if the entry point's own check is bypassed. */
  readonly canvasEmpty = input(false);

  readonly closed = output<void>();

  readonly state = signal<PanelState>('loading');
  readonly deep = signal(false);
  readonly elapsedSeconds = signal(0);
  readonly review = signal<AiReview | null>(null);
  readonly error = signal<AiReviewApiError | null>(null);
  /** The displayed review was served from cache / restored from a prior run (zero fresh spend). */
  readonly fromCache = signal(false);
  /** The saved design changed since it was last reviewed (GET reported `stale`). */
  readonly designChanged = signal(false);

  readonly retryable = computed(() => {
    const code = this.error()?.code;
    return code !== undefined && RETRYABLE_CODES.has(code);
  });

  readonly dimensionRows = computed(() => {
    const review = this.review();
    if (!review) return [];
    return review.payload.dimensions.map((d) => ({
      ...d,
      label: DIMENSION_LABELS[d.name] ?? d.name,
    }));
  });

  readonly isDeepReview = computed(() => (this.review()?.model ?? '').includes('pro'));

  private subscription: Subscription | null = null;
  private restoreSub: Subscription | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.restore();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.restoreSub?.unsubscribe();
    this.stopTimer();
  }

  /**
   * On open, restore any stored review for the current design (US2) before touching upstream:
   * a hit renders instantly; a never-reviewed design runs a fresh review automatically; a
   * design changed since an earlier review waits on idle with a note.
   */
  private restore(): void {
    if (this.blockIfCanvasEmpty()) return;

    this.state.set('loading');
    this.restoreSub = this.api.getReview(this.levelId()).subscribe({
      next: (res) => {
        if (!res.available) {
          this.state.set('error');
          this.error.set({
            code: 'ai_not_configured',
            message: 'AI review is not configured on this server.',
          });
          return;
        }
        if (res.review) {
          this.review.set(res.review);
          this.fromCache.set(true);
          this.designChanged.set(false);
          this.state.set('review');
        } else if (res.stale) {
          // A prior review exists but the design changed — let the learner choose to re-run.
          this.designChanged.set(true);
          this.state.set('idle');
        } else {
          // Never reviewed — land on the idle screen so the learner can pick flash vs
          // deep (the "Deep review" checkbox) before spending a request.
          this.designChanged.set(false);
          this.state.set('idle');
        }
      },
      // A failed restore is non-fatal: fall back to the idle start screen.
      error: () => this.state.set('idle'),
    });
  }

  /** True when an empty canvas blocks the request (FR-013); sets the error state as a side effect. */
  private blockIfCanvasEmpty(): boolean {
    if (!this.canvasEmpty()) return false;
    this.state.set('error');
    this.error.set({
      code: 'design_empty',
      message: 'Add at least one component to the canvas before requesting an AI review.',
    });
    return true;
  }

  start(opts: { force?: boolean } = {}): void {
    if (this.state() === 'running') return;
    if (this.blockIfCanvasEmpty()) return;

    this.state.set('running');
    this.error.set(null);
    this.fromCache.set(false);
    this.designChanged.set(false);
    this.elapsedSeconds.set(0);
    this.timer = setInterval(() => this.elapsedSeconds.update((s) => s + 1), 1000);

    const body = opts.force ? { deep: this.deep(), force: true } : { deep: this.deep() };
    this.subscription = this.api.requestReview(this.levelId(), body).subscribe({
      next: (res) => {
        this.stopTimer();
        this.review.set(res.review);
        this.fromCache.set(res.cached);
        this.state.set('review');
      },
      error: (err: AiReviewApiError) => {
        this.stopTimer();
        this.error.set(err);
        this.state.set('error');
      },
    });
  }

  /** Abort the in-flight request (running state only) and return to idle. */
  cancel(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.stopTimer();
    this.state.set('idle');
  }

  /** Re-generate the review for the current design, bypassing the cache (force: true, FR-006). */
  rerun(): void {
    this.start({ force: true });
  }

  retry(): void {
    this.start();
  }

  runDeepReview(): void {
    this.deep.set(true);
    // Non-forced: the deep model has its own cache row, so an existing pro review is reused.
    this.start();
  }

  toggleDeep(): void {
    if (this.state() === 'running') return;
    this.deep.update((d) => !d);
  }

  dismiss(): void {
    this.cancel();
    this.closed.emit();
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
