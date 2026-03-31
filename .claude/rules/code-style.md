# Code Style Rules

These rules apply to **all code** in this monorepo. They are non-negotiable — any agent-generated code must comply.

---

## Angular component conventions

1. **Always `ChangeDetectionStrategy.OnPush`** — no exceptions.
2. **Standalone components only** — no `NgModule`, no `declarations`.
3. **Inline templates** — use `template: \`...\``, never `templateUrl`.
4. **No separate `.html` or `.scss` files** — all styles via Tailwind utility classes directly on elements.
5. **`inject()` for all DI** — never constructor injection, in components, services, guards, interceptors, stores.
6. **Private fields use `#` prefix** — `readonly #api = inject(FooApi)`.
7. **Signals for local state** — `signal()`, `computed()`, `effect()`. No `BehaviorSubject` or manual change detection.

```ts
// ✅ Correct component skeleton
@Component({
  selector: 'app-feature',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [/* PrimeNG, RouterLink, etc. */],
  template: `...`,
})
export class FeatureComponent implements OnInit {
  readonly #api = inject(FeatureApi);
  readonly data = signal<Item[] | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.#api.getItems().subscribe({
      next: (items) => { this.data.set(items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
```

---

## API service conventions

1. **`@Injectable({ providedIn: 'root' })`** — always tree-shakable.
2. **Inject `API_BASE_URL` and `HttpClient`** via `inject()`.
3. **Return `Observable<T>`** — never subscribe inside the service. The caller subscribes.
4. **No business logic** — just HTTP calls with typed returns.
5. **One API service per domain** — file naming: `{domain}.api.ts`.

```ts
@Injectable({ providedIn: 'root' })
export class BillingApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  getSubscription(orgId: string): Observable<SubscriptionResponse> {
    return this.#http.get<SubscriptionResponse>(
      `${this.#base}/billing/subscription`,
      { params: { orgId } },
    );
  }
}
```

---

## Type conventions

1. **Types from OpenAPI only** — all DTO/response types MUST be aliases from `@saas-frontend/shared/util-types`.
2. **Never hand-write interfaces** that mirror backend DTOs.
3. **Use `import type`** for type-only imports (no runtime cost).
4. **Type alias file naming** — `{domain}.api.types.ts`, co-located with the API service.

```ts
// ✅ Correct
import type { components } from '@saas-frontend/shared/util-types';
export type SubscriptionResponse = components['schemas']['SubscriptionResponseDto'];

// ❌ Wrong — hand-written interface
interface SubscriptionResponse { status: string; currentPeriodEnd: string; }
```

---

## Signal store conventions

1. **`@Injectable({ providedIn: 'root' })`** — global stores only for cross-component shared state.
2. **`signal()` for state, `computed()` for derived values.**
3. **Persistence** — use `localStorage` or `sessionStorage` with `saas.` prefixed keys.
4. **Handle storage failures silently** — private browsing, quota exceeded.
5. **Store naming** — `{Domain}Store`, file: `{domain}.store.ts`.

---

## Module Federation wiring rules

1. **Singleton sharing** — every `module-federation.config.ts` must share `@saas-frontend/*` as singletons:
   ```ts
   shared: (libraryName, defaultConfig) => {
     if (libraryName.startsWith('@saas-frontend/')) {
       return { singleton: true, strictVersion: false, requiredVersion: false };
     }
     return defaultConfig;
   },
   ```
2. **Re-provide in remotes** — every remote's `entry.routes.ts` MUST include `API_BASE_URL` and all `*Api` services in `providers[]`.
3. **No global API service provision** — never add `*Api` services to shell `appConfig`.

---

## File naming and placement

| Artifact             | Location                                  | Name pattern                         |
| -------------------- | ----------------------------------------- | ------------------------------------ |
| Page component       | `apps/{app}/src/app/{feature}/`           | `{feature}.component.ts`            |
| API service          | `libs/{domain}/data-access/src/lib/`      | `{domain}.api.ts`                   |
| API types            | `libs/{domain}/data-access/src/lib/`      | `{domain}.api.types.ts`             |
| Signal store         | `libs/{domain}/data-access/src/lib/`      | `{domain}.store.ts`                 |
| Interceptor          | `libs/{domain}/data-access/src/lib/`      | `{domain}.interceptor.ts`           |
| Spec file            | Same directory as source                  | `{name}.spec.ts`                    |
| Feature sub-component | `libs/{domain}/feature/src/lib/`         | `{feature}-{section}-dialog.component.ts` |
| Shared utility       | `libs/{domain}/feature/src/lib/`          | `{feature}.utils.ts`                |

---

## Import conventions

- Use `@saas-frontend/*` path aliases — never relative paths across library boundaries.
- Barrel file (`index.ts`) is the public API — import from the barrel, not internal files.
- Sub-components are NOT exported from the barrel — they are internal implementation details.

---

## Template / styling conventions

- **Tailwind CSS v4** utility classes for all styling.
- **PrimeNG 21 Aura theme** — use PrimeNG components (`p-button`, `p-table`, `p-dialog`, etc.).
- **`tailwindcss-primeui`** color palette integration — use semantic color tokens.
- **No custom CSS** — if Tailwind + PrimeNG can't do it, something is wrong.
- **Responsive design** via Tailwind responsive prefixes.

---

## Anti-patterns (explicitly forbidden)

| Anti-pattern                   | Use instead                                         |
| ------------------------------ | --------------------------------------------------- |
| `constructor(private x: Y)`   | `readonly #x = inject(Y)`                           |
| `templateUrl: './foo.html'`   | `template: \`...\``                                 |
| `interface MyDto { ... }`     | `type MyDto = components['schemas']['...']`         |
| `this.#http.get(...)` in comp | `this.#api.method()`                                |
| `@Component({})` (no OnPush)  | `changeDetection: ChangeDetectionStrategy.OnPush`   |
| `NgModule`                     | Standalone components                               |
| `BehaviorSubject`              | `signal()` / `computed()`                           |
| `subscribe()` in API service  | Return `Observable<T>`, caller subscribes            |
| `import { Store } from '@ngrx/store'` | Angular Signals                              |
