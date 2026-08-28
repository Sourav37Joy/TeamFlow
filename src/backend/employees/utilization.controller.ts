import { Controller, Get, Param, Query } from '@nestjs/common';
import { utilizationFor } from '../calc/utilization';
import { resolveAsOf } from '../common/as-of';
import { assignmentRows } from '../common/assignment-row';
import { NotFound } from '../common/errors';
import { requireObjectId } from '../common/fields';
import { PrismaService } from '../prisma.service';

@Controller('api/employees/:id/utilization')
export class UtilizationController {
  constructor(private readonly prisma: PrismaService) {}

  // The figure and the assignments that produced it come back together. A total nobody can
  // trace to its sources is not explainable, and Constitution IX rules that out (FR-036).
  @Get()
  async read(@Param('id') id: string, @Query('asOf') asOf?: string) {
    const employeeId = requireObjectId('id', id);
    const onDate = resolveAsOf(asOf);

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFound('employee', employeeId);

    const held = await this.prisma.assignment.findMany({ where: { employeeId } });
    const utilization = utilizationFor(employee, held, onDate);

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      asOf: onDate,
      totalCapacityPercent: employee.totalCapacityPercent,
      utilizationPercent: utilization.utilizationPercent,
      remainingCapacityPercent: utilization.remainingCapacityPercent,
      loadLabel: utilization.loadLabel,
      contributingAssignments: await assignmentRows(
        this.prisma,
        utilization.contributingAssignments,
      ),
    };
  }
}
