import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Prisma, Project, ProjectStatus } from '@prisma/client';
import { z } from 'zod';
import { assignmentRows } from '../common/assignment-row';
import { deleteProjectWithRequirementsAndAssignments } from '../common/cascade';
import { ConfirmationRequired, NotFound, RuleViolation, ValidationFailed } from '../common/errors';
import { nameContains, nameSchema, objectIdSchema, requireObjectId } from '../common/fields';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma.service';
import { requirementRows } from './requirement-row';

const STATUSES = Object.values(ProjectStatus);
const STATUS_RULE = `one of ${STATUSES.join(', ')}`;

export const statusSchema = z.nativeEnum(ProjectStatus, {
  errorMap: () => ({ message: STATUS_RULE }),
});

export const requirementInputSchema = z.object({
  roleId: objectIdSchema,
  requiredSkillId: objectIdSchema,
  headcount: z.number().int().min(1, 'an integer of 1 or more'),
});

const createProjectSchema = z.object({
  name: nameSchema('a name'),
  status: statusSchema,
  requirements: z.array(requirementInputSchema).default([]),
});

const updateProjectSchema = z
  .object({ name: nameSchema('a name').optional(), status: statusSchema.optional() })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'at least one of name or status',
  });

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('q') q?: string, @Query('status') status?: string) {
    const where: Prisma.ProjectWhereInput = { name: nameContains(q) };

    if (status) {
      const parsed = statusSchema.safeParse(status);
      if (!parsed.success) {
        throw new ValidationFailed([
          { field: 'status', value: status, permitted: STATUS_RULE, code: 'INVALID_ENUM_VALUE' },
        ]);
      }
      where.status = parsed.data;
    }

    return {
      projects: await this.prisma.project.findMany({ where, orderBy: { name: 'asc' } }),
    };
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    const projectId = requireObjectId('id', id);
    const project = await this.find(projectId);

    const [requirements, assignments] = await Promise.all([
      this.prisma.roleRequirement.findMany({ where: { projectId } }),
      this.prisma.assignment.findMany({
        where: { projectId },
        orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
      }),
    ]);

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      requirements: await requirementRows(this.prisma, requirements),
      assignments: await assignmentRows(this.prisma, assignments),
    };
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createProjectSchema)) input: z.infer<typeof createProjectSchema>,
  ) {
    await checkRequirements(this.prisma, input.requirements);

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: { name: input.name, status: input.status },
      });
      if (input.requirements.length > 0) {
        await tx.roleRequirement.createMany({
          data: input.requirements.map((requirement) => ({
            projectId: created.id,
            ...requirement,
          })),
        });
      }
      return created;
    });

    return this.read(project.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) input: z.infer<typeof updateProjectSchema>,
  ) {
    const projectId = requireObjectId('id', id);
    await this.find(projectId);
    await this.prisma.project.update({ where: { id: projectId }, data: input });
    return this.read(projectId);
  }

  // Deleting a project names the assignments that go with it before it happens (FR-006).
  @Delete(':id')
  async remove(@Param('id') id: string, @Query('confirm') confirm?: string) {
    const projectId = requireObjectId('id', id);
    const project = await this.find(projectId);
    const staffed = await this.prisma.assignment.findMany({ where: { projectId } });

    if (staffed.length > 0 && confirm !== 'true') {
      throw new ConfirmationRequired(
        `${project.name} holds ${staffed.length} assignment${staffed.length === 1 ? '' : 's'}, which deleting the project removes. Resend with confirm=true to proceed.`,
        await assignmentRows(this.prisma, staffed),
      );
    }

    await deleteProjectWithRequirementsAndAssignments(
      this.prisma,
      projectId,
      staffed.map((assignment) => assignment.id),
    );

    return { deleted: true, removedAssignments: staffed.length };
  }

  private async find(projectId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFound('project', projectId);
    return project;
  }
}

// A requirement points at a role and the skill that role depends on; both must exist, and a
// role may be declared only once per project (FR-003, FR-004).
export async function checkRequirements(
  prisma: PrismaService,
  requirements: Array<z.infer<typeof requirementInputSchema>>,
): Promise<void> {
  const roleIds = requirements.map((requirement) => requirement.roleId);
  const duplicate = roleIds.find((roleId, index) => roleIds.indexOf(roleId) !== index);

  if (duplicate) {
    const role = await prisma.role.findUnique({ where: { id: duplicate } });
    throw new RuleViolation(
      'DUPLICATE_ROLE_REQUIREMENT',
      `${role?.name ?? duplicate} is declared twice. Declare a role once and set the headcount it needs.`,
      { roleId: duplicate },
    );
  }

  const [roles, skills] = await Promise.all([
    prisma.role.findMany({ where: { id: { in: roleIds } } }),
    prisma.skill.findMany({
      where: { id: { in: requirements.map((requirement) => requirement.requiredSkillId) } },
    }),
  ]);

  const knownRoles = new Set(roles.map((role) => role.id));
  const knownSkills = new Set(skills.map((skill) => skill.id));
  const details = requirements.flatMap((requirement, index) => [
    ...(knownRoles.has(requirement.roleId)
      ? []
      : [
          {
            field: `requirements.${index}.roleId`,
            value: requirement.roleId,
            permitted: 'the id of a role in the catalogue',
            code: 'UNKNOWN_ROLE',
          },
        ]),
    ...(knownSkills.has(requirement.requiredSkillId)
      ? []
      : [
          {
            field: `requirements.${index}.requiredSkillId`,
            value: requirement.requiredSkillId,
            permitted: 'the id of a skill in the catalogue',
            code: 'UNKNOWN_SKILL',
          },
        ]),
  ]);

  if (details.length > 0) throw new ValidationFailed(details);
}
