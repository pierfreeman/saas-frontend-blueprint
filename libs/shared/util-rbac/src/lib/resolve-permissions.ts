import type { MembershipRole } from '@saas-frontend/memberships/data-access';
import { ROLE_PERMISSION_MAP, type Permission } from './permissions.constants';

export function resolvePermissions(role: MembershipRole): Set<Permission> {
  return new Set(ROLE_PERMISSION_MAP[role] ?? []);
}
