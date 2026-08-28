import { Controller, Get, Param, Query } from '@nestjs/common';
import { resolveAsOf } from '../common/as-of';
import { NotFound } from '../common/errors';
import { requireObjectId } from '../common/fields';
import { PrismaService } from '../prisma.service';
import { staffingViews } from './staffing-view';

@Controller('api/projects/:id/staffing')
export class StaffingController {
  constructor(private readonly prisma: PrismaService) {}

  // Per-role required against filled, the shortfall or surplus, who is filling it, and any
  // role nobody asked for - all at the evaluation date (FR-038 to FR-042).
  @Get()
  async read(@Param('id') id: string, @Query('asOf') asOf?: string) {
    const projectId = requireObjectId('id', id);
    const onDate = resolveAsOf(asOf);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFound('project', projectId);

    const [view] = await staffingViews(this.prisma, [project], onDate);
    return view;
  }
}
