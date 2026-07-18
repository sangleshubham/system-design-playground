import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HomePage } from './home.page';
import { ProgressApi } from '../../core/api/progress.api';
import type { HomeView } from '../../core/models';

function textOf(el: HTMLElement): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function setup(home: HomeView) {
  TestBed.configureTestingModule({
    imports: [HomePage],
    providers: [provideRouter([]), { provide: ProgressApi, useValue: { getProgress: () => of(home) } }],
  });
  const fixture = TestBed.createComponent(HomePage);
  fixture.detectChanges();
  return fixture;
}

describe('HomePage', () => {
  it('renders lab progress, the continue card, and the recommended card from progress', () => {
    const fixture = setup({
      lab: { completed: 3, levels: 12, percent: 25 },
      continue: { levelId: 'level-4', title: 'Rate Limiter', updatedAt: new Date().toISOString() },
      recommendedNext: { levelId: 'level-4', title: 'Rate Limiter' },
    });
    const text = textOf(fixture.nativeElement);
    expect(text).toContain('3/12 completed');
    expect(text).toContain('25% complete');
    expect(text).toContain('Continue where you left off');
    expect(text).toContain('Rate Limiter');
    expect(text).toContain('Recommended next');
    // A one-click resume link points straight at the playground (FR-029 / SC-001).
    const resumeLink = fixture.nativeElement.querySelector('a.continue');
    expect(resumeLink.getAttribute('href')).toBe('/playground/level-4');
  });

  it('hides continue and recommended cards gracefully when null', () => {
    const fixture = setup({
      lab: { completed: 0, levels: 12, percent: 0 },
      continue: null,
      recommendedNext: null,
    });
    const text = textOf(fixture.nativeElement);
    expect(text).not.toContain('Continue where you left off');
    expect(text).not.toContain('Recommended next');
    // The sandbox link is always present.
    expect(fixture.nativeElement.querySelector('a.sandbox')).not.toBeNull();
  });
});
