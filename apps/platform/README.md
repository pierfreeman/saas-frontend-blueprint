# platform

**Platform MFE** (`port 4202`) — the main product surface. Contains all authenticated feature pages for org members.

Loaded by the shell at `/` (i.e. all non-auth, non-admin routes). Exposes a single `./Routes` entry point.

---

## Exposed entry point

```ts
// module-federation.config.ts
exposes: { './Routes': 'src/app/remote-entry/entry.ts' }
```

The shell router loads it as:

```ts
{ path: '', canActivate: [orgGuard], loadChildren: () => import('platform/Routes').then(m => m.PLATFORM_ROUTES) }
```

---

## Pages

| Route        | Component            | Description                                                                                  |
| ------------ | -------------------- | -------------------------------------------------------------------------------------------- |
| `/dashboard` | `DashboardComponent` | Stat cards: total members, subscription plan, storage usage. Skeleton loading states.        |
| `/members`   | `MembersComponent`   | Member table: invite by email, update role (Owner/Admin/Member), remove with confirm dialog. |
| `/settings`  | `SettingsComponent`  | Profile info (read-only), org rename, org export request, org delete (danger zone).          |
| `/billing`   | `BillingComponent`   | Subscription status tag, current period dates, Stripe Checkout / Portal / Cancel actions.    |

---

## Route structure

All feature pages are children of an anonymous route group that provides the necessary API services. This is required to fix the Module Federation `InjectionToken` identity mismatch (see [Architecture → API_BASE_URL token](../../README.md#api_base_url-token--why-remotes-re-provide-it)).

```ts
// entry.routes.ts
export const PLATFORM_ROUTES: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    providers: [
      { provide: API_BASE_URL, useValue: environment.apiUrl },
      MembershipsApi,
      BillingApi,
      OrganizationsApi,
    ],
    children: [
      { path: 'dashboard', loadComponent: () => import('../dashboard/...') },
      { path: 'members', loadComponent: () => import('../members/...') },
      { path: 'settings', loadComponent: () => import('../settings/...') },
      { path: 'billing', loadComponent: () => import('../billing/...') },
    ],
  },
];
```

---

## Component details

### `DashboardComponent`

- Loads `MembershipsApi.getMemberships()` and `BillingApi.getSubscription()` in parallel on `OnInit`
- Reads seat cap from `EntitlementsStore.maxSeats()` (displayed as the "Seats" stat card)
- Displays PrimeNG `p-skeleton` while loading; transitions to data cards on completion
- Reads `OrganizationsStore.activeOrgId()` for scoped API calls

### `MembersComponent`

- Backed by `MembershipsStore` and `EntitlementsStore`; RBAC gates from `PermissionsService`
- **Invite**: dialog with email + role selector → `inviteMember()` → list refresh
  - Button is always visible to users with `ORG_MEMBERS_INVITE` but **disabled** when the plan seat limit is reached
  - Inline message: _"Seat limit reached (N/N). [Upgrade](/billing) to add more."_
- **Update role**: inline dropdown → `updateMemberRole()` → toast feedback
- **Remove**: confirm dialog → `removeMember()` → toast feedback
- `ChangeDetectionStrategy.OnPush` throughout; all state held in store signals

### `SettingsComponent`

- **Profile card**: shows avatar (initials), email, and name from `AuthStore`
- **Rename org**: text input bound to `orgName` signal; `PATCH /organizations/:id`
- **Export data**: button → `requestExport()` → success toast (async job started on backend)
- **Delete org** (danger zone): confirm dialog with warning → `requestDeletion()` → clears active org + navigates to `/org/select`

### `BillingComponent`

- Loads `getSubscription(orgId)` lazily on `OnInit`
- Subscription status maps to PrimeNG `p-tag` severity and human-readable labels:

  | Status     | Label    | Severity  |
  | ---------- | -------- | --------- |
  | `NONE`     | Free     | secondary |
  | `TRIALING` | Trial    | info      |
  | `ACTIVE`   | Active   | success   |
  | `PAST_DUE` | Past Due | warn      |
  | `CANCELED` | Canceled | secondary |
  | `UNPAID`   | Unpaid   | danger    |

- **Upgrade to Pro**: calls `createCheckoutSession({ orgId, priceId, successUrl, cancelUrl })` — backend returns a Stripe Checkout URL → `window.location.href = url`
- **Manage billing**: calls `createPortalSession({ orgId, returnUrl })` → opens Stripe Billing Portal
- **Cancel**: confirm dialog → `cancelSubscription({ orgId })` → reloads subscription

---

## Environment

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  stripePriceId: 'price_xxx', // Stripe Price ID for the Pro plan
};
```

`stripePriceId` is passed to `createCheckoutSession()` as the `priceId` field. Update this to match your Stripe product's price ID.

---

## File structure

```
src/app/
  remote-entry/
    entry.ts              — re-exports PLATFORM_ROUTES
    entry.routes.ts       — route group with providers + lazy feature routes
    entry.routes.spec.ts  — tests for route config
    entry.spec.ts
  dashboard/
    dashboard.component.ts
    dashboard.component.spec.ts
  members/
    members.component.ts
    members.component.spec.ts
  settings/
    settings.component.ts
    settings.component.spec.ts
  billing/
    billing.component.ts
    billing.component.spec.ts
src/environments/
  environment.ts
  environment.prod.ts
```

---

## Running

```sh
# Via shell (recommended)
npx nx serve shell --devRemotes=platform

# Standalone (no shell layout, for component-level dev)
npx nx serve platform
```

---

## Testing

```sh
npx nx run platform:test
npx nx run platform:test --watch
```
