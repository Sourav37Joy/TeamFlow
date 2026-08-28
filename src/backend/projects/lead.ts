import { Project } from '@prisma/client';
import { z } from 'zod';
import { ValidationFailed } from '../common/errors';
import { personIndex, unique } from '../common/fields';
import { objectIdSchema } from '../common/fields';
import { PrismaService } from '../prisma.service';

export interface LeadRow {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
}

// Null clears the lead; undefined leaves it alone. The two are different intentions and the
// update path has to be able to tell them apart (FR-141).
export const leadInputSchema = objectIdSchema.nullable();

export async function checkLead(
  prisma: PrismaService,
  leadEmployeeId: string | null | undefined,
): Promise<void> {
  if (!leadEmployeeId) return;

  const employee = await prisma.employee.findUnique({ where: { id: leadEmployeeId } });
  if (!employee) {
    throw new ValidationFailed([
      {
        field: 'leadEmployeeId',
        value: leadEmployeeId,
        permitted: 'the id of an employee in the register, or null for no lead',
        code: 'UNKNOWN_EMPLOYEE',
      },
    ]);
  }
}

// One fetch over the named leads for a whole set of projects, never a query per project.
export async function resolveLeads(
  prisma: PrismaService,
  projects: Array<Pick<Project, 'id' | 'leadEmployeeId'>>,
): Promise<Map<string, LeadRow | null>> {
  const leadIds = unique(
    projects.flatMap((project) => (project.leadEmployeeId ? [project.leadEmployeeId] : [])),
  );

  const employees =
    leadIds.length === 0
      ? []
      : await prisma.employee.findMany({
          where: { id: { in: leadIds } },
          select: { id: true, name: true, avatarUrl: true },
        });

  const labels = personIndex(employees);

  return new Map(
    projects.map((project) => {
      const label = project.leadEmployeeId ? labels.get(project.leadEmployeeId) : undefined;
      return [
        project.id,
        label
          ? {
              employeeId: project.leadEmployeeId as string,
              name: label.name,
              avatarUrl: label.avatarUrl,
            }
          : null,
      ];
    }),
  );
}

export type LeadSchema = z.infer<typeof leadInputSchema>;
