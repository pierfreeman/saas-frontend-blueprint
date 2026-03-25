import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@auth0/auth0-angular';
import { API_BASE_URL } from '@org/shared/util-types';
import { NotificationsSocketService } from '@org/notifications/data-access';
import type { NotificationRecord } from '@org/notifications/data-access';

// ── Socket.IO mock ────────────────────────────────────────────────────────────
// vi.hoisted() ensures the variables exist when vi.mock()'s factory runs,
// because vi.mock() is hoisted to the top of the module by Vitest's transform.
const { mockIo, mockSocket } = vi.hoisted(() => {
  const socket = {
    connected: false,
    on: vi.fn(),
    disconnect: vi.fn(),
  };
  return { mockIo: vi.fn(() => socket), mockSocket: socket };
});

vi.mock('socket.io-client', () => ({ io: mockIo }));

// Helper: retrieve the handler registered for a given socket event.
function getSocketHandler(
  event: string,
): ((payload: unknown) => void) | undefined {
  const call = (
    mockSocket.on.mock.calls as Array<[string, (p: unknown) => void]>
  ).find(([e]) => e === event);
  return call?.[1];
}
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';
const TOKEN = 'fake-jwt';

describe('NotificationsSocketService', () => {
  let service: NotificationsSocketService;

  function setup(tokenResult: 'success' | 'error' = 'success') {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: BASE_URL },
        {
          provide: AuthService,
          useValue: {
            getAccessTokenSilently: vi.fn(() =>
              tokenResult === 'success'
                ? of(TOKEN)
                : throwError(() => new Error('auth error')),
            ),
          },
        },
      ],
    });
    service = TestBed.inject(NotificationsSocketService);
  }

  beforeEach(() => {
    mockIo.mockClear();
    mockSocket.on.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.connected = false;
  });

  // ── connect() ──────────────────────────────────────────────────────────────

  describe('connect()', () => {
    it('opens a socket to the /notifications namespace with the JWT', () => {
      setup();
      service.connect();

      expect(mockIo).toHaveBeenCalledOnce();
      const calls = mockIo.mock.calls as unknown as [
        string,
        Record<string, unknown>,
      ][];
      const [url, opts] = calls[0];
      expect(url).toBe(`${BASE_URL}/notifications`);
      expect((opts['auth'] as Record<string, unknown>)['token']).toBe(TOKEN);
      expect(opts['transports']).toContain('websocket');
    });

    it('is idempotent — skips reconnection when already connected', () => {
      setup();
      service.connect(); // first call — opens the socket
      mockSocket.connected = true; // simulate the socket being up
      mockIo.mockClear(); // reset call count for the assertion below

      service.connect(); // second call — must be a no-op

      expect(mockIo).not.toHaveBeenCalled();
    });

    it('does not open a socket when token retrieval fails', () => {
      setup('error');
      service.connect();

      expect(mockIo).not.toHaveBeenCalled();
    });
  });

  // ── notification$ ──────────────────────────────────────────────────────────

  describe('notification$', () => {
    it('emits when the socket fires notification:new', () => {
      setup();
      service.connect();

      const received: NotificationRecord[] = [];
      service.notification$.subscribe((n) => received.push(n));

      const payload = {
        id: 'n1',
        orgId: 'org-1',
        userId: 'u1',
        type: 'org',
        title: 'Hello',
        body: 'World',
        metadata: null,
        readAt: null,
        createdAt: new Date().toISOString(),
      } satisfies NotificationRecord;

      getSocketHandler('notification:new')?.(payload);

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(payload);
    });

    it('does not emit before connect() is called', () => {
      setup();

      const received: unknown[] = [];
      service.notification$.subscribe((n) => received.push(n));

      // No socket open → no handler registered → no emission possible.
      expect(received).toHaveLength(0);
    });
  });

  // ── unreadCount$ ───────────────────────────────────────────────────────────

  describe('unreadCount$', () => {
    it('emits when the socket fires notification:unread-count', () => {
      setup();
      service.connect();

      const counts: unknown[] = [];
      service.unreadCount$.subscribe((c) => counts.push(c));

      getSocketHandler('notification:unread-count')?.({ count: 5 });

      expect(counts).toHaveLength(1);
      expect(counts[0]).toEqual({ count: 5 });
    });
  });

  // ── disconnect() ───────────────────────────────────────────────────────────

  describe('disconnect()', () => {
    it('calls socket.disconnect()', () => {
      setup();
      service.connect();
      service.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalledOnce();
    });

    it('is safe to call before connect()', () => {
      setup();
      expect(() => service.disconnect()).not.toThrow();
    });
  });

  // ── ngOnDestroy() ──────────────────────────────────────────────────────────

  describe('ngOnDestroy()', () => {
    it('disconnects the socket and completes both streams', () => {
      setup();
      service.connect();

      let notifCompleted = false;
      let countCompleted = false;
      service.notification$.subscribe({
        complete: () => (notifCompleted = true),
      });
      service.unreadCount$.subscribe({
        complete: () => (countCompleted = true),
      });

      service.ngOnDestroy();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(notifCompleted).toBe(true);
      expect(countCompleted).toBe(true);
    });
  });
});
