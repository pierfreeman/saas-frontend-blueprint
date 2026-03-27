import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { EntitlementsApi } from '@saas-frontend/entitlements/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const BASE = 'https://api.test';

const mockEntitlements = {
  plan: 'PRO' as const,
  advancedAnalytics: true,
  customReports: true,
  apiAccess: true,
  ssoEnabled: false,
  prioritySupport: false,
  maxSeats: 25,
  storageLimitBytes: 10 * 1024 * 1024 * 1024,
};

describe('EntitlementsApi', () => {
  let api: EntitlementsApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(EntitlementsApi);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('getEntitlements()', () => {
    it('sends GET /organizations/:orgId/entitlements and returns entitlements', () => {
      let result: typeof mockEntitlements | undefined;
      api
        .getEntitlements('org-1')
        .subscribe((e) => (result = e as typeof mockEntitlements));

      const req = controller.expectOne(
        `${BASE}/organizations/org-1/entitlements`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockEntitlements);

      expect(result).toEqual(mockEntitlements);
    });
  });

  describe('invalidateCache()', () => {
    it('sends POST /organizations/:orgId/entitlements/invalidate with empty body', () => {
      const mockResponse = { message: 'Cache invalidated' };
      let result: unknown;
      api.invalidateCache('org-2').subscribe((r) => (result = r));

      const req = controller.expectOne(
        `${BASE}/organizations/org-2/entitlements/invalidate`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);

      expect(result).toEqual(mockResponse);
    });
  });
});
