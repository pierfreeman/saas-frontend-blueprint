import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { AuthStore } from '@org/auth/data-access';
import { OrganizationsStore } from '@org/organizations/data-access';
import { MembershipsApi } from '@org/memberships/data-access';
import { BillingApi, SubscriptionResponse } from '@org/billing/data-access';
import { EntitlementsStore } from '@org/entitlements/data-access';
import { StorageApi, StorageQuotaResponse } from '@org/storage/data-access';

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

function makeQuota(
  overrides: Partial<StorageQuotaResponse> = {},
): StorageQuotaResponse {
  return {
    storageLimitBytes: '107374182',
    storageUsedBytes: '0',
    fileCount: 0,
    fileCountLimit: 100,
    maxFileSizeBytes: '52428800',
    ...overrides,
  };
}

function setup(opts: {
  email?: string;
  memberCount?: number;
  subscription?: SubscriptionResponse | null;
  maxSeats?: number;
  membersError?: boolean;
  billingError?: boolean;
  storageError?: boolean;
}) {
  const {
    email = 'alice@example.com',
    memberCount = 5,
    subscription = makeSubscription(),
    maxSeats = 10,
    membersError = false,
    billingError = false,
    storageError = false,
  } = opts;

  const mockAuth = {
    currentUser: signal({ email }),
  } as unknown as AuthStore;

  const mockOrgs = {
    activeOrgId: signal<string | null>('org-1'),
  } as unknown as OrganizationsStore;

  const mockMembershipsApi = {
    getMemberships: vi.fn(() =>
      membersError
        ? throwError(() => new Error('fail'))
        : of(Array.from({ length: memberCount }, (_, i) => ({ id: `m${i}` }))),
    ),
  } as unknown as MembershipsApi;

  const mockBillingApi = {
    getSubscription: vi.fn(() =>
      billingError ? throwError(() => new Error('fail')) : of(subscription),
    ),
  } as unknown as BillingApi;

  const mockEnt = {
    maxSeats: signal(maxSeats),
  } as unknown as EntitlementsStore;

  const mockStorageApi = {
    getStorageQuota: vi.fn(() =>
      storageError ? throwError(() => new Error('fail')) : of(makeQuota()),
    ),
  } as unknown as StorageApi;

  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: mockAuth },
      { provide: OrganizationsStore, useValue: mockOrgs },
      { provide: MembershipsApi, useValue: mockMembershipsApi },
      { provide: BillingApi, useValue: mockBillingApi },
      { provide: EntitlementsStore, useValue: mockEnt },
      { provide: StorageApi, useValue: mockStorageApi },
    ],
  });

  const fixture = TestBed.createComponent(DashboardComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return {
    fixture,
    component,
    mockMembershipsApi,
    mockBillingApi,
    mockStorageApi,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DashboardComponent', () => {
  describe('initialisation', () => {
    it('calls getMemberships and getSubscription on init', () => {
      const { mockMembershipsApi, mockBillingApi } = setup({});
      expect(mockMembershipsApi.getMemberships).toHaveBeenCalledWith('org-1');
      expect(mockBillingApi.getSubscription).toHaveBeenCalledWith('org-1');
    });

    it('sets memberCount from API response', async () => {
      const { component, fixture } = setup({ memberCount: 7 });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.memberCount()).toBe(7);
    });

    it('clears loading flags after API calls', async () => {
      const { component, fixture } = setup({});
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingMembers()).toBe(false);
      expect(component.loadingBilling()).toBe(false);
    });

    it('sets loading to false on members API error', async () => {
      const { component, fixture } = setup({ membersError: true });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingMembers()).toBe(false);
    });

    it('sets loading to false on billing API error', async () => {
      const { component, fixture } = setup({ billingError: true });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingBilling()).toBe(false);
    });

    it('does not call APIs when no orgId', () => {
      const mockAuth = {
        currentUser: signal({ email: 'x@x.com' }),
      } as unknown as AuthStore;
      const mockOrgs = {
        activeOrgId: signal<string | null>(null),
      } as unknown as OrganizationsStore;
      const mockMembershipsApi = {
        getMemberships: vi.fn(),
      } as unknown as MembershipsApi;
      const mockBillingApi = {
        getSubscription: vi.fn(),
      } as unknown as BillingApi;
      const mockEnt = { maxSeats: signal(10) } as unknown as EntitlementsStore;
      const mockStorageApi = {
        getStorageQuota: vi.fn(() => of(makeQuota())),
      } as unknown as StorageApi;

      TestBed.configureTestingModule({
        imports: [DashboardComponent],
        providers: [
          provideRouter([]),
          { provide: AuthStore, useValue: mockAuth },
          { provide: OrganizationsStore, useValue: mockOrgs },
          { provide: MembershipsApi, useValue: mockMembershipsApi },
          { provide: BillingApi, useValue: mockBillingApi },
          { provide: EntitlementsStore, useValue: mockEnt },
          { provide: StorageApi, useValue: mockStorageApi },
        ],
      });

      const fixture = TestBed.createComponent(DashboardComponent);
      fixture.detectChanges();

      expect(mockMembershipsApi.getMemberships).not.toHaveBeenCalled();
      expect(mockBillingApi.getSubscription).not.toHaveBeenCalled();
    });
  });

  describe('planLabel', () => {
    it('returns "Free" for NONE billing status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'NONE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.planLabel()).toBe('Free');
    });

    it('returns "Pro" for ACTIVE status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'ACTIVE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.planLabel()).toBe('Pro');
    });

    it('returns "Free" for CANCELED status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'CANCELED' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.planLabel()).toBe('Free');
    });

    it('returns em dash when subscription is null', () => {
      const { component } = setup({ subscription: null });
      expect(component.planLabel()).toBe('—');
    });
  });

  describe('seatCount', () => {
    it('returns maxSeats from EntitlementsStore', () => {
      const { component } = setup({ maxSeats: 42 });
      expect(component.seatCount()).toBe(42);
    });
  });

  describe('user info helpers', () => {
    it('email returns current user email', () => {
      const { component } = setup({ email: 'bob@test.com' });
      expect(component.email()).toBe('bob@test.com');
    });

    it('name returns the part before the @ sign', () => {
      const { component } = setup({ email: 'charlie@example.com' });
      expect(component.name()).toBe('charlie');
    });
  });
});
