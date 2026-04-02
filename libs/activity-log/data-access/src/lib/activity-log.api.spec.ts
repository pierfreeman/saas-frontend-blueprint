import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivityLogApi } from './activity-log.api';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const BASE = 'https://api.test';
const ORG_ID = 'org-1';

const mockActivityLog = [
  {
    id: 'log-1',
    orgId: ORG_ID,
    action: 'USER_INVITED',
    entityType: 'MEMBERSHIP',
    entityId: 'mem-1',
    actorUserId: 'user-1',
    metadata: { email: 'test@example.com' },
    createdAt: '2026-03-29T10:00:00.000Z',
  },
  {
    id: 'log-2',
    orgId: ORG_ID,
    action: 'FILE_UPLOADED',
    entityType: 'FILE',
    entityId: 'file-1',
    actorUserId: 'user-2',
    metadata: { filename: 'document.pdf' },
    createdAt: '2026-03-29T11:00:00.000Z',
  },
];

describe('ActivityLogApi', () => {
  let api: ActivityLogApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(ActivityLogApi);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('getActivityLog()', () => {
    it('issues GET /organizations/:orgId/activity-log without query params', () => {
      api.getActivityLog(ORG_ID).subscribe();

      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockActivityLog);
    });

    it('issues GET with action filter', () => {
      api.getActivityLog(ORG_ID, { action: 'USER_INVITED' }).subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('action')).toBe('USER_INVITED');
      req.flush([mockActivityLog[0]]);
    });

    it('issues GET with fromDate filter', () => {
      const fromDate = '2026-03-01T00:00:00.000Z';
      api.getActivityLog(ORG_ID, { fromDate }).subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.params.get('fromDate')).toBe(fromDate);
      req.flush(mockActivityLog);
    });

    it('issues GET with toDate filter', () => {
      const toDate = '2026-03-31T23:59:59.999Z';
      api.getActivityLog(ORG_ID, { toDate }).subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.params.get('toDate')).toBe(toDate);
      req.flush(mockActivityLog);
    });

    it('issues GET with limit and offset for pagination', () => {
      api.getActivityLog(ORG_ID, { limit: 20, offset: 40 }).subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('offset')).toBe('40');
      req.flush(mockActivityLog);
    });

    it('issues GET with all query params combined', () => {
      const params = {
        action: 'FILE_UPLOADED',
        fromDate: '2026-03-01T00:00:00.000Z',
        toDate: '2026-03-31T23:59:59.999Z',
        limit: 50,
        offset: 0,
      };
      api.getActivityLog(ORG_ID, params).subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.params.get('action')).toBe('FILE_UPLOADED');
      expect(req.request.params.get('fromDate')).toBe(
        '2026-03-01T00:00:00.000Z',
      );
      expect(req.request.params.get('toDate')).toBe('2026-03-31T23:59:59.999Z');
      expect(req.request.params.get('limit')).toBe('50');
      expect(req.request.params.get('offset')).toBe('0');
      req.flush([]);
    });

    it('issues GET with actorId filter', () => {
      api.getActivityLog(ORG_ID, { actorId: 'user-abc' }).subscribe();

      const req = controller.expectOne(
        (r) => r.url === `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.params.get('actorId')).toBe('user-abc');
      req.flush({ logs: [], total: 0 });
    });

    it('does not include actorId param when not provided', () => {
      api.getActivityLog(ORG_ID).subscribe();

      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.params.has('actorId')).toBe(false);
      req.flush({ logs: [], total: 0 });
    });

    it('uses the injected API_BASE_URL token', () => {
      api.getActivityLog(ORG_ID).subscribe();

      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      expect(req.request.url).toBe(
        `${BASE}/organizations/${ORG_ID}/activity-log`,
      );
      req.flush(mockActivityLog);
    });
  });
});
