import { CalendarDate, isWithinRange } from './dates';

export const LOAD_LABELS = [
  'UNASSIGNED',
  'AVAILABLE',
  'BALANCED',
  'HIGH_LOAD',
  'OVERALLOCATED',
] as const;

export type LoadLabel = (typeof LOAD_LABELS)[number];

export interface AssignmentRecord {
  id: string;
  employeeId: string;
  projectId: string;
  roleId: string;
  allocationPercent: number;
  startDate: CalendarDate;
  endDate: CalendarDate;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  totalCapacityPercent: number;
}

export interface Utilization {
  employeeId: string;
  utilizationPercent: number;
  remainingCapacityPercent: number;
  loadLabel: LoadLabel;
  contributingAssignments: AssignmentRecord[];
}

// An assignment counts on a date when that date falls inside its inclusive range (FR-032).
export function isActiveOn(assignment: AssignmentRecord, asOf: CalendarDate): boolean {
  return isWithinRange(asOf, assignment.startDate, assignment.endDate);
}

export function activeAssignments(
  assignments: AssignmentRecord[],
  asOf: CalendarDate,
): AssignmentRecord[] {
  return assignments.filter((a) => isActiveOn(a, asOf));
}

// Utilization is the sum of the allocations active on the evaluation date (FR-032).
export function utilizationPercent(
  assignments: AssignmentRecord[],
  asOf: CalendarDate,
): number {
  return activeAssignments(assignments, asOf).reduce((sum, a) => sum + a.allocationPercent, 0);
}

// Remaining capacity is capacity minus utilization, floored at zero (FR-033).
export function remainingCapacityPercent(
  totalCapacityPercent: number,
  utilization: number,
): number {
  return Math.max(0, totalCapacityPercent - utilization);
}

// Bands are fixed: 0 unassigned, 1-50 available, 51-85 balanced, 86-100 high load, above 100 overallocated (FR-034).
export function loadLabel(utilization: number): LoadLabel {
  if (utilization <= 0) return 'UNASSIGNED';
  if (utilization <= 50) return 'AVAILABLE';
  if (utilization <= 85) return 'BALANCED';
  if (utilization <= 100) return 'HIGH_LOAD';
  return 'OVERALLOCATED';
}

// The contributing assignments travel with the total so a manager can trace it to its sources (FR-036).
export function utilizationFor(
  employee: EmployeeRecord,
  assignments: AssignmentRecord[],
  asOf: CalendarDate,
): Utilization {
  const own = assignments.filter((a) => a.employeeId === employee.id);
  const contributing = activeAssignments(own, asOf);
  const utilization = contributing.reduce((sum, a) => sum + a.allocationPercent, 0);
  return {
    employeeId: employee.id,
    utilizationPercent: utilization,
    remainingCapacityPercent: remainingCapacityPercent(
      employee.totalCapacityPercent,
      utilization,
    ),
    loadLabel: loadLabel(utilization),
    contributingAssignments: contributing,
  };
}

export function utilizationForAll(
  employees: EmployeeRecord[],
  assignments: AssignmentRecord[],
  asOf: CalendarDate,
): Utilization[] {
  const byEmployee = new Map<string, AssignmentRecord[]>();
  for (const a of assignments) {
    const bucket = byEmployee.get(a.employeeId);
    if (bucket) bucket.push(a);
    else byEmployee.set(a.employeeId, [a]);
  }
  return employees.map((e) => utilizationFor(e, byEmployee.get(e.id) ?? [], asOf));
}

// A write is warned about, never blocked, when it would take someone past capacity (FR-021, FR-050).
export function wouldOverallocate(
  employee: EmployeeRecord,
  existing: AssignmentRecord[],
  incoming: Pick<AssignmentRecord, 'allocationPercent' | 'startDate' | 'endDate'>,
  excludeAssignmentId?: string,
): { overallocated: boolean; resultingPercent: number; onDate: CalendarDate | null } {
  const others = existing.filter(
    (a) => a.employeeId === employee.id && a.id !== excludeAssignmentId,
  );
  const boundaries = [incoming.startDate, ...others.map((a) => a.startDate)].filter((d) =>
    isWithinRange(d, incoming.startDate, incoming.endDate),
  );
  let worst = 0;
  let worstDate: CalendarDate | null = null;
  for (const date of boundaries) {
    const total =
      incoming.allocationPercent +
      others.filter((a) => isWithinRange(date, a.startDate, a.endDate)).reduce(
        (sum, a) => sum + a.allocationPercent,
        0,
      );
    if (total > worst) {
      worst = total;
      worstDate = date;
    }
  }
  return {
    overallocated: worst > employee.totalCapacityPercent,
    resultingPercent: worst,
    onDate: worst > employee.totalCapacityPercent ? worstDate : null,
  };
}
