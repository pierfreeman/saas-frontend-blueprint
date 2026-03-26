# shell

**Host application** (`port 4200`) for the Nx Module Federation monorepo.

The shell owns:

- Global Angular providers (Auth0, PrimeNG theme, interceptors)
- Top-level routing that composes the `auth`, `platform`, and `admin` remotes
- The persistent `ShellLayoutComponent` (navbar + router outlet)
- All route guards
- Org selection screen

---

## Responsibilities

| Concern                  | File                                         |
| ------------------------ | -------------------------------------------- |
| App bootstrap / DI setup | `src/app/app.config.ts`                      |
| Top-level routes         | `src/app/app.routes.ts`                      |
| Auth guard               | `src/app/app.guard.ts`                       |
| Org guard                | `src/app/org.guard.ts`                       |
| Global error interceptor | `src/app/error.interceptor.ts`               |
| Shell layout + navbar    | `src/app/layout/`                            |
| Org selection page       | `src/app/org-select/org-select.component.ts` |
| Environment              | `src/environments/environment.ts`            |
| MF remote type stubs     | `src/remotes.d.ts`                           |
| Test helpers             | `src/testing/mf-stubs.ts`                    |

---

## Running

```sh
# Serve with all remotes in dev mode
npx nx serve shell --devRemotes=auth,platform,admin

# Serve with only specific remotes in dev mode (rest served as static)
npx nx serve shell --devRemotes=platform

# Production build
npx nx build shell
```

---

## Module Federation

The shell declares three remotes in `module-federation.config.ts`:

```ts
remotes: ['auth', 'platform', 'admin'];
```

All `@saas-frontend/*` workspace library paths are shared as **singletons** so the same Angular DI instance is used across all bundles. This is critical for `InjectionToken` identity — without singleton sharing, `inject(API_BASE_URL)` in a remote would not resolve the token provided in the shell.

Type stubs for remote entry modules live in `src/remotes.d.ts`:

```ts
declare module 'auth/Routes' { ... }
declare module 'platform/Routes' { ... }
declare module 'admin/Routes' { ... }
```

---

## Routing

```
/auth/**       → auth MFE (full-screen, no guards, no shell layout)
/              → [authGuard] → ShellLayoutComponent
  /org/select  → OrgSelectComponent
  /admin/**    → [orgGuard] → admin MFE
  /**          → [orgGuard] → platform MFE
/**            → redirect to /
```

### Guards

#### `authGuard` (`app.guard.ts`)

Checks `AuthService.isAuthenticated$`. If the user is not authenticated, redirects to `/auth`. The Auth0 SDK handles the PKCE flow and silent refresh automatically.

```ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated$.pipe(
    take(1),
    map((ok) => ok || router.createUrlTree(['/auth'])),
  );
};
```

#### `orgGuard` (`org.guard.ts`)

Checks `OrganizationsStore.hasActiveOrg()`. If no org is selected, redirects to `/org/select`. This guard runs _after_ `authGuard`, so the user is always authenticated at this point.

---

## Global providers (`app.config.ts`)

| Provider                   | Purpose                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `provideRouter(appRoutes)` | App-level router                                                                             |
| `provideHttpClient(...)`   | HttpClient with both DI- and functional-based interceptors                                   |
| `AuthHttpInterceptor`      | Auth0 SDK interceptor — attaches `Authorization: Bearer <jwt>`                               |
| `tenantInterceptor`        | Attaches `x-org-id` header from `OrganizationsStore` (from `@saas-frontend/organizations/data-access`) |
| `errorInterceptor`         | Maps HTTP errors to PrimeNG toast messages                                                   |
| `API_BASE_URL`             | `environment.apiUrl` — consumed by all `*Api` services in the shell bundle                   |
| `provideAuth0(...)`        | Auth0 SDK with audience, redirect URI, `allowedList` for JWT injection                       |
| `providePrimeNG(Aura)`     | PrimeNG theme (Aura, dark mode disabled)                                                     |
| `MessageService`           | PrimeNG toast service (global singleton)                                                     |

---

## Interceptors

### `tenantInterceptor`

From `@saas-frontend/organizations/data-access`. Attaches `x-org-id: <activeOrgId>` to every request whose URL starts with `environment.apiUrl`. Skips `/auth/me` and `/auth0` paths because those endpoints run before any org context is established.

### `errorInterceptor` (`error.interceptor.ts`)

Catches HTTP errors and dispatches toast notifications:

| Status | Behaviour                                                |
| ------ | -------------------------------------------------------- |
| 401    | Clears session, logs out via Auth0, navigates to `/auth` |
| 403    | Shows "Forbidden" toast                                  |
| 422    | Shows validation error message from response body        |
| 5xx    | Shows generic "Server error" toast                       |

---

## Shell layout

`ShellLayoutComponent` renders `<app-navbar>` above a `<router-outlet>`. All authenticated pages are rendered inside this outlet.

`NavbarComponent` provides:

- Primary nav links: **Dashboard**, **Members**, **Settings**, **Billing**
- Org switcher button (shows active org name, navigates to `/org/select`)
- Avatar menu (initials from email) with **Switch organization** and **Logout** actions

Logout sequence:

1. `AuthStore.clearUser()` — clears `sessionStorage`
2. `OrganizationsStore.clearActiveOrg()` — clears `localStorage`
3. `AuthService.logout({ openUrl: false })` — invalidates Auth0 token locally
4. `router.navigateByUrl('/auth')` — redirects to login

---

## Environment

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  auth0Domain: 'your-tenant.auth0.com',
  auth0ClientId: 'your-spa-client-id',
  auth0Audience: 'https://api.your-app.com',
  auth0RedirectUri: 'http://localhost:4200/auth/callback',
};
```

---

## Testing

```sh
npx nx run shell:test
npx nx run shell:test --watch
npx nx run shell:test --coverage
```

Test files: `app.spec.ts`, `app.routes.spec.ts`, `app.guard.spec.ts`, `org.guard.spec.ts`, `error.interceptor.spec.ts`, `auth.store.spec.ts`, `organizations.store.spec.ts`, `tenant.interceptor.spec.ts`.

Module Federation remotes are stubbed in `src/testing/mf-stubs.ts` so `loadChildren(() => import('auth/Routes'))` resolves in tests without an actual remote bundle.
