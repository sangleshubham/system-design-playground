import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';

export type ConflictChoice = 'reload' | 'overwrite';

/**
 * Presentational stale-write dialog (FR-011, contracts/ui-auth-surfaces.md § Conflict dialog),
 * shown inside a CDK overlay by ConflictDialogService. Two explicit actions — adopt the other
 * writer's version, or overwrite it with the local canvas. Dismissal (backdrop) is handled by
 * the service and leaves the canvas untouched; there is no silent auto-retry.
 */
@Component({
  selector: 'app-conflict-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog card shadow-elevated" role="alertdialog" aria-modal="true">
      <h3>This design changed elsewhere</h3>
      <p>
        Someone else — or another tab of yours — saved a newer version of this design since you
        opened it. Choose how to resolve it; your current canvas is untouched until you pick.
      </p>
      <div class="actions">
        <button type="button" class="btn ghost" (click)="chosen.emit('reload')">
          Reload their version
        </button>
        <button type="button" class="btn danger" (click)="chosen.emit('overwrite')">
          Overwrite with mine
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog {
        width: min(440px, 92vw);
        padding: 22px;
        background: var(--surface-raised);
      }
      h3 {
        margin: 0 0 8px;
      }
      p {
        margin: 0 0 20px;
        color: var(--text-secondary);
        line-height: 1.5;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .btn {
        padding: 8px 16px;
        border: 1px solid transparent;
        border-radius: var(--radius-control);
        font-weight: 600;
        cursor: pointer;
        background: var(--color-primary);
        color: var(--color-primary-contrast);
      }
      .btn.ghost {
        background: transparent;
        border-color: var(--border-strong);
        color: var(--text-primary);
      }
      .btn.danger {
        background: var(--color-danger);
        color: #fff;
      }
    `,
  ],
})
export class ConflictDialogComponent {
  @Output() chosen = new EventEmitter<ConflictChoice>();
}
