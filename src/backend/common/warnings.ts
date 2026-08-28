import { CalendarDate } from '../calc/dates';
import { WarningsNotAcknowledged } from './errors';

export type WarningCode =
  | 'WOULD_OVERALLOCATE'
  | 'REPLACEMENT_SINGLE_DAY'
  | 'OUTGOING_ASSIGNMENT_REMOVED'
  | 'ROLE_NOT_DECLARED';

export interface Warning {
  code: WarningCode;
  message: string;
  [detail: string]: unknown;
}

export interface WriteOptions {
  dryRun: boolean;
  acknowledgeWarnings: boolean;
}

export function readWriteOptions(query: Record<string, unknown>, body: unknown): WriteOptions {
  const ack =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).acknowledgeWarnings === true
      : false;
  return { dryRun: query.dryRun === 'true' || query.dryRun === true, acknowledgeWarnings: ack };
}

export function overallocationWarning(
  employeeName: string,
  resultingPercent: number,
  capacityPercent: number,
  onDate: CalendarDate | null,
): Warning {
  return {
    code: 'WOULD_OVERALLOCATE',
    message: `${employeeName} would be committed to ${resultingPercent}% of ${capacityPercent}% capacity${
      onDate ? ` from ${onDate}` : ''
    }. This is allowed - confirm to proceed.`,
    employeeName,
    resultingPercent,
    capacityPercent,
    onDate,
  };
}

export function roleNotDeclaredWarning(projectName: string, roleName: string): Warning {
  return {
    code: 'ROLE_NOT_DECLARED',
    message: `${projectName} does not declare a ${roleName} requirement. The assignment will show as unrequested surplus.`,
    projectName,
    roleName,
  };
}

export function singleDayHandoverWarning(effectiveDate: CalendarDate): Warning {
  return {
    code: 'REPLACEMENT_SINGLE_DAY',
    message: `The incoming person would hold this assignment for one day only, on ${effectiveDate}.`,
    effectiveDate,
  };
}

export function outgoingRemovedWarning(effectiveDate: CalendarDate): Warning {
  return {
    code: 'OUTGOING_ASSIGNMENT_REMOVED',
    message: `The handover date ${effectiveDate} is the assignment start date, so the outgoing commitment is removed rather than shortened.`,
    effectiveDate,
  };
}

// A warning explains, it does not refuse. A dry run reports; a real write proceeds once
// acknowledged (FR-021, FR-050, Constitution VIII).
export function gateOnWarnings<T>(
  warnings: Warning[],
  options: WriteOptions,
  commit: () => Promise<T>,
): Promise<{ warnings: Warning[]; result: T | null }> {
  if (options.dryRun) {
    return Promise.resolve({ warnings, result: null });
  }
  if (warnings.length > 0 && !options.acknowledgeWarnings) {
    throw new WarningsNotAcknowledged(warnings);
  }
  return commit().then((result) => ({ warnings, result }));
}
