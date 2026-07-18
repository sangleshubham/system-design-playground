import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { FFlowModule } from '@foblex/flow';
import { PlaygroundStore } from '../state/playground.store.js';
import { AppIcon } from '../../../shared/app-icon.component.js';
import { componentIconName } from '../../../shared/component-icon.registry.js';
import type { Category, Component as CatalogComponent } from '../../../core/models.js';

const CATEGORY_ORDER: Category[] = [
  'user',
  'networking',
  'compute',
  'storage',
  'caching',
  'messaging',
  'services',
];
const CATEGORY_LABELS: Record<Category, string> = {
  user: 'User',
  networking: 'Networking',
  compute: 'Compute',
  storage: 'Storage',
  caching: 'Caching',
  messaging: 'Messaging',
  services: 'Services',
};

interface PaletteGroup {
  key: string;
  label: string;
  items: CatalogComponent[];
}

/**
 * Component palette (T032 + T038): draggable component cards grouped by category, a
 * "Recommended" view with NEEDED badges, live search, the show-all toggle, per-card
 * metadata overlay, and a draggable sticky-note item. Everything drags onto the canvas
 * via Foblex's fExternalItem directive.
 */
@Component({
  selector: 'app-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FFlowModule, OverlayModule, AppIcon],
  templateUrl: './palette.component.html',
  styleUrl: './palette.component.scss',
})
export class PaletteComponent {
  readonly store = inject(PlaygroundStore);

  readonly search = signal('');
  readonly mode = signal<'recommended' | 'all'>('all');
  readonly hovered = signal<CatalogComponent | null>(null);

  readonly hasRecommendations = computed(() => (this.store.level()?.recommendedComponentIds.length ?? 0) > 0);
  readonly recommendedIds = computed(() => new Set(this.store.level()?.recommendedComponentIds ?? []));
  readonly totalCount = computed(() => this.store.catalog().length);

  constructor() {
    // Default to the recommended view when a level provides recommendations.
    queueMicrotask(() => {
      if (this.hasRecommendations()) this.mode.set('recommended');
    });
  }

  private readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const all = this.store.catalog();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.tech.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  });

  readonly groups = computed<PaletteGroup[]>(() => {
    const items = this.filtered();
    if (this.mode() === 'recommended' && this.hasRecommendations()) {
      const rec = this.recommendedIds();
      const recItems = items.filter((c) => rec.has(c.id));
      return recItems.length ? [{ key: 'recommended', label: 'Recommended', items: recItems }] : [];
    }
    return CATEGORY_ORDER.map((cat) => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      items: items.filter((c) => c.category === cat),
    })).filter((g) => g.items.length > 0);
  });

  isNeeded(id: string): boolean {
    return this.recommendedIds().has(id);
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'recommended' ? 'all' : 'recommended'));
  }

  money(n: number): string {
    return `$${n.toFixed(2)}/hr`;
  }

  iconFor(c: CatalogComponent): string {
    return componentIconName(c.icon, c.category);
  }
}
