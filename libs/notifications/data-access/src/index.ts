export { NotificationsApi } from './lib/notifications.api';
export {
  NotificationsSocketService,
  SOCKET_IO_FACTORY,
} from './lib/notifications.socket.service';
export type { UnreadCountPayload } from './lib/notifications.socket.service';
export type {
  CreateNotificationDto,
  MarkManyReadDto,
  GetNotificationsParams,
  NotificationRecord,
  NotificationList,
  UnreadCountResponse,
} from './lib/notifications.api.types';
