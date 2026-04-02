import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AdminOrgDetailComponent } from './admin-org-detail.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

// PrimeNG TabList uses ResizeObserver which jsdom does not implement.
if (
  typeof (globalThis as Record<string, unknown>)['ResizeObserver'] ===
  'undefined'
) {
  (globalThis as Record<string, unknown>)['ResizeObserver'] = class {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    observe() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unobserve() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disconnect() {}
  };
}

const mockOrg = {
  id: 'org-1',
  name: 'Acme Corp',
  status: 'ACTIVE',
  billingStatus: 'ACTIVE',
  planId: 'PRO',
  membersCount: 3,
  createdAt: '2024-01-01T00:00:00Z',
  stripeCustomerId: 'cus_xxx',
  subscriptionId: 'sub_xxx',
  subscriptionPeriodEnd: '2025-01-01T00:00:00Z',
  cancelAtPeriodEnd: false,
  recentActivity: [],
  entitlements: {
    organizationId: 'org-1',
    plan: 'PRO',
    subscriptionStatus: 'ACTIVE',
    advancedAnalytics: true,
    customReports: true,
    apiAccess: true,
    ssoEnabled: false,
    prioritySupport: false,
    maxSeats: 10,
    storageLimitBytes: 5368709120,
  },
};

const mockApi = {
  getOrganizationDetail: vi.fn(() => of(mockOrg)),
  listMembers: vi.fn(() => of({ items: [], total: 0, limit: 20, offset: 0 })),
  getBillingOverview: vi.fn(() => of({})),
  getOrgActivity: vi.fn(() => of({ logs: [], total: 0, limit: 20, offset: 0 })),
  getEntitlements: vi.fn(() => of(mockOrg.entitlements)),
  listFeatureFlagOverrides: vi.fn(() => of([])),
};

describe('AdminOrgDetailComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminOrgDetailComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'org-1' } } },
        },
      ],
    }).compileComponents();
  });

  it('loads org detail on init', () => {
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();
    expect(mockApi.getOrganizationDetail).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance.org()).toEqual(mockOrg);
  });

  it('sets error on API failure', () => {
    mockApi.getOrganizationDetail.mockReturnValue(
      throwError(() => new Error('Not found')),
    );
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBe(
      'Failed to load organization.',
    );
    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
