# Architecture Rules

Rules governing the structural patterns, layering, and wiring of this Module Federation monorepo.

---

## The four patterns

Every file belongs to exactly one pattern. Understand which you're working in before writing code.

| Pattern | Name               | Location                       | Responsibility                                     |
| ------- | ------------------ | ------------------------------ | -------------------------------------------------- |
| A       | Shell host         | `apps/shell/`                  | Global providers, routing, layout, guards           |
| B       | Remote MFE         | `apps/{auth,platform,admin}/`  | Feature pages, `entry.routes.ts`, `./Routes` export |
| C       | data-access lib    | `libs/{domain}/data-access/`   | API service, types, optional store/interceptor      |
| D       | shared utility lib | `libs/shared/{name}/`          | Tokens, types, constants — zero business logic      |

---

## Layering and module boundaries

Nx ESLint enforces these dependency constraints:

```
app  → feature → data-access → ui → util
```

- **`type:app`** can depend on feature, data-access, ui, util
- **`type:feature`** can depend on data-access, ui, util
- **`type:data-access`** can depend on ui, util
- **`type:ui`** can depend on util only
- **`type:util`** has no dependencies

Scope constraints:
- **`scope:shared`** libs can be imported by any scope
- Domain-scoped `data-access` libs can only import from `scope:shared`

---

## Shell (Pattern A) — single host

The shell is the **only** host app. It owns:

- **`appConfig`**: All global providers — Auth0, PrimeNG, `API_BASE_URL`, interceptor chain
- **`app.routes.ts`**: Top-level routes, `loadChildren` for each remote
- **Guards**: `authGuard`, `orgGuard` (composition: `authGuard` first, then `orgGuard` for platform routes)
- **Layout**: `ShellLayoutComponent` (navbar + `<router-outlet>`), `OrgSelectComponent`
- **`RemoteConfigService`**: Runtime MF config, per-remote error handling (renders `RemoteUnavailableComponent` on failure)
- **MF stubs**: `src/testing/mf-stubs.ts` for unit tests

**Route hierarchy:**
```
/auth/**          → auth MFE (no guards, full-screen)
/                 → [authGuard] → ShellLayoutComponent
  /org/select     → OrgSelectComponent
  /admin/**       → [orgGuard] → admin MFE
  /**             → [orgGuard] → platform MFE
```

**Never do in the shell:**
- Business logic or API calls (except `RemoteConfigService` fetching `remotes.json`)
- Feature components — those belong in remotes

---

## Remote MFE (Pattern B) — independently deployable

Each remote exposes a single `./Routes` entry point via `module-federation.config.ts`:

```ts
exposes: {
  './Routes': './apps/{name}/src/app/remote-entry/entry.routes.ts',
}
```

**entry.routes.ts structure:**
```ts
export const ROUTES: Route[] = [
  { path: '', redirectTo: 'default-page', pathMatch: 'full' },
  {
    path: '',
    providers: [
      { provide: API_BASE_URL, useValue: environment.apiUrl },
      SomeApi,
      AnotherApi,
    ],
    children: [
      { path: 'page', loadComponent: () => import('../page/page.component').then(m => m.PageComponent) },
    ],
  },
];
```

**Key rules:**
1. Always re-provide `API_BASE_URL` and all `*Api` services in the route group `providers[]`
2. Feature components are lazy-loaded via `loadComponent`
3. No global interceptors — those come from the shell
4. Each remote has its own `environment.ts`

---

## data-access library (Pattern C) — the standard lib

A data-access library may contain:

| Artifact       | Required?  | File pattern              |
| -------------- | ---------- | ------------------------- |
| API service    | **Yes**    | `{domain}.api.ts`         |
| Type aliases   | **Yes**    | `{domain}.api.types.ts`   |
| Signal store   | Optional   | `{domain}.store.ts`       |
| Interceptor    | Optional   | `{domain}.interceptor.ts` |

**File structure:**
```
libs/{domain}/data-access/src/
  lib/
    {domain}.api.ts
    {domain}.api.types.ts
    {domain}.store.ts        (optional)
    {domain}.interceptor.ts  (optional)
  index.ts                   ← public barrel, exports all public API
```

**Feature library (optional extension):**
```
libs/{domain}/feature/src/
  lib/
    {feature}.component.ts               ← root component (route target)
    {feature}.utils.ts                   ← shared interfaces + pure helpers
    {feature}-{section}-dialog.component.ts  ← sub-component (optional)
  index.ts                               ← exports only root component + routes
```

Sub-component rules:
- Split only when root exceeds ~400 lines or has 3+ independent sections
- Sub-components are **dumb** (input/output only) — root owns all store injection and async mutations
- Sub-components are NOT exported from the barrel
- Use Angular two-way binding: `@Input() visible` + `@Output() visibleChange`

---

## shared utility library (Pattern D) — no logic

Reserved for tokens, types, constants. Currently: `@saas-frontend/shared/util-types`.

**Never put** in a Pattern D lib:
- HTTP calls
- Angular services
- State management
- Business logic

---

## Decision tree: which pattern?

```
Adding a feature page to an existing MFE?
  → Pattern B addition (add component + lazy route)

Creating a new backend API client?
  → Pattern C (new or existing data-access lib)

Adding a signal store or interceptor?
  → Pattern C (in the relevant domain lib)

Adding global types or injection tokens?
  → Pattern D (libs/shared/)

Need a new independently deployable MFE?
  → Pattern B (new app — rare, requires arch discussion)
```

When in doubt: if new code shares the same backend domain (same API URL prefix), add to the existing lib.

---

## Bootstrap flow (shell)

1. Auth0 `provideAuth0()` initializes
2. `RemoteConfigService` fetches `remotes.json` (production) or no-op (dev)
3. Router activates → `authGuard` checks Auth0 session
4. `GET /auth/me` → hydrate `AuthStore`
5. Load orgs → populate `OrganizationsStore`
6. Connect Socket.IO for notifications/jobs
7. Route to platform MFE (or org select if no active org)

---

## Adding new artifacts checklist

### New page in existing MFE
- [ ] Component with `OnPush`, inline template, `inject()`
- [ ] Lazy route in `entry.routes.ts`
- [ ] API service added to route `providers[]` if needed
- [ ] Nav link in `navbar.component.ts` if user-visible
- [ ] Spec file co-located

### New data-access library
- [ ] Generated via `npx nx g @nx/js:lib libs/{domain}/data-access --importPath=@saas-frontend/{domain}/data-access`
- [ ] API service: `providedIn: 'root'`, `inject(API_BASE_URL)`, returns `Observable<T>`
- [ ] Types: aliases from `@saas-frontend/shared/util-types`
- [ ] Barrel: `index.ts` exports
- [ ] Consuming remote: service added to `entry.routes.ts` `providers[]`
- [ ] Spec file co-located

### New remote MFE (rare)
- [ ] Generated via `npx nx g @nx/angular:remote {name} --host=shell --port={N}`
- [ ] MF config with singleton sharing
- [ ] `entry.routes.ts` with re-provided `API_BASE_URL`
- [ ] Shell: type declaration in `remotes.d.ts`, added to `module-federation.config.ts`
- [ ] Shell: route in `app.routes.ts` with guards
- [ ] Shell: stub in `src/testing/mf-stubs.ts`
