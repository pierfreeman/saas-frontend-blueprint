import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import {
  NotificationsSocketService,
  SOCKET_IO_FACTORY,
} from './notifications.socket.service';

const BASE = 'https://api.test';

function createMockSocket() {
  const handlers: Record<string, (payload: unknown) => void> = {};
  const socket = {
    connected: true,
    disconnect: vi.fn().mockImplementation(() => {
      socket.connected = false;
    }),
    on: vi
      .fn()
      .mockImplementation((event: string, handler: (p: unknown) => void) => {
        handlers[event] = handler;
      }),
    _trigger: (event: string, data: unknown) => handlers[event]?.(data),
  };
  return socket;
}

describe('NotificationsSocketService', () => {
  let service: NotificationsSocketService;
  let mockIo: ReturnType<typeof vi.fn>;
  let createdSockets: ReturnType<typeof createMockSocket>[];
  let mockAuth: { getAccessTokenSilently: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    createdSockets = [];
    mockIo = vi.fn().mockImplementation(() => {
      const socket = createMockSocket();
      createdSockets.push(socket);
      return socket;
    });
    mockAuth = {
      getAccessTokenSilently: vi.fn().mockReturnValue(of('test-token')),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SOCKET_IO_FACTORY, useValue: mockIo },
        { provide: AuthService, useValue: mockAuth },
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });

    service = TestBed.inject(NotificationsSocketService);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('connect()', () => {
    it('calls getAccessTokenSilently and creates a socket', () => {
      service.connect('org-1');

      expect(mockAuth.getAccessTokenSilently).toHaveBeenCalledOnce();
      expect(mockIo).toHaveBeenCalledOnce();
      expect(mockIo).toHaveBeenCalledWith(
        `${BASE}/notifications`,
        expect.objectContaining({
          auth: { token: 'test-token', orgId: 'org-1' },
        }),
      );
    });

    it('passes correct socket.io options', () => {
      service.connect('org-2');

      expect(mockIo).toHaveBeenCalledWith(
        `${BASE}/notifications`,
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          reconnection: true,
        }),
      );
    });

    it('is idempotent when called again with the same orgId', () => {
      service.connect('org-1');
      service.connect('org-1');

      expect(mockIo).toHaveBeenCalledOnce();
    });

    it('disconnects the old socket and creates a new one for a different org', () => {
      service.connect('org-1');
      const firstSocket = createdSockets[0];

      service.connect('org-2');

      expect(firstSocket.disconnect).toHaveBeenCalledOnce();
      expect(mockIo).toHaveBeenCalledTimes(2);
      expect(mockIo).toHaveBeenLastCalledWith(
        `${BASE}/notifications`,
        expect.objectContaining({
          auth: expect.objectContaining({ orgId: 'org-2' }),
        }),
      );
    });

    it('does not throw when getAccessTokenSilently fails', () => {
      mockAuth.getAccessTokenSilently.mockReturnValue(
        throwError(() => new Error('Auth error')),
      );

      expect(() => service.connect('org-1')).not.toThrow();
      expect(mockIo).not.toHaveBeenCalled();
    });
  });

  describe('notification$', () => {
    it('emits when server pushes a notification:new event', () => {
      const received: unknown[] = [];
      service.notification$.subscribe((v) => received.push(v));

      service.connect('org-1');
      const payload = { id: 'n-1', title: 'Hello' };
      createdSockets[0]._trigger('notification:new', payload);

      expect(received).toEqual([payload]);
    });
  });

  describe('unreadCount$', () => {
    it('emits when server pushes a notification:unread-count event', () => {
      const received: unknown[] = [];
      service.unreadCount$.subscribe((v) => received.push(v));

      service.connect('org-1');
      createdSockets[0]._trigger('notification:unread-count', { count: 5 });

      expect(received).toEqual([{ count: 5 }]);
    });
  });

  describe('disconnect()', () => {
    it('calls socket.disconnect() and clears state', () => {
      service.connect('org-1');
      const socket = createdSockets[0];

      service.disconnect();

      expect(socket.disconnect).toHaveBeenCalledOnce();
    });

    it('is a no-op when not connected', () => {
      expect(() => service.disconnect()).not.toThrow();
    });

    it('allows reconnecting after disconnect', () => {
      service.connect('org-1');
      service.disconnect();
      service.connect('org-1');

      expect(mockIo).toHaveBeenCalledTimes(2);
    });
  });

  describe('ngOnDestroy()', () => {
    it('disconnects the socket', () => {
      service.connect('org-1');
      const socket = createdSockets[0];

      service.ngOnDestroy();

      expect(socket.disconnect).toHaveBeenCalledOnce();
    });

    it('completes the notification$ stream', () => {
      let completed = false;
      service.notification$.subscribe({
        complete: () => {
          completed = true;
        },
      });

      service.ngOnDestroy();

      expect(completed).toBe(true);
    });

    it('completes the unreadCount$ stream', () => {
      let completed = false;
      service.unreadCount$.subscribe({
        complete: () => {
          completed = true;
        },
      });

      service.ngOnDestroy();

      expect(completed).toBe(true);
    });
  });
});
