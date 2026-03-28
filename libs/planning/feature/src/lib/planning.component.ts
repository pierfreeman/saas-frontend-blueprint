import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import type {
  CalendarOptions,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type {
  DateClickArg,
  EventResizeDoneArg,
} from '@fullcalendar/interaction';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  PlanningApi,
  PlanningStore,
  type EventOccurrence,
  type EventDetail,
  type CreateEventDto,
  type UpdateEventDto,
  type RSVPStatus,
} from '@saas-frontend/planning/data-access';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '@saas-frontend/auth/data-access';
import {
  MembershipsStore,
  type MembershipSummary,
} from '@saas-frontend/memberships/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import {
  PermissionsService,
  PERMISSIONS,
} from '@saas-frontend/shared/util-rbac';
import { PlanningEventFormDialogComponent } from './planning-event-form-dialog.component';
import { PlanningDetailDialogComponent } from './planning-detail-dialog.component';
import { PlanningExceptionDialogComponent } from './planning-exception-dialog.component';
import { type EventForm, toUtcIso, browserTimezone } from './planning.utils';

const DEFAULT_FORM: EventForm = {
  title: '',
  startUtc: '',
  endUtc: '',
  isAllDay: false,
  description: '',
  location: '',
  eventTimezone: browserTimezone(),
  rrule: '',
  attendeeIds: [],
  notifyAttendees: false,
  reminderMinutes: null,
};

@Component({
  selector: 'app-planning',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FullCalendarModule,
    ButtonModule,
    SkeletonModule,
    ToastModule,
    PlanningEventFormDialogComponent,
    PlanningDetailDialogComponent,
    PlanningExceptionDialogComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="flex flex-col gap-4 h-full">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 m-0">Planning</h1>
          <p class="text-surface-500 mt-1 mb-0 text-sm">
            Team calendar and event management.
          </p>
        </div>
        @if (canManage()) {
          <p-button
            label="New event"
            icon="pi pi-plus"
            (onClick)="openCreateDialog()"
          />
        }
      </div>

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="flex flex-col gap-2">
          @for (_ of [1, 2, 3]; track $index) {
            <p-skeleton height="2.5rem" styleClass="w-full" />
          }
        </div>
      }

      <!-- Calendar -->
      <div class="fc-wrapper" [class.hidden]="loading()">
        <full-calendar [options]="calendarOptions()" />
      </div>
    </div>

    <!-- ── Dialog sub-components ──────────────────────────────────────────── -->
    <app-planning-event-form-dialog
      [visible]="createDialogVisible()"
      (visibleChange)="createDialogVisible.set($event)"
      [editMode]="editMode()"
      [saving]="saving()"
      [checkingConflicts]="checkingConflicts()"
      [conflictCount]="conflictCount()"
      [conflictPreview]="conflictPreview()"
      [initialForm]="form"
      [members]="members()"
      (draftChanged)="onFormDraftChanged($event)"
      (submitted)="submitForm($event)"
    />

    <app-planning-detail-dialog
      [visible]="detailDialogVisible()"
      (visibleChange)="detailDialogVisible.set($event)"
      [event]="store.selectedEvent()"
      [occurrence]="selectedOccurrence()"
      [loadingDetail]="store.loadingDetail()"
      [saving]="saving()"
      [canManage]="canEditSelected()"
      [members]="members()"
      (edit)="openEditFromDetail($event)"
      (deleted)="deleteCurrentEvent($event)"
      (rsvp)="sendRsvp($event)"
      (openException)="openExceptionDialog()"
    />

    <app-planning-exception-dialog
      [visible]="exceptionDialogVisible()"
      (visibleChange)="exceptionDialogVisible.set($event)"
      [saving]="saving()"
      [occurrence]="selectedOccurrence()"
      (submitted)="submitException($event)"
    />
  `,
})
export class PlanningComponent implements OnInit {
  readonly store = inject(PlanningStore);
  readonly #planningApi = inject(PlanningApi);
  readonly #authStore = inject(AuthStore);
  readonly #membershipsStore = inject(MembershipsStore);
  readonly #orgsStore = inject(OrganizationsStore);
  readonly #permissions = inject(PermissionsService);
  readonly #toast = inject(MessageService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly loading = this.store.loadingList;
  readonly saving = computed(
    () => this.store.loadingMutation() || this.store.loadingDetail(),
  );
  readonly canManage = computed(() =>
    this.#permissions.currentUserPermissions().has(PERMISSIONS.PLANNING_MANAGE),
  );
  protected readonly members = this.#membershipsStore.memberships;

  // True for events the current user may drag/resize: admin/owner OR creator
  readonly #canEditOccurrence = computed(() => {
    const uid = this.#authStore.currentUser()?.id;
    const canEditAny = this.#permissions
      .currentUserPermissions()
      .has(PERMISSIONS.PLANNING_MANAGE_ANY);
    return (occ: EventOccurrence) => canEditAny || occ.createdByUserId === uid;
  });

  /** True when the currently-selected occurrence can be edited/deleted by this user. */
  readonly canEditSelected = computed(() => {
    const occ = this.selectedOccurrence();
    if (!occ) return false;
    return this.#canEditOccurrence()(occ);
  });

  // ── Dialog visibility ──────────────────────────────────────────────────────
  protected createDialogVisible = signal(false);
  protected detailDialogVisible = signal(false);
  protected exceptionDialogVisible = signal(false);
  protected editMode = signal(false);
  protected selectedOccurrence = signal<EventOccurrence | null>(null);
  protected editingEventId = signal<string | null>(null);
  protected editingVersion = signal<number>(0);
  protected checkingConflicts = signal(false);
  protected conflictCount = signal(0);
  protected conflictPreview = signal<string[]>([]);
  #conflictTimer: ReturnType<typeof setTimeout> | null = null;
  #conflictReqSeq = 0;

  // ── Event form (pre-populated for create/edit; passed as initialForm input) ─
  protected form: EventForm = { ...DEFAULT_FORM };

  // ── Calendar events (derived from store) ───────────────────────────────────
  readonly #calendarEvents = computed<EventInput[]>(() => {
    const canEdit = this.#canEditOccurrence();
    return this.store.occurrences().map((occ) => ({
      id: `${occ.eventId}__${occ.originalStartUtc}`,
      title: occ.isCancelled ? `[Cancelled] ${occ.title}` : occ.title,
      start: occ.startUtc,
      end: occ.endUtc,
      allDay: occ.isAllDay,
      color: occ.isCancelled ? '#9ca3af' : undefined,
      editable: canEdit(occ),
      extendedProps: { occurrence: occ },
    }));
  });

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    events: this.#calendarEvents(),
    selectable: this.canManage(),
    height: 'auto',
    datesSet: (arg: DatesSetArg) => this.#onDatesSet(arg),
    eventClick: (arg: EventClickArg) => this.#onEventClick(arg),
    dateClick: (arg: DateClickArg) => this.#onDateClick(arg),
    eventDrop: (arg: EventDropArg) => void this.#onEventDrop(arg),
    eventResize: (arg: EventResizeDoneArg) => void this.#onEventResize(arg),
  }));

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const eventId = this.#route.snapshot.queryParamMap.get('eventId');
    if (eventId) {
      void this.#openEventById(eventId);
      // Remove query param from URL without adding a history entry
      void this.#router.navigate([], {
        queryParams: {},
        replaceUrl: true,
        relativeTo: this.#route,
      });
    }
  }

  async #openEventById(eventId: string): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) return;
    await this.store.loadEventDetail(orgId, eventId);
    const detail = this.store.selectedEvent();
    if (!detail) return;
    // Build a minimal EventOccurrence stub from the EventDetail so the
    // detail dialog can display while the full detail is already loaded.
    const stub: EventOccurrence = {
      eventId: detail.id,
      originalStartUtc: detail.startUtc,
      startUtc: detail.startUtc,
      endUtc: detail.endUtc,
      title: detail.title,
      description: detail.description,
      location: detail.location,
      isAllDay: detail.isAllDay,
      eventTimezone: detail.eventTimezone,
      rrule: detail.rrule,
      isRecurring: !!detail.rrule,
      isException: false,
      isCancelled: !!detail.deletedAt,
      createdByUserId: detail.createdByUserId,
      orgId: detail.orgId,
      version: detail.version,
      attendees: detail.attendees,
    };
    this.selectedOccurrence.set(stub);
    this.detailDialogVisible.set(true);
  }

  // ── FullCalendar callbacks ─────────────────────────────────────────────────
  #onDatesSet(arg: DatesSetArg): void {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) return;
    void this.store.loadOccurrences(
      orgId,
      arg.start.toISOString(),
      arg.end.toISOString(),
    );
  }

  #onEventClick(arg: EventClickArg): void {
    const occ = arg.event.extendedProps['occurrence'] as EventOccurrence;
    this.selectedOccurrence.set(occ);
    this.detailDialogVisible.set(true);
    const orgId = this.#orgsStore.activeOrgId();
    if (orgId) {
      void this.store.loadEventDetail(orgId, occ.eventId);
    }
  }

  #onDateClick(arg: DateClickArg): void {
    if (!this.canManage()) return;
    this.#resetForm();

    // In month view arg.allDay=true, arg.date is midnight → default to 09:00
    const start = new Date(arg.date);
    if (arg.allDay) {
      start.setHours(9, 0, 0, 0);
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    this.form.startUtc = start.toISOString();
    this.form.endUtc = end.toISOString();
    this.editMode.set(false);
    this.createDialogVisible.set(true);
  }

  // ── Create dialog ──────────────────────────────────────────────────────────
  protected openCreateDialog(): void {
    this.#resetForm();
    this.editMode.set(false);
    this.createDialogVisible.set(true);
  }

  protected onFormDraftChanged(form: EventForm): void {
    this.#scheduleConflictCheck(form);
  }

  protected async submitForm(form: EventForm): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId || !form.title.trim()) return;

    if (this.editMode()) {
      const eventId = this.editingEventId();
      if (!eventId) return;
      const dto: UpdateEventDto = {
        title: form.title.trim(),
        start: toUtcIso(form.startUtc),
        end: form.endUtc ? toUtcIso(form.endUtc) : undefined,
        isAllDay: form.isAllDay,
        description: form.description || undefined,
        location: form.location || undefined,
        rrule: form.rrule || undefined,
        version: this.editingVersion(),
        attendeeIds: form.attendeeIds,
        notifyAttendees: form.notifyAttendees,
        reminderMinutes: form.reminderMinutes,
      };
      const result = await this.store.updateEvent(orgId, eventId, dto);
      if (!result) {
        const err = this.store.error() as { status?: number } | null;
        if (err?.status === 409) {
          this.#toast.add({
            severity: 'warn',
            summary: 'Conflict',
            detail: 'Event was modified by another user, please refresh.',
          });
        }
        return;
      }
    } else {
      const dto: CreateEventDto = {
        title: form.title.trim(),
        start: toUtcIso(form.startUtc),
        end: form.endUtc ? toUtcIso(form.endUtc) : undefined,
        isAllDay: form.isAllDay,
        description: form.description || undefined,
        location: form.location || undefined,
        eventTimezone: form.eventTimezone,
        rrule: form.rrule || undefined,
        attendeeIds: form.attendeeIds.length > 0 ? form.attendeeIds : undefined,
        reminderMinutes: form.reminderMinutes ?? undefined,
      };
      const created = await this.store.createEvent(orgId, dto);
      if (!created) {
        this.#toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create event. Please try again.',
        });
        return;
      }
    }

    this.createDialogVisible.set(false);
  }

  // ── Detail dialog ──────────────────────────────────────────────────────────
  protected openEditFromDetail(evt: EventDetail): void {
    this.detailDialogVisible.set(false);
    this.editingEventId.set(evt.id);
    this.editingVersion.set(evt.version);
    this.form = {
      title: evt.title ?? '',
      startUtc: evt.startUtc,
      endUtc: evt.endUtc ?? '',
      isAllDay: evt.isAllDay,
      description: evt.description ?? '',
      location: evt.location ?? '',
      eventTimezone: evt.eventTimezone,
      rrule: evt.rrule ?? '',
      attendeeIds: evt.attendees.map((a) => a.userId),
      notifyAttendees: false,
      reminderMinutes: evt.reminderMinutes ?? null,
    };
    this.conflictCount.set(0);
    this.conflictPreview.set([]);
    this.editMode.set(true);
    this.createDialogVisible.set(true);
  }

  protected async deleteCurrentEvent(evt: EventDetail): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    if (!orgId) return;
    const ok = await this.store.deleteEvent(orgId, evt.id);
    if (ok) {
      this.detailDialogVisible.set(false);
    }
  }

  protected async sendRsvp(status: RSVPStatus): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    const occ = this.selectedOccurrence();
    if (!orgId || !occ) return;
    await this.store.rsvp(orgId, occ.eventId, { status });
  }

  // ── Exception dialog ───────────────────────────────────────────────────────
  protected openExceptionDialog(): void {
    this.exceptionDialogVisible.set(true);
  }

  protected async submitException(data: {
    isCancelled: boolean;
    startUtc: string;
    endUtc: string;
    title: string;
  }): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    const occ = this.selectedOccurrence();
    if (!orgId || !occ) return;
    const dto = {
      originalStartUtc: occ.originalStartUtc,
      isCancelled: data.isCancelled,
      ...(data.isCancelled
        ? {}
        : {
            startUtc: toUtcIso(data.startUtc) || undefined,
            endUtc: toUtcIso(data.endUtc) || undefined,
            title: data.title || undefined,
          }),
    };
    const result = await this.store.createException(orgId, occ.eventId, dto);
    if (result) {
      this.exceptionDialogVisible.set(false);
    }
  }

  // ── Drag-and-drop / resize ─────────────────────────────────────────────────
  async #onEventDrop(arg: EventDropArg): Promise<void> {
    const occ = arg.event.extendedProps['occurrence'] as EventOccurrence;
    const start = arg.event.start;
    const orgId = this.#orgsStore.activeOrgId();

    if (!this.#canEditOccurrence()(occ) || !start || !orgId) {
      arg.revert();
      return;
    }

    const dto: UpdateEventDto = {
      start: start.toISOString(),
      end: arg.event.end?.toISOString(),
      version: occ.version,
    };

    const result = await this.store.updateEvent(orgId, occ.eventId, dto);
    if (!result) {
      arg.revert();
      const err = this.store.error() as { status?: number } | null;
      this.#toast.add(
        err?.status === 409
          ? {
              severity: 'warn',
              summary: 'Conflict',
              detail: 'Event was modified by another user, please refresh.',
            }
          : {
              severity: 'error',
              summary: 'Error',
              detail: 'Could not reschedule event.',
            },
      );
    }
  }

  async #onEventResize(arg: EventResizeDoneArg): Promise<void> {
    const occ = arg.event.extendedProps['occurrence'] as EventOccurrence;
    const start = arg.event.start;
    const end = arg.event.end;
    const orgId = this.#orgsStore.activeOrgId();

    if (!this.#canEditOccurrence()(occ) || !start || !end || !orgId) {
      arg.revert();
      return;
    }

    const dto: UpdateEventDto = {
      start: start.toISOString(),
      end: end.toISOString(),
      version: occ.version,
    };

    const result = await this.store.updateEvent(orgId, occ.eventId, dto);
    if (!result) {
      arg.revert();
      const err = this.store.error() as { status?: number } | null;
      this.#toast.add(
        err?.status === 409
          ? {
              severity: 'warn',
              summary: 'Conflict',
              detail: 'Event was modified by another user, please refresh.',
            }
          : {
              severity: 'error',
              summary: 'Error',
              detail: 'Could not resize event.',
            },
      );
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────────
  #resetForm(): void {
    this.form = { ...DEFAULT_FORM };
    this.editingEventId.set(null);
    this.editingVersion.set(0);
    this.checkingConflicts.set(false);
    this.conflictCount.set(0);
    this.conflictPreview.set([]);
    if (this.#conflictTimer) {
      clearTimeout(this.#conflictTimer);
      this.#conflictTimer = null;
    }
  }

  #scheduleConflictCheck(form: EventForm): void {
    if (this.#conflictTimer) {
      clearTimeout(this.#conflictTimer);
    }
    this.#conflictTimer = setTimeout(() => {
      void this.#runConflictCheck(form);
    }, 250);
  }

  async #runConflictCheck(form: EventForm): Promise<void> {
    const orgId = this.#orgsStore.activeOrgId();
    const start = toUtcIso(form.startUtc);
    const end = toUtcIso(form.endUtc);

    if (!orgId || !start || !end || end <= start) {
      this.conflictCount.set(0);
      this.conflictPreview.set([]);
      this.checkingConflicts.set(false);
      return;
    }

    const reqId = ++this.#conflictReqSeq;
    this.checkingConflicts.set(true);

    try {
      const list = await firstValueFrom(
        this.#planningApi.listConflicts(orgId, { start, end }),
      );

      if (reqId !== this.#conflictReqSeq) return;

      const currentEventId = this.editingEventId();
      const filtered = currentEventId
        ? list.filter((occ) => occ.eventId !== currentEventId)
        : list;

      this.conflictCount.set(filtered.length);
      this.conflictPreview.set(
        filtered.slice(0, 3).map((occ) => this.#formatConflictPreviewLine(occ)),
      );
    } catch {
      if (reqId !== this.#conflictReqSeq) return;
      this.conflictCount.set(0);
      this.conflictPreview.set([]);
    } finally {
      if (reqId === this.#conflictReqSeq) {
        this.checkingConflicts.set(false);
      }
    }
  }

  #formatConflictPreviewLine(occ: EventOccurrence): string {
    const tz = occ.eventTimezone;
    const fmt = new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const timeFmt = new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
    });
    const startLabel = fmt.format(new Date(occ.startUtc));
    const endLabel = timeFmt.format(new Date(occ.endUtc));
    return `${occ.title} (${startLabel} – ${endLabel})`;
  }
}
