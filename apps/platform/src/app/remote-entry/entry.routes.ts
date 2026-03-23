import { Route } from '@angular/router';

export const PLATFORM_ROUTES: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('../settings/settings.component').then((m) => m.SettingsComponent),
  },
];
