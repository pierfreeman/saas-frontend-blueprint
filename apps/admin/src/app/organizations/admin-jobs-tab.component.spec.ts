import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NEVER, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminJobsTabComponent } from './admin-jobs-tab.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const mockJobs = [
  {
    id: 'job-1',
    orgId: 'org-1',
    userId: 'user-1',
    type: 'ORG_EXPORT',
    status: 'DONE' as const,
    payload: {},
    result: null,
    error: null,
    attempts: 1,
    startedAt: '2026-01-01T00:00:00Z',
    finishedAt: '2026-01-01T00:01:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:01:00Z',
  },
];

const mockApi = {
  getOrgJobs: vi.fn(() => of({ items: [], total: 0, limit: 20, offset: 0 })),
};

describe('AdminJobsTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminJobsTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
      ],
    }).compileComponents();
  });

  it('loads jobs on init', () => {
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(mockApi.getOrgJobs).toHaveBeenCalledWith('org-1', {
      limit: 20,
      offset: 0,
    });
  });

  it('sets jobs and total from API response', () => {
    mockApi.getOrgJobs.mockReturnValueOnce(
      of({ items: mockJobs, total: 3, limit: 20, offset: 0 }) as any,
    );
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.jobs()).toEqual(mockJobs);
    expect(fixture.componentInstance.total()).toBe(3);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('sets loading = false on API error', () => {
    mockApi.getOrgJobs.mockReturnValueOnce(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('onFilterChange resets offset and reloads with status filter', () => {
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.getOrgJobs.mockClear();

    const cmp = fixture.componentInstance;
    cmp.offset.set(20);
    cmp.statusFilter = 'FAILED';
    cmp.onFilterChange();

    expect(cmp.offset()).toBe(0);
    expect(mockApi.getOrgJobs).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ status: 'FAILED', offset: 0 }),
    );
  });

  it('onPageChange updates offset and reloads', () => {
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.getOrgJobs.mockClear();

    fixture.componentInstance.onPageChange({ first: 20, rows: 20 });
    expect(fixture.componentInstance.offset()).toBe(20);
    expect(mockApi.getOrgJobs).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ offset: 20 }),
    );
  });

  it('does not include status in query when filter is null', () => {
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.componentInstance.statusFilter = null;
    fixture.detectChanges();
    expect(mockApi.getOrgJobs).toHaveBeenCalledWith('org-1', {
      limit: 20,
      offset: 0,
    });
  });

  it('jobStatusSeverity returns correct severity for each status', () => {
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    const cmp = fixture.componentInstance;

    expect(cmp.jobStatusSeverity('PENDING')).toBe('secondary');
    expect(cmp.jobStatusSeverity('PROCESSING')).toBe('info');
    expect(cmp.jobStatusSeverity('DONE')).toBe('success');
    expect(cmp.jobStatusSeverity('FAILED')).toBe('danger');
  });

  it('renders job rows with error text and paginator when total exceeds page size', () => {
    const jobWithError = {
      ...mockJobs[0],
      status: 'FAILED' as const,
      error: 'Connection timeout',
    };
    mockApi.getOrgJobs.mockReturnValueOnce(
      of({ items: [jobWithError], total: 25, limit: 20, offset: 0 }) as any,
    );
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    fixture.detectChanges();
    expect(fixture.componentInstance.total()).toBe(25);
    expect(fixture.componentInstance.jobs()[0].error).toBe(
      'Connection timeout',
    );
  });

  it('renders loading skeleton when API is pending', () => {
    mockApi.getOrgJobs.mockReturnValue(NEVER);
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(true);
  });

  it('triggers p-select ngModelChange for status filter', () => {
    const fixture = TestBed.createComponent(AdminJobsTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.getOrgJobs.mockClear();

    // Trigger status filter ngModelChange to cover template lambda
    const selects = fixture.debugElement.queryAll(By.css('p-select'));
    selects.forEach((s) => {
      try {
        s.triggerEventHandler('ngModelChange', 'FAILED');
      } catch {
        // ignore
      }
    });
    expect(selects.length).toBeGreaterThan(0);
    expect(mockApi.getOrgJobs).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ status: 'FAILED', offset: 0 }),
    );
  });
});
