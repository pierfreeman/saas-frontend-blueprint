# Testing Rules

All testing in this monorepo uses **Vitest 4** with **jsdom** and **Angular Testing Library**.
No E2E framework (no Playwright, Cypress). All tests are unit tests.

---

## Test runner and config

- **Runner**: Vitest 4 (ESM mode)
- **Environment**: jsdom
- **Setup file**: `libs/test-setup.mjs`
- **Config**: Workspace-level `vitest.config.ts`, projects resolve via Nx
- **Path resolution**: `tsconfigPaths: true` — all `@saas-frontend/*` aliases work in tests

---

## Commands

```sh
# All tests
npx nx run-many -t test --all

# Single project
npx nx run platform:test
npx nx run shell:test

# Watch mode
npx nx run shell:test --watch

# Coverage
npx nx run-many -t test --all --coverage --parallel=3

# Single project coverage
npx nx run shell:test --coverage
```

---

## File placement

Every source file has its spec file **alongside it** in the same directory:

```
{feature}.component.ts
{feature}.component.spec.ts   ← always co-located

{domain}.api.ts
{domain}.api.spec.ts

{domain}.store.ts
{domain}.store.spec.ts
```

**Never** create `tests/`, `__tests__/`, or `spec/` directories.

---

## Test structure pattern

Use `describe` / `it` blocks. Mock all external dependencies.

### API service tests

```ts
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
    const req = httpMock.expectOne(r => r.url.includes('/billing/subscription'));
    expect(req.request.params.get('orgId')).toBe('org-1');
    req.flush({ status: 'ACTIVE' });
  });
});
```

### Signal store tests

```ts
describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthApi, useValue: mockApi },
        AuthStore,
      ],
    });
    store = TestBed.inject(AuthStore);
  });

  it('starts with null user when storage is empty', () => {
    expect(store.currentUser()).toBeNull();
    expect(store.isLoggedIn()).toBe(false);
  });

  it('persists user to sessionStorage', () => {
    store.setUser(mockUser);
    expect(JSON.parse(sessionStorage.getItem('saas.currentUser')!)).toEqual(mockUser);
  });
});
```

### Component tests

```ts
describe('DashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: MembershipsApi, useValue: mockApi },
        { provide: AuthStore, useValue: mockStore },
        // ... other mocked dependencies
      ],
    }).compileComponents();
  });

  it('renders stat cards', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    // Assert on rendered content
  });
});
```

---

## Shell tests — Module Federation stubs

When testing the shell, remote `loadChildren` imports fail because bundles don't exist. Stub them:

```ts
vi.mock('auth/Routes', () => import('src/testing/mf-stubs'));
vi.mock('platform/Routes', () => import('src/testing/mf-stubs'));
vi.mock('admin/Routes', () => import('src/testing/mf-stubs'));
```

Stubs live in `apps/shell/src/testing/mf-stubs.ts`.

---

## Mocking guidelines

1. **Mock all `*Api` services** — never make real HTTP calls in unit tests.
2. **Mock stores** — provide mock signal values via `useValue`.
3. **Use `vi.fn()`** for function mocks.
4. **Use `of()` from RxJS** to return mock observables.
5. **Use `provideHttpClientTesting()`** for API service tests (to verify request shape).
6. **Always call `httpMock.verify()`** in `afterEach` for API tests.

```ts
function makeMockApi(overrides = {}) {
  return {
    getMe: vi.fn(() => of(mockUser)),
    updateMe: vi.fn(() => of(mockUser)),
    ...overrides,
  };
}
```

---

## What to test

| Artifact          | Test focus                                                      |
| ----------------- | --------------------------------------------------------------- |
| API service       | Correct URL, HTTP method, params, headers, typed response       |
| Signal store      | Initial state, mutations, computed values, persistence          |
| Component         | Rendering, user interactions, signal state changes              |
| Interceptor       | Header attachment, skip conditions, error mapping               |
| Guard             | Allow/deny conditions, redirect behavior                        |
| RRULE builder     | Frequency/interval/byDay combinations, edge cases               |

---

## Coverage

- Coverage output goes to `coverage/{project-name}/`.
- Coverage format: html + lcov.
- No strict threshold enforced yet, but aim for meaningful coverage on business logic.

---

## Testing anti-patterns

| Anti-pattern                          | Correct approach                                      |
| ------------------------------------- | ----------------------------------------------------- |
| Real HTTP calls in unit tests         | Mock API services or use `provideHttpClientTesting()`  |
| Tests in separate `tests/` directory  | Co-locate `.spec.ts` next to source file               |
| Testing implementation details        | Test behavior and observable outcomes                  |
| Skipping `httpMock.verify()`          | Always verify no unexpected requests were made         |
| Large test setup with many concerns   | Focus each test on one behavior                        |
| No cleanup between tests              | Clear storage, reset mocks in `beforeEach`             |
