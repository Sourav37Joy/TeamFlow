import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';
import { z } from 'zod';
import { AdminOnly } from '../auth/role.guard';
import { CalendarDate } from '../calc/dates';
import {
  LOAD_LABELS,
  LoadLabel,
  Utilization,
  utilizationFor,
  utilizationForAll,
} from '../calc/utilization';
import { resolveAsOf } from '../common/as-of';
import { AssignmentRow, assignmentRows } from '../common/assignment-row';
import { deleteEmployeeWithAssignments } from '../common/cascade';
import { ConfirmationRequired, NotFound, RuleViolation, ValidationFailed } from '../common/errors';
import {
  nameContains,
  nameIndex,
  nameSchema,
  percentSchema,
  ratingSchema,
  requireObjectId,
  objectIdSchema,
  unique,
} from '../common/fields';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma.service';
import { historyForEmployee } from '../assignments/replacement-history';
import { employeeRow } from './employee-row';

const ratedSkillSchema = z.object({ skillId: objectIdSchema, rating: ratingSchema });

const createEmployeeSchema = z.object({
  name: nameSchema('a name'),
  roleTitle: nameSchema('a role title'),
  totalCapacityPercent: percentSchema('a whole percentage').default(100),
  skills: z.array(ratedSkillSchema).default([]),
});

const updateEmployeeSchema = z
  .object({
    name: nameSchema('a name').optional(),
    roleTitle: nameSchema('a role title').optional(),
    totalCapacityPercent: percentSchema('a whole percentage').optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'at least one of name, roleTitle, or totalCapacityPercent',
  });

type RatedSkillInput = z.infer<typeof ratedSkillSchema>;

@Controller('api/employees')
export class EmployeesController {
  constructor(private readonly prisma: PrismaService) {}

  // The list carries each person's load on the evaluation date, computed here and never
  // stored, so searching for "who is free" is one request (FR-014, FR-032, FR-037).
  @Get()
  async list(
    @Query('q') q?: string,
    @Query('skillId') skillId?: string,
    @Query('loadLabel') label?: string,
    @Query('asOf') asOf?: string,
  ) {
    const onDate = resolveAsOf(asOf);
    const where: Prisma.EmployeeWhereInput = {};
    const term = nameContains(q);
    if (term) {
      where.OR = [{ name: term }, { roleTitle: term }];
    }
    if (skillId) {
      where.skills = { some: { skillId: requireObjectId('skillId', skillId) } };
    }

    const wanted = label ? requireLoadLabel(label) : undefined;

    const [employees, skills, assignments] = await Promise.all([
      this.prisma.employee.findMany({ where, orderBy: { name: 'asc' } }),
      this.prisma.skill.findMany(),
      this.prisma.assignment.findMany(),
    ]);

    const skillNames = nameIndex(skills);
    // One pass over the register for the whole list, rather than a scan of it per person.
    const byEmployee = new Map(
      utilizationForAll(employees, assignments, onDate).map((entry) => [entry.employeeId, entry]),
    );
    const rows = employees
      .map((employee) => ({
        ...employeeRow(employee, skillNames),
        ...load(byEmployee.get(employee.id) as Utilization),
      }))
      .filter((row) => wanted === undefined || row.loadLabel === wanted);

    return { asOf: onDate, employees: rows };
  }

  // One employee, their ratings, their load on the evaluation date, and every assignment they
  // hold - expired and future ones included, marked but excluded from the total (FR-035).
  @Get(':id')
  async read(@Param('id') id: string, @Query('asOf') asOf?: string) {
    const employeeId = requireObjectId('id', id);
    const onDate = resolveAsOf(asOf);
    const employee = await this.find(employeeId);

    const [assignments, skills] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { employeeId },
        orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
      }),
      this.prisma.skill.findMany(),
    ]);

    const utilization = utilizationFor(employee, assignments, onDate);
    const contributing = new Set(utilization.contributingAssignments.map((a) => a.id));
    const rows = await assignmentRows(this.prisma, assignments);

    return {
      ...employeeRow(employee, nameIndex(skills)),
      ...load(utilization),
      asOf: onDate,
      assignments: rows.map((row) => ({
        ...row,
        standing: standingOf(row, onDate, contributing),
      })),
      // Both sides of every handover this person was part of, incoming and outgoing (FR-051).
      replacementHistory: await historyForEmployee(this.prisma, employeeId),
    };
  }

  @AdminOnly('Creating an employee')
  @Post()
  async create(
    @Body(new ZodValidationPipe(createEmployeeSchema)) input: z.infer<typeof createEmployeeSchema>,
  ) {
    await this.checkSkills(input.skills);

    const employee = await this.prisma.employee.create({
      data: {
        name: input.name,
        roleTitle: input.roleTitle,
        totalCapacityPercent: input.totalCapacityPercent,
        skills: { set: input.skills },
      },
    });

    return employeeRow(employee, nameIndex(await this.prisma.skill.findMany()));
  }

  @AdminOnly('Updating an employee')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEmployeeSchema)) input: z.infer<typeof updateEmployeeSchema>,
  ) {
    const employeeId = requireObjectId('id', id);
    await this.find(employeeId);

    const employee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: input,
    });

    return employeeRow(employee, nameIndex(await this.prisma.skill.findMany()));
  }

  // Deleting somebody who holds work names that work first, so the consequence is visible
  // before it happens rather than discovered afterwards (FR-013).
  @AdminOnly('Deleting an employee')
  @Delete(':id')
  async remove(@Param('id') id: string, @Query('confirm') confirm?: string) {
    const employeeId = requireObjectId('id', id);
    const employee = await this.find(employeeId);
    const held = await this.prisma.assignment.findMany({ where: { employeeId } });

    if (held.length > 0 && confirm !== 'true') {
      throw new ConfirmationRequired(
        `${employee.name} holds ${held.length} assignment${held.length === 1 ? '' : 's'}, which deleting the employee removes. Resend with confirm=true to proceed.`,
        await assignmentRows(this.prisma, held),
      );
    }

    await deleteEmployeeWithAssignments(
      this.prisma,
      employeeId,
      held.map((assignment) => assignment.id),
    );

    return { deleted: true, removedAssignments: held.length };
  }

  private async find(employeeId: string): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFound('employee', employeeId);
    return employee;
  }

  // The same skill twice on one person is refused here, where a whole list of ratings
  // arrives at once - the only route that can produce a duplicate (FR-011).
  private async checkSkills(entries: RatedSkillInput[]): Promise<void> {
    const ids = entries.map((entry) => entry.skillId);
    const duplicate = ids.find((skillId, index) => ids.indexOf(skillId) !== index);

    if (duplicate) {
      const skill = await this.prisma.skill.findUnique({ where: { id: duplicate } });
      throw new RuleViolation(
        'DUPLICATE_EMPLOYEE_SKILL',
        `${skill?.name ?? duplicate} is rated twice. A skill may be rated once per employee - remove the duplicate or change its rating.`,
        { skillId: duplicate },
      );
    }

    const known = await this.prisma.skill.findMany({ where: { id: { in: unique(ids) } } });
    const knownIds = new Set(known.map((skill) => skill.id));
    const unknown = entries.filter((entry) => !knownIds.has(entry.skillId));

    if (unknown.length > 0) {
      throw new ValidationFailed(
        unknown.map((entry) => ({
          field: `skills.${ids.indexOf(entry.skillId)}.skillId`,
          value: entry.skillId,
          permitted: 'the id of a skill in the catalogue',
          code: 'UNKNOWN_SKILL',
        })),
      );
    }
  }
}

// The three derived figures travel together everywhere a person is shown, so no screen can
// display a total without the label and remaining capacity that belong to it (FR-079).
function load(utilization: Utilization) {
  return {
    utilizationPercent: utilization.utilizationPercent,
    remainingCapacityPercent: utilization.remainingCapacityPercent,
    loadLabel: utilization.loadLabel,
  };
}

// An assignment outside the evaluation date stays visible and says why it does not count
// towards the total (FR-035).
function standingOf(
  row: AssignmentRow,
  onDate: CalendarDate,
  contributing: Set<string>,
): 'ACTIVE' | 'EXPIRED' | 'FUTURE' {
  if (contributing.has(row.id)) return 'ACTIVE';
  return row.endDate < onDate ? 'EXPIRED' : 'FUTURE';
}

function requireLoadLabel(value: string): LoadLabel {
  const match = LOAD_LABELS.find((label) => label === value);
  if (!match) {
    throw new ValidationFailed([
      {
        field: 'loadLabel',
        value,
        permitted: `one of ${LOAD_LABELS.join(', ')}`,
        code: 'INVALID_ENUM_VALUE',
      },
    ]);
  }
  return match;
}
