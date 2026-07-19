import { Routes } from '@angular/router';
import { keyGuard, noKeyGuard } from './core/key.guard';

/** Route-level code splitting is mandatory (constitution Principle V). */
export const routes: Routes = [
  {
    // Lazy auth gate — a stored key bounces away to the app (noKeyGuard). Never carries the key in its URL.
    path: 'welcome',
    canActivate: [noKeyGuard],
    loadComponent: () => import('./features/welcome/welcome.page').then((m) => m.WelcomePage),
    title: 'Welcome — System Design Playground',
  },
  {
    path: '',
    canActivate: [keyGuard],
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
    title: 'System Design Playground',
  },
  {
    path: 'lab',
    canActivate: [keyGuard],
    loadComponent: () => import('./features/lab-map/lab-map.page').then((m) => m.LabMapPage),
    title: 'Architecture Lab',
  },
  {
    path: 'playground/:levelId',
    canActivate: [keyGuard],
    loadComponent: () =>
      import('./features/playground/playground.page').then((m) => m.PlaygroundPage),
    title: 'Playground',
  },
  {
    path: 'sandbox',
    canActivate: [keyGuard],
    loadComponent: () =>
      import('./features/sandbox/sandbox-list.page').then((m) => m.SandboxListPage),
    title: 'Sandbox',
  },
  {
    path: 'sandbox/:designId',
    canActivate: [keyGuard],
    loadComponent: () => import('./features/sandbox/sandbox.page').then((m) => m.SandboxPage),
    title: 'Sandbox',
  },
  { path: '**', redirectTo: '' },
];
