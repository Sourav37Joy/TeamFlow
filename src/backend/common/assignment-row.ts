import { Assignment } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { nameIndex, unique } from './fields';

export interface AssignmentRow {
  id: string;
  employeeId: string;
  employeeName: string;
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

const UNKNOWN = 'Unknown';

// MongoDB cannot join, so a read of the register fetches its records and resolves the
// names in memory rather than per row (D-11). Every screen reads the same shape, from
// the employee side and the project side alike (FR-024).
export async function assignmentRows(
  prisma: PrismaService,
  assignments: Assignment[],
): Promise<AssignmentRow[]> {
  if (assignments.length === 0) return [];

  const [employees, projects, roles] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: unique(assignments.map((a) => a.employeeId)) } },
      select: { id: true, name: true },
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

  const employeeNames = nameIndex(employees);
  const projectNames = nameIndex(projects);
  const roleNames = nameIndex(roles);

  return assignments.map((assignment) => ({
    id: assignment.id,
    employeeId: assignment.employeeId,
    employeeName: employeeNames.get(assignment.employeeId) ?? UNKNOWN,
    projectId: assignment.projectId,
    projectName: projectNames.get(assignment.projectId) ?? UNKNOWN,
    roleId: assignment.roleId,
    roleName: roleNames.get(assignment.roleId) ?? UNKNOWN,
    allocationPercent: assignment.allocationPercent,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  }));
}
