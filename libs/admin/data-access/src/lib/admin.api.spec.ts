import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { AdminApi } from './admin.api';
import { ADMIN_API_BASE_URL } from '@saas-frontend/shared/util-types';

describe('AdminApi', () => {
  let api: AdminApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ADMIN_API_BASE_URL, useValue: 'http://test' },
        AdminApi,
      ],
    });
    api = TestBed.inject(AdminApi);
    httpMock = TestBed.inject(HttpTestingController);
    vi.restoreAllMocks();
  });

  afterEach(() => httpMock.verify());

  // ── Organizations ─────────────────────────────────────────────────────────

  it('GET /admin/organizations', () => {
    api.getOrganizations({ search: 'acme', limit: 10 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/admin/organizations') &&
        r.params.get('search') === 'acme',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, limit: 10, offset: 0 });
  });

  it('GET /admin/organizations with offset param', () => {
    api.getOrganizations({ offset: 20 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/admin/organizations') &&
        r.params.get('offset') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, limit: 10, offset: 20 });
  });

  it('GET /admin/organizations/:orgId', () => {
    api.getOrganizationDetail('org-1').subscribe();
    const req = httpMock.expectOne('http://test/admin/organizations/org-1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('POST /admin/organizations (provisionOrganization)', () => {
    api
      .provisionOrganization({ name: 'Acme', ownerEmail: 'admin@acme.com' })
      .subscribe();
    const req = httpMock.expectOne('http://test/admin/organizations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Acme',
      ownerEmail: 'admin@acme.com',
    });
    req.flush({ id: 'org-new', name: 'Acme' });
  });

  // ── Memberships ───────────────────────────────────────────────────────────

  it('GET /admin/organizations/:orgId/memberships', () => {
    api.listMembers('org-1', { limit: 20 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/admin/organizations/org-1/memberships') &&
        r.params.get('limit') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, limit: 20, offset: 0 });
  });

  it('GET /admin/organizations/:orgId/memberships with offset param', () => {
    api.listMembers('org-1', { offset: 40 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/admin/organizations/org-1/memberships') &&
        r.params.get('offset') === '40',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, limit: 20, offset: 40 });
  });

  it('PATCH /admin/organizations/:orgId/memberships/:id/role', () => {
    api.changeRole('org-1', 'mem-1', 'ADMIN').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/memberships/mem-1/role',
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ newRole: 'ADMIN' });
    req.flush({});
  });

  it('POST /admin/organizations/:orgId/memberships', () => {
    api.inviteMember('org-1', 'test@example.com', 'MEMBER').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/memberships',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'test@example.com',
      role: 'MEMBER',
    });
    req.flush(null);
  });

  it('DELETE /admin/organizations/:orgId/memberships/:id', () => {
    api.removeMember('org-1', 'mem-1').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/memberships/mem-1',
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── Billing ───────────────────────────────────────────────────────────────

  it('GET /admin/organizations/:orgId/billing', () => {
    api.getBillingOverview('org-1').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/billing',
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('POST /admin/organizations/:orgId/billing/portal', () => {
    api.getBillingPortalUrl('org-1', 'http://localhost:4203/admin').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/billing/portal',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      returnUrl: 'http://localhost:4203/admin',
    });
    req.flush({ url: 'https://billing.stripe.com/xxx' });
  });

  // ── Activity log ──────────────────────────────────────────────────────────

  it('GET /admin/organizations/:orgId/activity-log', () => {
    api.getOrgActivity('org-1', { limit: 10 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/admin/organizations/org-1/activity-log') &&
        r.params.get('limit') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ logs: [], total: 0, limit: 10, offset: 0 });
  });

  it('GET /admin/organizations/:orgId/activity-log with offset param', () => {
    api.getOrgActivity('org-1', { offset: 10 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/admin/organizations/org-1/activity-log') &&
        r.params.get('offset') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ logs: [], total: 0, limit: 10, offset: 10 });
  });

  it('GET /admin/activity-log (cross-org)', () => {
    api.getAllActivity({ orgId: 'org-2', limit: 5 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/admin/activity-log') &&
        r.params.get('orgId') === 'org-2',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ logs: [], total: 0, limit: 5, offset: 0 });
  });

  it('GET /admin/activity-log with offset param', () => {
    api.getAllActivity({ offset: 15 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/admin/activity-log') &&
        r.params.get('offset') === '15',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ logs: [], total: 0, limit: 10, offset: 15 });
  });

  // ── Entitlements ──────────────────────────────────────────────────────────

  it('GET /admin/organizations/:orgId/entitlements', () => {
    api.getEntitlements('org-1').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/entitlements',
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('POST /admin/organizations/:orgId/entitlements/invalidate', () => {
    api.invalidateEntitlements('org-1').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/entitlements/invalidate',
    );
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('GET /admin/organizations/:orgId/entitlements/overrides', () => {
    api.listFeatureFlagOverrides('org-1').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/entitlements/overrides',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('PATCH /admin/organizations/:orgId/feature-flags (setFeatureFlagOverride)', () => {
    api
      .setFeatureFlagOverride('org-1', {
        key: 'advanced_analytics',
        value: true,
      })
      .subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/feature-flags',
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      key: 'advanced_analytics',
      value: true,
    });
    req.flush({ key: 'advanced_analytics', value: true });
  });

  it('DELETE /admin/organizations/:orgId/feature-flags/:key', () => {
    api.deleteFeatureFlagOverride('org-1', 'advanced_analytics').subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/feature-flags/advanced_analytics',
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── Org status ────────────────────────────────────────────────────────────

  it('PATCH /admin/organizations/:orgId/status with status and reason', () => {
    api
      .setOrgStatus('org-1', {
        status: 'SUSPENDED',
        reason: 'Policy violation',
      })
      .subscribe();
    const req = httpMock.expectOne(
      'http://test/admin/organizations/org-1/status',
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      status: 'SUSPENDED',
      reason: 'Policy violation',
    });
    req.flush({ id: 'org-1', status: 'SUSPENDED' });
  });

  // ── Jobs ──────────────────────────────────────────────────────────────────

  it('GET /admin/organizations/:orgId/jobs with no filters', () => {
    api.getOrgJobs('org-1').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/organizations/org-1/jobs'),
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ items: [], total: 0, limit: 20, offset: 0 });
  });

  it('GET /admin/organizations/:orgId/jobs with status and type filters', () => {
    api
      .getOrgJobs('org-1', {
        status: 'FAILED',
        type: 'ORG_EXPORT',
        limit: 10,
        offset: 0,
      })
      .subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/organizations/org-1/jobs'),
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('FAILED');
    expect(req.request.params.get('type')).toBe('ORG_EXPORT');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ items: [], total: 0, limit: 10, offset: 0 });
  });

  // ── Billing plan & trial ──────────────────────────────────────────────────

  it('PATCH /admin/organizations/:orgId/billing/plan calls changePlan', () => {
    api.changePlan('org-1', { priceId: 'price_pro' }).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/organizations/org-1/billing/plan'),
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ priceId: 'price_pro' });
    req.flush(null);
  });

  it('PATCH /admin/organizations/:orgId/billing/trial calls extendTrial', () => {
    api
      .extendTrial('org-1', { trialEnd: '2025-12-31T23:59:59.000Z' })
      .subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/organizations/org-1/billing/trial'),
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ trialEnd: '2025-12-31T23:59:59.000Z' });
    req.flush(null);
  });

  // ── Exports ────────────────────────────────────────────────────────────────

  it('POST /admin/organizations/:orgId/exports triggers export', () => {
    api.triggerExport('org-1').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === 'http://test/admin/organizations/org-1/exports',
    );
    expect(req.request.method).toBe('POST');
    req.flush({ exportId: 'export-1' });
  });

  it('GET /admin/organizations/:orgId/exports with pagination', () => {
    api.listOrgExports('org-1', { limit: 10, offset: 20 }).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/organizations/org-1/exports'),
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('offset')).toBe('20');
    req.flush({ items: [], total: 0, limit: 10, offset: 20 });
  });

  it('GET /admin/organizations/:orgId/exports/:exportId fetches single export', () => {
    api.getExport('org-1', 'export-abc').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/organizations/org-1/exports/export-abc'),
    );
    expect(req.request.method).toBe('GET');
    req.flush({ exportId: 'export-abc', status: 'COMPLETED' });
  });

  // ── Storage ────────────────────────────────────────────────────────────────

  it('GET /admin/organizations/:orgId/storage fetches storage stats', () => {
    api.getOrgStorageStats('org-1').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/admin/organizations/org-1/storage'),
    );
    expect(req.request.method).toBe('GET');
    req.flush({ totalBytes: '1024', fileCount: 5 });
  });
});
