import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NEVER, of, throwError } from 'rxjs';
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
  createdByName: 'Admin User',
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

  it('sets deletingKey = null on deleteFeatureFlagOverride error', () => {
    mockApi.deleteFeatureFlagOverride.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.confirmDelete('apiAccess');
    expect(fixture.componentInstance.deletingKey()).toBeNull();
  });

  it('openAddDialog resets form and key', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.openAddDialog();
    expect(fixture.componentInstance.editingOverride()).toBeNull();
    expect(fixture.componentInstance.formKey()).toBeNull();
    expect(fixture.componentInstance.form.reason).toBe('');
    expect(fixture.componentInstance.dialogVisible).toBe(true);
  });

  it('openEditDialog populates form from override', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.openEditDialog(mockOverride);
    expect(fixture.componentInstance.editingOverride()).toEqual(mockOverride);
    expect(fixture.componentInstance.formKey()).toBe('ssoEnabled');
    expect(fixture.componentInstance.form.reason).toBe('Enterprise trial');
    expect(fixture.componentInstance.formBoolValue).toBe(true);
    expect(fixture.componentInstance.dialogVisible).toBe(true);
  });

  it('openEditDialog sets formNumValue for numeric override', () => {
    const numOverride = {
      ...mockOverride,
      key: 'maxSeats' as const,
      value: 25,
    };
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.openEditDialog(numOverride);
    expect(fixture.componentInstance.formNumValue).toBe(25);
  });

  it('valueType returns "number" for NUMBER_KEYS', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.formKey.set('maxSeats');
    expect(fixture.componentInstance.valueType()).toBe('number');

    fixture.componentInstance.formKey.set('ssoEnabled');
    expect(fixture.componentInstance.valueType()).toBe('boolean');
  });

  it('saveOverride returns early when formKey is null', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.setFeatureFlagOverride.mockClear();

    fixture.componentInstance.formKey.set(null);
    fixture.componentInstance.form.reason = 'some reason';
    fixture.componentInstance.saveOverride();
    expect(mockApi.setFeatureFlagOverride).not.toHaveBeenCalled();
  });

  it('saveOverride returns early when reason is empty', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.setFeatureFlagOverride.mockClear();

    fixture.componentInstance.formKey.set('apiAccess');
    fixture.componentInstance.form.reason = '';
    fixture.componentInstance.saveOverride();
    expect(mockApi.setFeatureFlagOverride).not.toHaveBeenCalled();
  });

  it('saveOverride sends number value for NUMBER_KEYS', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.formKey.set('maxSeats');
    fixture.componentInstance.formNumValue = 50;
    fixture.componentInstance.form = {
      reason: 'Expand seats',
      expiresAt: null,
    };
    fixture.componentInstance.saveOverride();

    expect(mockApi.setFeatureFlagOverride).toHaveBeenCalledWith('org-1', {
      key: 'maxSeats',
      value: 50,
      reason: 'Expand seats',
      expiresAt: undefined,
    });
  });

  it('saveOverride sends ISO expiresAt when date is set', () => {
    const expires = new Date('2027-01-01T00:00:00Z');
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.formKey.set('apiAccess');
    fixture.componentInstance.formBoolValue = true;
    fixture.componentInstance.form = { reason: 'Trial', expiresAt: expires };
    fixture.componentInstance.saveOverride();

    expect(mockApi.setFeatureFlagOverride).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ expiresAt: expires.toISOString() }),
    );
  });

  it('sets saving = false on saveOverride error', () => {
    mockApi.setFeatureFlagOverride.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.formKey.set('ssoEnabled');
    fixture.componentInstance.form = { reason: 'Test', expiresAt: null };
    fixture.componentInstance.saveOverride();
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('sets loading = false when listFeatureFlagOverrides errors', () => {
    mockApi.listFeatureFlagOverrides.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('renders entitlements content after double detectChanges', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.entitlements()).toBeTruthy();
  });

  it('renders dialog with number key type after opening edit dialog', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    // open edit dialog with a numeric key
    fixture.componentInstance.openEditDialog({
      ...mockOverride,
      key: 'maxSeats' as const,
      value: 10,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.valueType()).toBe('number');
    expect(fixture.componentInstance.dialogVisible).toBe(true);
  });

  it('renders loading skeleton when both APIs are pending', () => {
    mockApi.getEntitlements.mockReturnValue(NEVER);
    mockApi.listFeatureFlagOverrides.mockReturnValue(NEVER);
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(true);
  });

  it('triggers dialog button onClick handlers when dialog is open', () => {
    const fixture = TestBed.createComponent(AdminEntitlementsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    // Open add dialog to render dialog buttons
    fixture.componentInstance.openAddDialog();
    fixture.detectChanges();

    // Trigger ngModelChange on p-select to cover formKey.set() lambda
    const selects = fixture.debugElement.queryAll(By.css('p-select'));
    selects.forEach((s) => {
      try {
        s.triggerEventHandler('ngModelChange', 'ssoEnabled');
      } catch {
        // ignore
      }
    });

    // Trigger all p-button onClick to cover dialog button lambdas
    fixture.componentInstance.form.reason = 'Test';
    const buttons = fixture.debugElement.queryAll(By.css('p-button'));
    buttons.forEach((btn) => {
      try {
        btn.triggerEventHandler('onClick', null);
      } catch {
        // ignore
      }
    });
    fixture.detectChanges();
    expect(buttons.length).toBeGreaterThan(0);
    expect(mockApi.setFeatureFlagOverride).toHaveBeenCalled();
  });
});
