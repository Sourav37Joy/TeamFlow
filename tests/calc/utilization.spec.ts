import { describe, expect, it } from 'vitest';
import {
  AssignmentRecord,
  EmployeeRecord,
  activeHeadcount,
  loadLabel,
  remainingCapacityPercent,
  utilizationFor,
  utilizationForAll,
  utilizationPercent,
  wouldOverallocate,
} from '../../src/backend/calc/utilization';

const TODAY = '2026-08-28';

const priya: EmployeeRecord = { id: 'e1', name: 'Priya', totalCapacityPercent: 100 };
const sam: EmployeeRecord = { id: 'e2', name: 'Sam', totalCapacityPercent: 100 };

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

describe('utilizationPercent', () => {
  it('is 0 with no assignments', () => {
    expect(utilizationPercent([], TODAY)).toBe(0);
  });

  it('is the allocation of a single active assignment', () => {
    expect(utilizationPercent([assignment({ id: 'a1', allocationPercent: 40 })], TODAY)).toBe(40);
  });

  it('sums overlapping assignments to 80', () => {
    const result = utilizationPercent(
      [
        assignment({ id: 'a1', allocationPercent: 50 }),
        assignment({ id: 'a2', allocationPercent: 30 }),
      ],
      TODAY,
    );
    expect(result).toBe(80);
  });

  it('sums past capacity rather than capping, so 60 plus 60 is 120', () => {
    const result = utilizationPercent(
      [
        assignment({ id: 'a1', allocationPercent: 60 }),
        assignment({ id: 'a2', allocationPercent: 60 }),
      ],
      TODAY,
    );
    expect(result).toBe(120);
  });

  it('excludes an assignment that has already ended', () => {
    const expired = assignment({ id: 'a1', startDate: '2026-01-01', endDate: '2026-07-31' });
    expect(utilizationPercent([expired], TODAY)).toBe(0);
  });

  it('excludes an assignment that has not started', () => {
    const future = assignment({ id: 'a1', startDate: '2026-10-01', endDate: '2026-12-31' });
    expect(utilizationPercent([future], TODAY)).toBe(0);
  });

  it('counts an assignment on its own final day', () => {
    const ending = assignment({ id: 'a1', startDate: '2026-01-01', endDate: TODAY });
    expect(utilizationPercent([ending], TODAY)).toBe(50);
  });
});

describe('remainingCapacityPercent', () => {
  it('is capacity minus utilization', () => {
    expect(remainingCapacityPercent(100, 80)).toBe(20);
  });

  it('floors at zero when overallocated', () => {
    expect(remainingCapacityPercent(100, 120)).toBe(0);
  });

  it('is the whole capacity when nothing is committed', () => {
    expect(remainingCapacityPercent(100, 0)).toBe(100);
  });
});

describe('loadLabel band boundaries', () => {
  const cases: Array<[number, string]> = [
    [0, 'UNASSIGNED'],
    [1, 'AVAILABLE'],
    [50, 'AVAILABLE'],
    [51, 'BALANCED'],
    [85, 'BALANCED'],
    [86, 'HIGH_LOAD'],
    [100, 'HIGH_LOAD'],
    [101, 'OVERALLOCATED'],
    [120, 'OVERALLOCATED'],
  ];

  for (const [percent, expected] of cases) {
    it(`${percent}% is ${expected}`, () => {
      expect(loadLabel(percent)).toBe(expected);
    });
  }
});

describe('utilizationFor', () => {
  it('returns 80, 20 remaining, and Balanced', () => {
    const result = utilizationFor(
      priya,
      [
        assignment({ id: 'a1', allocationPercent: 50 }),
        assignment({ id: 'a2', allocationPercent: 30 }),
      ],
      TODAY,
    );
    expect(result.utilizationPercent).toBe(80);
    expect(result.remainingCapacityPercent).toBe(20);
    expect(result.loadLabel).toBe('BALANCED');
  });

  it('returns 120, 0 remaining, and Overallocated', () => {
    const result = utilizationFor(
      priya,
      [
        assignment({ id: 'a1', allocationPercent: 60 }),
        assignment({ id: 'a2', allocationPercent: 60 }),
      ],
      TODAY,
    );
    expect(result.utilizationPercent).toBe(120);
    expect(result.remainingCapacityPercent).toBe(0);
    expect(result.loadLabel).toBe('OVERALLOCATED');
  });

  it('returns Unassigned with no assignments', () => {
    const result = utilizationFor(priya, [], TODAY);
    expect(result.utilizationPercent).toBe(0);
    expect(result.loadLabel).toBe('UNASSIGNED');
    expect(result.contributingAssignments).toEqual([]);
  });

  it('lists contributing assignments whose percentages sum to the total', () => {
    const result = utilizationFor(
      priya,
      [
        assignment({ id: 'a1', allocationPercent: 50 }),
        assignment({ id: 'a2', allocationPercent: 30 }),
        assignment({ id: 'a3', allocationPercent: 20, endDate: '2026-07-31' }),
      ],
      TODAY,
    );
    expect(result.contributingAssignments.map((a) => a.id)).toEqual(['a1', 'a2']);
    const summed = result.contributingAssignments.reduce((s, a) => s + a.allocationPercent, 0);
    expect(summed).toBe(result.utilizationPercent);
  });

  it('ignores assignments belonging to somebody else', () => {
    const result = utilizationFor(
      priya,
      [assignment({ id: 'a1', employeeId: 'e2', allocationPercent: 90 })],
      TODAY,
    );
    expect(result.utilizationPercent).toBe(0);
  });
});

describe('utilizationForAll', () => {
  it('gives every employee a row, including those with nothing', () => {
    const rows = utilizationForAll(
      [priya, sam],
      [assignment({ id: 'a1', employeeId: 'e1', allocationPercent: 70 })],
      TODAY,
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.employeeId === 'e1')?.utilizationPercent).toBe(70);
    expect(rows.find((r) => r.employeeId === 'e2')?.loadLabel).toBe('UNASSIGNED');
  });
});

describe('wouldOverallocate', () => {
  it('reports no overallocation when the total fits', () => {
    const result = wouldOverallocate(priya, [assignment({ id: 'a1', allocationPercent: 40 })], {
      allocationPercent: 50,
      startDate: '2026-06-01',
      endDate: '2026-09-30',
    });
    expect(result.overallocated).toBe(false);
    expect(result.resultingPercent).toBe(90);
  });

  it('reports the resulting total and the date when it would exceed capacity', () => {
    const result = wouldOverallocate(priya, [assignment({ id: 'a1', allocationPercent: 80 })], {
      allocationPercent: 50,
      startDate: '2026-06-01',
      endDate: '2026-09-30',
    });
    expect(result.overallocated).toBe(true);
    expect(result.resultingPercent).toBe(130);
    expect(result.onDate).toBe('2026-06-01');
  });

  it('ignores an assignment that does not overlap the incoming range', () => {
    const result = wouldOverallocate(
      priya,
      [assignment({ id: 'a1', allocationPercent: 80, endDate: '2026-05-31' })],
      { allocationPercent: 50, startDate: '2026-06-01', endDate: '2026-09-30' },
    );
    expect(result.overallocated).toBe(false);
    expect(result.resultingPercent).toBe(50);
  });

  it('excludes the assignment being edited from its own check', () => {
    const result = wouldOverallocate(
      priya,
      [assignment({ id: 'a1', allocationPercent: 80 })],
      { allocationPercent: 90, startDate: '2026-06-01', endDate: '2026-09-30' },
      'a1',
    );
    expect(result.overallocated).toBe(false);
    expect(result.resultingPercent).toBe(90);
  });
});

describe('activeHeadcount', () => {
  it('is 0 when nothing is active on the date', () => {
    expect(activeHeadcount([assignment({ id: 'a1', endDate: '2026-05-31' })], TODAY)).toBe(0);
  });

  it('counts one person once even when they hold two roles', () => {
    const result = activeHeadcount(
      [
        assignment({ id: 'a1', employeeId: 'e1', roleId: 'r1' }),
        assignment({ id: 'a2', employeeId: 'e1', roleId: 'r2' }),
      ],
      TODAY,
    );
    expect(result).toBe(1);
  });

  it('counts distinct people', () => {
    const result = activeHeadcount(
      [
        assignment({ id: 'a1', employeeId: 'e1' }),
        assignment({ id: 'a2', employeeId: 'e2' }),
        assignment({ id: 'a3', employeeId: 'e3' }),
      ],
      TODAY,
    );
    expect(result).toBe(3);
  });

  it('excludes a person whose assignment has expired', () => {
    const result = activeHeadcount(
      [
        assignment({ id: 'a1', employeeId: 'e1' }),
        assignment({ id: 'a2', employeeId: 'e2', endDate: '2026-05-31' }),
      ],
      TODAY,
    );
    expect(result).toBe(1);
  });
});
