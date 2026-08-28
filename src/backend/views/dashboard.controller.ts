import { Controller, Get, Query } from '@nestjs/common';
import { Assignment, ProjectStatus } from '@prisma/client';
import { CalendarDate } from '../calc/dates';
import { activeHeadcount, utilizationForAll } from '../calc/utilization';
import { resolveAsOf } from '../common/as-of';
import { PrismaService } from '../prisma.service';
import { resolveLeads } from '../projects/lead';
import { FillerRow, ProjectStaffingRow, staffingViews } from '../projects/staffing-view';

// Columns are drawn for every status, in lifecycle order, whether or not they hold anything
// (FR-120, FR-123).
const COLUMN_ORDER: ProjectStatus[] = [
  ProjectStatus.PLANNED,
  ProjectStatus.ACTIVE,
  ProjectStatus.ON_HOLD,
  ProjectStatus.COMPLETED,
  ProjectStatus.CANCELLED,
];

const AVATARS_PER_CARD = 4;

// One person filling two roles on a project is one person on the card, so the portraits are
// deduplicated before they are capped (FR-135).
function peopleOn(view: ProjectStaffingRow): FillerRow[] {
  const fillers = [
    ...view.requirements.flatMap((requirement) => requirement.fillers),
    ...view.unrequestedRoles.flatMap((unrequested) => unrequested.fillers),
  ];

  const seen = new Map<string, FillerRow>();
  for (const filler of fillers) {
    if (!seen.has(filler.employeeId)) seen.set(filler.employeeId, filler);
  }

  return [...seen.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  // Three panels, one request, one evaluation date, every figure from the shared calculation
  // module. Two panels disagreeing about the same person is the failure this guards against
  // (FR-072, Constitution II, FR-079).
  @Get()
  async read(@Query('asOf') asOf?: string) {
    const onDate = resolveAsOf(asOf);

    const [employees, assignments, projects] = await Promise.all([
      this.prisma.employee.findMany(),
      this.prisma.assignment.findMany(),
      this.prisma.project.findMany(),
    ]);

    // One pass over the register for every person, not a scan of it each (D-11).
    const utilizations = new Map(
      utilizationForAll(employees, assignments, onDate).map((entry) => [entry.employeeId, entry]),
    );
    const load = employees.flatMap((employee) => {
      const utilization = utilizations.get(employee.id);
      return utilization ? [{ employee, utilization }] : [];
    });

    // Most overloaded first: the person needing attention soonest is at the top (FR-073).
    const overallocated = load
      .filter((entry) => entry.utilization.loadLabel === 'OVERALLOCATED')
      .sort(
        (a, b) =>
          b.utilization.utilizationPercent - a.utilization.utilizationPercent ||
          a.employee.name.localeCompare(b.employee.name),
      )
      .map((entry) => ({
        employeeId: entry.employee.id,
        name: entry.employee.name,
        avatarUrl: entry.employee.avatarUrl,
        roleTitle: entry.employee.roleTitle,
        utilizationPercent: entry.utilization.utilizationPercent,
        totalCapacityPercent: entry.employee.totalCapacityPercent,
        overBy: entry.utilization.utilizationPercent - entry.employee.totalCapacityPercent,
        loadLabel: entry.utilization.loadLabel,
      }));

    // Most spare capacity first: the easiest person to commit is at the top (FR-074).
    const available = load
      .filter((entry) => entry.utilization.remainingCapacityPercent > 0)
      .sort(
        (a, b) =>
          b.utilization.remainingCapacityPercent - a.utilization.remainingCapacityPercent ||
          a.employee.name.localeCompare(b.employee.name),
      )
      .map((entry) => ({
        employeeId: entry.employee.id,
        name: entry.employee.name,
        avatarUrl: entry.employee.avatarUrl,
        roleTitle: entry.employee.roleTitle,
        remainingCapacityPercent: entry.utilization.remainingCapacityPercent,
        utilizationPercent: entry.utilization.utilizationPercent,
        loadLabel: entry.utilization.loadLabel,
      }));

    // Gaps come only from Planned and Active projects. A cancelled project's shortfall is not
    // work anybody should be chasing (FR-075, D-02).
    const staffing = await staffingViews(this.prisma, projects, onDate);
    const gaps = staffing
      .filter((view) => view.producesGaps && view.totalShortfall > 0)
      .sort(
        (a, b) => b.totalShortfall - a.totalShortfall || a.projectName.localeCompare(b.projectName),
      )
      .map((view) => ({
        projectId: view.projectId,
        projectName: view.projectName,
        status: view.status,
        staffingStatus: view.staffingStatus,
        totalShortfall: view.totalShortfall,
        shortRoles: view.requirements
          .filter((requirement) => requirement.shortfall > 0)
          .map((requirement) => ({
            requirementId: requirement.requirementId,
            roleId: requirement.roleId,
            roleName: requirement.roleName,
            requiredHeadcount: requirement.requiredHeadcount,
            filledHeadcount: requirement.filledHeadcount,
            shortfall: requirement.shortfall,
          })),
      }));

    // A panel with nothing in it says so, rather than rendering an empty box that reads as a
    // bug (FR-077).
    const nothing = (entries: unknown[]) => (entries.length === 0 ? 'NOTHING_TO_ACTION' : null);

    return {
      asOf: onDate,
      board: await this.board(projects, assignments, staffing, onDate),
      overallocated: { entries: overallocated, reason: nothing(overallocated) },
      available: { entries: available, reason: nothing(available) },
      gaps: { entries: gaps, reason: nothing(gaps) },
    };
  }

  // The board reuses the staffing already computed above for every project, so it costs no
  // extra staffing query - only the small fetch of the employees named as leads (D-04, D-06).
  private async board(
    projects: Array<{
      id: string;
      name: string;
      status: ProjectStatus;
      leadEmployeeId: string | null;
    }>,
    assignments: Assignment[],
    staffing: ProjectStaffingRow[],
    onDate: CalendarDate,
  ) {
    const leads = await resolveLeads(this.prisma, projects);
    const byProject = new Map(staffing.map((view) => [view.projectId, view]));

    const byProjectAssignments = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      const held = byProjectAssignments.get(assignment.projectId);
      if (held) held.push(assignment);
      else byProjectAssignments.set(assignment.projectId, [assignment]);
    }

    const cards = projects
      .map((project) => {
        const view = byProject.get(project.id);
        const people = view ? peopleOn(view) : [];

        return {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          lead: leads.get(project.id) ?? null,
          // The shared distinct-person count, so a card and a project page cannot disagree
          // (FR-131, FR-137).
          headcount: activeHeadcount(byProjectAssignments.get(project.id) ?? [], onDate),
          staffingStatus: view?.staffingStatus ?? 'NO_REQUIREMENTS_DECLARED',
          totalShortfall: view?.totalShortfall ?? 0,
          shortRoles: (view?.requirements ?? [])
            .filter((requirement) => requirement.shortfall > 0)
            .map((requirement) => ({
              requirementId: requirement.requirementId,
              roleName: requirement.roleName,
              requiredHeadcount: requirement.requiredHeadcount,
              filledHeadcount: requirement.filledHeadcount,
              shortfall: requirement.shortfall,
            })),
          people: people.slice(0, AVATARS_PER_CARD).map((filler) => ({
            employeeId: filler.employeeId,
            name: filler.employeeName,
            avatarUrl: filler.employeeAvatarUrl,
          })),
          peopleBeyond: Math.max(0, people.length - AVATARS_PER_CARD),
        };
      })
      .sort((a, b) => a.projectName.localeCompare(b.projectName));

    return {
      columns: COLUMN_ORDER.map((status) => {
        const inColumn = cards.filter((card) => card.status === status);
        return { status, count: inColumn.length, projects: inColumn };
      }),
      totalProjects: cards.length,
    };
  }
}
