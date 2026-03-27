import { Injectable, InjectionToken, OnDestroy, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type { NotificationRecord } from './notifications.api.types';

export const SOCKET_IO_FACTORY = new InjectionToken<typeof io>(
  'SOCKET_IO_FACTORY',
  { providedIn: 'root', factory: () => io },
);

export interface UnreadCountPayload {
  count: number;
}

/**
 * Manages a tenant-scoped Socket.IO connection to the `/notifications` namespace.
 *
 * The connection is org-scoped: call `connect(orgId)` on initial bootstrap and
 * again on every org switch so the server only pushes events for the active org.
 * Call `disconnect()` before switching org to cleanly close the old session.
 *
 * Streams:
 *  - `notification$` — emits whenever the server pushes a `notification:new` event.
 *  - `unreadCount$`  — emits the current unread count after any server-side change.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsSocketService implements OnDestroy {
  readonly #base = inject(API_BASE_URL);
  readonly #auth = inject(AuthService);
  readonly #io = inject(SOCKET_IO_FACTORY);

  #socket: Socket | null = null;
  /** Tracks the org the current socket is connected for — avoids spurious reconnects. */
  #connectedOrgId: string | null = null;

  readonly #notification$ = new Subject<NotificationRecord>();
  readonly #unreadCount$ = new Subject<UnreadCountPayload>();

  /** Stream of incoming real-time notifications from the server. */
  readonly notification$ = this.#notification$.asObservable();

  /** Stream of unread-count updates pushed by the server. */
  readonly unreadCount$ = this.#unreadCount$.asObservable();

  /**
   * Connect to the WebSocket gateway for the given org.
   *
   * Idempotent when called with the same org — safe to call on every navigation.
   * If already connected to a different org, disconnects first.
   * The orgId is forwarded in the socket handshake auth so the server can filter
   * events to the correct tenant without needing an HTTP call for each WS message.
   */
  connect(orgId: string): void {
    if (this.#socket?.connected && this.#connectedOrgId === orgId) return;
    // Reconnecting for a different org — close the old session first.
    if (this.#socket) this.disconnect();

    this.#auth.getAccessTokenSilently().subscribe({
      next: (token) => this.#open(token, orgId),
      error: () => {
        // If token retrieval fails the component degrades gracefully to HTTP-only.
      },
    });
  }

  /** Explicitly disconnect and release the socket. */
  disconnect(): void {
    this.#socket?.disconnect();
    this.#socket = null;
    this.#connectedOrgId = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.#notification$.complete();
    this.#unreadCount$.complete();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  #open(token: string, orgId: string): void {
    this.#connectedOrgId = orgId;
    this.#socket = this.#io(`${this.#base}/notifications`, {
      auth: { token, orgId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    this.#socket.on('notification:new', (payload: NotificationRecord) => {
      this.#notification$.next(payload);
    });

    this.#socket.on(
      'notification:unread-count',
      (payload: UnreadCountPayload) => {
        this.#unreadCount$.next(payload);
      },
    );
  }
}
