import { Controller, Get, Param, Query } from '@nestjs/common';
import { producesGaps, staffingForRequirement } from '../calc/staffing';
import { resolveAsOf } from '../common/as-of';
import { NotFound, RuleViolation } from '../common/errors';
import { requireObjectId } from '../common/fields';
import { PrismaService } from '../prisma.service';
import { shortlistFor } from '../views/candidate-view';

@Controller('api/projects/:id/requirements/:reqId/candidates')
export class CandidatesController {
  constructor(private readonly prisma: PrismaService) {}

  // A shortlist is offered for a gap, not on demand. Suggesting candidates for a role that is
  // already staffed would be advice nobody asked for (FR-053, FR-061).
  @Get()
  async list(@Param('id') id: string, @Param('reqId') reqId: string, @Query('asOf') asOf?: string) {
    const projectId = requireObjectId('id', id);
    const requirementId = requireObjectId('reqId', reqId);
    const onDate = resolveAsOf(asOf);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFound('project', projectId);

    const requirement = await this.prisma.roleRequirement.findFirst({
      where: { id: requirementId, projectId },
    });
    if (!requirement) throw new NotFound('role requirement on this project', requirementId);

    if (!producesGaps(project.status)) {
      throw new RuleViolation(
        'PROJECT_NOT_STAFFABLE',
        `${project.name} is ${project.status.toLowerCase().replace('_', ' ')}, so its roles are not gaps to be filled. Move it to Planned or Active first.`,
        { status: project.status },
      );
    }

    const assignments = await this.prisma.assignment.findMany({ where: { projectId } });
    const staffing = staffingForRequirement(requirement, assignments, onDate);

    if (staffing.shortfall === 0) {
      const role = await this.prisma.role.findUnique({ where: { id: requirement.roleId } });
      throw new RuleViolation(
        'ROLE_ALREADY_STAFFED',
        `${role?.name ?? 'This role'} needs ${staffing.requiredHeadcount} and has ${staffing.filledHeadcount} on ${onDate}, so there is no gap to fill.`,
        {
          requiredHeadcount: staffing.requiredHeadcount,
          filledHeadcount: staffing.filledHeadcount,
        },
      );
    }

    return {
      projectId,
      requirementId,
      shortfall: staffing.shortfall,
      ...(await shortlistFor(
        this.prisma,
        {
          projectId,
          roleId: requirement.roleId,
          requiredSkillId: requirement.requiredSkillId,
        },
        onDate,
      )),
    };
  }
}
