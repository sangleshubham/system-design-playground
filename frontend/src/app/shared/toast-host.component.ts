import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service.js';
import { AppIcon } from './app-icon.component.js';

/** Renders the ToastService queue in a fixed bottom-right stack. */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [attr.data-kind]="t.kind">
          <span class="msg">{{ t.message }}</span>
          <button type="button" class="dismiss" aria-label="Dismiss" (click)="toasts.dismiss(t.id)">
            <app-icon name="close" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        right: 16px;
        bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 1000;
        max-width: 360px;
      }
      .toast {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: var(--radius-control);
        background: var(--surface-raised);
        border: 1px solid var(--border-subtle);
        border-left: 4px solid var(--color-primary);
        box-shadow: var(--shadow-elevated);
        cursor: pointer;
        animation: slide-in 0.18s ease;
      }
      .toast[data-kind='error'] {
        border-left-color: var(--color-danger);
      }
      .toast[data-kind='success'] {
        border-left-color: var(--color-success);
      }
      .msg {
        flex: 1;
        font-size: 0.85rem;
        color: var(--text-primary);
      }
      .dismiss {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        display: inline-flex;
      }
      @keyframes slide-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ToastHost {
  readonly toasts = inject(ToastService);
}
