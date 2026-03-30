import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { vi } from 'vitest';
import {
  PlanningRruleBuilderComponent,
  type RruleFreq,
  type RruleEndType,
} from './planning-rrule-builder.component';

// Access protected / private members without ts errors
type BuilderAny = {
  state: {
    freq: RruleFreq;
    interval: number;
    byweekday: number[];
    endType: RruleEndType;
    count: number;
    until: Date | null;
  };
  freqLabel: string;
  onFreqChange(): void;
  isDaySelected(day: number): boolean;
  toggleDay(day: number): void;
  onCountChange(): void;
  onUntilChange(): void;
  emit(): void;
} & PlanningRruleBuilderComponent;

function setRrule(
  fixture: ComponentFixture<PlanningRruleBuilderComponent>,
  rrule: string,
): void {
  fixture.componentInstance.rrule = rrule;
  fixture.componentInstance.ngOnChanges({
    rrule: new SimpleChange(undefined, rrule, false),
  });
}

describe('PlanningRruleBuilderComponent', () => {
  let fixture: ComponentFixture<PlanningRruleBuilderComponent>;
  let comp: BuilderAny;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningRruleBuilderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningRruleBuilderComponent);
    comp = fixture.componentInstance as unknown as BuilderAny;
    fixture.detectChanges();
  });

  // ── Parsing via ngOnChanges ──────────────────────────────────────────────

  describe('parsing — empty / none', () => {
    it('defaults to freq=none when rrule is empty', () => {
      setRrule(fixture, '');
      expect(comp.state.freq).toBe('none');
    });

    it('defaults to freq=none when rrule is whitespace', () => {
      setRrule(fixture, '   ');
      expect(comp.state.freq).toBe('none');
    });

    it('falls back to none on an invalid RRULE string', () => {
      setRrule(fixture, 'NOT_VALID_RRULE');
      expect(comp.state.freq).toBe('none');
    });
  });

  describe('parsing — frequency', () => {
    it('parses FREQ=DAILY', () => {
      setRrule(fixture, 'FREQ=DAILY');
      expect(comp.state.freq).toBe('daily');
    });

    it('parses FREQ=WEEKLY', () => {
      setRrule(fixture, 'FREQ=WEEKLY');
      expect(comp.state.freq).toBe('weekly');
    });

    it('parses FREQ=MONTHLY', () => {
      setRrule(fixture, 'FREQ=MONTHLY');
      expect(comp.state.freq).toBe('monthly');
    });

    it('parses FREQ=YEARLY', () => {
      setRrule(fixture, 'FREQ=YEARLY');
      expect(comp.state.freq).toBe('yearly');
    });
  });

  describe('parsing — interval', () => {
    it('defaults interval to 1 when not specified', () => {
      setRrule(fixture, 'FREQ=DAILY');
      expect(comp.state.interval).toBe(1);
    });

    it('parses INTERVAL=3', () => {
      setRrule(fixture, 'FREQ=DAILY;INTERVAL=3');
      expect(comp.state.interval).toBe(3);
    });

    it('parses INTERVAL=2 on a weekly rule', () => {
      setRrule(fixture, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO');
      expect(comp.state.interval).toBe(2);
    });
  });

  describe('parsing — BYDAY / byweekday', () => {
    it('parses a single weekday MO → [0]', () => {
      setRrule(fixture, 'FREQ=WEEKLY;BYDAY=MO');
      expect(comp.state.byweekday).toEqual([0]);
    });

    it('parses multiple weekdays MO,WE,FR → [0,2,4]', () => {
      setRrule(fixture, 'FREQ=WEEKLY;BYDAY=MO,WE,FR');
      expect(comp.state.byweekday).toEqual([0, 2, 4]);
    });

    it('parses SA,SU → [5, 6]', () => {
      setRrule(fixture, 'FREQ=WEEKLY;BYDAY=SA,SU');
      expect(comp.state.byweekday).toEqual([5, 6]);
    });

    it('leaves byweekday empty for non-weekly frequencies', () => {
      setRrule(fixture, 'FREQ=DAILY');
      expect(comp.state.byweekday).toEqual([]);
    });
  });

  describe('parsing — end type', () => {
    it('defaults endType to never', () => {
      setRrule(fixture, 'FREQ=DAILY');
      expect(comp.state.endType).toBe('never');
    });

    it('parses COUNT=5 → endType=count, count=5', () => {
      setRrule(fixture, 'FREQ=WEEKLY;BYDAY=MO;COUNT=5');
      expect(comp.state.endType).toBe('count');
      expect(comp.state.count).toBe(5);
    });

    it('parses UNTIL date → endType=until, until=Date', () => {
      setRrule(fixture, 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T000000Z');
      expect(comp.state.endType).toBe('until');
      expect(comp.state.until).toBeInstanceOf(Date);
      expect(comp.state.until!.getUTCFullYear()).toBe(2026);
      expect(comp.state.until!.getUTCMonth()).toBe(11); // December
      expect(comp.state.until!.getUTCDate()).toBe(31);
    });
  });

  // ── freqLabel getter ─────────────────────────────────────────────────────

  describe('freqLabel', () => {
    it('returns empty string for none', () => {
      comp.state.freq = 'none';
      expect(comp.freqLabel).toBe('');
    });

    it('returns "day(s)" for daily', () => {
      comp.state.freq = 'daily';
      expect(comp.freqLabel).toBe('day(s)');
    });

    it('returns "week(s)" for weekly', () => {
      comp.state.freq = 'weekly';
      expect(comp.freqLabel).toBe('week(s)');
    });

    it('returns "month(s)" for monthly', () => {
      comp.state.freq = 'monthly';
      expect(comp.freqLabel).toBe('month(s)');
    });

    it('returns "year(s)" for yearly', () => {
      comp.state.freq = 'yearly';
      expect(comp.freqLabel).toBe('year(s)');
    });
  });

  // ── onFreqChange ─────────────────────────────────────────────────────────

  describe('onFreqChange()', () => {
    it('pre-selects Monday (0) when switching to weekly with empty byweekday', () => {
      comp.state.freq = 'weekly';
      comp.state.byweekday = [];
      comp.onFreqChange();
      expect(comp.state.byweekday).toEqual([0]);
    });

    it('does not reset byweekday when switching to weekly with existing days', () => {
      comp.state.freq = 'weekly';
      comp.state.byweekday = [2, 4]; // Wed, Fri
      comp.onFreqChange();
      expect(comp.state.byweekday).toEqual([2, 4]);
    });

    it('emits the built RRULE string on freq change', () => {
      const emitted: string[] = [];
      fixture.componentInstance.rruleChange.subscribe((v) => emitted.push(v));
      comp.state.freq = 'daily';
      comp.state.byweekday = [];
      comp.state.interval = 1;
      comp.state.endType = 'never';
      comp.onFreqChange();
      expect(emitted.length).toBe(1);
      expect(emitted[0]).toContain('FREQ=DAILY');
    });
  });

  // ── isDaySelected ────────────────────────────────────────────────────────

  describe('isDaySelected()', () => {
    it('returns true when day is in byweekday', () => {
      comp.state.byweekday = [0, 2, 4];
      expect(comp.isDaySelected(0)).toBe(true);
      expect(comp.isDaySelected(2)).toBe(true);
      expect(comp.isDaySelected(4)).toBe(true);
    });

    it('returns false when day is not in byweekday', () => {
      comp.state.byweekday = [0, 2];
      expect(comp.isDaySelected(1)).toBe(false);
      expect(comp.isDaySelected(6)).toBe(false);
    });
  });

  // ── toggleDay ────────────────────────────────────────────────────────────

  describe('toggleDay()', () => {
    it('adds a day that is not yet selected, keeping list sorted', () => {
      comp.state.byweekday = [0, 4]; // Mo, Fr
      comp.toggleDay(2); // We
      expect(comp.state.byweekday).toEqual([0, 2, 4]);
    });

    it('removes a day when multiple are selected', () => {
      comp.state.byweekday = [0, 2, 4];
      comp.toggleDay(2);
      expect(comp.state.byweekday).toEqual([0, 4]);
    });

    it('does NOT remove the last remaining day', () => {
      comp.state.byweekday = [3]; // only Thursday
      comp.toggleDay(3);
      expect(comp.state.byweekday).toEqual([3]);
    });

    it('emits after toggling', () => {
      const emitted: string[] = [];
      fixture.componentInstance.rruleChange.subscribe((v) => emitted.push(v));
      comp.state.freq = 'weekly';
      comp.state.byweekday = [0];
      comp.state.interval = 1;
      comp.state.endType = 'never';
      comp.toggleDay(2); // add Wednesday
      expect(emitted.length).toBe(1);
    });
  });

  // ── onCountChange / onUntilChange ────────────────────────────────────────

  describe('onCountChange()', () => {
    it('sets endType to count', () => {
      comp.state.endType = 'never';
      comp.state.freq = 'daily';
      comp.state.count = 7;
      comp.onCountChange();
      expect(comp.state.endType).toBe('count');
    });

    it('emits after count change', () => {
      const emitted: string[] = [];
      fixture.componentInstance.rruleChange.subscribe((v) => emitted.push(v));
      comp.state.freq = 'daily';
      comp.state.interval = 1;
      comp.state.count = 7;
      comp.onCountChange();
      expect(emitted.length).toBe(1);
    });
  });

  describe('onUntilChange()', () => {
    it('sets endType to until', () => {
      comp.state.endType = 'never';
      comp.state.freq = 'daily';
      comp.state.until = new Date('2026-12-31');
      comp.onUntilChange();
      expect(comp.state.endType).toBe('until');
    });

    it('emits after until change', () => {
      const emitted: string[] = [];
      fixture.componentInstance.rruleChange.subscribe((v) => emitted.push(v));
      comp.state.freq = 'daily';
      comp.state.interval = 1;
      comp.state.until = new Date('2026-12-31');
      comp.onUntilChange();
      expect(emitted.length).toBe(1);
    });
  });

  // ── Building RRULE strings (via emit / rruleChange) ──────────────────────

  describe('emit() — building RRULE strings', () => {
    function emitAndCapture(): string {
      let result = '';
      const sub = fixture.componentInstance.rruleChange.subscribe(
        (v) => (result = v),
      );
      comp.emit();
      sub.unsubscribe();
      return result;
    }

    it('emits empty string when freq is none', () => {
      comp.state.freq = 'none';
      expect(emitAndCapture()).toBe('');
    });

    it('emits FREQ=DAILY for daily / interval=1 / never', () => {
      comp.state = {
        freq: 'daily',
        interval: 1,
        byweekday: [],
        endType: 'never',
        count: 10,
        until: null,
      };
      expect(emitAndCapture()).toBe('FREQ=DAILY');
    });

    it('emits FREQ=DAILY;INTERVAL=3 for interval=3', () => {
      comp.state = {
        freq: 'daily',
        interval: 3,
        byweekday: [],
        endType: 'never',
        count: 10,
        until: null,
      };
      expect(emitAndCapture()).toBe('FREQ=DAILY;INTERVAL=3');
    });

    it('emits FREQ=WEEKLY;BYDAY=MO for weekly / Mo only', () => {
      comp.state = {
        freq: 'weekly',
        interval: 1,
        byweekday: [0],
        endType: 'never',
        count: 10,
        until: null,
      };
      expect(emitAndCapture()).toBe('FREQ=WEEKLY;BYDAY=MO');
    });

    it('emits FREQ=WEEKLY;BYDAY=MO,WE,FR for Mon/Wed/Fri', () => {
      comp.state = {
        freq: 'weekly',
        interval: 1,
        byweekday: [0, 2, 4],
        endType: 'never',
        count: 10,
        until: null,
      };
      expect(emitAndCapture()).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    });

    it('emits FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;COUNT=5 for biweekly Friday / 5 occurrences', () => {
      comp.state = {
        freq: 'weekly',
        interval: 2,
        byweekday: [4],
        endType: 'count',
        count: 5,
        until: null,
      };
      expect(emitAndCapture()).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;COUNT=5');
    });

    it('emits FREQ=MONTHLY for monthly / interval=1 / never', () => {
      comp.state = {
        freq: 'monthly',
        interval: 1,
        byweekday: [],
        endType: 'never',
        count: 10,
        until: null,
      };
      expect(emitAndCapture()).toBe('FREQ=MONTHLY');
    });

    it('emits FREQ=YEARLY for yearly / interval=1 / never', () => {
      comp.state = {
        freq: 'yearly',
        interval: 1,
        byweekday: [],
        endType: 'never',
        count: 10,
        until: null,
      };
      expect(emitAndCapture()).toBe('FREQ=YEARLY');
    });

    it('includes UNTIL when endType is until', () => {
      comp.state = {
        freq: 'monthly',
        interval: 1,
        byweekday: [],
        endType: 'until',
        count: 10,
        until: new Date('2026-12-31T00:00:00Z'),
      };
      const result = emitAndCapture();
      expect(result).toContain('FREQ=MONTHLY');
      expect(result).toContain('UNTIL=20261231');
    });

    it('does NOT include UNTIL when endType is until but until is null', () => {
      comp.state = {
        freq: 'daily',
        interval: 1,
        byweekday: [],
        endType: 'until',
        count: 10,
        until: null,
      };
      const result = emitAndCapture();
      expect(result).not.toContain('UNTIL');
    });

    it('does NOT include byweekday for non-weekly frequencies', () => {
      comp.state = {
        freq: 'monthly',
        interval: 1,
        byweekday: [0, 2],
        endType: 'never',
        count: 10,
        until: null,
      };
      const result = emitAndCapture();
      expect(result).not.toContain('BYDAY');
    });
  });

  // ── Round-trip parse → build ──────────────────────────────────────────────

  describe('round-trip: parse then build', () => {
    function roundTrip(rrule: string): string {
      setRrule(fixture, rrule);
      let result = '';
      const sub = fixture.componentInstance.rruleChange.subscribe(
        (v) => (result = v),
      );
      comp.emit();
      sub.unsubscribe();
      return result;
    }

    it('FREQ=DAILY round-trips correctly', () => {
      expect(roundTrip('FREQ=DAILY')).toBe('FREQ=DAILY');
    });

    it('FREQ=WEEKLY;BYDAY=MO,WE,FR round-trips correctly', () => {
      expect(roundTrip('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe(
        'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      );
    });

    it('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;COUNT=10 round-trips correctly', () => {
      expect(roundTrip('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;COUNT=10')).toBe(
        'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;COUNT=10',
      );
    });

    it('FREQ=MONTHLY round-trips correctly', () => {
      expect(roundTrip('FREQ=MONTHLY')).toBe('FREQ=MONTHLY');
    });

    it('FREQ=YEARLY round-trips correctly', () => {
      expect(roundTrip('FREQ=YEARLY')).toBe('FREQ=YEARLY');
    });
  });
});
