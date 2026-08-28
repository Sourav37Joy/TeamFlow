import { PrismaClient, ProjectStatus, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { formatCalendarDate, parseCalendarDate, todayIn } from '../src/backend/calc/dates';
import { PEOPLE, TEAM_PROJECTS } from './team-data';

const prisma = new PrismaClient();

const USERS = [
  { email: 'admin@example.com', displayName: 'Ada Admin', role: UserRole.ADMINISTRATOR },
  { email: 'pm@example.com', displayName: 'Pat Manager', role: UserRole.PROJECT_MANAGER },
];

// How much of somebody's week is committed in total. Their time is then divided evenly across
// the teams they belong to. The export carries no allocation data at all, so these are the one
// invented figure in the seed, chosen to put every load band on the screen: three people over
// capacity, three comfortable, three lightly committed, and everybody else fully committed.
const TOTAL_COMMITMENT = 100;
const OVERLOADED = new Map([
  ['rubel', 120],
  ['mahfuzul', 120],
  ['shams', 120],
]);
const PART_TIME = new Map([
  ['odree', 60],
  ['reza', 60],
  ['joy', 60],
]);
const LIGHTLY_COMMITTED = new Map([
  ['lushan', 40],
  ['saqlain', 40],
  ['shohag', 40],
]);

// Two commitments deliberately sit outside today: one finished last month and one starts next
// month. Both people therefore read as unassigned today while staying on their team's record,
// and both teams show a real shortfall for the gaps panel to chase (FR-035, FR-075).
const ENDED_LAST_MONTH = new Set(['ibnul']);
const STARTS_NEXT_MONTH = new Set(['raiyan']);

function shift(days: number): string {
  const date = parseCalendarDate(todayIn('UTC'));
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

function commitmentOf(slug: string): number {
  return (
    OVERLOADED.get(slug) ?? PART_TIME.get(slug) ?? LIGHTLY_COMMITTED.get(slug) ?? TOTAL_COMMITMENT
  );
}

// An even division that still adds up: the remainder goes to the first few teams rather than
// being lost to rounding, so three teams on a full week read 34, 33, 33.
function evenSplit(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_unused, index) => base + (index < remainder ? 1 : 0));
}

function windowFor(slug: string): { startDate: string; endDate: string } {
  if (ENDED_LAST_MONTH.has(slug)) return { startDate: shift(-90), endDate: shift(-20) };
  if (STARTS_NEXT_MONTH.has(slug)) return { startDate: shift(20), endDate: shift(180) };
  return { startDate: shift(-60), endDate: shift(120) };
}

async function main() {
  const passwordHash = await argon2.hash('teamflow-dev');
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { displayName: user.displayName, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  const skillNames = [...new Set(TEAM_PROJECTS.map((project) => project.skill))].sort();
  const roleNames = [
    ...new Set(TEAM_PROJECTS.flatMap((project) => project.members.map((member) => member.role))),
  ].sort();

  for (const name of skillNames) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of roleNames) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const skillIds = new Map((await prisma.skill.findMany()).map((s) => [s.name, s.id]));
  const roleIds = new Map((await prisma.role.findMany()).map((r) => [r.name, r.id]));
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });

  process.stdout.write('Replacing employees, projects, and assignments with the team export...\n');
  await prisma.replacement.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.roleRequirement.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.deleteMany();

  // Nothing references a skill or a role once the register above is gone, so any catalogue entry
  // the export does not name is a leftover from an earlier seed and goes with it.
  const staleSkills = await prisma.skill.deleteMany({ where: { name: { notIn: skillNames } } });
  const staleRoles = await prisma.role.deleteMany({ where: { name: { notIn: roleNames } } });
  if (staleSkills.count + staleRoles.count > 0) {
    process.stdout.write(
      `Removed ${staleSkills.count} skill and ${staleRoles.count} role entries the export does not name.\n`,
    );
  }

  // Somebody holds the skill of every team they are on, at 3 out of 5. The export states no
  // proficiency, and inventing differences between named colleagues would be fabricating it.
  const teamsOf = (slug: string) =>
    TEAM_PROJECTS.filter((project) => project.members.some((member) => member.slug === slug));

  const employeeIds = new Map<string, string>();
  for (const person of PEOPLE) {
    const held = [...new Set(teamsOf(person.slug).map((project) => project.skill))].sort();
    const created = await prisma.employee.create({
      data: {
        name: person.name,
        roleTitle: person.roleTitle,
        totalCapacityPercent: 100,
        avatarUrl: person.avatarUrl,
        skills: {
          set: held.map((skill) => ({ skillId: required(skillIds, skill, 'skill'), rating: 3 })),
        },
      },
    });
    employeeIds.set(person.slug, created.id);
  }

  const projectIds = new Map<string, string>();
  for (const project of TEAM_PROJECTS) {
    const created = await prisma.project.create({
      data: { name: project.name, status: project.status as ProjectStatus },
    });
    projectIds.set(project.name, created.id);

    // A team requires exactly the roles its people actually fill, at the headcount that fills
    // them, so the export describes a fully staffed organisation rather than an arbitrary one.
    const headcounts = new Map<string, number>();
    for (const member of project.members) {
      headcounts.set(member.role, (headcounts.get(member.role) ?? 0) + 1);
    }
    for (const [role, headcount] of [...headcounts].sort()) {
      await prisma.roleRequirement.create({
        data: {
          projectId: created.id,
          roleId: required(roleIds, role, 'role'),
          requiredSkillId: required(skillIds, project.skill, 'skill'),
          headcount,
        },
      });
    }
  }

  for (const person of PEOPLE) {
    const teams = teamsOf(person.slug);
    if (teams.length === 0) continue;

    const shares = evenSplit(commitmentOf(person.slug), teams.length);
    const dates = windowFor(person.slug);

    for (const [index, project] of teams.entries()) {
      const member = project.members.find((entry) => entry.slug === person.slug);
      await prisma.assignment.create({
        data: {
          employeeId: required(employeeIds, person.slug, 'employee'),
          projectId: required(projectIds, project.name, 'project'),
          roleId: required(roleIds, member?.role ?? project.role, 'role'),
          allocationPercent: shares[index] as number,
          startDate: dates.startDate,
          endDate: dates.endDate,
          createdByUserId: admin.id,
          updatedByUserId: admin.id,
        },
      });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    skills: await prisma.skill.count(),
    roles: await prisma.role.count(),
    employees: await prisma.employee.count(),
    projects: await prisma.project.count(),
    requirements: await prisma.roleRequirement.count(),
    assignments: await prisma.assignment.count(),
  };

  const withoutPortrait = PEOPLE.filter((person) => person.avatarUrl === null).map((p) => p.name);

  process.stdout.write(`Seeded: ${JSON.stringify(counts)}\n`);
  if (withoutPortrait.length > 0) {
    process.stdout.write(`No portrait, shown as initials: ${withoutPortrait.join(', ')}\n`);
  }
  process.stdout.write('Sign in as admin@example.com or pm@example.com, password teamflow-dev\n');
}

function required(index: Map<string, string>, name: string, kind: string): string {
  const id = index.get(name);
  if (!id) throw new Error(`Seed refers to a ${kind} that does not exist: ${name}`);
  return id;
}

main()
  .catch((error) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
