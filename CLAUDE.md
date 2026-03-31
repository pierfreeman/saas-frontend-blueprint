# CLAUDE.md — saas-frontend-blueprint

> This file gives Claude (and other AI agents) deep project context.
> Rules in `.claude/rules/` are loaded automatically alongside this file.
> Per-module READMEs provide additional domain detail — use progressive disclosure.

---

## Project overview

Production-ready **multi-tenant SaaS frontend** built as an Nx 22 monorepo.
Four independently deployable Angular 21 micro-frontends (MFEs) via Webpack Module Federation, sharing a unified design system (PrimeNG 21 Aura + Tailwind CSS v4) and a type-safe API client layer generated from the backend OpenAPI schema.

Pairs with [saas-backend-blueprint](../saas-backend-blueprint) (NestJS 11 + Prisma 6).

---

## Tech stack

| Concern         | Choice                                                       |
| --------------- | ------------------------------------------------------------ |
| Framework       | Angular 21 (standalone components, signals, `inject()`)      |
| Monorepo        | Nx 22                                                        |
| Micro-frontends | Webpack Module Federation (`@nx/module-federation`)          |
| UI library      | PrimeNG 21 — Aura theme                                      |
| Styling         | Tailwind CSS v4 + `tailwindcss-primeui`                      |
| State           | Angular Signals — no NgRx / Akita / NGXS                     |
| Auth            | Auth0 (`@auth0/auth0-angular`) — RS256 PKCE, silent refresh  |
| HTTP            | Angular `HttpClient` + functional interceptors               |
| Type safety     | OpenAPI-generated types (`@saas-frontend/shared/util-types`) |
| Testing         | Vitest 4 + Angular Testing Library + jsdom                   |
| Real-time       | Socket.IO client 4.8 (notifications, job status)             |
| Calendar        | FullCalendar 6 + rrule 2.8                                   |
| Lint            | ESLint + `angular-eslint` + Nx module boundary enforcement   |
| Package manager | npm 10+                                                      |

---

## Monorepo structure

```
apps/
  shell/          → Host (port 4200): routing, layout, guards, global providers
  auth/           → Remote (port 4201): login, Auth0 callback
  platform/       → Remote (port 4202): dashboard, members, settings, billing, planning
  admin/          → Remote (port 4203): super-admin (placeholder)

libs/
  shared/
    util-types/       → API_BASE_URL token + OpenAPI TypeScript types (auto-generated)
    util-auth/        → authGuard, orgGuard, permissionGuard
    util-rbac/        → PermissionsService, *hasPermission / *hasPlan directives
    util-org-context/ → OrgContextService — org switching, tenant store flushes
    util-error/       → errorInterceptor, ApiError type
  auth/data-access/           → AuthStore (signals, sessionStorage), AuthApi
  organizations/data-access/  → OrganizationsStore (signals, localStorage), OrganizationsApi, tenantInterceptor
  memberships/data-access/    → MembershipsApi, MembershipsStore
  billing/data-access/        → BillingApi (Stripe checkout/portal/cancel)
  activity-log/data-access/   → ActivityLogApi
  entitlements/data-access/   → EntitlementsApi (plan-based feature flags)
  notifications/data-access/  → NotificationsApi
  planning/
    data-access/  → PlanningApi, PlanningStore (calendar events CRUD, RSVP, series split)
    feature/      → FullCalendar UI, RRULE builder, dialogs, conflict checking, reminders
  storage/data-access/        → StorageApi (presigned upload/download)
  tasks/data-access/          → TasksApi (background job status)
```

---

## Architecture — key concepts

### Module Federation topology

- **Shell** is the only host. It owns global providers, Auth0 init, route guards, and the persistent layout (navbar + `<router-outlet>`).
- **Remotes** (auth, platform, admin) each expose `./Routes` entry point. The shell loads them lazily via `loadChildren`.
- All `@saas-frontend/*` libs MUST be shared as **singletons** in every `module-federation.config.ts` — otherwise `InjectionToken` identity breaks across bundles.
- Every remote MUST re-provide `API_BASE_URL` and all `*Api` services in its route group `providers[]` to avoid `NullInjectorError`.

### Four architectural patterns

| Pattern | What                | Where                         | Purpose                                          |
| ------- | ------------------- | ----------------------------- | ------------------------------------------------ |
| A       | Shell host app      | `apps/shell/`                 | Global providers, routing, layout, guards        |
| B       | Remote MFE app      | `apps/{auth,platform,admin}/` | Feature pages, `entry.routes.ts` with `./Routes` |
| C       | data-access library | `libs/{domain}/data-access/`  | API service + types + optional store/interceptor |
| D       | shared utility lib  | `libs/shared/{name}/`         | Tokens, types, constants — no business logic     |

### Request pipeline (interceptors in order)

1. `AuthHttpInterceptor` — attaches `Authorization: Bearer <jwt>`
2. `tenantInterceptor` — attaches `x-org-id` header (skips `/auth/me`, `/auth0/*`)
3. `errorInterceptor` — maps HTTP errors to toasts; 401 → logout + redirect

### State management

- `AuthStore`: signals + `sessionStorage` (`saas.currentUser`)
- `OrganizationsStore`: signals + `localStorage` (`saas.activeOrgId`, `saas.activeOrgName`)
- `MembershipsStore`, `PlanningStore`: signals, API-backed
- **No external state libraries.** All state via Angular `signal()`, `computed()`, `effect()`.

### Route guards

| Guard             | Condition                                     | Redirect      |
| ----------------- | --------------------------------------------- | ------------- |
| `authGuard`       | Auth0 `isAuthenticated$` is true              | `/auth`       |
| `orgGuard`        | `OrganizationsStore.hasActiveOrg()` is true   | `/org/select` |
| `permissionGuard` | User has required permission(s) for the route | (forbidden)   |

### RBAC

Static role→permission map: `READ_ONLY < MEMBER < ADMIN < OWNER`.
Frontend uses `PermissionsService` + `*hasPermission` / `*hasPlan` structural directives.
Same map exists on the backend — dual enforcement.

### Multi-tenancy

Every API call carries `x-org-id` via `tenantInterceptor`. `OrgContextService` manages org switching and flushes tenant-scoped stores.

### Dynamic remote loading (production)

`RemoteConfigService` fetches `/remotes.json` at runtime (written by `scripts/generate-env.sh` at Vercel build time). Shell renders `RemoteUnavailableComponent` if a remote fails to load — never crashes.

---

## Essential commands

```sh
# Install
npm install

# Serve all MFEs (dev)
npx nx serve shell --devRemotes=auth,platform,admin

# Serve shell + one remote (faster)
npx nx serve shell --devRemotes=platform

# Build all for production
npx nx run-many -t build --projects=shell,auth,platform,admin --parallel=1

# Run all unit tests
npx nx run-many -t test --all

# Run single project tests
npx nx run platform:test
npx nx run shell:test --watch

# Coverage
npx nx run-many -t test --all --coverage --parallel=3

# Lint
npx nx run-many -t lint --all

# Type-check
npx nx run-many -t typecheck --all

# Regenerate OpenAPI types (backend must be running)
npx openapi-typescript http://localhost:3000/swagger-json \
  -o libs/shared/util-types/src/lib/openapi.types.ts

# Visualize project graph
npx nx graph
```

> Always run tasks through `nx` (never the underlying tooling directly).
> Prefix nx commands with `npx` to use the workspace-local CLI.

---

## Deployment

Each MFE is an independent **Vercel** project. `scripts/vercel-build.sh` reads env vars and generates `environment.prod.ts` + `public/remotes.json`. `scripts/vercel-ignore.sh` skips builds when the app isn't affected (Nx affected).

---

## Where to find more detail

| Topic                      | File                                                 |
| -------------------------- | ---------------------------------------------------- |
| Adding pages / libs / MFEs | `CONTRIBUTING.md` (§4–§6)                            |
| Hard rules & anti-patterns | `CONTRIBUTING.md` (§7, §10)                          |
| Testing conventions        | `CONTRIBUTING.md` (§8) + `.claude/rules/testing.md`  |
| Code style rules           | `.claude/rules/code-style.md`                        |
| Security rules             | `.claude/rules/security.md`                          |
| Architecture patterns      | `.claude/rules/architecture.md`                      |
| Per-lib API/types detail   | `libs/{domain}/data-access/README.md`                |
| Per-app routing/providers  | `apps/{name}/README.md`                              |
| Backend API conventions    | `../saas-context-docs/docs/api/conventions.md`       |
| RBAC / permissions model   | `../saas-context-docs/docs/patterns/permissions.md`  |
| Full architecture overview | `../saas-context-docs/docs/architecture/overview.md` |

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## Nx guidelines

- Always run tasks through `nx` (`npx nx run`, `npx nx run-many`, `npx nx affected`) — never raw tooling
- For navigating/exploring the workspace, invoke the `nx-workspace` skill first
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md` (if available)
- NEVER guess CLI flags — always check `nx_docs` or `--help` first when unsure
- For scaffolding tasks, ALWAYS invoke the `nx-generate` skill FIRST

<!-- nx configuration end-->
