import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ProgressApi } from '../../core/api/progress.api.js';
import { ProgressBar } from '../../shared/progress-bar.component.js';
import type { HomeView } from '../../core/models.js';

/**
 * Home view (T049, FR-029): lab progress, one-click "continue where you left off",
 * recommended next level, and a link into the free-form sandbox. Continue/recommended
 * cards hide gracefully when the backend returns null.
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ProgressBar],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly progressApi = inject(ProgressApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly home = signal<HomeView | null>(null);
  readonly lab = computed(() => this.home()?.lab ?? null);
  readonly continueCard = computed(() => this.home()?.continue ?? null);
  readonly recommended = computed(() => this.home()?.recommendedNext ?? null);

  constructor() {
    this.progressApi
      .getProgress()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((home) => this.home.set(home));
  }

  /** Human-friendly relative time for the continue card ("3 min ago"). */
  relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString();
  }
}
