import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { Autosaver } from './autosave';

describe('Autosaver (debounce + flush)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces rapid changes into a single save after the debounce window', () => {
    const save = vi.fn(() => of({ updatedAt: 'x' }));
    const a = new Autosaver(save, 2000);

    a.notifyDirty();
    a.notifyDirty();
    a.notifyDirty();
    expect(save).not.toHaveBeenCalled();
    expect(a.status()).toBe('saving');

    vi.advanceTimersByTime(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(a.status()).toBe('saved');
  });

  it('does nothing while idle', () => {
    const save = vi.fn(() => of({ updatedAt: 'x' }));
    const a = new Autosaver(save, 2000);
    vi.advanceTimersByTime(5000);
    expect(save).not.toHaveBeenCalled();
    expect(a.status()).toBe('idle');
  });

  it('flush() saves immediately and cancels the pending debounce (no double save)', () => {
    const save = vi.fn(() => of({ updatedAt: 'x' }));
    const a = new Autosaver(save, 2000);

    a.notifyDirty();
    a.flush().subscribe();
    expect(save).toHaveBeenCalledTimes(1);
    expect(a.status()).toBe('saved');

    vi.advanceTimersByTime(2000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flush() is a no-op that still completes when there are no unsaved changes', () => {
    const save = vi.fn(() => of({ updatedAt: 'x' }));
    const a = new Autosaver(save, 2000);

    let completed = false;
    a.flush().subscribe({ complete: () => (completed = true) });
    expect(save).not.toHaveBeenCalled();
    expect(completed).toBe(true);
  });

  it('re-arms after a save so a later change schedules another save', () => {
    const save = vi.fn(() => of({ updatedAt: 'x' }));
    const a = new Autosaver(save, 2000);

    a.notifyDirty();
    vi.advanceTimersByTime(2000);
    expect(save).toHaveBeenCalledTimes(1);

    a.notifyDirty();
    vi.advanceTimersByTime(2000);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
