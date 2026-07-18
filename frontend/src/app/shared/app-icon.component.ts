import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ICONS } from './icon.registry.js';

/** Renders a named inline SVG from the icon registry. Colored via `currentColor`. */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="app-icon" [innerHTML]="safe()" [attr.aria-hidden]="true"></span>`,
  styles: [
    `
      .app-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
    `,
  ],
})
export class AppIcon {
  private readonly sanitizer = inject(DomSanitizer);
  readonly name = input.required<string>();

  readonly safe = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] ?? ''),
  );
}
