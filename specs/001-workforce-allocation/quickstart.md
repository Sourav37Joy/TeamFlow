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
docker compose up -d            # MongoDB 7, replica set rs0, initiated on first start
npx prisma db push              # applies the schema and its indexes
npm run seed                    # the demo organisation
```

**Why a replica set**: Prisma's `$transaction` requires one, and the replacement operation depends on it. A standalone `mongod` will fail at the point a handover is confirmed. `docker-compose.yml` initiates `rs0` automatically (D-12).

**What `npm run seed` produces** - every state the tool can display, per Constitution X:

- Two accounts: `admin@example.com` (Administrator) and `pm@example.com` (Project Manager), password `teamflow-dev`
- All five project statuses, including a Completed and a Cancelled project that must *not* appear in the gaps panel
- Every load label present: someone Unassigned, Available, Balanced, High load, and at least two Overallocated
- Understaffed, fully staffed, overstaffed, and no-requirements projects
- One assignment on a role the project never declared, to exercise unrequested surplus
- One completed replacement, so history is visible without performing one first

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

1. Sign in as the Administrator. Create a project requiring 2 Frontend Developers (skill React) and 1 QA Engineer (skill Test Automation).
2. Create an employee with skills React 4 and Node.js 3.
3. From the project, fill the Frontend Developer gap - confirm the role arrives pre-filled and the assignment shows on both the project and the employee.
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

1. A project requiring 3 Backend Developers with 1 assigned reads 1 of 3, shortfall 2, `Understaffed`.
2. Assign 2 more - reads 3 of 3, `Fully staffed`.
3. Over-assign a 1-person role - flagged overstaffed by 1.
4. Move the evaluation date past an assignment's end - the shortfall reappears with no manual action.
5. A project with no requirements reads `No requirements declared`, not fully staffed.
6. **The seeded Completed and Cancelled projects never appear in the dashboard gaps panel** (FR-075).

### V5 - Replace someone on an assignment (US5)

1. Take Priya's 50% Frontend Developer assignment on Atlas Migration running to 2026-12-31. Replace her with Sam effective 2026-10-01.
2. Priya's commitment now ends 2026-09-30; Sam holds the same role at 50% from 2026-10-01 to 2026-12-31.
3. **Check the project's Frontend Developer headcount on 2026-09-30 and again on 2026-10-01 - it must be 1 on both.** This is SC-007, the single most important check in the walkthrough, and the reason the operation runs in a transaction.
4. Adjust the incoming percentage mid-swap - only the incoming assignment changes.
5. Attempt a swap that pushes the incoming person over capacity - warned with the resulting total, and allowed to proceed deliberately (Constitution VIII).
6. Attempt: replacing someone with themselves; someone already on that project and role; an effective date outside the range; an assignment that already ended. All four refused with the codes in [contracts/errors.md](./contracts/errors.md).
7. Replacement history readable from the assignment, from Priya, and from Sam - naming both people, the effective date, and who performed it.
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
