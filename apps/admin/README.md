# admin

**Admin MFE** (`port 4203`) — super-admin dashboard area. Currently a placeholder — this is where internal operations tooling lives (user lookup, org inspection, system metrics).

Loaded by the shell at `/admin`. Exposes a single `./Routes` entry point.

---

## Exposed entry point

```ts
// module-federation.config.ts
exposes: { './Routes': 'src/app/remote-entry/entry.ts' }
```

The shell router loads it as:

```ts
{
  path: 'admin',
  canActivate: [orgGuard],
  loadChildren: () => import('admin/Routes').then(m => m.ADMIN_ROUTES),
}
```

---

## Current routes

| Route              | Component                 | Status      |
| ------------------ | ------------------------- | ----------- |
| `/admin/dashboard` | `AdminDashboardComponent` | Placeholder |

---

## File structure

```
src/app/
  remote-entry/
    entry.ts          — re-exports ADMIN_ROUTES
    entry.routes.ts   — declares ADMIN_ROUTES
  admin-dashboard/
    admin-dashboard.component.ts  — placeholder component
```

---

## Running

```sh
# Via shell
npx nx serve shell --devRemotes=admin

# Standalone
npx nx serve admin
```

---

## Extending

To add a new admin page:

1. Create `src/app/<feature>/<feature>.component.ts`
2. Add a lazy route in `entry.routes.ts`
3. Provide any `*Api` services in the route group `providers` array (same `API_BASE_URL` re-provision pattern as `platform`)
4. Add a nav link in `apps/shell/src/app/layout/navbar.component.ts` (guarded by admin role if needed)

---

## Access control

Currently the only guard applied is `orgGuard` (active org required). Add an admin role check guard here before exposing real functionality to end users.
