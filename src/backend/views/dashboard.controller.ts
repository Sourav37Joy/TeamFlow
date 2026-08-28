import { Controller, Get, Query } from '@nestjs/common';
import { utilizationForAll } from '../calc/utilization';
import { resolveAsOf } from '../common/as-of';
import { PrismaService } from '../prisma.service';
import { staffingViews } from '../projects/staffing-view';

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
      overallocated: { entries: overallocated, reason: nothing(overallocated) },
      available: { entries: available, reason: nothing(available) },
      gaps: { entries: gaps, reason: nothing(gaps) },
    };
  }
}
