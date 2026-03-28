import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  NotificationRecord,
  UnreadCountPayload,
} from '@saas-frontend/notifications/data-access';
import {
  NotificationsApi,
  NotificationsSocketService,
} from '@saas-frontend/notifications/data-access';
import { NotificationsComponent } from '@saas-frontend/notifications/feature';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotification(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: 'n1',
    orgId: 'org-1',
    userId: 'u1',
    type: 'org',
    title: 'Test notification',
    body: 'Body text',
    metadata: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('NotificationsComponent', () => {
  let fixture: ComponentFixture<NotificationsComponent>;
  let component: NotificationsComponent;
  let notification$: Subject<NotificationRecord>;
  let unreadCount$: Subject<UnreadCountPayload>;
  let getNotificationsMock: ReturnType<typeof vi.fn>;

  function setup(initialNotifications: NotificationRecord[] = []) {
    notification$ = new Subject<NotificationRecord>();
    unreadCount$ = new Subject<UnreadCountPayload>();
    getNotificationsMock = vi.fn(() => of(initialNotifications));

    const mockApi = {
      getNotifications: getNotificationsMock,
      markAsRead: vi.fn(() => of(undefined)),
      markManyAsRead: vi.fn(() => of(undefined)),
    } as unknown as NotificationsApi;

    const mockSocket = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      notification$: notification$.asObservable(),
      unreadCount$: unreadCount$.asObservable(),
    } as unknown as NotificationsSocketService;

    TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        { provide: NotificationsApi, useValue: mockApi },
        { provide: NotificationsSocketService, useValue: mockSocket },
        {
          provide: OrganizationsStore,
          useValue: { activeOrgId: signal('org-1') },
        },
      ],
    });

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  describe('initialisation', () => {
    it('creates the component', () => {
      setup();
      expect(component).toBeTruthy();
    });

    it('fetches notifications from the API on init', () => {
      setup();
      expect(getNotificationsMock).toHaveBeenCalledOnce();
    });

    it('opens the WebSocket connection on init', () => {
      setup();
      const socketMock = TestBed.inject(NotificationsSocketService);
      expect(socketMock.connect).toHaveBeenCalledOnce();
    });

    it('populates the notifications signal from the API response', () => {
      setup([makeNotification({ id: 'n1' })]);
      expect(component.notifications()).toHaveLength(1);
      expect(component.notifications()[0].id).toBe('n1');
    });

    it('sets loading to false after the first load completes', () => {
      setup();
      expect(component.loading()).toBe(false);
    });
  });

  // ── unreadIds() ───────────────────────────────────────────────────────────

  describe('unreadIds()', () => {
    it('returns only the IDs of unread notifications', () => {
      setup([
        makeNotification({ id: 'a', readAt: null }),
        makeNotification({ id: 'b', readAt: new Date().toISOString() }),
      ]);
      expect(component.unreadIds()).toEqual(['a']);
    });

    it('returns an empty array when all notifications are read', () => {
      setup([makeNotification({ readAt: new Date().toISOString() })]);
      expect(component.unreadIds()).toEqual([]);
    });
  });

  // ── Real-time: notification$ ──────────────────────────────────────────────

  describe('real-time — notification$', () => {
    it('prepends an incoming notification to the top of the list', () => {
      setup([makeNotification({ id: 'existing' })]);

      notification$.next(makeNotification({ id: 'new-one', title: 'Live!' }));

      expect(component.notifications()[0].id).toBe('new-one');
      expect(component.notifications()).toHaveLength(2);
    });

    it('increments the total when a new notification arrives', () => {
      setup([makeNotification()]);
      const before = component.total();

      notification$.next(makeNotification({ id: 'incoming' }));

      expect(component.total()).toBe(before + 1);
    });

    it('increments unreadCount when the incoming notification is unread', () => {
      setup();
      notification$.next(makeNotification({ readAt: null }));
      expect(component.unreadCount()).toBe(1);
    });

    it('does not increment unreadCount when the incoming notification is already read', () => {
      setup();
      notification$.next(
        makeNotification({ readAt: new Date().toISOString() }),
      );
      expect(component.unreadCount()).toBe(0);
    });

    it('skips already-read notifications in unread-only mode', () => {
      setup();
      component.toggleUnreadOnly(); // activates unread-only filter

      notification$.next(
        makeNotification({ readAt: new Date().toISOString() }),
      );

      // Only the empty list from the reload should be present.
      expect(component.notifications()).toHaveLength(0);
    });
  });

  // ── Real-time: unreadCount$ ───────────────────────────────────────────────

  describe('real-time — unreadCount$', () => {
    it('updates the unreadCount signal when the server pushes a count', () => {
      setup();
      unreadCount$.next({ count: 7 });
      expect(component.unreadCount()).toBe(7);
    });

    it('reflects multiple consecutive server pushes', () => {
      setup();
      unreadCount$.next({ count: 3 });
      unreadCount$.next({ count: 1 });
      expect(component.unreadCount()).toBe(1);
    });
  });

  // ── markAsRead() ──────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('calls the API with the notification id', () => {
      const n = makeNotification({ id: 'n1' });
      setup([n]);

      component.markAsRead(n);

      const api = TestBed.inject(NotificationsApi);
      expect(api.markAsRead).toHaveBeenCalledWith('n1');
    });

    it('sets readAt on the notification in the signal', () => {
      const n = makeNotification({ id: 'n1', readAt: null });
      setup([n]);

      component.markAsRead(n);

      expect(component.notifications()[0].readAt).not.toBeNull();
    });
  });

  // ── markAllAsRead() ───────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('calls markManyAsRead with all unread notification IDs', () => {
      setup([
        makeNotification({ id: 'a', readAt: null }),
        makeNotification({ id: 'b', readAt: null }),
      ]);

      component.markAllAsRead();

      const api = TestBed.inject(NotificationsApi);
      expect(api.markManyAsRead).toHaveBeenCalledWith({ ids: ['a', 'b'] });
    });

    it('marks every notification as read in the UI', () => {
      setup([makeNotification({ id: 'a' }), makeNotification({ id: 'b' })]);
      component.markAllAsRead();
      expect(component.notifications().every((n) => n.readAt !== null)).toBe(
        true,
      );
    });

    it('is a no-op when there are no unread notifications', () => {
      setup([makeNotification({ readAt: new Date().toISOString() })]);
      component.markAllAsRead();
      const api = TestBed.inject(NotificationsApi);
      expect(api.markManyAsRead).not.toHaveBeenCalled();
    });
  });

  // ── handleClick() ─────────────────────────────────────────────────────────

  describe('handleClick()', () => {
    it('marks an unread notification as read and keeps it visible in the list', () => {
      setup([makeNotification({ id: 'n1', readAt: null })]);

      component.handleClick(component.notifications()[0]);

      expect(component.notifications()).toHaveLength(1);
      expect(component.notifications()[0].id).toBe('n1');
      expect(component.notifications()[0].readAt).not.toBeNull();
    });
  });

  // ── toggleUnreadOnly() ────────────────────────────────────────────────────

  describe('toggleUnreadOnly()', () => {
    it('flips the unreadOnly flag from false to true', () => {
      setup();
      expect(component.unreadOnly()).toBe(false);
      component.toggleUnreadOnly();
      expect(component.unreadOnly()).toBe(true);
    });

    it('flips the unreadOnly flag back to false on second call', () => {
      setup();
      component.toggleUnreadOnly();
      component.toggleUnreadOnly();
      expect(component.unreadOnly()).toBe(false);
    });

    it('triggers a fresh notifications load after toggling', () => {
      setup();
      // First call on init + one after toggle = 2 total.
      component.toggleUnreadOnly();
      expect(getNotificationsMock).toHaveBeenCalledTimes(2);
    });
  });
});
