import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'sdp-theme';

/**
 * Theme is a pure client concern (FR-031): a `data-theme` attribute on <html> plus a
 * localStorage preference. index.html applies it before first paint to avoid a flash;
 * this service keeps it in sync and offers a toggle.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  readonly theme = signal<Theme>(this.readInitial());

  constructor() {
    effect(() => {
      const t = this.theme();
      this.doc.documentElement.setAttribute('data-theme', t);
      try {
        this.doc.defaultView?.localStorage.setItem(STORAGE_KEY, t);
      } catch {
        // localStorage may be unavailable; theme still applies for the session.
      }
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  private readInitial(): Theme {
    const attr = this.doc.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    try {
      const stored = this.doc.defaultView?.localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {
      /* ignore */
    }
    return 'light';
  }
}
