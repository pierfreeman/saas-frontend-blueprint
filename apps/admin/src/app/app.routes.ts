import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';
import { AdminLoginComponent } from './auth/admin-login.component';
import { AdminCallbackComponent } from './auth/admin-callback.component';

export const appRoutes: Route[] = [
  // Public routes
  { path: 'login', component: AdminLoginComponent },
  { path: 'auth/callback', component: AdminCallbackComponent },

  // Protected admin routes — require Auth0 authentication
  {
    path: '',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./remote-entry/entry.routes').then((m) => m.ADMIN_ROUTES),
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
