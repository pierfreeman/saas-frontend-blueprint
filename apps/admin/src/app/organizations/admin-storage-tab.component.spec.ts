import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminStorageTabComponent } from './admin-storage-tab.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const mockApi = {
  getOrgStorageStats: vi.fn(() => of({ totalBytes: '5242880', fileCount: 3 })),
};

describe('AdminStorageTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminStorageTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
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
});
