# Copilot Instructions — saas-frontend-blueprint

> Copilot loads this file automatically as global project context.
> For deeper detail, read the per-module READMEs via progressive disclosure.

---

## Project overview

Multi-tenant SaaS frontend — Nx 22 monorepo, Angular 21, Webpack Module Federation.
Four independently deployable MFEs: shell (host), auth, platform, admin.
Pairs with [saas-backend-blueprint](../saas-backend-blueprint) (NestJS 11 + Prisma 6).

## Tech stack

Angular 21 (standalone, signals, `inject()`) · Nx 22 · Webpack Module Federation · PrimeNG 21 Aura · Tailwind CSS v4 · Auth0 PKCE · Vitest 4 + jsdom · Socket.IO 4.8 · FullCalendar 6 + rrule 2.8

## Monorepo layout

```
apps/shell/      → Host (4200): routing, layout, guards, global providers
apps/auth/       → Remote (4201): login, Auth0 callback
apps/platform/   → Remote (4202): dashboard, members, settings, billing, planning
apps/admin/      → Remote (4203): super-admin placeholder

libs/shared/util-types/       → API_BASE_URL token + OpenAPI types (auto-generated)
libs/shared/util-auth/        → authGuard, orgGuard, permissionGuard
libs/shared/util-rbac/        → PermissionsService, *hasPermission / *hasPlan directives
libs/shared/util-org-context/ → OrgContextService — org switching
libs/shared/util-error/       → errorInterceptor, ApiError type
libs/{domain}/data-access/    → API service + types + optional store/interceptor
libs/planning/feature/        → FullCalendar UI, RRULE builder, dialogs
```

## Code style — hard rules

1. **Always `ChangeDetectionStrategy.OnPush`** — no exceptions.
2. **Standalone components only** — no NgModule.
3. **Inline templates** — `template: \`...\``, never `templateUrl`.
4. **No separate `.html` or `.scss` files** — Tailwind utility classes only.
5. **`inject()` for all DI** — never constructor injection. Private fields: `readonly #api = inject(FooApi)`.
6. **Signals for state** — `signal()`, `computed()`, `effect()`. No BehaviorSubject, no NgRx.
7. **API services**: `@Injectable({ providedIn: 'root' })`, inject `API_BASE_URL` + `HttpClient`, return `Observable<T>`, never subscribe internally.
8. **Types from OpenAPI only** — `import type { components } from '@saas-frontend/shared/util-types'`, never hand-write DTOs.
9. **Import aliases** — use `@saas-frontend/*` path aliases, import from barrel `index.ts`.

## Module Federation rules

- Every `module-federation.config.ts` MUST share `@saas-frontend/*` as **singletons**.
- Every remote's `entry.routes.ts` MUST re-provide `API_BASE_URL` and all `*Api` services in `providers[]`.
- Never add `*Api` services to shell `appConfig`.

## Interceptor pipeline (shell registers these)

1. `AuthHttpInterceptor` → `Authorization: Bearer <jwt>`
2. `tenantInterceptor` → `x-org-id` header (skips `/auth/me`, `/auth0/*`)
3. `errorInterceptor` → HTTP errors → toasts; 401 → logout

## State management

- `AuthStore`: signals + `sessionStorage` (`saas.currentUser`)
- `OrganizationsStore`: signals + `localStorage` (`saas.activeOrgId`, `saas.activeOrgName`)
- Storage keys always prefixed `saas.`. Handle storage failures silently.

## RBAC

Role hierarchy: `READ_ONLY < MEMBER < ADMIN < OWNER`.
Use `PermissionsService` — never hardcode role checks.
Frontend RBAC is UX only — backend always re-validates.

## Testing

- **Vitest 4** + jsdom. No E2E.
- Spec files co-located: `{name}.spec.ts` next to source. Never `tests/` dirs.
- Mock all `*Api` services. Use `provideHttpClientTesting()` for API tests.
- Shell tests: stub remotes via `vi.mock('auth/Routes', () => import('src/testing/mf-stubs'))`.
- Always `httpMock.verify()` in `afterEach`.

## Security

- JWT managed by Auth0 SDK — never store/decode manually.
- `tenantInterceptor` handles `x-org-id` — never bypass.
- No secrets in `environment.ts` — only public config.
- Never commit `environment.prod.ts` (generated at build time).
- No `innerHTML` with user data.

## Commands

```sh
npx nx serve shell --devRemotes=auth,platform,admin   # dev
npx nx run-many -t test --all                          # all tests
npx nx run platform:test --watch                       # single project
npx nx run-many -t lint --all                          # lint
npx nx run-many -t typecheck --all                     # type-check
```

> Always run through `npx nx` — never raw tooling.

## Anti-patterns (forbidden)

- `constructor(private x: Y)` → use `inject()`
- `templateUrl` / `.html` / `.scss` → inline template + Tailwind
- `interface MyDto {}` → OpenAPI type alias
- `HttpClient` in components → use `*Api` service
- `NgModule` → standalone
- `BehaviorSubject` → `signal()`
- `subscribe()` in API service → return `Observable<T>`

## Where to find more

| Topic | File |
|---|---|
| Architecture patterns | `.claude/rules/architecture.md` |
| Full code style | `.claude/rules/code-style.md` |
| Testing conventions | `.claude/rules/testing.md` |
| Security rules | `.claude/rules/security.md` |
| Contributing guide | `CONTRIBUTING.md` |
| Per-lib detail | `libs/{domain}/data-access/README.md` |
| Per-app detail | `apps/{name}/README.md` |
