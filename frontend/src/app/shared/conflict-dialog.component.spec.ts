import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConflictDialogComponent, type ConflictChoice } from './conflict-dialog.component';

function textOf(el: HTMLElement): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('ConflictDialogComponent', () => {
  it('renders both choices and emits the chosen action', () => {
    const fixture = TestBed.createComponent(ConflictDialogComponent);
    fixture.detectChanges();

    const text = textOf(fixture.nativeElement);
    expect(text).toContain('Reload their version');
    expect(text).toContain('Overwrite');

    const emitted: ConflictChoice[] = [];
    fixture.componentInstance.chosen.subscribe((c) => emitted.push(c));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const reload = buttons.find((b) => (b.textContent ?? '').includes('Reload'))!;
    const overwrite = buttons.find((b) => (b.textContent ?? '').includes('Overwrite'))!;

    reload.click();
    overwrite.click();
    expect(emitted).toEqual(['reload', 'overwrite']);
  });
});
