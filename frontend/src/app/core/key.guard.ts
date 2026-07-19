import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { KeyService } from './key.service.js';

/**
 * Gate on every feature route (FR-001/FR-002): a keyless visitor is redirected to the welcome
 * screen. The check is synchronous — the KeyService signal is hydrated from localStorage at
 * construction, so there is no flash of protected content.
 */
export const keyGuard: CanActivateFn = () => {
  const keys = inject(KeyService);
  const router = inject(Router);
  return keys.hasKey() ? true : router.createUrlTree(['/welcome']);
};

/** Inverse guard for /welcome: a visitor who already holds a key is bounced to the app. */
export const noKeyGuard: CanActivateFn = () => {
  const keys = inject(KeyService);
  const router = inject(Router);
  return keys.hasKey() ? router.createUrlTree(['/']) : true;
};
