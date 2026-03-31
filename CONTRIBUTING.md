# Contributing Guide

This document is the primary reference for adding new components — libraries, pages, or MFEs — to this monorepo. It targets both human developers and AI coding agents acting on this codebase.

Read this before writing any code. The architecture is intentional. Deviating from the patterns documented here will be caught in code review.

---

## Table of Contents

1. [Monorepo overview](#1-monorepo-overview)
2. [Four architectural patterns](#2-four-architectural-patterns)
3. [Decision tree: which pattern to use?](#3-decision-tree-which-pattern-to-use)
4. [Adding a new page (to an existing MFE)](#4-adding-a-new-page-to-an-existing-mfe)
5. [Adding a new data-access library](#5-adding-a-new-data-access-library)
6. [Adding a new remote MFE](#6-adding-a-new-remote-mfe)
7. [Invariants and hard rules](#7-invariants-and-hard-rules)
8. [Testing conventions](#8-testing-conventions)
9. [Running the project locally](#9-running-the-project-locally)
10. [Anti-patterns reference](#10-anti-patterns-reference)

---

## 1. Monorepo overview

```
saas-frontend-blueprint/
├── apps/
│   ├── shell/      ← Host MFE (port 4200): routing, layout, guards, global providers
│   ├── auth/       ← Auth MFE (port 4201): login, Auth0 callback
│   ├── platform/   ← Platform MFE (port 4202): dashboard, members, settings, billing
│   └── admin/      ← Admin MFE (port 4203): super-admin area (placeholder)
└── libs/
    ├── shared/util-types/          ← API_BASE_URL token + OpenAPI types (no logic)
    ├── auth/data-access/           ← AuthStore, AuthApi
    ├── organizations/data-access/  ← OrganizationsStore, OrganizationsApi, tenantInterceptor
    ├── memberships/data-access/    ← MembershipsApi
    ├── billing/data-access/        ← BillingApi
    ├── activity-log/data-access/   ← ActivityLogApi
    ├── entitlements/data-access/   ← EntitlementsApi
    ├── notifications/data-access/  ← NotificationsApi
    ├── storage/data-access/        ← StorageApi
    └── tasks/data-access/          ← TasksApi
```

**Stack:** Nx 22 · Angular 21 · Webpack Module Federation · PrimeNG 21 (Aura) · Tailwind v4 · Auth0 · Vitest.

**Rule of thumb:** business logic and HTTP calls live in `libs/`. Apps are thin orchestration layers — routing, route providers wiring, layout. If you find yourself writing API calls or state logic directly inside an app component, extract it to a library instead.

---

## 2. Four architectural patterns

Every file in this codebase belongs to exactly one of four patterns. Learning to read them is the first step before contributing.

---

### Pattern A — Shell host app

The shell is the **only host** in the monorepo. It owns:

- Top-level routing that composes all remotes via `loadChildren`
- Global Angular providers (`appConfig`): Auth0, PrimeNG theme, `API_BASE_URL`, global interceptors
- Route guards (`authGuard`, `orgGuard`)
- The persistent layout (`ShellLayoutComponent` with navbar + `<router-outlet>`)
- The org selection screen

**There is exactly one shell.** Do not replicate its global providers in remotes — remotes get them transitively via singleton sharing.

`RemoteConfigService` is registered via `provideAppInitializer` and runs before the router activates. It fetches `/remotes.json` (written at Vercel build time by `scripts/generate-env.sh`) and calls the MF 2.x `init()` runtime. Every remote `loadChildren` in `app.routes.ts` is wrapped by `RemoteConfigService.loadRoutes()` — if a remote bundle fails to load, the shell renders `RemoteUnavailableComponent` instead of crashing. In development this service is a no-op; webpack's dev-server resolves remotes via the `devRemotes` config.

```
apps/shell/src/
  app/
    app.config.ts          ← ApplicationConfig — all global providers
    app.routes.ts          ← top-level routes; loads remotes via loadChildren
    app.guard.ts           ← authGuard (Auth0 isAuthenticated$)
    org.guard.ts           ← orgGuard (OrganizationsStore.hasActiveOrg())
    error.interceptor.ts   ← maps HTTP errors to toast messages
    remote-config.service.ts  ← MF runtime config + per-remote error handling
    layout/
      shell-layout.component.ts
      navbar.component.ts
    org-select/
      org-select.component.ts
    remote-unavailable/
      remote-unavailable.component.ts  ← fallback UI when a remote fails to load
  environments/
    environment.ts
  remotes.d.ts             ← TypeScript module declarations for remote entry points
  testing/
    mf-stubs.ts            ← stub exports used in unit tests
```

---

### Pattern B — Remote MFE app

Each remote is an **independently deployable Angular app** that exposes a single `./Routes` entry point. The shell loads it lazily via `loadChildren`.

Key characteristics:

- `module-federation.config.ts` has `exposes: { './Routes': './apps/{name}/src/app/remote-entry/entry.routes.ts' }`
- All `@saas-frontend/*` libs are shared as **singletons** (see [Rule 2](#rule-2--always-share-org-libs-as-singletons))
- The main route group in `entry.routes.ts` re-provides `API_BASE_URL` and all `*Api` services it needs (see [Rule 3](#rule-3--always-re-provide-api_base_url-and-api-services-in-the-remote-route-group))
- Feature components are loaded lazily via `loadComponent`
- No global interceptors — those are handled by the shell

```
apps/{remote}/src/
  app/
    remote-entry/
      entry.ts            ← re-exports the named route array
      entry.routes.ts     ← route group with providers[] + lazy feature routes
    {feature}/
      {feature}.component.ts
  environments/
    environment.ts
```

**Currently using Pattern B:** `auth`, `platform`, `admin`.

---

### Pattern C — data-access library

The standard library pattern. A `data-access` library provides one or more of:

- An **API service** — `@Injectable({ providedIn: 'root' })`, injects `API_BASE_URL` and `HttpClient`, returns typed `Observable<T>`
- A **signal store** — `@Injectable({ providedIn: 'root' })`, uses Angular Signals, handles `localStorage`/`sessionStorage` persistence
- A **functional interceptor** — `HttpInterceptorFn`, registered in the shell's `appConfig`
- **Type aliases** — re-exported from the OpenAPI schema in `@saas-frontend/shared/util-types`

All four may coexist in the same library. Not all are required. The minimum is an API service + type aliases.

```
libs/{domain}/data-access/src/
  lib/
    {domain}.api.ts           ← API service (HTTP calls)
    {domain}.api.types.ts     ← type aliases from @saas-frontend/shared/util-types
    {domain}.store.ts         ← signal store (optional)
    {domain}.interceptor.ts   ← HttpInterceptorFn (optional)
  index.ts                    ← public exports
```

**All existing libs use Pattern C.**

---

### Pattern D — shared utility library

Reserved for libraries that provide **no business logic** — only tokens, types, constants, or pure utilities consumed by all other libs and apps.

Currently: `@saas-frontend/shared/util-types` (the `API_BASE_URL` token + OpenAPI type tree).

```
libs/shared/{name}/src/
  lib/
    *.token.ts        ← InjectionToken definitions
    *.types.ts        ← pure TypeScript types / interfaces
  index.ts
```

Do not put HTTP calls, Angular services, or any state in a Pattern D library.

---

## 3. Decision tree: which pattern to use?

```
Are you adding a feature page to an existing MFE?
  └─ YES → Pattern B addition. Add a component + lazy route in that MFE's entry.routes.ts.
           See §4.

Are you creating a new backend API client?
  └─ YES → Pattern C. Add an API service + types to an existing domain lib,
           or create a new data-access lib.
           See §5.

Are you adding a signal store or functional interceptor?
  └─ YES → Pattern C. Add it to the relevant domain's data-access lib.

Are you adding global types or injection tokens with no runtime logic?
  └─ YES → Pattern D. Add to libs/shared/.

Do you need an entirely new independently deployable MFE?
  └─ YES → Pattern B. Create a new app.
           See §6.
```

When in doubt between adding to an existing lib vs. creating a new one: if the new code belongs to the same backend domain (same resource prefix in the API URL), add it to the existing lib. Create a new lib only for a distinct domain.

---

## 4. Adding a new page (to an existing MFE)

### Step 1 — Create the component

Create `apps/platform/src/app/{feature}/{feature}.component.ts`.

Every page component **must** follow these conventions (no exceptions):

```ts
@Component({
  selector: 'app-{feature}',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,  // ← always OnPush
  imports: [/* PrimeNG components, RouterLink, etc. */],
  template: `...`,  // ← inline template; no separate .html file
})
export class {Feature}Component implements OnInit {
  // Dependency injection via inject()  ← never constructor injection
  readonly #{dep} = inject({Dep});

  // Local state via signals
  readonly data = signal<T | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    // Load data here
  }
}
```

### Step 2 — Register the lazy route

Add a `loadComponent` entry inside the anonymous provider route group in `entry.routes.ts`:

```ts
// apps/platform/src/app/remote-entry/entry.routes.ts
{
  path: '',
  providers: [
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    // ... existing services
    NewFeatureApi,   // ← add the service here
  ],
  children: [
    // ... existing routes
    {
      path: '{feature}',
      loadComponent: () =>
        import('../{feature}/{feature}.component').then(m => m.{Feature}Component),
    },
  ],
}
```

### Step 3 — Add the service to the provider group

If the component uses a new `*Api` service, add it to the route group `providers` array (the anonymous path `''` group). Never provide it globally in `appConfig`.

### Step 4 — Add a nav link (if user-visible)

Add a `routerLink` anchor to `apps/shell/src/app/layout/navbar.component.ts` in the primary nav block.

### Step 5 — Write tests

Create `{feature}.component.spec.ts` alongside the component file. See [§8 Testing conventions](#8-testing-conventions).

### Sub-components in feature libraries

Feature components may be split into focused sub-components when the root component **exceeds ~400 lines** or contains **3 or more self-contained template sections** (e.g., multiple independent dialogs or major panels). This is intentionally a high bar — most features should remain a single component.

When splitting is warranted:

- Place sub-components **alongside** the root component in the same `src/lib/` directory.
- Each sub-component must follow all existing conventions: `standalone: true`, `ChangeDetectionStrategy.OnPush`, inline template, `inject()` for DI.
- Extract shared types, interfaces, and pure helpers into a co-located `{feature}.utils.ts` file to avoid circular imports between the root and its sub-components.
- **Do not export** sub-components from the library barrel (`index.ts`). They are internal implementation details — the route lazy-loads only the root component.
- Sub-components are **"dumb" presentation components**: they receive data via `@Input()` and emit events via `@Output()`. The root component owns all store injections and handles every async mutation.
- Use the standard Angular two-way binding pattern for modal visibility: `@Input() visible = false` + `@Output() readonly visibleChange = new EventEmitter<boolean>()`, then bind with `[(visible)]` in the parent template.

**Updated file structure for a feature lib with sub-components:**

```
libs/{domain}/feature/src/
  lib/
    {feature}.component.ts               ← root component (orchestration, store, calendar, etc.)
    {feature}.utils.ts                   ← shared interfaces and pure helpers (optional)
    {feature}-{section}-dialog.component.ts  ← sub-component dialog (optional, repeat as needed)
  index.ts                               ← exports only the root component and routes
```

---

## 5. Adding a new data-access library

### Step 1 — Generate the Nx library

```sh
npx nx g @nx/js:lib libs/{domain}/data-access --importPath=@saas-frontend/{domain}/data-access
```

This registers `@saas-frontend/{domain}/data-access` in `tsconfig.base.json` and creates the base structure.

### Step 2 — Create the API service

```ts
// libs/{domain}/data-access/src/lib/{domain}.api.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type { SomeResponseType } from './{domain}.api.types';

@Injectable({ providedIn: 'root' })
export class {Domain}Api {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  getItems(): Observable<SomeResponseType[]> {
    return this.#http.get<SomeResponseType[]>(`${this.#base}/{resource}`);
  }
}
```

Rules:

- Always `providedIn: 'root'`
- Always inject `API_BASE_URL` and `HttpClient` via `inject()` (never constructor)
- Return typed `Observable<T>` (never subscribe inside the service)
- No business logic — just HTTP calls

### Step 3 — Create the type aliases file

```ts
// libs/{domain}/data-access/src/lib/{domain}.api.types.ts
import type { components, operations } from '@saas-frontend/shared/util-types';

// Prefer components['schemas'] for DTO shapes
export type {Domain}Response = components['schemas']['{Domain}ResponseDto'];
export type Create{Domain}Dto = components['schemas']['Create{Domain}Dto'];

// Use operations for endpoint-specific response types
export type {Domain}Item =
  operations['{Domain}Controller_findById']['responses']['200']['content']['application/json'];
```

Types must be derived from `@saas-frontend/shared/util-types` (the auto-generated OpenAPI type tree). Do not hand-write DTO shapes.

### Step 4 — Create the signal store (if managing global state)

Only create a store if the state needs to be shared across multiple components or persisted across navigation. Component-local state uses `signal()` directly in the component.

```ts
// libs/{domain}/data-access/src/lib/{domain}.store.ts
import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'saas.{domain}';

@Injectable({ providedIn: 'root' })
export class {Domain}Store {
  readonly someValue = signal<string | null>(localStorage.getItem(STORAGE_KEY));
  readonly hasSomeValue = computed(() => this.someValue() !== null);

  setValue(v: string): void {
    this.someValue.set(v);
    localStorage.setItem(STORAGE_KEY, v);
  }

  clearValue(): void {
    this.someValue.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }
}
```

### Step 5 — Write the public barrel

```ts
// libs/{domain}/data-access/src/index.ts
export { {Domain}Api } from './lib/{domain}.api';
export type { {Domain}Response, Create{Domain}Dto } from './lib/{domain}.api.types';
// Export store and interceptor if present
```

### Step 6 — Provide the service in consuming route groups

The service is `providedIn: 'root'` but must be explicitly added to the route group `providers` in each remote that uses it. This is required because of the Module Federation token identity issue (see [Rule 3](#rule-3--always-re-provide-api_base_url-and-api-services-in-the-remote-route-group)):

```ts
// apps/platform/src/app/remote-entry/entry.routes.ts
providers: [
  { provide: API_BASE_URL, useValue: environment.apiUrl },
  {Domain}Api,  // ← add here
  ...
],
```

### Step 7 — Write tests

Create `{domain}.api.spec.ts` co-located with the source. See [§8 Testing conventions](#8-testing-conventions).

### Step 8 — Update the OpenAPI types if needed

If the backend has added new endpoints, regenerate the OpenAPI type tree:

```sh
npx openapi-typescript http://localhost:3000/swagger-json \
  -o libs/shared/util-types/src/lib/openapi.types.ts
```

Do not edit `openapi.types.ts` by hand.

---

## 6. Adding a new remote MFE

Apps are rare. Add a new MFE only when you need a **distinct product surface** that is independently deployable and has its own route namespace in the shell.

### Step 1 — Generate the app

```sh
npx nx g @nx/angular:remote {name} --host=shell --port={next-available-port}
```

Ports are assigned sequentially: shell=4200, auth=4201, platform=4202, admin=4203. Use the next available.

### Step 2 — Configure Module Federation

In `apps/{name}/module-federation.config.ts`:

```ts
const config: ModuleFederationConfig = {
  name: '{name}',
  exposes: {
    './Routes': './apps/{name}/src/app/remote-entry/entry.routes.ts',
  },
  shared: (libraryName, defaultConfig) => {
    // This rule is MANDATORY for all @saas-frontend/* libs.
    if (libraryName.startsWith('@saas-frontend/')) {
      return { singleton: true, strictVersion: false, requiredVersion: false };
    }
    return defaultConfig;
  },
};
```

### Step 3 — Create the entry routes file

```ts
// apps/{name}/src/app/remote-entry/entry.routes.ts
import { Route } from '@angular/router';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { SomeApi } from '@saas-frontend/some-domain/data-access';
import { environment } from 'src/environments/environment';

export const {NAME}_ROUTES: Route[] = [
  { path: '', redirectTo: '{default-page}', pathMatch: 'full' },
  {
    path: '',
    providers: [
      { provide: API_BASE_URL, useValue: environment.apiUrl },
      SomeApi,
    ],
    children: [
      {
        path: '{page}',
        loadComponent: () => import('../{page}/{page}.component').then(m => m.{Page}Component),
      },
    ],
  },
];
```

### Step 4 — Declare the remote type in the shell

Add a module declaration to `apps/shell/src/remotes.d.ts`:

```ts
declare module '{name}/Routes' {
  import { Route } from '@angular/router';
  export const {NAME}_ROUTES: Route[];
}
```

### Step 5 — Register in the shell MF config

```ts
// apps/shell/module-federation.config.ts
remotes: ['auth', 'platform', 'admin', '{name}'],
```

### Step 6 — Add the shell route

```ts
// apps/shell/src/app/app.routes.ts
{
  path: '{namespace}',
  canActivate: [authGuard, orgGuard],  // adjust guards as needed
  loadChildren: () => import('{name}/Routes').then(m => m.{NAME}_ROUTES),
},
```

### Step 7 — Add a stub for tests

```ts
// apps/shell/src/testing/mf-stubs.ts
export const {NAME}_ROUTES: never[] = [];
```

### Step 8 — Configure the environment

```ts
// apps/{name}/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  // Add any MFE-specific config here
};
```

---

## 7. Invariants and hard rules

These rules are non-negotiable.

### Rule 1 — All components must use `ChangeDetectionStrategy.OnPush`

```ts
// ❌ WRONG
@Component({ selector: 'app-foo', template: '' })
export class FooComponent {}

// ✅ CORRECT
@Component({
  selector: 'app-foo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class FooComponent {}
```

### Rule 2 — Always share `@saas-frontend/*` libs as singletons in MF configs

Every `module-federation.config.ts` (shell and all remotes) must include the singleton sharing rule for `@saas-frontend/*`:

```ts
shared: (libraryName, defaultConfig) => {
  if (libraryName.startsWith('@saas-frontend/')) {
    return { singleton: true, strictVersion: false, requiredVersion: false };
  }
  return defaultConfig;
},
```

Without this, `InjectionToken` instances (e.g. `API_BASE_URL`) are duplicated — each bundle gets its own copy — and `inject()` calls in shared libs fail with `NullInjectorError`.

### Rule 3 — Always re-provide `API_BASE_URL` and `*Api` services in the remote route group

Each remote's `entry.routes.ts` **must** include an anonymous route group with `providers`:

```ts
{
  path: '',
  providers: [
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    SomeApi,
    AnotherApi,
  ],
  children: [ /* feature routes */ ],
}
```

Even though these services are `providedIn: 'root'`, the provider registration in the route group ensures the services are instantiated using the **token instances from this bundle**, not the shell bundle. Omitting this causes `NullInjectorError` for `API_BASE_URL`.

### Rule 4 — Use `inject()` for DI, never constructor injection

```ts
// ❌ WRONG
export class FooComponent {
  constructor(private readonly api: FooApi) {}
}

// ✅ CORRECT
export class FooComponent {
  readonly #api = inject(FooApi);
}
```

This applies to components, services, guards, interceptors, and stores.

### Rule 5 — No business logic in apps; no HTTP calls in components

Components orchestrate signals and call `*Api` methods. They must not construct URLs, manipulate response objects, or contain conditional logic about backend response shapes.

```ts
// ❌ WRONG — URL construction in component
this.#http.get(`http://localhost:3000/billing/subscription?orgId=${id}`);

// ✅ CORRECT — delegate to the API service
this.#billingApi.getSubscription(id);
```

If an API service method does not exist, add it to the library — do not reach for `HttpClient` in a component.

### Rule 6 — No state management libraries (no NgRx, no Akita, no NGXS)

All state is managed with Angular Signals. Use `signal()` for local component state and Signal Stores (Pattern C, `providedIn: 'root'`) for global cross-component state. Adding a state management library requires explicit architectural discussion.

### Rule 7 — No separate `.html` or `.scss` template files

All templates are inline strings in `template: \`...\``. All styles are Tailwind utility classes applied directly to elements. Component `.scss` files are not allowed.

### Rule 8 — Type aliases from OpenAPI, never hand-written DTOs

Any type that corresponds to a backend DTO or response must be an alias from `@saas-frontend/shared/util-types`:

```ts
// ❌ WRONG — hand-written interface
interface SubscriptionResponse {
  status: string;
  currentPeriodEnd: string;
}

// ✅ CORRECT — derived from OpenAPI schema
import type { components } from '@saas-frontend/shared/util-types';
export type SubscriptionResponse =
  components['schemas']['SubscriptionResponseDto'];
```

### Rule 9 — API services must never subscribe internally

An API service method returns `Observable<T>`. The caller subscribes.

```ts
// ❌ WRONG
getMe(): void {
  this.#http.get(...).subscribe(user => this.#store.setUser(user));
}

// ✅ CORRECT
getMe(): Observable<User> {
  return this.#http.get<User>(`${this.#base}/auth/me`);
}
```

---

## 8. Testing conventions

### Co-location

Every source file has its spec file **alongside it** in the same directory:

```
{feature}.component.ts
{feature}.component.spec.ts   ← always in the same directory
{domain}.api.ts
{domain}.api.spec.ts
```

No `tests/`, `__tests__/`, or `spec/` directories.

### Running tests

```sh
# All projects
npx nx run-many -t test --all

# Single project
npx nx run platform:test
npx nx run shell:test

# Watch mode
npx nx run shell:test --watch

# Coverage
npx nx run shell:test --coverage
```

### Writing specs

Tests use **Vitest** + Angular Testing Library (or `TestBed` for integration-style tests). Mock HTTP using `HttpClientTestingModule` or `provideHttpClientTesting()`.

```ts
// Example: unit-testing an API service
describe('BillingApi', () => {
  let api: BillingApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://test' },
        BillingApi,
      ],
    });
    api = TestBed.inject(BillingApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('calls GET /billing/subscription with orgId param', () => {
    api.getSubscription('org-1').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/billing/subscription'),
    );
    expect(req.request.params.get('orgId')).toBe('org-1');
    req.flush({ status: 'ACTIVE' });
  });
});
```

### Shell tests and MF stubs

When testing the shell, remote `loadChildren` imports would fail because the remote bundles do not exist in the test environment. Stub them using `src/testing/mf-stubs.ts`:

```ts
// In a test file
vi.mock('auth/Routes', () => import('src/testing/mf-stubs'));
vi.mock('platform/Routes', () => import('src/testing/mf-stubs'));
vi.mock('admin/Routes', () => import('src/testing/mf-stubs'));
```

---

## 9. Running the project locally

**Prerequisites:** Node.js 20+, npm 10+, a running [saas-backend-blueprint](../saas-backend-blueprint) instance, an Auth0 SPA application.

```sh
# Install dependencies
npm install

# Configure environments
# Edit apps/shell/src/environments/environment.ts    → apiUrl, auth0Domain, auth0ClientId, auth0Audience
# Edit apps/platform/src/environments/environment.ts → apiUrl, stripePriceId

# Start all MFEs in development mode
npx nx serve shell --devRemotes=auth,platform,admin

# Start only the shell + platform (auth and admin built statically)
npx nx serve shell --devRemotes=platform

# Production build of all apps
npx nx run-many -t build --all

# Type-check all apps
npx tsc -p apps/shell/tsconfig.app.json --noEmit
npx tsc -p apps/platform/tsconfig.app.json --noEmit
```

The shell starts at **http://localhost:4200**. Remotes start on 4201–4203 automatically when listed in `--devRemotes`.

---

## 10. Anti-patterns reference

The following patterns are explicitly forbidden.

| Anti-pattern                                   | Example                                                | Why it is wrong                                                             |
| ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Default change detection                       | `@Component({ ... })` without `OnPush`                 | Causes unnecessary re-renders; violates the signal-first contract           |
| Constructor injection                          | `constructor(private api: SomeApi)`                    | Inconsistent with `inject()` convention; breaks in some standalone contexts |
| Inline HTTP call in component                  | `inject(HttpClient).get('/api/...')`                   | Bypasses the API service layer; prevents testing and type safety            |
| Hand-written DTO interface                     | `interface MyDto { field: string }`                    | Gets out of sync with the backend; use OpenAPI-derived types                |
| Missing re-provision in remote                 | No `API_BASE_URL` in route group `providers`           | `NullInjectorError` at runtime; all API calls fail                          |
| Missing singleton sharing in MF config         | `@saas-frontend/*` libs not marked `singleton: true`   | `InjectionToken` identity mismatch; stores and interceptors break           |
| Subscribing inside an API service              | `getMe(): void { this.#http.get(...).subscribe(...) }` | Makes the service non-composable; caller cannot chain operators             |
| NgRx or other state lib                        | `import { Store } from '@ngrx/store'`                  | Not permitted; use Angular Signals + Signal Stores                          |
| Separate `.html`/`.scss` files                 | `templateUrl: './foo.component.html'`                  | All templates are inline; all styles are Tailwind classes                   |
| Editing `openapi.types.ts` by hand             | Manually adding an interface to the generated file     | Will be overwritten on next regeneration; type may diverge from backend     |
| Providing `*Api` globally in shell `appConfig` | `providers: [BillingApi]` in app-level config          | Makes the service available on the wrong token instance across remotes      |
| Business logic in app route files              | `entry.routes.ts` computing values or calling services | Route files are wiring only; logic belongs in the component or library      |

---

## Quick-reference checklist

Use this when opening a PR for a new page, library, or app:

- [ ] Component has `ChangeDetectionStrategy.OnPush`
- [ ] Component uses `inject()`, not constructor injection
- [ ] Template is inline (`template: \`...\``), no `.html`/`.scss` files
- [ ] HTTP calls are in `*Api` service, not in the component
- [ ] Types are aliases from `@saas-frontend/shared/util-types`, not hand-written interfaces
- [ ] New service is added to the remote route group `providers[]`, not to `appConfig`
- [ ] `module-federation.config.ts` shares `@saas-frontend/*` as singletons (if a new MFE was added)
- [ ] Spec file co-located alongside every new source file
- [ ] `openapi.types.ts` was regenerated (not hand-edited) if the API schema changed
- [ ] Nav link added to `navbar.component.ts` if the page is user-visible
