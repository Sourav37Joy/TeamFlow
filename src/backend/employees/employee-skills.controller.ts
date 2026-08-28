import { Body, Controller, Delete, Param, Put } from '@nestjs/common';
import { z } from 'zod';
import { AdminOnly } from '../auth/role.guard';
import { NotFound, ValidationFailed } from '../common/errors';
import { nameIndex, ratingSchema, requireObjectId } from '../common/fields';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma.service';
import { employeeRow } from './employee-row';

const ratingBodySchema = z.object({ rating: ratingSchema });

// Ratings are edited one at a time so a correction never means recreating the person
// (FR-012). The url names the skill, so this route cannot produce a duplicate rating -
// FR-011's duplicate rule is enforced in employees.controller.ts, where a whole list of
// ratings arrives at once.
@Controller('api/employees/:id/skills')
export class EmployeeSkillsController {
  constructor(private readonly prisma: PrismaService) {}

  @AdminOnly('Rating an employee skill')
  @Put(':skillId')
  async set(
    @Param('id') id: string,
    @Param('skillId') rawSkillId: string,
    @Body(new ZodValidationPipe(ratingBodySchema)) input: z.infer<typeof ratingBodySchema>,
  ) {
    const employeeId = requireObjectId('id', id);
    const skillId = requireObjectId('skillId', rawSkillId);

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFound('employee', employeeId);

    const skill = await this.prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      throw new ValidationFailed([
        {
          field: 'skillId',
          value: skillId,
          permitted: 'the id of a skill in the catalogue',
          code: 'UNKNOWN_SKILL',
        },
      ]);
    }

    const held = employee.skills.some((rated) => rated.skillId === skillId);
    const skills = held
      ? employee.skills.map((rated) =>
          rated.skillId === skillId ? { skillId, rating: input.rating } : rated,
        )
      : [...employee.skills, { skillId, rating: input.rating }];

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { skills: { set: skills } },
    });

    return employeeRow(updated, nameIndex(await this.prisma.skill.findMany()));
  }

  @AdminOnly('Removing an employee skill')
  @Delete(':skillId')
  async remove(@Param('id') id: string, @Param('skillId') rawSkillId: string) {
    const employeeId = requireObjectId('id', id);
    const skillId = requireObjectId('skillId', rawSkillId);

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFound('employee', employeeId);

    if (!employee.skills.some((rated) => rated.skillId === skillId)) {
      throw new NotFound('rated skill on this employee', skillId);
    }

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { skills: { set: employee.skills.filter((rated) => rated.skillId !== skillId) } },
    });

    return employeeRow(updated, nameIndex(await this.prisma.skill.findMany()));
  }
}
