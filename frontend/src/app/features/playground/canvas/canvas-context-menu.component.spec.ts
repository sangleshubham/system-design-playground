import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { CanvasContextMenuComponent, type ContextMenuAction } from './canvas-context-menu.component';
import { PlaygroundStore } from '../state/playground.store';
import type { Component as Comp } from '../../../core/models';

const components: Comp[] = [
  { id: 'client', name: 'Client', tech: 'Browser', category: 'user', description: '', costPerHr: 0, latencyMs: 0, icon: 'user' },
];

describe('CanvasContextMenuComponent', () => {
  let store: PlaygroundStore;
  let container: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CanvasContextMenuComponent],
      providers: [PlaygroundStore],
    });
    store = TestBed.inject(PlaygroundStore);
    store.setCatalog(components);
    store.hydrate(null, null);
    container = TestBed.inject(OverlayContainer).getContainerElement();
  });

  function openMenu(zone: 'selection' | 'canvas') {
    const fixture = TestBed.createComponent(CanvasContextMenuComponent);
    fixture.componentRef.setInput('zone', zone);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  const buttons = () => Array.from(container.querySelectorAll<HTMLButtonElement>('.ctx-menu button'));
  const labels = () => buttons().map((b) => b.querySelector('.label')!.textContent!.trim());

  it('selection zone renders Copy, Duplicate, Delete', () => {
    openMenu('selection');
    expect(labels()).toEqual(['Copy', 'Duplicate', 'Delete']);
  });

  it('canvas zone renders Paste, Select All', () => {
    openMenu('canvas');
    expect(labels()).toEqual(['Paste', 'Select All']);
  });

  it('renders nothing while closed', () => {
    const fixture = TestBed.createComponent(CanvasContextMenuComponent);
    fixture.componentRef.setInput('zone', 'selection');
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(buttons()).toHaveLength(0);
  });

  it('selection-zone entries are disabled with no selection and enabled once something is selected', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    const fixture = openMenu('selection');
    expect(buttons().every((b) => b.disabled)).toBe(true); // nothing selected → canCopy false

    store.setSelection({ nodes: [store.nodes()[0].id], edges: [] });
    fixture.detectChanges();
    expect(buttons().every((b) => b.disabled)).toBe(false);
  });

  it('locked disables every selection-zone entry (FR-022)', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.setSelection({ nodes: [store.nodes()[0].id], edges: [] });
    store.toggleLock();
    openMenu('selection');
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });

  it('canvas zone: Paste disabled without a buffer, Select All enabled with canvas content', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    const fixture = openMenu('canvas');
    const [paste, selectAll] = buttons();
    expect(paste.disabled).toBe(true); // clipboard empty
    expect(selectAll.disabled).toBe(false); // canvas non-empty

    // Emptying the canvas disables Select All too (same menu re-reads the store reactively).
    store.hydrate(null, null);
    fixture.detectChanges();
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });

  it('emits the chosen action and then closes', () => {
    store.addNodeFromPalette('client', { x: 0, y: 0 });
    store.setSelection({ nodes: [store.nodes()[0].id], edges: [] });
    const fixture = openMenu('selection');

    const actions: ContextMenuAction[] = [];
    let closedCount = 0;
    fixture.componentInstance.action.subscribe((a) => actions.push(a));
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    buttons()[1].click(); // Duplicate
    expect(actions).toEqual(['duplicate']);
    expect(closedCount).toBe(1);
  });
});
