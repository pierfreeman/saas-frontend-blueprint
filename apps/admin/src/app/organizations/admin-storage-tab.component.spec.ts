import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminStorageTabComponent } from './admin-storage-tab.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { MessageService } from 'primeng/api';

const mockApi = {
  getOrgStorageStats: vi.fn(() => of({ totalBytes: '5242880', fileCount: 3 })),
  setFeatureFlagOverride: vi.fn(() => of(undefined)),
};

describe('AdminStorageTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminStorageTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
        MessageService,
      ],
    }).compileComponents();
  });

  it('loads storage stats on init', () => {
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    expect(mockApi.getOrgStorageStats).toHaveBeenCalledWith('org-1');
  });

  it('sets stats signal after successful load', () => {
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    const comp = fixture.componentInstance;
    comp.orgId = 'org-1';
    fixture.detectChanges();

    expect(comp.stats()).toEqual({ totalBytes: '5242880', fileCount: 3 });
    expect(comp.loading()).toBe(false);
    expect(comp.error()).toBeNull();
  });

  it('computes formattedBytes from stats', () => {
    mockApi.getOrgStorageStats.mockReturnValueOnce(
      of({ totalBytes: '1073741824', fileCount: 1 }),
    );
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    // 1 073 741 824 bytes = 1.00 GB
    expect(fixture.componentInstance.formattedBytes()).toBe('1.00 GB');
  });

  it('formats zero bytes correctly', () => {
    mockApi.getOrgStorageStats.mockReturnValueOnce(
      of({ totalBytes: '0', fileCount: 0 }),
    );
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    expect(fixture.componentInstance.formattedBytes()).toBe('0 B');
  });

  it('sets error signal on API failure', () => {
    mockApi.getOrgStorageStats.mockReturnValueOnce(
      throwError(() => new Error('Server error')),
    );
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    const comp = fixture.componentInstance;
    comp.orgId = 'org-1';
    fixture.detectChanges();

    expect(comp.stats()).toBeNull();
    expect(comp.loading()).toBe(false);
    expect(comp.error()).toBe('Failed to load storage stats.');
  });

  it('openQuotaDialog resets form and shows dialog', () => {
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    const comp = fixture.componentInstance;
    comp.orgId = 'org-1';
    fixture.detectChanges();
    comp.quotaGb.set(10);
    comp.quotaReason.set('old reason');

    comp.openQuotaDialog();

    expect(comp.showQuotaDialog()).toBe(true);
    expect(comp.quotaGb()).toBeNull();
    expect(comp.quotaReason()).toBe('');
  });

  it('submitQuota calls setFeatureFlagOverride with bytes and closes dialog', () => {
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    const comp = fixture.componentInstance;
    comp.orgId = 'org-1';
    fixture.detectChanges();

    comp.quotaGb.set(5);
    comp.quotaReason.set('Custom plan');
    comp.showQuotaDialog.set(true);

    comp.submitQuota();

    expect(mockApi.setFeatureFlagOverride).toHaveBeenCalledWith('org-1', {
      key: 'storageLimitBytes',
      value: 5 * 1_073_741_824,
      reason: 'Custom plan',
    });
    expect(comp.showQuotaDialog()).toBe(false);
    expect(comp.savingQuota()).toBe(false);
  });

  it('submitQuota does nothing when gb is null', () => {
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    const comp = fixture.componentInstance;
    comp.orgId = 'org-1';
    fixture.detectChanges();

    comp.quotaGb.set(null);
    comp.quotaReason.set('reason');
    comp.submitQuota();

    expect(mockApi.setFeatureFlagOverride).not.toHaveBeenCalled();
  });

  it('submitQuota sets savingQuota = false on API error', () => {
    mockApi.setFeatureFlagOverride.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminStorageTabComponent);
    const comp = fixture.componentInstance;
    comp.orgId = 'org-1';
    fixture.detectChanges();

    comp.quotaGb.set(5);
    comp.quotaReason.set('reason');
    comp.submitQuota();

    expect(comp.savingQuota()).toBe(false);
  });
});
