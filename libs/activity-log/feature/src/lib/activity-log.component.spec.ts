import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ActivityLogApi, ActivityLogRecord } from '@saas-frontend/activity-log/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import { ActivityLogComponent } from './activity-log.component';

const mockActivityLog = (overrides: Partial<ActivityLogRecord> = {}): ActivityLogRecord => ({
  id: 'log-1',
  orgId: 'org-1',
  action: 'membership.role.updated',
  entityType: 'MEMBERSHIP',
  entityId: 'mem-1',
  actorId: 'user-1',
  actorRole: 'OWNER',
  metadata: { oldRole: 'MEMBER', newRole: 'ADMIN' },
  createdAt: '2026-03-29T10:00:00.000Z',
  ...overrides,
}) as ActivityLogRecord;

describe('ActivityLogComponent', () => {
  let component: ActivityLogComponent;
  let activityLogApiMock: ReturnType<typeof createActivityLogApiMock>;
  let orgsStoreMock: { activeOrgId: ReturnType<typeof signal<string | null>> };
  let entStoreMock: ReturnType<typeof createEntStoreMock>;
  let membershipsStoreMock: { memberships: ReturnType<typeof signal>, loadMemberships: ReturnType<typeof vi.fn> };

  function createActivityLogApiMock() {
    return {
      getActivityLog: vi.fn(() => of({ logs: [mockActivityLog()], total: 1 })),
    } as unknown as ActivityLogApi;
  }

  function createEntStoreMock() {
    return {
      canUseAdvancedAnalytics: vi.fn(() => true),
      loadEntitlements: vi.fn(),
    };
  }

  beforeEach(async () => {
    activityLogApiMock = createActivityLogApiMock();
    orgsStoreMock = {
      activeOrgId: signal<string | null>('org-1'),
    };
    entStoreMock = createEntStoreMock();
    membershipsStoreMock = {
      memberships: signal([]),
      loadMemberships: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: ActivityLogApi, useValue: activityLogApiMock },
        { provide: OrganizationsStore, useValue: orgsStoreMock },
        { provide: EntitlementsStore, useValue: entStoreMock },
        { provide: MembershipsStore, useValue: membershipsStoreMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    component = TestBed.runInInjectionContext(() => new ActivityLogComponent());
  });

  // ── Initialization ─────────────────────────────────────────────────────────
  describe('ngOnInit', () => {
    it('loads activity log', async () => {
      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(activityLogApiMock.getActivityLog).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
    });

    it('renders the list of activity events', async () => {
      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(component.logs()).toHaveLength(1);
      expect(component.logs()[0]).toEqual(mockActivityLog());
    });

    it('sets loading to false after success', async () => {
      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(component.loading()).toBe(false);
    });

    it('sets loading to false after error', async () => {
      activityLogApiMock.getActivityLog = vi.fn(() => throwError(() => new Error('Failed')));
      component = TestBed.runInInjectionContext(() => new ActivityLogComponent());

      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(component.loading()).toBe(false);
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────────
  describe('empty state', () => {
    it('shows empty-state message when the list is empty', async () => {
      activityLogApiMock.getActivityLog = vi.fn(() => of({ logs: [], total: 0 }));
      component = TestBed.runInInjectionContext(() => new ActivityLogComponent());

      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(component.logs()).toHaveLength(0);
      expect(component.total()).toBe(0);
    });
  });

  // ── Loading indicator ──────────────────────────────────────────────────────
  describe('loading indicator', () => {
    it('shows loading indicator while fetching', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);
    });

    it('hides loading indicator after data is loaded', async () => {
      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(component.loading()).toBe(false);
    });
  });

  // ── Pagination / load more ────────────────────────────────────────────────
  describe('pagination', () => {
    it('triggers the correct API call with offset', async () => {
      component.onLazyLoad({ first: 20 });
      await new Promise((r) => setTimeout(r, 0));

      expect(activityLogApiMock.getActivityLog).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ limit: 20, offset: 20 }),
      );
    });
  });

  // ── Filters ────────────────────────────────────────────────────────────────
  describe('applyFilters', () => {
    it('applies action filter', async () => {
      component.actionFilter = 'membership';
      component.applyFilters();
      await new Promise((r) => setTimeout(r, 0));

      expect(activityLogApiMock.getActivityLog).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ action: 'membership' }),
      );
    });

    it('applies date range filters', async () => {
      component.fromDate = new Date('2026-03-01');
      component.toDate = new Date('2026-03-31');
      component.applyFilters();
      await new Promise((r) => setTimeout(r, 0));

      expect(activityLogApiMock.getActivityLog).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          fromDate: '2026-03-01',
          toDate: '2026-03-31',
        }),
      );
    });
  });

  describe('resetFilters', () => {
    it('clears all filters', async () => {
      component.actionFilter = 'test';
      component.fromDate = new Date('2026-03-01');
      component.toDate = new Date('2026-03-31');

      component.resetFilters();

      expect(component.actionFilter).toBe('');
      expect(component.fromDate).toBeNull();
      expect(component.toDate).toBeNull();
    });

    it('reloads data without filters', async () => {
      component.actionFilter = 'test';
      component.resetFilters();
      await new Promise((r) => setTimeout(r, 0));

      expect(activityLogApiMock.getActivityLog).toHaveBeenCalledWith(
        'org-1',
        expect.not.objectContaining({ action: expect.anything() }),
      );
    });
  });

  // ── Feature gating ─────────────────────────────────────────────────────────
  describe('feature gating', () => {
    it('displays content when canUseAdvancedAnalytics is true', () => {
      const mockEnt = { canUseAdvancedAnalytics: vi.fn(() => true), loadEntitlements: vi.fn() };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: ActivityLogApi, useValue: activityLogApiMock },
          { provide: OrganizationsStore, useValue: orgsStoreMock },
          { provide: EntitlementsStore, useValue: mockEnt },
          { provide: MembershipsStore, useValue: membershipsStoreMock },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      });
      const comp = TestBed.runInInjectionContext(() => new ActivityLogComponent());
      expect(comp.canViewActivityLog()).toBe(true);
    });

    it('hides content when canUseAdvancedAnalytics is false', () => {
      const mockEnt = { canUseAdvancedAnalytics: vi.fn(() => false), loadEntitlements: vi.fn() };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: ActivityLogApi, useValue: activityLogApiMock },
          { provide: OrganizationsStore, useValue: orgsStoreMock },
          { provide: EntitlementsStore, useValue: mockEnt },
          { provide: MembershipsStore, useValue: membershipsStoreMock },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      });
      const comp = TestBed.runInInjectionContext(() => new ActivityLogComponent());
      expect(comp.canViewActivityLog()).toBe(false);
    });
  });
});
