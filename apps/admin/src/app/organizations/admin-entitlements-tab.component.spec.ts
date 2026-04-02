import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminEntitlementsTabComponent } from './admin-entitlements-tab.component';
import {
  AdminApi,
  EntitlementOverride,
  OrganizationEntitlements,
} from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { MessageService } from 'primeng/api';

const mockEntitlements: OrganizationEntitlements = {
  organizationId: 'org-1',
  plan: 'FREE',
  subscriptionStatus: 'NONE',
  advancedAnalytics: false,
  customReports: false,
  apiAccess: false,
  ssoEnabled: false,
  prioritySupport: false,
  maxSeats: 5,
  storageLimitBytes: 1073741824,
};

const mockOverride: EntitlementOverride = {
  id: 'ov-1',
  orgId: 'org-1',
  key: 'ssoEnabled',
  value: true,
  reason: 'Enterprise trial',
  expiresAt: null,
  createdBy: 'admin-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockApi = {
  getEntitlements: vi.fn(() => of(mockEntitlements)),
  listFeatureFlagOverrides: vi.fn(() => of([mockOverride])),
  setFeatureFlagOverride: vi.fn(() => of(mockOverride)),
  deleteFeatureFlagOverride: vi.fn(() => of(undefined)),
};

describe('AdminEntitlementsTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminEntitlementsTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
        MessageService,
      ],
    }).compileComponents();
  });

  it('loads entitlements and overrides on init', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    expect(mockApi.getEntitlements).toHaveBeenCalledWith('org-1');
    expect(mockApi.listFeatureFlagOverrides).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance.entitlements()).toEqual(mockEntitlements);
    expect(fixture.componentInstance.overrides()).toEqual([mockOverride]);
  });

  it('reflects loading = false after both calls resolve', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('detects override for a key that has one', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.hasOverride('ssoEnabled')).toBe(true);
    expect(fixture.componentInstance.hasOverride('apiAccess')).toBe(false);
  });

  it('sets loading = false even when getEntitlements errors', () => {
    mockApi.getEntitlements.mockReturnValueOnce(
      throwError(() => new Error('Network error')),
    );
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('calls setFeatureFlagOverride and reloads on saveOverride', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.form = {
      reason: 'Test reason',
      expiresAt: null,
    };
    fixture.componentInstance.formKey.set('ssoEnabled');
    fixture.componentInstance.formBoolValue = true;
    fixture.componentInstance.saveOverride();

    expect(mockApi.setFeatureFlagOverride).toHaveBeenCalledWith('org-1', {
      key: 'ssoEnabled',
      value: true,
      reason: 'Test reason',
      expiresAt: undefined,
    });
  });

  it('calls deleteFeatureFlagOverride and reloads on confirmDelete', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.confirmDelete('ssoEnabled');
    expect(mockApi.deleteFeatureFlagOverride).toHaveBeenCalledWith(
      'org-1',
      'ssoEnabled',
    );
  });
});
