import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Difficulty } from '../core/models.js';

/** Color-coded difficulty chip (easy-green … legendary-purple). */
@Component({
  selector: 'app-difficulty-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [attr.data-difficulty]="difficulty()">{{ difficulty() }}</span>`,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: capitalize;
        letter-spacing: 0.02em;
        color: #fff;
      }
      .badge[data-difficulty='easy'] {
        background: var(--difficulty-easy);
      }
      .badge[data-difficulty='medium'] {
        background: var(--difficulty-medium);
      }
      .badge[data-difficulty='hard'] {
        background: var(--difficulty-hard);
      }
      .badge[data-difficulty='expert'] {
        background: var(--difficulty-expert);
      }
      .badge[data-difficulty='legendary'] {
        background: var(--difficulty-legendary);
      }
    `,
  ],
})
export class DifficultyBadge {
  readonly difficulty = input.required<Difficulty>();
}
