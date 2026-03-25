# @org/entitlements/data-access

HTTP client for the plan entitlements endpoint (`/organizations/:orgId/entitlements`).

**Import path**: `@org/entitlements/data-access`

---

## Exports

| Symbol                     | Kind    | Description                                            |
| -------------------------- | ------- | ------------------------------------------------------ |
| `EntitlementsApi`          | Service | HTTP client for fetching and invalidating entitlements |
| `EntitlementsStore`        | Service | Signals-based store wrapping `EntitlementsApi`         |
| `OrganizationEntitlements` | Type    | Plan-based feature flags and limits for an org         |
| `InvalidateCacheResponse`  | Type    | Response from cache invalidation                       |
| `ApiError`                 | Type    | Standard backend error shape                           |

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

## `EntitlementsStore`

Root-level singleton. Wraps `EntitlementsApi` with Angular Signals and async lifecycle management.

### State signals

| Signal         | Type                             | Description                       |
| -------------- | -------------------------------- | --------------------------------- |
| `entitlements` | `OrganizationEntitlements\|null` | Current org entitlements          |
| `loading`      | `boolean`                        | True while a request is in-flight |
| `error`        | `ApiError\|null`                 | Last error, null on success       |

### Computed signals

| Signal                    | Type         | Description                               |
| ------------------------- | ------------ | ----------------------------------------- |
| `plan`                    | `Plan\|null` | `'FREE' \| 'PRO' \| 'ENTERPRISE' \| null` |
| `isFree`                  | `boolean`    | True when plan is FREE                    |
| `isPro`                   | `boolean`    | True when plan is PRO                     |
| `isEnterprise`            | `boolean`    | True when plan is ENTERPRISE              |
| `canUseAdvancedAnalytics` | `boolean`    | Reflects `entitlements.advancedAnalytics` |
| `canUseCustomReports`     | `boolean`    | Reflects `entitlements.customReports`     |
| `canUseApiAccess`         | `boolean`    | Reflects `entitlements.apiAccess`         |
| `ssoEnabled`              | `boolean`    | Reflects `entitlements.ssoEnabled`        |
| `prioritySupport`         | `boolean`    | Reflects `entitlements.prioritySupport`   |
| `maxSeats`                | `number`     | Plan seat cap (FREE=3, PRO=10, ENTERPRISE=999999); falls back to 3 |

### Methods

| Method                    | Returns         | Description                                                  |
| ------------------------- | --------------- | ------------------------------------------------------------ |
| `loadEntitlements(orgId)` | `Promise<void>` | Fetches entitlements, updates signals, sets error on failure |
| `invalidateCache(orgId)`  | `Promise<void>` | Invalidates backend cache then reloads entitlements          |
| `flush()`                 | `void`          | Resets all signals to initial values                         |

### Usage

```ts
import { EntitlementsStore } from '@org/entitlements/data-access';

@Component({ ... })
export class BillingComponent {
  readonly #store = inject(EntitlementsStore);

  readonly isPro = this.#store.isPro;
  readonly canExport = this.#store.canUseCustomReports;

  ngOnInit() {
    this.#store.loadEntitlements(this.orgId);
  }
}
```

---

## File structure

```
src/lib/
  entitlements.api.ts        — EntitlementsApi (HTTP)
  entitlements.api.types.ts  — type aliases from OpenAPI schema
  entitlements.store.ts      — EntitlementsStore (signals)
  api-error.type.ts          — ApiError interface
src/index.ts                 — public exports
```
