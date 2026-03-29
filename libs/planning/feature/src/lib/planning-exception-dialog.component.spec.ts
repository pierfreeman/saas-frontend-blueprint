import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleChange, SimpleChanges } from '@angular/core';
import {
  PlanningExceptionDialogComponent,
  type RecurrenceScope,
} from './planning-exception-dialog.component';

// Access protected members without TypeScript errors.
type ExcAny = {
  exceptionForm: {
    isCancelled: boolean;
    startUtc: string;
    endUtc: string;
    title: string;
    recurrenceScope: RecurrenceScope;
  };
  occurrence: {
    startUtc: string;
    endUtc: string;
    originalStartUtc: string;
  } | null;
  submitted: { emit: ReturnType<typeof vi.fn> };
  visibleChange: { emit: ReturnType<typeof vi.fn> };
  submit(): void;
} & PlanningExceptionDialogComponent;

function makeChanges(key: string, prev: unknown, curr: unknown): SimpleChanges {
  return {
    [key]: new SimpleChange(prev, curr, prev === null),
  } as SimpleChanges;
}

describe('PlanningExceptionDialogComponent', () => {
  let comp: ExcAny;

  beforeEach(() => {
    comp = new PlanningExceptionDialogComponent() as unknown as ExcAny;
    vi.spyOn(comp.submitted, 'emit');
    vi.spyOn(comp.visibleChange, 'emit');
  });

  function open() {
    comp.ngOnChanges(makeChanges('visible', false, true));
  }

  // ── ngOnChanges ────────────────────────────────────────────────────────────

  describe('ngOnChanges()', () => {
    it('resets form to defaults when visible becomes true and occurrence is null', () => {
      comp.occurrence = null;
      open();
      expect(comp.exceptionForm.isCancelled).toBe(false);
      expect(comp.exceptionForm.startUtc).toBe('');
      expect(comp.exceptionForm.endUtc).toBe('');
      expect(comp.exceptionForm.title).toBe('');
      expect(comp.exceptionForm.recurrenceScope).toBe('this');
    });

    it('defaults recurrenceScope to "this" on each open', () => {
      comp.exceptionForm.recurrenceScope = 'thisAndFollowing';
      comp.occurrence = null;
      open();
      expect(comp.exceptionForm.recurrenceScope).toBe('this');
    });

    it('populates startUtc and endUtc from occurrence when visible becomes true', () => {
      comp.occurrence = {
        startUtc: '2026-01-12T10:00:00.000Z',
        endUtc: '2026-01-12T11:00:00.000Z',
        originalStartUtc: '2026-01-12T10:00:00.000Z',
      };
      open();
      // toLocalDatetimeInput slices to YYYY-MM-DDTHH:mm
      expect(comp.exceptionForm.startUtc).toBe('2026-01-12T10:00');
      expect(comp.exceptionForm.endUtc).toBe('2026-01-12T11:00');
    });

    it('resets isCancelled to false regardless of previous state', () => {
      comp.exceptionForm.isCancelled = true;
      comp.occurrence = null;
      open();
      expect(comp.exceptionForm.isCancelled).toBe(false);
    });

    it('clears title on each open', () => {
      comp.exceptionForm.title = 'Previous title';
      comp.occurrence = null;
      open();
      expect(comp.exceptionForm.title).toBe('');
    });

    it('does not reset form when visible does not become true', () => {
      comp.exceptionForm.title = 'Preserved';
      comp.ngOnChanges(makeChanges('visible', true, false));
      expect(comp.exceptionForm.title).toBe('Preserved');
    });
  });

  // ── submit ─────────────────────────────────────────────────────────────────

  describe('submit()', () => {
    it('emits submitted with a copy of the current form', () => {
      comp.exceptionForm = {
        isCancelled: true,
        startUtc: '2026-01-12T10:00',
        endUtc: '2026-01-12T11:00',
        title: 'Override title',
        recurrenceScope: 'this',
      };
      comp.submit();
      expect(comp.submitted.emit).toHaveBeenCalledWith({
        isCancelled: true,
        startUtc: '2026-01-12T10:00',
        endUtc: '2026-01-12T11:00',
        title: 'Override title',
        recurrenceScope: 'this',
      });
    });

    it('emits submitted with default form values when nothing was changed', () => {
      comp.occurrence = null;
      open();
      comp.submit();
      expect(comp.submitted.emit).toHaveBeenCalledWith({
        isCancelled: false,
        startUtc: '',
        endUtc: '',
        title: '',
        recurrenceScope: 'this',
      });
    });

    it('emits submitted with recurrenceScope="thisAndFollowing" when set', () => {
      comp.occurrence = null;
      open();
      comp.exceptionForm.recurrenceScope = 'thisAndFollowing';
      comp.exceptionForm.isCancelled = false;
      comp.exceptionForm.title = 'New tail';
      comp.submit();
      expect(comp.submitted.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrenceScope: 'thisAndFollowing',
          title: 'New tail',
        }),
      );
    });
  });
});
