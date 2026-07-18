import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A compact labelled statistic tile. */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat card shadow-soft">
      <div class="value">{{ value() }}</div>
      <div class="label">{{ label() }}</div>
    </div>
  `,
  styles: [
    `
      .stat {
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      .label {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }
    `,
  ],
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
}
