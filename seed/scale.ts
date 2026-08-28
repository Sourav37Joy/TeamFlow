import { PrismaClient, ProjectStatus, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { formatCalendarDate, parseCalendarDate, todayIn } from '../src/backend/calc/dates';

const prisma = new PrismaClient();

const EMPLOYEE_COUNT = 500;
const PROJECT_COUNT = 100;
const ASSIGNMENT_COUNT = 2000;

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

const STATUSES = [
  ProjectStatus.PLANNED,
  ProjectStatus.ACTIVE,
  ProjectStatus.ACTIVE,
  ProjectStatus.ON_HOLD,
  ProjectStatus.COMPLETED,
  ProjectStatus.CANCELLED,
];

const FIRST = [
  'Ada',
  'Ben',
  'Chen',
  'Dara',
  'Elif',
  'Farid',
  'Grace',
  'Hugo',
  'Ines',
  'Jonas',
  'Kira',
  'Liam',
  'Mira',
  'Noor',
  'Omar',
  'Petra',
  'Quinn',
  'Rosa',
  'Sami',
  'Tara',
];

const LAST = [
  'Osei',
  'Carter',
  'Wei',
  'Novak',
  'Demir',
  'Haddad',
  'Lin',
  'Alves',
  'Ruiz',
  'Berg',
  'Costa',
  'Dubois',
  'Egan',
  'Fischer',
  'Gupta',
  'Hansen',
  'Ibrahim',
  'Jensen',
  'Kaur',
  'Larsen',
];

// A fixed sequence, not real randomness, so the numbers this seed produces are the same on
// every run and a slow query can be compared against the same shape of data twice.
function sequence(seed: number) {
  let state = seed;
  return (bound: number) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % bound;
  };
}

function shift(days: number): string {
  const date = parseCalendarDate(todayIn('UTC'));
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

async function main() {
  const started = Date.now();
  const next = sequence(20260828);

  const passwordHash = await argon2.hash('teamflow-dev');
  for (const user of [
    { email: 'admin@example.com', displayName: 'Ada Admin', role: UserRole.ADMINISTRATOR },
    { email: 'pm@example.com', displayName: 'Pat Manager', role: UserRole.PROJECT_MANAGER },
  ]) {
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

  const skills = await prisma.skill.findMany();
  const roles = await prisma.role.findMany();
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });

  process.stdout.write('Replacing all demo data with a scale load...\n');
  await prisma.replacement.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.roleRequirement.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.deleteMany();

  await prisma.employee.createMany({
    data: Array.from({ length: EMPLOYEE_COUNT }, (_unused, index) => {
      const rated = 1 + next(3);
      const held = new Set<number>();
      while (held.size < rated) held.add(next(skills.length));
      return {
        name: `${FIRST[index % FIRST.length]} ${LAST[(index * 7) % LAST.length]} ${index + 1}`,
        roleTitle: ROLES[index % ROLES.length] as string,
        totalCapacityPercent: 100,
        skills: [...held].map((position) => ({
          skillId: (skills[position] as { id: string }).id,
          rating: 1 + next(5),
        })),
      };
    }),
  });

  await prisma.project.createMany({
    data: Array.from({ length: PROJECT_COUNT }, (_unused, index) => ({
      name: `Programme ${String(index + 1).padStart(3, '0')}`,
      status: STATUSES[index % STATUSES.length] as ProjectStatus,
    })),
  });

  const employees = await prisma.employee.findMany({ select: { id: true } });
  const projects = await prisma.project.findMany({ select: { id: true } });

  const requirements: Array<{
    projectId: string;
    roleId: string;
    requiredSkillId: string;
    headcount: number;
  }> = [];
  for (const project of projects) {
    const declared = new Set<number>();
    const count = 1 + next(3);
    while (declared.size < count) declared.add(next(roles.length));
    for (const position of declared) {
      requirements.push({
        projectId: project.id,
        roleId: (roles[position] as { id: string }).id,
        requiredSkillId: (skills[next(skills.length)] as { id: string }).id,
        headcount: 1 + next(4),
      });
    }
  }
  await prisma.roleRequirement.createMany({ data: requirements });

  // The same employee, project, and role may not appear twice, exactly as the real create
  // endpoint enforces (FR-022), so the load is a register the application could have produced.
  const seen = new Set<string>();
  const assignments: Array<{
    employeeId: string;
    projectId: string;
    roleId: string;
    allocationPercent: number;
    startDate: string;
    endDate: string;
    createdByUserId: string;
    updatedByUserId: string;
  }> = [];

  while (assignments.length < ASSIGNMENT_COUNT) {
    const employee = employees[next(employees.length)] as { id: string };
    const project = projects[next(projects.length)] as { id: string };
    const role = roles[next(roles.length)] as { id: string };
    const key = `${employee.id}:${project.id}:${role.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const from = next(240) - 120;
    assignments.push({
      employeeId: employee.id,
      projectId: project.id,
      roleId: role.id,
      allocationPercent: 10 + next(9) * 10,
      startDate: shift(from),
      endDate: shift(from + 30 + next(180)),
      createdByUserId: admin.id,
      updatedByUserId: admin.id,
    });
  }
  await prisma.assignment.createMany({ data: assignments });

  const counts = {
    employees: await prisma.employee.count(),
    projects: await prisma.project.count(),
    requirements: await prisma.roleRequirement.count(),
    assignments: await prisma.assignment.count(),
  };

  process.stdout.write(`Scale seed: ${JSON.stringify(counts)}\n`);
  process.stdout.write(`Written in ${Date.now() - started}ms\n`);
  process.stdout.write(
    'Now time the two heaviest reads against a running server (SC-017, under two seconds):\n' +
      '  curl -s -o NUL -w "%{time_total}s\\n" --cookie jar http://localhost:3000/api/dashboard\n' +
      '  curl -s -o NUL -w "%{time_total}s\\n" --cookie jar http://localhost:3000/api/allocation-overview\n' +
      'Run npm run seed afterwards to get the readable demo organisation back.\n',
  );
}

main()
  .catch((error) => {
    process.stderr.write(`Scale seed failed: ${String(error)}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
