import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AlignmentGuidesComponent } from './alignment-guides.component';
import type { AlignmentGuide } from './alignment-guides';

const vertical: AlignmentGuide = {
  orientation: 'vertical',
  position: 120,
  start: 40,
  end: 200,
  kind: 'edge',
};
const horizontalCenter: AlignmentGuide = {
  orientation: 'horizontal',
  position: 80,
  start: 10,
  end: 300,
  kind: 'center',
};

describe('AlignmentGuidesComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AlignmentGuidesComponent] });
  });

  function render(guides: AlignmentGuide[]) {
    const fixture = TestBed.createComponent(AlignmentGuidesComponent);
    fixture.componentRef.setInput('guides', guides);
    fixture.detectChanges();
    return fixture;
  }

  const lines = (el: HTMLElement) => el.querySelectorAll<HTMLElement>('.guide');

  it('renders one line per guide', () => {
    const fixture = render([vertical, horizontalCenter]);
    expect(lines(fixture.nativeElement)).toHaveLength(2);
  });

  it('renders nothing for an empty input', () => {
    const fixture = render([]);
    expect(lines(fixture.nativeElement)).toHaveLength(0);
  });

  it('clears the lines when the input empties', () => {
    const fixture = render([vertical]);
    expect(lines(fixture.nativeElement)).toHaveLength(1);

    fixture.componentRef.setInput('guides', []);
    fixture.detectChanges();
    expect(lines(fixture.nativeElement)).toHaveLength(0);
  });

  it('positions a vertical guide at its canvas coords under the identity transform', () => {
    const [line] = Array.from(lines(render([vertical]).nativeElement));
    // Identity transform: left ≈ position (minus half the 1.5px thickness), height = end - start.
    expect(line.style.left).toBe('119.25px');
    expect(line.style.top).toBe('40px');
    expect(line.style.height).toBe('160px');
    expect(line.style.width).toBe('1.5px');
  });

  it('tags center guides so the styling hook (dashed) can apply', () => {
    const [line] = Array.from(lines(render([horizontalCenter]).nativeElement));
    expect(line.classList.contains('center')).toBe(true);
    expect(line.classList.contains('horizontal')).toBe(true);
  });

  it('applies the canvas→screen transform (scale + offset) to guide coordinates', () => {
    const fixture = TestBed.createComponent(AlignmentGuidesComponent);
    fixture.componentRef.setInput('guides', [vertical]);
    fixture.componentRef.setInput('transform', { scale: 2, x: 10, y: 5 });
    fixture.detectChanges();
    const [line] = Array.from(lines(fixture.nativeElement));
    // left = x + position*scale - thickness/2 = 10 + 120*2 - 0.75 = 249.25
    expect(line.style.left).toBe('249.25px');
    // top = y + start*scale = 5 + 40*2 = 85 ; height = (end-start)*scale = 160*2 = 320
    expect(line.style.top).toBe('85px');
    expect(line.style.height).toBe('320px');
  });
});
