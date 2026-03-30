import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { NotificationsApi } from './notifications.api';

const BASE = 'https://api.test';

describe('NotificationsApi', () => {
  let api: NotificationsApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });

    api = TestBed.inject(NotificationsApi);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('getNotifications()', () => {
    it('does not send unreadOnly when unreadOnly is false', () => {
      api
        .getNotifications({
          orgId: 'org-1',
          unreadOnly: false,
          limit: 20,
          offset: 0,
        })
        .subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/notifications`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('orgId')).toBe('org-1');
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('offset')).toBe('0');
      expect(req.request.params.has('unreadOnly')).toBe(false);

      req.flush([]);
    });

    it('sends unreadOnly=true only when explicitly true', () => {
      api
        .getNotifications({
          orgId: 'org-1',
          unreadOnly: true,
        })
        .subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/notifications`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('orgId')).toBe('org-1');
      expect(req.request.params.get('unreadOnly')).toBe('true');

      req.flush([]);
    });

    it('sends no query params when called with no arguments', () => {
      api.getNotifications().subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/notifications`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toHaveLength(0);

      req.flush([]);
    });
  });

  describe('getUnreadCount()', () => {
    it('sends GET to /notifications/unread-count', () => {
      api.getUnreadCount().subscribe();

      const req = controller.expectOne(`${BASE}/notifications/unread-count`);
      expect(req.request.method).toBe('GET');

      req.flush({ count: 3 });
    });
  });

  describe('createNotification()', () => {
    it('sends POST to /notifications with the dto', () => {
      const dto = {
        type: 'test',
        title: 'Test',
        orgId: 'org-1',
        userId: 'u-1',
      };
      api.createNotification(dto as never).subscribe();

      const req = controller.expectOne(`${BASE}/notifications`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);

      req.flush(null);
    });
  });

  describe('markAsRead()', () => {
    it('sends PATCH to /notifications/:id/read', () => {
      api.markAsRead('notif-42').subscribe();

      const req = controller.expectOne(`${BASE}/notifications/notif-42/read`);
      expect(req.request.method).toBe('PATCH');

      req.flush(null);
    });
  });

  describe('markManyAsRead()', () => {
    it('sends PATCH to /notifications/read with the dto', () => {
      const dto = { ids: ['n-1', 'n-2'] };
      api.markManyAsRead(dto as never).subscribe();

      const req = controller.expectOne(`${BASE}/notifications/read`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);

      req.flush(null);
    });
  });

  describe('deleteNotification()', () => {
    it('sends DELETE to /notifications/:id', () => {
      api.deleteNotification('notif-99').subscribe();

      const req = controller.expectOne(`${BASE}/notifications/notif-99`);
      expect(req.request.method).toBe('DELETE');

      req.flush(null);
    });
  });
});
