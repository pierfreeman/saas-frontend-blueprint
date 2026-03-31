# Security Rules

Security patterns enforced across this multi-tenant SaaS frontend.

---

## Authentication (Auth0)

- **Auth0 RS256 PKCE flow** — the shell initializes Auth0 via `provideAuth0()` in `appConfig`.
- **JWT tokens are managed by Auth0 SDK** — never store, decode, or manipulate JWTs manually.
- **`AuthHttpInterceptor`** attaches the bearer token to all API calls — do not manually add `Authorization` headers.
- **Silent token refresh** is handled by the Auth0 SDK — no custom refresh logic needed.
- **401 responses** → `errorInterceptor` triggers logout + redirect to `/auth`.

---

## Authorization (RBAC)

- **Dual enforcement**: The same role→permission map exists on backend AND frontend. Frontend RBAC is for UX only — the backend always re-validates.
- **Never trust frontend-only checks** for security-sensitive operations.
- **Role hierarchy**: `READ_ONLY < MEMBER < ADMIN < OWNER`.
- **9 permissions**: `org.manage`, `org.billing.manage`, `org.members.invite`, `org.members.remove`, `org.members.role.update`, `org.read`, `audit.read`, `analytics.view`, `analytics.export`.
- **Use `PermissionsService`** to check permissions — never hardcode role checks.
- **Use `*hasPermission` / `*hasPlan` directives** for template-level gating.
- **Use `permissionGuard`** for route-level protection.

---

## Multi-tenancy isolation

- **`x-org-id` header** — injected automatically by `tenantInterceptor` on every API call (except auth routes).
- **Never pass `orgId` as a URL parameter** unless the backend API requires it explicitly (e.g., `GET /billing/subscription?orgId=...`).
- **Org context is managed by `OrgContextService`** — switching orgs flushes all tenant-scoped stores.
- **Backend enforces org scoping** — even if the frontend sends a wrong `orgId`, the backend validates membership.

---

## Data handling

- **No secrets in frontend code** — `environment.ts` contains only public configuration (Auth0 domain/clientId/audience, API URL). Secrets live on the backend.
- **`environment.prod.ts` is generated at build time** from Vercel env vars — never commit it.
- **`stripePriceId`** is a public Stripe Price ID, not a secret — safe to include in environment config.
- **OpenAPI types are auto-generated** — do not manually edit `openapi.types.ts`. Regenerate from the backend.

---

## Storage persistence

- **`sessionStorage`** for session-scoped data (current user: `saas.currentUser`).
- **`localStorage`** for cross-session data (active org: `saas.activeOrgId`, `saas.activeOrgName`).
- **Handle storage failures silently** — private browsing or quota exceeded must not crash the app.
- **Always use `saas.` prefix** for storage keys to avoid collisions.
- **Never store tokens or sensitive data** in `localStorage` / `sessionStorage` — Auth0 SDK handles token storage.

---

## Input handling

- **Backend validates all input** via `class-validator` with `whitelist: true`, `forbidNonWhitelisted: true`.
- **Frontend should validate for UX** (form controls, required fields) but never assume frontend validation is sufficient.
- **Avoid constructing raw HTML** — Angular's template system auto-escapes by default. Never use `innerHTML` with user data unless sanitized via `DomSanitizer`.
- **Date inputs**: Keep `Date` objects in UI state, convert to `yyyy-mm-dd` strings at submit time to avoid timezone drift.

---

## API communication

- **All API calls go through `*Api` services** — never use `HttpClient` directly in components.
- **`API_BASE_URL`** is the single source of truth for the backend URL — never hardcode API URLs.
- **Error responses** are handled by `errorInterceptor` — it maps HTTP errors to PrimeNG toasts and handles 401 logout.
- **No CORS workarounds in code** — CORS is configured on the backend. If CORS fails, fix it there.

---

## Module Federation security

- **Remotes are loaded dynamically** in production from URLs in `remotes.json`.
- **`RemoteConfigService` handles load failures gracefully** — renders `RemoteUnavailableComponent` instead of crashing.
- **Remote URLs** are set via Vercel env vars at build time — never expose internal URLs in client code.
- **All shared libs as singletons** ensures interceptors (auth, tenant, error) run consistently across all MFE bundles.

---

## Deployment security

- **Vercel environment variables** for all secrets and configuration.
- **`scripts/generate-env.sh`** reads env vars and writes `environment.prod.ts` + `remotes.json` — never commit generated files.
- **`scripts/vercel-ignore.sh`** uses Nx affected to skip unnecessary builds — no untrusted input in the build decision.

---

## Forbidden patterns

| Pattern                                    | Risk                                    |
| ------------------------------------------ | --------------------------------------- |
| Manual JWT decoding/storage                | Token leakage, expiry bugs              |
| Hardcoded API URLs                         | Environment mismatch, SSRF risk         |
| `innerHTML` with user data                 | XSS                                     |
| Storing secrets in `environment.ts`        | Exposed in client bundle                |
| Committing `environment.prod.ts`           | Leaks production config                 |
| Bypassing `tenantInterceptor`              | Cross-tenant data access                |
| Frontend-only permission checks (no backend) | Privilege escalation                 |
| Direct `HttpClient` use in components      | Bypasses interceptor pipeline           |
