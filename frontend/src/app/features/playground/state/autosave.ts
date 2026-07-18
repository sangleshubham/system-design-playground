/**
 * Debounced autosave for a design canvas (T047, FR-027). The core `Autosaver` is a
 * framework-agnostic debouncer (unit-tested for debounce + flush); `createAutosave` wires
 * it to a PlaygroundStore via an Angular effect, flushes on tab-hide and route teardown,
 * and re-baselines on `prime()` so a fresh hydrate never triggers a spurious save.
 *
 * RUN flushes through the same path (`flush()`), so the evaluated design always matches
 * the canvas (contract: RUN scores the saved design).
 */
import { DestroyRef, type Signal, effect, inject, signal } from '@angular/core';
import { type Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import type { PlaygroundStore } from './playground.store.js';

export type SaveStatus = 'idle' | 'saving' | 'saved';

export const AUTOSAVE_DEBOUNCE_MS = 2000;

export interface AutosaveHandle {
  /** 'idle' before any save, 'saving' while a change is pending/in-flight, 'saved' after success. */
  readonly status: Signal<SaveStatus>;
  /** Persist immediately if there are unsaved changes; completes when the save settles. */
  flush(): Observable<void>;
  /** Re-baseline: the next graph change from a hydrate is treated as the clean starting point. */
  prime(): void;
}

/** The pure debouncer. No Angular dependency beyond `signal`, so it unit-tests with fake timers. */
export class Autosaver {
  readonly status = signal<SaveStatus>('idle');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor(
    private readonly save: () => Observable<unknown>,
    private readonly debounceMs = AUTOSAVE_DEBOUNCE_MS,
  ) {}

  /** Mark the canvas dirty and (re)start the debounce window. */
  notifyDirty(): void {
    this.dirty = true;
    this.status.set('saving');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.persist().subscribe(), this.debounceMs);
  }

  /** Save now if dirty; returns an observable that completes when the save settles. */
  flush(): Observable<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return this.dirty ? this.persist() : of(undefined);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private persist(): Observable<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.dirty = false;
    this.status.set('saving');
    return this.save().pipe(
      map(() => undefined),
      tap({ next: () => this.status.set('saved') }),
      // Errors surface via the HTTP interceptor's toast; keep the stream alive.
      catchError(() => {
        this.status.set('idle');
        return of(undefined);
      }),
    );
  }
}

/**
 * Wire an Autosaver to a store. Must be called in an injection context (component
 * constructor) so `inject(DestroyRef)` and `effect` resolve.
 */
export function createAutosave(
  store: PlaygroundStore,
  save: () => Observable<unknown>,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
): AutosaveHandle {
  const autosaver = new Autosaver(save, debounceMs);
  const destroyRef = inject(DestroyRef);
  let primed = false;

  const ref = effect(() => {
    // Track every persisted graph signal.
    store.nodes();
    store.edges();
    store.stickyNotes();
    store.revealedHintCount();
    if (!primed) {
      primed = true; // first run (and each post-hydrate run after prime()) is the baseline
      return;
    }
    autosaver.notifyDirty();
  });

  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') autosaver.flush().subscribe();
  };
  document.addEventListener('visibilitychange', onVisibility);

  destroyRef.onDestroy(() => {
    ref.destroy();
    document.removeEventListener('visibilitychange', onVisibility);
    autosaver.flush().subscribe(); // persist pending edits on route deactivation
    autosaver.dispose();
  });

  return {
    status: autosaver.status,
    flush: () => autosaver.flush(),
    prime: () => {
      primed = false;
    },
  };
}
