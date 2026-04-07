# admin

**Admin MFE** (`port 4203`) — super-admin backoffice portal. Provides internal operations tooling: org inspection, member management, billing oversight, and cross-tenant activity log. Accessible only to users with `isSystemAdmin === true`.

Loaded by the shell at `/admin`. Exposes a single `./Routes` entry point.

---

## Access control

The shell applies **`isSystemAdminGuard`** to the `/admin` path — it reads `AuthStore.currentUser().isSystemAdmin` and redirects to `/` if the flag is `false`. The guard is defined in `@saas-frontend/shared/util-auth`.

To grant admin access to a user, run the backend promotion script:

```sh
cd saas-backend-blueprint
node scripts/promote-admin.mjs <email> true
```

---

## Routes

| Route                         | Component                     | Description                                  |
| ----------------------------- | ----------------------------- | -------------------------------------------- |
| `/admin`                      | — (redirect)                  | Redirects to `/admin/organizations`          |
| `/admin/organizations`        | `AdminOrganizationsComponent` | Paginated org list, search, status filter    |
| `/admin/organizations/:orgId` | `AdminOrgDetailComponent`     | Org detail + 8-tab panel                     |
| `/admin/activity-log`         | `AdminAllActivityComponent`   | Cross-tenant activity log, date range filter |

### Org detail tabs (`AdminOrgDetailComponent`)

| #   | Tab          | Sub-component                   | Description                                                                                          |
| --- | ------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Members      | `AdminMembersTabComponent`      | Paginated members, invite, role change, remove                                                       |
| 2   | Billing      | `AdminBillingTabComponent`      | Subscription overview, Change Plan dialog, Extend Trial dialog, Stripe portal, cache invalidation    |
| 3   | Activity     | `AdminActivityTabComponent`     | Org-scoped activity log with date filter                                                             |
| 4   | Entitlements | `AdminEntitlementsTabComponent` | Effective entitlements grid, per-org overrides (set / edit / delete) with reason, expiry             |
| 5   | Jobs         | `AdminJobsTabComponent`         | Background job list with status badges, type labels, pagination                                      |
| 6   | Exports      | `AdminExportsTabComponent`      | Trigger data export, list past exports with status and presigned download link                       |
| 7   | Storage      | `AdminStorageTabComponent`      | File count + total bytes cards, Set Storage Quota dialog (overrides `storageLimitBytes` entitlement) |
| 8   | Deletion     | `AdminDeletionTabComponent`     | Read-only deletion lifecycle view (requested / scheduled / completed dates, retention period)        |

---

## File structure

```
src/app/
  remote-entry/
    entry.ts             — re-exports ADMIN_ROUTES
    entry.routes.ts      — route group: providers[] + lazy child routes
  admin-dashboard/
    admin-dashboard.component.ts    — landing card (logged-in user info)
  organizations/
    admin-organizations.component.ts         — org list page (search, status filter)
    admin-organizations.component.spec.ts
    admin-org-detail.component.ts            — org detail + 8-tab switcher
    admin-org-detail.component.spec.ts
    admin-members-tab.component.ts           — tab 1: members (invite, role, remove)
    admin-members-tab.component.spec.ts
    admin-billing-tab.component.ts           — tab 2: billing (overview, change plan, extend trial, portal)
    admin-billing-tab.component.spec.ts
    admin-activity-tab.component.ts          — tab 3: org-scoped activity log
    admin-activity-tab.component.spec.ts
    admin-entitlements-tab.component.ts      — tab 4: entitlement overrides
    admin-entitlements-tab.component.spec.ts
    admin-jobs-tab.component.ts              — tab 5: background jobs
    admin-jobs-tab.component.spec.ts
    admin-exports-tab.component.ts           — tab 6: GDPR exports
    admin-exports-tab.component.spec.ts
    admin-storage-tab.component.ts           — tab 7: storage stats + quota override
    admin-storage-tab.component.spec.ts
    admin-deletion-tab.component.ts          — tab 8: deletion lifecycle (read-only)
    admin-deletion-tab.component.spec.ts
  activity-log/
    admin-all-activity.component.ts          — cross-tenant activity log page
    admin-all-activity.component.spec.ts
```

---

## Data access

All API calls go through `AdminApi` from `@saas-frontend/admin/data-access`. The service is provided in the route group `providers[]` alongside `API_BASE_URL`.

```ts
// entry.routes.ts (excerpt)
providers: [
  AdminApi,
  { provide: API_BASE_URL, useValue: environment.apiUrl },
],
```

See [`libs/admin/data-access/README.md`](../../libs/admin/data-access/README.md) for the full method inventory.

---

## Running

```sh
# Via shell (recommended)
npx nx serve shell --devRemotes=admin

# Standalone (no shell layout)
npx nx serve admin
```

---

## Extending

To add a new admin page:

1. Create `src/app/<feature>/<feature>.component.ts`
2. Add a lazy `loadComponent` route in `entry.routes.ts` under the `children[]` of the provider group
3. Any new `*Api` service must be added to that same `providers[]` array
4. Tests go co-located as `<feature>.component.spec.ts`

---

## Roadmap

Deferred items from `saas-context-docs/docs/features/admin-backoffice-portal/deferred.md`.

### Organization Management

- **Internal notes & account manager assignment** — free-text notes per org + assignment to an internal account manager. Requires a separate `OrgInternalMetadata` table (never mixed into the tenant-facing `Organization` model).
- **Org tagging** — label orgs for internal segmentation.
- **Update non-critical org metadata** — upgrade the currently read-only org detail to support edits via `AdminOrganizationsService.updateOrganization()`, with dual audit.

### Billing Operations

- **Trigger billing sync / reconciliation** — manually re-sync subscription state from Stripe to fix mismatches.
- **Replay webhook effects** — re-process a past Stripe webhook event without hitting the Stripe API again.

### Notifications & Email

- **View email logs** — per-org list of transactional emails sent.
- **Re-send invite emails** — resend an existing pending invitation from the backoffice.
- **Trigger operational emails** — manually fire a templated email to an org's members.

### Storage

- **Trigger storage cleanup job** — manually enqueue the orphaned-file cleanup scheduler for a specific org.

### Activity Log

- **Legal audit view** — read-only table over the immutable legal audit DB. Requires a dedicated `LegalAuditAdminService` backed by `prisma-legal`.
- **Cross-entity event correlation** — link activity-log events across orgs/users into a unified timeline view.
- **Advanced audit filters** — filter by actor, event type, date range, and resource ID simultaneously.

### Frontend — Layout & UX

- **Admin-specific layout** — sidebar navigation with domain sections, breadcrumbs, and a quick-search bar. Deferred until the domain surface is large enough to warrant stable sidebar structure.
- **Realtime job status** — Socket.IO integration (namespace `/jobs`) for live job progress in the Jobs tab.

### Security Hardening (Phase 4)

- **Separate admin user base** — replace the `isSystemAdmin` flag on the tenant `User` model with a completely independent identity layer: a dedicated `AdminUser` table (in the legal audit DB or a separate admin DB), backed by its own Auth0 application and tenant. The two user bases are entirely unrelated — a compromise of the tenant platform cannot escalate to backoffice access. The `SystemAdminGuard` would validate JWTs issued by the admin Auth0 app against a separate JWKS endpoint, and the `apps/admin-api` bootstrap would configure its own `JwtStrategy` pointing at the admin Auth0 tenant.
- **Multi-role internal RBAC** — five internal roles (`SUPER_ADMIN`, `ACCOUNT_MANAGER`, `SUPPORT_AGENT`, `FINANCE_OPERATOR`, `READ_ONLY`) with a per-domain permissions matrix. Requires `AdminRole` enum + `AdminMembership` DB table; `SystemAdminGuard` evolves into a composable guard reading `AdminMembership.role`.
- **MFA enforcement** — mandatory MFA for backoffice access, enforced at the Auth0 organization-policy level (not in application code).
- **IP allowlist / VPN enforcement** — `ADMIN_IP_ALLOWLIST` env var processed by NestJS middleware on `admin-api`.
- **Step-up auth for critical operations** — re-authentication prompt (`acr_values` + `max_age=0`) before destructive/irreversible actions.
- **Audit reason requirement** — mandatory `reason` field on sensitive mutations (role changes, entitlement overrides).
