import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthApi } from '../../core/api/auth.api.js';
import { KeyService } from '../../core/key.service.js';
import { canonicalKey, groupKey } from '../../core/key-format.js';
import type { ApiErrorBody } from '../../core/models.js';

type View = 'choice' | 'reveal';

/**
 * The lazy auth gate (contracts/ui-auth-surfaces.md, FR-001/FR-002/FR-004/FR-007). Two equal
 * actions — create a new key (→ one-time reveal) or enter an existing key (probed via
 * GET /auth/session before it is ever stored). The key is persisted through KeyService only
 * after an explicit acknowledgement (create) or a 200 probe (enter).
 */
@Component({
  selector: 'app-welcome-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './welcome.page.html',
  styleUrl: './welcome.page.scss',
})
export class WelcomePage {
  private readonly auth = inject(AuthApi);
  private readonly keys = inject(KeyService);
  private readonly router = inject(Router);

  readonly view = signal<View>('choice');
  readonly enterOpen = signal(false);

  // Create flow
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly revealedKey = signal('');
  readonly copied = signal(false);

  // Enter flow
  readonly entryValue = signal('');
  readonly checking = signal(false);
  readonly enterError = signal<string | null>(null);

  /** Create a new workspace and move to the reveal state. */
  createKey(): void {
    if (this.creating()) return;
    this.creating.set(true);
    this.createError.set(null);
    this.auth.createKey().subscribe({
      next: (res) => {
        this.revealedKey.set(res.key);
        this.view.set('reveal');
        this.creating.set(false);
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(this.messageFor(err, 'Could not create a key. Please try again.'));
      },
    });
  }

  /** Instant (<100 ms) local copy confirmation; the async clipboard write rides behind it. */
  copyKey(): void {
    const key = this.revealedKey();
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
    void navigator.clipboard?.writeText(key).catch(() => {
      /* Clipboard may be blocked; the key is still visible to copy manually. */
    });
  }

  /** Persist the revealed key only after the user confirms they saved it, then enter the app. */
  acknowledgeAndStart(): void {
    this.keys.setKey(canonicalKey(this.revealedKey()));
    void this.router.navigate(['/']);
  }

  toggleEnter(): void {
    this.enterOpen.update((v) => !v);
    this.enterError.set(null);
  }

  /** Live normalization + auto-grouping as the user types (paste-friendly). */
  onEntryInput(raw: string): void {
    this.entryValue.set(groupKey(raw));
    this.enterError.set(null);
  }

  /** Probe the entered key; persist + enter only on a 200 (FR-006/FR-007). */
  submitKey(): void {
    if (this.checking()) return;
    const candidate = canonicalKey(this.entryValue());
    if (candidate.length !== 12) {
      this.enterError.set('A key is 12 characters, shown as XXXX-XXXX-XXXX.');
      return;
    }
    this.checking.set(true);
    this.enterError.set(null);
    this.auth.getSession(candidate).subscribe({
      next: () => {
        this.keys.setKey(candidate);
        this.checking.set(false);
        void this.router.navigate(['/']);
      },
      error: (err: unknown) => {
        this.checking.set(false);
        // Nothing is persisted on failure (FR-007).
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.enterError.set("That key doesn't match any workspace — check it and try again.");
        } else if (err instanceof HttpErrorResponse && err.status === 429) {
          this.enterError.set('Too many attempts. Please wait a minute and try again.');
        } else {
          this.enterError.set('Could not reach the server. Please check your connection and retry.');
        }
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 429) return 'Too many new keys from here. Please wait a minute and try again.';
      const body = err.error as ApiErrorBody | null;
      return body?.error?.message ?? fallback;
    }
    return fallback;
  }
}
