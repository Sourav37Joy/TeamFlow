import { z } from 'zod';
import { isCalendarDate } from '../calc/dates';
import { ValidationFailed } from './errors';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const OBJECT_ID_RULE = 'a 24-character hexadecimal identifier';
const RATING_RULE = 'an integer from 1 to 5';

export const objectIdSchema = z.string().regex(OBJECT_ID, OBJECT_ID_RULE);

export const calendarDateSchema = z
  .string()
  .refine(isCalendarDate, 'a calendar date in YYYY-MM-DD form');

export const nameSchema = (subject: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${subject} of 1 to ${max} characters`)
    .max(max, `${subject} of 1 to ${max} characters`);

export const ratingSchema = z.number().int().min(1, RATING_RULE).max(5, RATING_RULE);

export const percentSchema = (subject: string) =>
  z.number().int().min(1, `${subject} from 1 to 100`).max(100, `${subject} from 1 to 100`);

// A path parameter reaches Prisma as a raw string. Checking its shape here turns a driver
// failure into a refusal that names the field and what it permits (FR-078).
export function requireObjectId(field: string, value: string): string {
  if (!OBJECT_ID.test(value)) {
    throw new ValidationFailed([{ field, value, permitted: OBJECT_ID_RULE, code: 'INVALID_ID' }]);
  }
  return value;
}

export function nameIndex(records: Array<{ id: string; name: string }>): Map<string, string> {
  return new Map(records.map((record) => [record.id, record.name]));
}

export interface PersonLabel {
  name: string;
  avatarUrl: string | null;
}

// A person's name and their portrait travel together, so every screen that can name somebody
// can also show their face without a second lookup of its own.
export function personIndex(
  records: Array<{ id: string; name: string; avatarUrl: string | null }>,
): Map<string, PersonLabel> {
  return new Map(
    records.map((record) => [record.id, { name: record.name, avatarUrl: record.avatarUrl }]),
  );
}

export function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function nameContains(q?: string): { contains: string; mode: 'insensitive' } | undefined {
  const term = q?.trim();
  return term ? { contains: term, mode: 'insensitive' } : undefined;
}
