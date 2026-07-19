import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';
import { KeyService } from './core/key.service';
import { maskKey } from './core/key-format';
import { ToastHost } from './shared/toast-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHost],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly keys = inject(KeyService);
  private readonly router = inject(Router);

  /** Masked stub for the workspace menu — last 4 characters only, never the full key (FR-005). */
  protected readonly maskedKey = computed(() => {
    const key = this.keys.key();
    return key ? maskKey(key) : '';
  });

  /** Forget the key on this device and return to the gate. No server call (FR-005). */
  protected switchKey(): void {
    this.keys.clear();
    void this.router.navigate(['/welcome']);
  }
}
