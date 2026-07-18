import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, switchMap } from 'rxjs';
import { PlaygroundStore } from '../playground/state/playground.store.js';
import { createAutosave, type AutosaveHandle } from '../playground/state/autosave.js';
import { PaletteComponent } from '../playground/palette/palette.component.js';
import { CanvasComponent } from '../playground/canvas/canvas.component.js';
import { CanvasControlsComponent } from '../playground/canvas/canvas-controls.component.js';
import { CostIndicatorComponent } from '../playground/canvas/cost-indicator.component.js';
import { ContentApi } from '../../core/api/content.api.js';
import { SandboxApi } from '../../core/api/sandbox.api.js';
import { AppIcon } from '../../shared/app-icon.component.js';

type Status = 'loading' | 'ready' | 'notfound' | 'error';

/**
 * Free-form sandbox canvas (T052, US5, FR-030): the playground's palette + canvas + history
 * + autosave with `level = null` — the full catalog is always shown and there is deliberately
 * no context panel, no missions, and no RUN. Designs autosave and are nameable.
 */
@Component({
  selector: 'app-sandbox-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PlaygroundStore],
  imports: [
    RouterLink,
    PaletteComponent,
    CanvasComponent,
    CanvasControlsComponent,
    CostIndicatorComponent,
    AppIcon,
  ],
  templateUrl: './sandbox.page.html',
  styleUrl: './sandbox.page.scss',
})
export class SandboxPage {
  readonly store = inject(PlaygroundStore);
  private readonly route = inject(ActivatedRoute);
  private readonly contentApi = inject(ContentApi);
  private readonly sandboxApi = inject(SandboxApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<Status>('loading');
  readonly name = signal('');
  readonly editingName = signal(false);

  private designId = '';
  private readonly autosave: AutosaveHandle = createAutosave(this.store, () =>
    this.sandboxApi.update(this.designId, {
      nodes: this.store.nodes(),
      edges: this.store.edges(),
      notes: this.store.stickyNotes(),
    }),
  );
  readonly saveStatus = this.autosave.status;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const id = pm.get('designId');
      if (id) this.loadDesign(id);
    });
  }

  private loadDesign(id: string): void {
    this.autosave.flush().subscribe();
    this.designId = id;
    this.status.set('loading');

    const catalog$ = this.store.catalog().length
      ? of(this.store.catalog())
      : this.contentApi.getComponents();

    catalog$
      .pipe(
        switchMap((components) => {
          if (!this.store.catalog().length) this.store.setCatalog(components);
          return this.sandboxApi.get(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (design) => {
          this.autosave.prime();
          this.store.hydrate(null, design);
          this.name.set(design.name ?? 'Untitled design');
          this.status.set('ready');
        },
        error: (err: unknown) => {
          this.status.set(err instanceof HttpErrorResponse && err.status === 404 ? 'notfound' : 'error');
        },
      });
  }

  startEditName(): void {
    this.editingName.set(true);
  }

  commitName(value: string): void {
    this.editingName.set(false);
    const next = value.trim();
    if (!next || next === this.name()) return;
    this.name.set(next);
    // Persist the rename alongside the current graph (contract: PUT carries the full graph).
    this.sandboxApi
      .update(this.designId, {
        nodes: this.store.nodes(),
        edges: this.store.edges(),
        notes: this.store.stickyNotes(),
        name: next,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}
