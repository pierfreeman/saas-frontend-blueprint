import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { BillingApi } from './billing.api';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const BASE = 'https://api.test';
const ORG_ID = 'org-1';

describe('BillingApi', () => {
  let api: BillingApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(BillingApi);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('createCheckoutSession()', () => {
    it('issues POST /billing/checkout with the DTO body', () => {
      const dto = { orgId: ORG_ID, plan: 'PRO' as const };
      api.createCheckoutSession(dto).subscribe();

      const req = controller.expectOne(`${BASE}/billing/checkout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ url: 'https://checkout.stripe.com/session-123' });
    });

    it('uses the injected API_BASE_URL token', () => {
      const dto = { orgId: ORG_ID, plan: 'ENTERPRISE' as const };
      api.createCheckoutSession(dto).subscribe();

      const req = controller.expectOne(`${BASE}/billing/checkout`);
      expect(req.request.url).toBe(`${BASE}/billing/checkout`);
      req.flush({ url: 'https://checkout.stripe.com/session-456' });
    });
  });

  describe('createPortalSession()', () => {
    it('issues POST /billing/portal with the DTO body', () => {
      const dto = { orgId: ORG_ID };
      api.createPortalSession(dto).subscribe();

      const req = controller.expectOne(`${BASE}/billing/portal`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ url: 'https://billing.stripe.com/portal-123' });
    });

    it('uses the injected API_BASE_URL token', () => {
      const dto = { orgId: ORG_ID };
      api.createPortalSession(dto).subscribe();

      const req = controller.expectOne(`${BASE}/billing/portal`);
      expect(req.request.url).toBe(`${BASE}/billing/portal`);
      req.flush({ url: 'https://billing.stripe.com/portal-456' });
    });
  });

  describe('getSubscription()', () => {
    it('issues GET /billing/subscription with orgId query param', () => {
      api.getSubscription(ORG_ID).subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/billing/subscription`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('orgId')).toBe(ORG_ID);
      req.flush({
        subscriptionId: 'sub-123',
        status: 'active',
        plan: 'PRO',
        seats: 10,
        currentPeriodStart: '2026-01-01',
        currentPeriodEnd: '2026-02-01',
      });
    });

    it('uses the injected API_BASE_URL token', () => {
      api.getSubscription(ORG_ID).subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/billing/subscription`,
      );
      expect(req.request.url).toBe(`${BASE}/billing/subscription`);
      req.flush({
        subscriptionId: 'sub-456',
        status: 'active',
        plan: 'ENTERPRISE',
        seats: 999,
        currentPeriodStart: '2026-01-01',
        currentPeriodEnd: '2026-02-01',
      });
    });
  });

  describe('cancelSubscription()', () => {
    it('issues POST /billing/cancel with the DTO body', () => {
      const dto = { orgId: ORG_ID, reason: 'Too expensive' };
      api.cancelSubscription(dto).subscribe();

      const req = controller.expectOne(`${BASE}/billing/cancel`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ message: 'Subscription cancelled successfully' });
    });

    it('uses the injected API_BASE_URL token', () => {
      const dto = { orgId: ORG_ID };
      api.cancelSubscription(dto).subscribe();

      const req = controller.expectOne(`${BASE}/billing/cancel`);
      expect(req.request.url).toBe(`${BASE}/billing/cancel`);
      req.flush({ message: 'Cancelled' });
    });
  });
});
