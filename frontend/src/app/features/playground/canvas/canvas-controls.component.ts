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
import { KeyService } from '../../../core/key.service.js';
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
  readonly keys = inject(KeyService);

  readonly canvas = input.required<CanvasComponent>();
  readonly fullscreenTarget = input<HTMLElement | null>(null);

  readonly isFullscreen = signal(false);
  readonly hasSelection = computed(
    () => this.store.selection().nodes.length > 0 || this.store.selection().edges.length > 0,
  );

  // Fullscreen button state (US3, FR-007/008): glyph + label communicate the current state so
  // the fit and fullscreen controls stay distinguishable and the toggle reads clearly.
  readonly fullscreenIcon = computed(() => (this.isFullscreen() ? 'fullscreen-exit' : 'fullscreen'));
  readonly fullscreenLabel = computed(() => (this.isFullscreen() ? 'Exit full screen' : 'Full screen'));

  // Copy-my-key control state (US5, data-model E3, FR-013/015): non-idle states auto-revert after
  // 1.5 s and swap the button glyph/label — non-blocking feedback, no dialogs.
  readonly copyState = signal<'idle' | 'copied' | 'error'>('idle');
  readonly copyKeyIcon = computed(() => (this.copyState() === 'copied' ? 'check' : 'key'));
  readonly copyKeyLabel = computed(() => {
    switch (this.copyState()) {
      case 'copied':
        return 'Copied';
      case 'error':
        return 'Copy failed';
      default:
        return 'Copy key';
    }
  });
  private copyRevert: ReturnType<typeof setTimeout> | null = null;

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

  /**
   * Copy the full, unmasked access key to the clipboard (US5, FR-012/014/015). The write is
   * awaited so success and failure are distinguishable: resolve → 'copied', reject or a missing
   * Clipboard API → 'error'. Both states auto-revert to 'idle' after 1.5 s and never block the
   * canvas. The value is `keys.key()` verbatim — never the display-only masked form.
   */
  async copyKey(): Promise<void> {
    const key = this.keys.key();
    if (!key) return;
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await clipboard.writeText(key);
      this.copyState.set('copied');
    } catch {
      this.copyState.set('error');
    }
    if (this.copyRevert) clearTimeout(this.copyRevert);
    this.copyRevert = setTimeout(() => this.copyState.set('idle'), 1500);
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
