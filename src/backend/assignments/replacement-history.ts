import { Assignment, Replacement } from '@prisma/client';
import { nameIndex, unique } from '../common/fields';
import { PrismaService } from '../prisma.service';

export interface ReplacementHistoryRow {
  id: string;
  effectiveDate: string;
  outgoingEmployeeId: string;
  outgoingEmployeeName: string;
  incomingEmployeeId: string | null;
  incomingEmployeeName: string | null;
  projectName: string | null;
  roleName: string | null;
  performedByUserId: string;
  performedByName: string;
  performedAt: Date;
  outgoingAssignmentId: string | null;
  incomingAssignmentId: string | null;
}

const UNKNOWN = 'Unknown';

// History is read by following the chain of assignments a replacement produced. Repeated
// handovers append rather than overwrite, so the whole sequence stays readable from either
// end of it (FR-051, D-08).
async function lineageOf(prisma: PrismaService, assignment: Assignment): Promise<string[]> {
  const chain = [assignment.id];

  let current: Assignment | null = assignment;
  while (current?.predecessorAssignmentId) {
    const predecessorId: string = current.predecessorAssignmentId;
    current = await prisma.assignment.findUnique({ where: { id: predecessorId } });
    if (!current || chain.includes(current.id)) break;
    chain.unshift(current.id);
  }

  let successors = await prisma.assignment.findMany({
    where: { predecessorAssignmentId: assignment.id },
  });
  while (successors.length > 0) {
    const ids = successors.map((successor) => successor.id).filter((id) => !chain.includes(id));
    if (ids.length === 0) break;
    chain.push(...ids);
    successors = await prisma.assignment.findMany({
      where: { predecessorAssignmentId: { in: ids } },
    });
  }

  return chain;
}

async function historyRows(
  prisma: PrismaService,
  replacements: Replacement[],
): Promise<ReplacementHistoryRow[]> {
  if (replacements.length === 0) return [];

  const incomingIds = replacements
    .map((replacement) => replacement.incomingAssignmentId)
    .filter((id): id is string => id !== null);

  const incomingAssignments = await prisma.assignment.findMany({
    where: { id: { in: unique(incomingIds) } },
  });

  const [employees, projects, roles, users] = await Promise.all([
    prisma.employee.findMany({
      where: {
        id: {
          in: unique([
            ...replacements.map((replacement) => replacement.outgoingEmployeeId),
            ...incomingAssignments.map((assignment) => assignment.employeeId),
          ]),
        },
      },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { id: { in: unique(incomingAssignments.map((a) => a.projectId)) } },
      select: { id: true, name: true },
    }),
    prisma.role.findMany({
      where: { id: { in: unique(incomingAssignments.map((a) => a.roleId)) } },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { id: { in: unique(replacements.map((r) => r.performedByUserId)) } },
      select: { id: true, displayName: true },
    }),
  ]);

  const employeeNames = nameIndex(employees);
  const projectNames = nameIndex(projects);
  const roleNames = nameIndex(roles);
  const userNames = new Map(users.map((user) => [user.id, user.displayName]));
  const incomingById = new Map(incomingAssignments.map((a) => [a.id, a]));

  return replacements
    .map((replacement) => {
      const incoming = replacement.incomingAssignmentId
        ? incomingById.get(replacement.incomingAssignmentId)
        : undefined;

      return {
        id: replacement.id,
        effectiveDate: replacement.effectiveDate,
        outgoingEmployeeId: replacement.outgoingEmployeeId,
        outgoingEmployeeName: employeeNames.get(replacement.outgoingEmployeeId) ?? UNKNOWN,
        incomingEmployeeId: incoming?.employeeId ?? null,
        incomingEmployeeName: incoming ? (employeeNames.get(incoming.employeeId) ?? UNKNOWN) : null,
        projectName: incoming ? (projectNames.get(incoming.projectId) ?? UNKNOWN) : null,
        roleName: incoming ? (roleNames.get(incoming.roleId) ?? UNKNOWN) : null,
        performedByUserId: replacement.performedByUserId,
        performedByName: userNames.get(replacement.performedByUserId) ?? UNKNOWN,
        performedAt: replacement.performedAt,
        outgoingAssignmentId: replacement.outgoingAssignmentId,
        incomingAssignmentId: replacement.incomingAssignmentId,
      };
    })
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
}

// The history that belongs to one assignment is the history of its whole lineage: the
// handovers that produced it and any that came after (FR-051).
export async function historyForAssignment(
  prisma: PrismaService,
  assignment: Assignment,
): Promise<ReplacementHistoryRow[]> {
  const lineage = await lineageOf(prisma, assignment);
  const replacements = await prisma.replacement.findMany({
    where: {
      OR: [{ incomingAssignmentId: { in: lineage } }, { outgoingAssignmentId: { in: lineage } }],
    },
  });
  return historyRows(prisma, replacements);
}

// On a person's record, both sides of every handover they were part of (FR-051).
export async function historyForEmployee(
  prisma: PrismaService,
  employeeId: string,
): Promise<ReplacementHistoryRow[]> {
  const held = await prisma.assignment.findMany({
    where: { employeeId },
    select: { id: true },
  });

  const replacements = await prisma.replacement.findMany({
    where: {
      OR: [
        { outgoingEmployeeId: employeeId },
        { incomingAssignmentId: { in: held.map((assignment) => assignment.id) } },
      ],
    },
  });

  return historyRows(prisma, replacements);
}
