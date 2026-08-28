import { CalendarDate } from './dates';
import { activeAssignments, AssignmentRecord } from './utilization';

export const STAFFING_STATUSES = [
  'FULLY_STAFFED',
  'UNDERSTAFFED',
  'OVERSTAFFED',
  'NO_REQUIREMENTS_DECLARED',
] as const;

export type StaffingStatus = (typeof STAFFING_STATUSES)[number];

// Only Planned and Active projects produce gaps to chase. The rest keep a readable staffing
// figure - a cancelled project is not suddenly fully staffed - but nobody should be asked to
// fill them (FR-039, FR-075, D-02).
const GAP_PRODUCING_STATUSES = ['PLANNED', 'ACTIVE'] as const;

export function producesGaps(projectStatus: string): boolean {
  return (GAP_PRODUCING_STATUSES as readonly string[]).includes(projectStatus);
}

export interface RequirementRecord {
  id: string;
  projectId: string;
  roleId: string;
  requiredSkillId: string;
  headcount: number;
}

export interface Filler {
  employeeId: string;
  allocationPercent: number;
  assignmentId: string;
}

export interface RequirementStaffing {
  requirementId: string;
  roleId: string;
  requiredSkillId: string;
  requiredHeadcount: number;
  filledHeadcount: number;
  shortfall: number;
  surplus: number;
  fillers: Filler[];
}

export interface UnrequestedRole {
  roleId: string;
  headcount: number;
  fillers: Filler[];
}

export interface ProjectStaffing {
  projectId: string;
  requirements: RequirementStaffing[];
  unrequestedRoles: UnrequestedRole[];
  staffingStatus: StaffingStatus;
  totalShortfall: number;
}

// A person fills a role only while their assignment to it is live on the evaluation date, so
// an expired commitment reopens the gap it used to close (FR-040).
function fillersFor(
  assignments: AssignmentRecord[],
  projectId: string,
  roleId: string,
  asOf: CalendarDate,
): Filler[] {
  const live = activeAssignments(
    assignments.filter((a) => a.projectId === projectId && a.roleId === roleId),
    asOf,
  );

  const byEmployee = new Map<string, Filler>();
  for (const assignment of live) {
    const held = byEmployee.get(assignment.employeeId);
    if (held) {
      held.allocationPercent += assignment.allocationPercent;
    } else {
      byEmployee.set(assignment.employeeId, {
        employeeId: assignment.employeeId,
        allocationPercent: assignment.allocationPercent,
        assignmentId: assignment.id,
      });
    }
  }

  return [...byEmployee.values()];
}

// Shortfall and surplus are the two halves of one signed subtraction: required minus filled
// (FR-038). Only one of the pair is ever non-zero.
export function staffingForRequirement(
  requirement: RequirementRecord,
  assignments: AssignmentRecord[],
  asOf: CalendarDate,
): RequirementStaffing {
  const fillers = fillersFor(assignments, requirement.projectId, requirement.roleId, asOf);
  const difference = requirement.headcount - fillers.length;

  return {
    requirementId: requirement.id,
    roleId: requirement.roleId,
    requiredSkillId: requirement.requiredSkillId,
    requiredHeadcount: requirement.headcount,
    filledHeadcount: fillers.length,
    shortfall: Math.max(0, difference),
    surplus: Math.max(0, -difference),
    fillers,
  };
}

// Work committed to a role the project never asked for is reported as surplus rather than
// hidden, because it is real capacity being spent (FR-042).
export function unrequestedRoles(
  projectId: string,
  requirements: RequirementRecord[],
  assignments: AssignmentRecord[],
  asOf: CalendarDate,
): UnrequestedRole[] {
  const declared = new Set(requirements.map((requirement) => requirement.roleId));
  const live = activeAssignments(
    assignments.filter((a) => a.projectId === projectId && !declared.has(a.roleId)),
    asOf,
  );

  const byRole = new Map<string, Filler[]>();
  for (const assignment of live) {
    const fillers = byRole.get(assignment.roleId) ?? [];
    if (!fillers.some((filler) => filler.employeeId === assignment.employeeId)) {
      fillers.push({
        employeeId: assignment.employeeId,
        allocationPercent: assignment.allocationPercent,
        assignmentId: assignment.id,
      });
    }
    byRole.set(assignment.roleId, fillers);
  }

  return [...byRole.entries()].map(([roleId, fillers]) => ({
    roleId,
    headcount: fillers.length,
    fillers,
  }));
}

// A project with nothing declared is not understaffed, it is unplanned, and saying so is more
// use than reporting a shortfall of zero. Any shortfall outweighs any surplus (FR-039).
export function staffingStatusOf(
  requirements: RequirementStaffing[],
  unrequested: UnrequestedRole[],
): StaffingStatus {
  if (requirements.length === 0) return 'NO_REQUIREMENTS_DECLARED';
  if (requirements.some((requirement) => requirement.shortfall > 0)) return 'UNDERSTAFFED';
  if (requirements.some((requirement) => requirement.surplus > 0) || unrequested.length > 0) {
    return 'OVERSTAFFED';
  }
  return 'FULLY_STAFFED';
}

export function staffingForProject(
  projectId: string,
  requirements: RequirementRecord[],
  assignments: AssignmentRecord[],
  asOf: CalendarDate,
): ProjectStaffing {
  const own = requirements.filter((requirement) => requirement.projectId === projectId);
  const staffed = own.map((requirement) => staffingForRequirement(requirement, assignments, asOf));
  const unrequested = unrequestedRoles(projectId, own, assignments, asOf);

  return {
    projectId,
    requirements: staffed,
    unrequestedRoles: unrequested,
    staffingStatus: staffingStatusOf(staffed, unrequested),
    totalShortfall: staffed.reduce((sum, requirement) => sum + requirement.shortfall, 0),
  };
}
