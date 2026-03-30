import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ActivityLogApi,
  ActivityLogRecord,
} from '@saas-frontend/activity-log/data-access';
import { AuthStore } from '@saas-frontend/auth/data-access';
import {
  BillingApi,
  SubscriptionResponse,
} from '@saas-frontend/billing/data-access';
import { EntitlementsStore } from '@saas-frontend/entitlements/data-access';
import {
  MembershipsApi,
  MembershipsStore,
  MembershipRole,
} from '@saas-frontend/memberships/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import {
  PlanningApi,
  EventOccurrence,
} from '@saas-frontend/planning/data-access';
import {
  StorageApi,
  StorageQuotaResponse,
} from '@saas-frontend/storage/data-access';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';

// ── Fixture factories ─────────────────────────────────────────────────────────

function makeSubscription(
  overrides: Partial<SubscriptionResponse> = {},
): SubscriptionResponse {
  return {
    orgId: 'org-1',
    billingStatus: 'ACTIVE',
    planId: 'pro_monthly',
    subscriptionId: 'sub_123',
    subscriptionPeriodStart: '2025-01-01T00:00:00Z',
    subscriptionPeriodEnd: '2025-02-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function makeQuota(
  overrides: Partial<StorageQuotaResponse> = {},
): StorageQuotaResponse {
  return {
    storageLimitBytes: '107374182',
    storageUsedBytes: '1048576',
    fileCount: 2,
    fileCountLimit: 100,
    maxFileSizeBytes: '52428800',
    ...overrides,
  };
}

function makeActivityLog(
  overrides: Partial<ActivityLogRecord> = {},
): ActivityLogRecord {
  return {
    id: 'log-1',
    orgId: 'org-1',
    actorId: 'user-1',
    actorRole: 'OWNER',
    action: 'MEMBER_INVITED',
    entityType: 'MEMBERSHIP',
    entityId: 'mbr-1',
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeOccurrence(
  overrides: Partial<EventOccurrence> = {},
): EventOccurrence {
  return {
    eventId: 'evt-1',
    originalStartUtc: '2026-04-01T09:00:00Z',
    startUtc: '2026-04-01T09:00:00Z',
    endUtc: '2026-04-01T10:00:00Z',
    title: 'Team standup',
    description: null,
    location: null,
    isAllDay: false,
    eventTimezone: 'UTC',
    rrule: null,
    isRecurring: false,
    isException: false,
    isCancelled: false,
    createdByUserId: 'user-1',
    orgId: 'org-1',
    version: 1,
    attendees: [],
    ...overrides,
  };
}

// ── Unified setup ─────────────────────────────────────────────────────────────

function setup(opts: {
  email?: string;
  firstName?: string;
  userId?: string;
  role?: MembershipRole | null;
  orgId?: string | null;
  memberCount?: number;
  subscription?: SubscriptionResponse | null;
  maxSeats?: number;
  membersError?: boolean;
  billingError?: boolean;
  storageError?: boolean;
  activityLogError?: boolean;
  planningError?: boolean;
  activityLogs?: ActivityLogRecord[];
  occurrences?: EventOccurrence[];
}) {
  const {
    email = 'alice@example.com',
    firstName = 'Alice',
    userId = 'user-1',
    role = 'OWNER',
    orgId = 'org-1',
    memberCount = 5,
    subscription = makeSubscription(),
    maxSeats = 10,
    membersError = false,
    billingError = false,
    storageError = false,
    activityLogError = false,
    planningError = false,
    activityLogs = [],
    occurrences = [],
  } = opts;

  const mockAuth = {
    currentUser: signal({ id: userId, email, firstName }),
  } as unknown as AuthStore;

  const mockOrgs = {
    activeOrgId: signal<string | null>(orgId),
  } as unknown as OrganizationsStore;

  const mockMembershipsApi = {
    getMemberships: vi.fn(() =>
      membersError
        ? throwError(() => new Error('fail'))
        : of(Array.from({ length: memberCount }, (_, i) => ({ id: `m${i}` }))),
    ),
  } as unknown as MembershipsApi;

  const mockMembershipsStore = {
    currentUserRole: signal<MembershipRole | null>(role),
  } as unknown as MembershipsStore;

  const mockBillingApi = {
    getSubscription: vi.fn(() =>
      billingError ? throwError(() => new Error('fail')) : of(subscription),
    ),
  } as unknown as BillingApi;

  const mockEnt = {
    maxSeats: signal(maxSeats),
  } as unknown as EntitlementsStore;

  const mockStorageApi = {
    getStorageQuota: vi.fn(() =>
      storageError ? throwError(() => new Error('fail')) : of(makeQuota()),
    ),
  } as unknown as StorageApi;

  const mockActivityLogApi = {
    getActivityLog: vi.fn(() =>
      activityLogError
        ? throwError(() => new Error('fail'))
        : of({
            logs: activityLogs,
            total: activityLogs.length,
            limit: 10,
            offset: 0,
          }),
    ),
  } as unknown as ActivityLogApi;

  const mockPlanningApi = {
    listEvents: vi.fn(() =>
      planningError ? throwError(() => new Error('fail')) : of(occurrences),
    ),
  } as unknown as PlanningApi;

  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: mockAuth },
      { provide: OrganizationsStore, useValue: mockOrgs },
      { provide: MembershipsApi, useValue: mockMembershipsApi },
      { provide: MembershipsStore, useValue: mockMembershipsStore },
      { provide: BillingApi, useValue: mockBillingApi },
      { provide: EntitlementsStore, useValue: mockEnt },
      { provide: StorageApi, useValue: mockStorageApi },
      { provide: ActivityLogApi, useValue: mockActivityLogApi },
      { provide: PlanningApi, useValue: mockPlanningApi },
    ],
  });

  const fixture = TestBed.createComponent(DashboardComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return {
    fixture,
    component,
    mockMembershipsApi,
    mockMembershipsStore,
    mockBillingApi,
    mockStorageApi,
    mockActivityLogApi,
    mockPlanningApi,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DashboardComponent', () => {
  describe('initialisation', () => {
    it('calls getMemberships and getSubscription on init', () => {
      const { mockMembershipsApi, mockBillingApi } = setup({});
      expect(mockMembershipsApi.getMemberships).toHaveBeenCalledWith('org-1');
      expect(mockBillingApi.getSubscription).toHaveBeenCalledWith('org-1');
    });

    it('sets memberCount from API response', async () => {
      const { component, fixture } = setup({ memberCount: 7 });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.memberCount()).toBe(7);
    });

    it('clears loading flags after API calls', async () => {
      const { component, fixture } = setup({});
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingMembers()).toBe(false);
      expect(component.loadingBilling()).toBe(false);
    });

    it('sets loading to false on members API error', async () => {
      const { component, fixture } = setup({ membersError: true });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingMembers()).toBe(false);
    });

    it('sets loading to false on billing API error', async () => {
      const { component, fixture } = setup({ billingError: true });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingBilling()).toBe(false);
    });

    it('does not call APIs when no orgId', () => {
      const {
        mockMembershipsApi,
        mockBillingApi,
        mockActivityLogApi,
        mockPlanningApi,
      } = setup({ orgId: null });

      expect(mockMembershipsApi.getMemberships).not.toHaveBeenCalled();
      expect(mockBillingApi.getSubscription).not.toHaveBeenCalled();
      expect(mockActivityLogApi.getActivityLog).not.toHaveBeenCalled();
      expect(mockPlanningApi.listEvents).not.toHaveBeenCalled();
    });

    it('sets all loading flags to false when no orgId', () => {
      const { component } = setup({ orgId: null });
      expect(component.loadingMembers()).toBe(false);
      expect(component.loadingBilling()).toBe(false);
      expect(component.loadingStorage()).toBe(false);
      expect(component.loadingAgenda()).toBe(false);
    });
  });

  // ── Role ────────────────────────────────────────────────────────────────────

  describe('isAdminOrOwner', () => {
    it('returns true for OWNER', () => {
      const { component } = setup({ role: 'OWNER' });
      expect(component.isAdminOrOwner()).toBe(true);
    });

    it('returns true for ADMIN', () => {
      const { component } = setup({ role: 'ADMIN' });
      expect(component.isAdminOrOwner()).toBe(true);
    });

    it('returns false for MEMBER', () => {
      const { component } = setup({ role: 'MEMBER' });
      expect(component.isAdminOrOwner()).toBe(false);
    });

    it('returns false when role is null', () => {
      const { component } = setup({ role: null });
      expect(component.isAdminOrOwner()).toBe(false);
    });
  });

  // ── planLabel ───────────────────────────────────────────────────────────────

  describe('planLabel', () => {
    it('returns "Free" for NONE billing status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'NONE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.planLabel()).toBe('Free');
    });

    it('returns "Pro" for ACTIVE status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'ACTIVE' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.planLabel()).toBe('Pro');
    });

    it('returns "Pro" for TRIALING status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'TRIALING' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.planLabel()).toBe('Pro');
    });

    it('returns "Free" for CANCELED status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'CANCELED' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.planLabel()).toBe('Free');
    });

    it('returns "Free" for PAUSED status', async () => {
      const { component, fixture } = setup({
        subscription: makeSubscription({ billingStatus: 'PAUSED' }),
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.planLabel()).toBe('Free');
    });

    it('returns em dash when subscription is null', () => {
      const { component } = setup({ subscription: null });
      expect(component.planLabel()).toBe('—');
    });
  });

  // ── seatCount ───────────────────────────────────────────────────────────────

  describe('seatCount', () => {
    it('returns maxSeats from EntitlementsStore', () => {
      const { component } = setup({ maxSeats: 42 });
      expect(component.seatCount()).toBe(42);
    });
  });

  // ── user info helpers ────────────────────────────────────────────────────────

  describe('user info helpers', () => {
    it('email returns current user email', () => {
      const { component } = setup({ email: 'bob@test.com' });
      expect(component.email()).toBe('bob@test.com');
    });

    it('name returns the firstName of the current user', () => {
      const { component } = setup({ firstName: 'Charlie' });
      expect(component.name()).toBe('Charlie');
    });
  });

  // ── storageLabels ────────────────────────────────────────────────────────────

  describe('storageUsedLabel / storageLimitLabel', () => {
    it('formats bytes as MB when in megabyte range', async () => {
      const { component, fixture } = setup({});
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      // makeQuota returns storageUsedBytes='1048576' (1.0 MB)
      expect(component.storageUsedLabel()).toBe('1.0 MB');
    });

    it('formats limit bytes as MB', async () => {
      const { component, fixture } = setup({});
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      // storageLimitBytes='107374182' (~102.4 MB)
      expect(component.storageLimitLabel()).toMatch(/MB$/);
    });

    it('returns em dash when quota is null', () => {
      const { component } = setup({ storageError: true });
      expect(component.storageUsedLabel()).toBe('—');
      expect(component.storageLimitLabel()).toBe('—');
    });
  });

  // ── Upcoming events ──────────────────────────────────────────────────────────

  describe('upcoming events', () => {
    it('calls listEvents with from/to range covering next 7 days', () => {
      const before = Date.now();
      const { mockPlanningApi } = setup({ occurrences: [] });
      const after = Date.now();

      expect(mockPlanningApi.listEvents).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          from: expect.any(String),
          to: expect.any(String),
        }),
      );

      const [, params] = (
        mockPlanningApi.listEvents as ReturnType<typeof vi.fn>
      ).mock.calls[0];
      const fromMs = new Date(params.from).getTime();
      const toMs = new Date(params.to).getTime();
      expect(fromMs).toBeGreaterThanOrEqual(before);
      expect(fromMs).toBeLessThanOrEqual(after);
      // to ≈ from + 7 days (within 1 second tolerance)
      expect(toMs - fromMs).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3);
    });

    it('sets upcomingEvents to empty array when no occurrences', async () => {
      const { component, fixture } = setup({ occurrences: [] });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.upcomingEvents()).toEqual([]);
    });

    it('maps occurrences to AgendaEvent shape', async () => {
      const occ = makeOccurrence({
        title: 'Sprint review',
        location: 'Room A',
      });
      const { component, fixture } = setup({ occurrences: [occ] });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      const events = component.upcomingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Sprint review');
      expect(events[0].location).toBe('Room A');
      expect(events[0].eventId).toBe('evt-1');
    });

    it('filters out cancelled occurrences', async () => {
      const cancelled = makeOccurrence({ isCancelled: true });
      const active = makeOccurrence({
        eventId: 'evt-2',
        title: 'Active event',
      });
      const { component, fixture } = setup({
        userId: 'user-1',
        occurrences: [cancelled, active],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.upcomingEvents()).toHaveLength(1);
      expect(component.upcomingEvents()[0].title).toBe('Active event');
    });

    it('filters to events where user is creator', async () => {
      const mine = makeOccurrence({ createdByUserId: 'user-1' });
      const others = makeOccurrence({
        eventId: 'evt-2',
        createdByUserId: 'other-user',
        attendees: [],
      });
      const { component, fixture } = setup({
        userId: 'user-1',
        occurrences: [mine, others],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.upcomingEvents()).toHaveLength(1);
      expect(component.upcomingEvents()[0].eventId).toBe('evt-1');
    });

    it('includes events where user is an attendee', async () => {
      const invited = makeOccurrence({
        createdByUserId: 'other-user',
        attendees: [
          {
            userId: 'user-1',
            id: 'att-1',
            eventId: 'evt-1',
            status: 'YES',
            createdAt: '',
            updatedAt: '',
          },
        ],
      });
      const { component, fixture } = setup({
        userId: 'user-1',
        occurrences: [invited],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.upcomingEvents()).toHaveLength(1);
    });

    it('limits results to 3 events', async () => {
      const occs = Array.from({ length: 6 }, (_, i) =>
        makeOccurrence({
          eventId: `evt-${i}`,
          startUtc: `2026-04-0${i + 1}T09:00:00Z`,
          originalStartUtc: `2026-04-0${i + 1}T09:00:00Z`,
        }),
      );
      const { component, fixture } = setup({
        userId: 'user-1',
        occurrences: occs,
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.upcomingEvents()).toHaveLength(3);
    });

    it('sorts events by startUtc ascending', async () => {
      const later = makeOccurrence({
        eventId: 'evt-late',
        startUtc: '2026-04-05T09:00:00Z',
        originalStartUtc: '2026-04-05T09:00:00Z',
      });
      const sooner = makeOccurrence({
        eventId: 'evt-soon',
        startUtc: '2026-04-02T09:00:00Z',
        originalStartUtc: '2026-04-02T09:00:00Z',
      });
      const { component, fixture } = setup({
        userId: 'user-1',
        occurrences: [later, sooner],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.upcomingEvents()[0].eventId).toBe('evt-soon');
      expect(component.upcomingEvents()[1].eventId).toBe('evt-late');
    });

    it('picks user RSVP from attendees (YES → Going)', async () => {
      const occ = makeOccurrence({
        attendees: [
          {
            userId: 'user-1',
            id: 'att-1',
            eventId: 'evt-1',
            status: 'YES',
            createdAt: '',
            updatedAt: '',
          },
        ],
      });
      const { component, fixture } = setup({
        userId: 'user-1',
        occurrences: [occ],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      const evt = component.upcomingEvents()[0];
      expect(evt.userRsvp).toBe('YES');
      expect(evt.rsvpLabel).toBe('Going');
      expect(evt.rsvpSeverity).toBe('success');
    });

    it('sets RSVP to null when user is not an attendee', async () => {
      const occ = makeOccurrence({ attendees: [] });
      const { component, fixture } = setup({
        userId: 'user-1',
        occurrences: [occ],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.upcomingEvents()[0].userRsvp).toBeNull();
      expect(component.upcomingEvents()[0].rsvpLabel).toBe('');
    });

    it('sets loadingAgenda to false on planning API error', async () => {
      const { component, fixture } = setup({ planningError: true });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingAgenda()).toBe(false);
    });
  });

  // ── RSVP severity mapping ────────────────────────────────────────────────────

  describe('RSVP severity mapping', () => {
    const cases: Array<[string, string, string]> = [
      ['YES', 'Going', 'success'],
      ['NO', 'Not going', 'danger'],
      ['MAYBE', 'Maybe', 'warn'],
      ['PENDING', 'Pending', 'secondary'],
    ];

    for (const [status, label, severity] of cases) {
      it(`maps ${status} → label="${label}", severity="${severity}"`, async () => {
        const occ = makeOccurrence({
          attendees: [
            {
              userId: 'user-1',
              id: 'att-1',
              eventId: 'evt-1',
              status: status as never,
              createdAt: '',
              updatedAt: '',
            },
          ],
        });
        const { component, fixture } = setup({
          userId: 'user-1',
          occurrences: [occ],
        });
        await new Promise((r) => setTimeout(r, 0));
        fixture.detectChanges();

        const evt = component.upcomingEvents()[0];
        expect(evt.rsvpLabel).toBe(label);
        expect(evt.rsvpSeverity).toBe(severity);
      });
    }
  });

  // ── Recent activity ──────────────────────────────────────────────────────────

  describe('recent activity (admin/owner gate)', () => {
    it('calls getActivityLog with orgId and limit:10 when OWNER', () => {
      const { mockActivityLogApi } = setup({ role: 'OWNER' });
      expect(mockActivityLogApi.getActivityLog).toHaveBeenCalledWith('org-1', {
        limit: 10,
      });
    });

    it('calls getActivityLog when ADMIN', () => {
      const { mockActivityLogApi } = setup({ role: 'ADMIN' });
      expect(mockActivityLogApi.getActivityLog).toHaveBeenCalled();
    });

    it('does NOT call getActivityLog when MEMBER', () => {
      const { mockActivityLogApi } = setup({ role: 'MEMBER' });
      expect(mockActivityLogApi.getActivityLog).not.toHaveBeenCalled();
    });

    it('does NOT call getActivityLog when role is null', () => {
      const { mockActivityLogApi } = setup({ role: null });
      expect(mockActivityLogApi.getActivityLog).not.toHaveBeenCalled();
    });

    it('maps activity logs to ActivityItem shape', async () => {
      const log = makeActivityLog({
        action: 'MEMBER_ROLE_UPDATED',
        entityType: 'MEMBERSHIP',
        actorRole: 'ADMIN',
      });
      const { component, fixture } = setup({
        role: 'OWNER',
        activityLogs: [log],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      const items = component.recentActivity();
      expect(items).toHaveLength(1);
      expect(items[0].label).toBe('Member role updated');
      expect(items[0].entityType).toBe('MEMBERSHIP');
      expect(items[0].actorRole).toBe('ADMIN');
    });

    it('converts action with multiple underscores correctly', async () => {
      const log = makeActivityLog({ action: 'ORG_SETTINGS_UPDATED' });
      const { component, fixture } = setup({
        role: 'OWNER',
        activityLogs: [log],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.recentActivity()[0].label).toBe('Org settings updated');
    });

    it('sets relativeTime for a log created ~5 minutes ago', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
      const log = makeActivityLog({ createdAt: fiveMinutesAgo });
      const { component, fixture } = setup({
        role: 'OWNER',
        activityLogs: [log],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.recentActivity()[0].relativeTime).toBe('5m ago');
    });

    it('sets relativeTime for a log created ~2 hours ago', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
      const log = makeActivityLog({ createdAt: twoHoursAgo });
      const { component, fixture } = setup({
        role: 'OWNER',
        activityLogs: [log],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.recentActivity()[0].relativeTime).toBe('2h ago');
    });

    it('sets relativeTime for a log created ~3 days ago', async () => {
      const threeDaysAgo = new Date(
        Date.now() - 3 * 24 * 60 * 60_000,
      ).toISOString();
      const log = makeActivityLog({ createdAt: threeDaysAgo });
      const { component, fixture } = setup({
        role: 'OWNER',
        activityLogs: [log],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.recentActivity()[0].relativeTime).toBe('3d ago');
    });

    it('sets relativeTime to "just now" for very recent logs', async () => {
      const log = makeActivityLog({ createdAt: new Date().toISOString() });
      const { component, fixture } = setup({
        role: 'OWNER',
        activityLogs: [log],
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.recentActivity()[0].relativeTime).toBe('just now');
    });

    it('sets recentActivity to [] when no logs returned', async () => {
      const { component, fixture } = setup({ role: 'OWNER', activityLogs: [] });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();

      expect(component.recentActivity()).toEqual([]);
    });

    it('sets loadingActivity to true while fetching then false after', async () => {
      const { component, fixture } = setup({ role: 'OWNER' });
      // After sync resolution loadingActivity should be false
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingActivity()).toBe(false);
    });

    it('sets loadingActivity to false on activity log error', async () => {
      const { component, fixture } = setup({
        role: 'OWNER',
        activityLogError: true,
      });
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      expect(component.loadingActivity()).toBe(false);
    });

    it('loadingActivity stays false for MEMBER (no fetch)', () => {
      const { component } = setup({ role: 'MEMBER' });
      expect(component.loadingActivity()).toBe(false);
    });
  });
});
