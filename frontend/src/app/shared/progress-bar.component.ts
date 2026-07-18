import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A simple 0–100 progress bar. */
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="track"
      role="progressbar"
      [attr.aria-valuenow]="clamped()"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="fill" [style.width.%]="clamped()"></div>
    </div>
  `,
  styles: [
    `
      .track {
        width: 100%;
        height: 8px;
        background: var(--surface-2);
        border-radius: 999px;
        overflow: hidden;
      }
      .fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
        border-radius: 999px;
        transition: width 0.4s ease;
      }
    `,
  ],
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly clamped = computed(() => Math.max(0, Math.min(100, Math.round(this.value()))));
}
