import { Routes } from '@angular/router';

/** Route-level code splitting is mandatory (constitution Principle V). */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
    title: 'System Design Playground',
  },
  {
    path: 'lab',
    loadComponent: () => import('./features/lab-map/lab-map.page').then((m) => m.LabMapPage),
    title: 'Architecture Lab',
  },
  {
    path: 'playground/:levelId',
    loadComponent: () =>
      import('./features/playground/playground.page').then((m) => m.PlaygroundPage),
    title: 'Playground',
  },
  {
    path: 'sandbox',
    loadComponent: () =>
      import('./features/sandbox/sandbox-list.page').then((m) => m.SandboxListPage),
    title: 'Sandbox',
  },
  {
    path: 'sandbox/:designId',
    loadComponent: () => import('./features/sandbox/sandbox.page').then((m) => m.SandboxPage),
    title: 'Sandbox',
  },
  { path: '**', redirectTo: '' },
];
