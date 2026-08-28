import { CalendarDate } from './dates';
import { activeAssignments, AssignmentRecord, EmployeeRecord } from './utilization';

export interface RatedEmployee extends EmployeeRecord {
  skills: Array<{ skillId: string; rating: number }>;
}

export interface Candidate {
  employeeId: string;
  name: string;
  skillRating: number;
  skillComponent: number;
  capacityComponent: number;
  overallScore: number;
}

export type EmptyReason = 'NO_EMPLOYEE_HOLDS_SKILL' | 'NO_CANDIDATE_HAS_CAPACITY';

export interface Shortlist {
  candidates: Candidate[];
  reason: EmptyReason | null;
}

export interface CandidateQuery {
  requiredSkillId: string;
  projectId: string;
  roleId: string;
  excludeEmployeeIds?: string[];
}

const MAX_RATING = 5;

// A rating of 1 to 5 becomes a 0 to 100 component so it can be averaged against a percentage
// (FR-055, D-10).
export function skillComponentOf(rating: number): number {
  return Math.round((rating / MAX_RATING) * 100);
}

// Equal weighting, stated plainly, because the specification asks for both components to be
// visible and expresses no preference between them (FR-055).
export function overallScoreOf(skillComponent: number, capacityComponent: number): number {
  return Math.round((skillComponent + capacityComponent) / 2);
}

// Score first, then proficiency, then name, then id. The last two are not tie-breaks anybody
// cares about; they are there so the same input always produces the same order (FR-056, SC-012).
function rankCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort(
    (a, b) =>
      b.overallScore - a.overallScore ||
      b.skillRating - a.skillRating ||
      a.name.localeCompare(b.name) ||
      a.employeeId.localeCompare(b.employeeId),
  );
}

export function shortlist(
  employees: RatedEmployee[],
  assignments: AssignmentRecord[],
  query: CandidateQuery,
  asOf: CalendarDate,
): Shortlist {
  // Already on that project in that role, or the person being replaced (FR-057).
  const excluded = new Set([
    ...(query.excludeEmployeeIds ?? []),
    ...activeAssignments(
      assignments.filter(
        (assignment) =>
          assignment.projectId === query.projectId && assignment.roleId === query.roleId,
      ),
      asOf,
    ).map((assignment) => assignment.employeeId),
  ]);

  const eligible = employees.filter((employee) => !excluded.has(employee.id));

  const holders = eligible.flatMap((employee) => {
    const rated = employee.skills.find((skill) => skill.skillId === query.requiredSkillId);
    return rated ? [{ employee, rating: rated.rating }] : [];
  });

  // Nobody at all holds the skill - a different problem from everybody being busy, and worth
  // saying so by name (FR-059).
  if (holders.length === 0) {
    return { candidates: [], reason: 'NO_EMPLOYEE_HOLDS_SKILL' };
  }

  const candidates = holders.flatMap(({ employee, rating }) => {
    const committed = activeAssignments(
      assignments.filter((assignment) => assignment.employeeId === employee.id),
      asOf,
    ).reduce((sum, assignment) => sum + assignment.allocationPercent, 0);
    const capacityComponent = Math.max(0, employee.totalCapacityPercent - committed);

    // Somebody with nothing left to give is not a candidate, however well they score (FR-058).
    if (capacityComponent === 0) return [];

    const skillComponent = skillComponentOf(rating);
    return [
      {
        employeeId: employee.id,
        name: employee.name,
        skillRating: rating,
        skillComponent,
        capacityComponent,
        overallScore: overallScoreOf(skillComponent, capacityComponent),
      },
    ];
  });

  if (candidates.length === 0) {
    return { candidates: [], reason: 'NO_CANDIDATE_HAS_CAPACITY' };
  }

  return { candidates: rankCandidates(candidates), reason: null };
}
