import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PlanningApi } from './planning.api';
import type {
  CreateEventDto,
  UpdateEventDto,
  RsvpDto,
  CreateEventExceptionDto,
  EventDetail,
  EventOccurrence,
  EventAttendee,
  EventException,
} from './planning.api.types';
import type { ApiError } from '@saas-frontend/shared/util-error';

@Injectable({ providedIn: 'root' })
export class PlanningStore {
  readonly #api = inject(PlanningApi);

  // ── Persisted range for reload-after-mutation ──────────────────────────────
  #currentOrgId: string | null = null;
  #currentFrom: string | null = null;
  #currentTo: string | null = null;

  // ── State ──────────────────────────────────────────────────────────────────
  readonly occurrences = signal<EventOccurrence[]>([]);
  readonly selectedEvent = signal<EventDetail | null>(null);
  readonly loadingList = signal<boolean>(false);
  readonly loadingDetail = signal<boolean>(false);
  readonly loadingMutation = signal<boolean>(false);
  readonly error = signal<ApiError | null>(null);

  // ── Methods ────────────────────────────────────────────────────────────────

  async loadOccurrences(
    orgId: string,
    from: string,
    to: string,
  ): Promise<void> {
    this.#currentOrgId = orgId;
    this.#currentFrom = from;
    this.#currentTo = to;
    this.loadingList.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(
        this.#api.listEvents(orgId, { from, to }),
      );
      this.occurrences.set(list);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loadingList.set(false);
    }
  }

  async loadEventDetail(orgId: string, eventId: string): Promise<void> {
    this.loadingDetail.set(true);
    this.error.set(null);
    try {
      const detail = await firstValueFrom(this.#api.getEvent(orgId, eventId));
      this.selectedEvent.set(detail);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loadingDetail.set(false);
    }
  }

  async createEvent(
    orgId: string,
    dto: CreateEventDto,
  ): Promise<EventDetail | null> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      const created = await firstValueFrom(this.#api.createEvent(orgId, dto));
      await this.#reloadOccurrences();
      return created;
    } catch (err) {
      this.error.set(err as ApiError);
      return null;
    } finally {
      this.loadingMutation.set(false);
    }
  }

  async updateEvent(
    orgId: string,
    id: string,
    dto: UpdateEventDto,
  ): Promise<EventDetail | null> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(
        this.#api.updateEvent(orgId, id, dto),
      );
      this.selectedEvent.set(updated);
      await this.#reloadOccurrences();
      return updated;
    } catch (err) {
      this.error.set(err as ApiError);
      return null;
    } finally {
      this.loadingMutation.set(false);
    }
  }

  async deleteEvent(orgId: string, id: string): Promise<boolean> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.#api.deleteEvent(orgId, id));
      this.selectedEvent.set(null);
      await this.#reloadOccurrences();
      return true;
    } catch (err) {
      this.error.set(err as ApiError);
      return false;
    } finally {
      this.loadingMutation.set(false);
    }
  }

  async rsvp(
    orgId: string,
    eventId: string,
    dto: RsvpDto,
  ): Promise<EventAttendee | null> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      const attendee = await firstValueFrom(
        this.#api.rsvp(orgId, eventId, dto),
      );
      await this.loadEventDetail(orgId, eventId);
      return attendee;
    } catch (err) {
      this.error.set(err as ApiError);
      return null;
    } finally {
      this.loadingMutation.set(false);
    }
  }

  async createException(
    orgId: string,
    eventId: string,
    dto: CreateEventExceptionDto,
  ): Promise<EventException | null> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      const exception = await firstValueFrom(
        this.#api.createException(orgId, eventId, dto),
      );
      await this.loadEventDetail(orgId, eventId);
      await this.#reloadOccurrences();
      return exception;
    } catch (err) {
      this.error.set(err as ApiError);
      return null;
    } finally {
      this.loadingMutation.set(false);
    }
  }

  flush(): void {
    this.occurrences.set([]);
    this.selectedEvent.set(null);
    this.loadingList.set(false);
    this.loadingDetail.set(false);
    this.loadingMutation.set(false);
    this.error.set(null);
    this.#currentOrgId = null;
    this.#currentFrom = null;
    this.#currentTo = null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  async #reloadOccurrences(): Promise<void> {
    if (this.#currentOrgId && this.#currentFrom && this.#currentTo) {
      await this.loadOccurrences(
        this.#currentOrgId,
        this.#currentFrom,
        this.#currentTo,
      );
    }
  }
}
