import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { SandboxApi } from '../../core/api/sandbox.api.js';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service.js';
import { AppIcon } from '../../shared/app-icon.component.js';
import type { SandboxSummary } from '../../core/models.js';

/**
 * Sandbox design list (T052, US5): create, open, inline-rename, and delete free-form
 * designs. Cards show name, last-updated, and node count.
 */
@Component({
  selector: 'app-sandbox-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  templateUrl: './sandbox-list.page.html',
  styleUrl: './sandbox-list.page.scss',
})
export class SandboxListPage {
  private readonly sandboxApi = inject(SandboxApi);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly designs = signal<SandboxSummary[]>([]);
  readonly loaded = signal(false);
  readonly creating = signal(false);
  readonly editingId = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.sandboxApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((designs) => {
        this.designs.set(designs);
        this.loaded.set(true);
      });
  }

  startCreate(): void {
    this.creating.set(true);
  }

  cancelCreate(): void {
    this.creating.set(false);
  }

  create(value: string): void {
    const name = value.trim();
    if (!name) return;
    this.creating.set(false);
    this.sandboxApi
      .create(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((design) => this.router.navigate(['/sandbox', design.id]));
  }

  open(id: string): void {
    this.router.navigate(['/sandbox', id]);
  }

  startRename(id: string): void {
    this.editingId.set(id);
  }

  commitRename(id: string, value: string): void {
    this.editingId.set(null);
    const name = value.trim();
    if (!name) return;
    // The PUT contract carries the full graph, so fetch the design then rewrite it renamed.
    this.sandboxApi
      .get(id)
      .pipe(
        switchMap((d) =>
          this.sandboxApi.update(id, { nodes: d.nodes, edges: d.edges, notes: d.notes, name }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  async remove(design: SandboxSummary): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete design?',
      message: `"${design.name ?? 'Untitled design'}" will be permanently deleted.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.sandboxApi
      .remove(design.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
  }

  relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const min = Math.floor((Date.now() - then) / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString();
  }
}
