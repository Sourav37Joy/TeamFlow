import { Project } from '@prisma/client';
import { CalendarDate } from '../calc/dates';
import { Filler, producesGaps, staffingForProject, StaffingStatus } from '../calc/staffing';
import { nameIndex, personIndex, unique } from '../common/fields';
import { PrismaService } from '../prisma.service';

export interface FillerRow {
  employeeId: string;
  employeeName: string;
  employeeAvatarUrl: string | null;
  allocationPercent: number;
  assignmentId: string;
}

export interface RequirementStaffingRow {
  requirementId: string;
  roleId: string;
  roleName: string;
  requiredSkillId: string;
  requiredSkillName: string;
  requiredHeadcount: number;
  filledHeadcount: number;
  shortfall: number;
  surplus: number;
  fillers: FillerRow[];
}

export interface UnrequestedRoleRow {
  roleId: string;
  roleName: string;
  headcount: number;
  fillers: FillerRow[];
}

export interface ProjectStaffingRow {
  projectId: string;
  projectName: string;
  status: string;
  asOf: CalendarDate;
  staffingStatus: StaffingStatus;
  totalShortfall: number;
  producesGaps: boolean;
  requirements: RequirementStaffingRow[];
  unrequestedRoles: UnrequestedRoleRow[];
}

const UNKNOWN = 'Unknown';

// One shaping path for project staffing, used by the project list, the project record, and the
// dashboard gaps panel. Three screens computing this three ways is exactly what Constitution II
// forbids, and FR-079 measures.
export async function staffingViews(
  prisma: PrismaService,
  projects: Project[],
  asOf: CalendarDate,
): Promise<ProjectStaffingRow[]> {
  if (projects.length === 0) return [];

  const projectIds = projects.map((project) => project.id);
  const [requirements, assignments, roles, skills] = await Promise.all([
    prisma.roleRequirement.findMany({ where: { projectId: { in: projectIds } } }),
    prisma.assignment.findMany({ where: { projectId: { in: projectIds } } }),
    prisma.role.findMany({ select: { id: true, name: true } }),
    prisma.skill.findMany({ select: { id: true, name: true } }),
  ]);

  const employees = await prisma.employee.findMany({
    where: { id: { in: unique(assignments.map((assignment) => assignment.employeeId)) } },
    select: { id: true, name: true, avatarUrl: true },
  });

  const roleNames = nameIndex(roles);
  const skillNames = nameIndex(skills);
  const employeeLabels = personIndex(employees);

  const named = (fillers: Filler[]): FillerRow[] =>
    fillers
      .map((filler) => ({
        employeeId: filler.employeeId,
        employeeName: employeeLabels.get(filler.employeeId)?.name ?? UNKNOWN,
        employeeAvatarUrl: employeeLabels.get(filler.employeeId)?.avatarUrl ?? null,
        allocationPercent: filler.allocationPercent,
        assignmentId: filler.assignmentId,
      }))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return projects.map((project) => {
    const staffing = staffingForProject(project.id, requirements, assignments, asOf);

    return {
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      asOf,
      staffingStatus: staffing.staffingStatus,
      totalShortfall: staffing.totalShortfall,
      producesGaps: producesGaps(project.status),
      requirements: staffing.requirements
        .map((requirement) => ({
          requirementId: requirement.requirementId,
          roleId: requirement.roleId,
          roleName: roleNames.get(requirement.roleId) ?? UNKNOWN,
          requiredSkillId: requirement.requiredSkillId,
          requiredSkillName: skillNames.get(requirement.requiredSkillId) ?? UNKNOWN,
          requiredHeadcount: requirement.requiredHeadcount,
          filledHeadcount: requirement.filledHeadcount,
          shortfall: requirement.shortfall,
          surplus: requirement.surplus,
          fillers: named(requirement.fillers),
        }))
        .sort((a, b) => a.roleName.localeCompare(b.roleName)),
      unrequestedRoles: staffing.unrequestedRoles
        .map((unrequested) => ({
          roleId: unrequested.roleId,
          roleName: roleNames.get(unrequested.roleId) ?? UNKNOWN,
          headcount: unrequested.headcount,
          fillers: named(unrequested.fillers),
        }))
        .sort((a, b) => a.roleName.localeCompare(b.roleName)),
    };
  });
}
