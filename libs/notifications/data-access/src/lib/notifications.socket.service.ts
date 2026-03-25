import { Injectable, OnDestroy, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@org/shared/util-types';
import type { NotificationRecord } from './notifications.api.types';

export interface UnreadCountPayload {
  count: number;
}

/**
 * Manages a Socket.IO connection to the `/notifications` namespace.
 *
 * Call `connect()` once to establish the WebSocket session (JWT is fetched
 * silently from Auth0). The connection is automatically cleaned up on
 * service destruction.
 *
 * Streams:
 *  - `notification$` — emits whenever the server pushes a `notification:new` event.
 *  - `unreadCount$`  — emits the current unread count after any server-side change.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsSocketService implements OnDestroy {
  readonly #base = inject(API_BASE_URL);
  readonly #auth = inject(AuthService);

  #socket: Socket | null = null;

  readonly #notification$ = new Subject<NotificationRecord>();
  readonly #unreadCount$ = new Subject<UnreadCountPayload>();

  /** Stream of incoming real-time notifications from the server. */
  readonly notification$ = this.#notification$.asObservable();

  /** Stream of unread-count updates pushed by the server. */
  readonly unreadCount$ = this.#unreadCount$.asObservable();

  /**
   * Connect to the WebSocket gateway.
   * Idempotent — safe to call multiple times; opens only one connection.
   */
  connect(): void {
    if (this.#socket?.connected) return;

    this.#auth.getAccessTokenSilently().subscribe({
      next: (token) => this.#open(token),
      error: () => {
        // If token retrieval fails the component degrades gracefully to HTTP-only.
      },
    });
  }

  /** Explicitly disconnect and release the socket. */
  disconnect(): void {
    this.#socket?.disconnect();
    this.#socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.#notification$.complete();
    this.#unreadCount$.complete();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  #open(token: string): void {
    this.#socket = io(`${this.#base}/notifications`, {
      auth: { token },
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
