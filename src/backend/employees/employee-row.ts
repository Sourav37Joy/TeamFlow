import { Employee } from '@prisma/client';

export interface EmployeeRow {
  id: string;
  name: string;
  roleTitle: string;
  totalCapacityPercent: number;
  skills: Array<{ skillId: string; skillName: string; rating: number }>;
}

// Ratings are embedded on the employee as skill ids; the catalogue name is resolved here so
// no screen has to hold a second lookup of its own.
export function employeeRow(employee: Employee, skillNames: Map<string, string>): EmployeeRow {
  return {
    id: employee.id,
    name: employee.name,
    roleTitle: employee.roleTitle,
    totalCapacityPercent: employee.totalCapacityPercent,
    skills: employee.skills
      .map((rated) => ({
        skillId: rated.skillId,
        skillName: skillNames.get(rated.skillId) ?? 'Unknown skill',
        rating: rated.rating,
      }))
      .sort((a, b) => a.skillName.localeCompare(b.skillName)),
  };
}
