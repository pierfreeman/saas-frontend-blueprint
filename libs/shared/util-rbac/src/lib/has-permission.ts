import { inject } from '@angular/core';
import { PermissionsService } from './permissions.service';
import type { Permission } from './permissions.constants';

/**
 * Returns true if the current user has the given permission.
 * Must be called in an injection context.
 */
export function hasPermission(permission: Permission): boolean {
  const permissions = inject(PermissionsService);
  return permissions.currentUserPermissions().has(permission);
}
