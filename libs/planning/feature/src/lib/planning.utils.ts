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
}

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
