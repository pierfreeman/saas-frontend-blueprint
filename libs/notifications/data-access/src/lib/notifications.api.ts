import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type {
  CreateNotificationDto,
  MarkManyReadDto,
  GetNotificationsParams,
  NotificationList,
  UnreadCountResponse,
} from './notifications.api.types';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  getNotifications(
    query?: GetNotificationsParams,
  ): Observable<NotificationList> {
    let params = new HttpParams();
    if (query?.orgId !== undefined) params = params.set('orgId', query.orgId);
    if (query?.unreadOnly !== undefined)
      params = params.set('unreadOnly', String(query.unreadOnly));
    if (query?.limit !== undefined) params = params.set('limit', query.limit);
    if (query?.offset !== undefined)
      params = params.set('offset', query.offset);
    return this.#http.get<NotificationList>(`${this.#base}/notifications`, {
      params,
    });
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.#http.get<UnreadCountResponse>(
      `${this.#base}/notifications/unread-count`,
    );
  }

  createNotification(dto: CreateNotificationDto): Observable<void> {
    return this.#http.post<void>(`${this.#base}/notifications`, dto);
  }

  markAsRead(id: string): Observable<void> {
    return this.#http.patch<void>(`${this.#base}/notifications/${id}/read`, {});
  }

  markManyAsRead(dto: MarkManyReadDto): Observable<void> {
    return this.#http.patch<void>(`${this.#base}/notifications/read`, dto);
  }

  deleteNotification(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/notifications/${id}`);
  }
}
