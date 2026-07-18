import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { PlaygroundStore } from '../state/playground.store.js';
import { AppIcon } from '../../../shared/app-icon.component.js';

/**
 * The right-hand context panel: the challenge narrative, collapsible spec sections, the
 * live mission checklist (bound to store.missionStates — FR-015), the free hints
 * accordion (revealedHintCount persists into the design document — FR-017), and the
 * "AI Review" entry point (disabled with a hint on an empty canvas, or when the parent
 * page's availability check reports the AI service isn't configured — US3; the actual
 * request is owned by the parent page, which flushes autosave first — same rule as RUN).
 */
@Component({
  selector: 'app-context-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  templateUrl: './context-panel.component.html',
  styleUrl: './context-panel.component.scss',
})
export class ContextPanelComponent {
  readonly store = inject(PlaygroundStore);

  /** From the parent page's GET .../ai-review check (US3); optimistic default while unknown. */
  readonly aiAvailable = input(true);

  readonly aiReview = output<void>();

  readonly canvasEmpty = computed(() => this.store.nodes().length === 0);

  readonly aiReviewDisabled = computed(() => this.canvasEmpty() || !this.aiAvailable());

  readonly aiReviewHint = computed(() => {
    if (this.canvasEmpty()) return 'Add components to the canvas before requesting an AI review.';
    if (!this.aiAvailable()) return 'AI review is not configured on this server.';
    return '';
  });

  readonly level = this.store.level;
  readonly missionStates = this.store.missionStates;
  readonly missionProgress = this.store.missionProgress;
  readonly revealedHintCount = this.store.revealedHintCount;

  readonly narrativeParagraphs = computed(() =>
    (this.level()?.narrative ?? '').split('\n\n').map((p) => p.trim()).filter(Boolean),
  );

  readonly budgetLabel = computed(() => {
    const b = this.level()?.specs.budgetPerHr;
    return b === undefined ? '' : `$${b.toFixed(2)}/hr limit`;
  });

  readonly revealedHints = computed(() => {
    const level = this.level();
    if (!level) return [];
    return level.hints.slice(0, this.revealedHintCount());
  });

  readonly hasMoreHints = computed(() => {
    const level = this.level();
    return level ? this.revealedHintCount() < level.hints.length : false;
  });

  revealHint(): void {
    this.store.revealNextHint();
  }
}
