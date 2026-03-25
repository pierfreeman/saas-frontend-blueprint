import type { components } from '@org/shared/util-types';

export type CreateNotificationDto =
  components['schemas']['CreateNotificationDto'];
export type MarkManyReadDto = components['schemas']['MarkManyReadDto'];

export interface GetNotificationsParams {
  orgId?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

/** A single notification record as returned by GET /notifications. */
export interface NotificationRecord {
  id: string;
  orgId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  /** ISO 8601 — null means the notification has not been read yet. */
  readAt: string | null;
  createdAt: string;
}

export type NotificationList = NotificationRecord[];

export interface UnreadCountResponse {
  count?: number;
}
