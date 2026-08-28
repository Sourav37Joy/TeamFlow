import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

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

  const counts = {
    users: await prisma.user.count(),
    skills: await prisma.skill.count(),
    roles: await prisma.role.count(),
    employees: await prisma.employee.count(),
    projects: await prisma.project.count(),
    assignments: await prisma.assignment.count(),
  };

  process.stdout.write(`Seeded: ${JSON.stringify(counts)}\n`);
  process.stdout.write('Sign in as admin@example.com or pm@example.com, password teamflow-dev\n');
}

main()
  .catch((error) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
