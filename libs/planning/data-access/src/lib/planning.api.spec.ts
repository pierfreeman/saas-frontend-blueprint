import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PlanningApi } from './planning.api';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const BASE = 'https://api.test';
const ORG_ID = 'org-1';
const EVENT_ID = 'evt-1';

const mockOccurrence = {
  eventId: EVENT_ID,
  originalStartUtc: '2026-04-01T09:00:00.000Z',
  startUtc: '2026-04-01T09:00:00.000Z',
  endUtc: '2026-04-01T10:00:00.000Z',
  title: 'Team Sync',
  description: null,
  location: null,
  isAllDay: false,
  eventTimezone: 'UTC',
  rrule: null,
  isRecurring: false,
  isException: false,
  isCancelled: false,
  createdByUserId: 'user-1',
  orgId: ORG_ID,
  version: 0,
  attendees: [],
};

const mockEventDetail = {
  id: EVENT_ID,
  orgId: ORG_ID,
  createdByUserId: 'user-1',
  title: 'Team Sync',
  description: null,
  location: null,
  startUtc: '2026-04-01T09:00:00.000Z',
  endUtc: '2026-04-01T10:00:00.000Z',
  isAllDay: false,
  eventTimezone: 'UTC',
  rrule: null,
  rruleUntilUtc: null,
  version: 0,
  metadata: null,
  deletedAt: null,
  createdAt: '2026-03-28T00:00:00.000Z',
  updatedAt: '2026-03-28T00:00:00.000Z',
  attendees: [],
  exceptions: [],
};

const mockAttendee = {
  id: 'att-1',
  eventId: EVENT_ID,
  userId: 'user-1',
  status: 'YES' as const,
  createdAt: '2026-03-28T00:00:00.000Z',
  updatedAt: '2026-03-28T00:00:00.000Z',
};

const mockException = {
  id: 'exc-1',
  eventId: EVENT_ID,
  originalStartUtc: '2026-04-08T09:00:00.000Z',
  startUtc: '2026-04-08T10:00:00.000Z',
  endUtc: '2026-04-08T11:00:00.000Z',
  isCancelled: false,
  title: null,
  description: null,
  location: null,
  createdAt: '2026-03-28T00:00:00.000Z',
};

describe('PlanningApi', () => {
  let api: PlanningApi;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(PlanningApi);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('listEvents()', () => {
    it('sends GET /organizations/:orgId/planning/events with from/to params', () => {
      api
        .listEvents(ORG_ID, {
          from: '2026-04-01T00:00:00Z',
          to: '2026-04-30T23:59:59Z',
        })
        .subscribe();
      const req = controller.expectOne(
        (r) =>
          r.url === `${BASE}/organizations/${ORG_ID}/planning/events` &&
          r.params.get('from') === '2026-04-01T00:00:00Z' &&
          r.params.get('to') === '2026-04-30T23:59:59Z',
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockOccurrence]);
    });

    it('returns the list of event occurrences', () => {
      let result: unknown;
      api
        .listEvents(ORG_ID, {
          from: '2026-04-01T00:00:00Z',
          to: '2026-04-30T23:59:59Z',
        })
        .subscribe((list) => (result = list));
      controller
        .expectOne((r) => r.url.includes('/planning/events'))
        .flush([mockOccurrence]);
      expect(result).toEqual([mockOccurrence]);
    });
  });

  describe('listConflicts()', () => {
    it('sends GET /organizations/:orgId/planning/events/conflicts with start/end params', () => {
      api
        .listConflicts(ORG_ID, {
          start: '2026-04-01T09:00:00Z',
          end: '2026-04-01T10:00:00Z',
        })
        .subscribe();
      const req = controller.expectOne(
        (r) =>
          r.url ===
            `${BASE}/organizations/${ORG_ID}/planning/events/conflicts` &&
          r.params.get('start') === '2026-04-01T09:00:00Z' &&
          r.params.get('end') === '2026-04-01T10:00:00Z',
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockOccurrence]);
    });

    it('returns the list of conflicting occurrences', () => {
      let result: unknown;
      api
        .listConflicts(ORG_ID, {
          start: '2026-04-01T09:00:00Z',
          end: '2026-04-01T10:00:00Z',
        })
        .subscribe((list) => (result = list));
      controller
        .expectOne((r) => r.url.includes('/planning/events/conflicts'))
        .flush([mockOccurrence]);
      expect(result).toEqual([mockOccurrence]);
    });
  });

  describe('getEvent()', () => {
    it('sends GET /organizations/:orgId/planning/events/:id', () => {
      api.getEvent(ORG_ID, EVENT_ID).subscribe();
      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/planning/events/${EVENT_ID}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockEventDetail);
    });

    it('returns the event detail', () => {
      let result: unknown;
      api.getEvent(ORG_ID, EVENT_ID).subscribe((d) => (result = d));
      controller
        .expectOne(
          `${BASE}/organizations/${ORG_ID}/planning/events/${EVENT_ID}`,
        )
        .flush(mockEventDetail);
      expect(result).toEqual(mockEventDetail);
    });
  });

  describe('createEvent()', () => {
    it('sends POST /organizations/:orgId/planning/events with the dto', () => {
      const dto = {
        title: 'Team Sync',
        startUtc: '2026-04-01T09:00:00Z',
        endUtc: '2026-04-01T10:00:00Z',
      };
      api.createEvent(ORG_ID, dto).subscribe();
      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/planning/events`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockEventDetail);
    });
  });

  describe('updateEvent()', () => {
    it('sends PATCH /organizations/:orgId/planning/events/:id with the dto', () => {
      const dto = { title: 'Updated Sync', version: 0 };
      api.updateEvent(ORG_ID, EVENT_ID, dto).subscribe();
      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/planning/events/${EVENT_ID}`,
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush(mockEventDetail);
    });
  });

  describe('deleteEvent()', () => {
    it('sends DELETE /organizations/:orgId/planning/events/:id', () => {
      api.deleteEvent(ORG_ID, EVENT_ID).subscribe();
      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/planning/events/${EVENT_ID}`,
      );
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Event deleted' });
    });
  });

  describe('rsvp()', () => {
    it('sends POST /organizations/:orgId/planning/events/:id/rsvp with dto', () => {
      const dto = { status: 'YES' as const };
      api.rsvp(ORG_ID, EVENT_ID, dto).subscribe();
      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/planning/events/${EVENT_ID}/rsvp`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockAttendee);
    });
  });

  describe('createException()', () => {
    it('sends POST /organizations/:orgId/planning/events/:id/exceptions with dto', () => {
      const dto = {
        originalStartUtc: '2026-04-08T09:00:00.000Z',
        isCancelled: true,
      };
      api.createException(ORG_ID, EVENT_ID, dto).subscribe();
      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/planning/events/${EVENT_ID}/exceptions`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockException);
    });
  });

  describe('splitSeries()', () => {
    it('sends POST /organizations/:orgId/planning/events/:id/split with dto', () => {
      const dto = {
        originalStartUtc: '2026-04-08T09:00:00.000Z',
        version: 1,
        title: 'New tail title',
      };
      api.splitSeries(ORG_ID, EVENT_ID, dto).subscribe();
      const req = controller.expectOne(
        `${BASE}/organizations/${ORG_ID}/planning/events/${EVENT_ID}/split`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockEventDetail);
    });

    it('returns the newly created tail EventDetail', () => {
      let result: unknown;
      api
        .splitSeries(ORG_ID, EVENT_ID, {
          originalStartUtc: '2026-04-08T09:00:00.000Z',
          version: 1,
        })
        .subscribe((r) => (result = r));
      controller
        .expectOne(
          `${BASE}/organizations/${ORG_ID}/planning/events/${EVENT_ID}/split`,
        )
        .flush(mockEventDetail);
      expect(result).toEqual(mockEventDetail);
    });
  });
});
