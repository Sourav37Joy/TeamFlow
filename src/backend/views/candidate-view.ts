import { Candidate, shortlist } from '../calc/candidates';
import { CalendarDate } from '../calc/dates';
import { PrismaService } from '../prisma.service';

export interface Shortlisted {
  asOf: CalendarDate;
  requiredSkillId: string;
  requiredSkillName: string;
  candidates: Candidate[];
  reason: string | null;
  message: string | null;
}

// One shortlist path for a role gap and for a replacement, so the same person cannot be
// ranked differently depending on which screen asked (FR-052, FR-079).
export async function shortlistFor(
  prisma: PrismaService,
  query: {
    projectId: string;
    roleId: string;
    requiredSkillId: string;
    excludeEmployeeIds?: string[];
  },
  asOf: CalendarDate,
): Promise<Shortlisted> {
  const [employees, assignments, skill] = await Promise.all([
    prisma.employee.findMany(),
    prisma.assignment.findMany(),
    prisma.skill.findUnique({ where: { id: query.requiredSkillId } }),
  ]);

  const skillName = skill?.name ?? 'the required skill';
  const result = shortlist(employees, assignments, query, asOf);

  return {
    asOf,
    requiredSkillId: query.requiredSkillId,
    requiredSkillName: skillName,
    candidates: result.candidates,
    reason: result.reason,
    // An empty shortlist explains itself instead of looking like a failed search
    // (FR-058, FR-059).
    message:
      result.reason === 'NO_EMPLOYEE_HOLDS_SKILL'
        ? `Nobody on record holds ${skillName}, which this role requires. Rate somebody's ${skillName}, or change the skill the role depends on.`
        : result.reason === 'NO_CANDIDATE_HAS_CAPACITY'
          ? `Everybody who holds ${skillName} is already committed to their full capacity on ${asOf}. Free somebody up, or assign anyway and accept the overallocation.`
          : null,
  };
}
