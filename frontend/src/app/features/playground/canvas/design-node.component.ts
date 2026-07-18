import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FFlowModule } from '@foblex/flow';
import { AppIcon } from '../../../shared/app-icon.component.js';
import { componentIconName } from '../../../shared/component-icon.registry.js';
import type { Component as CatalogComponent, DesignNode } from '../../../core/models.js';

/**
 * A single design node: a category-colored card with an input connector (left) and an
 * output connector (right). Double-click the label to rename (Enter commits, Esc cancels;
 * componentId is never changed — FR-016). The note affordance edits the per-node note.
 * (T031 renders + connectors; T039 adds rename + note.)
 */
@Component({
  selector: 'app-design-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FFlowModule, AppIcon],
  template: `
    <div class="conn conn-in" fNodeInput [fInputId]="inId()" fInputMultiple fInputConnectableSide="left"></div>

    <div class="card" [attr.data-category]="category()">
      <span class="icon"><app-icon [name]="iconName()" /></span>
      <div class="body">
        @if (editing()) {
          <input
            #renameInput
            fDragBlocker
            class="rename"
            [value]="node().displayName"
            (keydown.enter)="commitRename(renameInput.value)"
            (keydown.escape)="editing.set(false)"
            (blur)="commitRename(renameInput.value)"
          />
        } @else {
          <div class="name" (dblclick)="startRename()" title="Double-click to rename">
            {{ node().displayName }}
          </div>
        }
        <div class="tech">{{ component()?.tech }}</div>
      </div>
      <button
        type="button"
        fDragBlocker
        class="note-btn"
        [class.has-note]="!!node().note"
        (click)="toggleNote()"
        title="Note"
        aria-label="Edit note"
      >
        <app-icon name="note" />
      </button>
    </div>

    @if (noteOpen()) {
      <div class="note-popover" fDragBlocker>
        <textarea
          #noteArea
          [value]="node().note"
          placeholder="Add a note…"
          (blur)="commitNote(noteArea.value)"
        ></textarea>
      </div>
    }

    <div class="conn conn-out" fNodeOutput [fOutputId]="outId()" fOutputMultiple fOutputConnectableSide="right"></div>
  `,
  styleUrl: './design-node.component.scss',
})
export class DesignNodeComponent {
  readonly node = input.required<DesignNode>();
  readonly component = input<CatalogComponent | undefined>(undefined);

  readonly rename = output<string>();
  readonly noteChange = output<string>();

  readonly editing = signal(false);
  readonly noteOpen = signal(false);
  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  readonly category = computed(() => this.component()?.category ?? 'services');
  readonly iconName = computed(() => componentIconName(this.component()?.icon ?? '', this.category()));
  readonly inId = computed(() => `${this.node().id}__in`);
  readonly outId = computed(() => `${this.node().id}__out`);

  startRename(): void {
    this.editing.set(true);
    setTimeout(() => {
      const el = this.renameInput()?.nativeElement;
      el?.focus();
      el?.select();
    });
  }

  commitRename(value: string): void {
    if (!this.editing()) return;
    this.editing.set(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== this.node().displayName) {
      this.rename.emit(trimmed);
    }
  }

  toggleNote(): void {
    this.noteOpen.update((v) => !v);
  }

  commitNote(value: string): void {
    this.noteOpen.set(false);
    if (value !== this.node().note) {
      this.noteChange.emit(value);
    }
  }
}
