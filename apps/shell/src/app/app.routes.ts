import { authGuard } from './app.guard';
import { orgGuard } from './org.guard';
import { NxWelcome } from './nx-welcome';
import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'auth',
    loadChildren: () => import('auth/Routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'org/select',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./org-select/org-select.component').then(
        (m) => m.OrgSelectComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [authGuard, orgGuard],
    loadChildren: () => import('admin/Routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard, orgGuard],
    loadChildren: () =>
      import('platform/Routes').then((m) => m.PLATFORM_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
