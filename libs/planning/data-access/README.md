# @saas-frontend/planning/data-access

HTTP client and signals-based store for the org planning/calendar endpoints.

**Import path**: `@saas-frontend/planning/data-access`

---

## Exports

| Symbol                    | Kind    | Description                                                                                       |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `PlanningApi`             | Service | HTTP client for all planning operations                                                           |
| `PlanningStore`           | Store   | Signals-based state management (no NgRx)                                                          |
| `CreateEventDto`          | Type    | Payload for creating a new event (includes optional `reminderMinutes: 1–1440`)                    |
| `UpdateEventDto`          | Type    | Payload for updating an event (must include `version`; supports `reminderMinutes: null` to clear) |
| `RsvpDto`                 | Type    | Payload for submitting an RSVP (`status`: ACCEPTED/DECLINED/TENTATIVE)                            |
| `CreateEventExceptionDto` | Type    | Payload for overriding a single occurrence of a recurring event                                   |
| `ListEventsParams`        | Type    | Query params for `listEvents` (`from`, `to`)                                                      |
| `ListConflictsParams`     | Type    | Query params for `listConflicts` (`start`, `end`)                                                 |
| `EventDetail`             | Type    | Full event shape returned by `getEvent` (includes `reminderMinutes: number \| null`)              |
| `EventOccurrence`         | Type    | Expanded occurrence shape returned by list endpoints                                              |
| `EventAttendee`           | Type    | Attendee shape (userId, status, …)                                                                |
| `EventException`          | Type    | Single-occurrence exception shape                                                                 |
| `DeleteEventResponse`     | Type    | Delete response (`{ id }`)                                                                        |
| `RSVPStatus`              | Type    | `'ACCEPTED' \| 'DECLINED' \| 'TENTATIVE'`                                                         |

---

## `PlanningApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient`. All methods return `Observable<T>`.

### Methods

| Method                                 | HTTP                                                              | Description                                                     |
| -------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `listEvents(orgId, params)`            | `GET /organizations/:orgId/planning/events?from=&to=`             | List expanded occurrences in a date range (RRULE expanded)      |
| `listConflicts(orgId, params)`         | `GET /organizations/:orgId/planning/events/conflicts?start=&end=` | List occurrences overlapping a range for the current user       |
| `getEvent(orgId, id)`                  | `GET /organizations/:orgId/planning/events/:id`                   | Get full event detail with attendees and exceptions             |
| `createEvent(orgId, dto)`              | `POST /organizations/:orgId/planning/events`                      | Create a new event (optional RRULE for recurring)               |
| `updateEvent(orgId, id, dto)`          | `PATCH /organizations/:orgId/planning/events/:id`                 | Update an event; `dto.version` must match current version (OCC) |
| `deleteEvent(orgId, id)`               | `DELETE /organizations/:orgId/planning/events/:id`                | Soft-delete an event                                            |
| `rsvp(orgId, eventId, dto)`            | `POST /organizations/:orgId/planning/events/:id/rsvp`             | Upsert RSVP status for the authenticated user                   |
| `createException(orgId, eventId, dto)` | `POST /organizations/:orgId/planning/events/:id/exceptions`       | Override or cancel a single occurrence of a recurring event     |

### Conflict detection semantics

`listConflicts` uses a half-open interval `[start, end)`. Back-to-back events (end of A == start of B) are **not** conflicts. Only occurrences where the current user is creator or attendee are returned.

---

## `PlanningStore`

Signals-based store (no NgRx). Wraps `PlanningApi` and exposes reactive state.

### Signals

| Signal            | Type                          | Description                                   |
| ----------------- | ----------------------------- | --------------------------------------------- |
| `occurrences`     | `Signal<EventOccurrence[]>`   | Expanded occurrences for the current viewport |
| `selectedEvent`   | `Signal<EventDetail \| null>` | Currently fetched event detail                |
| `loadingList`     | `Signal<boolean>`             | `true` while `listEvents` is in flight        |
| `loadingDetail`   | `Signal<boolean>`             | `true` while `getEvent` is in flight          |
| `loadingMutation` | `Signal<boolean>`             | `true` during create/update/delete/rsvp       |
| `error`           | `Signal<unknown>`             | Last error from any operation, or `null`      |

### Methods

| Method                            | Description                                                             |
| --------------------------------- | ----------------------------------------------------------------------- |
| `loadOccurrences(orgId, params)`  | Fetches and sets `occurrences`                                          |
| `loadEventDetail(orgId, id)`      | Fetches and sets `selectedEvent`                                        |
| `createEvent(orgId, dto)`         | Creates event, refreshes `selectedEvent`; returns `EventDetail \| null` |
| `updateEvent(orgId, id, dto)`     | Updates event, refreshes `selectedEvent`; returns `EventDetail \| null` |
| `deleteEvent(orgId, id)`          | Deletes event, clears `selectedEvent`; returns `boolean`                |
| `rsvp(orgId, eventId, dto)`       | Updates RSVP status; returns `EventAttendee \| null`                    |
| `createException(orgId, id, dto)` | Creates an exception; returns `EventException \| null`                  |

---

## Usage

```ts
import {
  PlanningApi,
  PlanningStore,
} from '@saas-frontend/planning/data-access';

// In route providers (store is providedIn: 'root', api is root-level)
providers: [{ provide: API_BASE_URL, useValue: environment.apiUrl }];

// Load calendar occurrences
this.store.loadOccurrences(orgId, {
  from: '2026-03-01T00:00:00Z',
  to: '2026-04-01T00:00:00Z',
});

// Check conflicts before saving
this.#api
  .listConflicts(orgId, { start: form.startUtc, end: form.endUtc })
  .subscribe((conflicts) => console.log(conflicts.length, 'conflicts'));
```
