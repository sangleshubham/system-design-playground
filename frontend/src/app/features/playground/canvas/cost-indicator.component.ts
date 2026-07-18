import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PlaygroundStore } from '../state/playground.store.js';

/**
 * Live cost pill overlaid at the canvas top-left: sums `costPerHr` across placed nodes and
 * compares it to the level budget (`specs.budgetPerHr`). Green while within budget, red when
 * over. In the sandbox (no level budget) it shows the running total only.
 */
@Component({
  selector: 'app-cost-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="cost-pill" [class.over]="over()" [attr.aria-label]="label()">
        <span class="amount">\${{ total().toFixed(1) }}</span>
        @if (budget() !== null) {
          <span class="sep">/</span>
          <span class="budget">\${{ budget()!.toFixed(1) }}</span>
        }
        <span class="unit">/hr</span>
      </div>
    }
  `,
  styleUrl: './cost-indicator.component.scss',
})
export class CostIndicatorComponent {
  private readonly store = inject(PlaygroundStore);

  readonly total = computed(() =>
    this.store
      .nodes()
      .reduce((sum, n) => sum + (this.store.component(n.componentId)?.costPerHr ?? 0), 0),
  );
  readonly budget = computed(() => this.store.level()?.specs.budgetPerHr ?? null);
  readonly over = computed(() => {
    const b = this.budget();
    return b !== null && this.total() > b;
  });
  readonly visible = computed(() => this.budget() !== null || this.store.nodes().length > 0);
  readonly label = computed(() => {
    const b = this.budget();
    const total = `$${this.total().toFixed(1)}/hr`;
    return b === null ? `Total cost ${total}` : `Total cost ${total} of $${b.toFixed(1)}/hr budget`;
  });
}
