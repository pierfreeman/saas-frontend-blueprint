import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminExportsTabComponent } from './admin-exports-tab.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const mockExports = [
  {
    id: 'export-1',
    orgId: 'org-1',
    jobId: 'job-1',
    requestedByUserId: 'user-1',
    status: 'COMPLETED' as const,
    fileUrl: 'https://s3.example.com/export-1.zip',
    fileSize: '102400',
    expiresAt: '2026-02-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T00:01:00Z',
    failedAt: null,
    error: null,
  },
];

const mockApi = {
  listOrgExports: vi.fn(() =>
    of({ items: [], total: 0, limit: 10, offset: 0 }),
  ),
  triggerExport: vi.fn(() => of({ exportId: 'export-new' })),
};

describe('AdminExportsTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminExportsTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
      ],
    }).compileComponents();
  });

  it('loads exports on init', () => {
    const fixture = TestBed.createComponent(AdminExportsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(mockApi.listOrgExports).toHaveBeenCalledWith('org-1', {
      limit: 10,
      offset: 0,
    });
  });

  it('sets exports and total from API response', () => {
    mockApi.listOrgExports.mockReturnValueOnce(
      of({ items: mockExports, total: 1, limit: 10, offset: 0 }) as any,
    );
    const fixture = TestBed.createComponent(AdminExportsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.exports()).toEqual(mockExports);
    expect(fixture.componentInstance.total()).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('sets loading = false on API error', () => {
    mockApi.listOrgExports.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminExportsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('onPageChange updates offset and reloads', () => {
    const fixture = TestBed.createComponent(AdminExportsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.listOrgExports.mockClear();

    fixture.componentInstance.onPageChange({ first: 10, rows: 10 });
    expect(fixture.componentInstance.offset()).toBe(10);
    expect(mockApi.listOrgExports).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ offset: 10 }),
    );
  });

  it('triggerExport calls API and reloads list', () => {
    const fixture = TestBed.createComponent(AdminExportsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.listOrgExports.mockClear();

    fixture.componentInstance.triggerExport();
    expect(mockApi.triggerExport).toHaveBeenCalledWith('org-1');
    expect(mockApi.listOrgExports).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ offset: 0 }),
    );
  });

  it('triggerExport sets triggering = false on error', () => {
    mockApi.triggerExport.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminExportsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();

    fixture.componentInstance.triggerExport();
    expect(fixture.componentInstance.triggering()).toBe(false);
  });
});
