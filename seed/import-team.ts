// Turns the "Team Members Profiles" export into the two things the seed needs: square avatars
// under src/web/public/avatars, and seed/team-data.ts. Run it again if the export changes:
//
//   npm run seed:import -- "C:/path/to/Team Members Profiles"
//
// The seed itself never reads the export, so a checkout without it still seeds.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SOURCE = process.argv[2];
const AVATAR_DIR = 'src/web/public/avatars';
const DATA_FILE = 'seed/team-data.ts';
const AVATAR_SIZE = 256;

if (!SOURCE) {
  process.stderr.write('Usage: npm run seed:import -- "<path to Team Members Profiles>"\n');
  process.exit(1);
}

// Identity, established by comparing the photographs rather than trusting the names. "Rezwan"
// in the Tech Vanguard folder is the same photograph as "Rezwanul Huda" in Management, one bit
// apart on an 8x8 average hash. "Tonmoy" is two different people: the IQVIA PH and Tech
// Committee photographs are byte-identical and the Playaz4Playaz one is somebody else, 22 bits
// away. Every other repeated name is one person cropped differently.
const RENAME = new Map([['Rezwan', 'Rezwanul Huda']]);
const SPLIT = new Map([['07|Tonmoy', 'Tonmoy (Playaz4Playaz)']]);
const DISAMBIGUATE = new Map([['Tonmoy', 'Tonmoy (IQVIA)']]);

// The Minsk file is a photograph of five people in a restaurant, not a portrait, and which of
// them is Eduard is not knowable from the export. Putting a colleague's face on his record would
// be worse than showing his initials, so he gets none until somebody says which person he is.
const NO_PORTRAIT = new Set(['Eduard']);

// Every other source is a portrait with the head high in the frame, so the square is taken from
// the top. The one landscape photograph has its subject on the left.
const CROP = new Map<string, 'top' | 'left top'>([['mahfuzul', 'left top']]);

interface Team {
  project: string;
  status: 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  role: string;
  skill: string;
}

// A project needs a role its people fill and a skill that role depends on. The export states a
// role for seven people and no skills at all, so the rest is derived from what each team does.
// Every team is Active: the export gives no lifecycle information, and guessing one would put
// words in the organisation's mouth.
const TEAMS: Record<string, Team> = {
  '02': { project: 'Management', status: 'ACTIVE', role: 'Executive', skill: 'Leadership' },
  '03': {
    project: 'IQVIA AppDevOps @ Agentic AI',
    status: 'ACTIVE',
    role: 'AppDevOps Engineer',
    skill: 'Agentic AI',
  },
  '04': {
    project: 'SRE (IQVIA)',
    status: 'ACTIVE',
    role: 'Site Reliability Engineer',
    skill: 'Site Reliability',
  },
  '05': { project: 'KPI (IQVIA)', status: 'ACTIVE', role: 'KPI Analyst', skill: 'Reporting' },
  '06': {
    project: 'IQVIA PH',
    status: 'ACTIVE',
    role: 'Software Engineer',
    skill: 'Application Development',
  },
  '07': {
    project: 'Playaz4Playaz',
    status: 'ACTIVE',
    role: 'Software Engineer',
    skill: 'Application Development',
  },
  '08': {
    project: 'Ajentica Panopto',
    status: 'ACTIVE',
    role: 'Software Engineer',
    skill: 'Panopto Platform',
  },
  '09': {
    project: 'Ajentica Lumistry',
    status: 'ACTIVE',
    role: 'Software Engineer',
    skill: 'Lumistry Platform',
  },
  '10': {
    project: 'Data Warehouse',
    status: 'ACTIVE',
    role: 'Data Engineer',
    skill: 'Data Warehousing',
  },
  '11': {
    project: 'People & Culture',
    status: 'ACTIVE',
    role: 'People & Culture Specialist',
    skill: 'People Operations',
  },
  '12': { project: 'Accounts', status: 'ACTIVE', role: 'Accountant', skill: 'Accounting' },
  '13': {
    project: 'Office Administration',
    status: 'ACTIVE',
    role: 'Office Administrator',
    skill: 'Office Administration',
  },
  '14': {
    project: 'Minsk Team Member',
    status: 'ACTIVE',
    role: 'Software Engineer',
    skill: 'Application Development',
  },
  '15': {
    project: 'Committees - Tech Vanguard',
    status: 'ACTIVE',
    role: 'Committee Member',
    skill: 'Technical Governance',
  },
  '16': {
    project: 'Committees - Tech Committee',
    status: 'ACTIVE',
    role: 'Committee Member',
    skill: 'Technical Governance',
  },
};

interface Membership {
  folder: string;
  role: string;
}

interface Person {
  name: string;
  slug: string;
  titles: string[];
  photos: Array<{ file: string; pixels: number }>;
  memberships: Membership[];
  roleTitle: string;
  avatarUrl: string | null;
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function parseCsv(text: string): Array<Record<string, string>> {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = (header as string).split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    columns.forEach((column, index) => {
      row[column] = (cells[index] ?? '').trim();
    });
    return row;
  });
}

async function main() {
  const rows = parseCsv(readFileSync(join(SOURCE as string, 'team-members.csv'), 'utf8'));
  const people = new Map<string, Person>();

  for (const row of rows) {
    const folder = (row.File as string).slice(0, 2);
    const team = TEAMS[folder];
    if (!team) throw new Error(`No team mapping for folder ${folder}`);

    const raw = row.Name as string;
    const key = SPLIT.get(`${folder}|${raw}`) ?? DISAMBIGUATE.get(raw) ?? RENAME.get(raw) ?? raw;
    const [width, height] = (row['Image Size'] as string).split('x').map(Number);

    const person: Person = people.get(key) ?? {
      name: key,
      slug: slug(key),
      titles: [],
      photos: [],
      memberships: [],
      roleTitle: '',
      avatarUrl: null,
    };
    if (row.Role) person.titles.push(row.Role);
    person.photos.push({
      file: row.File as string,
      pixels: (width as number) * (height as number),
    });
    person.memberships.push({ folder, role: row.Role || team.role });
    people.set(key, person);
  }

  // The clearest photograph of each person wins; the committee folders hold smaller crops of the
  // same shot.
  for (const person of people.values()) {
    person.photos.sort((a, b) => b.pixels - a.pixels);
    const first = person.memberships[0] as Membership;
    person.roleTitle = person.titles[0] ?? (TEAMS[first.folder] as Team).role;
  }

  mkdirSync(AVATAR_DIR, { recursive: true });

  let bytes = 0;
  const written = new Set<string>();
  for (const person of people.values()) {
    if (NO_PORTRAIT.has(person.name)) continue;
    const photo = person.photos[0] as { file: string };
    const file = `${person.slug}.jpg`;
    const info = await sharp(join(SOURCE as string, photo.file))
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: CROP.get(person.slug) ?? 'top' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(join(AVATAR_DIR, file));
    bytes += info.size;
    written.add(file);
    person.avatarUrl = `/avatars/${file}`;
  }

  // Individual files, never the whole directory: removing a watched folder out from under a
  // running `npm run dev` makes the Next.js dev server lose its routes until it is restarted.
  let removed = 0;
  for (const existing of readdirSync(AVATAR_DIR)) {
    if (!written.has(existing)) {
      rmSync(join(AVATAR_DIR, existing));
      removed += 1;
    }
  }

  const ordered = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  const projects = Object.entries(TEAMS).map(([folder, team]) => ({
    name: team.project,
    status: team.status,
    role: team.role,
    skill: team.skill,
    members: ordered
      .filter((person) => person.memberships.some((m) => m.folder === folder))
      .map((person) => ({
        slug: person.slug,
        role: (person.memberships.find((m) => m.folder === folder) as Membership).role,
      })),
  }));

  const contents = `// GENERATED by seed/import-team.ts - do not edit by hand.
// ${ordered.length} people across ${projects.length} teams, from ${rows.length} photographs.
//
// Identity was resolved by comparing the photographs, not the names. Every repeated name is one
// person photographed once and cropped differently, with two exceptions: "Rezwan" in Tech
// Vanguard is "Rezwanul Huda" from Management, and "Tonmoy" is two different people, told apart
// here as "Tonmoy (IQVIA)" and "Tonmoy (Playaz4Playaz)".
//
// Role titles come from the export where it states one, and otherwise from the team. Skills are
// one per team, held at 3 out of 5 by its members: the export carries no proficiency data, and
// inventing differences between named colleagues would be fabricating it.

export interface TeamPerson {
  name: string;
  slug: string;
  roleTitle: string;
  avatarUrl: string | null;
}

export interface TeamProject {
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  role: string;
  skill: string;
  members: Array<{ slug: string; role: string }>;
}

export const PEOPLE: TeamPerson[] = ${JSON.stringify(
    ordered.map((person) => ({
      name: person.name,
      slug: person.slug,
      roleTitle: person.roleTitle,
      avatarUrl: person.avatarUrl,
    })),
    null,
    2,
  )};

export const TEAM_PROJECTS: TeamProject[] = ${JSON.stringify(projects, null, 2)};
`;

  writeFileSync(DATA_FILE, contents);

  const withoutPortrait = ordered.filter((person) => person.avatarUrl === null).map((p) => p.name);
  process.stdout.write(
    `Imported ${ordered.length} people and ${projects.length} teams from ${rows.length} photographs.\n`,
  );
  process.stdout.write(
    `Avatars: ${ordered.length - withoutPortrait.length} files, ${Math.round(bytes / 1024)}kb${
      removed > 0 ? `, ${removed} stale removed` : ''
    }.\n`,
  );
  if (withoutPortrait.length > 0) {
    process.stdout.write(`No usable portrait: ${withoutPortrait.join(', ')}\n`);
  }
  process.stdout.write(`Wrote ${DATA_FILE}. Run npm run seed to load it.\n`);
}

main().catch((error) => {
  process.stderr.write(`Import failed: ${String(error)}\n`);
  process.exit(1);
});
