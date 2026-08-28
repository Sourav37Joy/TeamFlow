# Implementation Plan: TeamFlow Resource Planning

**Branch**: `001-workforce-allocation` | **Date**: 2026-08-28 | **Revision**: 2 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-workforce-allocation/spec.md` (revision 4)

## Summary

TeamFlow answers four standing questions for a project manager: who is assigned where, who is overloaded, which projects are short of people, and who should fill a gap. Managers maintain projects with declared role requirements, employees with rated skills, and assignments joining the two over a date range. Everything else is derived from those assignments and never stored.

The build is a **single deployable application**: one NestJS process that serves the JSON API under `/api` and also serves the Next.js front end, backed by one MongoDB database through Prisma, started by one command. That shape is chosen to satisfy Constitution VII literally rather than by amendment.

Two structural decisions carry the design. First, a **shared calculation module of pure functions** that every screen calls - Constitution II - which at this data volume also happens to be the fastest correct approach on MongoDB, since the derived figures are computed in memory over a small fetched set rather than by cross-collection aggregation Prisma cannot express. Second, **replacement is a transactional split** of one assignment into two linked records, so a project's headcount for a role is identical either side of the handover (SC-007).

Scope for this release is **User Stories 1 to 6 plus the dashboard (Story 8)**. User Story 7, what-if scenarios, is deferred and the spec has been updated to say so, per the constitution's "defer, do not fake".

Full reasoning and rejected alternatives for every decision are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.7 on Node.js 22 LTS

**Primary Dependencies**: NestJS 11 (HTTP, DI, guards) serving Next.js 15 (App Router, React 19); Prisma 6 with the MongoDB connector; Zod for request validation; Argon2 for password hashing; `@nestjs/passport` with a session cookie strategy

**Storage**: MongoDB 7 as a **single-node replica set** (required - Prisma's `$transaction` needs one, and replacement atomicity depends on it). Calendar dates stored as `YYYY-MM-DD` strings; BSON dates reserved for real timestamps

**Testing**: Vitest over the shared calculation module and the date helpers. Per the constitution's testing policy, CRUD, forms, and views are verified by using the application - no per-endpoint contract suite, no Playwright end-to-end suite

**Target Platform**: Evergreen desktop browsers; one Node process on Linux or Windows; MongoDB in Docker for local development

**Project Type**: Single deployable web application - one process serving both API and UI

**Performance Goals**: Dashboard, allocation overview, and detail views usable within 2 seconds at 500 employees, 100 projects, 2,000 assignments (SC-017). Each derived read is one indexed fetch plus in-memory computation, never a query per row

**Constraints**: No derived figure persisted (FR-037, Constitution III). No caching, read model, or background refresh (Constitution VII). Overallocation and understaffing are surfaced, never blocked (FR-021, FR-050, Constitution VIII). Every score shows its inputs (FR-054, Constitution IX). One seed command exercises every displayable state (Constitution X). **Hard time budget of a few hours**, which drives the scope cut and the deferrals below

**Scale/Scope**: 7 stories in scope, 77 of 87 functional requirements, roughly 10 screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution `v1.0.0`, ratified 2026-08-28, is fully in force - ten principles plus workflow and governance rules. Evaluated principle by principle.

| # | Principle | Assessment | How this plan complies |
|---|-----------|-----------|------------------------|
| I | Ship in demonstrable slices | **Pass** | Stories are built in priority order, each leaving a runnable, showable app. Story 7 is cut whole rather than stubbed - no "coming soon" screen |
| II | One source of derived truth | **Pass** | `src/backend/calc/` holds every derived figure as pure functions; no controller or page computes a percentage. The layout enforces it, and Vitest covers it |
| III | The assignment is the only primitive | **Pass, one correction** | No current-project field, no cached totals. The earlier draft denormalised employee, project, and role onto `Replacement`; that is now cut to the single field genuinely required, because FR-047 can delete the outgoing assignment |
| IV | Respect the established architecture | **Pass** | The layout in Project Structure is the ruling one; the module boundaries and where each kind of code belongs are fixed here, before any code exists |
| V | Clean code is not optional | **Pass** | Enforced in review; ESLint and Prettier configured once at the root |
| VI | Code explains itself | **Pass** | No banner or restating comments. The one sanctioned exception applies: each function in `src/backend/calc/` carries a single line naming the rule it implements |
| VII | Simplicity over extensibility | **Pass** | One deployable, one database, one command - which is why NestJS serves Next.js rather than running two apps. No repository layer, no per-entity service wrapper: controllers call Prisma and `src/backend/calc/` directly. NestJS providers are used only where DI actually earns it (Prisma client, auth guards) |
| VIII | Warn, never block | **Pass, with a stated boundary** | Overallocation, understaffing, and undeclared-role surplus warn and permit override. Data-integrity refusals stay refusals - an end date before its start, a duplicate assignment, replacing someone with themselves. The distinction is that VIII protects uncomfortable *truths about allocation*, not malformed records |
| IX | Explainable numbers | **Pass** | Every candidate row shows overall score, skill rating, skill component, and remaining capacity (FR-054). Integer arithmetic so the displayed parts reconcile with the displayed total |
| X | Always populated | **Pass** | `npm run seed` produces an organisation exercising every state: all five project statuses, every load label including Overallocated, understaffed and overstaffed and no-requirement projects, an undeclared-role surplus, and a completed replacement |

**Workflow rules**: testing is scoped to the calculation module as the constitution directs. **No commit will be made without explicit permission in the moment.** Scope under pressure is handled by deferral with a spec update, which is exactly what happened to Story 7.

**Post-Phase 1 re-check**: re-evaluated after the design artifacts were revised. All ten principles still pass; the Principle III correction was applied to [data-model.md](./data-model.md). Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-workforce-allocation/
├── spec.md              # Feature specification (revision 4)
├── plan.md              # This file (revision 2)
├── research.md          # Phase 0 - decisions with rationale and alternatives
├── data-model.md        # Phase 1 - Prisma/MongoDB entities and derived views
├── quickstart.md        # Phase 1 - one-command setup and validation walkthrough
├── contracts/           # Phase 1 - API surface and error contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 - created by /speckit-tasks, NOT by this command
```

### Source Code (repository root)

One deployable. NestJS owns the process and serves the Next.js build; the two halves sit side by side under `src/`.

```text
prisma/
└── schema.prisma                      # all models, MongoDB connector

src/
├── backend/                           # the NestJS application
│   ├── main.ts                        #   bootstraps Nest, mounts Next as the fallback handler
│   ├── prisma.service.ts              #   the one injectable Prisma client
│   ├── calc/                          #   THE shared calculation module - pure functions only
│   │   ├── dates.ts                   #     YYYY-MM-DD helpers, inclusive-range test
│   │   ├── utilization.ts             #     FR-032 to FR-037
│   │   ├── staffing.ts                #     FR-038 to FR-042
│   │   └── candidates.ts              #     FR-053 to FR-061, scoring and ordering
│   ├── auth/                          #   sign-in, session cookie, role guard (FR-082 to FR-087)
│   ├── employees/                     #   controller + Prisma calls (FR-009 to FR-015)
│   ├── projects/                      #   projects and role requirements (FR-001 to FR-008)
│   ├── assignments/                   #   CRUD plus replacement (FR-016 to FR-052)
│   ├── catalogue/                     #   skills and roles (FR-003, FR-010)
│   ├── views/                         #   allocation overview, dashboard (FR-026 to FR-031, FR-072 to FR-077)
│   └── common/                        #   error envelope, Zod pipe, warning/dry-run plumbing
│
└── web/                               # the Next.js App Router front end
    ├── app/
    │   ├── dashboard/                 #   US8
    │   ├── allocation/                #   US2 - who is assigned where
    │   ├── employees/[id]/            #   US3 - utilization and contributing assignments
    │   ├── projects/[id]/             #   US4 - per-role staffing, fill-the-gap
    │   └── login/                     #   FR-082
    ├── components/                    #   tables, empty states, warning dialog, score chips
    └── lib/api.ts                     #   typed fetch against /api

tests/                                 # Vitest over src/backend/calc only
seed/                                  # npm run seed - every displayable state (Constitution X)
docker-compose.yml                     # MongoDB 7 as a single-node replica set
```

**Structure Decision**: `src/backend` and `src/web` as siblings, built and served by one NestJS process. Two things are being satisfied at once here: Constitution VII's "one deployable application, one database, one command to run it" - which is why Nest serves the Next build rather than a second server doing it - and a clear seam between the two halves, so it is never ambiguous where a piece of code belongs (Constitution IV). The cost is acknowledged: wiring Next.js behind Nest is more plumbing than running two dev servers, and it is paid deliberately rather than by relaxing the principle.

Three points are load-bearing rather than cosmetic:

- **`src/backend/calc/` contains no I/O.** Every function takes already-fetched records plus an evaluation date and returns numbers. That is what makes Constitution II checkable by test rather than by discipline, and it is why the same functions can later serve the deferred scenario overlay unchanged.
- **`src/web` never computes a derived figure.** It renders what `/api` returns. If a percentage ever appears in a component's arithmetic, that is a Principle II defect, not a shortcut.
- **There is no repository or service layer.** Controllers call Prisma directly and pass what they fetched into `src/backend/calc/`. Constitution VII rules out indirection that does not yet earn its place, so NestJS providers are limited to the Prisma client and the auth guards.

## Complexity Tracking

> No Constitution Check violations. Every principle passes; no component was introduced without a requirement demanding it.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | - | - |

## Scope for this release

| Story | Priority | Status | Requirements |
|-------|----------|--------|--------------|
| Set up projects, people, and assignments | P1 | In scope | FR-001 to FR-025 |
| See who is assigned where | P2 | In scope | FR-026 to FR-031 |
| Utilization and load labels | P3 | In scope | FR-032 to FR-037 |
| Spot understaffed projects | P4 | In scope | FR-038 to FR-042 |
| Replace someone on an assignment | P5 | In scope | FR-043 to FR-052 |
| Explainable candidate suggestions | P6 | In scope | FR-053 to FR-061 |
| Test a reallocation with a what-if scenario | P7 | **Deferred** | FR-062 to FR-071 |
| One planning dashboard | P8 | In scope | FR-072 to FR-077 |
| Cross-cutting, authentication, authorization | - | In scope | FR-078 to FR-087 |

**In scope: 77 of 87 requirements.** The deferral is recorded in the spec itself (revision 4), not only here, so the specification and the build stay in agreement as the constitution requires.

## Known gaps carried deliberately

These were identified as real problems and are being carried anyway, on the constitution's time-budget and simplicity grounds. Each is listed so the decision is visible rather than forgotten.

| Gap | What breaks | Why carried | Cost to close later |
|-----|-------------|-------------|--------------------|
| No departed-employee state | Candidate suggestions will keep recommending people who have left the company; the only way to remove them is a hard delete, which also erases the replacement history that FR-051 and SC-008 promise to keep | Adds a field, a filter in three places, and UI to set it, for a case no demo scenario exercises. Constitution VII rules out building for it now | Small - one enum field plus filters in `src/backend/calc/candidates.ts` and the dashboard query |
| No optimistic-locking check on simultaneous edits | Two managers editing the same assignment at once: the second save silently overwrites the first, with no warning | Both roles have write access (FR-080), so this is real in production but invisible in a single-operator demo | Small - a version field and a compare-and-set in each update path |
| What-if scenarios deferred (Story 7) | Managers cannot preview a reallocation before committing it - the "what breaks if I move someone" question is answered by judgement, not by the tool | The most expensive story by far: overlay, comparison view, transactional commit, and staleness checks | Moderate - but `src/backend/calc/` was designed as pure functions precisely so the overlay can reuse it unchanged |
| Testing limited to `src/backend/calc/` | Regressions in controllers, forms, and views are caught by using the app, not by CI | Directed by the constitution's testing policy, which puts the budget where correctness actually lives | Incremental - add a contract suite per module later |

## Phase status

| Phase | Output | Status |
|-------|--------|--------|
| 0 - Outline and research | [research.md](./research.md) | Complete, revised for the confirmed stack |
| 1 - Design and contracts | [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md) | Complete, revised |
| 2 - Task breakdown | `tasks.md` | Not started - run `/speckit-tasks` |
