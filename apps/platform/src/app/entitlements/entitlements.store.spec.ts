import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  EntitlementsStore,
  EntitlementsApi,
} from '@saas-frontend/entitlements/data-access';
import type {
  OrganizationEntitlements,
  ApiError,
} from '@saas-frontend/entitlements/data-access';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEntitlements(
  overrides: Partial<OrganizationEntitlements> = {},
): OrganizationEntitlements {
  return {
    organizationId: 'org-1',
    plan: 'PRO',
    subscriptionStatus: 'ACTIVE',
    advancedAnalytics: true,
    customReports: true,
    apiAccess: true,
    ssoEnabled: false,
    prioritySupport: false,
    maxSeats: 10,
    ...overrides,
  };
}

const apiError: ApiError = {
  status: 500,
  message: 'Internal Server Error',
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('EntitlementsStore', () => {
  let store: EntitlementsStore;
  let getEntitlementsMock: ReturnType<typeof vi.fn>;
  let invalidateCacheMock: ReturnType<typeof vi.fn>;

  function setup() {
    getEntitlementsMock = vi.fn(() => of(makeEntitlements()));
    invalidateCacheMock = vi.fn(() => of({ message: 'Cache invalidated' }));

    const mockApi = {
      getEntitlements: getEntitlementsMock,
      invalidateCache: invalidateCacheMock,
    } as unknown as EntitlementsApi;

    TestBed.configureTestingModule({
      providers: [
        EntitlementsStore,
        { provide: EntitlementsApi, useValue: mockApi },
      ],
    });

    store = TestBed.inject(EntitlementsStore);
  }

  beforeEach(() => {
    setup();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('entitlements is null', () => {
      expect(store.entitlements()).toBeNull();
    });

    it('loading is false', () => {
      expect(store.loading()).toBe(false);
    });

    it('error is null', () => {
      expect(store.error()).toBeNull();
    });

    it('plan is null', () => {
      expect(store.plan()).toBeNull();
    });

    it('isFree is false', () => {
      expect(store.isFree()).toBe(false);
    });

    it('isPro is false', () => {
      expect(store.isPro()).toBe(false);
    });

    it('isEnterprise is false', () => {
      expect(store.isEnterprise()).toBe(false);
    });

    it('canUseAdvancedAnalytics is false', () => {
      expect(store.canUseAdvancedAnalytics()).toBe(false);
    });

    it('canUseCustomReports is false', () => {
      expect(store.canUseCustomReports()).toBe(false);
    });

    it('canUseApiAccess is false', () => {
      expect(store.canUseApiAccess()).toBe(false);
    });

    it('ssoEnabled is false', () => {
      expect(store.ssoEnabled()).toBe(false);
    });

    it('prioritySupport is false', () => {
      expect(store.prioritySupport()).toBe(false);
    });
  });

  // ── loadEntitlements ─────────────────────────────────────────────────────

  describe('loadEntitlements()', () => {
    it('calls the API with the correct orgId', async () => {
      await store.loadEntitlements('org-42');
      expect(getEntitlementsMock).toHaveBeenCalledWith('org-42');
    });

    it('sets entitlements on success', async () => {
      const data = makeEntitlements({ plan: 'ENTERPRISE' });
      getEntitlementsMock.mockReturnValue(of(data));

      await store.loadEntitlements('org-1');

      expect(store.entitlements()).toEqual(data);
    });

    it('sets loading to false after success', async () => {
      await store.loadEntitlements('org-1');
      expect(store.loading()).toBe(false);
    });

    it('clears error on success', async () => {
      // Pre-set an error to verify it's cleared
      getEntitlementsMock.mockReturnValueOnce(throwError(() => apiError));
      await store.loadEntitlements('org-1');
      getEntitlementsMock.mockReturnValue(of(makeEntitlements()));
      await store.loadEntitlements('org-1');

      expect(store.error()).toBeNull();
    });

    it('sets error on failure', async () => {
      getEntitlementsMock.mockReturnValue(throwError(() => apiError));

      await store.loadEntitlements('org-1');

      expect(store.error()).toEqual(apiError);
    });

    it('sets loading to false after failure', async () => {
      getEntitlementsMock.mockReturnValue(throwError(() => apiError));

      await store.loadEntitlements('org-1');

      expect(store.loading()).toBe(false);
    });

    it('entitlements remains null on failure', async () => {
      getEntitlementsMock.mockReturnValue(throwError(() => apiError));

      await store.loadEntitlements('org-1');

      expect(store.entitlements()).toBeNull();
    });
  });

  // ── Computed signals ─────────────────────────────────────────────────────

  describe('computed signals', () => {
    it('plan reflects the loaded plan', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ plan: 'FREE' })),
      );
      await store.loadEntitlements('org-1');
      expect(store.plan()).toBe('FREE');
    });

    it('isFree is true when plan is FREE', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ plan: 'FREE' })),
      );
      await store.loadEntitlements('org-1');
      expect(store.isFree()).toBe(true);
      expect(store.isPro()).toBe(false);
      expect(store.isEnterprise()).toBe(false);
    });

    it('isPro is true when plan is PRO', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ plan: 'PRO' })),
      );
      await store.loadEntitlements('org-1');
      expect(store.isPro()).toBe(true);
      expect(store.isFree()).toBe(false);
      expect(store.isEnterprise()).toBe(false);
    });

    it('isEnterprise is true when plan is ENTERPRISE', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ plan: 'ENTERPRISE' })),
      );
      await store.loadEntitlements('org-1');
      expect(store.isEnterprise()).toBe(true);
      expect(store.isFree()).toBe(false);
      expect(store.isPro()).toBe(false);
    });

    it('canUseAdvancedAnalytics reflects the entitlements flag', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ advancedAnalytics: true })),
      );
      await store.loadEntitlements('org-1');
      expect(store.canUseAdvancedAnalytics()).toBe(true);
    });

    it('canUseCustomReports reflects the entitlements flag', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ customReports: false })),
      );
      await store.loadEntitlements('org-1');
      expect(store.canUseCustomReports()).toBe(false);
    });

    it('canUseApiAccess reflects the entitlements flag', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ apiAccess: false })),
      );
      await store.loadEntitlements('org-1');
      expect(store.canUseApiAccess()).toBe(false);
    });

    it('ssoEnabled reflects the entitlements flag', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ ssoEnabled: true })),
      );
      await store.loadEntitlements('org-1');
      expect(store.ssoEnabled()).toBe(true);
    });

    it('prioritySupport reflects the entitlements flag', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ prioritySupport: true })),
      );
      await store.loadEntitlements('org-1');
      expect(store.prioritySupport()).toBe(true);
    });

    it('maxSeats returns value from API response', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ maxSeats: 3 })),
      );
      await store.loadEntitlements('org-1');
      expect(store.maxSeats()).toBe(3);
    });

    it('maxSeats returns 3 as fallback when entitlements not loaded', () => {
      expect(store.maxSeats()).toBe(3);
    });

    it('maxSeats returns 999999 for ENTERPRISE plan', async () => {
      getEntitlementsMock.mockReturnValue(
        of(makeEntitlements({ maxSeats: 999999 })),
      );
      await store.loadEntitlements('org-1');
      expect(store.maxSeats()).toBe(999999);
    });
  });

  // ── invalidateCache ──────────────────────────────────────────────────────

  describe('invalidateCache()', () => {
    it('calls the invalidate API then reloads entitlements', async () => {
      await store.invalidateCache('org-1');

      expect(invalidateCacheMock).toHaveBeenCalledWith('org-1');
      expect(getEntitlementsMock).toHaveBeenCalledWith('org-1');
    });

    it('reloads entitlements with fresh data after invalidation', async () => {
      const fresh = makeEntitlements({ plan: 'ENTERPRISE' });
      getEntitlementsMock.mockReturnValue(of(fresh));

      await store.invalidateCache('org-1');

      expect(store.entitlements()).toEqual(fresh);
    });

    it('sets error when invalidation fails', async () => {
      invalidateCacheMock.mockReturnValue(throwError(() => apiError));

      await store.invalidateCache('org-1');

      expect(store.error()).toEqual(apiError);
    });

    it('does not reload entitlements when invalidation fails', async () => {
      invalidateCacheMock.mockReturnValue(throwError(() => apiError));

      await store.invalidateCache('org-1');

      expect(getEntitlementsMock).not.toHaveBeenCalled();
    });
  });

  // ── flush ────────────────────────────────────────────────────────────────

  describe('flush()', () => {
    it('resets entitlements to null', async () => {
      await store.loadEntitlements('org-1');
      store.flush();
      expect(store.entitlements()).toBeNull();
    });

    it('resets loading to false', async () => {
      store.flush();
      expect(store.loading()).toBe(false);
    });

    it('resets error to null', async () => {
      getEntitlementsMock.mockReturnValue(throwError(() => apiError));
      await store.loadEntitlements('org-1');
      store.flush();
      expect(store.error()).toBeNull();
    });

    it('resets computed signals to their empty defaults', async () => {
      await store.loadEntitlements('org-1');
      store.flush();
      expect(store.plan()).toBeNull();
      expect(store.isFree()).toBe(false);
      expect(store.isPro()).toBe(false);
      expect(store.isEnterprise()).toBe(false);
    });
  });
});
