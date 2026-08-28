import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { FieldDetail, ValidationFailed } from './errors';

// Derived figures are computed, never accepted from a caller (FR-037, Constitution III).
const DERIVED_FIELDS = [
  'utilizationPercent',
  'remainingCapacityPercent',
  'loadLabel',
  'filledHeadcount',
  'shortfall',
  'surplus',
  'staffingStatus',
  'overallScore',
  'skillComponent',
  'capacityComponent',
];

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    if (value && typeof value === 'object') {
      const offending = DERIVED_FIELDS.filter((f) => f in (value as Record<string, unknown>));
      if (offending.length > 0) {
        throw new ValidationFailed(
          offending.map((field) => ({
            field,
            permitted: 'omitted - this figure is derived and cannot be supplied',
            code: 'DERIVED_FIGURE_SUPPLIED',
          })),
        );
      }
    }

    const parsed = this.schema.safeParse(value);
    if (parsed.success) return parsed.data;

    const details: FieldDetail[] = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      permitted: issue.message,
      code: issue.code.toUpperCase(),
    }));
    throw new ValidationFailed(details);
  }
}
