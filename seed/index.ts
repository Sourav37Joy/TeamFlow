import { PrismaClient, ProjectStatus, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { formatCalendarDate, parseCalendarDate, todayIn } from '../src/backend/calc/dates';

const prisma = new PrismaClient();

const SKILLS = [
  'React',
  'Node.js',
  'TypeScript',
  'Test Automation',
  'UX Design',
  'Data Engineering',
  'Kubernetes',
];

const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'QA Engineer',
  'Designer',
  'Data Engineer',
  'Tech Lead',
];

const USERS = [
  { email: 'admin@example.com', displayName: 'Ada Admin', role: UserRole.ADMINISTRATOR },
  { email: 'pm@example.com', displayName: 'Pat Manager', role: UserRole.PROJECT_MANAGER },
];

interface EmployeeSeed {
  name: string;
  roleTitle: string;
  totalCapacityPercent?: number;
  skills: Array<[string, number]>;
}

const EMPLOYEES: EmployeeSeed[] = [
  {
    name: 'Amara Osei',
    roleTitle: 'Frontend Developer',
    skills: [
      ['React', 5],
      ['TypeScript', 4],
    ],
  },
  {
    name: 'Ben Carter',
    roleTitle: 'Backend Developer',
    skills: [
      ['Node.js', 4],
      ['Kubernetes', 3],
    ],
  },
  {
    name: 'Chen Wei',
    roleTitle: 'QA Engineer',
    skills: [
      ['Test Automation', 5],
      ['TypeScript', 3],
    ],
  },
  { name: 'Dara Novak', roleTitle: 'Designer', skills: [['UX Design', 4]] },
  {
    name: 'Elif Demir',
    roleTitle: 'Data Engineer',
    skills: [
      ['Data Engineering', 5],
      ['Node.js', 2],
    ],
  },
  {
    name: 'Farid Haddad',
    roleTitle: 'Tech Lead',
    skills: [
      ['Node.js', 5],
      ['React', 3],
      ['Kubernetes', 4],
    ],
  },
  {
    name: 'Grace Lin',
    roleTitle: 'Frontend Developer',
    skills: [
      ['React', 3],
      ['UX Design', 2],
    ],
  },
  {
    name: 'Hugo Alves',
    roleTitle: 'Backend Developer',
    skills: [
      ['Node.js', 3],
      ['TypeScript', 3],
    ],
  },
  { name: 'Ines Ruiz', roleTitle: 'QA Engineer', skills: [['Test Automation', 3]] },
];

// Every project status exists in the seeded data, so the status filter and the gap rules that
// exclude On hold, Completed, and Cancelled have something to act on (Constitution X, D-02).
const PROJECTS: Array<{
  name: string;
  status: ProjectStatus;
  requirements: Array<[string, string, number]>;
}> = [
  {
    name: 'Atlas Rollout',
    status: ProjectStatus.ACTIVE,
    requirements: [
      ['Frontend Developer', 'React', 2],
      ['QA Engineer', 'Test Automation', 1],
    ],
  },
  {
    name: 'Beacon Migration',
    status: ProjectStatus.ACTIVE,
    requirements: [
      ['Backend Developer', 'Node.js', 3],
      ['Data Engineer', 'Data Engineering', 1],
    ],
  },
  {
    name: 'Compass Redesign',
    status: ProjectStatus.PLANNED,
    requirements: [
      ['Designer', 'UX Design', 1],
      ['Frontend Developer', 'React', 1],
    ],
  },
  {
    name: 'Delta Reporting',
    status: ProjectStatus.ON_HOLD,
    requirements: [['Data Engineer', 'Data Engineering', 2]],
  },
  {
    name: 'Echo Launch',
    status: ProjectStatus.COMPLETED,
    requirements: [['Tech Lead', 'Node.js', 1]],
  },
  {
    name: 'Foxtrot Trial',
    status: ProjectStatus.CANCELLED,
    requirements: [['QA Engineer', 'Test Automation', 1]],
  },
];

// Dates are seeded relative to today, so "active now", "already ended", and "not yet started"
// stay true whenever the seed is run (Constitution X).
function shift(days: number): string {
  const date = parseCalendarDate(todayIn('UTC'));
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

// Each row is a state the tool must be able to show: overallocation, comfortable load, a
// commitment that has expired, one that has not begun, and a role the project never declared.
const ASSIGNMENTS: Array<{
  employee: string;
  project: string;
  role: string;
  percent: number;
  from: number;
  to: number;
}> = [
  {
    employee: 'Amara Osei',
    project: 'Atlas Rollout',
    role: 'Frontend Developer',
    percent: 60,
    from: -30,
    to: 90,
  },
  {
    employee: 'Amara Osei',
    project: 'Compass Redesign',
    role: 'Frontend Developer',
    percent: 60,
    from: -10,
    to: 120,
  },
  {
    employee: 'Chen Wei',
    project: 'Atlas Rollout',
    role: 'QA Engineer',
    percent: 40,
    from: -20,
    to: 60,
  },
  {
    employee: 'Ines Ruiz',
    project: 'Atlas Rollout',
    role: 'QA Engineer',
    percent: 30,
    from: -20,
    to: 60,
  },
  {
    employee: 'Ben Carter',
    project: 'Beacon Migration',
    role: 'Backend Developer',
    percent: 80,
    from: -45,
    to: 45,
  },
  {
    employee: 'Hugo Alves',
    project: 'Beacon Migration',
    role: 'Backend Developer',
    percent: 50,
    from: -5,
    to: 100,
  },
  {
    employee: 'Farid Haddad',
    project: 'Beacon Migration',
    role: 'Tech Lead',
    percent: 30,
    from: -15,
    to: 75,
  },
  {
    employee: 'Elif Demir',
    project: 'Delta Reporting',
    role: 'Data Engineer',
    percent: 50,
    from: -60,
    to: -10,
  },
  {
    employee: 'Dara Novak',
    project: 'Compass Redesign',
    role: 'Designer',
    percent: 50,
    from: 20,
    to: 140,
  },
  {
    employee: 'Farid Haddad',
    project: 'Atlas Rollout',
    role: 'Frontend Developer',
    percent: 60,
    from: -15,
    to: 75,
  },
];

// A handover that already happened, so replacement history is readable without performing one
// first (Constitution X, FR-051). Both halves are in the past, which keeps it out of today's
// utilization figures. The dates adjoin exactly: Chen ends the day before Ines begins (FR-046).
const COMPLETED_HANDOVER = {
  project: 'Echo Launch',
  role: 'QA Engineer',
  percent: 25,
  outgoing: { employee: 'Chen Wei', from: -120, to: -76 },
  incoming: { employee: 'Ines Ruiz', from: -75, to: -30 },
  effective: -75,
};

async function main() {
  const passwordHash = await argon2.hash('teamflow-dev');

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { displayName: user.displayName, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  for (const name of SKILLS) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const skillIds = new Map((await prisma.skill.findMany()).map((s) => [s.name, s.id]));
  const roleIds = new Map((await prisma.role.findMany()).map((r) => [r.name, r.id]));
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });

  // The demo register is replaced rather than added to, so the seed can be re-run and always
  // leaves the same populated state behind. Accounts and catalogues are kept.
  process.stdout.write('Replacing demo employees, projects, and assignments...\n');
  await prisma.replacement.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.roleRequirement.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.deleteMany();

  const employeeIds = new Map<string, string>();
  for (const seed of EMPLOYEES) {
    const created = await prisma.employee.create({
      data: {
        name: seed.name,
        roleTitle: seed.roleTitle,
        totalCapacityPercent: seed.totalCapacityPercent ?? 100,
        skills: {
          set: seed.skills.map(([skillName, rating]) => ({
            skillId: required(skillIds, skillName, 'skill'),
            rating,
          })),
        },
      },
    });
    employeeIds.set(seed.name, created.id);
  }

  const projectIds = new Map<string, string>();
  for (const seed of PROJECTS) {
    const created = await prisma.project.create({
      data: { name: seed.name, status: seed.status },
    });
    projectIds.set(seed.name, created.id);

    for (const [roleName, skillName, headcount] of seed.requirements) {
      await prisma.roleRequirement.create({
        data: {
          projectId: created.id,
          roleId: required(roleIds, roleName, 'role'),
          requiredSkillId: required(skillIds, skillName, 'skill'),
          headcount,
        },
      });
    }
  }

  for (const seed of ASSIGNMENTS) {
    await prisma.assignment.create({
      data: {
        employeeId: required(employeeIds, seed.employee, 'employee'),
        projectId: required(projectIds, seed.project, 'project'),
        roleId: required(roleIds, seed.role, 'role'),
        allocationPercent: seed.percent,
        startDate: shift(seed.from),
        endDate: shift(seed.to),
        createdByUserId: admin.id,
        updatedByUserId: admin.id,
      },
    });
  }

  const handover = COMPLETED_HANDOVER;
  const outgoing = await prisma.assignment.create({
    data: {
      employeeId: required(employeeIds, handover.outgoing.employee, 'employee'),
      projectId: required(projectIds, handover.project, 'project'),
      roleId: required(roleIds, handover.role, 'role'),
      allocationPercent: handover.percent,
      startDate: shift(handover.outgoing.from),
      endDate: shift(handover.outgoing.to),
      createdByUserId: admin.id,
      updatedByUserId: admin.id,
    },
  });

  const incoming = await prisma.assignment.create({
    data: {
      employeeId: required(employeeIds, handover.incoming.employee, 'employee'),
      projectId: required(projectIds, handover.project, 'project'),
      roleId: required(roleIds, handover.role, 'role'),
      allocationPercent: handover.percent,
      startDate: shift(handover.incoming.from),
      endDate: shift(handover.incoming.to),
      predecessorAssignmentId: outgoing.id,
      createdByUserId: admin.id,
      updatedByUserId: admin.id,
    },
  });

  await prisma.replacement.create({
    data: {
      outgoingAssignmentId: outgoing.id,
      incomingAssignmentId: incoming.id,
      outgoingEmployeeId: outgoing.employeeId,
      effectiveDate: shift(handover.effective),
      performedByUserId: admin.id,
    },
  });

  const counts = {
    users: await prisma.user.count(),
    skills: await prisma.skill.count(),
    roles: await prisma.role.count(),
    employees: await prisma.employee.count(),
    projects: await prisma.project.count(),
    requirements: await prisma.roleRequirement.count(),
    assignments: await prisma.assignment.count(),
    replacements: await prisma.replacement.count(),
  };

  process.stdout.write(`Seeded: ${JSON.stringify(counts)}\n`);
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
