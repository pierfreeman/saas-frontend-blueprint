import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { PermissionsService } from '@saas-frontend/shared/util-rbac';
import type { Permission } from '@saas-frontend/shared/util-rbac';
import { of } from 'rxjs';
import { filter, map, switchMap, take, timeout } from 'rxjs';

/**
 * Waits for the Auth0 SDK to finish initialising before reading isAuthenticated$.
 * Without this, isAuthenticated$ emits `false` immediately (before the SDK has
 * processed the stored session / callback code) and triggers an unwanted redirect,
 * creating an infinite loop on page refresh.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoading$.pipe(
    filter((loading) => !loading),
    take(1),
    switchMap(() =>
      auth.isAuthenticated$.pipe(
        take(1),
        // Safety valve: if isAuthenticated$ somehow never emits, unblock after 5s.
        timeout({ first: 5000, with: () => of(false) }),
        map((isAuthenticated) => {
          if (!isAuthenticated) {
            router.navigate(['/auth']);
            return false;
          }
          return true;
        }),
      ),
    ),
  );
};

/**
 * Ensures an active organisation is selected before entering org-scoped routes.
 * Redirects to /org/select when no active org is set.
 */
export const orgGuard: CanActivateFn = () => {
  const orgsStore = inject(OrganizationsStore);
  const router = inject(Router);
  if (orgsStore.hasActiveOrg()) return true;
  return router.createUrlTree(['/org/select']);
};

/**
 * Checks that the current user holds the permission declared in route.data.requiredPermission.
 * Redirects to /dashboard when the permission is missing.
 * Routes without requiredPermission are always allowed through.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);
  const required = route.data?.['requiredPermission'] as Permission | undefined;
  if (!required) return true;
  if (permissions.currentUserPermissions().has(required)) return true;
  return router.createUrlTree(['/dashboard']);
};
