import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type Tx = Prisma.TransactionClient;

// MongoDB has no foreign keys, so every cascade runs in application code - and inside the
// same transaction as the delete that triggered it, or a half-applied cascade could
// survive a failure (D-12).
async function detach(tx: Tx, assignmentIds: string[]): Promise<void> {
  await tx.assignment.updateMany({
    where: { predecessorAssignmentId: { in: assignmentIds } },
    data: { predecessorAssignmentId: null },
  });

  await tx.replacement.updateMany({
    where: { outgoingAssignmentId: { in: assignmentIds } },
    data: { outgoingAssignmentId: null },
  });

  // A replacement's incoming reference is required, so a history record whose incoming
  // assignment is gone is removed rather than left pointing at nothing.
  await tx.replacement.deleteMany({ where: { incomingAssignmentId: { in: assignmentIds } } });
}

export function deleteEmployeeWithAssignments(
  prisma: PrismaService,
  employeeId: string,
  assignmentIds: string[],
): Promise<void> {
  return prisma.$transaction(async (tx) => {
    await detach(tx, assignmentIds);
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
    await detach(tx, assignmentIds);
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
    await detach(tx, [assignmentId]);
    await tx.assignment.delete({ where: { id: assignmentId } });
  });
}
