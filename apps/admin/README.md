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
| `/admin/organizations/:orgId` | `AdminOrgDetailComponent`     | Org detail + 3-tab panel                     |
| `/admin/activity-log`         | `AdminAllActivityComponent`   | Cross-tenant activity log, date range filter |

### Org detail tabs (`AdminOrgDetailComponent`)

| Tab      | Sub-component               | Description                                                                 |
| -------- | --------------------------- | --------------------------------------------------------------------------- |
| Members  | `AdminMembersTabComponent`  | Paginated members, invite, role change, remove                              |
| Billing  | `AdminBillingTabComponent`  | Subscription overview, Stripe portal link, entitlements, cache invalidation |
| Activity | `AdminActivityTabComponent` | Org-scoped activity log with date filter                                    |

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
    admin-organizations.component.ts    — org list page
    admin-organizations.component.spec.ts
    admin-org-detail.component.ts       — org detail + tab switcher
    admin-org-detail.component.spec.ts
    admin-members-tab.component.ts      — members tab (sub-component)
    admin-members-tab.component.spec.ts
    admin-billing-tab.component.ts      — billing tab (sub-component)
    admin-billing-tab.component.spec.ts
    admin-activity-tab.component.ts     — per-org activity tab (sub-component)
    admin-activity-tab.component.spec.ts
  activity-log/
    admin-all-activity.component.ts     — cross-tenant activity log page
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
