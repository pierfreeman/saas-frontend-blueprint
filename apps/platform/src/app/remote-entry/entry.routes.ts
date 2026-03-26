import { Route } from '@angular/router';
import { inject } from '@angular/core';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { MembershipsApi, MembershipsStore } from '@saas-frontend/memberships/data-access';
import { BillingApi } from '@saas-frontend/billing/data-access';
import { OrganizationsApi } from '@saas-frontend/organizations/data-access';
import { ActivityLogApi } from '@saas-frontend/activity-log/data-access';
import {
  NotificationsApi,
  NotificationsSocketService,
} from '@saas-frontend/notifications/data-access';
import { StorageApi } from '@saas-frontend/storage/data-access';
import {
  EntitlementsApi,
  EntitlementsStore,
} from '@saas-frontend/entitlements/data-access';
import { PermissionsService } from '@saas-frontend/shared/util-rbac';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { environment } from 'src/environments/environment';

/**
 * Syncs the authenticated user's DB UUID into MembershipsStore so that
 * currentUserRole() — and therefore PermissionsService — resolve correctly
 * for every platform route.
 */
function syncCurrentUser(): boolean {
  const authStore = inject(AuthStore);
  const membershipsStore = inject(MembershipsStore);
  membershipsStore.setCurrentUserId(authStore.currentUser()?.id ?? null);
  return true;
}

export const PLATFORM_ROUTES: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    // Anonymous route group: provides API_BASE_URL and API services using the
    // platform bundle's token instances (avoids MF token identity mismatch).
    path: '',
    canActivate: [syncCurrentUser],
    providers: [
      { provide: API_BASE_URL, useValue: environment.apiUrl },
      MembershipsApi,
      MembershipsStore,
      BillingApi,
      OrganizationsApi,
      ActivityLogApi,
      NotificationsApi,
      NotificationsSocketService,
      EntitlementsApi,
      EntitlementsStore,
      StorageApi,
      PermissionsService,
    ],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'members',
        loadChildren: () =>
          import('@saas-frontend/memberships/feature').then(
            (m) => m.FEATURE_MEMBERSHIPS_ROUTES,
          ),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('@saas-frontend/organizations/feature-settings').then(
            (m) => m.FEATURE_ORG_SETTINGS_ROUTES,
          ),
      },
      {
        path: 'billing',
        loadChildren: () =>
          import('@saas-frontend/billing/feature').then((m) => m.FEATURE_BILLING_ROUTES),
      },
      {
        path: 'activity-log',
        loadChildren: () =>
          import('@saas-frontend/activity-log/feature').then(
            (m) => m.FEATURE_ACTIVITY_LOG_ROUTES,
          ),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('@saas-frontend/notifications/feature').then(
            (m) => m.FEATURE_NOTIFICATIONS_ROUTES,
          ),
      },
      {
        path: 'storage',
        loadChildren: () =>
          import('@saas-frontend/storage/feature').then((m) => m.FEATURE_STORAGE_ROUTES),
      },
    ],
  },
];
