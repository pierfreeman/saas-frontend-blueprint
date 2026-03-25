# @org/billing/data-access

HTTP client for the Stripe-backed billing endpoints (`/billing/*`).

**Import path**: `@org/billing/data-access`

---

## Exports

| Symbol                       | Kind    | Description                               |
| ---------------------------- | ------- | ----------------------------------------- |
| `BillingApi`                 | Service | HTTP client for all billing operations    |
| `CreateCheckoutSessionDto`   | Type    | Request body for `POST /billing/checkout` |
| `CreatePortalSessionDto`     | Type    | Request body for `POST /billing/portal`   |
| `CancelSubscriptionDto`      | Type    | Request body for `POST /billing/cancel`   |
| `CheckoutSessionResponse`    | Type    | Response from `POST /billing/checkout`    |
| `PortalSessionResponse`      | Type    | Response from `POST /billing/portal`      |
| `SubscriptionResponse`       | Type    | Response from `GET /billing/subscription` |
| `CancelSubscriptionResponse` | Type    | Response from `POST /billing/cancel`      |

---

## `BillingApi`

Root-level singleton (`providedIn: 'root'`). Requires `API_BASE_URL` and `HttpClient`.

### Methods

| Method                       | HTTP                               | Description                                                       |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| `getSubscription(orgId)`     | `GET /billing/subscription?orgId=` | Current subscription status for the org                           |
| `createCheckoutSession(dto)` | `POST /billing/checkout`           | Creates a Stripe Checkout Session; returns a `url` to redirect to |
| `createPortalSession(dto)`   | `POST /billing/portal`             | Creates a Stripe Billing Portal Session; returns a `url`          |
| `cancelSubscription(dto)`    | `POST /billing/cancel`             | Cancels the subscription at period end                            |

All methods return `Observable<T>`.

### DTOs

```ts
// CreateCheckoutSessionDto
{
  orgId: string;
  priceId: string; // Stripe Price ID (from environment.stripePriceId)
  successUrl: string; // URL to redirect after successful payment
  cancelUrl: string; // URL to redirect if payment is abandoned
}

// CreatePortalSessionDto
{
  orgId: string;
  returnUrl: string; // URL to redirect when closing the portal
}

// CancelSubscriptionDto
{
  orgId: string;
}
```

### Response shapes

```ts
// SubscriptionResponse
{
  status: 'NONE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAUSED';
  currentPeriodStart?: string;  // ISO 8601
  currentPeriodEnd?: string;    // ISO 8601
  planName?: string;
}

// CheckoutSessionResponse / PortalSessionResponse
{
  url: string;  // Stripe-hosted URL to redirect the user to
}
```

---

## Usage

```ts
import { BillingApi } from '@org/billing/data-access';

// In route providers (platform MFE's entry.routes.ts)
providers: [
  BillingApi,
  { provide: API_BASE_URL, useValue: environment.apiUrl },
];

// Upgrade flow
this.#billingApi
  .createCheckoutSession({
    orgId: this.#orgsStore.activeOrgId()!,
    priceId: environment.stripePriceId,
    successUrl: `${window.location.origin}/billing?success=true`,
    cancelUrl: `${window.location.origin}/billing`,
  })
  .subscribe(({ url }) => (window.location.href = url));

// Subscription status
this.#billingApi
  .getSubscription(orgId)
  .subscribe((sub) => this.subscription.set(sub));
```

---

## Backend implementation note

The backend `createCheckoutSession` and `createPortalSession` endpoints auto-provision a Stripe customer if `org.stripeCustomerId` is `null`. The frontend does not need to call a separate "create customer" endpoint — just call checkout/portal and the backend handles the rest.

---

## File structure

```
src/lib/
  billing.api.ts        — BillingApi (HTTP)
  billing.api.types.ts  — type aliases from OpenAPI schema
src/index.ts            — public exports
```
