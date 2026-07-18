import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/** Presentational dialog card shown inside a CDK overlay by ConfirmDialogService. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog card shadow-elevated" role="alertdialog" aria-modal="true">
      <h3>{{ data.title }}</h3>
      <p>{{ data.message }}</p>
      <div class="actions">
        <button type="button" class="btn ghost" (click)="cancelled.emit()">
          {{ data.cancelLabel ?? 'Cancel' }}
        </button>
        <button
          type="button"
          class="btn"
          [class.danger]="data.danger"
          (click)="confirmed.emit()"
        >
          {{ data.confirmLabel ?? 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog {
        width: min(420px, 92vw);
        padding: 22px;
        background: var(--surface-raised);
      }
      h3 {
        margin: 0 0 8px;
      }
      p {
        margin: 0 0 20px;
        color: var(--text-secondary);
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
export class ConfirmDialogComponent {
  @Input() data!: ConfirmOptions;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
