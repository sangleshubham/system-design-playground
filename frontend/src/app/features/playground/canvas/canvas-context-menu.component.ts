import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { CdkConnectedOverlay, type ConnectedPosition } from '@angular/cdk/overlay';
import { PlaygroundStore } from '../state/playground.store.js';
import { detectPlatform } from './canvas-shortcuts.js';

/** Which set of entries the menu shows (data-model §3). */
export type ContextMenuZone = 'selection' | 'canvas';

/**
 * The action a chosen entry emits. The canvas host maps each to the SAME store/flow calls the
 * keyboard router uses, so a menu entry and its shortcut are guaranteed identical (FR-019).
 */
export type ContextMenuAction = 'copy' | 'paste' | 'duplicate' | 'delete' | 'selectAll';

/**
 * Right-click canvas menu (US4; contract ui-components §1, research R4). A CDK-overlay popup
 * anchored at the click point with viewport-edge fallback. It is presentational + store-driven:
 * it reads the store for each entry's disabled predicate and emits the chosen `action`; the
 * canvas host owns the open/anchor/zone state and routes actions to store/flow methods.
 *
 * Escape dismissal is intentionally NOT bound here. The keyboard-shortcuts contract mandates a
 * single keyboard dispatch point (the canvas router), which closes the menu on Escape. This
 * component dismisses on entry click, outside click, overlay detach, and window blur.
 */
@Component({
  selector: 'app-canvas-context-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay],
  template: `
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayOrigin]="anchor()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayHasBackdrop]="false"
      [cdkConnectedOverlayPush]="true"
      (overlayOutsideClick)="requestClose()"
      (detach)="requestClose()"
    >
      <div class="ctx-menu" role="menu" aria-label="Canvas actions">
        @if (zone() === 'selection') {
          <button
            type="button"
            role="menuitem"
            aria-keyshortcuts="{{ ariaShortcuts.copy }}"
            [disabled]="!store.canCopy()"
            (click)="choose('copy')"
          >
            <span class="label">Copy</span>
            <span class="shortcut" aria-hidden="true">{{ hints.copy }}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            aria-keyshortcuts="{{ ariaShortcuts.duplicate }}"
            [disabled]="!store.canCopy()"
            (click)="choose('duplicate')"
          >
            <span class="label">Duplicate</span>
            <span class="shortcut" aria-hidden="true">{{ hints.duplicate }}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            class="danger"
            aria-keyshortcuts="{{ ariaShortcuts.delete }}"
            [disabled]="!store.canCopy()"
            (click)="choose('delete')"
          >
            <span class="label">Delete</span>
            <span class="shortcut" aria-hidden="true">{{ hints.delete }}</span>
          </button>
        } @else {
          <button
            type="button"
            role="menuitem"
            aria-keyshortcuts="{{ ariaShortcuts.paste }}"
            [disabled]="!store.canPaste()"
            (click)="choose('paste')"
          >
            <span class="label">Paste</span>
            <span class="shortcut" aria-hidden="true">{{ hints.paste }}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            aria-keyshortcuts="{{ ariaShortcuts.selectAll }}"
            [disabled]="!canSelectAll()"
            (click)="choose('selectAll')"
          >
            <span class="label">Select All</span>
            <span class="shortcut" aria-hidden="true">{{ hints.selectAll }}</span>
          </button>
        }
      </div>
    </ng-template>
  `,
  styles: [
    `
      .ctx-menu {
        display: flex;
        flex-direction: column;
        min-width: 9rem;
        padding: 0.25rem;
        background: var(--surface-raised);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-control);
        box-shadow: var(--shadow-elevated);
      }

      .ctx-menu button {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.4rem 0.6rem;
        border: 0;
        border-radius: calc(var(--radius-control) - 2px);
        background: transparent;
        color: var(--text-primary);
        font-size: 0.875rem;
        text-align: start;
        cursor: pointer;
      }

      .ctx-menu button .label {
        flex: 1 1 auto;
      }

      .ctx-menu button .shortcut {
        flex: 0 0 auto;
        color: var(--text-muted);
        font-size: 0.75rem;
      }

      .ctx-menu button:hover:not(:disabled),
      .ctx-menu button:focus-visible {
        background: var(--surface-2);
        outline: none;
      }

      .ctx-menu button.danger:not(:disabled) {
        color: var(--color-danger);
      }

      .ctx-menu button:disabled {
        color: var(--text-muted);
        cursor: default;
      }
    `,
  ],
})
export class CanvasContextMenuComponent {
  readonly store = inject(PlaygroundStore);

  private readonly isMac = detectPlatform() === 'mac';
  private readonly mod = this.isMac ? '⌘' : 'Ctrl+';

  /** Visible, platform-correct shortcut hints per entry (discoverability, Principle II). */
  readonly hints = {
    copy: `${this.mod}C`,
    duplicate: `${this.mod}D`,
    delete: this.isMac ? '⌫' : 'Del',
    paste: `${this.mod}V`,
    selectAll: `${this.mod}A`,
  };

  /** Screen-reader shortcut announcements (WAI-ARIA `aria-keyshortcuts` grammar). */
  readonly ariaShortcuts = {
    copy: this.isMac ? 'Meta+C' : 'Control+C',
    duplicate: this.isMac ? 'Meta+D' : 'Control+D',
    delete: 'Delete',
    paste: this.isMac ? 'Meta+V' : 'Control+V',
    selectAll: this.isMac ? 'Meta+A' : 'Control+A',
  };

  readonly open = input(false);
  /** Viewport-space anchor point of the right-click (a CDK flexible-connected origin). */
  readonly anchor = input<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly zone = input<ContextMenuZone>('selection');

  readonly action = output<ContextMenuAction>();
  readonly closed = output<void>();

  // Prefer a below-right popup; CDK flips toward the opposite corner near a viewport edge.
  readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
  ];

  /**
   * Select All requires a non-empty canvas (Copy/Duplicate/Delete reuse `store.canCopy()`, which
   * already means "selection non-empty && !locked"). All predicates are locked-aware (FR-022).
   */
  canSelectAll(): boolean {
    return (
      !this.store.locked() &&
      (this.store.nodes().length > 0 ||
        this.store.stickyNotes().length > 0 ||
        this.store.edges().length > 0)
    );
  }

  choose(action: ContextMenuAction): void {
    this.action.emit(action);
    this.closed.emit();
  }

  /** Ask the host to close; guarded so a stray overlay event while closed emits nothing. */
  requestClose(): void {
    if (this.open()) this.closed.emit();
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.requestClose();
  }
}
