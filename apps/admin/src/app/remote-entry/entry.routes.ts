import { Route } from '@angular/router';

export const ADMIN_ROUTES: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
  },
];
