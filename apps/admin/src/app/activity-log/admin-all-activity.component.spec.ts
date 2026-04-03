import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminAllActivityComponent } from './admin-all-activity.component';
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
  getAllActivity: vi.fn(() => of({ logs: [], total: 0, limit: 30, offset: 0 })),
};

describe('AdminAllActivityComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [AdminAllActivityComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.useRealTimers());

  it('loads all activity on init', () => {
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    expect(mockApi.getAllActivity).toHaveBeenCalledWith({
      limit: 30,
      offset: 0,
    });
  });

  it('sets logs and total signals from API response', () => {
    mockApi.getAllActivity.mockReturnValueOnce(
      of({ logs: mockLogs, total: 42, limit: 30, offset: 0 }) as any,
    );
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.logs()).toEqual(mockLogs);
    expect(fixture.componentInstance.total()).toBe(42);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('sets loading = false on API error', () => {
    mockApi.getAllActivity.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('onFilterChange debounces and reloads with orgId filter', () => {
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    mockApi.getAllActivity.mockClear();

    const cmp = fixture.componentInstance;
    cmp.orgIdFilter = 'org-99';
    cmp.onFilterChange();
    expect(mockApi.getAllActivity).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(mockApi.getAllActivity).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-99', offset: 0 }),
    );
  });

  it('onFilterChange debounces and reloads with action filter', () => {
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    mockApi.getAllActivity.mockClear();

    const cmp = fixture.componentInstance;
    cmp.actionFilter = 'membership.created';
    cmp.onFilterChange();
    vi.runAllTimers();
    expect(mockApi.getAllActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'membership.created' }),
    );
  });

  it('onPageChange updates offset and reloads', () => {
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    mockApi.getAllActivity.mockClear();

    fixture.componentInstance.onPageChange({ first: 30, rows: 30 });
    expect(fixture.componentInstance.offset()).toBe(30);
    expect(mockApi.getAllActivity).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 30 }),
    );
  });

  it('onPageChange defaults first to 0 when undefined', () => {
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    mockApi.getAllActivity.mockClear();

    fixture.componentInstance.onPageChange({});
    expect(fixture.componentInstance.offset()).toBe(0);
  });

  it('ngModelChange on filter inputs triggers onFilterChange', () => {
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    mockApi.getAllActivity.mockClear();

    // Template uses native <input pInputText> elements (not p-inputtext component)
    const inputs = fixture.debugElement.queryAll(By.css('input'));
    inputs.forEach((el) => el.triggerEventHandler('ngModelChange', 'test'));
    vi.runAllTimers();
    expect(mockApi.getAllActivity).toHaveBeenCalled();
  });

  it('paginator onPageChange listener fires when total exceeds PAGE_SIZE', () => {
    mockApi.getAllActivity.mockReturnValue(
      of({ logs: mockLogs, total: 100, limit: 30, offset: 0 }) as any,
    );
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    mockApi.getAllActivity.mockClear();

    const paginator = fixture.debugElement.query(By.css('p-paginator'));
    paginator?.triggerEventHandler('onPageChange', { first: 30, rows: 30 });
    expect(fixture.componentInstance.offset()).toBe(30);
    expect(mockApi.getAllActivity).toHaveBeenCalled();
  });
});
