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
  });
});
