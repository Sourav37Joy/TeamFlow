import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { NotFound, RuleViolation } from '../common/errors';
import { objectIdSchema, requireObjectId } from '../common/fields';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma.service';
import { checkRequirements, requirementInputSchema } from './projects.controller';
import { requirementRows } from './requirement-row';

const updateRequirementSchema = z
  .object({
    requiredSkillId: objectIdSchema.optional(),
    headcount: z.number().int().min(1, 'an integer of 1 or more').optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'at least one of headcount or requiredSkillId',
  });

@Controller('api/projects/:id/requirements')
export class RequirementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async add(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(requirementInputSchema))
    input: z.infer<typeof requirementInputSchema>,
  ) {
    const projectId = requireObjectId('id', id);
    await this.findProject(projectId);
    await checkRequirements(this.prisma, [input]);

    const declared = await this.prisma.roleRequirement.findFirst({
      where: { projectId, roleId: input.roleId },
    });
    if (declared) {
      const role = await this.prisma.role.findUnique({ where: { id: input.roleId } });
      throw new RuleViolation(
        'DUPLICATE_ROLE_REQUIREMENT',
        `${role?.name ?? input.roleId} is already declared on this project, needing ${declared.headcount}. Change that headcount instead of declaring the role twice.`,
        { roleId: input.roleId, requirementId: declared.id },
      );
    }

    const created = await this.prisma.roleRequirement.create({ data: { projectId, ...input } });
    return this.one(created.id);
  }

  @Patch(':reqId')
  async update(
    @Param('id') id: string,
    @Param('reqId') reqId: string,
    @Body(new ZodValidationPipe(updateRequirementSchema))
    input: z.infer<typeof updateRequirementSchema>,
  ) {
    const projectId = requireObjectId('id', id);
    const requirementId = requireObjectId('reqId', reqId);
    const requirement = await this.findRequirement(projectId, requirementId);

    if (input.requiredSkillId) {
      await checkRequirements(this.prisma, [
        {
          roleId: requirement.roleId,
          requiredSkillId: input.requiredSkillId,
          headcount: input.headcount ?? requirement.headcount,
        },
      ]);
    }

    await this.prisma.roleRequirement.update({ where: { id: requirementId }, data: input });
    return this.one(requirementId);
  }

  @Delete(':reqId')
  async remove(@Param('id') id: string, @Param('reqId') reqId: string) {
    const projectId = requireObjectId('id', id);
    const requirementId = requireObjectId('reqId', reqId);
    await this.findRequirement(projectId, requirementId);

    // Assignments stay. A role no longer required does not undo the work already
    // committed to it; it shows on the project as unrequested surplus instead (FR-042).
    await this.prisma.roleRequirement.delete({ where: { id: requirementId } });
    return { deleted: true };
  }

  private async findProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFound('project', projectId);
    return project;
  }

  private async findRequirement(projectId: string, requirementId: string) {
    const requirement = await this.prisma.roleRequirement.findFirst({
      where: { id: requirementId, projectId },
    });
    if (!requirement) throw new NotFound('role requirement on this project', requirementId);
    return requirement;
  }

  private async one(requirementId: string) {
    const requirement = await this.prisma.roleRequirement.findUniqueOrThrow({
      where: { id: requirementId },
    });
    const [row] = await requirementRows(this.prisma, [requirement]);
    return row;
  }
}
