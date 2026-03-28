export interface EventForm {
  title: string;
  startUtc: string;
  endUtc: string;
  isAllDay: boolean;
  description: string;
  location: string;
  eventTimezone: string;
  rrule: string;
  attendeeIds: string[];
  notifyAttendees: boolean;
  reminderMinutes: number | null;
}

/** Reminder preset options for the form dropdown. */
export const REMINDER_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'No reminder', value: null },
  { label: '5 minutes before', value: 5 },
  { label: '10 minutes before', value: 10 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
];

/**
 * Returns the browser's local IANA timezone (e.g. 'Europe/Rome').
 * Falls back to 'UTC' if the API is unavailable.
 */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function _tzOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

/** All IANA timezones as select options, sorted alphabetically. */
export const TIMEZONE_OPTIONS: { label: string; value: string }[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone').map((tz) => ({
      label: `${tz} (${_tzOffset(tz)})`,
      value: tz,
    }));
  } catch {
    return [{ label: 'UTC (GMT+0)', value: 'UTC' }];
  }
})();

export function toLocalDatetimeInput(utcIso: string): string {
  // Convert ISO UTC string to datetime-local input value (YYYY-MM-DDTHH:mm)
  return utcIso.slice(0, 16);
}

export function toUtcIso(localDatetime: string): string {
  // Treat input as UTC (users are expected to enter UTC times in v1)
  return localDatetime.length === 16
    ? `${localDatetime}:00.000Z`
    : localDatetime;
}
