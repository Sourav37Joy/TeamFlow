import { describe, expect, it } from 'vitest';
import {
  overallScoreOf,
  RatedEmployee,
  shortlist,
  skillComponentOf,
} from '../../src/backend/calc/candidates';
import { AssignmentRecord } from '../../src/backend/calc/utilization';

const TODAY = '2026-08-28';
const SKILL = 's1';

function person(id: string, name: string, rating: number | null, capacity = 100): RatedEmployee {
  return {
    id,
    name,
    totalCapacityPercent: capacity,
    skills: rating === null ? [] : [{ skillId: SKILL, rating }],
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

const query = { requiredSkillId: SKILL, projectId: 'p1', roleId: 'r1' };

describe('skillComponentOf', () => {
  it('maps the five ratings onto a 0 to 100 scale', () => {
    expect([1, 2, 3, 4, 5].map(skillComponentOf)).toEqual([20, 40, 60, 80, 100]);
  });
});

describe('overallScoreOf', () => {
  it('is the equally weighted average, rounded', () => {
    expect(overallScoreOf(80, 40)).toBe(60);
    expect(overallScoreOf(100, 100)).toBe(100);
  });

  it('rounds a half upwards so the arithmetic is reproducible', () => {
    expect(overallScoreOf(60, 55)).toBe(58);
    expect(overallScoreOf(20, 45)).toBe(33);
  });
});

describe('shortlist', () => {
  it('ranks equal skill by remaining capacity', () => {
    const result = shortlist(
      [person('e1', 'Ada', 4), person('e2', 'Ben', 4)],
      [assignment({ id: 'a1', employeeId: 'e2', projectId: 'p9', allocationPercent: 60 })],
      query,
      TODAY,
    );
    expect(result.candidates.map((candidate) => candidate.employeeId)).toEqual(['e1', 'e2']);
    expect(result.candidates[0]?.capacityComponent).toBe(100);
    expect(result.candidates[1]?.capacityComponent).toBe(40);
  });

  it('ranks equal capacity by skill', () => {
    const result = shortlist([person('e1', 'Ada', 2), person('e2', 'Ben', 5)], [], query, TODAY);
    expect(result.candidates.map((candidate) => candidate.employeeId)).toEqual(['e2', 'e1']);
  });

  it('shows both components and the score they produce', () => {
    const result = shortlist(
      [person('e1', 'Ada', 4)],
      [assignment({ id: 'a1', employeeId: 'e1', projectId: 'p9', allocationPercent: 30 })],
      query,
      TODAY,
    );
    expect(result.candidates[0]).toEqual({
      employeeId: 'e1',
      name: 'Ada',
      skillRating: 4,
      skillComponent: 80,
      capacityComponent: 70,
      overallScore: 75,
    });
  });

  it('excludes anyone already on that project in that role', () => {
    const result = shortlist(
      [person('e1', 'Ada', 4), person('e2', 'Ben', 4)],
      [assignment({ id: 'a1', employeeId: 'e1', projectId: 'p1', roleId: 'r1' })],
      query,
      TODAY,
    );
    expect(result.candidates.map((candidate) => candidate.employeeId)).toEqual(['e2']);
  });

  it('includes someone on that project in a different role', () => {
    const result = shortlist(
      [person('e1', 'Ada', 4)],
      [assignment({ id: 'a1', employeeId: 'e1', projectId: 'p1', roleId: 'r2' })],
      query,
      TODAY,
    );
    expect(result.candidates.map((candidate) => candidate.employeeId)).toEqual(['e1']);
  });

  it('includes someone whose assignment to that role has expired', () => {
    const result = shortlist(
      [person('e1', 'Ada', 4)],
      [assignment({ id: 'a1', employeeId: 'e1', endDate: '2026-05-31' })],
      query,
      TODAY,
    );
    expect(result.candidates.map((candidate) => candidate.employeeId)).toEqual(['e1']);
  });

  it('excludes the outgoing employee on a replacement', () => {
    const result = shortlist(
      [person('e1', 'Ada', 4), person('e2', 'Ben', 3)],
      [],
      { ...query, excludeEmployeeIds: ['e1'] },
      TODAY,
    );
    expect(result.candidates.map((candidate) => candidate.employeeId)).toEqual(['e2']);
  });

  it('excludes anyone with no remaining capacity', () => {
    const result = shortlist(
      [person('e1', 'Ada', 5)],
      [assignment({ id: 'a1', employeeId: 'e1', projectId: 'p9', allocationPercent: 100 })],
      query,
      TODAY,
    );
    expect(result.candidates).toEqual([]);
    expect(result.reason).toBe('NO_CANDIDATE_HAS_CAPACITY');
  });

  it('names the skill problem when nobody holds it', () => {
    const result = shortlist([person('e1', 'Ada', null)], [], query, TODAY);
    expect(result.candidates).toEqual([]);
    expect(result.reason).toBe('NO_EMPLOYEE_HOLDS_SKILL');
  });

  it('distinguishes nobody-holds-the-skill from everybody-is-busy', () => {
    const busy = shortlist(
      [person('e1', 'Ada', 3)],
      [assignment({ id: 'a1', employeeId: 'e1', projectId: 'p9', allocationPercent: 100 })],
      query,
      TODAY,
    );
    const unskilled = shortlist([person('e1', 'Ada', null)], [], query, TODAY);
    expect(busy.reason).not.toBe(unskilled.reason);
  });

  it('breaks an exact score tie by rating, then name, then id', () => {
    // Ada and Bea both score 60; Ada holds the higher rating so she leads.
    const result = shortlist(
      [person('e1', 'Ada', 4, 100), person('e2', 'Bea', 2, 100)],
      [
        assignment({ id: 'a1', employeeId: 'e1', projectId: 'p9', allocationPercent: 60 }),
        assignment({ id: 'a2', employeeId: 'e2', projectId: 'p9', allocationPercent: 20 }),
      ],
      query,
      TODAY,
    );
    expect(result.candidates.map((candidate) => candidate.overallScore)).toEqual([60, 60]);
    expect(result.candidates.map((candidate) => candidate.employeeId)).toEqual(['e1', 'e2']);
  });

  it('breaks a rating tie by name', () => {
    const result = shortlist([person('e2', 'Zara', 3), person('e1', 'Anna', 3)], [], query, TODAY);
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(['Anna', 'Zara']);
  });

  it('breaks a name tie by id, so identical people still order stably', () => {
    const result = shortlist([person('e2', 'Sam', 3), person('e1', 'Sam', 3)], [], query, TODAY);
    expect(result.candidates.map((candidate) => candidate.employeeId)).toEqual(['e1', 'e2']);
  });

  it('produces the same order every time for the same input', () => {
    const employees = [
      person('e3', 'Cara', 3),
      person('e1', 'Ada', 5),
      person('e2', 'Ben', 3),
      person('e4', 'Ada', 5),
    ];
    const first = shortlist(employees, [], query, TODAY);
    const second = shortlist(employees, [], query, TODAY);
    const third = shortlist([...employees].reverse(), [], query, TODAY);

    const order = (result: typeof first) => result.candidates.map((c) => c.employeeId);
    expect(order(second)).toEqual(order(first));
    expect(order(third)).toEqual(order(first));
  });

  it('does not mutate the array it was given', () => {
    const employees = [person('e2', 'Zara', 5), person('e1', 'Anna', 1)];
    const before = employees.map((employee) => employee.id);
    shortlist(employees, [], query, TODAY);
    expect(employees.map((employee) => employee.id)).toEqual(before);
  });
});
