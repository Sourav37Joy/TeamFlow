import { describe, expect, it } from 'vitest';
import {
  RequirementRecord,
  producesGaps,
  staffingForProject,
  staffingForRequirement,
  staffingStatusOf,
  unrequestedRoles,
} from '../../src/backend/calc/staffing';
import { AssignmentRecord } from '../../src/backend/calc/utilization';

const TODAY = '2026-08-28';

function requirement(over: Partial<RequirementRecord> & { id: string }): RequirementRecord {
  return {
    projectId: 'p1',
    roleId: 'r1',
    requiredSkillId: 's1',
    headcount: 1,
    ...over,
  };
}

function assignment(over: Partial<AssignmentRecord> & { id: string }): AssignmentRecord {
  return {
    employeeId: 'e1',
    projectId: 'p1',
    roleId: 'r1',
    allocationPercent: 50,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    ...over,
  };
}

describe('staffingForRequirement', () => {
  it('reports a fully staffed role', () => {
    const result = staffingForRequirement(
      requirement({ id: 'q1', headcount: 2 }),
      [assignment({ id: 'a1', employeeId: 'e1' }), assignment({ id: 'a2', employeeId: 'e2' })],
      TODAY,
    );
    expect(result.filledHeadcount).toBe(2);
    expect(result.shortfall).toBe(0);
    expect(result.surplus).toBe(0);
  });

  it('reports 1 of 3 with a shortfall of 2', () => {
    const result = staffingForRequirement(
      requirement({ id: 'q1', headcount: 3 }),
      [assignment({ id: 'a1' })],
      TODAY,
    );
    expect(result.requiredHeadcount).toBe(3);
    expect(result.filledHeadcount).toBe(1);
    expect(result.shortfall).toBe(2);
    expect(result.surplus).toBe(0);
  });

  it('reports a surplus when a one-person role has two people on it', () => {
    const result = staffingForRequirement(
      requirement({ id: 'q1', headcount: 1 }),
      [assignment({ id: 'a1', employeeId: 'e1' }), assignment({ id: 'a2', employeeId: 'e2' })],
      TODAY,
    );
    expect(result.surplus).toBe(1);
    expect(result.shortfall).toBe(0);
  });

  it('counts one person once even when they hold the role twice', () => {
    const result = staffingForRequirement(
      requirement({ id: 'q1', headcount: 2 }),
      [
        assignment({ id: 'a1', employeeId: 'e1', allocationPercent: 30 }),
        assignment({ id: 'a2', employeeId: 'e1', allocationPercent: 20 }),
      ],
      TODAY,
    );
    expect(result.filledHeadcount).toBe(1);
    expect(result.shortfall).toBe(1);
    expect(result.fillers[0]?.allocationPercent).toBe(50);
  });

  it('reopens a shortfall when the assignment has expired', () => {
    const result = staffingForRequirement(
      requirement({ id: 'q1', headcount: 1 }),
      [assignment({ id: 'a1', endDate: '2026-05-31' })],
      TODAY,
    );
    expect(result.filledHeadcount).toBe(0);
    expect(result.shortfall).toBe(1);
  });

  it('does not count an assignment that has not started', () => {
    const result = staffingForRequirement(
      requirement({ id: 'q1', headcount: 1 }),
      [assignment({ id: 'a1', startDate: '2026-11-01' })],
      TODAY,
    );
    expect(result.filledHeadcount).toBe(0);
    expect(result.shortfall).toBe(1);
  });

  it('ignores an assignment to the same role on another project', () => {
    const result = staffingForRequirement(
      requirement({ id: 'q1', headcount: 1 }),
      [assignment({ id: 'a1', projectId: 'p2' })],
      TODAY,
    );
    expect(result.filledHeadcount).toBe(0);
  });

  it('lists the fillers with their allocation percentages', () => {
    const result = staffingForRequirement(
      requirement({ id: 'q1', headcount: 2 }),
      [
        assignment({ id: 'a1', employeeId: 'e1', allocationPercent: 60 }),
        assignment({ id: 'a2', employeeId: 'e2', allocationPercent: 25 }),
      ],
      TODAY,
    );
    expect(result.fillers).toEqual([
      { employeeId: 'e1', allocationPercent: 60, assignmentId: 'a1' },
      { employeeId: 'e2', allocationPercent: 25, assignmentId: 'a2' },
    ]);
  });
});

describe('unrequestedRoles', () => {
  it('is empty when every assigned role is declared', () => {
    const result = unrequestedRoles(
      'p1',
      [requirement({ id: 'q1', roleId: 'r1' })],
      [assignment({ id: 'a1', roleId: 'r1' })],
      TODAY,
    );
    expect(result).toEqual([]);
  });

  it('reports an assignment on a role the project never declared', () => {
    const result = unrequestedRoles(
      'p1',
      [requirement({ id: 'q1', roleId: 'r1' })],
      [assignment({ id: 'a1', roleId: 'r9', employeeId: 'e5', allocationPercent: 40 })],
      TODAY,
    );
    expect(result).toEqual([
      {
        roleId: 'r9',
        headcount: 1,
        fillers: [{ employeeId: 'e5', allocationPercent: 40, assignmentId: 'a1' }],
      },
    ]);
  });

  it('excludes an expired assignment on an undeclared role', () => {
    const result = unrequestedRoles(
      'p1',
      [requirement({ id: 'q1', roleId: 'r1' })],
      [assignment({ id: 'a1', roleId: 'r9', endDate: '2026-05-31' })],
      TODAY,
    );
    expect(result).toEqual([]);
  });
});

describe('staffingStatusOf', () => {
  it('is NO_REQUIREMENTS_DECLARED when the project declares nothing', () => {
    expect(staffingStatusOf([], [])).toBe('NO_REQUIREMENTS_DECLARED');
  });

  it('is UNDERSTAFFED when any role is short', () => {
    const short = staffingForRequirement(requirement({ id: 'q1', headcount: 2 }), [], TODAY);
    expect(staffingStatusOf([short], [])).toBe('UNDERSTAFFED');
  });

  it('prefers UNDERSTAFFED over OVERSTAFFED when both are present', () => {
    const short = staffingForRequirement(requirement({ id: 'q1', headcount: 2 }), [], TODAY);
    const over = staffingForRequirement(
      requirement({ id: 'q2', roleId: 'r2', headcount: 1 }),
      [
        assignment({ id: 'a1', roleId: 'r2', employeeId: 'e1' }),
        assignment({ id: 'a2', roleId: 'r2', employeeId: 'e2' }),
      ],
      TODAY,
    );
    expect(staffingStatusOf([short, over], [])).toBe('UNDERSTAFFED');
  });

  it('is FULLY_STAFFED when every role is exactly met', () => {
    const met = staffingForRequirement(
      requirement({ id: 'q1', headcount: 1 }),
      [assignment({ id: 'a1' })],
      TODAY,
    );
    expect(staffingStatusOf([met], [])).toBe('FULLY_STAFFED');
  });

  it('is OVERSTAFFED when an undeclared role is being filled', () => {
    const met = staffingForRequirement(
      requirement({ id: 'q1', headcount: 1 }),
      [assignment({ id: 'a1' })],
      TODAY,
    );
    expect(staffingStatusOf([met], [{ roleId: 'r9', headcount: 1, fillers: [] }])).toBe(
      'OVERSTAFFED',
    );
  });
});

describe('staffingForProject', () => {
  it('sums the shortfall across roles and ignores other projects', () => {
    const result = staffingForProject(
      'p1',
      [
        requirement({ id: 'q1', roleId: 'r1', headcount: 2 }),
        requirement({ id: 'q2', roleId: 'r2', headcount: 3 }),
        requirement({ id: 'q3', projectId: 'p2', roleId: 'r1', headcount: 9 }),
      ],
      [assignment({ id: 'a1', roleId: 'r1' })],
      TODAY,
    );
    expect(result.requirements).toHaveLength(2);
    expect(result.totalShortfall).toBe(4);
    expect(result.staffingStatus).toBe('UNDERSTAFFED');
  });

  it('reports no requirements declared with assignments still present', () => {
    const result = staffingForProject('p1', [], [assignment({ id: 'a1' })], TODAY);
    expect(result.staffingStatus).toBe('NO_REQUIREMENTS_DECLARED');
    expect(result.unrequestedRoles).toHaveLength(1);
    expect(result.totalShortfall).toBe(0);
  });
});

describe('producesGaps', () => {
  it('is true for the two statuses that are still being worked', () => {
    expect(producesGaps('PLANNED')).toBe(true);
    expect(producesGaps('ACTIVE')).toBe(true);
  });

  it('is false for on hold, completed, and cancelled', () => {
    expect(producesGaps('ON_HOLD')).toBe(false);
    expect(producesGaps('COMPLETED')).toBe(false);
    expect(producesGaps('CANCELLED')).toBe(false);
  });
});
