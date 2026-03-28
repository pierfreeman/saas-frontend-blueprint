/**
 * Planning API types — derived from the backend response DTOs.
 * These types mirror the backend planning controller's request/response shapes.
 * When backend swagger.json generation is available, these can be replaced with
 * OpenAPI-generated types via: components['schemas']['...'] and operations['...']
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type RSVPStatus = 'YES' | 'NO' | 'MAYBE' | 'PENDING';

// ── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateEventDto {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  isAllDay?: boolean;
  eventTimezone?: string;
  rrule?: string;
  rruleUntilUtc?: string;
  attendeeIds?: string[];
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  isAllDay?: boolean;
  eventTimezone?: string;
  rrule?: string;
  rruleUntilUtc?: string;
  version: number;
  /** Replaces the full invited-attendee list (set semantics). Creator is always kept. */
  attendeeIds?: string[];
  /** When true, all current attendees receive an "event updated" notification. */
  notifyAttendees?: boolean;
}

export interface RsvpDto {
  status: RSVPStatus;
}

export interface CreateEventExceptionDto {
  originalStartUtc: string;
  startUtc?: string;
  endUtc?: string;
  isCancelled?: boolean;
  title?: string;
  description?: string;
  location?: string;
}

export interface ListEventsParams {
  from: string;
  to: string;
}

export interface ListConflictsParams {
  start: string;
  end: string;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface EventAttendee {
  id: string;
  eventId: string;
  userId: string;
  status: RSVPStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventException {
  id: string;
  eventId: string;
  originalStartUtc: string;
  startUtc: string | null;
  endUtc: string | null;
  isCancelled: boolean;
  title: string | null;
  description: string | null;
  location: string | null;
  createdAt: string;
}

/** Full event with attendees and exceptions — returned by GET /:id, POST /, PATCH /:id */
export interface EventDetail {
  id: string;
  orgId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  location: string | null;
  startUtc: string;
  endUtc: string;
  isAllDay: boolean;
  eventTimezone: string;
  rrule: string | null;
  rruleUntilUtc: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  attendees: EventAttendee[];
  exceptions: EventException[];
}

/** Expanded occurrence — returned by GET / (list with from/to range query) */
export interface EventOccurrence {
  eventId: string;
  originalStartUtc: string;
  startUtc: string;
  endUtc: string;
  title: string;
  description: string | null;
  location: string | null;
  isAllDay: boolean;
  eventTimezone: string;
  rrule: string | null;
  isRecurring: boolean;
  isException: boolean;
  isCancelled: boolean;
  createdByUserId: string;
  orgId: string;
  version: number;
  attendees: EventAttendee[];
}

export interface DeleteEventResponse {
  message: string;
}
