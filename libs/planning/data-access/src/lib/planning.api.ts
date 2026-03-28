import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import type {
  CreateEventDto,
  UpdateEventDto,
  RsvpDto,
  CreateEventExceptionDto,
  ListEventsParams,
  ListConflictsParams,
  EventDetail,
  EventOccurrence,
  EventAttendee,
  EventException,
  DeleteEventResponse,
} from './planning.api.types';

@Injectable({ providedIn: 'root' })
export class PlanningApi {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  listEvents(
    orgId: string,
    params: ListEventsParams,
  ): Observable<EventOccurrence[]> {
    const httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to);
    return this.#http.get<EventOccurrence[]>(
      `${this.#base}/organizations/${orgId}/planning/events`,
      { params: httpParams },
    );
  }

  listConflicts(
    orgId: string,
    params: ListConflictsParams,
  ): Observable<EventOccurrence[]> {
    const httpParams = new HttpParams()
      .set('start', params.start)
      .set('end', params.end);
    return this.#http.get<EventOccurrence[]>(
      `${this.#base}/organizations/${orgId}/planning/events/conflicts`,
      { params: httpParams },
    );
  }

  getEvent(orgId: string, id: string): Observable<EventDetail> {
    return this.#http.get<EventDetail>(
      `${this.#base}/organizations/${orgId}/planning/events/${id}`,
    );
  }

  createEvent(orgId: string, dto: CreateEventDto): Observable<EventDetail> {
    return this.#http.post<EventDetail>(
      `${this.#base}/organizations/${orgId}/planning/events`,
      dto,
    );
  }

  updateEvent(
    orgId: string,
    id: string,
    dto: UpdateEventDto,
  ): Observable<EventDetail> {
    return this.#http.patch<EventDetail>(
      `${this.#base}/organizations/${orgId}/planning/events/${id}`,
      dto,
    );
  }

  deleteEvent(orgId: string, id: string): Observable<DeleteEventResponse> {
    return this.#http.delete<DeleteEventResponse>(
      `${this.#base}/organizations/${orgId}/planning/events/${id}`,
    );
  }

  rsvp(
    orgId: string,
    eventId: string,
    dto: RsvpDto,
  ): Observable<EventAttendee> {
    return this.#http.post<EventAttendee>(
      `${this.#base}/organizations/${orgId}/planning/events/${eventId}/rsvp`,
      dto,
    );
  }

  createException(
    orgId: string,
    eventId: string,
    dto: CreateEventExceptionDto,
  ): Observable<EventException> {
    return this.#http.post<EventException>(
      `${this.#base}/organizations/${orgId}/planning/events/${eventId}/exceptions`,
      dto,
    );
  }
}
