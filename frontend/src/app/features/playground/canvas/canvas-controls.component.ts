import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { PlaygroundStore } from '../state/playground.store.js';
import { ConfirmDialogService } from '../../../shared/confirm-dialog.service.js';
import { AppIcon } from '../../../shared/app-icon.component.js';
import { tidyLayout } from './tidy.js';
import { detectPlatform } from './canvas-shortcuts.js';
import type { CanvasComponent } from './canvas.component.js';

/**
 * The canvas toolbars (T040): a top toolbar (undo / redo / tidy / delete / reset) and a
 * bottom bar (zoom in-out / fit / lock / fullscreen). Mutations route through the store;
 * zoom/fit call the canvas; fullscreen uses the Fullscreen API on the playground element.
 */
@Component({
  selector: 'app-canvas-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  templateUrl: './canvas-controls.component.html',
  styleUrl: './canvas-controls.component.scss',
})
export class CanvasControlsComponent {
  readonly store = inject(PlaygroundStore);
  private readonly confirm = inject(ConfirmDialogService);

  readonly canvas = input.required<CanvasComponent>();
  readonly fullscreenTarget = input<HTMLElement | null>(null);

  readonly isFullscreen = signal(false);
  readonly hasSelection = computed(
    () => this.store.selection().nodes.length > 0 || this.store.selection().edges.length > 0,
  );

  // Platform-aware shortcut hints for tooltips (discoverability, Principle II).
  private readonly isMac = detectPlatform() === 'mac';
  readonly copyHint = this.isMac ? '⌘C' : 'Ctrl+C';
  readonly pasteHint = this.isMac ? '⌘V' : 'Ctrl+V';
  readonly undoHint = this.isMac ? '⌘Z' : 'Ctrl+Z';
  readonly redoHint = this.isMac ? '⌘⇧Z' : 'Ctrl+Shift+Z';
  readonly deleteHint = this.isMac ? '⌫' : 'Del';
  readonly zoomInHint = this.isMac ? '⌘=' : 'Ctrl+=';
  readonly zoomOutHint = this.isMac ? '⌘-' : 'Ctrl+-';
  readonly fitHint = this.isMac ? '⌘0' : 'Ctrl+0';

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  undo(): void {
    this.canvas().undo();
  }
  redo(): void {
    this.canvas().redo();
  }
  copy(): void {
    this.store.copySelection();
  }
  paste(): void {
    this.canvas().paste();
  }
  deleteSelection(): void {
    this.store.deleteSelection();
  }

  tidy(): void {
    const positions = tidyLayout(this.store.nodes(), this.store.edges());
    this.store.applyLayout(positions);
    setTimeout(() => this.canvas().fitToView(), 60);
  }

  async reset(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Reset canvas?',
      message: 'This clears every component, connection, and note. You can undo it.',
      confirmLabel: 'Reset',
      danger: true,
    });
    if (ok) this.store.resetCanvas();
  }

  zoomIn(): void {
    this.canvas().zoomIn();
  }
  zoomOut(): void {
    this.canvas().zoomOut();
  }
  fit(): void {
    this.canvas().fitToView();
  }
  toggleLock(): void {
    this.store.toggleLock();
  }

  toggleFullscreen(): void {
    const target = this.fullscreenTarget();
    if (!document.fullscreenElement) {
      target?.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  }
}
