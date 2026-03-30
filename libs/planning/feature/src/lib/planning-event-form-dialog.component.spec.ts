import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleChange, SimpleChanges } from '@angular/core';
import { PlanningEventFormDialogComponent } from './planning-event-form-dialog.component';
import type { EventForm } from './planning.utils';

// Access protected / private members without TypeScript errors.
type FormAny = {
  form: EventForm;
  startDate: Date | null;
  endDate: Date | null;
  isDirty: boolean;
  initialForm: EventForm;
  draftChanged: { emit: ReturnType<typeof vi.fn> };
  submitted: { emit: ReturnType<typeof vi.fn> };
  visibleChange: { emit: ReturnType<typeof vi.fn> };
  onStartChange(date: Date | null): void;
  onEndChange(date: Date | null): void;
  onAllDayToggle(allDay: boolean): void;
  cancel(): void;
  submit(): void;
} & PlanningEventFormDialogComponent;

const makeForm = (overrides: Partial<EventForm> = {}): EventForm => ({
  title: 'Test Event',
  startUtc: '2026-01-05T10:00:00.000Z',
  endUtc: '2026-01-05T11:00:00.000Z',
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

function makeChanges(key: string, prev: unknown, curr: unknown): SimpleChanges {
  return {
    [key]: new SimpleChange(prev, curr, prev === null),
  } as SimpleChanges;
}

describe('PlanningEventFormDialogComponent', () => {
  let comp: FormAny;

  beforeEach(() => {
    comp = new PlanningEventFormDialogComponent() as unknown as FormAny;
    vi.spyOn(comp.draftChanged, 'emit');
    vi.spyOn(comp.submitted, 'emit');
    vi.spyOn(comp.visibleChange, 'emit');
  });

  // ── ngOnChanges ────────────────────────────────────────────────────────────

  describe('ngOnChanges()', () => {
    function open(form = makeForm()) {
      comp.initialForm = form;
      comp.ngOnChanges(makeChanges('visible', false, true));
    }

    it('resets form from initialForm when visible becomes true', () => {
      open(makeForm({ title: 'My Event' }));
      expect(comp.form.title).toBe('My Event');
    });

    it('parses startUtc into a Date', () => {
      open(makeForm({ startUtc: '2026-01-05T10:00:00.000Z' }));
      expect(comp.startDate).toBeInstanceOf(Date);
      expect(comp.startDate!.toISOString()).toBe('2026-01-05T10:00:00.000Z');
    });

    it('parses endUtc into a Date', () => {
      open(makeForm({ endUtc: '2026-01-05T11:00:00.000Z' }));
      expect(comp.endDate).toBeInstanceOf(Date);
      expect(comp.endDate!.toISOString()).toBe('2026-01-05T11:00:00.000Z');
    });

    it('sets startDate to null for an empty startUtc', () => {
      open(makeForm({ startUtc: '' }));
      expect(comp.startDate).toBeNull();
    });

    it('sets endDate to null for an empty endUtc', () => {
      open(makeForm({ endUtc: '' }));
      expect(comp.endDate).toBeNull();
    });

    it('emits draftChanged after resetting the form', () => {
      open();
      expect(comp.draftChanged.emit).toHaveBeenCalledOnce();
    });

    it('ignores changes when visible does not switch to true', () => {
      comp.initialForm = makeForm({ title: 'Should not appear' });
      comp.ngOnChanges(makeChanges('visible', true, false));
      expect(comp.form.title).not.toBe('Should not appear');
    });
  });

  // ── onStartChange ──────────────────────────────────────────────────────────

  describe('onStartChange()', () => {
    it('updates startDate', () => {
      const date = new Date('2026-01-05T10:00:00.000Z');
      comp.onStartChange(date);
      expect(comp.startDate).toBe(date);
    });

    it('auto-sets endDate to start+60 min when endDate is null', () => {
      const date = new Date('2026-01-05T10:00:00.000Z');
      comp.endDate = null;
      comp.onStartChange(date);
      expect(comp.endDate!.getTime()).toBe(date.getTime() + 60 * 60 * 1000);
    });

    it('auto-sets endDate when it is before the new start', () => {
      const start = new Date('2026-01-05T10:00:00.000Z');
      comp.endDate = new Date('2026-01-05T09:00:00.000Z');
      comp.onStartChange(start);
      expect(comp.endDate!.getTime()).toBeGreaterThan(start.getTime());
    });

    it('keeps existing endDate when it is already after start', () => {
      const start = new Date('2026-01-05T10:00:00.000Z');
      const existingEnd = new Date('2026-01-05T12:00:00.000Z');
      comp.endDate = existingEnd;
      comp.onStartChange(start);
      expect(comp.endDate).toBe(existingEnd);
    });

    it('returns early without changing endDate when date is null', () => {
      const existingEnd = new Date('2026-01-05T11:00:00.000Z');
      comp.endDate = existingEnd;
      comp.onStartChange(null);
      expect(comp.startDate).toBeNull();
      expect(comp.endDate).toBe(existingEnd);
    });

    it('emits draftChanged', () => {
      comp.onStartChange(new Date());
      expect(comp.draftChanged.emit).toHaveBeenCalledOnce();
    });
  });

  // ── onEndChange ────────────────────────────────────────────────────────────

  describe('onEndChange()', () => {
    it('updates endDate', () => {
      const end = new Date('2026-01-05T11:00:00.000Z');
      comp.onEndChange(end);
      expect(comp.endDate).toBe(end);
    });

    it('accepts null', () => {
      comp.onEndChange(null);
      expect(comp.endDate).toBeNull();
    });

    it('emits draftChanged', () => {
      comp.onEndChange(new Date());
      expect(comp.draftChanged.emit).toHaveBeenCalledOnce();
    });
  });

  // ── onAllDayToggle ─────────────────────────────────────────────────────────

  describe('onAllDayToggle()', () => {
    it('snaps start to 09:00 and end to 10:00 when switching to timed (false)', () => {
      comp.startDate = new Date('2026-01-05T00:00:00.000Z');
      comp.onAllDayToggle(false);
      expect(comp.startDate!.getHours()).toBe(9);
      expect(comp.endDate!.getTime()).toBe(
        comp.startDate!.getTime() + 60 * 60 * 1000,
      );
    });

    it('does not snap times when switching to all-day (true)', () => {
      const start = new Date('2026-01-05T10:00:00.000Z');
      comp.startDate = start;
      comp.onAllDayToggle(true);
      expect(comp.startDate).toBe(start);
    });

    it('does not snap when startDate is null', () => {
      comp.startDate = null;
      comp.onAllDayToggle(false);
      expect(comp.startDate).toBeNull();
    });

    it('emits draftChanged', () => {
      comp.onAllDayToggle(true);
      expect(comp.draftChanged.emit).toHaveBeenCalledOnce();
    });
  });

  // ── isDirty ────────────────────────────────────────────────────────────────

  describe('isDirty', () => {
    function open(form: EventForm) {
      comp.initialForm = form;
      comp.ngOnChanges(makeChanges('visible', false, true));
      (comp.draftChanged.emit as ReturnType<typeof vi.fn>).mockClear();
    }

    it('is false immediately after opening (no changes)', () => {
      open(makeForm());
      expect(comp.isDirty).toBe(false);
    });

    it('is true when title changes', () => {
      open(makeForm({ title: 'Original' }));
      comp.form.title = 'Changed';
      expect(comp.isDirty).toBe(true);
    });

    it('is true when description changes', () => {
      open(makeForm({ description: '' }));
      comp.form.description = 'New desc';
      expect(comp.isDirty).toBe(true);
    });

    it('is true when attendeeIds list changes', () => {
      open(makeForm({ attendeeIds: ['u1'] }));
      comp.form.attendeeIds = ['u1', 'u2'];
      expect(comp.isDirty).toBe(true);
    });

    it('is true when reminderMinutes changes', () => {
      open(makeForm({ reminderMinutes: null }));
      comp.form.reminderMinutes = 30;
      expect(comp.isDirty).toBe(true);
    });

    it('is true when startDate changes from the initial', () => {
      open(makeForm({ startUtc: '2026-01-05T10:00:00.000Z' }));
      comp.startDate = new Date('2026-01-05T11:00:00.000Z');
      expect(comp.isDirty).toBe(true);
    });
  });

  // ── submit ─────────────────────────────────────────────────────────────────

  describe('submit()', () => {
    it('emits submitted with ISO dates when startDate is set', () => {
      const start = new Date('2026-01-05T10:00:00.000Z');
      const end = new Date('2026-01-05T11:00:00.000Z');
      comp.form.title = 'My Event';
      comp.startDate = start;
      comp.endDate = end;
      comp.submit();
      expect(comp.submitted.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Event',
          startUtc: start.toISOString(),
          endUtc: end.toISOString(),
        }),
      );
    });

    it('uses empty string for endUtc when endDate is null', () => {
      comp.startDate = new Date('2026-01-05T10:00:00.000Z');
      comp.endDate = null;
      comp.submit();
      expect(comp.submitted.emit).toHaveBeenCalledWith(
        expect.objectContaining({ endUtc: '' }),
      );
    });

    it('does nothing when startDate is null', () => {
      comp.startDate = null;
      comp.submit();
      expect(comp.submitted.emit).not.toHaveBeenCalled();
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('emits visibleChange with false', () => {
      comp.cancel();
      expect(comp.visibleChange.emit).toHaveBeenCalledWith(false);
    });
  });
});
