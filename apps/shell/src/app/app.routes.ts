import { authGuard, orgGuard } from '@saas-frontend/shared/util-auth';
import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    // Auth remote: no shell layout (full-screen login/callback)
    path: 'auth',
    loadChildren: () => import('auth/Routes').then((m) => m.AUTH_ROUTES),
  },
  {
    // All authenticated routes share the shell layout (navbar + main)
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell-layout.component').then(
        (m) => m.ShellLayoutComponent,
      ),
    children: [
      {
        path: 'org/select',
        loadComponent: () =>
          import('./org-select/org-select.component').then(
            (m) => m.OrgSelectComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [orgGuard],
        loadChildren: () => import('admin/Routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: '',
        canActivate: [orgGuard],
        loadChildren: () =>
          import('platform/Routes').then((m) => m.PLATFORM_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
