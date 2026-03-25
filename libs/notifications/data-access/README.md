# @org/notifications/data-access

HTTP + real-time WebSocket client for the in-app notifications system.

**Import path**: `@org/notifications/data-access`

---

## Exports

| Symbol                       | Kind    | Description                                              |
| ---------------------------- | ------- | -------------------------------------------------------- |
| `NotificationsApi`           | Service | HTTP client for all notification REST operations         |
| `NotificationsSocketService` | Service | Socket.IO client for real-time push notifications        |
| `CreateNotificationDto`      | Type    | Payload for creating a notification (internal/admin use) |
| `MarkManyReadDto`            | Type    | Payload for bulk mark-as-read                            |
| `GetNotificationsParams`     | Type    | Query params: `orgId`, `unreadOnly`, `limit`, `offset`   |
| `NotificationList`           | Type    | Paginated notification list                              |
| `NotificationRecord`         | Type    | Single notification shape                                |
| `UnreadCountResponse`        | Type    | `{ count: number }` (HTTP)                               |
| `UnreadCountPayload`         | Type    | `{ count: number }` (WebSocket push)                     |

---

## `NotificationsApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient`.

### Methods

| Method                     | HTTP                              | Description                                    |
| -------------------------- | --------------------------------- | ---------------------------------------------- |
| `getNotifications(query?)` | `GET /notifications`              | Paginated list, optional unread filter         |
| `getUnreadCount()`         | `GET /notifications/unread-count` | Quick count for badge display                  |
| `createNotification(dto)`  | `POST /notifications`             | Create a notification (typically backend-only) |
| `markAsRead(id)`           | `PATCH /notifications/:id/read`   | Mark a single notification as read             |
| `markManyAsRead(dto)`      | `PATCH /notifications/read`       | Bulk mark as read by ID list                   |
| `deleteNotification(id)`   | `DELETE /notifications/:id`       | Permanently delete a notification              |

All methods return `Observable<T>` (or `Observable<void>` for mutations).

### Usage

```ts
import { NotificationsApi } from '@org/notifications/data-access';

providers: [
  NotificationsApi,
  { provide: API_BASE_URL, useValue: environment.apiUrl },
];

// Notification bell badge
this.#notificationsApi
  .getUnreadCount()
  .subscribe(({ count }) => this.unreadCount.set(count));

// Notification feed
this.#notificationsApi
  .getNotifications({ orgId, unreadOnly: false, limit: 10 })
  .subscribe((list) => this.notifications.set(list));

// Mark all as read
this.#notificationsApi
  .markManyAsRead({ ids: allIds })
  .subscribe(() => this.unreadCount.set(0));
```

---

## File structure

```
src/lib/
  notifications.api.ts        — NotificationsApi (HTTP)
  notifications.api.types.ts  — type aliases from OpenAPI schema
src/index.ts                  — public exports
```

---

## `NotificationsSocketService`

Root-level singleton. Requires `API_BASE_URL` and `AuthService` (Auth0).

Opens a Socket.IO connection to the backend's `/notifications` namespace. Authentication is performed at connection time: the service silently retrieves the Auth0 access token and passes it via `{ auth: { token } }` in the socket handshake — matching the backend's `WsJwtGuard` contract.

### Properties

| Property        | Type                             | Description                                      |
| --------------- | -------------------------------- | ------------------------------------------------ |
| `notification$` | `Observable<NotificationRecord>` | Emits on every `notification:new` server event   |
| `unreadCount$`  | `Observable<UnreadCountPayload>` | Emits on every `notification:unread-count` event |

### Methods

| Method         | Description                                                                        |
| -------------- | ---------------------------------------------------------------------------------- |
| `connect()`    | Opens the WebSocket. Idempotent — safe to call multiple times. No-op if connected. |
| `disconnect()` | Closes the socket and releases the reference.                                      |

If `getAccessTokenSilently()` fails (e.g. session expired) the service silently skips the connection and the component degrades gracefully to HTTP-only operation.

### Usage

```ts
import {
  NotificationsSocketService,
  NotificationRecord,
} from '@org/notifications/data-access';

@Component({ ... })
export class NotificationsComponent implements OnInit, OnDestroy {
  readonly #socket = inject(NotificationsSocketService);
  readonly #subs = new Subscription();

  ngOnInit(): void {
    this.#socket.connect();

    this.#subs.add(
      this.#socket.notification$.subscribe((n) => this.#onRealtimeNotification(n)),
    );
    this.#subs.add(
      this.#socket.unreadCount$.subscribe(({ count }) => this.unreadCount.set(count)),
    );
  }

  ngOnDestroy(): void {
    this.#subs.unsubscribe();
    // The service's own ngOnDestroy disconnects the socket and completes streams.
  }
}
```

### Backend contract

| Socket event                 | Direction       | Payload              |
| ---------------------------- | --------------- | -------------------- |
| `notification:new`           | server → client | `NotificationRecord` |
| `notification:unread-count`  | server → client | `{ count: number }`  |
| `notification:get-all`       | client → server | —                    |
| `notification:mark-read`     | client → server | `{ id: string }`     |
| `notification:mark-all-read` | client → server | —                    |

The client is automatically joined to `user:<userId>` and `org:<orgId>` rooms upon connection. The server uses a Redis adapter for cross-pod fanout.

---

## File structure

```
src/lib/
  notifications.api.ts             — NotificationsApi (HTTP)
  notifications.api.types.ts       — type aliases from OpenAPI schema
  notifications.socket.service.ts  — NotificationsSocketService (WebSocket)
src/index.ts                       — public exports
```
