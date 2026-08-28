import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type Tx = Prisma.TransactionClient;

// MongoDB has no foreign keys, so every cascade runs in application code - and inside the
// same transaction as the delete that triggered it, or a half-applied cascade could
// survive a failure (D-12).
//
// A vanishing assignment must not leave a successor or a history record pointing at a hole.
// The history itself is kept: it names both people, so it stays readable once its references
// are gone, and a handover that happened is a fact worth keeping (FR-051).
export async function detachAssignments(tx: Tx, assignmentIds: string[]): Promise<void> {
  await tx.assignment.updateMany({
    where: { predecessorAssignmentId: { in: assignmentIds } },
    data: { predecessorAssignmentId: null },
  });

  await tx.replacement.updateMany({
    where: { outgoingAssignmentId: { in: assignmentIds } },
    data: { outgoingAssignmentId: null },
  });

  await tx.replacement.updateMany({
    where: { incomingAssignmentId: { in: assignmentIds } },
    data: { incomingAssignmentId: null },
  });
}

export function deleteEmployeeWithAssignments(
  prisma: PrismaService,
  employeeId: string,
  assignmentIds: string[],
): Promise<void> {
  return prisma.$transaction(async (tx) => {
    await detachAssignments(tx, assignmentIds);
    await tx.assignment.deleteMany({ where: { employeeId } });
    await tx.employee.delete({ where: { id: employeeId } });
  });
}

export function deleteProjectWithRequirementsAndAssignments(
  prisma: PrismaService,
  projectId: string,
  assignmentIds: string[],
): Promise<void> {
  return prisma.$transaction(async (tx) => {
    await detachAssignments(tx, assignmentIds);
    await tx.assignment.deleteMany({ where: { projectId } });
    await tx.roleRequirement.deleteMany({ where: { projectId } });
    await tx.project.delete({ where: { id: projectId } });
  });
}

export function deleteAssignmentAndDetachSuccessors(
  prisma: PrismaService,
  assignmentId: string,
): Promise<void> {
  return prisma.$transaction(async (tx) => {
    await detachAssignments(tx, [assignmentId]);
    await tx.assignment.delete({ where: { id: assignmentId } });
  });
}
