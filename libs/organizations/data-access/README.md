# @org/organizations/data-access

Signal-based active-org store, HTTP client for the `/organizations` backend endpoints, and the `tenantInterceptor`.

**Import path**: `@org/organizations/data-access`

---

## Exports

| Symbol                                                                                                                                           | Kind     | Description                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------ |
| `OrganizationsStore`                                                                                                                             | Service  | Reactive store for the active org — signals + `localStorage` persistence |
| `OrganizationsApi`                                                                                                                               | Service  | HTTP client for org CRUD, export, and deletion endpoints                 |
| `tenantInterceptor`                                                                                                                              | Function | `HttpInterceptorFn` — attaches `x-org-id` to API requests                |
| `CreateOrganizationDto` / `UpdateOrganizationDto` / `Organization` / `OrganizationSummary` / `RequestDeletionResponse` / `RequestExportResponse` | Types    | Type aliases from OpenAPI schema                                         |

---

## `OrganizationsStore`

Root-level singleton (`providedIn: 'root'`).

### Signals

| Signal          | Type                     | Description                                         |
| --------------- | ------------------------ | --------------------------------------------------- |
| `activeOrgId`   | `Signal<string \| null>` | ID of the currently selected organization           |
| `activeOrgName` | `Signal<string \| null>` | Display name of the currently selected organization |
| `hasActiveOrg`  | `Signal<boolean>`        | `computed(() => activeOrgId() !== null)`            |

### Persistence

On startup the store reads `localStorage` keys `saas.activeOrgId` and `saas.activeOrgName`. If reads fail (disabled storage, quota), the store initialises to `null`.

`setActiveOrg(orgId, orgName?)` updates both signals and writes to `localStorage`. `orgName` is optional — if omitted, the name key is removed.
`clearActiveOrg()` nulls both signals and removes both keys.

### Methods

```ts
setActiveOrg(orgId: string, orgName?: string): void
clearActiveOrg(): void
```

### Usage

```ts
import { OrganizationsStore } from '@org/organizations/data-access';

@Component({ ... })
export class MyComponent {
  readonly #orgsStore = inject(OrganizationsStore);

  readonly orgId = this.#orgsStore.activeOrgId;    // Signal<string | null>
  readonly hasOrg = this.#orgsStore.hasActiveOrg;  // Signal<boolean>
}
```

---

## `OrganizationsApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient`.

### Methods

| Method                        | HTTP                             | Description                                |
| ----------------------------- | -------------------------------- | ------------------------------------------ |
| `getOrganizations()`          | `GET /organizations`             | List orgs the current user belongs to      |
| `getOrganization(id)`         | `GET /organizations/:id`         | Single org details                         |
| `createOrganization(dto)`     | `POST /organizations`            | Create a new org                           |
| `updateOrganization(id, dto)` | `PATCH /organizations/:id`       | Rename or update org properties            |
| `requestDeletion(id)`         | `POST /organizations/:id/delete` | Queues org deletion (async backend job)    |
| `requestExport(id)`           | `POST /organizations/:id/export` | Queues org data export (async backend job) |

All methods return `Observable<T>`.

### Usage

```ts
import { OrganizationsApi } from '@org/organizations/data-access';

providers: [
  OrganizationsApi,
  { provide: API_BASE_URL, useValue: environment.apiUrl },
];

// In component
this.#orgsApi
  .updateOrganization(orgId, { name: 'New Name' })
  .subscribe(() => this.#orgsStore.setActiveOrg(orgId, 'New Name'));
```

---

## `tenantInterceptor`

A functional `HttpInterceptorFn` that attaches `x-org-id: <activeOrgId>` to every API request from the backend (`API_BASE_URL`).

### Behaviour

1. Skips requests that don't target `API_BASE_URL` (e.g. calls to Auth0's own API)
2. Skips when `activeOrgId` is `null` (before org selection)
3. Skips paths containing `/auth/me` or `/auth0` (bootstrap endpoints that run before org context exists)
4. All other requests get `x-org-id` set

### Registration

Register once in the shell's `appConfig`:

```ts
import { tenantInterceptor } from '@org/organizations/data-access';

provideHttpClient(withInterceptors([tenantInterceptor, errorInterceptor]));
```

Do **not** register it in individual MFE route groups — the shell-level registration covers all remotes.

---

## File structure

```
src/lib/
  organizations.store.ts       — OrganizationsStore (signals + localStorage)
  organizations.api.ts         — OrganizationsApi (HTTP)
  organizations.api.types.ts   — type aliases
  tenant.interceptor.ts        — tenantInterceptor function
src/index.ts                   — public exports
```
