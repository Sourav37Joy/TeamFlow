import { describe, expect, it } from 'vitest';
import {
  dayAfter,
  dayBefore,
  formatCalendarDate,
  isCalendarDate,
  isRangeOrdered,
  isWithinRange,
  parseCalendarDate,
  todayIn,
} from '../../src/backend/calc/dates';

describe('isCalendarDate', () => {
  it('accepts a well-formed date', () => {
    expect(isCalendarDate('2026-09-01')).toBe(true);
  });

  it('rejects malformed input', () => {
    for (const bad of ['2026-9-1', '01-09-2026', '2026/09/01', '', 'today']) {
      expect(isCalendarDate(bad)).toBe(false);
    }
  });

  it('rejects a date that does not exist', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2025-02-29')).toBe(false);
    expect(isCalendarDate('2024-02-29')).toBe(true);
  });
});

describe('isWithinRange - inclusive at both ends', () => {
  const start = '2026-09-01';
  const end = '2026-12-31';

  it('includes the start date', () => {
    expect(isWithinRange(start, start, end)).toBe(true);
  });

  it('includes the end date', () => {
    expect(isWithinRange(end, start, end)).toBe(true);
  });

  it('excludes the day before the start', () => {
    expect(isWithinRange('2026-08-31', start, end)).toBe(false);
  });

  it('excludes the day after the end', () => {
    expect(isWithinRange('2027-01-01', start, end)).toBe(false);
  });

  it('handles a single-day range', () => {
    expect(isWithinRange('2026-10-01', '2026-10-01', '2026-10-01')).toBe(true);
    expect(isWithinRange('2026-10-02', '2026-10-01', '2026-10-01')).toBe(false);
  });
});

describe('dayBefore - the boundary SC-007 measures', () => {
  it('steps back within a month', () => {
    expect(dayBefore('2026-10-15')).toBe('2026-10-14');
  });

  it('steps back across a month boundary', () => {
    expect(dayBefore('2026-10-01')).toBe('2026-09-30');
  });

  it('steps back across a year boundary', () => {
    expect(dayBefore('2027-01-01')).toBe('2026-12-31');
  });

  it('steps back across a leap-year February', () => {
    expect(dayBefore('2024-03-01')).toBe('2024-02-29');
  });

  it('steps back across a non-leap February', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
  });

  it('never loses a day to a timezone shift over a full year', () => {
    let cursor = '2026-01-01';
    for (let i = 0; i < 365; i += 1) {
      const next = dayAfter(cursor);
      expect(dayBefore(next)).toBe(cursor);
      cursor = next;
    }
    expect(cursor).toBe('2027-01-01');
  });
});

describe('isRangeOrdered', () => {
  it('accepts equal start and end', () => {
    expect(isRangeOrdered('2026-10-01', '2026-10-01')).toBe(true);
  });

  it('rejects an end before its start', () => {
    expect(isRangeOrdered('2026-10-02', '2026-10-01')).toBe(false);
  });
});

describe('parse and format round-trip', () => {
  it('returns the same string it was given', () => {
    for (const d of ['2026-01-01', '2026-02-29'.replace('2026', '2024'), '2026-12-31']) {
      expect(formatCalendarDate(parseCalendarDate(d))).toBe(d);
    }
  });

  it('throws on input that is not a calendar date', () => {
    expect(() => parseCalendarDate('2026-13-01')).toThrow();
  });
});

describe('todayIn', () => {
  it('resolves the same instant to different dates in different zones', () => {
    const instant = new Date('2026-08-28T23:30:00Z');
    expect(todayIn('UTC', instant)).toBe('2026-08-28');
    expect(todayIn('Asia/Dhaka', instant)).toBe('2026-08-29');
  });
});
