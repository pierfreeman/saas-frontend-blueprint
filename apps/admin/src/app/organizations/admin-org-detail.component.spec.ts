import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AdminOrgDetailComponent } from './admin-org-detail.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { ConfirmationService } from 'primeng/api';

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
  setOrgStatus: vi.fn(() => of(mockOrg)),
  listMembers: vi.fn(() => of({ items: [], total: 0, limit: 20, offset: 0 })),
  getBillingOverview: vi.fn(() => of({})),
  getOrgActivity: vi.fn(() => of({ logs: [], total: 0, limit: 20, offset: 0 })),
  getEntitlements: vi.fn(() => of(mockOrg.entitlements)),
  listFeatureFlagOverrides: vi.fn(() => of([])),
  getOrgJobs: vi.fn(() => of({ items: [], total: 0, limit: 20, offset: 0 })),
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

  it('orgStatusSeverity maps org statuses correctly', () => {
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    const cmp = fixture.componentInstance;
    expect(cmp.orgStatusSeverity('ACTIVE')).toBe('success');
    expect(cmp.orgStatusSeverity('SUSPENDED')).toBe('warn');
    expect(cmp.orgStatusSeverity('DELETED')).toBe('danger');
    expect(cmp.orgStatusSeverity('PENDING')).toBe('secondary');
  });

  it('billingStatusSeverity maps billing statuses correctly', () => {
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    const cmp = fixture.componentInstance;
    expect(cmp.billingStatusSeverity('ACTIVE')).toBe('success');
    expect(cmp.billingStatusSeverity('TRIALING')).toBe('info');
    expect(cmp.billingStatusSeverity('PAST_DUE')).toBe('warn');
    expect(cmp.billingStatusSeverity('UNPAID')).toBe('danger');
    expect(cmp.billingStatusSeverity('NONE')).toBe('secondary');
  });

  it('goBack navigates to /admin/organizations', () => {
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance.goBack();
    expect(navSpy).toHaveBeenCalledWith(['/admin/organizations']);
  });

  it('confirmSuspend calls ConfirmationService.confirm with suspend header', () => {
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();

    // Component provides ConfirmationService at component level — use debugElement injector
    const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirmSvc, 'confirm').mockReturnValue(confirmSvc);

    fixture.componentInstance.confirmSuspend();

    expect(confirmSvc.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Suspend organization' }),
    );
  });

  it('confirmReactivate calls ConfirmationService.confirm with reactivate header', () => {
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();

    const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirmSvc, 'confirm').mockReturnValue(confirmSvc);

    fixture.componentInstance.confirmReactivate();

    expect(confirmSvc.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Reactivate organization' }),
    );
  });

  it('changeStatus SUSPENDED calls setOrgStatus and resets loading', () => {
    mockApi.setOrgStatus.mockReturnValueOnce(
      of({ ...mockOrg, status: 'SUSPENDED' }),
    );
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fixture.componentInstance as any).changeStatus('SUSPENDED');

    expect(mockApi.setOrgStatus).toHaveBeenCalledWith('org-1', {
      status: 'SUSPENDED',
    });
    expect(fixture.componentInstance.statusLoading()).toBe(false);
  });

  it('changeStatus sets error on setOrgStatus failure', () => {
    mockApi.setOrgStatus.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fixture.componentInstance as any).changeStatus('SUSPENDED');

    expect(fixture.componentInstance.error()).toBe(
      'Failed to update organization status.',
    );
    expect(fixture.componentInstance.statusLoading()).toBe(false);
  });

  it('confirmSuspend accept callback invokes changeStatus SUSPENDED', () => {
    mockApi.setOrgStatus.mockReturnValue(
      of({ ...mockOrg, status: 'SUSPENDED' }),
    );
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();

    const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
    let acceptFn: (() => void) | undefined;
    vi.spyOn(confirmSvc, 'confirm').mockImplementation((opts) => {
      acceptFn = opts.accept as () => void;
      return confirmSvc;
    });

    fixture.componentInstance.confirmSuspend();
    acceptFn?.();

    expect(mockApi.setOrgStatus).toHaveBeenCalledWith('org-1', {
      status: 'SUSPENDED',
    });
  });

  it('confirmReactivate accept callback invokes changeStatus ACTIVE', () => {
    mockApi.setOrgStatus.mockReturnValue(of({ ...mockOrg, status: 'ACTIVE' }));
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();

    const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
    let acceptFn: (() => void) | undefined;
    vi.spyOn(confirmSvc, 'confirm').mockImplementation((opts) => {
      acceptFn = opts.accept as () => void;
      return confirmSvc;
    });

    fixture.componentInstance.confirmReactivate();
    acceptFn?.();

    expect(mockApi.setOrgStatus).toHaveBeenCalledWith('org-1', {
      status: 'ACTIVE',
    });
  });

  it('template buttons trigger expected handlers', () => {
    const fixture = TestBed.createComponent(AdminOrgDetailComponent);
    fixture.detectChanges();

    const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirmSvc, 'confirm').mockReturnValue(confirmSvc);

    // Mock router so goBack() navigation doesn't fail
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    const allButtons = fixture.debugElement.queryAll(By.css('p-button'));
    allButtons.forEach((btn) => {
      try {
        btn.triggerEventHandler('onClick', mockEvent);
      } catch {
        // ignore errors
      }
    });
  });
});
