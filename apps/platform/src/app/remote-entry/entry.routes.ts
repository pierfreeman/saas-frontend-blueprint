import { Route } from '@angular/router';
import { inject } from '@angular/core';
import { API_BASE_URL } from '@org/shared/util-types';
import { MembershipsApi, MembershipsStore } from '@org/memberships/data-access';
import { BillingApi } from '@org/billing/data-access';
import { OrganizationsApi } from '@org/organizations/data-access';
import { ActivityLogApi } from '@org/activity-log/data-access';
import {
  NotificationsApi,
  NotificationsSocketService,
} from '@org/notifications/data-access';
import { StorageApi } from '@org/storage/data-access';
import {
  EntitlementsApi,
  EntitlementsStore,
} from '@org/entitlements/data-access';
import { PermissionsService } from '@org/shared/util-rbac';
import { AuthStore } from '@org/auth/data-access';
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
          import('@org/memberships/feature').then(
            (m) => m.FEATURE_MEMBERSHIPS_ROUTES,
          ),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('@org/organizations/feature-settings').then(
            (m) => m.FEATURE_ORG_SETTINGS_ROUTES,
          ),
      },
      {
        path: 'billing',
        loadChildren: () =>
          import('@org/billing/feature').then((m) => m.FEATURE_BILLING_ROUTES),
      },
      {
        path: 'activity-log',
        loadChildren: () =>
          import('@org/activity-log/feature').then(
            (m) => m.FEATURE_ACTIVITY_LOG_ROUTES,
          ),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('@org/notifications/feature').then(
            (m) => m.FEATURE_NOTIFICATIONS_ROUTES,
          ),
      },
      {
        path: 'storage',
        loadChildren: () =>
          import('@org/storage/feature').then((m) => m.FEATURE_STORAGE_ROUTES),
      },
    ],
  },
];
