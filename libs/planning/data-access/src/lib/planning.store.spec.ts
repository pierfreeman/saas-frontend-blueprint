import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PlanningStore } from './planning.store';
import { PlanningApi } from './planning.api';

const ORG_ID = 'org-1';
const EVENT_ID = 'evt-1';
const FROM = '2026-04-01T00:00:00.000Z';
const TO = '2026-04-30T23:59:59.999Z';

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
} as never;

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
} as never;

const mockAttendee = {
  id: 'att-1',
  eventId: EVENT_ID,
  userId: 'user-1',
  status: 'ACCEPTED',
  createdAt: '2026-03-28T00:00:00.000Z',
  updatedAt: '2026-03-28T00:00:00.000Z',
} as never;

const mockException = {
  id: 'exc-1',
  eventId: EVENT_ID,
  originalStartUtc: '2026-04-08T09:00:00.000Z',
  startUtc: null,
  endUtc: null,
  isCancelled: true,
  title: null,
  description: null,
  location: null,
  createdAt: '2026-03-28T00:00:00.000Z',
} as never;

function makeMockApi(overrides: Record<string, unknown> = {}) {
  return {
    listEvents: vi.fn(() => of([mockOccurrence])),
    getEvent: vi.fn(() => of(mockEventDetail)),
    createEvent: vi.fn(() => of(mockEventDetail)),
    updateEvent: vi.fn(() => of(mockEventDetail)),
    deleteEvent: vi.fn(() => of({ message: 'Event deleted' })),
    rsvp: vi.fn(() => of(mockAttendee)),
    createException: vi.fn(() => of(mockException)),
    ...overrides,
  } as unknown as PlanningApi;
}

describe('PlanningStore', () => {
  let store: PlanningStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PlanningApi, useValue: makeMockApi() }],
    });
    store = TestBed.inject(PlanningStore);
  });

  // ── Initial state ──────────────────────────────────────────────────────────
  it('starts with empty occurrences', () => {
    expect(store.occurrences()).toEqual([]);
  });

  it('starts with null selectedEvent', () => {
    expect(store.selectedEvent()).toBeNull();
  });

  it('starts with all loading flags false', () => {
    expect(store.loadingList()).toBe(false);
    expect(store.loadingDetail()).toBe(false);
    expect(store.loadingMutation()).toBe(false);
  });

  it('starts with null error', () => {
    expect(store.error()).toBeNull();
  });

  // ── loadOccurrences() ──────────────────────────────────────────────────────
  describe('loadOccurrences()', () => {
    it('populates occurrences signal on success', async () => {
      await store.loadOccurrences(ORG_ID, FROM, TO);
      expect(store.occurrences()).toHaveLength(1);
      expect(store.occurrences()[0]).toEqual(mockOccurrence);
    });

    it('sets loadingList to false after success', async () => {
      await store.loadOccurrences(ORG_ID, FROM, TO);
      expect(store.loadingList()).toBe(false);
    });

    it('stores error and resets loadingList on failure', async () => {
      const error = { status: 500, message: 'Server error' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PlanningApi,
            useValue: makeMockApi({
              listEvents: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(PlanningStore);
      await store.loadOccurrences(ORG_ID, FROM, TO);
      expect(store.error()).toEqual(error);
      expect(store.loadingList()).toBe(false);
    });
  });

  // ── loadEventDetail() ──────────────────────────────────────────────────────
  describe('loadEventDetail()', () => {
    it('populates selectedEvent signal on success', async () => {
      await store.loadEventDetail(ORG_ID, EVENT_ID);
      expect(store.selectedEvent()).toEqual(mockEventDetail);
    });

    it('sets loadingDetail to false after success', async () => {
      await store.loadEventDetail(ORG_ID, EVENT_ID);
      expect(store.loadingDetail()).toBe(false);
    });

    it('stores error on failure', async () => {
      const error = { status: 404, message: 'Not found' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PlanningApi,
            useValue: makeMockApi({
              getEvent: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(PlanningStore);
      await store.loadEventDetail(ORG_ID, EVENT_ID);
      expect(store.error()).toEqual(error);
    });
  });

  // ── createEvent() ──────────────────────────────────────────────────────────
  describe('createEvent()', () => {
    it('returns the created event and reloads occurrences', async () => {
      await store.loadOccurrences(ORG_ID, FROM, TO);
      const dto = { title: 'New', startUtc: FROM, endUtc: TO };
      const result = await store.createEvent(ORG_ID, dto as never);
      expect(result).toEqual(mockEventDetail);
      expect(store.loadingMutation()).toBe(false);
    });

    it('returns null and stores error on failure', async () => {
      const error = { status: 400, message: 'Bad request' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PlanningApi,
            useValue: makeMockApi({
              createEvent: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(PlanningStore);
      const result = await store.createEvent(ORG_ID, {} as never);
      expect(result).toBeNull();
      expect(store.error()).toEqual(error);
      expect(store.loadingMutation()).toBe(false);
    });
  });

  // ── updateEvent() ──────────────────────────────────────────────────────────
  describe('updateEvent()', () => {
    it('returns the updated event, refreshes selectedEvent, and reloads occurrences', async () => {
      await store.loadOccurrences(ORG_ID, FROM, TO);
      const dto = { title: 'Updated', version: 0 };
      const result = await store.updateEvent(ORG_ID, EVENT_ID, dto as never);
      expect(result).toEqual(mockEventDetail);
      expect(store.selectedEvent()).toEqual(mockEventDetail);
    });

    it('returns null and stores error on 409 conflict', async () => {
      const error = { status: 409, message: 'Conflict' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PlanningApi,
            useValue: makeMockApi({
              updateEvent: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(PlanningStore);
      const result = await store.updateEvent(ORG_ID, EVENT_ID, {
        version: 0,
      } as never);
      expect(result).toBeNull();
      expect(store.error()).toEqual(error);
    });
  });

  // ── deleteEvent() ──────────────────────────────────────────────────────────
  describe('deleteEvent()', () => {
    it('returns true, clears selectedEvent, and reloads occurrences', async () => {
      await store.loadOccurrences(ORG_ID, FROM, TO);
      await store.loadEventDetail(ORG_ID, EVENT_ID);
      const result = await store.deleteEvent(ORG_ID, EVENT_ID);
      expect(result).toBe(true);
      expect(store.selectedEvent()).toBeNull();
    });

    it('returns false and stores error on failure', async () => {
      const error = { status: 403, message: 'Forbidden' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PlanningApi,
            useValue: makeMockApi({
              deleteEvent: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(PlanningStore);
      const result = await store.deleteEvent(ORG_ID, EVENT_ID);
      expect(result).toBe(false);
      expect(store.error()).toEqual(error);
    });
  });

  // ── rsvp() ─────────────────────────────────────────────────────────────────
  describe('rsvp()', () => {
    it('returns the attendee and refreshes event detail', async () => {
      const result = await store.rsvp(ORG_ID, EVENT_ID, { status: 'ACCEPTED' });
      expect(result).toEqual(mockAttendee);
      expect(store.selectedEvent()).toEqual(mockEventDetail);
    });

    it('returns null and stores error on failure', async () => {
      const error = { status: 404, message: 'Not found' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PlanningApi,
            useValue: makeMockApi({
              rsvp: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(PlanningStore);
      const result = await store.rsvp(ORG_ID, EVENT_ID, { status: 'ACCEPTED' });
      expect(result).toBeNull();
      expect(store.error()).toEqual(error);
    });
  });

  // ── createException() ──────────────────────────────────────────────────────
  describe('createException()', () => {
    it('returns the exception and refreshes detail + occurrences', async () => {
      await store.loadOccurrences(ORG_ID, FROM, TO);
      const dto = {
        originalStartUtc: '2026-04-08T09:00:00.000Z',
        isCancelled: true,
      };
      const result = await store.createException(ORG_ID, EVENT_ID, dto);
      expect(result).toEqual(mockException);
      expect(store.selectedEvent()).toEqual(mockEventDetail);
    });

    it('returns null and stores error on failure', async () => {
      const error = { status: 400, message: 'Not recurring' };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PlanningApi,
            useValue: makeMockApi({
              createException: vi.fn(() => throwError(() => error)),
            }),
          },
        ],
      });
      store = TestBed.inject(PlanningStore);
      const result = await store.createException(ORG_ID, EVENT_ID, {
        originalStartUtc: 'x',
      });
      expect(result).toBeNull();
      expect(store.error()).toEqual(error);
    });
  });

  // ── flush() ────────────────────────────────────────────────────────────────
  describe('flush()', () => {
    it('resets all state to initial values', async () => {
      await store.loadOccurrences(ORG_ID, FROM, TO);
      await store.loadEventDetail(ORG_ID, EVENT_ID);
      store.flush();
      expect(store.occurrences()).toEqual([]);
      expect(store.selectedEvent()).toBeNull();
      expect(store.loadingList()).toBe(false);
      expect(store.loadingDetail()).toBe(false);
      expect(store.loadingMutation()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });
});
