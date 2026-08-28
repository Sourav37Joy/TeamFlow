---

description: "Task list for TeamFlow Resource Planning"
---

# Tasks: TeamFlow Resource Planning

**Input**: Design documents from `/specs/001-workforce-allocation/`

**Prerequisites**: [plan.md](./plan.md) (revision 2), [spec.md](./spec.md) (revision 4), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Automated tests cover `src/backend/calc` only. This is not a shortcut - the constitution's testing policy puts the budget where correctness actually matters, and verifies CRUD, forms, and views by using the application. There are therefore no contract tests, no endpoint tests, and no end-to-end suite below. The manual walkthrough that replaces them is [quickstart.md](./quickstart.md) V1 to V8.

**Organization**: Grouped by user story so each is independently implementable and testable.

**Scope**: User Stories 1 to 6 plus the dashboard (Story 8). **User Story 7, what-if scenarios, is deferred** and has no tasks here - it is cut whole, not stubbed (Constitution I).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to
- Exact file paths appear in every task

## Path Conventions

Per plan.md: one deployable, NestJS serving Next.js, both halves under `src/`.

- Backend: `src/backend/`
- Front end: `src/web/`
- Calculation module: `src/backend/calc/` - pure functions, no I/O
- Tests: `tests/calc/`
- Schema: `prisma/schema.prisma`
- Seed: `seed/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A repository that installs, runs, and connects to a database.

- [X] T001 Create the directory skeleton from plan.md in `src/backend/`, `src/backend/calc/`, `src/backend/common/`, `src/web/`, `tests/calc/`, `seed/`, and `prisma/`
- [X] T002 Initialise `package.json` at the repository root with NestJS 11, Next.js 15, React 19, Prisma 6, Zod, Argon2, `@nestjs/passport`, and Vitest; add the scripts `dev`, `build`, `start`, `seed`, and `test`
- [X] T003 Configure TypeScript in `tsconfig.json` with path aliases for both halves, plus `src/web/tsconfig.json` for the Next.js side
- [X] T004 [P] Configure ESLint and Prettier once at the root in `eslint.config.mjs` and `.prettierrc` (Constitution V)
- [X] T005 [P] Write `docker-compose.yml` running MongoDB 7 with `--replSet rs0`, initiating the set on first start - required for transactions per D-12
- [X] T006 [P] Write `.env.example` with `DATABASE_URL`, `SESSION_SECRET`, and `ORG_TIMEZONE`
- [X] T007 Initialise Prisma with the MongoDB connector in `prisma/schema.prisma` and confirm `npx prisma db push` connects to the replica set
- [X] T008 Configure Vitest in `vitest.config.ts` to run `tests/calc/**/*.spec.ts` only

**Checkpoint**: `npm install` succeeds, `docker compose up -d` gives a replica set, `npx prisma db push` connects.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Everything every story needs. Utilization arithmetic lives here rather than in User Story 3, because User Story 1 already needs it - FR-021 must warn when a new assignment would push someone over capacity.

**CRITICAL**: no user story work can begin until this phase is complete.

### Schema and data access

- [X] T009 Define all collections in `prisma/schema.prisma` per data-model.md - `User`, `Skill`, `Role`, `Employee` with embedded `skills[]`, `Project`, `RoleRequirement`, `Assignment`, `Replacement` - storing calendar dates as `String` and timestamps as `DateTime`, including each employee explicit total working capacity (FR-015) and each assignment created and last-changed timestamps (FR-025)
- [X] T010 Add the indexes from data-model.md to `prisma/schema.prisma`: unique on `User.email`, `Skill.name`, and `Role.name`; compound unique on `RoleRequirement(projectId, roleId)`; compound on `Assignment(employeeId, startDate, endDate)` and `Assignment(projectId, roleId, startDate, endDate)`
- [X] T011 Implement the single injectable Prisma client in `src/backend/prisma.service.ts` - the only data-access provider, since Constitution VII rules out a repository layer

### The calculation module and its tests

- [X] T012 [P] Implement `src/backend/calc/dates.ts`: parse and format `YYYY-MM-DD`, inclusive-range membership, and the `dayBefore` helper the replacement split depends on (D-07, FR-046)
- [X] T013 [P] Write `tests/calc/dates.spec.ts` covering inclusive start and end boundaries, `dayBefore` across a month boundary, and across a leap-year February - the cases SC-007 measures
- [X] T014 Implement `src/backend/calc/utilization.ts` as pure functions: sum of allocations active on the evaluation date, remaining capacity floored at 0, load label over the FR-034 bands, and the contributing assignments (FR-032 to FR-036). No I/O; one comment per function naming the rule it implements (Constitution VI)
- [X] T015 Write `tests/calc/utilization.spec.ts` covering no assignments, one assignment, overlapping assignments summing to 80, overlapping summing to 120 with remaining floored at 0, an expired assignment excluded, a future assignment excluded, and every load-label boundary at 0, 1, 50, 51, 85, 86, 100, and 101

### HTTP, error, and warning plumbing

- [X] T016 Bootstrap Nest in `src/backend/main.ts` and `src/backend/app.module.ts`, mounting the Next.js request handler as the fallback for every path not under `/api` - the single-deployable decision from D-01
- [X] T017 Implement the error envelope and status mapping in `src/backend/common/errors.ts` per contracts/errors.md, so every message names the offending field and its permitted values (FR-078)
- [X] T018 [P] Implement the Zod validation pipe in `src/backend/common/zod-validation.pipe.ts`, rejecting any body that carries a derived figure (FR-037)
- [X] T019 [P] Implement warn-never-block plumbing in `src/backend/common/warnings.ts`: `?dryRun=true` returns warnings without writing, and a write lacking `acknowledgeWarnings` returns `WARNINGS_NOT_ACKNOWLEDGED` (FR-021, FR-050, Constitution VIII)
- [X] T020 Implement the evaluation-date resolver in `src/backend/common/as-of.ts`, reading `?asOf=`, defaulting to today in `ORG_TIMEZONE`, resolved once per request and passed explicitly into `calc` (D-07)

### Authentication and authorization

- [X] T021 Implement sign-in, sign-out, and session read in `src/backend/auth/auth.controller.ts` with Argon2id verification and an HTTP-only same-site session cookie (FR-082, FR-086)
- [X] T022 Implement the role guard in `src/backend/auth/role.guard.ts`: both roles read everything, only `ADMINISTRATOR` writes employees, catalogues, and users, and a refusal names the action and the role required (FR-080, FR-083 to FR-085)
- [X] T023 Implement session-derived attribution in `src/backend/auth/current-user.decorator.ts` so every write records the acting user from the session and never from the request body (FR-081, FR-087)

### Front-end shell

- [X] T024 Create the Next.js shell in `src/web/app/layout.tsx` with navigation, and the typed API client in `src/web/lib/api.ts` that carries the session cookie and surfaces the error envelope
- [X] T025 Build the sign-in page in `src/web/app/login/page.tsx` and redirect unauthenticated users to it (FR-082)

### Seed harness

- [X] T026 Create the seed entry point `seed/index.ts` wired to `npm run seed`, seeding the two accounts and the skill and role catalogues; later phases extend it (Constitution X)

**Checkpoint**: the app runs on one command, a user can sign in, and `npm test` passes over `dates.ts` and `utilization.ts`. Story work can begin.

---

## Phase 3: User Story 1 - Set up projects, people, and assignments (Priority: P1) - MVP

**Goal**: A project manager can record projects with declared role requirements, employees with rated skills, and assignments joining the two - from either the project side or the employee side.

**Independent Test**: Create a project requiring 2 Frontend Developers and 1 QA Engineer, create an employee with two rated skills, fill the project's gap from the project view, then create a second assignment from the employee's record - and read it all back correctly from both sides. Quickstart V1.

- [X] T027 [P] [US1] Implement the skill and role catalogue endpoints in `src/backend/catalogue/catalogue.controller.ts`: list with `?q=`, and create returning the existing document on a duplicate name so creation flows are never blocked (FR-003, D-03)
- [X] T028 [P] [US1] Implement employee endpoints in `src/backend/employees/employees.controller.ts`: list and search by name, role title, and skill; create with capacity and initial rated skills; read one; update; delete behind `?confirm=true` naming the assignments that would be removed (FR-009, FR-013, FR-014)
- [X] T029 [US1] Implement the rated-skill sub-resource in `src/backend/employees/employee-skills.controller.ts`, rejecting a rating outside 1 to 5 and a duplicate skill on one employee (FR-010 to FR-012)
- [X] T030 [P] [US1] Implement project endpoints in `src/backend/projects/projects.controller.ts`: list and search by name and status; create with the five-value status enum; read one; update; delete behind `?confirm=true` naming the assignments that would be removed (FR-001, FR-006, FR-007)
- [X] T031 [US1] Implement role-requirement endpoints in `src/backend/projects/requirements.controller.ts`, rejecting headcount below 1 and a role declared twice on one project (FR-002 to FR-005)
- [X] T032 [US1] Implement assignment create, read, update, and delete in `src/backend/assignments/assignments.controller.ts`, rejecting an end date before its start, an allocation outside 1 to 100, and a duplicate employee-project-role triple (FR-016, FR-018, FR-019, FR-022, FR-023)
- [X] T033 [US1] Wire the overallocation warning into assignment create and update using `calc/utilization.ts` and the `warnings.ts` plumbing, so the write warns with the resulting total and proceeds on acknowledgement rather than blocking (FR-020, FR-021)
- [X] T034 [US1] Implement cascading deletes in `src/backend/common/cascade.ts`, called from the delete handlers in `src/backend/employees/employees.controller.ts` and `src/backend/projects/projects.controller.ts`, each running inside the same Prisma transaction as its parent delete (FR-006, FR-013, D-12)
- [X] T035 [P] [US1] Build the employee list and create-edit form in `src/web/app/employees/page.tsx` with inline skill rating entry, writable only to an Administrator (FR-083)
- [X] T036 [P] [US1] Build the project list and create-edit form in `src/web/app/projects/page.tsx`, including role requirements with role, required skill, and headcount
- [X] T037 [US1] Build the assignment create and edit form in `src/web/components/AssignmentForm.tsx`, reachable pre-filled from a project's unfilled role and from an employee's record (FR-017)
- [X] T038 [US1] Build the overallocation warning dialog in `src/web/components/WarningDialog.tsx`, stating the resulting total and offering to proceed (Constitution VIII)
- [X] T039 [US1] Extend `seed/index.ts` with the demo employees, projects across all five statuses, and assignments (Constitution X)

**Checkpoint**: User Story 1 is fully functional. The register works from both directions, every validation refusal names its field, and overallocation warns rather than blocks.

---

## Phase 4: User Story 2 - See who is assigned where (Priority: P2)

**Goal**: One allocation overview answering "who is assigned where", groupable by person or project, searchable, with a movable evaluation date.

**Independent Test**: Seed people across several projects, open the overview, and confirm every active assignment appears exactly once under both groupings with correct totals; then search by skill and move the evaluation date three months out. Quickstart V2.

- [X] T040 [US2] Implement `GET /api/allocation-overview` in `src/backend/views/allocation.controller.ts`: one indexed fetch then in-memory shaping, supporting `?groupBy=person|project`, `?q=`, `?skillId=`, `?roleId=`, and `?asOf=` (FR-026 to FR-030, D-11)
- [X] T041 [US2] Compute per-person committed totals and per-project assigned headcount in the overview by calling `calc/utilization.ts`, never by arithmetic in the controller (FR-027, FR-028, Constitution II)
- [X] T042 [P] [US2] Build the allocation overview page in `src/web/app/allocation/page.tsx` with a person-or-project grouping toggle, a search box, and an evaluation-date picker
- [X] T043 [P] [US2] Build the empty state in `src/web/components/EmptyState.tsx` naming the evaluation date when nothing is active, rather than rendering a blank list (FR-031)
- [X] T044 [US2] Make every overview row in `src/web/app/allocation/page.tsx` link through to the employee, project, or assignment record (FR-031)

**Checkpoint**: "Who is assigned where" is answerable from one screen within ten seconds (SC-001).

---

## Phase 5: User Story 3 - See who is overloaded and who has spare capacity (Priority: P3)

**Goal**: Each person's committed percentage, remaining capacity, load label, and the assignments that produced the total.

**Independent Test**: A person with 50% and 30% reads 80% and `Balanced`; one with 60% and 60% reads 120% and `Overallocated`; an expired assignment is excluded from today but still listed. Quickstart V3.

- [X] T045 [US3] Implement `GET /api/employees/{id}/utilization` in `src/backend/employees/utilization.controller.ts`, returning utilization, remaining capacity, load label, and contributing assignments at `?asOf=` (FR-032 to FR-036)
- [X] T046 [US3] Add derived utilization and load label to the employee list response and support `?loadLabel=` filtering in `src/backend/employees/employees.controller.ts` (FR-014)
- [X] T047 [P] [US3] Build the employee detail page in `src/web/app/employees/[id]/page.tsx` showing the load label, remaining capacity, and the contributing assignments with their individual percentages so the total is traceable, and all assignments held by that employee (FR-024, FR-036)
- [X] T048 [P] [US3] Build the load-label badge in `src/web/components/LoadLabel.tsx`, giving `Overallocated` a clear visual warning
- [X] T049 [US3] In `src/web/app/employees/[id]/page.tsx`, list expired and future assignments with their date ranges while excluding them from the total shown for today (FR-035)

**Checkpoint**: every displayed utilization figure equals the sum of that person's assignments active on the viewed date (SC-009).

---

## Phase 6: User Story 4 - Spot understaffed projects (Priority: P4)

**Goal**: Per-role required versus filled headcount, shortfall or surplus, an overall staffing status, and a way to fill a gap on the spot.

**Independent Test**: A project requiring 3 Backend Developers with 1 assigned reads 1 of 3, shortfall 2, `Understaffed`; a 1-person role with 2 assigned flags overstaffed; a project with no requirements reads `No requirements declared`. Quickstart V4.

- [X] T050 [US4] Implement `src/backend/calc/staffing.ts` as pure functions: per-requirement required, filled, shortfall or surplus, the fillers with their percentages, unrequested-role surplus, and the project-level status (FR-038 to FR-042), one comment per function naming its rule
- [X] T051 [US4] Write `tests/calc/staffing.spec.ts` covering fully staffed, understaffed, overstaffed, no-requirements-declared, an expired assignment reopening a shortfall, and an assignment on a role the project never declared
- [X] T052 [US4] Implement `GET /api/projects/{id}/staffing` in `src/backend/projects/staffing.controller.ts` at `?asOf=`, and add derived staffing status plus `?staffingStatus=` filtering to the project list (FR-007, FR-038 to FR-042)
- [X] T053 [US4] Exclude `ON_HOLD`, `COMPLETED`, and `CANCELLED` projects from gap reporting while keeping their staffing readable (FR-039, D-02)
- [X] T054 [P] [US4] Build the project detail page in `src/web/app/projects/[id]/page.tsx` showing per-role required versus filled, the shortfall, the fillers and their percentages, all people assigned to the project, and any unrequested-role surplus (FR-024)
- [X] T055 [US4] Add a fill-this-role action to each short requirement in `src/web/app/projects/[id]/page.tsx`, opening `src/web/components/AssignmentForm.tsx` with project and role pre-filled (FR-041, FR-017)

**Checkpoint**: every displayed staffing figure equals required minus actively assigned headcount per role (SC-010).

---

## Phase 7: User Story 5 - Replace someone on an assignment (Priority: P5)

**Goal**: Swap the person on an assignment with a handover date, carrying role, percentage, and end date across, leaving no gap in the project's headcount, and retaining readable history.

**Independent Test**: Replace Priya with Sam effective 2026-10-01 on a 50% assignment running to 2026-12-31; confirm Priya ends 2026-09-30, Sam runs from 2026-10-01, and **the project's headcount for that role is 1 on both dates**. Quickstart V5.

- [X] T056 [US5] Implement the replacement transaction in `src/backend/assignments/replacement.ts`: in one Prisma transaction, shorten the outgoing assignment to `dayBefore(effectiveDate)` or delete it when the effective date equals its start date, create the incoming assignment from the effective date, set `predecessorAssignmentId`, and write the `Replacement` record (FR-043 to FR-047, FR-051, D-08)
- [X] T057 [US5] Implement `POST /api/assignments/{id}/replacement` in `src/backend/assignments/assignments.controller.ts`, accepting the incoming employee, effective date, and optional percentage and end-date overrides (FR-043, FR-044)
- [X] T058 [US5] In `src/backend/assignments/replacement.ts`, add the replacement refusals: same person in and out, an incoming employee already on that project and role, an effective date outside the assignment's range, and an assignment that has already ended - each naming the rule and the permitted window (FR-045, FR-048, FR-049)
- [X] T059 [US5] Wire the overallocation warning and the single-day-handover and outgoing-removed warnings into the replacement flow, including `?dryRun=true` (FR-050, FR-047, Constitution VIII)
- [X] T060 [US5] Expose replacement history on the assignment and on both employees' records by following `predecessorAssignmentId` and the `Replacement` records, so repeated replacement reads as an appending chain (FR-051)
- [X] T061 [US5] Build the replacement flow in `src/web/components/ReplacementDialog.tsx`: pick the incoming person, set the effective date, see the carried-over role, percentage and end date, adjust them, and cancel without any change (FR-044, FR-052)
- [X] T062 [P] [US5] Build the replacement history panel in `src/web/components/ReplacementHistory.tsx`, naming both people, the effective date, and who performed the swap (FR-051, SC-008)
- [X] T063 [US5] Extend `seed/index.ts` with one completed replacement so history is visible without performing one first (Constitution X)

**Checkpoint**: SC-007 holds - no replacement ever shows a phantom gap in a project's headcount.

---

## Phase 8: User Story 6 - Explainable candidate suggestions (Priority: P6)

**Goal**: A ranked shortlist for an unfilled role or a replacement, each row showing the two components that produced its score.

**Independent Test**: With employees of differing skill ratings and loads, request candidates for a gap and confirm the order and both displayed components match the expected arithmetic; request the same list twice including a tie and confirm identical order. Quickstart V6.

- [X] T064 [US6] Implement `src/backend/calc/candidates.ts` as pure functions: skill component as `round(rating / 5 * 100)`, capacity component as remaining capacity, overall score as `round((skill + capacity) / 2)`, and ordering by score desc, rating desc, name asc, id asc (FR-055, FR-056, D-10)
- [X] T065 [US6] Add the exclusion rules to `src/backend/calc/candidates.ts`: anyone already on that project in that role, the outgoing employee on a replacement, and anyone with zero remaining capacity (FR-057, FR-058)
- [X] T066 [US6] Write `tests/calc/candidates.spec.ts` covering equal skill ranked by capacity, equal capacity ranked by skill, every exclusion rule, an exact score tie resolved by rating then name then id, and repeatability of the same input producing the same order (SC-012)
- [X] T067 [US6] Implement `GET /api/projects/{id}/requirements/{reqId}/candidates` in `src/backend/projects/candidates.controller.ts`, returning the typed reasons `NO_CANDIDATE_HAS_CAPACITY`, `NO_EMPLOYEE_HOLDS_SKILL` naming the skill, and `ROLE_ALREADY_STAFFED`, rather than a bare empty list (FR-058, FR-059, FR-061)
- [X] T068 [US6] Implement `GET /api/assignments/{id}/replacement-candidates` in `src/backend/assignments/candidates.controller.ts`, excluding the outgoing employee, and restrict both candidate endpoints to requirements on `PLANNED` or `ACTIVE` projects (FR-052, FR-053, FR-057)
- [X] T069 [P] [US6] Build the candidate list in `src/web/components/CandidateList.tsx` showing overall score, skill rating, skill component, and remaining capacity on every row - no opaque recommendations (FR-054, Constitution IX)
- [X] T070 [US6] Wire the accept action in `src/web/components/CandidateList.tsx`: from a role gap it opens `src/web/components/AssignmentForm.tsx` pre-filled and creates nothing automatically; inside `src/web/components/ReplacementDialog.tsx` it sets the incoming person without leaving the flow (FR-060, FR-052)

**Checkpoint**: any recommendation can be explained from the screen alone (SC-011), and ranking is repeatable (SC-012).

---

## Phase 9: User Story 8 - One planning dashboard (Priority: P8)

**Goal**: One screen answering the three standing questions: who is overallocated, who has spare capacity, and which projects have open role gaps.

**Independent Test**: Seed a mix of overloaded people, free people, and understaffed projects; confirm each appears in the right panel with correct figures and ordering, and that the seeded Completed and Cancelled projects appear in none of them. Quickstart V7.

- [X] T071 [US8] Implement `GET /api/dashboard` in `src/backend/views/dashboard.controller.ts` returning all three panels in one response, built from `calc/utilization.ts` and `calc/staffing.ts` at `?asOf=` (FR-072, Constitution II)
- [X] T072 [US8] Order the panels as specified: overallocated people most overloaded first, available people by most spare capacity first, and gaps limited to `PLANNED` and `ACTIVE` projects (FR-073 to FR-075, D-02)
- [X] T073 [P] [US8] Build the dashboard page in `src/web/app/dashboard/page.tsx` with the three panels, each entry linking through to its person or project (FR-076)
- [X] T074 [US8] Give every panel in `src/web/app/dashboard/page.tsx` an explicit nothing-to-action empty state via `src/web/components/EmptyState.tsx`, rather than a blank box (FR-077)
- [X] T075 [US8] Make the dashboard the landing route after sign-in by redirecting from `src/web/app/page.tsx`

**Checkpoint**: "who is overallocated right now?" is answerable within ten seconds of opening the tool (SC-002).

---

## Phase 10: Polish and Cross-Cutting Concerns

- [X] T076 Walk the whole of [quickstart.md](./quickstart.md) V1 to V8 and fix what it surfaces - this is the acceptance pass that replaces an automated suite
- [X] T077 Cross-check one overallocated person and one understaffed project across `src/web/app/dashboard/`, `src/web/app/allocation/`, `src/web/app/employees/[id]/`, and `src/web/app/projects/[id]/`; any disagreement is a Constitution II defect, not a rounding difference (FR-079, SC-020)
- [X] T078 Verify every validation refusal names the offending field and its permitted values, against each rule in [contracts/errors.md](./contracts/errors.md) (FR-078, SC-018)
- [X] T079 [P] Confirm `prisma/schema.prisma` stores no derived figure, contains no phase or stage collection between project and its requirements or assignments, and that `src/web` computes no derived figure (FR-008, FR-037, Constitution II and III)
- [X] T080 [P] Add a scale seed to `seed/scale.ts` at 500 employees, 100 projects, and 2,000 assignments, and confirm the dashboard and allocation overview stay under two seconds (SC-017)
- [X] T081 Remove dead code, commented-out blocks, and leftover debug output; confirm comments exist only where intent cannot be expressed in code, plus the one-line rule comments in `src/backend/calc/` (Constitution V and VI)
- [X] T082 Confirm no stubbed screens or placeholder pages exist under `src/web/app/`, and that User Story 7 is absent rather than faked (Constitution I)

---

## Dependencies and Execution Order

### Phase dependencies

- **Phase 1 Setup**: no dependencies, start immediately
- **Phase 2 Foundational**: depends on Setup; **blocks every user story**
- **Phases 3 to 9 User Stories**: all depend on Phase 2, then follow the order below
- **Phase 10 Polish**: depends on the stories being delivered

### Story dependencies - two are real, the rest are independent

| Story | Depends on | Why |
|-------|-----------|-----|
| US1 (P1) | Phase 2 only | Independent |
| US2 (P2) | Phase 2 only | Uses `calc/utilization.ts` built in Phase 2 |
| US3 (P3) | Phase 2 only | Same module; adds its own endpoint and screens |
| US4 (P4) | Phase 2 only | Builds `calc/staffing.ts` itself |
| US5 (P5) | Phase 2, plus `calc/dates.ts` from T012 | The handover split is `dayBefore(effectiveDate)`; the whole story rests on that helper |
| US6 (P6) | Phase 2, and **US4** for gap eligibility | A shortlist is only offered for a requirement with a shortfall (FR-061), which is `calc/staffing.ts` |
| US8 (P8) | Phase 2, and **US4** | The gaps panel is project staffing; it cannot be built before staffing exists |

Everything needing data to look at also wants T039 (the seed extension) done, which is why it sits inside US1 rather than in Polish.

### Within each story

- Calculation module before the endpoint that uses it
- Endpoint before the screen that renders it
- Tests alongside the calculation module they cover, not deferred to Polish

### Parallel opportunities

- Setup: T004, T005, and T006 in parallel
- Phase 2: T012 with T013; T018 with T019; the front-end shell (T024, T025) alongside the backend plumbing
- US1: T027, T028, and T030 in parallel (different controllers); T035 and T036 in parallel (different pages)
- US2: T042 and T043 in parallel
- US3: T047 and T048 in parallel
- Across stories after Phase 2: US1, US2, US3, and US4 can proceed in parallel with enough people; US6 and US8 must wait for US4

---

## Parallel Example: User Story 1

```bash
# Three controllers, three files, no shared state:
Task: "Implement catalogue endpoints in src/backend/catalogue/catalogue.controller.ts"
Task: "Implement employee endpoints in src/backend/employees/employees.controller.ts"
Task: "Implement project endpoints in src/backend/projects/projects.controller.ts"

# Then two pages in parallel:
Task: "Build employee list and form in src/web/app/employees/page.tsx"
Task: "Build project list and form in src/web/app/projects/page.tsx"
```

---

## Implementation Strategy

### MVP: Phases 1 to 3

Setup, Foundational, then User Story 1. That already delivers the authoritative register that replaces the spreadsheets, with sign-in, roles, and the overallocation warning working. **Stop and walk quickstart V1 before going further.**

### Incremental delivery

Each phase leaves a runnable, showable application (Constitution I):

1. Phases 1 to 2 → the app runs, a user signs in, the calculation module is under test
2. Phase 3 (US1) → the register works → **demo-able MVP**
3. Phase 4 (US2) → who is assigned where
4. Phase 5 (US3) → who is overloaded, who is free
5. Phase 6 (US4) → which projects are short
6. Phase 7 (US5) → replacement, the operation asked for by name
7. Phase 8 (US6) → explainable suggestions
8. Phase 9 (US8) → the dashboard tying it together

### If the clock runs out

The constitution's rule is defer, do not fake: cut whole stories and update the spec, never stub a screen. **Recommended cut order, last to be built is first to go:**

1. **US6, explainable suggestions** - cut first. US4 already shows the manager exactly where the gaps are, and the shortlist accelerates a decision they can make unaided.
2. **US8, the dashboard** - cut second, reluctantly. It composes US3 and US4 rather than adding new capability, so both questions stay answerable from their own screens.
3. **US5, replacement** - cut last. It was requested by name, and a delete-and-recreate workaround loses the history and miscounts staffing, which is the whole reason FR-043 exists.

US1 to US4 are not candidates for cutting; below them there is no product.

---

## Notes

- **Do not commit without asking.** The constitution's version-control rule is explicit: staging is fine, creating commits is not, unless permission is given in that moment. At a natural checkpoint, propose a message and wait. This overrides the "commit after each task" habit the task template suggests.
- `[P]` marks different files with no shared dependency.
- `[Story]` labels map each task to a user story for traceability; Setup, Foundational, and Polish tasks carry none by design.
- The three known gaps carried deliberately - no departed-employee state, no optimistic-locking check, and no what-if scenarios - are recorded in [plan.md](./plan.md) and are **not** tasks here. Do not implement them silently; they are scope decisions, not oversights.
- MongoDB must be a replica set or the replacement transaction in T056 will fail at runtime (D-12).
- Every derived figure comes from `src/backend/calc/`. If a percentage appears in a controller or a React component, that is a Constitution II defect.
