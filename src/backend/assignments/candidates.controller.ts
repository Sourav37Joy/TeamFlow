import { Controller, Get, Param, Query } from '@nestjs/common';
import { producesGaps } from '../calc/staffing';
import { resolveAsOf } from '../common/as-of';
import { NotFound, RuleViolation } from '../common/errors';
import { requireObjectId } from '../common/fields';
import { PrismaService } from '../prisma.service';
import { shortlistFor } from '../views/candidate-view';

@Controller('api/assignments/:id/replacement-candidates')
export class ReplacementCandidatesController {
  constructor(private readonly prisma: PrismaService) {}

  // Candidates for a handover, ranked the same way as for a gap, with the person being
  // replaced excluded (FR-052, FR-057).
  @Get()
  async list(@Param('id') id: string, @Query('asOf') asOf?: string) {
    const assignmentId = requireObjectId('id', id);
    const onDate = resolveAsOf(asOf);

    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFound('assignment', assignmentId);

    const project = await this.prisma.project.findUnique({
      where: { id: assignment.projectId },
    });
    if (!project) throw new NotFound('project', assignment.projectId);

    if (!producesGaps(project.status)) {
      throw new RuleViolation(
        'PROJECT_NOT_STAFFABLE',
        `${project.name} is ${project.status.toLowerCase().replace('_', ' ')}, so it is not being staffed. Move it to Planned or Active first.`,
        { status: project.status },
      );
    }

    const requirement = await this.prisma.roleRequirement.findFirst({
      where: { projectId: assignment.projectId, roleId: assignment.roleId },
    });

    // With no requirement for this role there is no required skill to score against. Saying
    // so beats ranking everybody against nothing (FR-042, FR-059).
    if (!requirement) {
      const role = await this.prisma.role.findUnique({ where: { id: assignment.roleId } });
      return {
        assignmentId,
        asOf: onDate,
        requiredSkillId: null,
        requiredSkillName: null,
        candidates: [],
        reason: 'ROLE_NOT_DECLARED',
        message: `${project.name} does not declare a ${role?.name ?? 'matching'} requirement, so there is no required skill to rank candidates against. Declare the role on the project to get a shortlist.`,
      };
    }

    return {
      assignmentId,
      outgoingEmployeeId: assignment.employeeId,
      ...(await shortlistFor(
        this.prisma,
        {
          projectId: assignment.projectId,
          roleId: assignment.roleId,
          requiredSkillId: requirement.requiredSkillId,
          excludeEmployeeIds: [assignment.employeeId],
        },
        onDate,
      )),
    };
  }
}
