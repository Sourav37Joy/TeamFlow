export type CalendarDate = string;

const PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: string): value is CalendarDate {
  if (!PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function parseCalendarDate(value: string): Date {
  if (!isCalendarDate(value)) {
    throw new Error(`Not a calendar date: ${value}. Expected YYYY-MM-DD.`);
  }
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatCalendarDate(date: Date): CalendarDate {
  return date.toISOString().slice(0, 10);
}

// A range is inclusive at both ends, so a one-day assignment covers its own start date.
export function isWithinRange(date: CalendarDate, start: CalendarDate, end: CalendarDate): boolean {
  return date >= start && date <= end;
}

export function isRangeOrdered(start: CalendarDate, end: CalendarDate): boolean {
  return start <= end;
}

// A replacement ends the outgoing commitment the day before the handover takes effect (FR-046).
export function dayBefore(date: CalendarDate): CalendarDate {
  const d = parseCalendarDate(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return formatCalendarDate(d);
}

// The mirror of dayBefore. Nothing in the application needs it, but stepping forward is what
// makes the round-trip invariant SC-007 rests on testable over a whole year.
export function dayAfter(date: CalendarDate): CalendarDate {
  const d = parseCalendarDate(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return formatCalendarDate(d);
}

// "Today" is resolved in one organisation timezone so two viewers never disagree (D-07).
export function todayIn(timeZone: string, now: Date = new Date()): CalendarDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
