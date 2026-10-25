import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContentApi } from '../../core/api/content.api.js';
import { ProgressBar } from '../../shared/progress-bar.component.js';
import { LevelCardComponent } from './level-card.component.js';
import type { Difficulty, MapView } from '../../core/models.js';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert', 'legendary'];

/** The `/lab` challenge map: acts, level cards, completion states, search + difficulty filters. */
@Component({
  selector: 'app-lab-map-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBar, LevelCardComponent],
  templateUrl: './lab-map.page.html',
  styleUrl: './lab-map.page.scss',
})
export class LabMapPage {
  private readonly contentApi = inject(ContentApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly difficulties = DIFFICULTIES;
  readonly map = signal<MapView | null>(null);
  readonly search = signal('');
  readonly activeDifficulties = signal<ReadonlySet<Difficulty>>(new Set());

  readonly overallPercent = computed(() => {
    const m = this.map();
    if (!m || m.totals.levels === 0) return 0;
    return Math.round((m.totals.completed / m.totals.levels) * 100);
  });

  readonly filteredActs = computed(() => {
    const m = this.map();
    if (!m) return [];
    const query = this.search().trim().toLowerCase();
    const active = this.activeDifficulties();
    return m.acts.map((act) => ({
      ...act,
      levels: act.levels.filter((level) => {
        if (active.size > 0 && !active.has(level.difficulty)) return false;
        if (!query) return true;
        const haystack = `${level.title} ${level.summary} ${level.objectives.join(' ')}`.toLowerCase();
        return haystack.includes(query);
      }),
    }));
  });

  readonly hasResults = computed(() => this.filteredActs().some((act) => act.levels.length > 0));

  constructor() {
    this.contentApi
      .getMap()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((map) => this.map.set(map));
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  isActiveDifficulty(d: Difficulty): boolean {
    return this.activeDifficulties().has(d);
  }

  toggleDifficulty(d: Difficulty): void {
    this.activeDifficulties.update((current) => {
      const next = new Set(current);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }
}
