import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DifficultyBadge } from '../../shared/difficulty-badge.component.js';
import { AppIcon } from '../../shared/app-icon.component.js';
import type { MapLevelCard } from '../../core/models.js';

/**
 * A single level card on the challenge map. Every card navigates to its playground (feature
 * 007 removed the unlock chain); completed cards show a check and the best score.
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

  readonly card = input.required<MapLevelCard>();

  activate(): void {
    this.router.navigate(['/playground', this.card().id]);
  }

  onSpace(event: Event): void {
    event.preventDefault();
    this.activate();
  }
}
