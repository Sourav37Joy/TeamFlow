import { Assignment } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { nameIndex, PersonLabel, personIndex, unique } from './fields';

export interface AssignmentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarUrl: string | null;
  projectId: string;
  projectName: string;
  roleId: string;
  roleName: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NameIndexes {
  employees: Map<string, PersonLabel>;
  projectNames: Map<string, string>;
  roleNames: Map<string, string>;
}

const UNKNOWN = 'Unknown';

// MongoDB cannot join, so a read of the register resolves its names from already-fetched
// records rather than per row (D-11). Every screen reads the same shape, from the employee
// side and the project side alike (FR-024).
export function toRows(assignments: Assignment[], names: NameIndexes): AssignmentRow[] {
  return assignments.map((assignment) => {
    const employee = names.employees.get(assignment.employeeId);
    return {
      id: assignment.id,
      employeeId: assignment.employeeId,
      employeeName: employee?.name ?? UNKNOWN,
      employeeAvatarUrl: employee?.avatarUrl ?? null,
      projectId: assignment.projectId,
      projectName: names.projectNames.get(assignment.projectId) ?? UNKNOWN,
      roleId: assignment.roleId,
      roleName: names.roleNames.get(assignment.roleId) ?? UNKNOWN,
      allocationPercent: assignment.allocationPercent,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  });
}

export async function assignmentRows(
  prisma: PrismaService,
  assignments: Assignment[],
): Promise<AssignmentRow[]> {
  if (assignments.length === 0) return [];

  const [employees, projects, roles] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: unique(assignments.map((a) => a.employeeId)) } },
      select: { id: true, name: true, avatarUrl: true },
    }),
    prisma.project.findMany({
      where: { id: { in: unique(assignments.map((a) => a.projectId)) } },
      select: { id: true, name: true },
    }),
    prisma.role.findMany({
      where: { id: { in: unique(assignments.map((a) => a.roleId)) } },
      select: { id: true, name: true },
    }),
  ]);

  return toRows(assignments, {
    employees: personIndex(employees),
    projectNames: nameIndex(projects),
    roleNames: nameIndex(roles),
  });
}
