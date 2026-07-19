import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { keyInterceptor } from './core/key.interceptor';
import { httpErrorInterceptor } from './core/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // keyInterceptor runs first: it attaches X-Access-Key and handles 401/429 auth outcomes
    // before httpErrorInterceptor turns any remaining error into a generic toast.
    provideHttpClient(withInterceptors([keyInterceptor, httpErrorInterceptor])),
  ],
};
