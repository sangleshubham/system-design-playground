import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FFlowModule } from '@foblex/flow';
import type { StickyNote } from '../../../core/models.js';

/** An editable, movable sticky note (amber paper). Movement is handled by the fNode wrapper. */
@Component({
  selector: 'app-sticky-note',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FFlowModule],
  template: `
    @if (editing()) {
      <textarea
        #area
        fDragBlocker
        class="text"
        [value]="note().text"
        (blur)="commit(area.value)"
        (keydown.escape)="editing.set(false)"
      ></textarea>
    } @else {
      <div class="text view" (dblclick)="startEdit()" title="Double-click to edit">
        {{ note().text || 'Double-click to edit' }}
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 160px;
        min-height: 90px;
        padding: 10px;
        background: var(--color-badge-needed-bg);
        border: 1px solid var(--color-badge-needed-border);
        border-radius: 6px;
        box-shadow: var(--shadow-soft);
        color: var(--color-badge-needed-text);
        font-size: 0.82rem;
        cursor: grab;
      }
      .text {
        width: 100%;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .view {
        min-height: 70px;
      }
      textarea.text {
        min-height: 70px;
        resize: none;
        border: none;
        outline: none;
        background: transparent;
        font: inherit;
        color: inherit;
      }
    `,
  ],
})
export class StickyNoteComponent {
  readonly note = input.required<StickyNote>();
  readonly textChange = output<string>();
  readonly editing = signal(false);

  startEdit(): void {
    this.editing.set(true);
  }

  commit(value: string): void {
    this.editing.set(false);
    if (value !== this.note().text) {
      this.textChange.emit(value);
    }
  }
}
