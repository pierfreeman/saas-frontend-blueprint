import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@saas-frontend/auth/data-access';
import {
  BillingApi,
  SubscriptionResponse,
} from '@saas-frontend/billing/data-access';
import { BillingComponent } from '@saas-frontend/billing/feature';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSubscription(
  overrides: Partial<SubscriptionResponse> = {},
): SubscriptionResponse {
  return {
    orgId: 'org-1',
    billingStatus: 'ACTIVE',
    planId: 'pro_monthly',
    subscriptionId: 'sub_123',
    subscriptionPeriodStart: '2025-01-01T00:00:00Z',
    subscriptionPeriodEnd: '2025-02-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function setup(opts: {
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  maxSeats?: number;
  billingStatus?: string;
  subscription?: SubscriptionResponse | null;
  billingError?: boolean;
}) {
  const {
    plan = 'PRO',
    maxSeats = 10,
    subscription = makeSubscription(),
    billingError = false,
  } = opts;

  const mockAuth = {
    currentUser: signal({ email: 'user@example.com' }),
  } as unknown as AuthStore;

  const mockOrgs = {
    activeOrgId: signal<string | null>('org-1'),
  } as unknown as OrganizationsStore;

  const planSig = signal(plan);
  const maxSeatsSig = signal(maxSeats);

  const mockEnt = {
    plan: planSig,
    maxSeats: maxSeatsSig,
    loadEntitlements: vi.fn(() => Promise.resolve()),
    invalidateCache: vi.fn(() => Promise.resolve()),
  } as unknown as EntitlementsStore;

  const mockBillingApi = {
    getSubscription: vi.fn(() =>
      billingError ? throwError(() => new Error('fail')) : of(subscription),
    ),
    createCheckoutSession: vi.fn(() =>
      of({ url: 'https://checkout.stripe.com/session_123' }),
    ),
    createPortalSession: vi.fn(() =>
      of({ url: 'https://billing.stripe.com/portal_123' }),
    ),
    cancelSubscription: vi.fn(() => of({ message: 'Subscription canceled' })),
  } as unknown as BillingApi;

  TestBed.configureTestingModule({
    imports: [BillingComponent],
    providers: [
      { provide: AuthStore, useValue: mockAuth },
      { provide: OrganizationsStore, useValue: mockOrgs },
      { provide: BillingApi, useValue: mockBillingApi },
      { provide: EntitlementsStore, useValue: mockEnt },
      ConfirmationService,
      MessageService,
    ],
  });

  const fixture = TestBed.createComponent(BillingComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component, mockBillingApi, mockEnt };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('BillingComponent', () => {
  describe('initialisation', () => {
    it('calls getSubscription on load', () => {
      const { mockBillingApi } = setup({});
      expect(mockBillingApi.getSubscription).toHaveBeenCalledWith('org-1');
    });

    it('sets loading to false after successful load', async () => {
      const { component, fixture } = setup({});
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loading()).toBe(false);
    });

    it('sets error message on billing API failure', async () => {
      const { component, fixture } = setup({ billingError: true });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loading()).toBe(false);
      expect(component.error()).toBeTruthy();
    });

    it('calls loadEntitlements on load', () => {
      const { mockEnt } = setup({});
      expect(mockEnt.loadEntitlements).toHaveBeenCalledWith('org-1');
    });
  });

  describe('planTitle', () => {
    it('returns "Enterprise Plan" for ENTERPRISE plan', () => {
      const { component } = setup({ plan: 'ENTERPRISE' });
      expect(component.planTitle()).toBe('Enterprise Plan');
    });

    it('returns "Pro Plan" for PRO plan', () => {
      const { component } = setup({ plan: 'PRO' });
      expect(component.planTitle()).toBe('Pro Plan');
    });

    it('returns "Free Plan" for FREE plan', () => {
      const { component } = setup({ plan: 'FREE' });
      expect(component.planTitle()).toBe('Free Plan');
    });
  });

  describe('maxSeats', () => {
    it('exposes maxSeats from EntitlementsStore', () => {
      const { component } = setup({ maxSeats: 25 });
      expect(component.maxSeats()).toBe(25);
    });
  });

  describe('status computeds', () => {
    it('isActive is true for ACTIVE status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'ACTIVE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.isActive()).toBe(true);
    });

    it('isActive is true for TRIALING status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'TRIALING' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.isActive()).toBe(true);
    });

    it('isActive is false for NONE status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'NONE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.isActive()).toBe(false);
    });

    it('isPastDue is true for PAST_DUE status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'PAST_DUE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.isPastDue()).toBe(true);
    });

    it('isCanceledButAccess is true when canceled+cancelAtPeriodEnd+periodEnd', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({
          billingStatus: 'CANCELED',
          cancelAtPeriodEnd: true,
          subscriptionPeriodEnd: '2025-03-01T00:00:00Z',
        }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.isCanceledButAccess()).toBe(true);
    });

    it('isCanceledButAccess is false without cancelAtPeriodEnd', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({
          billingStatus: 'CANCELED',
          cancelAtPeriodEnd: false,
        }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.isCanceledButAccess()).toBe(false);
    });
  });

  describe('statusLabel and statusSeverity', () => {
    it('statusLabel returns "Active" for ACTIVE', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'ACTIVE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.statusLabel()).toBe('Active');
    });

    it('statusSeverity returns "success" for ACTIVE', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'ACTIVE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.statusSeverity()).toBe('success');
    });

    it('statusSeverity returns "danger" for UNPAID', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'UNPAID' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.statusSeverity()).toBe('danger');
    });
  });

  describe('upgrade', () => {
    it('calls createCheckoutSession and redirects', async () => {
      const { component, mockBillingApi } = setup({});
      await new Promise((r) => setTimeout(r, 0));

      component.upgrade();
      await new Promise((r) => setTimeout(r, 0));

      expect(mockBillingApi.createCheckoutSession).toHaveBeenCalled();
    });
  });

  describe('openPortal', () => {
    it('calls createPortalSession', async () => {
      const { component, mockBillingApi } = setup({});
      await new Promise((r) => setTimeout(r, 0));

      component.openPortal();
      await new Promise((r) => setTimeout(r, 0));

      expect(mockBillingApi.createPortalSession).toHaveBeenCalled();
    });
  });
});
