# Quickstart and Validation Guide: TeamFlow Resource Planning

**Feature**: `001-workforce-allocation` | **Revision**: 2 | **Date**: 2026-08-28

One deployable, one database, one command to run it (Constitution VII). Data shapes are in [data-model.md](./data-model.md); endpoints in [contracts/api.md](./contracts/api.md); error and warning behaviour in [contracts/errors.md](./contracts/errors.md).

## Prerequisites

- Node.js 22 or later
- Docker, for MongoDB

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d           # MongoDB 7, replica set rs0, on port 27018
npm run db:push                # applies the schema and its indexes
npm run seed                   # the imported organisation
```

**`npm run seed` is re-runnable and replaces the register.** It deletes every employee, project, role requirement, and assignment, then rewrites them from `seed/team-data.ts`, so the same populated state is always what you get. Catalogue entries the team data does not name are removed with it; the two sign-in accounts are kept. Anything you created yourself while exploring goes too - re-run it deliberately, not out of habit.

**The seed is the real organisation**, imported from the "Team Members Profiles" export: 42 people across 15 teams, from 55 photographs. `seed/team-data.ts` and the avatars under `src/web/public/avatars` are generated, not hand-written:

```bash
npm run seed:import -- "C:/path/to/Team Members Profiles"
```

Nothing outside the repository is needed to seed - only to re-import. Restart `npm run dev` after an import, because the avatar files live inside the tree the Next.js dev server watches.

**Port 27018, not 27017.** A locally installed MongoDB service often already owns 27017 as a standalone, and Prisma needs a replica set for `$transaction`, which the replacement handover depends on. Pointing at a standalone fails with `replicaSet name "rs0" does not match actual name <none>`.

**Without Docker**, if MongoDB is installed locally, run a second instance as a replica set and leave the existing service alone:

```bash
mongod --dbpath .mongo-data --port 27018 --replSet rs0 --bind_ip 127.0.0.1
mongosh --port 27018 --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27018'}]})"
```

See [DEVELOPMENT.md](../../DEVELOPMENT.md) for the two toolchain constraints this build depends on.

## Run

```bash
npm run dev      # one process: API on /api, UI on everything else, http://localhost:3000
```

## Test

```bash
npm test         # Vitest over src/backend/calc
```

Per the constitution's testing policy, automated tests cover the shared calculation module, since that is where correctness actually matters. CRUD, forms, and views are verified by walking the application - the scenarios below are that walkthrough, not an automated suite.

## Validation walkthrough

Seven checks, one per story in scope. Each is independently checkable and the seed supports all of them.

### V1 - Projects, people, and assignments (US1)

1. Sign in as the Administrator. Create a project requiring 2 Software Engineers (skill Application Development) and 1 Site Reliability Engineer (skill Site Reliability).
2. Create an employee with two rated skills, say Application Development 4 and Agentic AI 3. Add a skill that is not in the catalogue while you are there - it should appear and be selected, not blocked (FR-083).
3. From the project, fill the Software Engineer gap - confirm the role arrives pre-filled and the assignment shows on both the project and the employee.
4. Create a second assignment from the employee's record instead; confirm it appears identically on the project.
5. Try an end date before the start date, then an allocation of 0 - both refused, naming the field and its permitted range, nothing stored.
6. Sign in as the Project Manager and try to create an employee - refused, naming the action and that Administrator is required (FR-085).

### V2 - Who is assigned where (US2)

1. Open the allocation overview. Every active assignment appears once with person, project, role, percentage, and dates.
2. Group by person, then by project - confirm per-person totals and per-project headcount.
3. Search a skill name - the list narrows to people holding it.
4. Move the evaluation date three months out - assignments that will have ended drop off.
5. Set the date before any assignment began - an explicit empty state naming that date, not a blank list.

### V3 - Utilization and load labels (US3)

1. A person with 50% and 30% concurrently reads 80%, 20% remaining, `Balanced`.
2. A person with 60% and 60% reads 120%, 0% remaining, `Overallocated`, with a visible warning.
3. Someone with no assignments reads 0% and `Unassigned`.
4. An assignment that ended last month is excluded from today's total but still listed with its dates.
5. A future assignment is excluded from today's total and still listed.
6. The contributing assignments are listed and their percentages sum to the displayed total.

### V4 - Understaffed projects (US4)

1. A project requiring 3 of a role with 1 assigned reads 1 of 3, shortfall 2, `Understaffed`.
2. Assign 2 more - reads 3 of 3, `Fully staffed`.
3. Over-assign a 1-person role - flagged overstaffed by 1.
4. Move the evaluation date past an assignment's end - the shortfall reappears with no manual action.
5. A project with no requirements reads `No requirements declared`, not fully staffed.
6. **A project that is not Planned or Active never appears in the dashboard gaps panel** (FR-075). Every team in the imported organisation is Active, because the export states no lifecycle, so set one to On hold, Completed, or Cancelled to check this: its shortfall stays readable on the project and drops out of the gaps panel.

### V5 - Replace someone on an assignment (US5)

1. Open Ajentica Lumistry and take Rubel's 40% Software Engineer assignment. Replace him with somebody not already on that project in that role - Grace or Ines will do - effective a date inside the assignment's range.
2. Rubel's commitment now ends the day before the handover; the incoming person holds the same role at 40% from the handover date to the original end date.
3. **Check the project's Software Engineer headcount on the day before the handover and again on the day of it - it must be the same on both.** This is SC-007, the single most important check in the walkthrough, and the reason the operation runs in a transaction.
4. Adjust the incoming percentage mid-swap - only the incoming assignment changes.
5. Attempt a swap that pushes the incoming person over capacity - warned with the resulting total, and allowed to proceed deliberately (Constitution VIII).
6. Attempt: replacing someone with themselves; someone already on that project and role; an effective date outside the range; an assignment that already ended. All four refused with the codes in [contracts/errors.md](./contracts/errors.md).
7. Replacement history readable from the assignment and from both people's records - naming both of them, the effective date, and who performed it.
8. Replace the same commitment again - history appends rather than overwrites.
9. Cancel a replacement mid-flow - nothing changed for either person or the project.

### V6 - Explainable candidate suggestions (US6)

1. Request candidates for a role with a gap - each row shows overall score, skill rating, skill component, and remaining capacity (Constitution IX).
2. Two candidates with equal skill rank by more free capacity; two with equal capacity rank by higher proficiency.
3. Someone already on that project and role is absent from the shortlist.
4. Fill every employee to capacity - `NO_CANDIDATE_HAS_CAPACITY`, not a blank list.
5. Request candidates for a role whose skill nobody holds - `NO_EMPLOYEE_HOLDS_SKILL`, naming the skill.
6. Request the same shortlist twice, including a deliberate score tie - identical order both times (SC-012).
7. Accept a suggestion for an open role - assignment creation opens pre-filled and **nothing was created automatically** (FR-060).
8. Accept a suggestion inside a replacement - the person is set as incoming without leaving the flow.
9. Request candidates for a requirement on a Completed project - not eligible (FR-053).

### V7 - Dashboard (US8)

1. Overallocated people ordered most overloaded first, with percentages.
2. Available people ordered by most spare capacity, with remaining percentages.
3. The gaps panel names each Planned or Active project, its short roles, and shortfall counts.
4. Each panel entry links through to the right person or project.
5. With no overallocation, no spare capacity, and no gaps, every panel shows an explicit nothing-to-action state, not a blank box.

### V8 - Cross-cutting

1. Cross-check one overallocated person and one understaffed project across the dashboard, the allocation overview, and their detail views - **all three must agree** (SC-020, Constitution II).
2. Every rejection names the offending field and its permitted values (FR-078).
3. Sign out - protected pages are no longer reachable (FR-086).

## Definition of done for this release

- V1 to V8 all pass.
- `npm test` green over `src/backend/calc`, including the date-boundary cases SC-007 depends on.
- No derived figure stored anywhere in `prisma/schema.prisma`, and none computed in `src/web` (FR-037, Constitution II and III).
- `npm run dev` starts the whole application; `npm run seed` fills it (Constitution VII and X).
- No stubbed screens, no placeholder pages (Constitution I). Story 7 is absent, not faked.

## Known gaps in this release

Recorded in full with their cost in [plan.md](./plan.md):

- **What-if scenarios (Story 7) are not built.** No scenario screen exists at all.
- **No departed-employee state.** Candidate suggestions can recommend someone who has left.
- **No concurrent-edit protection.** Two managers editing the same assignment: the second save silently wins.
