import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppIcon } from '../../../shared/app-icon.component.js';
import type { AttemptResult, Dimension } from '../../../core/models.js';

const DIMENSION_LABELS: Record<Dimension, string> = {
  missions: 'Missions',
  flow: 'Flow',
  topology: 'Topology',
  efficiency: 'Efficiency',
  resilience: 'Resilience',
};

/**
 * Modal shown after RUN: a total-score dial, five per-dimension bars with findings, and a
 * pass (≥ 90) celebration with a Next-level CTA or a fail state that keeps the canvas
 * intact for revision (US1 scenario 5).
 */
@Component({
  selector: 'app-results-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  templateUrl: './results-dialog.component.html',
  styleUrl: './results-dialog.component.scss',
})
export class ResultsDialogComponent {
  readonly result = input.required<AttemptResult>();
  readonly best = input<number | null>(null);
  // Design stats for the tile row (derived by the caller from the evaluated design).
  readonly nodeCount = input<number | null>(null);
  readonly edgeCount = input<number | null>(null);
  readonly costPerHr = input<number | null>(null);

  readonly dismiss = output<void>();
  readonly next = output<string>();

  readonly circumference = 2 * Math.PI * 52;
  readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(100, this.result().total));
    return this.circumference * (1 - pct / 100);
  });

  /** Letter grade from the total score (A ≥ 90 … F < 60). */
  readonly grade = computed(() => {
    const t = this.result().total;
    if (t >= 90) return 'A';
    if (t >= 80) return 'B';
    if (t >= 70) return 'C';
    if (t >= 60) return 'D';
    return 'F';
  });

  readonly hasStats = computed(
    () => this.nodeCount() !== null || this.edgeCount() !== null || this.costPerHr() !== null,
  );

  readonly dimensions = computed(() =>
    this.result().feedback.map((f) => ({ ...f, label: DIMENSION_LABELS[f.dimension] })),
  );

  onNext(): void {
    const id = this.result().unlockedLevelId;
    if (id) this.next.emit(id);
  }
}
