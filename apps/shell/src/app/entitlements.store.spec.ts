import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  EntitlementsStore,
  EntitlementsApi,
} from '@saas-frontend/entitlements/data-access';

const mockEntitlements = {
  organizationId: 'org-1',
  subscriptionStatus: 'ACTIVE' as const,
  plan: 'PRO' as const,
  advancedAnalytics: true,
  customReports: true,
  apiAccess: true,
  ssoEnabled: false,
  prioritySupport: false,
  maxSeats: 25,
  storageLimitBytes: 10 * 1024 * 1024 * 1024,
};

function makeMockApi(
  overrides: Partial<InstanceType<typeof EntitlementsApi>> = {},
) {
  return {
    getEntitlements: vi.fn(() => of(mockEntitlements)),
    invalidateCache: vi.fn(() => of({ message: 'Cache invalidated' })),
    ...overrides,
  } as unknown as EntitlementsApi;
}

describe('EntitlementsStore', () => {
  let store: EntitlementsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: EntitlementsApi, useValue: makeMockApi() }],
    });
    store = TestBed.inject(EntitlementsStore);
  });

  // ── Initial state ──────────────────────────────────────────────────────────
  it('starts with null entitlements', () => {
    expect(store.entitlements()).toBeNull();
  });

  it('starts with loading false', () => {
    expect(store.loading()).toBe(false);
  });

  it('starts with null error', () => {
    expect(store.error()).toBeNull();
  });

  // ── Computed defaults (no data loaded) ─────────────────────────────────────
  it('plan() returns null when no entitlements', () => {
    expect(store.plan()).toBeNull();
  });

  it('isFree() returns false when no data', () => {
    expect(store.isFree()).toBe(false);
  });

  it('isPro() returns false when no data', () => {
    expect(store.isPro()).toBe(false);
  });

  it('isEnterprise() returns false when no data', () => {
    expect(store.isEnterprise()).toBe(false);
  });

  it('maxSeats() defaults to 3 (FREE limit) when no data', () => {
    expect(store.maxSeats()).toBe(3);
  });

  it('storageLimitBytes() defaults to 100 MiB when no data', () => {
    expect(store.storageLimitBytes()).toBe(100 * 1024 * 1024);
  });

  it('canUseAdvancedAnalytics() defaults to false', () => {
    expect(store.canUseAdvancedAnalytics()).toBe(false);
  });

  it('canUseCustomReports() defaults to false', () => {
    expect(store.canUseCustomReports()).toBe(false);
  });

  it('canUseApiAccess() defaults to false', () => {
    expect(store.canUseApiAccess()).toBe(false);
  });

  it('ssoEnabled() defaults to false', () => {
    expect(store.ssoEnabled()).toBe(false);
  });

  it('prioritySupport() defaults to false', () => {
    expect(store.prioritySupport()).toBe(false);
  });

  // ── loadEntitlements() ─────────────────────────────────────────────────────
  describe('loadEntitlements()', () => {
    it('sets entitlements signal after successful load', async () => {
      await store.loadEntitlements('org-1');
      expect(store.entitlements()).toEqual(mockEntitlements);
    });

    it('sets loading to false after successful load', async () => {
      await store.loadEntitlements('org-1');
      expect(store.loading()).toBe(false);
    });

    it('updates computed signals after load', async () => {
      await store.loadEntitlements('org-1');
      expect(store.plan()).toBe('PRO');
      expect(store.isPro()).toBe(true);
      expect(store.isFree()).toBe(false);
      expect(store.isEnterprise()).toBe(false);
      expect(store.maxSeats()).toBe(25);
      expect(store.canUseAdvancedAnalytics()).toBe(true);
      expect(store.canUseCustomReports()).toBe(true);
      expect(store.canUseApiAccess()).toBe(true);
    });

    it('stores the error and keeps loading false when the API fails', async () => {
      const error = { status: 500, message: 'Server error' };
      const api = makeMockApi({
        getEntitlements: vi.fn(() => throwError(() => error)),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: api }],
      });
      store = TestBed.inject(EntitlementsStore);

      await store.loadEntitlements('org-1');

      expect(store.error()).toEqual(error);
      expect(store.loading()).toBe(false);
      expect(store.entitlements()).toBeNull();
    });

    it('clears previous error on a new successful load', async () => {
      // First load fails
      const failApi = makeMockApi({
        getEntitlements: vi.fn(() =>
          throwError(() => ({ status: 500, message: 'err' })),
        ),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: failApi }],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements('org-1');
      expect(store.error()).not.toBeNull();

      // Second load succeeds
      (failApi.getEntitlements as ReturnType<typeof vi.fn>).mockReturnValue(
        of(mockEntitlements),
      );
      await store.loadEntitlements('org-1');
      expect(store.error()).toBeNull();
    });
  });

  // ── Computed signals with ENTERPRISE plan ─────────────────────────────────
  describe('ENTERPRISE plan computed signals', () => {
    beforeEach(async () => {
      const api = makeMockApi({
        getEntitlements: vi.fn(() =>
          of({
            ...mockEntitlements,
            plan: 'ENTERPRISE' as const,
            prioritySupport: true,
          }),
        ),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: api }],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements('org-1');
    });

    it('isEnterprise() returns true', () =>
      expect(store.isEnterprise()).toBe(true));
    it('prioritySupport() returns true', () =>
      expect(store.prioritySupport()).toBe(true));
  });

  // ── Computed signals with FREE plan ───────────────────────────────────────
  describe('FREE plan computed signals', () => {
    beforeEach(async () => {
      const api = makeMockApi({
        getEntitlements: vi.fn(() =>
          of({
            organizationId: 'org-1',
            subscriptionStatus: 'ACTIVE' as const,
            plan: 'FREE' as const,
            advancedAnalytics: false,
            customReports: false,
            apiAccess: false,
            ssoEnabled: false,
            prioritySupport: false,
            maxSeats: 3,
            storageLimitBytes: 100 * 1024 * 1024,
          }),
        ),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: api }],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements('org-1');
    });

    it('isFree() returns true', () => expect(store.isFree()).toBe(true));
  });

  // ── invalidateCache() ──────────────────────────────────────────────────────
  describe('invalidateCache()', () => {
    it('calls api.invalidateCache and then reloads entitlements', async () => {
      const api = makeMockApi();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: api }],
      });
      store = TestBed.inject(EntitlementsStore);

      await store.invalidateCache('org-1');

      expect(api.invalidateCache).toHaveBeenCalledWith('org-1');
      expect(api.getEntitlements).toHaveBeenCalledWith('org-1');
      expect(store.entitlements()).toEqual(mockEntitlements);
    });

    it('stores error when invalidateCache API fails', async () => {
      const error = { status: 500, message: 'fail' };
      const api = makeMockApi({
        invalidateCache: vi.fn(() => throwError(() => error)),
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: api }],
      });
      store = TestBed.inject(EntitlementsStore);

      await store.invalidateCache('org-1');

      expect(store.error()).toEqual(error);
    });
  });

  // ── flush() ────────────────────────────────────────────────────────────────
  describe('flush()', () => {
    it('resets all state to initial values', async () => {
      await store.loadEntitlements('org-1');
      store.flush();

      expect(store.entitlements()).toBeNull();
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });
});
