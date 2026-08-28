import { RoleRequirement } from '@prisma/client';
import { nameIndex, unique } from '../common/fields';
import { PrismaService } from '../prisma.service';

export interface RequirementRow {
  id: string;
  projectId: string;
  roleId: string;
  roleName: string;
  requiredSkillId: string;
  requiredSkillName: string;
  headcount: number;
}

const UNKNOWN = 'Unknown';

// A requirement is stored as two catalogue ids and a headcount. The names are resolved in
// one fetch per catalogue rather than per row (D-11).
export async function requirementRows(
  prisma: PrismaService,
  requirements: RoleRequirement[],
): Promise<RequirementRow[]> {
  if (requirements.length === 0) return [];

  const [roles, skills] = await Promise.all([
    prisma.role.findMany({
      where: { id: { in: unique(requirements.map((requirement) => requirement.roleId)) } },
      select: { id: true, name: true },
    }),
    prisma.skill.findMany({
      where: {
        id: { in: unique(requirements.map((requirement) => requirement.requiredSkillId)) },
      },
      select: { id: true, name: true },
    }),
  ]);

  const roleNames = nameIndex(roles);
  const skillNames = nameIndex(skills);

  return requirements
    .map((requirement) => ({
      id: requirement.id,
      projectId: requirement.projectId,
      roleId: requirement.roleId,
      roleName: roleNames.get(requirement.roleId) ?? UNKNOWN,
      requiredSkillId: requirement.requiredSkillId,
      requiredSkillName: skillNames.get(requirement.requiredSkillId) ?? UNKNOWN,
      headcount: requirement.headcount,
    }))
    .sort((a, b) => a.roleName.localeCompare(b.roleName));
}
