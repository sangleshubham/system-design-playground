import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DifficultyBadge } from '../../shared/difficulty-badge.component.js';
import { AppIcon } from '../../shared/app-icon.component.js';
import { ToastService } from '../../core/toast.service.js';
import type { MapLevelCard } from '../../core/models.js';

/**
 * A single level card on the challenge map. Locked cards are dimmed and non-navigating
 * (click surfaces a toast); unlocked/completed cards navigate to the playground.
 */
@Component({
  selector: 'app-level-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DifficultyBadge, AppIcon],
  templateUrl: './level-card.component.html',
  styleUrl: './level-card.component.scss',
})
export class LevelCardComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly card = input.required<MapLevelCard>();

  activate(): void {
    const card = this.card();
    if (card.status === 'locked') {
      this.toast.show(`Complete level ${card.order - 1} to unlock this level.`, 'info');
      return;
    }
    this.router.navigate(['/playground', card.id]);
  }

  onSpace(event: Event): void {
    event.preventDefault();
    this.activate();
  }
}
