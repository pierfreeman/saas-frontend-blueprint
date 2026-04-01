import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import {
  NotificationsApi,
  NotificationsSocketService,
  type NotificationRecord,
} from '@saas-frontend/notifications/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { NotificationsComponent } from './notifications.component';

function makeNotification(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: 'notif-1',
    orgId: 'org-1',
    userId: 'user-1',
    type: 'event.created',
    title: 'New event',
    body: 'You have a new event',
    metadata: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('NotificationsComponent', () => {
  const notificationSubject = new Subject<NotificationRecord>();
  const unreadCountSubject = new Subject<{ count: number }>();

  const apiMock = {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markManyAsRead: vi.fn(),
  };

  const socketMock = {
    connect: vi.fn(),
    notification$: notificationSubject.asObservable(),
    unreadCount$: unreadCountSubject.asObservable(),
  };

  // Use a mutable object so we can change the active org per-test without
  // fighting vi.clearAllMocks() which does not restore mockReturnValue overrides.
  const orgState = { id: 'org-1' };
  const orgsStoreMock = {
    activeOrgId: vi.fn(() => orgState.id),
  };

  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  function createComp(): NotificationsComponent {
    return TestBed.runInInjectionContext(() => new NotificationsComponent());
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    orgState.id = 'org-1';
    apiMock.getNotifications.mockReturnValue(of([]));
    apiMock.markAsRead.mockReturnValue(of(undefined));
    apiMock.markManyAsRead.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      providers: [
        { provide: NotificationsApi, useValue: apiMock },
        { provide: NotificationsSocketService, useValue: socketMock },
        { provide: OrganizationsStore, useValue: orgsStoreMock },
        { provide: Router, useValue: routerMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  // ── typeIcon ────────────────────────────────────────────────────────────────

  describe('typeIcon()', () => {
    let comp: NotificationsComponent;
    beforeEach(() => {
      comp = createComp();
    });

    it('returns pi-calendar for event types', () => {
      expect(comp.typeIcon('event.created')).toBe('pi-calendar');
    });

    it('returns pi-credit-card for billing types', () => {
      expect(comp.typeIcon('billing.invoice')).toBe('pi-credit-card');
    });

    it('returns pi-users for invite types', () => {
      expect(comp.typeIcon('invite.sent')).toBe('pi-users');
    });

    it('returns pi-building for org types', () => {
      expect(comp.typeIcon('org.updated')).toBe('pi-building');
    });

    it('returns pi-download for export types', () => {
      expect(comp.typeIcon('export.ready')).toBe('pi-download');
    });

    it('returns pi-exclamation-triangle for alert types', () => {
      expect(comp.typeIcon('alert.critical')).toBe('pi-exclamation-triangle');
    });

    it('returns pi-bell as default fallback', () => {
      expect(comp.typeIcon('unknown.type')).toBe('pi-bell');
    });
  });

  // ── isClickable ─────────────────────────────────────────────────────────────

  describe('isClickable()', () => {
    let comp: NotificationsComponent;
    beforeEach(() => {
      comp = createComp();
    });

    it('returns true when notification is unread', () => {
      expect(comp.isClickable(makeNotification({ readAt: null }))).toBe(true);
    });

    it('returns true when notification is read but has an entityRef', () => {
      const n = makeNotification({
        readAt: new Date().toISOString(),
        metadata: { entityRef: { type: 'event', id: 'evt-1' } },
      });
      expect(comp.isClickable(n)).toBe(true);
    });

    it('returns false when notification is read and has no entityRef', () => {
      const n = makeNotification({
        readAt: new Date().toISOString(),
        metadata: null,
      });
      expect(comp.isClickable(n)).toBe(false);
    });
  });

  // ── ngOnInit ─────────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('loads notifications and connects socket for the active org', () => {
      const notifs = [makeNotification()];
      apiMock.getNotifications.mockReturnValue(of(notifs));

      const comp = createComp();
      comp.ngOnInit();

      expect(apiMock.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-1',
          unreadOnly: false,
          limit: 20,
          offset: 0,
        }),
      );
      expect(socketMock.connect).toHaveBeenCalledWith('org-1');
      expect(comp.notifications()).toEqual(notifs);
      expect(comp.loading()).toBe(false);
    });

    it('subscribes to socket unreadCount$ and updates signal', () => {
      const comp = createComp();
      comp.ngOnInit();

      unreadCountSubject.next({ count: 5 });

      expect(comp.unreadCount()).toBe(5);
    });

    it('prepends realtime notifications from socket', () => {
      apiMock.getNotifications.mockReturnValue(of([]));
      const comp = createComp();
      comp.ngOnInit();

      const incoming = makeNotification({ id: 'realtime-1' });
      notificationSubject.next(incoming);

      expect(comp.notifications()[0].id).toBe('realtime-1');
    });

    it('does not prepend read notifications when unreadOnly is active', () => {
      apiMock.getNotifications.mockReturnValue(of([]));
      const comp = createComp();
      comp.ngOnInit();
      comp.toggleUnreadOnly(); // enables unreadOnly

      const incoming = makeNotification({
        id: 'already-read',
        readAt: new Date().toISOString(),
      });
      notificationSubject.next(incoming);

      expect(comp.notifications()).toHaveLength(0);
    });

    it('does not prepend realtime notifications from a different org', () => {
      apiMock.getNotifications.mockReturnValue(of([]));
      const comp = createComp();
      comp.ngOnInit();

      const incoming = makeNotification({
        id: 'other-org',
        orgId: 'org-other',
      });
      notificationSubject.next(incoming);

      expect(comp.notifications()).toHaveLength(0);
    });

    it('prepends realtime notifications from the same org', () => {
      apiMock.getNotifications.mockReturnValue(of([]));
      const comp = createComp();
      comp.ngOnInit();

      const incoming = makeNotification({ id: 'same-org', orgId: 'org-1' });
      notificationSubject.next(incoming);

      expect(comp.notifications()).toHaveLength(1);
      expect(comp.notifications()[0].id).toBe('same-org');
    });

    it('skips socket connect when no active org', () => {
      orgState.id = '';
      const comp = createComp();
      comp.ngOnInit();
      expect(socketMock.connect).not.toHaveBeenCalled();
    });
  });

  // ── toggleUnreadOnly ─────────────────────────────────────────────────────────

  describe('toggleUnreadOnly()', () => {
    it('flips unreadOnly and reloads', () => {
      const comp = createComp();
      comp.ngOnInit();
      vi.clearAllMocks();
      apiMock.getNotifications.mockReturnValue(of([]));

      comp.toggleUnreadOnly();

      expect(comp.unreadOnly()).toBe(true);
      expect(apiMock.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ unreadOnly: true, offset: 0 }),
      );
    });
  });

  // ── markAsRead ───────────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('calls api and marks the notification as read in the list', () => {
      const notif = makeNotification({ id: 'n1' });
      apiMock.getNotifications.mockReturnValue(of([notif]));

      const comp = createComp();
      comp.ngOnInit();
      comp.markAsRead(notif);

      expect(apiMock.markAsRead).toHaveBeenCalledWith('n1');
      expect(comp.notifications()[0].readAt).not.toBeNull();
    });

    it('swallows api errors silently', () => {
      const notif = makeNotification();
      apiMock.markAsRead.mockReturnValue(throwError(() => new Error('net')));
      apiMock.getNotifications.mockReturnValue(of([notif]));

      const comp = createComp();
      comp.ngOnInit();
      expect(() => comp.markAsRead(notif)).not.toThrow();
    });
  });

  // ── markAllAsRead ────────────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('calls api with all unread ids and marks them read', () => {
      const notifs = [
        makeNotification({ id: 'n1' }),
        makeNotification({ id: 'n2' }),
      ];
      apiMock.getNotifications.mockReturnValue(of(notifs));

      const comp = createComp();
      comp.ngOnInit();
      comp.markAllAsRead();

      expect(apiMock.markManyAsRead).toHaveBeenCalledWith({
        ids: ['n1', 'n2'],
      });
      expect(comp.notifications().every((n) => n.readAt !== null)).toBe(true);
      expect(comp.markingAll()).toBe(false);
    });

    it('is a no-op when there are no unread notifications', () => {
      const read = makeNotification({ readAt: new Date().toISOString() });
      apiMock.getNotifications.mockReturnValue(of([read]));

      const comp = createComp();
      comp.ngOnInit();
      comp.markAllAsRead();

      expect(apiMock.markManyAsRead).not.toHaveBeenCalled();
    });

    it('resets markingAll on api error', () => {
      const notif = makeNotification();
      apiMock.getNotifications.mockReturnValue(of([notif]));
      apiMock.markManyAsRead.mockReturnValue(
        throwError(() => new Error('fail')),
      );

      const comp = createComp();
      comp.ngOnInit();
      comp.markAllAsRead();

      expect(comp.markingAll()).toBe(false);
    });
  });

  // ── handleClick ──────────────────────────────────────────────────────────────

  describe('handleClick()', () => {
    it('marks notification as read when it is unread', () => {
      const notif = makeNotification({ id: 'n1', readAt: null });
      apiMock.getNotifications.mockReturnValue(of([notif]));

      const comp = createComp();
      comp.ngOnInit();
      comp.handleClick(notif);

      expect(apiMock.markAsRead).toHaveBeenCalledWith('n1');
    });

    it('does not call markAsRead when already read', () => {
      const notif = makeNotification({ readAt: new Date().toISOString() });
      apiMock.getNotifications.mockReturnValue(of([notif]));

      const comp = createComp();
      comp.ngOnInit();
      comp.handleClick(notif);

      expect(apiMock.markAsRead).not.toHaveBeenCalled();
    });

    it('navigates to /planning with eventId when entityRef type is event', () => {
      const notif = makeNotification({
        readAt: new Date().toISOString(),
        metadata: { entityRef: { type: 'event', id: 'evt-42' } },
      });
      apiMock.getNotifications.mockReturnValue(of([notif]));

      const comp = createComp();
      comp.ngOnInit();
      comp.handleClick(notif);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/planning'], {
        queryParams: { eventId: 'evt-42' },
      });
    });

    it('does not navigate when entityRef is absent', () => {
      const notif = makeNotification({
        readAt: new Date().toISOString(),
        metadata: null,
      });
      const comp = createComp();
      comp.handleClick(notif);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  // ── loadMore ─────────────────────────────────────────────────────────────────

  describe('loadMore()', () => {
    it('appends the next page to the existing list', () => {
      const page1 = Array.from({ length: 20 }, (_, i) =>
        makeNotification({ id: `n${i}` }),
      );
      const page2 = [makeNotification({ id: 'n20' })];

      apiMock.getNotifications
        .mockReturnValueOnce(of(page1))
        .mockReturnValueOnce(of(page2));

      const comp = createComp();
      comp.ngOnInit();
      comp.loadMore();

      expect(comp.notifications()).toHaveLength(21);
      expect(apiMock.getNotifications).toHaveBeenCalledTimes(2);
    });
  });

  // ── hasMore / unreadIds computed ──────────────────────────────────────────────

  describe('hasMore()', () => {
    it('is false when all pages have been loaded', () => {
      // < PAGE_SIZE results → no more pages
      apiMock.getNotifications.mockReturnValue(of([makeNotification()]));

      const comp = createComp();
      comp.ngOnInit();

      expect(comp.hasMore()).toBe(false);
    });
  });

  // ── ngOnDestroy ───────────────────────────────────────────────────────────────

  describe('ngOnDestroy()', () => {
    it('does not throw', () => {
      const comp = createComp();
      comp.ngOnInit();
      expect(() => comp.ngOnDestroy()).not.toThrow();
    });
  });
});
