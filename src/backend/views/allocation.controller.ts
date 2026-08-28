import { Controller, Get, Query } from '@nestjs/common';
import { Assignment, Employee, Project } from '@prisma/client';
import { CalendarDate } from '../calc/dates';
import { activeAssignments, activeHeadcount, utilizationForAll } from '../calc/utilization';
import { resolveAsOf } from '../common/as-of';
import { AssignmentRow, NameIndexes, toRows } from '../common/assignment-row';
import { nameIndex, requireObjectId } from '../common/fields';
import { PrismaService } from '../prisma.service';

export interface PersonGroup {
  kind: 'person';
  id: string;
  name: string;
  roleTitle: string;
  totalCommittedPercent: number;
  remainingCapacityPercent: number;
  loadLabel: string;
  rows: AssignmentRow[];
}

export interface ProjectGroup {
  kind: 'project';
  id: string;
  name: string;
  status: string;
  assignedHeadcount: number;
  rows: AssignmentRow[];
}

@Controller('api/allocation-overview')
export class AllocationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async overview(
    @Query('groupBy') groupBy?: string,
    @Query('q') q?: string,
    @Query('skillId') skillId?: string,
    @Query('roleId') roleId?: string,
    @Query('asOf') asOf?: string,
  ) {
    const onDate = resolveAsOf(asOf);
    const grouping = groupBy === 'project' ? 'project' : 'person';

    // One fetch per collection, then all shaping in memory. Mongo cannot join, and looking
    // up a name per row would turn one screen into hundreds of round trips (D-11).
    const [assignments, employees, projects, roles] = await Promise.all([
      this.prisma.assignment.findMany(),
      this.prisma.employee.findMany(),
      this.prisma.project.findMany(),
      this.prisma.role.findMany(),
    ]);

    const names = {
      employeeNames: nameIndex(employees),
      projectNames: nameIndex(projects),
      roleNames: nameIndex(roles),
    };

    // The whole register is fetched and the filters are applied to the rows only. Narrowing
    // the fetch would narrow the group totals with it, and a person's committed percentage
    // must not move because somebody typed in a search box (FR-079).
    const live = activeAssignments(assignments, onDate);
    const filters = {
      q,
      skillId: skillId ? requireObjectId('skillId', skillId) : undefined,
      roleId: roleId ? requireObjectId('roleId', roleId) : undefined,
    };
    const matching = live.filter((assignment) => matches(assignment, filters, employees, names));

    const groups =
      grouping === 'person'
        ? this.byPerson(matching, assignments, employees, names, onDate)
        : this.byProject(matching, assignments, projects, names, onDate);

    return {
      asOf: onDate,
      groupBy: grouping,
      rowCount: matching.length,
      groups,
      // An empty overview says which date it is empty on, rather than looking broken (FR-031).
      reason: matching.length === 0 ? 'NO_ASSIGNMENTS_ON_DATE' : null,
    };
  }

  // The committed total is the person's whole commitment on the date, taken from
  // calc/utilization. It is deliberately not the sum of the filtered rows: a figure for a
  // person must not change because a search box narrowed the list (FR-027, FR-079).
  private byPerson(
    matching: Assignment[],
    all: Assignment[],
    employees: Employee[],
    names: NameIndexes,
    onDate: CalendarDate,
  ): PersonGroup[] {
    const byEmployee = groupBy(matching, (assignment) => assignment.employeeId);
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
    const utilizations = new Map(
      utilizationForAll(employees, all, onDate).map((entry) => [entry.employeeId, entry]),
    );

    return [...byEmployee.entries()]
      .flatMap(([employeeId, rows]) => {
        const employee = employeeById.get(employeeId);
        const utilization = utilizations.get(employeeId);
        if (!employee || !utilization) return [];
        return [
          {
            kind: 'person' as const,
            id: employee.id,
            name: employee.name,
            roleTitle: employee.roleTitle,
            totalCommittedPercent: utilization.utilizationPercent,
            remainingCapacityPercent: utilization.remainingCapacityPercent,
            loadLabel: utilization.loadLabel,
            rows: sortRows(toRows(rows, names)),
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Assigned headcount is the project's own figure on the date, from calc/utilization, for
  // the same reason (FR-028, FR-040).
  private byProject(
    matching: Assignment[],
    all: Assignment[],
    projects: Project[],
    names: NameIndexes,
    onDate: CalendarDate,
  ): ProjectGroup[] {
    const byProject = groupBy(matching, (assignment) => assignment.projectId);
    const projectById = new Map(projects.map((project) => [project.id, project]));

    return [...byProject.entries()]
      .flatMap(([projectId, rows]) => {
        const project = projectById.get(projectId);
        if (!project) return [];
        return [
          {
            kind: 'project' as const,
            id: project.id,
            name: project.name,
            status: project.status,
            assignedHeadcount: activeHeadcount(
              all.filter((assignment) => assignment.projectId === projectId),
              onDate,
            ),
            rows: sortRows(toRows(rows, names)),
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

// One search box across employee name, project name, and role, plus a skill filter, because
// "who can do X and where are they" is one question (FR-029).
function matches(
  assignment: Assignment,
  filters: { q?: string; skillId?: string; roleId?: string },
  employees: Employee[],
  names: NameIndexes,
): boolean {
  if (filters.roleId && assignment.roleId !== filters.roleId) return false;

  if (filters.skillId) {
    const employee = employees.find((candidate) => candidate.id === assignment.employeeId);
    const holds = employee?.skills.some((rated) => rated.skillId === filters.skillId);
    if (!holds) return false;
  }

  const term = filters.q?.trim().toLowerCase();
  if (!term) return true;

  const haystack = [
    names.employeeNames.get(assignment.employeeId),
    names.projectNames.get(assignment.projectId),
    names.roleNames.get(assignment.roleId),
  ]
    .filter((value): value is string => value !== undefined)
    .join(' ')
    .toLowerCase();

  return haystack.includes(term);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const bucket = grouped.get(key(item));
    if (bucket) bucket.push(item);
    else grouped.set(key(item), [item]);
  }
  return grouped;
}

function sortRows(rows: AssignmentRow[]): AssignmentRow[] {
  return rows.sort(
    (a, b) =>
      a.projectName.localeCompare(b.projectName) ||
      a.employeeName.localeCompare(b.employeeName) ||
      a.roleName.localeCompare(b.roleName),
  );
}
