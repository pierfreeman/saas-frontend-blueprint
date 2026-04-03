# @saas-frontend/admin/data-access

Pattern C data-access library for the super-admin backoffice portal. Provides a single `AdminApi` service and the TypeScript types used by the `admin` MFE.

Import path: `@saas-frontend/admin/data-access`

---

## Public API

```ts
import { AdminApi } from '@saas-frontend/admin/data-access';
import type {
  AdminOrganizationListItem,
  AdminOrganizationDetail,
  PaginatedAdminOrganizationsResult,
  AdminProvisionOrgPayload,
  PlanTier,
  AdminMemberItem,
  PaginatedAdminMembersResult,
  AdminBillingOverview,
  AdminBillingPortalResponse,
  PaginatedAdminActivityResult,
  ActivityLogRecord,
  OrganizationEntitlements,
  EntitlementOverride,
  SetFeatureFlagOverridePayload,
  OverrideKey,
  OrgStatus,
  BillingStatus,
  MembershipRole,
  MembershipStatus,
  ListOrganizationsQuery,
  ListMembersQuery,
  ListActivityQuery,
} from '@saas-frontend/admin/data-access';
```

---

## AdminApi

`@Injectable({ providedIn: 'root' })` — must be explicitly re-provided in the admin remote's route group `providers[]`.

### Organizations

| Method                  | Signature                                                                          | Backend endpoint                  |
| ----------------------- | ---------------------------------------------------------------------------------- | --------------------------------- |
| `getOrganizations`      | `(query?: ListOrganizationsQuery) → Observable<PaginatedAdminOrganizationsResult>` | `GET /admin/organizations`        |
| `getOrganizationDetail` | `(orgId: string) → Observable<AdminOrganizationDetail>`                            | `GET /admin/organizations/:orgId` |
| `provisionOrganization` | `(payload: AdminProvisionOrgPayload) → Observable<AdminOrganizationListItem>`      | `POST /admin/organizations`       |

`ListOrganizationsQuery`:

```ts
{ search?: string; status?: OrgStatus; limit?: number; offset?: number }
```

`AdminProvisionOrgPayload`:

```ts
{ name: string; ownerEmail: string; plan?: PlanTier } // PlanTier: 'FREE' | 'PRO' | 'ENTERPRISE'
```

### Memberships

| Method         | Signature                                                                            | Backend endpoint                                               |
| -------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `listMembers`  | `(orgId, query?: ListMembersQuery) → Observable<PaginatedAdminMembersResult>`        | `GET /admin/organizations/:orgId/memberships`                  |
| `changeRole`   | `(orgId, memberId, newRole: MembershipRole) → Observable<AdminOrganizationListItem>` | `PATCH /admin/organizations/:orgId/memberships/:memberId/role` |
| `inviteMember` | `(orgId, email, role) → Observable<void>`                                            | `POST /admin/organizations/:orgId/memberships`                 |
| `removeMember` | `(orgId, memberId) → Observable<void>`                                               | `DELETE /admin/organizations/:orgId/memberships/:memberId`     |

### Billing

| Method                | Signature                                                     | Backend endpoint                                  |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| `getBillingOverview`  | `(orgId) → Observable<AdminBillingOverview>`                  | `GET /admin/organizations/:orgId/billing`         |
| `getBillingPortalUrl` | `(orgId, returnUrl) → Observable<AdminBillingPortalResponse>` | `POST /admin/organizations/:orgId/billing/portal` |

### Activity log

| Method           | Signature                                                                       | Backend endpoint                               |
| ---------------- | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| `getOrgActivity` | `(orgId, query?: ListActivityQuery) → Observable<PaginatedAdminActivityResult>` | `GET /admin/organizations/:orgId/activity-log` |
| `getAllActivity` | `(query?: ListActivityQuery) → Observable<PaginatedAdminActivityResult>`        | `GET /admin/activity-log`                      |

`ListActivityQuery`:

```ts
{ limit?: number; offset?: number; action?: string; orgId?: string; fromDate?: string; toDate?: string }
```

### Entitlements

| Method                      | Signature                                                                           | Backend endpoint                                           |
| --------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `getEntitlements`           | `(orgId) → Observable<OrganizationEntitlements>`                                    | `GET /admin/organizations/:orgId/entitlements`             |
| `invalidateEntitlements`    | `(orgId) → Observable<void>`                                                        | `POST /admin/organizations/:orgId/entitlements/invalidate` |
| `listFeatureFlagOverrides`  | `(orgId) → Observable<EntitlementOverride[]>`                                       | `GET /admin/organizations/:orgId/entitlements/overrides`   |
| `setFeatureFlagOverride`    | `(orgId, payload: SetFeatureFlagOverridePayload) → Observable<EntitlementOverride>` | `PATCH /admin/organizations/:orgId/feature-flags`          |
| `deleteFeatureFlagOverride` | `(orgId, key: OverrideKey) → Observable<void>`                                      | `DELETE /admin/organizations/:orgId/feature-flags/:key`    |

`SetFeatureFlagOverridePayload`:

```ts
{
  key: OverrideKey;      // one of the OVERRIDE_KEYS constants
  value: string;         // JSON-stringified value
  reason?: string;
  expiresAt?: string;    // ISO 8601 date string
}
```

---

## Key types

### `AdminOrganizationListItem`

```ts
{
  id: string;
  name: string;
  status: OrgStatus; // 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'PENDING'
  billingStatus: BillingStatus; // 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'UNPAID' | 'NONE'
  planId: string | null;
  membersCount: number;
  createdAt: string;
}
```

### `AdminOrganizationDetail`

Extends `AdminOrganizationListItem` with:

```ts
{
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  subscriptionPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  // ... full billing and entitlement detail
}
```

### `AdminBillingOverview`

```ts
{
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  billingStatus: BillingStatus;
  planId: string | null;
  subscriptionPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: OrganizationEntitlements;
}
```

---

## Providing the service

`AdminApi` is `providedIn: 'root'` but must be explicitly listed in the admin remote's route group providers so it gets the correct `API_BASE_URL` token instance:

```ts
// apps/admin/src/app/remote-entry/entry.routes.ts
{
  path: '',
  providers: [
    AdminApi,
    { provide: API_BASE_URL, useValue: environment.apiUrl },
  ],
  children: [ /* ... */ ],
}
```

---

## File structure

```
libs/admin/data-access/src/
  lib/
    admin.api.ts          ← AdminApi service
    admin.api.types.ts    ← all type aliases and interfaces
    admin.api.spec.ts     ← unit tests
  index.ts                ← public exports
```

> Types in `admin.api.types.ts` are declared as local interfaces rather than OpenAPI-generated aliases because the admin API endpoints are internal and not part of the public OpenAPI schema exposed to external consumers.
