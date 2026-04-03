import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminActivityTabComponent } from './admin-activity-tab.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const mockLogs = [
  {
    id: 'l-1',
    orgId: 'org-1',
    action: 'membership.created',
    entityType: 'membership',
    entityId: 'm-1',
    actorId: 'u-1',
    actorRole: 'ADMIN',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const mockApi = {
  getOrgActivity: vi.fn(() => of({ logs: [], total: 0, limit: 20, offset: 0 })),
};

describe('AdminActivityTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminActivityTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
      ],
    }).compileComponents();
  });

  it('loads activity on init', () => {
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(mockApi.getOrgActivity).toHaveBeenCalledWith('org-1', {
      limit: 20,
      offset: 0,
    });
  });

  it('sets logs and total from API response', () => {
    mockApi.getOrgActivity.mockReturnValueOnce(
      of({ logs: mockLogs, total: 5, limit: 20, offset: 0 }) as any,
    );
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.logs()).toEqual(mockLogs);
    expect(fixture.componentInstance.total()).toBe(5);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('sets loading = false on API error', () => {
    mockApi.getOrgActivity.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('onFilterChange resets offset and reloads with action filter', () => {
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.getOrgActivity.mockClear();

    const cmp = fixture.componentInstance;
    cmp.offset.set(20);
    cmp.actionFilter = 'membership.created';
    cmp.onFilterChange();

    expect(cmp.offset()).toBe(0);
    expect(mockApi.getOrgActivity).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ action: 'membership.created', offset: 0 }),
    );
  });

  it('onPageChange updates offset and reloads', () => {
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.getOrgActivity.mockClear();

    fixture.componentInstance.onPageChange({ first: 20, rows: 20 });
    expect(fixture.componentInstance.offset()).toBe(20);
    expect(mockApi.getOrgActivity).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ offset: 20 }),
    );
  });

  it('onPageChange defaults first to 0 when undefined', () => {
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.getOrgActivity.mockClear();

    fixture.componentInstance.onPageChange({});
    expect(fixture.componentInstance.offset()).toBe(0);
  });

  it('ngModelChange on action filter input triggers onFilterChange', () => {
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.getOrgActivity.mockClear();

    // Template uses native <input pInputText> (not p-inputtext component)
    const inputs = fixture.debugElement.queryAll(By.css('input'));
    inputs.forEach((el) =>
      el.triggerEventHandler('ngModelChange', 'membership.created'),
    );
    expect(mockApi.getOrgActivity).toHaveBeenCalled();
  });

  it('paginator onPageChange listener fires when total exceeds limit', () => {
    mockApi.getOrgActivity.mockReturnValue(
      of({ logs: mockLogs, total: 50, limit: 20, offset: 0 }) as any,
    );
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    mockApi.getOrgActivity.mockClear();

    const paginator = fixture.debugElement.query(By.css('p-paginator'));
    paginator?.triggerEventHandler('onPageChange', { first: 20, rows: 20 });
    expect(fixture.componentInstance.offset()).toBe(20);
  });
});
