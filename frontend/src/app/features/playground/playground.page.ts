import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, switchMap, tap, type Observable } from 'rxjs';
import { PlaygroundStore } from './state/playground.store.js';
import { ContentApi } from '../../core/api/content.api.js';
import { LevelsApi } from '../../core/api/levels.api.js';
import { AiReviewApi } from '../../core/api/ai-review.api.js';
import { ConflictDialogService } from '../../shared/conflict-dialog.service.js';
import { StaleWriteError } from '../../core/stale-write.js';
import { PaletteComponent } from './palette/palette.component.js';
import { CanvasComponent } from './canvas/canvas.component.js';
import { CanvasControlsComponent } from './canvas/canvas-controls.component.js';
import { CostIndicatorComponent } from './canvas/cost-indicator.component.js';
import { ContextPanelComponent } from './context-panel/context-panel.component.js';
import { ResultsDialogComponent } from './results/results-dialog.component.js';
import { AiReviewPanelComponent } from './results/ai-review-panel.component.js';
import { DifficultyBadge } from '../../shared/difficulty-badge.component.js';
import { AppIcon } from '../../shared/app-icon.component.js';
import { createAutosave, type AutosaveHandle } from './state/autosave.js';
import type { AttemptResult, Design } from '../../core/models.js';

type Status = 'loading' | 'ready' | 'notfound' | 'error';

@Component({
  selector: 'app-playground-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PlaygroundStore],
  imports: [
    RouterLink,
    PaletteComponent,
    CanvasComponent,
    CanvasControlsComponent,
    CostIndicatorComponent,
    ContextPanelComponent,
    ResultsDialogComponent,
    AiReviewPanelComponent,
    DifficultyBadge,
    AppIcon,
  ],
  templateUrl: './playground.page.html',
  styleUrl: './playground.page.scss',
})
export class PlaygroundPage {
  readonly store = inject(PlaygroundStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contentApi = inject(ContentApi);
  private readonly levelsApi = inject(LevelsApi);
  private readonly aiReviewApi = inject(AiReviewApi);
  private readonly conflictDialog = inject(ConflictDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<Status>('loading');
  readonly running = signal(false);
  readonly result = signal<AttemptResult | null>(null);
  readonly best = signal<number | null>(null);
  /** The level after this one by global order (null on the last level) — "Next level" CTA. */
  readonly nextLevelId = signal<string | null>(null);
  readonly aiReviewOpen = signal(false);
  /** GET .../ai-review availability (US3); optimistic default until the check resolves. */
  readonly aiAvailable = signal(true);

  // Tablet/phone: palette and context become toggleable drawers (T054).
  readonly paletteOpen = signal(false);
  readonly contextOpen = signal(false);

  private levelId = '';
  /** The last `updatedAt` we know the server holds — the optimistic-concurrency base (R6). */
  private lastUpdatedAt: string | null = null;
  private readonly autosave: AutosaveHandle = createAutosave(
    this.store,
    () => this.persistDesign(this.lastUpdatedAt ?? undefined),
    { onConflict: (current) => this.handleConflict(current) },
  );
  readonly saveStatus = this.autosave.status;

  /** Total $/hr of the current design — shown as a results-dialog stat tile. */
  readonly currentCost = computed(() =>
    this.store
      .nodes()
      .reduce((sum, n) => sum + (this.store.component(n.componentId)?.costPerHr ?? 0), 0),
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const id = pm.get('levelId');
      if (id) this.loadLevel(id);
    });
  }

  private loadLevel(id: string): void {
    // Persist any pending edits for the previous level before switching (route is reused).
    this.autosave.flush().subscribe();
    this.levelId = id;
    this.status.set('loading');
    this.result.set(null);
    this.nextLevelId.set(null);

    const catalog$ = this.store.catalog().length
      ? of(this.store.catalog())
      : this.contentApi.getComponents();

    catalog$
      .pipe(
        switchMap((components) => {
          if (!this.store.catalog().length) this.store.setCatalog(components);
          return this.levelsApi.getLevel(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (payload) => {
          // Re-baseline autosave so hydrating the saved design doesn't look like an edit.
          this.autosave.prime();
          this.store.hydrate(payload, payload.design);
          this.lastUpdatedAt = payload.design?.updatedAt ?? null;
          this.status.set('ready');
          this.loadBest(id);
          this.loadAiAvailability(id);
          this.loadNextLevel(payload.order);
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.status.set('notfound');
          } else {
            this.status.set('error');
          }
        },
      });
  }

  /** Save the canvas with the current concurrency base, adopting the fresh updatedAt on 200. */
  private persistDesign(base?: string): Observable<{ updatedAt: string }> {
    return this.levelsApi
      .saveDesign(this.levelId, this.store.toUpsertRequest(), base)
      .pipe(tap((res) => (this.lastUpdatedAt = res.updatedAt)));
  }

  /**
   * Resolve a 409 stale_write (FR-011): reload replaces the canvas with the winning version;
   * overwrite re-saves the local canvas on top of it; dismiss leaves the canvas untouched and
   * unsaved. Overwrite re-bases and re-resolves if a further conflict lands (never silent-retry).
   */
  private async handleConflict(current: Design): Promise<void> {
    const choice = await this.conflictDialog.open();
    if (choice === 'reload') {
      this.autosave.prime();
      this.store.hydrate(this.store.level(), current);
      this.lastUpdatedAt = current.updatedAt;
    } else if (choice === 'overwrite') {
      try {
        await firstValueFrom(this.persistDesign(current.updatedAt));
      } catch (err) {
        if (err instanceof StaleWriteError) return this.handleConflict(err.current);
      }
    }
  }

  private loadBest(id: string): void {
    this.levelsApi
      .getAttempts(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.best.set(r.best), error: () => this.best.set(null) });
  }

  /** Resolve the next level by global order (feature 007: every level is open). */
  private loadNextLevel(order: number): void {
    const id = this.levelId;
    this.contentApi
      .getMap()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (map) => {
          if (this.levelId !== id) return;
          const next = map.acts.flatMap((a) => a.levels).find((l) => l.order === order + 1);
          this.nextLevelId.set(next?.id ?? null);
        },
        error: () => {
          if (this.levelId === id) this.nextLevelId.set(null);
        },
      });
  }

  /** Disable the AI Review button proactively when the server reports it isn't configured
   *  (US3) — never calls upstream. A failed check fails open: the panel's own restore
   *  still surfaces `ai_not_configured` if the button were clicked regardless. */
  private loadAiAvailability(id: string): void {
    this.aiReviewApi
      .getReview(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.aiAvailable.set(res.available),
        error: () => this.aiAvailable.set(true),
      });
  }

  run(): void {
    if (this.running() || this.status() !== 'ready') return;
    this.running.set(true);
    // Flush pending autosave first, then evaluate the saved design (contract: RUN scores saved).
    this.autosave
      .flush()
      .pipe(
        switchMap(() => this.levelsApi.runAttempt(this.levelId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.running.set(false);
          this.result.set(res);
          this.loadBest(this.levelId);
        },
        error: () => this.running.set(false),
      });
  }

  /** Flush pending autosave first, then open the panel — same rule as RUN; the panel
   *  starts its own request on init. */
  openAiReview(): void {
    if (!this.aiAvailable()) return;
    this.autosave.flush().subscribe(() => this.aiReviewOpen.set(true));
  }

  togglePalette(): void {
    this.paletteOpen.update((v) => !v);
    this.contextOpen.set(false);
  }

  toggleContext(): void {
    this.contextOpen.update((v) => !v);
    this.paletteOpen.set(false);
  }

  closeDrawers(): void {
    this.paletteOpen.set(false);
    this.contextOpen.set(false);
  }

  closeResult(): void {
    this.result.set(null);
  }

  goToLevel(id: string): void {
    this.result.set(null);
    this.router.navigate(['/playground', id]);
  }
}
