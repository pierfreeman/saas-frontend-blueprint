# @org/entitlements/data-access

HTTP client for the plan entitlements endpoint (`/organizations/:orgId/entitlements`).

**Import path**: `@org/entitlements/data-access`

---

## Exports

| Symbol                     | Kind    | Description                                            |
| -------------------------- | ------- | ------------------------------------------------------ |
| `EntitlementsApi`          | Service | HTTP client for fetching and invalidating entitlements |
| `OrganizationEntitlements` | Type    | Plan-based feature flags and limits for an org         |
| `InvalidateCacheResponse`  | Type    | Response from cache invalidation                       |

---

## `EntitlementsApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient`.

### Methods

| Method                   | HTTP                                                 | Description                                     |
| ------------------------ | ---------------------------------------------------- | ----------------------------------------------- |
| `getEntitlements(orgId)` | `GET /organizations/:orgId/entitlements`             | Plan features and limits for the given org      |
| `invalidateCache(orgId)` | `POST /organizations/:orgId/entitlements/invalidate` | Force-refreshes cached entitlements from Stripe |

All methods return `Observable<T>`.

### Usage

```ts
import { EntitlementsApi } from '@org/entitlements/data-access';

providers: [
  EntitlementsApi,
  { provide: API_BASE_URL, useValue: environment.apiUrl },
];

// Check feature access
this.#entitlementsApi.getEntitlements(orgId).subscribe((ent) => {
  if (ent.canInviteMembers) {
    /* show invite button */
  }
});
```

Entitlement data is cached on the backend (Redis). After a plan upgrade, call `invalidateCache(orgId)` to ensure the frontend picks up the new entitlements immediately.

---

## File structure

```
src/lib/
  entitlements.api.ts        — EntitlementsApi (HTTP)
  entitlements.api.types.ts  — type aliases from OpenAPI schema
src/index.ts                 — public exports
```
