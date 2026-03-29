import { describe, it, expect, vi } from 'vitest';
import {
  REMINDER_OPTIONS,
  browserTimezone,
  toLocalDatetimeInput,
  toUtcIso,
} from './planning.utils';
import { PlanningDetailDialogComponent } from './planning-detail-dialog.component';

// Access the protected methods without TypeScript errors.
type DetailAny = {
  formatReminder: (minutes: number) => string;
  memberDisplayName: (userId: string) => string;
  memberInitials: (userId: string) => string;
  rsvpSeverity: (status: string) => string;
  ngOnChanges: () => void;
  members: unknown[];
  memberMap: Map<string, unknown>;
};

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

// ---------------------------------------------------------------------------
// browserTimezone()
// ---------------------------------------------------------------------------

describe('browserTimezone()', () => {
  it('returns a non-empty string', () => {
    const tz = browserTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });

  it('falls back to "UTC" when Intl.DateTimeFormat throws', () => {
    const original = Intl.DateTimeFormat;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Intl as any).DateTimeFormat = () => {
      throw new Error('unavailable');
    };
    try {
      expect(browserTimezone()).toBe('UTC');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).DateTimeFormat = original;
    }
  });
});

// ---------------------------------------------------------------------------
// toLocalDatetimeInput()
// ---------------------------------------------------------------------------

describe('toLocalDatetimeInput()', () => {
  it('slices an ISO string to the first 16 characters (YYYY-MM-DDTHH:mm)', () => {
    expect(toLocalDatetimeInput('2026-01-05T10:30:00.000Z')).toBe(
      '2026-01-05T10:30',
    );
  });

  it('works when the input is already 16 characters', () => {
    expect(toLocalDatetimeInput('2026-01-05T10:30')).toBe('2026-01-05T10:30');
  });
});

// ---------------------------------------------------------------------------
// toUtcIso()
// ---------------------------------------------------------------------------

describe('toUtcIso()', () => {
  it('appends :00.000Z when input is exactly 16 chars', () => {
    expect(toUtcIso('2026-01-05T10:30')).toBe('2026-01-05T10:30:00.000Z');
  });

  it('returns the input unchanged when longer than 16 chars', () => {
    const iso = '2026-01-05T10:30:00.000Z';
    expect(toUtcIso(iso)).toBe(iso);
  });

  it('returns the input unchanged when shorter than 16 chars', () => {
    expect(toUtcIso('2026-01-05')).toBe('2026-01-05');
  });
});

// ---------------------------------------------------------------------------
// PlanningDetailDialogComponent.memberDisplayName()
// ---------------------------------------------------------------------------

describe('PlanningDetailDialogComponent.memberDisplayName()', () => {
  const comp = new PlanningDetailDialogComponent() as unknown as DetailAny;

  it('returns userId when member is not in the map', () => {
    comp.memberMap = new Map();
    expect(comp.memberDisplayName('u1')).toBe('u1');
  });

  it('returns userId when user is null', () => {
    comp.memberMap = new Map([['u1', { user: null }]]);
    expect(comp.memberDisplayName('u1')).toBe('u1');
  });

  it('returns full name when both first and last name are set', () => {
    comp.memberMap = new Map([
      [
        'u1',
        { user: { firstName: 'John', lastName: 'Doe', email: 'j@d.com' } },
      ],
    ]);
    expect(comp.memberDisplayName('u1')).toBe('John Doe');
  });

  it('returns first name only when last name is absent', () => {
    comp.memberMap = new Map([
      [
        'u1',
        { user: { firstName: 'Alice', lastName: null, email: 'a@b.com' } },
      ],
    ]);
    expect(comp.memberDisplayName('u1')).toBe('Alice');
  });

  it('falls back to email when name is empty', () => {
    comp.memberMap = new Map([
      [
        'u1',
        {
          user: { firstName: null, lastName: null, email: 'alice@example.com' },
        },
      ],
    ]);
    expect(comp.memberDisplayName('u1')).toBe('alice@example.com');
  });

  it('falls back to userId when name and email are both absent', () => {
    comp.memberMap = new Map([
      ['u1', { user: { firstName: null, lastName: null, email: null } }],
    ]);
    expect(comp.memberDisplayName('u1')).toBe('u1');
  });
});

// ---------------------------------------------------------------------------
// PlanningDetailDialogComponent.memberInitials()
// ---------------------------------------------------------------------------

describe('PlanningDetailDialogComponent.memberInitials()', () => {
  const comp = new PlanningDetailDialogComponent() as unknown as DetailAny;

  it('returns "?" when member is not in the map', () => {
    comp.memberMap = new Map();
    expect(comp.memberInitials('u1')).toBe('?');
  });

  it('returns "?" when user is null', () => {
    comp.memberMap = new Map([['u1', { user: null }]]);
    expect(comp.memberInitials('u1')).toBe('?');
  });

  it('returns uppercase initials from first + last name', () => {
    comp.memberMap = new Map([
      [
        'u1',
        { user: { firstName: 'John', lastName: 'Doe', email: 'j@d.com' } },
      ],
    ]);
    expect(comp.memberInitials('u1')).toBe('JD');
  });

  it('returns single initial when only first name is set', () => {
    comp.memberMap = new Map([
      [
        'u1',
        { user: { firstName: 'Alice', lastName: null, email: 'a@b.com' } },
      ],
    ]);
    expect(comp.memberInitials('u1')).toBe('A');
  });

  it('falls back to first letter of email when no name', () => {
    comp.memberMap = new Map([
      [
        'u1',
        {
          user: { firstName: null, lastName: null, email: 'zara@example.com' },
        },
      ],
    ]);
    expect(comp.memberInitials('u1')).toBe('Z');
  });

  it('returns "?" when name and email are both absent', () => {
    comp.memberMap = new Map([
      ['u1', { user: { firstName: null, lastName: null, email: null } }],
    ]);
    expect(comp.memberInitials('u1')).toBe('?');
  });
});

// ---------------------------------------------------------------------------
// PlanningDetailDialogComponent.rsvpSeverity()
// ---------------------------------------------------------------------------

describe('PlanningDetailDialogComponent.rsvpSeverity()', () => {
  const comp = new PlanningDetailDialogComponent() as unknown as DetailAny;

  it('returns "success" for YES', () => {
    expect(comp.rsvpSeverity('YES')).toBe('success');
  });

  it('returns "warn" for MAYBE', () => {
    expect(comp.rsvpSeverity('MAYBE')).toBe('warn');
  });

  it('returns "danger" for NO', () => {
    expect(comp.rsvpSeverity('NO')).toBe('danger');
  });

  it('returns "secondary" for PENDING (and any unknown status)', () => {
    expect(comp.rsvpSeverity('PENDING')).toBe('secondary');
    expect(comp.rsvpSeverity('UNKNOWN')).toBe('secondary');
  });
});

// ---------------------------------------------------------------------------
// PlanningDetailDialogComponent.ngOnChanges()
// ---------------------------------------------------------------------------

describe('PlanningDetailDialogComponent.ngOnChanges()', () => {
  const comp = new PlanningDetailDialogComponent() as unknown as DetailAny;

  it('builds memberMap keyed by userId', () => {
    comp.members = [{ userId: 'u1', user: { firstName: 'A' } }];
    comp.ngOnChanges();
    expect(comp.memberMap.has('u1')).toBe(true);
  });

  it('uses empty-string key when member.userId is null or undefined', () => {
    comp.members = [
      { userId: undefined, user: { firstName: 'NoId' } },
      { userId: null, user: { firstName: 'NoId2' } },
    ];
    comp.ngOnChanges();
    expect(comp.memberMap.has('')).toBe(true);
  });
});
