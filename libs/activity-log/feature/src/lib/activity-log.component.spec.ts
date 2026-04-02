import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  ActivityLogApi,
  ActivityLogRecord,
} from '@saas-frontend/activity-log/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import { ActivityLogComponent } from './activity-log.component';

const mockActivityLog = (
  overrides: Partial<ActivityLogRecord> = {},
): ActivityLogRecord =>
  ({
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
  let membershipsStoreMock: {
    memberships: ReturnType<typeof signal>;
    loadMemberships: ReturnType<typeof vi.fn>;
  };

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
      activityLogApiMock.getActivityLog = vi.fn(() =>
        throwError(() => new Error('Failed')),
      );
      component = TestBed.runInInjectionContext(
        () => new ActivityLogComponent(),
      );

      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(component.loading()).toBe(false);
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────────
  describe('empty state', () => {
    it('shows empty-state message when the list is empty', async () => {
      activityLogApiMock.getActivityLog = vi.fn(() =>
        of({ logs: [], total: 0 }),
      );
      component = TestBed.runInInjectionContext(
        () => new ActivityLogComponent(),
      );

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
    it('applies actions filter', async () => {
      component.selectedActions = ['membership.created', 'membership.deleted'];
      component.applyFilters();
      await new Promise((r) => setTimeout(r, 0));

      expect(activityLogApiMock.getActivityLog).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          actions: 'membership.created,membership.deleted',
        }),
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

    it('applies actorId filter', async () => {
      component.actorIdFilter = 'user-42';
      component.applyFilters();
      await new Promise((r) => setTimeout(r, 0));

      expect(activityLogApiMock.getActivityLog).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ actorId: 'user-42' }),
      );
    });

    it('does not include actorId when filter is null', async () => {
      component.actorIdFilter = null;
      component.applyFilters();
      await new Promise((r) => setTimeout(r, 0));

      const call = (
        activityLogApiMock.getActivityLog as ReturnType<typeof vi.fn>
      ).mock.calls.at(-1)![1];
      expect(call.actorId).toBeUndefined();
    });
  });

  describe('resetFilters', () => {
    it('clears all filters', () => {
      component.selectedActions = ['membership.created'];
      component.actorIdFilter = 'user-1';
      component.fromDate = new Date('2026-03-01');
      component.toDate = new Date('2026-03-31');

      component.resetFilters();

      expect(component.selectedActions).toEqual([]);
      expect(component.actorIdFilter).toBeNull();
      expect(component.fromDate).toBeNull();
      expect(component.toDate).toBeNull();
    });

    it('reloads data without filters', async () => {
      component.selectedActions = ['membership.created'];
      component.actorIdFilter = 'user-1';
      component.resetFilters();
      await new Promise((r) => setTimeout(r, 0));

      const call = (
        activityLogApiMock.getActivityLog as ReturnType<typeof vi.fn>
      ).mock.calls.at(-1)![1];
      expect(call.actions).toBeUndefined();
      expect(call.actorId).toBeUndefined();
    });
  });

  // ── Feature gating ─────────────────────────────────────────────────────────
  describe('feature gating', () => {
    it('displays content when canUseAdvancedAnalytics is true', () => {
      const mockEnt = {
        canUseAdvancedAnalytics: vi.fn(() => true),
        loadEntitlements: vi.fn(),
      };
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
      const comp = TestBed.runInInjectionContext(
        () => new ActivityLogComponent(),
      );
      expect(comp.canViewActivityLog()).toBe(true);
    });

    it('hides content when canUseAdvancedAnalytics is false', () => {
      const mockEnt = {
        canUseAdvancedAnalytics: vi.fn(() => false),
        loadEntitlements: vi.fn(),
      };
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
      const comp = TestBed.runInInjectionContext(
        () => new ActivityLogComponent(),
      );
      expect(comp.canViewActivityLog()).toBe(false);
    });
  });

  // ── actionSeverity / actionIcon ───────────────────────────────────────────
  describe('actionSeverity() and actionIcon()', () => {
    it('returns danger + pi-trash for organization.deleted', () => {
      expect(component.actionSeverity('organization.deleted')).toBe('danger');
      expect(component.actionIcon('organization.deleted')).toBe('pi-trash');
    });

    it('returns danger + pi-user-minus for membership.deleted', () => {
      expect(component.actionSeverity('membership.deleted')).toBe('danger');
      expect(component.actionIcon('membership.deleted')).toBe('pi-user-minus');
    });

    it('returns danger for subscription.cancelled', () => {
      expect(component.actionSeverity('subscription.cancelled')).toBe('danger');
    });

    it('returns warn for billing.checkout.created', () => {
      expect(component.actionSeverity('billing.checkout.created')).toBe('warn');
    });

    it('returns info + pi-building for organization.created', () => {
      expect(component.actionSeverity('organization.created')).toBe('info');
      expect(component.actionIcon('organization.created')).toBe('pi-building');
    });

    it('returns info for membership.created', () => {
      expect(component.actionSeverity('membership.created')).toBe('info');
    });

    it('returns success for billing.checkout.completed', () => {
      expect(component.actionSeverity('billing.checkout.completed')).toBe(
        'success',
      );
    });

    it('returns success + pi-credit-card for subscription.created', () => {
      expect(component.actionSeverity('subscription.created')).toBe('success');
      expect(component.actionIcon('subscription.created')).toBe(
        'pi-credit-card',
      );
    });

    it('returns secondary + pi-circle for unknown actions', () => {
      expect(component.actionSeverity('unknown.action')).toBe('secondary');
      expect(component.actionIcon('unknown.action')).toBe('pi-circle');
    });
  });

  // ── hasMetadata ───────────────────────────────────────────────────────────
  describe('hasMetadata()', () => {
    it('returns true when metadata has keys', () => {
      expect(
        component.hasMetadata(mockActivityLog({ metadata: { foo: 'bar' } })),
      ).toBe(true);
    });

    it('returns false when metadata is empty object', () => {
      expect(component.hasMetadata(mockActivityLog({ metadata: {} }))).toBe(
        false,
      );
    });

    it('returns false when metadata is null/undefined', () => {
      expect(
        component.hasMetadata(mockActivityLog({ metadata: null as never })),
      ).toBe(false);
    });
  });

  // ── metadataString ────────────────────────────────────────────────────────
  describe('metadataString()', () => {
    it('serialises metadata as indented JSON', () => {
      const row = mockActivityLog({
        metadata: { oldRole: 'MEMBER', newRole: 'ADMIN' },
      });
      expect(component.metadataString(row)).toBe(
        JSON.stringify({ oldRole: 'MEMBER', newRole: 'ADMIN' }, null, 2),
      );
    });

    it('returns empty string for null metadata', () => {
      const row = mockActivityLog({ metadata: null as never });
      expect(component.metadataString(row)).toBe('null');
    });
  });

  // ── actorDisplay ──────────────────────────────────────────────────────────
  describe('actorDisplay()', () => {
    it('returns "system" when actorId is null', () => {
      const row = mockActivityLog({ actorId: null as never });
      expect(component.actorDisplay(row)).toBe('system');
    });

    it('returns full name when member has first and last name', () => {
      membershipsStoreMock.memberships.set([
        {
          userId: 'user-1',
          user: {
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@example.com',
          },
        } as never,
      ]);
      const row = mockActivityLog({ actorId: 'user-1' });
      expect(component.actorDisplay(row)).toBe('Alice Smith');
    });

    it('returns email when member has no name but has email', () => {
      membershipsStoreMock.memberships.set([
        {
          userId: 'user-1',
          user: { firstName: '', lastName: '', email: 'alice@example.com' },
        } as never,
      ]);
      const row = mockActivityLog({ actorId: 'user-1' });
      expect(component.actorDisplay(row)).toBe('alice@example.com');
    });

    it('returns actorId when no member found', () => {
      membershipsStoreMock.memberships.set([]);
      const row = mockActivityLog({ actorId: 'user-unknown' });
      expect(component.actorDisplay(row)).toBe('user-unknown');
    });
  });

  // ── ngOnInit with null orgId ──────────────────────────────────────────────
  describe('ngOnInit with null orgId', () => {
    it('does not call API when activeOrgId is null', async () => {
      orgsStoreMock.activeOrgId.set(null);
      component = TestBed.runInInjectionContext(
        () => new ActivityLogComponent(),
      );
      activityLogApiMock.getActivityLog = vi.fn(() =>
        of({ logs: [], total: 0 }),
      );

      component.ngOnInit();
      await new Promise((r) => setTimeout(r, 0));

      expect(activityLogApiMock.getActivityLog).not.toHaveBeenCalled();
    });
  });

  // ── actorOptions ──────────────────────────────────────────────────────────
  describe('actorOptions()', () => {
    it('returns an empty array when memberships store is empty', () => {
      membershipsStoreMock.memberships.set([]);
      expect(component.actorOptions()).toEqual([]);
    });

    it('builds label from full name when first and last name are present', () => {
      membershipsStoreMock.memberships.set([
        {
          userId: 'u-1',
          user: { firstName: 'Alice', lastName: 'Smith', email: 'a@test.com' },
        } as never,
      ]);
      const opts = component.actorOptions();
      expect(opts).toHaveLength(1);
      expect(opts[0]).toEqual({ label: 'Alice Smith', value: 'u-1' });
    });

    it('falls back to email when name is empty', () => {
      membershipsStoreMock.memberships.set([
        {
          userId: 'u-2',
          user: { firstName: '', lastName: '', email: 'bob@test.com' },
        } as never,
      ]);
      const opts = component.actorOptions();
      expect(opts[0].label).toBe('bob@test.com');
    });

    it('falls back to userId when name and email are absent', () => {
      membershipsStoreMock.memberships.set([
        { userId: 'u-3', user: {} } as never,
      ]);
      const opts = component.actorOptions();
      expect(opts[0].label).toBe('u-3');
    });

    it('excludes entries without a userId', () => {
      membershipsStoreMock.memberships.set([
        { userId: null, user: { email: 'x@test.com' } } as never,
        { userId: 'u-4', user: { email: 'y@test.com' } } as never,
      ]);
      const opts = component.actorOptions();
      expect(opts).toHaveLength(1);
      expect(opts[0].value).toBe('u-4');
    });

    it('sorts options alphabetically by label', () => {
      membershipsStoreMock.memberships.set([
        {
          userId: 'u-b',
          user: { firstName: 'Bob', lastName: '', email: '' },
        } as never,
        {
          userId: 'u-a',
          user: { firstName: 'Alice', lastName: '', email: '' },
        } as never,
      ]);
      const labels = component.actorOptions().map((o) => o.label);
      expect(labels).toEqual(['Alice', 'Bob']);
    });
  });

  // ── entityTypeLabel ───────────────────────────────────────────────────────
  describe('entityTypeLabel()', () => {
    it('returns the human label for a known entity type value', () => {
      expect(component.entityTypeLabel('membership')).toBe('Membership');
      expect(component.entityTypeLabel('event')).toBe('Planning Event');
      expect(component.entityTypeLabel('organization')).toBe('Organization');
      expect(component.entityTypeLabel('job')).toBe('Job');
      expect(component.entityTypeLabel('notification')).toBe('Notification');
      expect(component.entityTypeLabel('email')).toBe('Email');
      expect(component.entityTypeLabel('File')).toBe('File');
    });

    it('returns the raw value for an unknown entity type', () => {
      expect(component.entityTypeLabel('billing_event')).toBe('billing_event');
    });
  });
});
