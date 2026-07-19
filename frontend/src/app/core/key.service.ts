import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

/** localStorage slot holding the raw access key for this device (data-model.md). */
export const KEY_STORAGE_KEY = 'sdp.accessKey';

/**
 * Owns the device session (research R8, FR-005). The raw access key lives in localStorage so
 * it survives restarts and is origin-scoped; an in-memory signal mirrors it and drives the
 * route guards. This is the ONLY place the key is read from or written to storage — the key
 * never appears in URLs (FR-012).
 */
@Injectable({ providedIn: 'root' })
export class KeyService {
  private readonly doc = inject(DOCUMENT);
  private readonly _key = signal<string | null>(this.readStored());

  /** The stored key, or null when this device has none. */
  readonly key = this._key.asReadonly();
  /** True once a key is stored — the signal the guards react to. */
  readonly hasKey = computed(() => this._key() !== null);

  /** Persist a newly created or entered key (only after the server confirmed it). */
  setKey(key: string): void {
    this._key.set(key);
    this.write(key);
  }

  /** Forget the key on this device (Switch key / 401 invalid_key). Server data is untouched. */
  clear(): void {
    this._key.set(null);
    this.write(null);
  }

  private readStored(): string | null {
    try {
      return this.doc.defaultView?.localStorage.getItem(KEY_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string | null): void {
    try {
      const storage = this.doc.defaultView?.localStorage;
      if (!storage) return;
      if (key === null) storage.removeItem(KEY_STORAGE_KEY);
      else storage.setItem(KEY_STORAGE_KEY, key);
    } catch {
      // Storage may be unavailable (private mode); the in-memory signal still holds for the session.
    }
  }
}
