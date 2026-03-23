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

/** Typed as unknown[] until the backend OpenAPI schema is enriched for this endpoint. */
export type NotificationList = unknown[];

export interface UnreadCountResponse {
  count?: number;
}
