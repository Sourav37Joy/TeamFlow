import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';
import { z } from 'zod';
import { AdminOnly } from '../auth/role.guard';
import { assignmentRows } from '../common/assignment-row';
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

  @Get()
  async list(@Query('q') q?: string, @Query('skillId') skillId?: string) {
    const where: Prisma.EmployeeWhereInput = {};
    const term = nameContains(q);
    if (term) {
      where.OR = [{ name: term }, { roleTitle: term }];
    }
    if (skillId) {
      where.skills = { some: { skillId: requireObjectId('skillId', skillId) } };
    }

    const employees = await this.prisma.employee.findMany({ where, orderBy: { name: 'asc' } });
    const skillNames = nameIndex(await this.prisma.skill.findMany());

    return { employees: employees.map((employee) => employeeRow(employee, skillNames)) };
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    const employeeId = requireObjectId('id', id);
    const employee = await this.find(employeeId);

    const [assignments, skills] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { employeeId },
        orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
      }),
      this.prisma.skill.findMany(),
    ]);

    return {
      ...employeeRow(employee, nameIndex(skills)),
      assignments: await assignmentRows(this.prisma, assignments),
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
