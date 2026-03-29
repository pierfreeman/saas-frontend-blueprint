import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageService } from 'primeng/api';
import { AuthStore } from '@saas-frontend/auth/data-access';
import { MembershipsStore } from '@saas-frontend/memberships/data-access';
import { OrganizationsStore } from '@saas-frontend/organizations/data-access';
import {
  PlanningApi,
  PlanningStore,
  type EventDetail,
  type EventOccurrence,
} from '@saas-frontend/planning/data-access';
import {
  PERMISSIONS,
  PermissionsService,
} from '@saas-frontend/shared/util-rbac';
import { PlanningComponent } from './planning.component';
import type { EventForm } from './planning.utils';

type PlanningAny = {
  createDialogVisible: ReturnType<typeof signal<boolean>>;
  detailDialogVisible: ReturnType<typeof signal<boolean>>;
  exceptionDialogVisible: ReturnType<typeof signal<boolean>>;
  editMode: ReturnType<typeof signal<boolean>>;
  selectedOccurrence: ReturnType<typeof signal<EventOccurrence | null>>;
  editingEventId: ReturnType<typeof signal<string | null>>;
  editingVersion: ReturnType<typeof signal<number>>;
  checkingConflicts: ReturnType<typeof signal<boolean>>;
  conflictCount: ReturnType<typeof signal<number>>;
  conflictPreview: ReturnType<typeof signal<string[]>>;
  form: EventForm;
  onFormDraftChanged(form: EventForm): void;
  submitForm(form: EventForm): Promise<void>;
  openCreateDialog(): void;
  openEditFromDetail(evt: EventDetail): void;
  deleteCurrentEvent(evt: EventDetail): Promise<void>;
  sendRsvp(status: 'YES' | 'NO' | 'MAYBE' | 'PENDING'): Promise<void>;
  openExceptionDialog(): void;
  submitException(data: {
    isCancelled: boolean;
    startUtc: string;
    endUtc: string;
    title: string;
  }): Promise<void>;
} & PlanningComponent;

const makeOccurrence = (
  overrides: Partial<EventOccurrence> = {},
): EventOccurrence =>
  ({
    eventId: 'event-1',
    originalStartUtc: '2026-01-05T10:00:00.000Z',
    startUtc: '2026-01-05T10:00:00.000Z',
    endUtc: '2026-01-05T11:00:00.000Z',
    title: 'Planning',
    description: null,
    location: null,
    isAllDay: false,
    eventTimezone: 'UTC',
    rrule: null,
    isRecurring: false,
    isException: false,
    isCancelled: false,
    createdByUserId: 'user-1',
    orgId: 'org-1',
    version: 1,
    attendees: [],
    ...overrides,
  }) as EventOccurrence;

const makeDetail = (overrides: Partial<EventDetail> = {}): EventDetail =>
  ({
    id: 'event-1',
    orgId: 'org-1',
    createdByUserId: 'user-1',
    title: 'Planning',
    description: null,
    location: null,
    startUtc: '2026-01-05T10:00:00.000Z',
    endUtc: '2026-01-05T11:00:00.000Z',
    isAllDay: false,
    eventTimezone: 'UTC',
    rrule: null,
    rruleUntilUtc: null,
    metadata: null,
    reminderMinutes: null,
    lastReminderOccurrenceUtc: null,
    version: 1,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    attendees: [],
    exceptions: [],
    ...overrides,
  }) as EventDetail;

const makeForm = (overrides: Partial<EventForm> = {}): EventForm => ({
  title: 'My event',
  startUtc: '2026-01-05T10:00',
  endUtc: '2026-01-05T11:00',
  isAllDay: false,
  description: '',
  location: '',
  eventTimezone: 'UTC',
  rrule: '',
  attendeeIds: [],
  notifyAttendees: false,
  reminderMinutes: null,
  ...overrides,
});

describe('PlanningComponent', () => {
  let comp: PlanningAny;

  const loadingList = signal(false);
  const loadingMutation = signal(false);
  const loadingDetail = signal(false);
  const occurrences = signal<EventOccurrence[]>([]);
  const selectedEvent = signal<EventDetail | null>(null);
  const error = signal<{ status?: number } | null>(null);

  const storeMock = {
    loadingList,
    loadingMutation,
    loadingDetail,
    occurrences,
    selectedEvent,
    error,
    loadOccurrences: vi.fn().mockResolvedValue(undefined),
    loadEventDetail: vi.fn().mockResolvedValue(undefined),
    updateEvent: vi.fn().mockResolvedValue({ id: 'ok' }),
    createEvent: vi.fn().mockResolvedValue({ id: 'created' }),
    deleteEvent: vi.fn().mockResolvedValue(true),
    rsvp: vi.fn().mockResolvedValue(undefined),
    createException: vi.fn().mockResolvedValue({ id: 'ex-1' }),
  };

  const planningApiMock = {
    listConflicts: vi.fn().mockReturnValue(of([])),
  };

  const authState = { id: 'user-1' };
  const authStoreMock = {
    currentUser: vi.fn(() => authState),
  };

  const orgState = { id: 'org-1' };
  const orgsStoreMock = {
    activeOrgId: vi.fn(() => orgState.id),
  };

  const permissionsSet = new Set<string>([PERMISSIONS.PLANNING_MANAGE]);
  const permissionsMock = {
    currentUserPermissions: vi.fn(() => permissionsSet),
  };

  const membershipsStoreMock = {
    memberships: signal([]),
  };

  const msgMock = {
    add: vi.fn(),
  };

  const queryParamGet = vi.fn(() => null);
  const routeMock = {
    snapshot: {
      queryParamMap: { get: queryParamGet },
    },
  };

  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();

    loadingList.set(false);
    loadingMutation.set(false);
    loadingDetail.set(false);
    occurrences.set([]);
    selectedEvent.set(null);
    error.set(null);

    orgState.id = 'org-1';
    authState.id = 'user-1';
    permissionsSet.clear();
    permissionsSet.add(PERMISSIONS.PLANNING_MANAGE);
    queryParamGet.mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: PlanningStore, useValue: storeMock },
        { provide: PlanningApi, useValue: planningApiMock },
        { provide: AuthStore, useValue: authStoreMock },
        { provide: MembershipsStore, useValue: membershipsStoreMock },
        { provide: OrganizationsStore, useValue: orgsStoreMock },
        { provide: PermissionsService, useValue: permissionsMock },
        { provide: MessageService, useValue: msgMock },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: Router, useValue: routerMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    comp = TestBed.runInInjectionContext(
      () => new PlanningComponent(),
    ) as unknown as PlanningAny;
  });

  it('builds calendar events with cancelled prefix and editable=true for creator', () => {
    occurrences.set([
      makeOccurrence({ title: 'A', createdByUserId: 'user-1' }),
      makeOccurrence({
        eventId: 'event-2',
        originalStartUtc: '2026-01-06T10:00:00.000Z',
        title: 'B',
        isCancelled: true,
      }),
    ]);

    const events = comp.calendarOptions().events as Array<
      Record<string, unknown>
    >;
    expect(events).toHaveLength(2);
    expect(events[0]['editable']).toBe(true);
    expect(events[1]['title']).toBe('[Cancelled] B');
    expect(events[1]['color']).toBe('#9ca3af');
  });

  it('ngOnInit loads and opens event detail when eventId is present in query params', async () => {
    queryParamGet.mockReturnValue('event-1');
    selectedEvent.set(makeDetail());

    comp.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();

    expect(storeMock.loadEventDetail).toHaveBeenCalledWith('org-1', 'event-1');
    expect(routerMock.navigate).toHaveBeenCalled();
    expect(comp.detailDialogVisible()).toBe(true);
    expect(comp.selectedOccurrence()).not.toBeNull();
  });

  it('ngOnInit does nothing when no eventId query param is present', () => {
    queryParamGet.mockReturnValue(null);
    comp.ngOnInit();
    expect(storeMock.loadEventDetail).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('dateClick creates a 1-hour draft and opens create dialog when canManage=true', () => {
    const dateClick = comp.calendarOptions().dateClick;
    dateClick?.({
      date: new Date('2026-01-07T00:00:00.000Z'),
      allDay: true,
    } as never);

    expect(comp.createDialogVisible()).toBe(true);
    expect(comp.editMode()).toBe(false);
    const startMs = new Date(comp.form.startUtc).getTime();
    const endMs = new Date(comp.form.endUtc).getTime();
    expect(endMs - startMs).toBe(60 * 60 * 1000);
  });

  it('dateClick is ignored when canManage=false', () => {
    permissionsSet.clear();
    const dateClick = comp.calendarOptions().dateClick;
    dateClick?.({ date: new Date(), allDay: false } as never);
    expect(comp.createDialogVisible()).toBe(false);
  });

  it('select all-day multi-day creates an all-day span', () => {
    const select = comp.calendarOptions().select;
    select?.({
      start: new Date('2026-01-07T00:00:00.000Z'),
      end: new Date('2026-01-09T00:00:00.000Z'),
      allDay: true,
    } as never);

    expect(comp.form.isAllDay).toBe(true);
    expect(comp.form.startUtc).toBe('2026-01-07T00:00:00.000Z');
    const span =
      new Date(comp.form.endUtc).getTime() -
      new Date(comp.form.startUtc).getTime();
    expect(span).toBeGreaterThan(24 * 60 * 60 * 1000);
  });

  it('datesSet loads occurrences for the active org', () => {
    const datesSet = comp.calendarOptions().datesSet;
    datesSet?.({
      start: new Date('2026-01-01T00:00:00.000Z'),
      end: new Date('2026-01-31T00:00:00.000Z'),
    } as never);

    expect(storeMock.loadOccurrences).toHaveBeenCalledWith(
      'org-1',
      '2026-01-01T00:00:00.000Z',
      '2026-01-31T00:00:00.000Z',
    );
  });

  it('eventClick opens detail dialog and loads event detail', () => {
    const eventClick = comp.calendarOptions().eventClick;
    const occ = makeOccurrence();

    eventClick?.({
      event: { extendedProps: { occurrence: occ } },
    } as never);

    expect(comp.selectedOccurrence()).toEqual(occ);
    expect(comp.detailDialogVisible()).toBe(true);
    expect(storeMock.loadEventDetail).toHaveBeenCalledWith('org-1', 'event-1');
  });

  it('openCreateDialog resets to create mode and opens dialog', () => {
    comp.editMode.set(true);
    comp.openCreateDialog();
    expect(comp.editMode()).toBe(false);
    expect(comp.createDialogVisible()).toBe(true);
    expect(comp.editingEventId()).toBeNull();
  });

  it('submitForm in create mode calls createEvent and closes dialog on success', async () => {
    comp.createDialogVisible.set(true);
    comp.editMode.set(false);
    storeMock.createEvent.mockResolvedValueOnce({ id: 'created' });

    await comp.submitForm(
      makeForm({ attendeeIds: ['u1'], reminderMinutes: 30 }),
    );

    expect(storeMock.createEvent).toHaveBeenCalled();
    expect(comp.createDialogVisible()).toBe(false);
  });

  it('submitForm in create mode shows toast on failure', async () => {
    comp.editMode.set(false);
    storeMock.createEvent.mockResolvedValueOnce(null);

    await comp.submitForm(makeForm());

    expect(msgMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
  });

  it('submitForm in edit mode shows conflict toast on 409', async () => {
    comp.editMode.set(true);
    comp.editingEventId.set('event-1');
    comp.editingVersion.set(5);
    error.set({ status: 409 });
    storeMock.updateEvent.mockResolvedValueOnce(null);

    await comp.submitForm(makeForm());

    expect(msgMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: 'Conflict' }),
    );
  });

  it('submitForm returns early when title is blank', async () => {
    await comp.submitForm(makeForm({ title: '   ' }));
    expect(storeMock.createEvent).not.toHaveBeenCalled();
    expect(storeMock.updateEvent).not.toHaveBeenCalled();
  });

  it('openEditFromDetail maps detail to form and opens edit dialog', () => {
    comp.openEditFromDetail(
      makeDetail({
        title: 'Edited title',
        attendees: [{ userId: 'u1' } as never, { userId: 'u2' } as never],
      }),
    );

    expect(comp.detailDialogVisible()).toBe(false);
    expect(comp.editMode()).toBe(true);
    expect(comp.createDialogVisible()).toBe(true);
    expect(comp.form.title).toBe('Edited title');
    expect(comp.form.attendeeIds).toEqual(['u1', 'u2']);
  });

  it('deleteCurrentEvent closes detail dialog only when deletion succeeds', async () => {
    comp.detailDialogVisible.set(true);
    storeMock.deleteEvent.mockResolvedValueOnce(true);

    await comp.deleteCurrentEvent(makeDetail());
    expect(comp.detailDialogVisible()).toBe(false);

    comp.detailDialogVisible.set(true);
    storeMock.deleteEvent.mockResolvedValueOnce(false);
    await comp.deleteCurrentEvent(makeDetail());
    expect(comp.detailDialogVisible()).toBe(true);
  });

  it('sendRsvp returns early when no selected occurrence', async () => {
    comp.selectedOccurrence.set(null);
    await comp.sendRsvp('YES');
    expect(storeMock.rsvp).not.toHaveBeenCalled();
  });

  it('sendRsvp sends RSVP when occurrence is selected', async () => {
    comp.selectedOccurrence.set(makeOccurrence());
    await comp.sendRsvp('MAYBE');
    expect(storeMock.rsvp).toHaveBeenCalledWith('org-1', 'event-1', {
      status: 'MAYBE',
    });
  });

  it('openExceptionDialog sets exception dialog visible', () => {
    comp.openExceptionDialog();
    expect(comp.exceptionDialogVisible()).toBe(true);
  });

  it('submitException closes dialog on success', async () => {
    comp.exceptionDialogVisible.set(true);
    comp.selectedOccurrence.set(makeOccurrence());
    storeMock.createException.mockResolvedValueOnce({ id: 'ex-1' });

    await comp.submitException({
      isCancelled: false,
      startUtc: '2026-01-05T10:00',
      endUtc: '2026-01-05T11:00',
      title: 'Override',
    });

    expect(storeMock.createException).toHaveBeenCalled();
    expect(comp.exceptionDialogVisible()).toBe(false);
  });

  it('eventDrop reverts and shows conflict toast on failed update with status 409', async () => {
    permissionsSet.add(PERMISSIONS.PLANNING_MANAGE_ANY);
    error.set({ status: 409 });
    storeMock.updateEvent.mockResolvedValueOnce(null);

    const revert = vi.fn();
    const eventDrop = comp.calendarOptions().eventDrop;
    await eventDrop?.({
      event: {
        start: new Date('2026-01-06T10:00:00.000Z'),
        end: new Date('2026-01-06T11:00:00.000Z'),
        extendedProps: { occurrence: makeOccurrence({ version: 3 }) },
      },
      revert,
    } as never);

    expect(revert).toHaveBeenCalledOnce();
    expect(msgMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: 'Conflict' }),
    );
  });

  it('eventResize reverts and shows generic error toast when update fails non-409', async () => {
    permissionsSet.add(PERMISSIONS.PLANNING_MANAGE_ANY);
    error.set({ status: 500 });
    storeMock.updateEvent.mockResolvedValueOnce(null);

    const revert = vi.fn();
    const eventResize = comp.calendarOptions().eventResize;
    await eventResize?.({
      event: {
        start: new Date('2026-01-06T10:00:00.000Z'),
        end: new Date('2026-01-06T11:00:00.000Z'),
        extendedProps: { occurrence: makeOccurrence({ version: 4 }) },
      },
      revert,
    } as never);

    expect(revert).toHaveBeenCalledOnce();
    expect(msgMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Error' }),
    );
  });

  it('onFormDraftChanged runs conflict check and updates count/preview', async () => {
    vi.useFakeTimers();
    comp.editingEventId.set('event-1');
    planningApiMock.listConflicts.mockReturnValueOnce(
      of([
        makeOccurrence({ eventId: 'event-1', title: 'Self' }),
        makeOccurrence({ eventId: 'event-2', title: 'Other A' }),
        makeOccurrence({ eventId: 'event-3', title: 'Other B' }),
        makeOccurrence({ eventId: 'event-4', title: 'Other C' }),
      ]),
    );

    comp.onFormDraftChanged(makeForm());
    await vi.advanceTimersByTimeAsync(251);

    expect(comp.conflictCount()).toBe(3);
    expect(comp.conflictPreview().length).toBe(3);
    expect(comp.checkingConflicts()).toBe(false);
    vi.useRealTimers();
  });

  it('onFormDraftChanged handles conflict API errors', async () => {
    vi.useFakeTimers();
    planningApiMock.listConflicts.mockReturnValueOnce(
      throwError(() => new Error('boom')),
    );

    comp.onFormDraftChanged(makeForm());
    await vi.advanceTimersByTimeAsync(251);

    expect(comp.conflictCount()).toBe(0);
    expect(comp.conflictPreview()).toEqual([]);
    expect(comp.checkingConflicts()).toBe(false);
    vi.useRealTimers();
  });
});
