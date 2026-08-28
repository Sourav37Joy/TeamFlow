import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Assignment, Employee, Prisma, Project, Role } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser, SignedInUser } from '../auth/current-user.decorator';
import { CalendarDate, isRangeOrdered } from '../calc/dates';
import { isActiveOn, wouldOverallocate } from '../calc/utilization';
import { assignmentRows, AssignmentRow } from '../common/assignment-row';
import { resolveAsOf } from '../common/as-of';
import { deleteAssignmentAndDetachSuccessors } from '../common/cascade';
import { NotFound, RuleViolation, ValidationFailed } from '../common/errors';
import {
  calendarDateSchema,
  objectIdSchema,
  percentSchema,
  requireObjectId,
} from '../common/fields';
import {
  gateOnWarnings,
  overallocationWarning,
  readWriteOptions,
  roleNotDeclaredWarning,
  Warning,
} from '../common/warnings';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma.service';

const createAssignmentSchema = z.object({
  employeeId: objectIdSchema,
  projectId: objectIdSchema,
  roleId: objectIdSchema,
  allocationPercent: percentSchema('a whole percentage'),
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
  acknowledgeWarnings: z.boolean().optional(),
});

const updateAssignmentSchema = z
  .object({
    roleId: objectIdSchema.optional(),
    allocationPercent: percentSchema('a whole percentage').optional(),
    startDate: calendarDateSchema.optional(),
    endDate: calendarDateSchema.optional(),
    acknowledgeWarnings: z.boolean().optional(),
  })
  .refine(
    (body) =>
      ['roleId', 'allocationPercent', 'startDate', 'endDate'].some((field) => field in body),
    { message: 'at least one of roleId, allocationPercent, startDate, or endDate' },
  );

interface ProposedRange {
  allocationPercent: number;
  startDate: CalendarDate;
  endDate: CalendarDate;
}

@Controller('api/assignments')
export class AssignmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('roleId') roleId?: string,
    @Query('asOf') asOf?: string,
  ) {
    const where: Prisma.AssignmentWhereInput = {};
    if (employeeId) where.employeeId = requireObjectId('employeeId', employeeId);
    if (projectId) where.projectId = requireObjectId('projectId', projectId);
    if (roleId) where.roleId = requireObjectId('roleId', roleId);

    const assignments = await this.prisma.assignment.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
    });

    // An evaluation date narrows the list to what is live on that date. Without one the
    // register is returned whole, because past and future commitments are still facts
    // about the person who holds them (FR-035).
    const onDate = asOf === undefined ? null : resolveAsOf(asOf);
    const visible = onDate ? assignments.filter((a) => isActiveOn(a, onDate)) : assignments;

    return { asOf: onDate, assignments: await assignmentRows(this.prisma, visible) };
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    const assignmentId = requireObjectId('id', id);
    return this.one(await this.find(assignmentId));
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createAssignmentSchema))
    input: z.infer<typeof createAssignmentSchema>,
    @CurrentUser() user: SignedInUser,
    @Query() query: Record<string, unknown>,
  ) {
    const employee = await this.findEmployee(input.employeeId, 'employeeId');
    const project = await this.findProject(input.projectId, 'projectId');
    const role = await this.findRole(input.roleId, 'roleId');

    requireOrderedRange(input.startDate, input.endDate);
    await this.rejectDuplicate(employee, project, role);

    const warnings = await this.warningsFor(employee, project, role, input);
    const gated = await gateOnWarnings(warnings, readWriteOptions(query, input), () =>
      this.prisma.assignment.create({
        data: {
          employeeId: employee.id,
          projectId: project.id,
          roleId: role.id,
          allocationPercent: input.allocationPercent,
          startDate: input.startDate,
          endDate: input.endDate,
          createdByUserId: user.id,
          updatedByUserId: user.id,
        },
      }),
    );

    return {
      warnings: gated.warnings,
      assignment: gated.result ? await this.one(gated.result) : null,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAssignmentSchema))
    input: z.infer<typeof updateAssignmentSchema>,
    @CurrentUser() user: SignedInUser,
    @Query() query: Record<string, unknown>,
  ) {
    const assignmentId = requireObjectId('id', id);
    const existing = await this.find(assignmentId);

    const proposed: ProposedRange = {
      allocationPercent: input.allocationPercent ?? existing.allocationPercent,
      startDate: input.startDate ?? existing.startDate,
      endDate: input.endDate ?? existing.endDate,
    };

    const employee = await this.findEmployee(existing.employeeId, 'employeeId');
    const project = await this.findProject(existing.projectId, 'projectId');
    const role = await this.findRole(input.roleId ?? existing.roleId, 'roleId');

    requireOrderedRange(proposed.startDate, proposed.endDate);
    if (role.id !== existing.roleId) {
      await this.rejectDuplicate(employee, project, role);
    }

    const warnings = await this.warningsFor(employee, project, role, proposed, assignmentId);
    const gated = await gateOnWarnings(warnings, readWriteOptions(query, input), () =>
      this.prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          roleId: role.id,
          allocationPercent: proposed.allocationPercent,
          startDate: proposed.startDate,
          endDate: proposed.endDate,
          updatedByUserId: user.id,
        },
      }),
    );

    return {
      warnings: gated.warnings,
      assignment: gated.result ? await this.one(gated.result) : null,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const assignmentId = requireObjectId('id', id);
    await this.find(assignmentId);
    await deleteAssignmentAndDetachSuccessors(this.prisma, assignmentId);
    return { deleted: true };
  }

  // The warning states the total the change produces and the date it first applies, so the
  // manager decides with the number in front of them rather than being refused (FR-021).
  private async warningsFor(
    employee: Employee,
    project: Project,
    role: Role,
    proposed: ProposedRange,
    excludeAssignmentId?: string,
  ): Promise<Warning[]> {
    const warnings: Warning[] = [];

    const existing = await this.prisma.assignment.findMany({
      where: { employeeId: employee.id },
    });
    const verdict = wouldOverallocate(employee, existing, proposed, excludeAssignmentId);
    if (verdict.overallocated) {
      warnings.push(
        overallocationWarning(
          employee.name,
          verdict.resultingPercent,
          employee.totalCapacityPercent,
          verdict.onDate,
        ),
      );
    }

    const declared = await this.prisma.roleRequirement.findFirst({
      where: { projectId: project.id, roleId: role.id },
    });
    if (!declared) {
      warnings.push(roleNotDeclaredWarning(project.name, role.name));
    }

    return warnings;
  }

  private async rejectDuplicate(employee: Employee, project: Project, role: Role): Promise<void> {
    const held = await this.prisma.assignment.findFirst({
      where: { employeeId: employee.id, projectId: project.id, roleId: role.id },
    });
    if (!held) return;

    throw new RuleViolation(
      'DUPLICATE_ASSIGNMENT',
      `${employee.name} is already assigned to ${project.name} as ${role.name} at ${held.allocationPercent}% from ${held.startDate} to ${held.endDate}. Edit that allocation instead of adding a second one.`,
      { assignmentId: held.id },
    );
  }

  private async find(assignmentId: string): Promise<Assignment> {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFound('assignment', assignmentId);
    return assignment;
  }

  private async findEmployee(id: string, field: string): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: requireObjectId(field, id) },
    });
    if (!employee) throw new NotFound('employee', id);
    return employee;
  }

  private async findProject(id: string, field: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: requireObjectId(field, id) },
    });
    if (!project) throw new NotFound('project', id);
    return project;
  }

  private async findRole(id: string, field: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({ where: { id: requireObjectId(field, id) } });
    if (!role) {
      throw new ValidationFailed([
        {
          field,
          value: id,
          permitted: 'the id of a role in the catalogue',
          code: 'UNKNOWN_ROLE',
        },
      ]);
    }
    return role;
  }

  private async one(assignment: Assignment): Promise<AssignmentRow> {
    const [row] = await assignmentRows(this.prisma, [assignment]);
    return row as AssignmentRow;
  }
}

// A reversed range is a typo, not a state of the world, so it is refused outright while
// overallocation is only warned about (FR-019, contracts/errors.md).
function requireOrderedRange(startDate: CalendarDate, endDate: CalendarDate): void {
  if (isRangeOrdered(startDate, endDate)) return;
  throw new RuleViolation(
    'END_BEFORE_START',
    `endDate ${endDate} precedes startDate ${startDate}. An assignment must end on or after the day it starts.`,
    { field: 'endDate', startDate, endDate },
  );
}
