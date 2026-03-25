# @org/notifications/data-access

HTTP client for the in-app notifications endpoint (`/notifications`).

**Import path**: `@org/notifications/data-access`

---

## Exports

| Symbol                   | Kind    | Description                                              |
| ------------------------ | ------- | -------------------------------------------------------- |
| `NotificationsApi`       | Service | HTTP client for all notification operations              |
| `CreateNotificationDto`  | Type    | Payload for creating a notification (internal/admin use) |
| `MarkManyReadDto`        | Type    | Payload for bulk mark-as-read                            |
| `GetNotificationsParams` | Type    | Query params: `orgId`, `unreadOnly`, `limit`, `offset`   |
| `NotificationList`       | Type    | Paginated notification list                              |
| `UnreadCountResponse`    | Type    | `{ count: number }`                                      |

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
