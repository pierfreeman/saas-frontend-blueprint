# auth

**Auth MFE** (`port 4201`) — handles the Auth0 login flow and the post-redirect callback sequence.

This remote is loaded by the shell at `/auth` and does **not** use the shell layout (no navbar). It exposes a single `./Routes` entry point.

---

## Exposed entry point

```ts
// module-federation.config.ts
exposes: { './Routes': 'src/app/remote-entry/entry.ts' }
```

The shell router loads it as:

```ts
{ path: 'auth', loadChildren: () => import('auth/Routes').then(m => m.AUTH_ROUTES) }
```

---

## Routes

| Path             | Component           | Purpose                                               |
| ---------------- | ------------------- | ----------------------------------------------------- |
| `/auth`          | `LoginComponent`    | Full-screen login card with "Continue" button         |
| `/auth/callback` | `CallbackComponent` | Processes the Auth0 redirect and bootstraps app state |

---

## Login flow

`LoginComponent` checks `AuthService.isAuthenticated$` on init — if the user already has a valid session, it skips the login screen and navigates to `/`. Otherwise it renders a centered PrimeNG `p-card` with a single "Continue with your account" button that calls `auth.loginWithRedirect()`.

---

## Callback flow (`CallbackComponent`)

After Auth0 redirects to `/auth/callback`, this component orchestrates a sequential bootstrap:

```
Auth0 isAuthenticated$ (true)
  → GET /auth/me          (upserts the Auth0 user in the DB on first login)
  → setUser(user)         (stores User in AuthStore → sessionStorage)
  → GET /organizations    (fetch the user's orgs)
  → setActiveOrg(orgs[0]) (store first org in OrganizationsStore → localStorage, if none persisted)
  → navigate('/')         (enter the app)
```

This sequence is intentionally linear (RxJS `switchMap` chain) so each step completes before the next begins.

### Why services are provided at the route level

`CallbackComponent` re-provides `AuthApi`, `OrganizationsApi`, and `API_BASE_URL` in the `/auth/callback` route's `providers` array:

```ts
{
  path: 'callback',
  component: CallbackComponent,
  providers: [
    AuthApi,
    OrganizationsApi,
    { provide: API_BASE_URL, useValue: environment.apiUrl },
  ],
}
```

Each MFE is a separate Webpack bundle. Without this, `inject(API_BASE_URL)` inside the auth bundle would look up a different `InjectionToken` instance than the one provided by the shell, resulting in a `NullInjectorError`. Re-providing at the route level ensures the token resolved by services in this bundle is the one created by _this_ bundle.

---

## File structure

```
src/app/remote-entry/
  entry.ts             — re-exports AUTH_ROUTES (required by Module Federation)
  entry.routes.ts      — declares AUTH_ROUTES with providers
  login.component.ts   — LoginComponent
  callback.component.ts — CallbackComponent
src/environments/
  environment.ts       — { production, apiUrl, auth0Domain, auth0ClientId, auth0Audience }
```

---

## Running standalone

```sh
npx nx serve auth
```

> In standalone mode the auth remote starts on port 4201 but Auth0 will redirect back to `http://localhost:4200/auth/callback` (the shell URL). Always serve via `npx nx serve shell --devRemotes=auth` in practice.
