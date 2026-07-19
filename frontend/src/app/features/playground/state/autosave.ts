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
import { type Observable, from, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import type { PlaygroundStore } from './playground.store.js';
import type { Design } from '../../../core/models.js';
import { StaleWriteError } from '../../../core/stale-write.js';

export type SaveStatus = 'idle' | 'saving' | 'saved';

export const AUTOSAVE_DEBOUNCE_MS = 2000;

/** Resolve a 409 stale_write (FR-011): open the dialog, then reload/overwrite/dismiss. */
export type ConflictHandler = (current: Design) => Promise<void>;

export interface CreateAutosaveOptions {
  debounceMs?: number;
  onConflict?: ConflictHandler;
}

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
  // Set while a stale-write conflict is being resolved: no autosave fires until it settles,
  // so the dialog is never raised twice concurrently and no silent retry slips through (T024).
  private paused = false;

  constructor(
    private readonly save: () => Observable<unknown>,
    private readonly debounceMs = AUTOSAVE_DEBOUNCE_MS,
    private readonly onConflict?: ConflictHandler,
  ) {}

  /** Mark the canvas dirty and (re)start the debounce window. */
  notifyDirty(): void {
    if (this.paused) return;
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
    if (this.paused) return of(undefined);
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
      catchError((err: unknown) => {
        // Stale write: hand off to the conflict handler and pause autosave until it resolves.
        if (err instanceof StaleWriteError && this.onConflict) {
          this.paused = true;
          this.status.set('idle');
          return from(this.onConflict(err.current)).pipe(
            map(() => undefined),
            catchError(() => of(undefined)),
            finalize(() => {
              this.paused = false;
            }),
          );
        }
        // Other errors surface via the HTTP interceptor's toast; keep the stream alive.
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
  options: CreateAutosaveOptions = {},
): AutosaveHandle {
  const autosaver = new Autosaver(save, options.debounceMs ?? AUTOSAVE_DEBOUNCE_MS, options.onConflict);
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
