import { inject } from '@angular/core';
import { authGuard, orgGuard } from '@saas-frontend/shared/util-auth';
import { Route } from '@angular/router';
import { RemoteConfigService } from './remote-config.service';

export const appRoutes: Route[] = [
  {
    // Auth remote: no shell layout (full-screen login/callback)
    path: 'auth',
    /* v8 ignore next 3 */
    loadChildren: () =>
      inject(RemoteConfigService).loadRoutes('auth', () =>
        import('auth/Routes').then((m) => m.AUTH_ROUTES),
      ),
  },
  {
    // All authenticated routes share the shell layout (navbar + main)
    path: '',
    canActivate: [authGuard],
    /* v8 ignore next 3 */
    loadComponent: () =>
      import('./layout/shell-layout.component').then(
        (m) => m.ShellLayoutComponent,
      ),
    children: [
      {
        path: 'org/select',
        /* v8 ignore next 3 */
        loadComponent: () =>
          import('./org-select/org-select.component').then(
            (m) => m.OrgSelectComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [orgGuard],
        /* v8 ignore next 3 */
        loadChildren: () =>
          inject(RemoteConfigService).loadRoutes('admin', () =>
            import('admin/Routes').then((m) => m.ADMIN_ROUTES),
          ),
      },
      {
        path: '',
        canActivate: [orgGuard],
        /* v8 ignore next 3 */
        loadChildren: () =>
          inject(RemoteConfigService).loadRoutes('platform', () =>
            import('platform/Routes').then((m) => m.PLATFORM_ROUTES),
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
