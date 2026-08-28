import { Assignment, Employee, Project, Role } from '@prisma/client';
import { CalendarDate, dayBefore, isRangeOrdered, isWithinRange } from '../calc/dates';
import { wouldOverallocate } from '../calc/utilization';
import { detachAssignments } from '../common/cascade';
import { NotFound, RuleViolation } from '../common/errors';
import {
  outgoingRemovedWarning,
  overallocationWarning,
  singleDayHandoverWarning,
  Warning,
} from '../common/warnings';
import { PrismaService } from '../prisma.service';

export interface ReplacementRequest {
  incomingEmployeeId: string;
  effectiveDate: CalendarDate;
  allocationPercent?: number;
  endDate?: CalendarDate;
}

export interface ReplacementPlan {
  outgoing: Assignment;
  outgoingEmployee: Employee;
  incomingEmployee: Employee;
  project: Project;
  role: Role;
  effectiveDate: CalendarDate;
  allocationPercent: number;
  endDate: CalendarDate;
  // The outgoing commitment is shortened to the day before the handover, unless the handover
  // is its first day, in which case there is nothing left to keep (FR-046, FR-047).
  outgoingRemoved: boolean;
  outgoingNewEndDate: CalendarDate | null;
}

export interface ReplacementResult {
  incoming: Assignment;
  outgoing: Assignment | null;
  replacementId: string;
}

// The handover carries the role, percentage, and end date across by default; the caller may
// adjust the percentage and the end date, never the role or the project (FR-044).
export async function planReplacement(
  prisma: PrismaService,
  assignmentId: string,
  request: ReplacementRequest,
  today: CalendarDate,
): Promise<ReplacementPlan> {
  const outgoing = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!outgoing) throw new NotFound('assignment', assignmentId);

  // Nothing remains to hand over once the commitment is behind us (FR-049).
  if (outgoing.endDate < today) {
    throw new RuleViolation(
      'REPLACEMENT_ASSIGNMENT_ENDED',
      `This assignment ended on ${outgoing.endDate}, so there is no remaining commitment to hand over. Create a new assignment instead.`,
      { endDate: outgoing.endDate, today },
    );
  }

  // The handover must fall inside the commitment being handed over (FR-045).
  if (!isWithinRange(request.effectiveDate, outgoing.startDate, outgoing.endDate)) {
    throw new RuleViolation(
      'REPLACEMENT_DATE_OUT_OF_RANGE',
      `effectiveDate ${request.effectiveDate} falls outside this assignment. Permitted range is ${outgoing.startDate} to ${outgoing.endDate} inclusive.`,
      {
        field: 'effectiveDate',
        permittedFrom: outgoing.startDate,
        permittedTo: outgoing.endDate,
      },
    );
  }

  // Replacing somebody with themselves is not a handover (FR-048).
  if (request.incomingEmployeeId === outgoing.employeeId) {
    throw new RuleViolation(
      'REPLACEMENT_SAME_EMPLOYEE',
      'The incoming and outgoing person are the same. Choose a different person, or edit the assignment instead.',
      { field: 'incomingEmployeeId' },
    );
  }

  const [outgoingEmployee, incomingEmployee, project, role] = await Promise.all([
    prisma.employee.findUnique({ where: { id: outgoing.employeeId } }),
    prisma.employee.findUnique({ where: { id: request.incomingEmployeeId } }),
    prisma.project.findUnique({ where: { id: outgoing.projectId } }),
    prisma.role.findUnique({ where: { id: outgoing.roleId } }),
  ]);

  if (!incomingEmployee) throw new NotFound('employee', request.incomingEmployeeId);
  if (!outgoingEmployee) throw new NotFound('employee', outgoing.employeeId);
  if (!project) throw new NotFound('project', outgoing.projectId);
  if (!role) throw new NotFound('role', outgoing.roleId);

  // The incoming person cannot already hold that project in that role (FR-048).
  const alreadyHeld = await prisma.assignment.findFirst({
    where: {
      employeeId: incomingEmployee.id,
      projectId: outgoing.projectId,
      roleId: outgoing.roleId,
    },
  });
  if (alreadyHeld) {
    throw new RuleViolation(
      'REPLACEMENT_INCOMING_ALREADY_ASSIGNED',
      `${incomingEmployee.name} already holds ${role.name} on ${project.name}, from ${alreadyHeld.startDate} to ${alreadyHeld.endDate}. Edit that allocation instead.`,
      { field: 'incomingEmployeeId', assignmentId: alreadyHeld.id },
    );
  }

  const endDate = request.endDate ?? outgoing.endDate;
  if (!isRangeOrdered(request.effectiveDate, endDate)) {
    throw new RuleViolation(
      'END_BEFORE_START',
      `endDate ${endDate} precedes the handover date ${request.effectiveDate}. The incoming commitment must end on or after the day it starts.`,
      { field: 'endDate' },
    );
  }

  const outgoingRemoved = request.effectiveDate === outgoing.startDate;

  return {
    outgoing,
    outgoingEmployee,
    incomingEmployee,
    project,
    role,
    effectiveDate: request.effectiveDate,
    allocationPercent: request.allocationPercent ?? outgoing.allocationPercent,
    endDate,
    outgoingRemoved,
    outgoingNewEndDate: outgoingRemoved ? null : dayBefore(request.effectiveDate),
  };
}

export async function replacementWarnings(
  prisma: PrismaService,
  plan: ReplacementPlan,
): Promise<Warning[]> {
  const warnings: Warning[] = [];

  const held = await prisma.assignment.findMany({
    where: { employeeId: plan.incomingEmployee.id },
  });
  const verdict = wouldOverallocate(plan.incomingEmployee, held, {
    allocationPercent: plan.allocationPercent,
    startDate: plan.effectiveDate,
    endDate: plan.endDate,
  });
  if (verdict.overallocated) {
    warnings.push(
      overallocationWarning(
        plan.incomingEmployee.name,
        verdict.resultingPercent,
        plan.incomingEmployee.totalCapacityPercent,
        verdict.onDate,
      ),
    );
  }

  if (plan.outgoingRemoved) {
    warnings.push(outgoingRemovedWarning(plan.effectiveDate));
  }

  if (plan.effectiveDate === plan.endDate) {
    warnings.push(singleDayHandoverWarning(plan.effectiveDate));
  }

  return warnings;
}

// One transaction: shorten or remove the outgoing commitment, open the incoming one on the
// handover date, and write the history. A half-applied handover would leave the project's
// headcount for that role either double-counted or missing (FR-046, D-08, D-12).
export function commitReplacement(
  prisma: PrismaService,
  plan: ReplacementPlan,
  performedByUserId: string,
): Promise<ReplacementResult> {
  return prisma.$transaction(async (tx) => {
    const outgoing = plan.outgoingRemoved
      ? null
      : await tx.assignment.update({
          where: { id: plan.outgoing.id },
          data: {
            endDate: plan.outgoingNewEndDate as string,
            updatedByUserId: performedByUserId,
          },
        });

    const incoming = await tx.assignment.create({
      data: {
        employeeId: plan.incomingEmployee.id,
        projectId: plan.outgoing.projectId,
        roleId: plan.outgoing.roleId,
        allocationPercent: plan.allocationPercent,
        startDate: plan.effectiveDate,
        endDate: plan.endDate,
        predecessorAssignmentId: plan.outgoingRemoved
          ? plan.outgoing.predecessorAssignmentId
          : plan.outgoing.id,
        createdByUserId: performedByUserId,
        updatedByUserId: performedByUserId,
      },
    });

    const replacement = await tx.replacement.create({
      data: {
        outgoingAssignmentId: plan.outgoingRemoved ? null : plan.outgoing.id,
        incomingAssignmentId: incoming.id,
        outgoingEmployeeId: plan.outgoing.employeeId,
        effectiveDate: plan.effectiveDate,
        performedByUserId,
      },
    });

    if (plan.outgoingRemoved) {
      await detachAssignments(tx, [plan.outgoing.id]);
      await tx.assignment.delete({ where: { id: plan.outgoing.id } });
    }

    return { incoming, outgoing, replacementId: replacement.id };
  });
}
