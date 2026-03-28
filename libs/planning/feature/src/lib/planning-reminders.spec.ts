import { describe, it, expect } from 'vitest';
import { REMINDER_OPTIONS } from './planning.utils';
import { PlanningDetailDialogComponent } from './planning-detail-dialog.component';

// Access the protected method without TypeScript errors.
type DetailAny = { formatReminder: (minutes: number) => string };

// ---------------------------------------------------------------------------
// REMINDER_OPTIONS
// ---------------------------------------------------------------------------

describe('REMINDER_OPTIONS', () => {
  it('has "No reminder" as the first entry with value null', () => {
    expect(REMINDER_OPTIONS[0]).toEqual({ label: 'No reminder', value: null });
  });

  it('contains all eight expected presets', () => {
    const values = REMINDER_OPTIONS.map((o) => o.value);
    expect(values).toEqual([null, 5, 10, 15, 30, 60, 120, 1440]);
  });

  it('every non-null value is a positive integer within [1, 1440]', () => {
    for (const opt of REMINDER_OPTIONS) {
      if (opt.value !== null) {
        expect(Number.isInteger(opt.value)).toBe(true);
        expect(opt.value).toBeGreaterThanOrEqual(1);
        expect(opt.value).toBeLessThanOrEqual(1440);
      }
    }
  });

  it('labels are non-empty strings', () => {
    for (const opt of REMINDER_OPTIONS) {
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });

  it('values are strictly ascending (excluding the null lead entry)', () => {
    const numeric = REMINDER_OPTIONS.filter((o) => o.value !== null).map(
      (o) => o.value as number,
    );
    for (let i = 1; i < numeric.length; i++) {
      expect(numeric[i]).toBeGreaterThan(numeric[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// PlanningDetailDialogComponent.formatReminder()
// ---------------------------------------------------------------------------

describe('PlanningDetailDialogComponent.formatReminder()', () => {
  // Instantiate the component directly — no TestBed needed for a pure method.
  const comp = new PlanningDetailDialogComponent() as unknown as DetailAny;

  it('formats a sub-hour value as "N minutes before"', () => {
    expect(comp.formatReminder(5)).toBe('5 minutes before');
    expect(comp.formatReminder(10)).toBe('10 minutes before');
    expect(comp.formatReminder(15)).toBe('15 minutes before');
    expect(comp.formatReminder(30)).toBe('30 minutes before');
  });

  it('formats exactly 60 minutes as "1 hour before"', () => {
    expect(comp.formatReminder(60)).toBe('1 hour before');
  });

  it('formats 120 minutes as "2 hours before"', () => {
    expect(comp.formatReminder(120)).toBe('2 hours before');
  });

  it('formats any other sub-1440 multiple of 60 as "N hours before"', () => {
    expect(comp.formatReminder(180)).toBe('3 hours before');
    expect(comp.formatReminder(240)).toBe('4 hours before');
  });

  it('formats 1440 minutes as "1 day before"', () => {
    expect(comp.formatReminder(1440)).toBe('1 day before');
  });

  it('produces the correct label for every REMINDER_OPTIONS preset', () => {
    const expected: Record<number, string> = {
      5: '5 minutes before',
      10: '10 minutes before',
      15: '15 minutes before',
      30: '30 minutes before',
      60: '1 hour before',
      120: '2 hours before',
      1440: '1 day before',
    };
    for (const [value, label] of Object.entries(expected)) {
      expect(comp.formatReminder(Number(value))).toBe(label);
    }
  });
});
