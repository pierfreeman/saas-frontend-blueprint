import { describe, it, expect } from 'vitest';
import {
  browserTimezone,
  toUtcIso,
  toLocalDatetimeInput,
  REMINDER_OPTIONS,
  TIMEZONE_OPTIONS,
} from './planning.utils';

describe('planning.utils', () => {
  describe('browserTimezone()', () => {
    it('returns the IANA timezone string from the browser', () => {
      const tz = browserTimezone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });

    it('returns "UTC" when Intl.DateTimeFormat throws', () => {
      const original = Intl.DateTimeFormat;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Intl as any).DateTimeFormat = function () {
          throw new Error('not supported');
        };
        expect(browserTimezone()).toBe('UTC');
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Intl as any).DateTimeFormat = original;
      }
    });
  });

  describe('toUtcIso()', () => {
    it('appends :00.000Z when input is 16 chars (datetime-local format)', () => {
      expect(toUtcIso('2026-01-05T10:00')).toBe('2026-01-05T10:00:00.000Z');
    });

    it('returns input unchanged when length is not 16', () => {
      const full = '2026-01-05T10:00:00.000Z';
      expect(toUtcIso(full)).toBe(full);
    });

    it('returns empty string unchanged', () => {
      expect(toUtcIso('')).toBe('');
    });
  });

  describe('toLocalDatetimeInput()', () => {
    it('strips to YYYY-MM-DDTHH:mm', () => {
      expect(toLocalDatetimeInput('2026-01-05T10:00:00.000Z')).toBe(
        '2026-01-05T10:00',
      );
    });
  });

  describe('REMINDER_OPTIONS', () => {
    it('has a "No reminder" entry as the first item', () => {
      expect(REMINDER_OPTIONS.length).toBeGreaterThan(0);
      expect(REMINDER_OPTIONS[0]).toEqual({
        label: 'No reminder',
        value: null,
      });
    });
  });

  describe('TIMEZONE_OPTIONS', () => {
    it('contains at least one valid entry with label and value', () => {
      expect(TIMEZONE_OPTIONS.length).toBeGreaterThan(0);
      expect(TIMEZONE_OPTIONS[0]).toHaveProperty('label');
      expect(TIMEZONE_OPTIONS[0]).toHaveProperty('value');
    });
  });
});
