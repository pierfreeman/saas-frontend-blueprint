# saas-frontend-blueprint

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=pierfreeman_saas-frontend-blueprint&metric=alert_status&token=0501e485a8e14b73a4e194e5c8902f121989087c)](https://sonarcloud.io/summary/new_code?id=pierfreeman_saas-frontend-blueprint)(https://github.com/pierfreeman/saas-frontend-blueprint/actions/workflows/ci.yml)

Production-ready multi-tenant SaaS frontend built as an [Nx](https://nx.dev) monorepo using **Angular 21 Module Federation**.

Four independently deployable micro-frontends (MFEs) share a single shell host, a unified design system (PrimeNG + Tailwind v4), and a type-safe API client layer coded against the backend OpenAPI schema.

Designed to pair with [saas-backend-blueprint](../saas-backend-blueprint).

---

## Tech stack

| Concern          | Choice                                                       |
| ---------------- | ------------------------------------------------------------ |
| Framework        | Angular 21 (standalone components, signals)                  |
| Monorepo         | Nx 22                                                        |
| Micro-frontends  | Webpack Module Federation (`@nx/module-federation`)          |
| UI library       | PrimeNG 21 — Aura theme                                      |
| Styling          | Tailwind CSS v4 + `tailwindcss-primeui`                      |
| State management | Angular Signals (no NgRx)                                    |
| Authentication   | Auth0 (`@auth0/auth0-angular`) — RS256, PKCE, silent refresh |
| HTTP client      | Angular `HttpClient` + functional interceptors               |
| Type safety      | OpenAPI-aligned types (`@saas-frontend/shared/util-types`)   |
| Testing          | Vitest 4 + Angular Testing Library                           |
| Bundler          | Webpack 5 (MF bundles), Vite (unit tests)                    |
| Lint             | ESLint + `angular-eslint`                                    |

---

## Features

- 🏢 **Multi-tenancy** — every API call carries an `x-org-id` header injected automatically by the `tenantInterceptor`
- 🔐 **Auth0 PKCE flow** — login, silent token refresh, automatic redirect to `/auth` on expiry
- 🔀 **Org switcher** — users belonging to multiple orgs pick an active org at login; persisted to `localStorage`
- 👥 **Members management** — invite, update role, remove members with optimistic UI
- 💳 **Billing** — subscription status card, Stripe Checkout redirect, Billing Portal session, cancel with confirmation dialog
- ⚙️ **Settings** — profile info, org rename, org data export request, org deletion (danger zone with confirm)
- 📊 **Dashboard** — real-time stat cards (total members, active plan, storage used), skeleton loading states
- 🎨 **Shared design system** — PrimeNG Aura theme, Tailwind utility classes, `tailwindcss-primeui` color palette integration
- 🧩 **Module Federation** — each MFE is independently built and deployable; the shell composes them at runtime
- 🔒 **Route guards** — `authGuard` (Auth0 session) + `orgGuard` (active org required before accessing platform routes)
- 📅 **Planning / Calendar** — FullCalendar with month/week/day views, recurring events (RRULE builder), drag-and-drop rescheduling, RSVP, live conflict checking, per-occurrence exceptions, This-and-Following series splitting, IANA timezone selector, event reminder presets

---

## Monorepo structure

```
apps/
  shell/          — Host app (port 4200): routing, layout, guards, global providers
  auth/           — Auth MFE (port 4201): login page, Auth0 callback handler
  platform/       — Platform MFE (port 4202): dashboard, members, settings, billing
  admin/          — Admin MFE (port 4203): super-admin dashboard (placeholder)

libs/
  auth/
    data-access/  — AuthStore (signals), AuthApi, type aliases
  organizations/
    data-access/  — OrganizationsStore (signals), OrganizationsApi, tenantInterceptor
  memberships/
    data-access/  — MembershipsApi, type aliases
  billing/
    data-access/  — BillingApi (checkout, portal, subscription, cancel), type aliases
  activity-log/
    data-access/  — ActivityLogApi, type aliases
  entitlements/
    data-access/  — EntitlementsApi, type aliases
  notifications/
    data-access/  — NotificationsApi, type aliases
  planning/
    data-access/  — PlanningApi, PlanningStore, planning API types
    feature/      — FullCalendar UI, RRULE builder, dialogs, conflict checking, reminders
  storage/
    data-access/  — StorageApi (presigned upload/download), type aliases
  tasks/
    data-access/  — TasksApi (background job status), type aliases
  shared/
    util-types/   — API_BASE_URL injection token, OpenAPI-aligned TypeScript types
```

---

## Prerequisites

| Tool    | Minimum version                                                                        |
| ------- | -------------------------------------------------------------------------------------- |
| Node.js | 20                                                                                     |
| npm     | 10                                                                                     |
| Auth0   | SPA application configured (see [Auth0 setup](#auth0-setup))                           |
| Backend | [saas-backend-blueprint](../saas-backend-blueprint) running on `http://localhost:3000` |

---

## Quick start

```sh
# 1. Install dependencies
npm install

# 2. Configure environment variables
#    Edit apps/shell/src/environments/environment.ts  (auth0 + apiUrl)
#    Edit apps/platform/src/environments/environment.ts  (stripePriceId)

# 3. Start all MFEs in development mode
npx nx serve shell --devRemotes=auth,platform,admin
```

The shell starts on **http://localhost:4200** and launches the remotes on ports 4201–4203 automatically.

To serve only specific remotes (faster startup):

```sh
npx nx serve shell --devRemotes=platform
```

---

## MFE ports

| App      | Port | Role   | Exposes    |
| -------- | ---- | ------ | ---------- |
| shell    | 4200 | host   | —          |
| auth     | 4201 | remote | `./Routes` |
| platform | 4202 | remote | `./Routes` |
| admin    | 4203 | remote | `./Routes` |

---

## Environment configuration

**`apps/shell/src/environments/environment.ts`** — drives auth and the global API URL for all interceptors

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  auth0Domain: 'your-tenant.auth0.com',
  auth0ClientId: 'your-spa-client-id',
  auth0Audience: 'https://api.your-app.com',
  auth0RedirectUri: 'http://localhost:4200/auth/callback',
};
```

> **Production**: `environment.prod.ts` is generated at Vercel build time by `scripts/generate-env.sh` from Vercel environment variables — never edit it manually.

**`apps/platform/src/environments/environment.ts`** — platform-specific config

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  stripePriceId: 'price_xxx', // Stripe Price ID for the subscription plan
};
```

> **AI agents**: `stripePriceId` must match a real Stripe Price object in test mode (Stripe Dashboard → Products → select plan → copy price ID).

---

## Development commands

```sh
# Serve all MFEs
npx nx serve shell --devRemotes=auth,platform,admin

# Build all for production
npx nx run-many -t build --all

# Run all unit tests
npx nx run-many -t test --all

# Run tests for a single project
npx nx run shell:test
npx nx run platform:test --watch

# Coverage report
npx nx run shell:test --coverage

# Lint all
npx nx run-many -t lint --all

# Type-check
npx tsc -p apps/shell/tsconfig.app.json --noEmit
npx tsc -p apps/platform/tsconfig.app.json --noEmit

# Visualize project graph
npx nx graph
```

---

## Architecture

### Module Federation topology

```
                    ┌─────────────────────────────────────────┐
                    │              shell (4200)               │
                    │  routing · layout · guards · providers   │
                    └────────┬──────────┬──────────┬──────────┘
                             │          │          │
              ┌──────────────▼──┐  ┌────▼────┐  ┌─▼────────┐
              │   auth (4201)   │  │platform │  │  admin   │
              │  login·callback │  │ (4202)  │  │  (4203)  │
              └─────────────────┘  └─────────┘  └──────────┘
```

The shell loads each remote lazily via `loadChildren(() => import('auth/Routes'))`. Each remote exposes a single `./Routes` entry. All `@saas-frontend/*` workspace libs are declared as **shared singletons** in every MFE's webpack config so Angular's DI system gets a single instance across the module boundary.

### Request pipeline

Every API request passes through these functional interceptors (registered in shell's `appConfig`):

| Order | Interceptor           | Purpose                                                             |
| ----- | --------------------- | ------------------------------------------------------------------- |
| 1     | `AuthHttpInterceptor` | Attaches `Authorization: Bearer <jwt>` (Auth0)                      |
| 2     | `tenantInterceptor`   | Attaches `x-org-id: <activeOrgId>`; skips `/auth/me` and `/auth0/*` |
| 3     | `errorInterceptor`    | Maps HTTP errors to toast notifications; 401 → logout + redirect    |

### State management

| Store                | Lib                                        | Persistence      | Key signals                                    |
| -------------------- | ------------------------------------------ | ---------------- | ---------------------------------------------- |
| `AuthStore`          | `@saas-frontend/auth/data-access`          | `sessionStorage` | `currentUser`, `isLoggedIn`                    |
| `OrganizationsStore` | `@saas-frontend/organizations/data-access` | `localStorage`   | `activeOrgId`, `activeOrgName`, `hasActiveOrg` |

### Route guards

| Guard       | File                              | Condition                                     | Redirect      |
| ----------- | --------------------------------- | --------------------------------------------- | ------------- |
| `authGuard` | `apps/shell/src/app/app.guard.ts` | `AuthService.isAuthenticated$` is `true`      | `/auth`       |
| `orgGuard`  | `apps/shell/src/app/org.guard.ts` | `OrganizationsStore.hasActiveOrg()` is `true` | `/org/select` |

### Route hierarchy

```
/auth/**         → auth MFE (no guards)
/                → authGuard → ShellLayout
  /              → orgGuard → platform MFE
    /dashboard
    /members
    /settings
    /billing
  /org/select    → platform MFE (org selection screen)
  /admin/**      → orgGuard → admin MFE
```

### API_BASE_URL token — why remotes re-provide it

Each MFE is a separate Webpack build with its own DI scope. `InjectionToken` identity is tied to the bundle that created it. To avoid `NullInjectorError`, every remote re-provides `API_BASE_URL` (and all `*Api` services) in its route group `providers` array:

```ts
// apps/platform/src/app/remote-entry/entry.routes.ts
{
  path: '',
  providers: [
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    MembershipsApi,
    BillingApi,
    OrganizationsApi,
  ],
  children: [ /* feature routes */ ],
}
```

### Component conventions

All page components follow this pattern:

- `ChangeDetectionStrategy.OnPush`
- Angular Signals for local reactive state (`signal()`, `computed()`, `effect()`)
- Standalone API — no `NgModule`
- PrimeNG components imported directly in \`imports\` array
- Inline template (no separate `.html` file)
- `inject()` for dependency injection

---

## Auth0 setup

1. Dashboard → **Applications → Create Application → Single Page Application**
2. **Allowed Callback URLs**: `http://localhost:4200/auth/callback`
3. **Allowed Logout URLs** and **Allowed Web Origins**: `http://localhost:4200`
4. Copy **Domain** and **Client ID** into `apps/shell/src/environments/environment.ts`
5. Create an **API** → set the `Identifier` to match `auth0Audience` in the shell env
6. Set the same Client ID as `AUTH0_SPA_CLIENT_ID` in the backend `.env` (used for email invite links)

---

## Libraries

| Import path                                | README                                        | Description                                                                           |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `@saas-frontend/auth/data-access`          | [→](libs/auth/data-access/README.md)          | `AuthStore`, `AuthApi` — user identity and session                                    |
| `@saas-frontend/organizations/data-access` | [→](libs/organizations/data-access/README.md) | `OrganizationsStore`, `OrganizationsApi`, `tenantInterceptor`                         |
| `@saas-frontend/memberships/data-access`   | [→](libs/memberships/data-access/README.md)   | `MembershipsApi` — CRUD for org members                                               |
| `@saas-frontend/billing/data-access`       | [→](libs/billing/data-access/README.md)       | `BillingApi` — subscription, checkout, portal, cancel                                 |
| `@saas-frontend/activity-log/data-access`  | [→](libs/activity-log/data-access/README.md)  | `ActivityLogApi` — paginated org activity log                                         |
| `@saas-frontend/entitlements/data-access`  | [→](libs/entitlements/data-access/README.md)  | `EntitlementsApi` — plan-based feature flags                                          |
| `@saas-frontend/notifications/data-access` | [→](libs/notifications/data-access/README.md) | `NotificationsApi` — in-app notifications                                             |
| `@saas-frontend/planning/data-access`      | [→](libs/planning/data-access/README.md)      | `PlanningApi`, `PlanningStore` — calendar events CRUD, RSVP, series split             |
| `@saas-frontend/planning/feature`          | [→](libs/planning/feature/README.md)          | Full calendar UI — FullCalendar, RRULE builder, This-and-Following split, reminder UX |
| `@saas-frontend/storage/data-access`       | [→](libs/storage/data-access/README.md)       | `StorageApi` — presigned upload/download URLs                                         |
| `@saas-frontend/tasks/data-access`         | [→](libs/tasks/data-access/README.md)         | `TasksApi` — background job status tracking                                           |
| `@saas-frontend/shared/util-types`         | [→](libs/shared/util-types/README.md)         | `API_BASE_URL` token, OpenAPI-aligned TypeScript types                                |

---

## Testing

Unit tests run with **Vitest** (ESM, no JSDom overhead). Each project has its own `vite.config.mts`. The workspace `vitest.workspace.ts` aggregates all projects.

```sh
npx nx run-many -t test --all          # all projects
npx nx run shell:test --watch          # watch mode
npx nx run shell:test --coverage       # coverage report (html + lcov)
```

Test files live next to source files as `*.spec.ts`.

---

## Adding a new feature page (platform MFE)

```sh
# 1. Create the component
touch apps/platform/src/app/<feature>/<feature>.component.ts

# 2. Register the route in platform's entry routes
#    apps/platform/src/app/remote-entry/entry.routes.ts

# 3. Add the service to the route group providers[] (never in root)

# 4. Add a nav link in the shell navbar
#    apps/shell/src/app/layout/navbar.component.ts
```

## Adding a new API client library

```sh
# 1. Generate the lib
npx nx g @nx/js:lib libs/<domain>/data-access

# 2. Implement <domain>.api.ts
#    - @Injectable({ providedIn: 'root' })
#    - inject(API_BASE_URL) + inject(HttpClient)
#    - return typed Observables using aliases from @saas-frontend/shared/util-types

# 3. Create <domain>.api.types.ts — re-export type aliases
# 4. Export from src/index.ts
# 5. Provide the service in the consuming route group providers[]
```

---

## Deployment (Vercel)

Each MFE is deployed as an **independent Vercel project** pointing at the same repository root (`.`). A single `vercel.json` at the root applies to all four projects.

### Projects

| Vercel project | `VERCEL_APP` env var | Output dir           | Port (dev) |
| -------------- | -------------------- | -------------------- | ---------- |
| `shell`        | `shell`              | `dist/apps/shell`    | 4200       |
| `auth`         | `auth`               | `dist/apps/auth`     | 4201       |
| `platform`     | `platform`           | `dist/apps/platform` | 4202       |
| `admin`        | `admin`              | `dist/apps/admin`    | 4203       |

**Build command** (all projects): `bash scripts/vercel-build.sh`  
**Output directory** (all projects): `dist/apps/$VERCEL_APP`  
**Install command**: `npm install`

### Environment variables (per-project)

Every project needs at minimum `VERCEL_APP` set to its name. The shell additionally requires:

| Variable              | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `VERCEL_APP`          | App name (`shell`, `auth`, `platform`, `admin`)        |
| `API_URL`             | Backend API base URL                                   |
| `AUTH0_DOMAIN`        | Auth0 tenant domain                                    |
| `AUTH0_CLIENT_ID`     | Auth0 SPA client ID                                    |
| `AUTH0_AUDIENCE`      | Auth0 API identifier                                   |
| `AUTH0_REDIRECT_URI`  | Deployed shell URL + `/auth/callback`                  |
| `REMOTE_AUTH_URL`     | `https://<auth-project>.vercel.app/remoteEntry.js`     |
| `REMOTE_PLATFORM_URL` | `https://<platform-project>.vercel.app/remoteEntry.js` |
| `REMOTE_ADMIN_URL`    | `https://<admin-project>.vercel.app/remoteEntry.js`    |

`scripts/generate-env.sh` reads these variables and writes `environment.prod.ts` (and `public/remotes.json` for the shell) at build time.

### Dynamic remote loading

The shell loads remote entry URLs at **runtime** (not at build time) via `RemoteConfigService`:

1. `provideAppInitializer` calls `RemoteConfigService.loadConfig()` before the router activates.
2. `loadConfig()` fetches `/remotes.json` (served as a static asset) and registers each remote with the `@module-federation/runtime` 2.x runtime.
3. `app.routes.ts` wraps every `loadChildren` in `RemoteConfigService.loadRoutes()` — if a remote fails to load, the shell renders `RemoteUnavailableComponent` instead of crashing.

This means the shell can point at different remote URLs **without being rebuilt**.

### Selective builds (Nx affected)

`scripts/vercel-ignore.sh` skips the build when the Vercel project's app is not in the Nx affected graph for the current commit. This avoids unnecessary rebuilds in CI/CD when only unrelated code changed.

---

## Related

- [saas-backend-blueprint](../saas-backend-blueprint) — NestJS API this frontend communicates with
