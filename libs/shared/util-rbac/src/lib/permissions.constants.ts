import type { MembershipRole } from '@saas-frontend/memberships/data-access';

/** Mirrors saas-backend-blueprint/libs/common/src/rbac/permissions.constants.ts */
export const PERMISSIONS = {
  // Organization
  ORG_MANAGE: 'org.manage',
  ORG_BILLING_MANAGE: 'org.billing.manage',
  ORG_MEMBERS_INVITE: 'org.members.invite',
  ORG_MEMBERS_REMOVE: 'org.members.remove',
  ORG_MEMBERS_ROLE_UPDATE: 'org.members.role.update',
  ORG_READ: 'org.read',

  // Audit
  AUDIT_READ: 'audit.read',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // Planning / Calendar
  PLANNING_MANAGE: 'planning.manage',
  /** Can edit/delete ANY event (not just own). ADMIN and OWNER only. */
  PLANNING_MANAGE_ANY: 'planning.manage_any',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Frontend mirror of ROLE_PERMISSIONS from the backend.
 * Mirrors saas-backend-blueprint/libs/common/src/rbac/roles.constants.ts.
 */
export const ROLE_PERMISSION_MAP: Record<MembershipRole, Permission[]> = {
  OWNER: [
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.ORG_BILLING_MANAGE,
    PERMISSIONS.ORG_MEMBERS_INVITE,
    PERMISSIONS.ORG_MEMBERS_REMOVE,
    PERMISSIONS.ORG_MEMBERS_ROLE_UPDATE,
    PERMISSIONS.ORG_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.PLANNING_MANAGE,
    PERMISSIONS.PLANNING_MANAGE_ANY,
  ],
  ADMIN: [
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.ORG_MEMBERS_INVITE,
    PERMISSIONS.ORG_MEMBERS_REMOVE,
    PERMISSIONS.ORG_MEMBERS_ROLE_UPDATE,
    PERMISSIONS.ORG_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.PLANNING_MANAGE,
    PERMISSIONS.PLANNING_MANAGE_ANY,
  ],
  MEMBER: [
    PERMISSIONS.ORG_READ,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.PLANNING_MANAGE,
  ],
  READ_ONLY: [PERMISSIONS.ORG_READ],
};
