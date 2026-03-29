import { Route } from '@angular/router';
import { inject } from '@angular/core';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import {
  MembershipsApi,
  MembershipsStore,
} from '@saas-frontend/memberships/data-access';
import { BillingApi } from '@saas-frontend/billing/data-access';
import {
  OrganizationsApi,
  OrganizationsStore,
} from '@saas-frontend/organizations/data-access';
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
import {
  PlanningApi,
  PlanningStore,
} from '@saas-frontend/planning/data-access';
import { PermissionsService } from '@saas-frontend/shared/util-rbac';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { OrgContextService } from '@saas-frontend/shared/util-org-context';
import { environment } from 'src/environments/environment';

/**
 * Syncs the authenticated user's DB UUID into MembershipsStore, loads their
 * memberships so that currentUserRole() resolves, and propagates the role to
 * the root-level OrgContextService so the navbar can conditionally show/hide
 * the Organisation Settings link.
 */
async function syncCurrentUser(): Promise<boolean> {
  const authStore = inject(AuthStore);
  const membershipsStore = inject(MembershipsStore);
  const orgsStore = inject(OrganizationsStore);
  const orgContext = inject(OrgContextService); // root instance — not in route providers

  const userId = authStore.currentUser()?.id ?? null;
  membershipsStore.setCurrentUserId(userId);

  // Load memberships for the active org if not already loaded.
  const orgId = orgsStore.activeOrgId();
  if (orgId && membershipsStore.memberships().length === 0) {
    await membershipsStore.loadMemberships(orgId);
  }

  // Propagate role to root OrgContextService so the shell navbar can react.
  orgContext.setNavRole(membershipsStore.currentUserRole());

  return true;
}

/**
 * Guard for org-management routes (Organization, Members, Billing, Activity Log).
 * Redirects to dashboard if the current user does not have OWNER or ADMIN role.
 */
function requireOrgManage(): boolean {
  return inject(OrgContextService).canManageOrg();
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
      PlanningApi,
      PlanningStore,
      PermissionsService,
    ],
    children: [
      {
        path: 'dashboard',
        /* v8 ignore next 3 */
        loadComponent: () =>
          import('../dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'storage',
        /* v8 ignore next 3 */
        loadChildren: () =>
          import('@saas-frontend/storage/feature').then(
            (m) => m.FEATURE_STORAGE_ROUTES,
          ),
      },
      {
        path: 'personal-settings',
        /* v8 ignore next 3 */
        loadComponent: () =>
          import('../personal-settings/personal-settings.component').then(
            (m) => m.PersonalSettingsComponent,
          ),
      },
      {
        // Organisation Settings section — OWNER and ADMIN only
        path: 'org-settings',
        canActivate: [requireOrgManage],
        /* v8 ignore next 3 */
        loadComponent: () =>
          import('../org-settings/org-settings-layout.component').then(
            (m) => m.OrgSettingsLayoutComponent,
          ),
        children: [
          { path: '', redirectTo: 'organization', pathMatch: 'full' },
          {
            path: 'organization',
            /* v8 ignore next 3 */
            loadChildren: () =>
              import('@saas-frontend/organizations/feature-settings').then(
                (m) => m.FEATURE_ORG_SETTINGS_ROUTES,
              ),
          },
          {
            path: 'members',
            /* v8 ignore next 3 */
            loadChildren: () =>
              import('@saas-frontend/memberships/feature').then(
                (m) => m.FEATURE_MEMBERSHIPS_ROUTES,
              ),
          },
          {
            path: 'billing',
            /* v8 ignore next 3 */
            loadChildren: () =>
              import('@saas-frontend/billing/feature').then(
                (m) => m.FEATURE_BILLING_ROUTES,
              ),
          },
          {
            path: 'activity-log',
            /* v8 ignore next 3 */
            loadChildren: () =>
              import('@saas-frontend/activity-log/feature').then(
                (m) => m.FEATURE_ACTIVITY_LOG_ROUTES,
              ),
          },
        ],
      },
      {
        path: 'planning',
        /* v8 ignore next 3 */
        loadChildren: () =>
          import('@saas-frontend/planning/feature').then(
            (m) => m.FEATURE_PLANNING_ROUTES,
          ),
      },
      {
        path: 'notifications',
        /* v8 ignore next 3 */
        loadChildren: () =>
          import('@saas-frontend/notifications/feature').then(
            (m) => m.FEATURE_NOTIFICATIONS_ROUTES,
          ),
      },
      // Legacy redirects — keep old deep links working
      {
        path: 'settings',
        redirectTo: 'org-settings/organization',
        pathMatch: 'full',
      },
      {
        path: 'members',
        redirectTo: 'org-settings/members',
        pathMatch: 'full',
      },
      {
        path: 'billing',
        redirectTo: 'org-settings/billing',
        pathMatch: 'full',
      },
      {
        path: 'activity-log',
        redirectTo: 'org-settings/activity-log',
        pathMatch: 'full',
      },
    ],
  },
];
