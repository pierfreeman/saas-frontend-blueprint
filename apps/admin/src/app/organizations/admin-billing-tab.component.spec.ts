import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminBillingTabComponent } from './admin-billing-tab.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { MessageService } from 'primeng/api';

const mockOverview = {
  orgId: 'org-1',
  stripeCustomerId: 'cus_xxx',
  subscriptionId: 'sub_xxx',
  billingStatus: 'ACTIVE',
  planId: 'PRO',
  subscriptionPeriodStart: null,
  subscriptionPeriodEnd: '2025-01-01T00:00:00Z',
  cancelAtPeriodEnd: false,
  storageLimit: null,
};

const mockApi = {
  getBillingOverview: vi.fn(() => of(mockOverview)),
  getBillingPortalUrl: vi.fn(() =>
    of({ url: 'https://billing.stripe.com/xxx' }),
  ),
};

describe('AdminBillingTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminBillingTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
        MessageService,
      ],
    }).compileComponents();
  });

  it('loads billing overview on init', () => {
    const fixture = TestBed.createComponent(AdminBillingTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(mockApi.getBillingOverview).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance.overview()).toEqual(mockOverview);
  });

  it('sets loading = false and null overview on API error', () => {
    mockApi.getBillingOverview.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminBillingTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.overview()).toBeNull();
  });

  it('billingSeverity returns correct severity for known statuses', () => {
    const fixture = TestBed.createComponent(AdminBillingTabComponent);
    const cmp = fixture.componentInstance;
    expect(cmp.billingSeverity('ACTIVE')).toBe('success');
    expect(cmp.billingSeverity('TRIALING')).toBe('info');
    expect(cmp.billingSeverity('PAST_DUE')).toBe('warn');
    expect(cmp.billingSeverity('UNPAID')).toBe('danger');
    expect(cmp.billingSeverity('CANCELED')).toBe('secondary');
    expect(cmp.billingSeverity('NONE')).toBe('secondary');
  });

  it('openPortal calls getBillingPortalUrl and opens window', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const fixture = TestBed.createComponent(AdminBillingTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.openPortal();
    expect(mockApi.getBillingPortalUrl).toHaveBeenCalledWith(
      'org-1',
      window.location.href,
    );
    expect(openSpy).toHaveBeenCalledWith(
      'https://billing.stripe.com/xxx',
      '_blank',
    );
    expect(fixture.componentInstance.openingPortal()).toBe(false);
    openSpy.mockRestore();
  });

  it('openPortal sets openingPortal = false on error', () => {
    mockApi.getBillingPortalUrl.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminBillingTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.openPortal();
    expect(fixture.componentInstance.openingPortal()).toBe(false);
  });
});
