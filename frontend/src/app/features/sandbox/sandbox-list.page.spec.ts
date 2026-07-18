import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SandboxListPage } from './sandbox-list.page';
import { SandboxApi } from '../../core/api/sandbox.api';
import type { SandboxSummary } from '../../core/models';

const designs: SandboxSummary[] = [
  { id: 'a', name: 'Event Pipeline', updatedAt: new Date().toISOString(), nodeCount: 5 },
  { id: 'b', name: 'Chat Backbone', updatedAt: new Date().toISOString(), nodeCount: 2 },
];

function textOf(el: HTMLElement): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('SandboxListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SandboxListPage],
      providers: [provideRouter([]), { provide: SandboxApi, useValue: { list: () => of(designs) } }],
    });
  });

  it('renders each design with its name and node count', () => {
    const fixture = TestBed.createComponent(SandboxListPage);
    fixture.detectChanges();
    const text = textOf(fixture.nativeElement);
    expect(text).toContain('Event Pipeline');
    expect(text).toContain('5 nodes');
    expect(text).toContain('Chat Backbone');
    expect(text).toContain('2 nodes');
  });

  it('shows the empty state when there are no designs', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SandboxListPage],
      providers: [provideRouter([]), { provide: SandboxApi, useValue: { list: () => of([]) } }],
    });
    const fixture = TestBed.createComponent(SandboxListPage);
    fixture.detectChanges();
    expect(textOf(fixture.nativeElement)).toContain('No designs yet');
  });
});
