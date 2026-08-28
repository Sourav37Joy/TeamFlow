import { CalendarDate, isCalendarDate, todayIn } from '../calc/dates';
import { ValidationFailed } from './errors';

const ORG_TIMEZONE = process.env.ORG_TIMEZONE ?? 'UTC';

// The evaluation date is resolved once per request in one organisation timezone, then
// passed explicitly into every calculation, so no two views can disagree (D-07).
export function resolveAsOf(raw: unknown): CalendarDate {
  if (raw === undefined || raw === null || raw === '') {
    return todayIn(ORG_TIMEZONE);
  }
  if (typeof raw !== 'string' || !isCalendarDate(raw)) {
    throw new ValidationFailed([
      {
        field: 'asOf',
        value: raw,
        permitted: 'a calendar date in YYYY-MM-DD form',
        code: 'INVALID_DATE',
      },
    ]);
  }
  return raw;
}

// "Has this already ended?" is a question about today, not about whatever date the caller is
// browsing, so it never takes an evaluation date from the query string (FR-049).
export function todayHere(): CalendarDate {
  return todayIn(ORG_TIMEZONE);
}
