import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { nameContains, nameSchema } from '../common/fields';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma.service';

const catalogueEntrySchema = z.object({ name: nameSchema('a name', 80) });

type CatalogueEntry = z.infer<typeof catalogueEntrySchema>;

const entryPipe = new ZodValidationPipe(catalogueEntrySchema);

@Controller('api')
export class CatalogueController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('skills')
  async skills(@Query('q') q?: string) {
    return {
      skills: await this.prisma.skill.findMany({
        where: { name: nameContains(q) },
        orderBy: { name: 'asc' },
      }),
    };
  }

  // A duplicate name returns the entry that already exists. Naming a skill happens in the
  // middle of staffing something, and D-03 keeps that step from blocking the flow it
  // interrupted.
  @Post('skills')
  createSkill(@Body(entryPipe) body: CatalogueEntry) {
    return this.prisma.skill.upsert({
      where: { name: body.name },
      update: {},
      create: { name: body.name },
    });
  }

  @Get('roles')
  async roles(@Query('q') q?: string) {
    return {
      roles: await this.prisma.role.findMany({
        where: { name: nameContains(q) },
        orderBy: { name: 'asc' },
      }),
    };
  }

  @Post('roles')
  createRole(@Body(entryPipe) body: CatalogueEntry) {
    return this.prisma.role.upsert({
      where: { name: body.name },
      update: {},
      create: { name: body.name },
    });
  }
}
