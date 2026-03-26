import { Injectable, inject, computed } from '@angular/core';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import { resolvePermissions } from './resolve-permissions';
import type { Permission } from './permissions.constants';

/**
 * Single source of truth for runtime permission resolution.
 *
 * Reads the current user's role from MembershipsStore and resolves it to a
 * permission set via resolvePermissions(). All RBAC consumers (directive,
 * helper function, feature components) should go through this service so that
 * the store itself remains free of RBAC logic.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  readonly #store = inject(MembershipsStore);

  readonly currentUserPermissions = computed<Set<Permission>>(() => {
    const role = this.#store.currentUserRole();
    if (!role) return new Set();
    return resolvePermissions(role);
  });
}
