import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
});
