// ── Provisioning ─────────────────────────────────────────────────────────────

export const PLAN_TIERS = ['FREE', 'PRO', 'ENTERPRISE'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export interface AdminProvisionOrgPayload {
  name: string;
  ownerEmail: string;
  plan?: PlanTier;
}

export interface AdminSetOrgStatusPayload {
  status: OrgStatus;
  reason?: string;
}

// ── Organization types ────────────────────────────────────────────────────────

export type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'PENDING_DELETION';
export type BillingStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'TRIALING'
  | 'UNPAID'
  | 'NONE';
export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'READ_ONLY';
export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface AdminOrganizationListItem {
  id: string;
  name: string;
  status: OrgStatus;
  billingStatus: BillingStatus;
  planId: string | null;
  membersCount: number;
  createdAt: string;
}

export interface PaginatedAdminOrganizationsResult {
  items: AdminOrganizationListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActivityLogRecord {
  id: string;
  orgId: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface OrganizationEntitlements {
  organizationId: string;
  plan: string;
  subscriptionStatus: string;
  advancedAnalytics: boolean;
  customReports: boolean;
  apiAccess: boolean;
  ssoEnabled: boolean;
  prioritySupport: boolean;
  maxSeats: number;
  storageLimitBytes: number;
}

export interface AdminOrganizationDetail extends AdminOrganizationListItem {
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  subscriptionPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  recentActivity: ActivityLogRecord[];
  entitlements: OrganizationEntitlements;
  // ── Deletion fields ────────────────────────────────────────────────────
  deletionRequestedAt: string | null;
  deletionScheduledAt: string | null;
  deletionCompletedAt: string | null;
  retentionPeriodDays: number | null;
}

// ── Membership types ──────────────────────────────────────────────────────────

export interface AdminMemberUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
}

export interface AdminMemberItem {
  id: string;
  orgId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: string;
  user: AdminMemberUser;
}

export interface PaginatedAdminMembersResult {
  items: AdminMemberItem[];
  total: number;
  limit: number;
  offset: number;
}

// ── Billing types ─────────────────────────────────────────────────────────────

export interface AdminBillingOverview {
  orgId: string;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  billingStatus: BillingStatus;
  planId: string | null;
  subscriptionPeriodStart: string | null;
  subscriptionPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  storageLimit: number | null;
}

export interface AdminBillingPortalResponse {
  url: string;
}

// ── Activity log types ────────────────────────────────────────────────────────

export interface PaginatedAdminActivityResult {
  logs: ActivityLogRecord[];
  total: number;
  limit: number;
  offset: number;
}

// ── Query params ──────────────────────────────────────────────────────────────

export interface ListOrganizationsQuery {
  search?: string;
  status?: OrgStatus;
  limit?: number;
  offset?: number;
}

export interface ListMembersQuery {
  limit?: number;
  offset?: number;
}

export interface ListActivityQuery {
  limit?: number;
  offset?: number;
  action?: string;
  orgId?: string;
  fromDate?: string;
  toDate?: string;
}

// ── Entitlement overrides ─────────────────────────────────────────────────────

export const OVERRIDE_KEYS = [
  'advancedAnalytics',
  'customReports',
  'apiAccess',
  'ssoEnabled',
  'prioritySupport',
  'maxSeats',
  'storageLimitBytes',
] as const;

export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

export interface EntitlementOverride {
  id: string;
  orgId: string;
  key: OverrideKey;
  value: boolean | number;
  reason: string;
  expiresAt: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetFeatureFlagOverridePayload {
  key: OverrideKey;
  value: boolean | number;
  reason: string;
  expiresAt?: string;
}

// ── Jobs types ────────────────────────────────────────────────────────────────

export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface AdminJobItem {
  id: string;
  orgId: string;
  userId: string | null;
  type: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAdminJobsResult {
  items: AdminJobItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListJobsQuery {
  limit?: number;
  offset?: number;
  status?: JobStatus;
  type?: string;
}

// ── Exports types ────────────────────────────────────────────────────────────────

export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AdminExportItem {
  id: string;
  orgId: string;
  jobId: string;
  requestedByUserId: string;
  status: ExportStatus;
  fileUrl: string | null;
  fileSize: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
  error: string | null;
}

export interface PaginatedAdminExportsResult {
  items: AdminExportItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListExportsQuery {
  limit?: number;
  offset?: number;
}

// ── Storage types ────────────────────────────────────────────────

export interface AdminStorageStats {
  /** Total bytes used by confirmed files (serialized from server-side BigInt). */
  totalBytes: string;
  fileCount: number;
}
