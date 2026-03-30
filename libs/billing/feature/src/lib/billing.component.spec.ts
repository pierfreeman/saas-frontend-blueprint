import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  BillingApi,
  SubscriptionResponse,
} from '@saas-frontend/billing/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { BillingComponent } from './billing.component';

vi.mock('src/environments/environment', () => ({
  environment: {
    stripePriceId: 'price_test_123',
  },
}));

const mockSubscription = (
  overrides: Partial<SubscriptionResponse> = {},
): SubscriptionResponse =>
  ({
    subscriptionId: 'sub-123',
    billingStatus: 'ACTIVE',
    planId: 'price_pro',
    plan: 'PRO',
    seats: 10,
    subscriptionPeriodStart: '2026-01-01',
    subscriptionPeriodEnd: '2026-02-01',
    cancelAtPeriodEnd: false,
    ...overrides,
  }) as SubscriptionResponse;

describe('BillingComponent', () => {
  let component: BillingComponent;
  let billingApiMock: ReturnType<typeof createBillingApiMock>;
  let orgsStoreMock: { activeOrgId: ReturnType<typeof signal<string | null>> };
  let entStoreMock: ReturnType<typeof createEntStoreMock>;
  let confirmationServiceMock: { confirm: ReturnType<typeof vi.fn> };
  let messageServiceMock: { add: ReturnType<typeof vi.fn> };

  function createBillingApiMock() {
    return {
      getSubscription: vi.fn(() => of(mockSubscription())),
      createCheckoutSession: vi.fn(() =>
        of({ url: 'https://checkout.stripe.com/session' }),
      ),
      createPortalSession: vi.fn(() =>
        of({ url: 'https://billing.stripe.com/portal' }),
      ),
      cancelSubscription: vi.fn(() =>
        of({ message: 'Subscription cancelled' }),
      ),
    } as unknown as BillingApi;
  }

  function createEntStoreMock() {
    return {
      plan: vi.fn(() => 'PRO'),
      maxSeats: vi.fn(() => 10),
      loadEntitlements: vi.fn(),
      invalidateCache: vi.fn(),
    };
  }

  beforeEach(async () => {
    billingApiMock = createBillingApiMock();
    orgsStoreMock = {
      activeOrgId: signal<string | null>('org-1'),
    };
    entStoreMock = createEntStoreMock();
    confirmationServiceMock = {
      confirm: vi.fn(),
    };
    messageServiceMock = {
      add: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: BillingApi, useValue: billingApiMock },
        { provide: OrganizationsStore, useValue: orgsStoreMock },
        { provide: EntitlementsStore, useValue: entStoreMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    component = TestBed.runInInjectionContext(() => new BillingComponent());
  });

  // ── Initialization ─────────────────────────────────────────────────────────
  describe('ngOnInit', () => {
    it('loads subscription data', async () => {
      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(billingApiMock.getSubscription).toHaveBeenCalledWith('org-1');
      expect(component.sub()).toEqual(mockSubscription());
    });

    it('sets loading to false after success', async () => {
      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(component.loading()).toBe(false);
    });

    it('sets error on API failure', async () => {
      billingApiMock.getSubscription = vi.fn(() =>
        throwError(() => new Error('Failed')),
      );
      component = TestBed.runInInjectionContext(() => new BillingComponent());

      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(component.error()).toBe('Failed to load billing information.');
      expect(component.loading()).toBe(false);
    });
  });

  // ── Computed properties ────────────────────────────────────────────────────
  describe('statusLabel', () => {
    it('returns correct label for ACTIVE status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'ACTIVE' }));
      expect(component.statusLabel()).toBe('Active');
    });

    it('returns correct label for TRIALING status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'TRIALING' }));
      expect(component.statusLabel()).toBe('Trial');
    });

    it('returns correct label for CANCELED status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'CANCELED' }));
      expect(component.statusLabel()).toBe('Canceled');
    });
  });

  describe('statusSeverity', () => {
    it('returns success for ACTIVE status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'ACTIVE' }));
      expect(component.statusSeverity()).toBe('success');
    });

    it('returns warn for PAST_DUE status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'PAST_DUE' }));
      expect(component.statusSeverity()).toBe('warn');
    });
  });

  // ── User actions ───────────────────────────────────────────────────────────
  describe('upgrade', () => {
    it('calls createCheckoutSession with correct parameters', () => {
      component.upgrade();

      expect(billingApiMock.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-1',
        }),
      );
    });

    it('sets redirecting state during checkout session creation', async () => {
      component.upgrade();

      // Verify redirecting is set to true during the operation
      expect(component.redirecting()).toBe(true);

      await new Promise((r) => setTimeout(r, 0));

      // After successful completion, redirecting remains true (as user will be redirected)
      expect(component.redirecting()).toBe(true);
    });

    it('shows error message on failure', async () => {
      billingApiMock.createCheckoutSession = vi.fn(() =>
        throwError(() => new Error('Failed')),
      );
      component = TestBed.runInInjectionContext(() => new BillingComponent());

      component.upgrade();
      await new Promise((r) => setTimeout(r, 0));

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Error',
        }),
      );
      expect(component.redirecting()).toBe(false);
    });
  });

  describe('openPortal', () => {
    it('calls createPortalSession with correct parameters', () => {
      component.openPortal();

      expect(billingApiMock.createPortalSession).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-1',
        }),
      );
    });

    it('sets redirecting state during portal session creation', async () => {
      component.openPortal();

      // Verify redirecting is set to true during the operation
      expect(component.redirecting()).toBe(true);

      await new Promise((r) => setTimeout(r, 0));

      // After successful completion, redirecting remains true (as user will be redirected)
      expect(component.redirecting()).toBe(true);
    });

    it('shows error message on failure', async () => {
      billingApiMock.createPortalSession = vi.fn(() =>
        throwError(() => new Error('Failed')),
      );
      component = TestBed.runInInjectionContext(() => new BillingComponent());

      component.openPortal();
      await new Promise((r) => setTimeout(r, 0));

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Error',
        }),
      );
      expect(component.redirecting()).toBe(false);
    });
  });

  describe('confirmCancel', () => {
    it('shows confirmation dialog', () => {
      component.confirmCancel();

      expect(confirmationServiceMock.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Cancel Subscription',
          acceptLabel: 'Yes, Cancel',
        }),
      );
    });

    it('cancels subscription when confirmed', async () => {
      confirmationServiceMock.confirm = vi.fn((config) => {
        config.accept?.();
      });

      component.confirmCancel();
      await new Promise((r) => setTimeout(r, 0));

      expect(billingApiMock.cancelSubscription).toHaveBeenCalledWith({
        orgId: 'org-1',
      });
    });

    it('shows success message after cancellation', async () => {
      confirmationServiceMock.confirm = vi.fn((config) => {
        config.accept?.();
      });

      component.confirmCancel();
      await new Promise((r) => setTimeout(r, 0));

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: 'Subscription Canceled',
        }),
      );
    });

    it('shows error message when cancellation fails', async () => {
      billingApiMock.cancelSubscription = vi.fn(() =>
        throwError(() => new Error('Failed')),
      );
      confirmationServiceMock.confirm = vi.fn((config) => {
        config.accept?.();
      });

      component.confirmCancel();
      await new Promise((r) => setTimeout(r, 0));

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not cancel subscription. Please try again.',
        }),
      );
      expect(component.cancelling()).toBe(false);
    });
  });

  // ── planTitle ──────────────────────────────────────────────────────────────
  describe('planTitle', () => {
    it('returns Enterprise Plan for ENTERPRISE plan', () => {
      entStoreMock.plan = vi.fn(() => 'ENTERPRISE');
      component = TestBed.runInInjectionContext(() => new BillingComponent());
      expect(component.planTitle()).toBe('Enterprise Plan');
    });

    it('returns Pro Plan for PRO plan', () => {
      entStoreMock.plan = vi.fn(() => 'PRO');
      component = TestBed.runInInjectionContext(() => new BillingComponent());
      expect(component.planTitle()).toBe('Pro Plan');
    });

    it('returns Free Plan for any other value', () => {
      entStoreMock.plan = vi.fn(() => 'FREE');
      component = TestBed.runInInjectionContext(() => new BillingComponent());
      expect(component.planTitle()).toBe('Free Plan');
    });
  });

  // ── isActive ───────────────────────────────────────────────────────────────
  describe('isActive', () => {
    it('returns true for ACTIVE status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'ACTIVE' }));
      expect(component.isActive()).toBe(true);
    });

    it('returns true for TRIALING status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'TRIALING' }));
      expect(component.isActive()).toBe(true);
    });

    it('returns false for CANCELED status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'CANCELED' }));
      expect(component.isActive()).toBe(false);
    });

    it('returns false when sub is null', () => {
      component.sub.set(null);
      expect(component.isActive()).toBe(false);
    });
  });

  // ── isPastDue ──────────────────────────────────────────────────────────────
  describe('isPastDue', () => {
    it('returns true for PAST_DUE status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'PAST_DUE' }));
      expect(component.isPastDue()).toBe(true);
    });

    it('returns true for UNPAID status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'UNPAID' }));
      expect(component.isPastDue()).toBe(true);
    });

    it('returns false for ACTIVE status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'ACTIVE' }));
      expect(component.isPastDue()).toBe(false);
    });

    it('returns false when sub is null', () => {
      component.sub.set(null);
      expect(component.isPastDue()).toBe(false);
    });
  });

  // ── isCanceledButAccess ────────────────────────────────────────────────────
  describe('isCanceledButAccess', () => {
    it('returns true when CANCELED with cancelAtPeriodEnd and a period end date', () => {
      component.sub.set(
        mockSubscription({
          billingStatus: 'CANCELED',
          cancelAtPeriodEnd: true,
          subscriptionPeriodEnd: '2026-04-01',
        }),
      );
      expect(component.isCanceledButAccess()).toBe(true);
    });

    it('returns false when CANCELED but cancelAtPeriodEnd is false', () => {
      component.sub.set(
        mockSubscription({
          billingStatus: 'CANCELED',
          cancelAtPeriodEnd: false,
          subscriptionPeriodEnd: '2026-04-01',
        }),
      );
      expect(component.isCanceledButAccess()).toBe(false);
    });

    it('returns false when CANCELED but no subscriptionPeriodEnd', () => {
      component.sub.set(
        mockSubscription({
          billingStatus: 'CANCELED',
          cancelAtPeriodEnd: true,
          subscriptionPeriodEnd: null,
        }),
      );
      expect(component.isCanceledButAccess()).toBe(false);
    });

    it('returns false for ACTIVE status', () => {
      component.sub.set(mockSubscription({ billingStatus: 'ACTIVE' }));
      expect(component.isCanceledButAccess()).toBe(false);
    });

    it('returns false when sub is null', () => {
      component.sub.set(null);
      expect(component.isCanceledButAccess()).toBe(false);
    });
  });

  // ── statusLabel — remaining statuses ───────────────────────────────────────
  describe('statusLabel — all statuses', () => {
    it('returns Free for NONE', () => {
      component.sub.set(mockSubscription({ billingStatus: 'NONE' }));
      expect(component.statusLabel()).toBe('Free');
    });

    it('returns Past Due for PAST_DUE', () => {
      component.sub.set(mockSubscription({ billingStatus: 'PAST_DUE' }));
      expect(component.statusLabel()).toBe('Past Due');
    });

    it('returns Unpaid for UNPAID', () => {
      component.sub.set(mockSubscription({ billingStatus: 'UNPAID' }));
      expect(component.statusLabel()).toBe('Unpaid');
    });

    it('returns Incomplete for INCOMPLETE', () => {
      component.sub.set(mockSubscription({ billingStatus: 'INCOMPLETE' }));
      expect(component.statusLabel()).toBe('Incomplete');
    });

    it('returns Expired for INCOMPLETE_EXPIRED', () => {
      component.sub.set(
        mockSubscription({ billingStatus: 'INCOMPLETE_EXPIRED' }),
      );
      expect(component.statusLabel()).toBe('Expired');
    });

    it('returns Paused for PAUSED', () => {
      component.sub.set(mockSubscription({ billingStatus: 'PAUSED' }));
      expect(component.statusLabel()).toBe('Paused');
    });

    it('returns Unknown for unrecognised status', () => {
      component.sub.set(
        mockSubscription({ billingStatus: 'WHATEVER' as never }),
      );
      expect(component.statusLabel()).toBe('Unknown');
    });

    it('returns Free when sub is null', () => {
      component.sub.set(null);
      expect(component.statusLabel()).toBe('Free');
    });
  });

  // ── statusSeverity — remaining statuses ────────────────────────────────────
  describe('statusSeverity — all statuses', () => {
    it('returns secondary for NONE', () => {
      component.sub.set(null);
      expect(component.statusSeverity()).toBe('secondary');
    });

    it('returns info for TRIALING', () => {
      component.sub.set(mockSubscription({ billingStatus: 'TRIALING' }));
      expect(component.statusSeverity()).toBe('info');
    });

    it('returns secondary for CANCELED', () => {
      component.sub.set(mockSubscription({ billingStatus: 'CANCELED' }));
      expect(component.statusSeverity()).toBe('secondary');
    });

    it('returns danger for UNPAID', () => {
      component.sub.set(mockSubscription({ billingStatus: 'UNPAID' }));
      expect(component.statusSeverity()).toBe('danger');
    });

    it('returns warn for INCOMPLETE', () => {
      component.sub.set(mockSubscription({ billingStatus: 'INCOMPLETE' }));
      expect(component.statusSeverity()).toBe('warn');
    });

    it('returns danger for INCOMPLETE_EXPIRED', () => {
      component.sub.set(
        mockSubscription({ billingStatus: 'INCOMPLETE_EXPIRED' }),
      );
      expect(component.statusSeverity()).toBe('danger');
    });

    it('returns secondary for PAUSED', () => {
      component.sub.set(mockSubscription({ billingStatus: 'PAUSED' }));
      expect(component.statusSeverity()).toBe('secondary');
    });
  });

  // ── load() — empty orgId branch ────────────────────────────────────────────
  describe('load() — edge cases', () => {
    it('does nothing when activeOrgId is null', () => {
      orgsStoreMock.activeOrgId.set(null);
      component = TestBed.runInInjectionContext(() => new BillingComponent());
      billingApiMock.getSubscription = vi.fn();

      component.load();

      expect(billingApiMock.getSubscription).not.toHaveBeenCalled();
    });
  });
});
