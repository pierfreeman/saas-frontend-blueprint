# @saas-frontend/auth/data-access

Signal-based user identity store and HTTP client for the `/auth` backend endpoints.

**Import path**: `@saas-frontend/auth/data-access`

---

## Exports

| Symbol      | Kind       | Description                                                                  |
| ----------- | ---------- | ---------------------------------------------------------------------------- |
| `AuthStore` | Service    | Reactive store for the current user — signals + `sessionStorage` persistence |
| `AuthApi`   | Service    | HTTP client for `GET /auth/me`                                               |
| `User`      | Type alias | Backend user profile shape                                                   |

---

## `AuthStore`

Root-level singleton (`providedIn: 'root'`).

### Signals

| Signal        | Type                   | Description                              |
| ------------- | ---------------------- | ---------------------------------------- |
| `currentUser` | `Signal<User \| null>` | The authenticated user profile           |
| `isLoggedIn`  | `Signal<boolean>`      | `computed(() => currentUser() !== null)` |

### Persistence

On startup the store reads from `sessionStorage` key `saas.currentUser`. The `User` object is serialised as JSON. If the storage read fails (private browsing quota, parsing error), the store initialises to `null` silently.

`setUser(user)` updates the signal and writes to `sessionStorage`.
`clearUser()` sets the signal to `null` and removes the key.

### Methods

```ts
setUser(user: User): void
clearUser(): void
```

### Usage

```ts
import { AuthStore } from '@saas-frontend/auth/data-access';

@Component({ ... })
export class MyComponent {
  readonly #authStore = inject(AuthStore);

  readonly userEmail = computed(() => this.#authStore.currentUser()?.email);
}
```

---

## `AuthApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient` in the injector.

### Methods

| Method    | HTTP           | Description                                                                                       |
| --------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `getMe()` | `GET /auth/me` | Syncs the Auth0 identity with the backend DB (upsert on first login) and returns the user profile |

Returns `Observable<User>`.

### Usage

```ts
import { AuthApi } from '@saas-frontend/auth/data-access';

// In a route's providers[] or in the app
providers: [AuthApi, { provide: API_BASE_URL, useValue: environment.apiUrl }];

// In the component/service
this.#authApi.getMe().subscribe((user) => this.#authStore.setUser(user));
```

> **Important**: Because this service must be provided in the auth MFE's bundle (not the shell's), it is re-provided in the `/auth/callback` route group. See [apps/auth/README.md](../../../apps/auth/README.md) for details.

---

## Types

```ts
// auth.api.types.ts — derived from the backend OpenAPI schema
export type User =
  operations['AuthController_getMe']['responses']['200']['content']['application/json'];
```

`User` fields (from backend `UserResponseDto`):

- `id: string`
- `email: string`
- `name: string | null`
- `auth0Id: string`
- `createdAt: string` (ISO 8601)
- `updatedAt: string`

---

## File structure

```
src/lib/
  auth.store.ts       — AuthStore (signals + sessionStorage)
  auth.api.ts         — AuthApi (HTTP)
  auth.api.types.ts   — User type alias
src/index.ts          — public exports
```
