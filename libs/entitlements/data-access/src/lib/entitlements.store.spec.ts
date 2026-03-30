import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { EntitlementsStore } from './entitlements.store';
import { EntitlementsApi } from './entitlements.api';
import type { OrganizationEntitlements } from './entitlements.api.types';

const ORG_ID = 'org-1';

const mockEntitlementsFree: OrganizationEntitlements = {
  plan: 'FREE',
  maxSeats: 3,
  advancedAnalytics: false,
  customReports: false,
  apiAccess: false,
  ssoEnabled: false,
  prioritySupport: false,
  storageLimitBytes: 100 * 1024 * 1024,
} as never;

const mockEntitlementsPro: OrganizationEntitlements = {
  plan: 'PRO',
  maxSeats: 10,
  advancedAnalytics: true,
  customReports: true,
  apiAccess: false,
  ssoEnabled: false,
  prioritySupport: false,
  storageLimitBytes: 1024 * 1024 * 1024,
} as never;

const mockEntitlementsEnterprise: OrganizationEntitlements = {
  plan: 'ENTERPRISE',
  maxSeats: 999,
  advancedAnalytics: true,
  customReports: true,
  apiAccess: true,
  ssoEnabled: true,
  prioritySupport: true,
  storageLimitBytes: 10 * 1024 * 1024 * 1024,
} as never;

function makeMockApi(overrides: Record<string, unknown> = {}) {
  return {
    getEntitlements: vi.fn(() => of(mockEntitlementsFree)),
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

  // ── Computed — plan detection ──────────────────────────────────────────────
  describe('plan()', () => {
    it('returns null when entitlements is null', () => {
      expect(store.plan()).toBeNull();
    });

    it('returns FREE when plan is FREE', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.plan()).toBe('FREE');
    });

    it('returns PRO when plan is PRO', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsPro)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.plan()).toBe('PRO');
    });

    it('returns ENTERPRISE when plan is ENTERPRISE', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsEnterprise)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.plan()).toBe('ENTERPRISE');
    });
  });

  describe('isFree', () => {
    it('returns false when entitlements is null', () => {
      expect(store.isFree()).toBe(false);
    });

    it('returns true when plan is FREE', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.isFree()).toBe(true);
    });

    it('returns false when plan is PRO', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsPro)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.isFree()).toBe(false);
    });
  });

  describe('isPro', () => {
    it('returns false when entitlements is null', () => {
      expect(store.isPro()).toBe(false);
    });

    it('returns false when plan is FREE', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.isPro()).toBe(false);
    });

    it('returns true when plan is PRO', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsPro)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.isPro()).toBe(true);
    });
  });

  describe('isEnterprise', () => {
    it('returns false when entitlements is null', () => {
      expect(store.isEnterprise()).toBe(false);
    });

    it('returns false when plan is FREE', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.isEnterprise()).toBe(false);
    });

    it('returns true when plan is ENTERPRISE', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsEnterprise)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.isEnterprise()).toBe(true);
    });
  });

  // ── Computed — feature flags ───────────────────────────────────────────────
  describe('canUseAdvancedAnalytics', () => {
    it('returns false when entitlements is null', () => {
      expect(store.canUseAdvancedAnalytics()).toBe(false);
    });

    it('returns false when advancedAnalytics is false', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.canUseAdvancedAnalytics()).toBe(false);
    });

    it('returns true when advancedAnalytics is true', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsPro)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.canUseAdvancedAnalytics()).toBe(true);
    });
  });

  describe('canUseCustomReports', () => {
    it('returns false when entitlements is null', () => {
      expect(store.canUseCustomReports()).toBe(false);
    });

    it('returns false when customReports is false', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.canUseCustomReports()).toBe(false);
    });

    it('returns true when customReports is true', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsPro)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.canUseCustomReports()).toBe(true);
    });
  });

  describe('canUseApiAccess', () => {
    it('returns false when entitlements is null', () => {
      expect(store.canUseApiAccess()).toBe(false);
    });

    it('returns false when apiAccess is false', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.canUseApiAccess()).toBe(false);
    });

    it('returns true when apiAccess is true', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsEnterprise)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.canUseApiAccess()).toBe(true);
    });
  });

  describe('ssoEnabled', () => {
    it('returns false when entitlements is null', () => {
      expect(store.ssoEnabled()).toBe(false);
    });

    it('returns false when ssoEnabled is false', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.ssoEnabled()).toBe(false);
    });

    it('returns true when ssoEnabled is true', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsEnterprise)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.ssoEnabled()).toBe(true);
    });
  });

  describe('prioritySupport', () => {
    it('returns false when entitlements is null', () => {
      expect(store.prioritySupport()).toBe(false);
    });

    it('returns false when prioritySupport is false', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.prioritySupport()).toBe(false);
    });

    it('returns true when prioritySupport is true', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsEnterprise)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.prioritySupport()).toBe(true);
    });
  });

  // ── Computed — limits ──────────────────────────────────────────────────────
  describe('maxSeats', () => {
    it('returns 3 when entitlements is null', () => {
      expect(store.maxSeats()).toBe(3);
    });

    it('returns the correct value from entitlements', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.maxSeats()).toBe(3);
    });

    it('returns the correct value for PRO plan', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsPro)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.maxSeats()).toBe(10);
    });
  });

  describe('storageLimitBytes', () => {
    it('returns 100 MiB when entitlements is null', () => {
      expect(store.storageLimitBytes()).toBe(100 * 1024 * 1024);
    });

    it('returns the correct value from entitlements', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.storageLimitBytes()).toBe(100 * 1024 * 1024);
    });

    it('returns the correct value for PRO plan', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => of(mockEntitlementsPro)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.storageLimitBytes()).toBe(1024 * 1024 * 1024);
    });
  });

  // ── loadEntitlements() ─────────────────────────────────────────────────────
  describe('loadEntitlements()', () => {
    it('sets entitlements on success', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.entitlements()).toEqual(mockEntitlementsFree);
    });

    it('clears error on success', async () => {
      // First create an error
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() =>
                throwError(() => ({ status: 500, message: 'Error' })),
              ),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.error()).not.toBeNull();

      // Now test that success clears the error
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: makeMockApi() }],
      });
      store = TestBed.inject(EntitlementsStore);
      // Manually set an error first
      store.error.set({ status: 500, message: 'Previous error' } as never);
      await store.loadEntitlements(ORG_ID);
      expect(store.error()).toBeNull();
    });

    it('sets loading to false after success', async () => {
      await store.loadEntitlements(ORG_ID);
      expect(store.loading()).toBe(false);
    });

    it('sets error on failure', async () => {
      const error = { status: 500, message: 'Server error' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.error()).toEqual(error);
    });

    it('leaves entitlements unchanged on failure', async () => {
      // First load successfully
      await store.loadEntitlements(ORG_ID);
      const previousEntitlements = store.entitlements();

      // Now test with an error
      const error = { status: 500, message: 'Server error' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      const newStore = TestBed.inject(EntitlementsStore);
      // Set the previous data
      newStore.entitlements.set(previousEntitlements);
      await newStore.loadEntitlements(ORG_ID);
      expect(newStore.entitlements()).toEqual(previousEntitlements);
    });

    it('sets loading to false after error', async () => {
      const error = { status: 500, message: 'Server error' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.loadEntitlements(ORG_ID);
      expect(store.loading()).toBe(false);
    });
  });

  // ── invalidateCache() ──────────────────────────────────────────────────────
  describe('invalidateCache()', () => {
    it('calls api.invalidateCache', async () => {
      const mockApi = makeMockApi();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: mockApi }],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.invalidateCache(ORG_ID);
      expect(mockApi.invalidateCache).toHaveBeenCalledWith(ORG_ID);
    });

    it('calls loadEntitlements after invalidateCache', async () => {
      const mockApi = makeMockApi();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: EntitlementsApi, useValue: mockApi }],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.invalidateCache(ORG_ID);
      expect(mockApi.getEntitlements).toHaveBeenCalledWith(ORG_ID);
    });

    it('sets error when invalidateCache fails', async () => {
      const error = { status: 500, message: 'Cache invalidation failed' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              invalidateCache: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.invalidateCache(ORG_ID);
      expect(store.error()).toEqual(error);
    });

    it('sets error when loadEntitlements fails after invalidateCache', async () => {
      const error = { status: 500, message: 'Load failed' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: EntitlementsApi,
            useValue: makeMockApi({
              getEntitlements: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(EntitlementsStore);
      await store.invalidateCache(ORG_ID);
      expect(store.error()).toEqual(error);
    });
  });

  // ── flush() ────────────────────────────────────────────────────────────────
  describe('flush()', () => {
    it('resets entitlements to null', async () => {
      await store.loadEntitlements(ORG_ID);
      store.flush();
      expect(store.entitlements()).toBeNull();
    });

    it('resets loading to false', async () => {
      store.loading.set(true);
      store.flush();
      expect(store.loading()).toBe(false);
    });

    it('resets error to null', async () => {
      store.error.set({ status: 500, message: 'Error' } as never);
      store.flush();
      expect(store.error()).toBeNull();
    });
  });
});
