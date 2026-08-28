# Phase 0 Research: TeamFlow Resource Planning

**Feature**: `001-workforce-allocation` | **Date**: 2026-08-28 | **Revision**: 2 | **Spec**: [spec.md](./spec.md) | **Constitution**: `v1.0.0`

**Purpose**: Record every decision behind the plan - what was chosen, why, and what was rejected. Revision 2 replaces the provisional stack of revision 1 with the stack the requester specified, and folds in the ratified constitution and four confirmed scope answers.

**Confirmed by the requester on 2026-08-28**: Next.js front end, NestJS back end, MongoDB, Prisma; project statuses per the recommendation in D-02; authentication with two roles; NestJS serving Next.js as one deployable; scope of Stories 1 to 6 plus the dashboard.

---

## D-01: Technology stack and process shape

**Decision**: One TypeScript deployable. A single NestJS 11 process serves the JSON API under `/api` and serves the Next.js 15 build for everything else. Prisma 6 with the MongoDB connector talks to one MongoDB 7 database running as a single-node replica set. Vitest covers the calculation module.

**Rationale**: The frameworks were specified by the requester. The *process shape* was the open question, because Constitution VII requires "one deployable application, one database, one command to run it", and a separate Next.js server plus a separate NestJS server is two deployables. Three resolutions existed; serving Next.js from inside Nest is the only one that satisfies the principle as written without either amending the constitution or discarding a framework the requester asked for. Governance forbids violating a principle silently, so the literal reading was taken.

**Cost accepted**: wiring Next.js behind Nest as a fallback handler is more plumbing than running two dev servers, and it is a known source of fiddly configuration. This is paid deliberately, and it is the one place in the plan where the simpler-to-build option was rejected in favour of the principle.

**Alternatives considered**:

- **Two services in a monorepo, one `npm run dev` starting both** - the conventional shape and the quickest to stand up. Rejected because it is two deploy units, which needs an explicit amendment to Principle VII, and the requester chose the literal reading instead.
- **Next.js alone, using Route Handlers for the API** - genuinely one deployable and the least code of all three. Rejected because it discards NestJS, which was explicitly requested.
- **Keeping the revision 1 stack of Fastify and PostgreSQL** - superseded by the requester's instruction.

---

## D-02: Project status values and which statuses produce staffing gaps - CONFIRMED

**Decision**: A project's status is one of `Planned`, `Active`, `OnHold`, `Completed`, `Cancelled`. Only `Planned` and `Active` contribute staffing shortfalls to the dashboard gaps panel and make a role eligible for candidate suggestions. The other three keep their assignments and stay fully readable and searchable, but never generate gaps to chase.

**Rationale**: FR-001 required a status and FR-007 allowed searching by it, but the values were never enumerated, so neither the filter nor the gaps panel was testable. Counting `Planned` alongside `Active` matches the tool's forward-looking design - the evaluation date exists so managers can staff work before it starts, and a Planned project with unfilled roles is exactly what they need to see. Excluding `Completed` and `Cancelled` stops the panel filling with roles nobody intends to fill, which would undermine SC-002.

**Alternatives considered**: only `Active` counts (rejected - hides the upcoming work most in need of planning); free-text status (rejected - leaves FR-007 and FR-075 untestable and fragments data on typos); a three-state list without `OnHold` (rejected - paused work is common and deserves distinguishing from cancelled work).

**Now recorded in the spec** at FR-001, FR-039, FR-053, and FR-075.

---

## D-03: Skill and role vocabularies are managed catalogues, not free text

**Decision**: `Skill` and `Role` are each a collection with a unique name. Employee skills, role requirements, and assignments reference them by identity. A manager can add to either catalogue inline while creating a project or an employee.

**Rationale**: This is correctness, not taste. FR-003 exists so a requirement's skill can be matched against employees' skills, and FR-059 must be able to state that nobody holds the required skill - both fail silently if `React` and `react ` are different values. FR-022 rejects a duplicate of the same employee, project, and role, and FR-038 counts people per role; both need stable role identity. On MongoDB this matters more than on a relational store, because there is no foreign key to catch the drift. Inline creation is required so that SC-003 and SC-004 stay achievable without a seeding step.

**Alternatives considered**: free text with fuzzy matching (rejected - non-deterministic ranking contradicts SC-012); a locked catalogue only an Administrator may extend (rejected - would block a Project Manager mid-task; the Administrator role governs *editing* the catalogue, not extending it during creation).

---

## D-04: Derived figures are pure functions over fetched records

**Decision**: `src/backend/calc/` holds utilization, remaining capacity, load label, project staffing, and candidate scoring as pure functions that take already-fetched records plus an evaluation date and return numbers. No I/O inside. Every controller fetches, then calls these. Nothing derived is persisted.

**Rationale**: Constitution II demands a single shared module that every screen calls, and FR-037 forbids storing utilization. Making the module pure is what turns that principle from an instruction into something Vitest can prove - the constitution scopes automated testing to exactly this module, so it must be testable without a database. It also removes the main risk of the MongoDB choice: because the functions never query, the fact that Prisma cannot express cross-collection aggregation stops being an architectural problem and becomes a fetching detail (D-11).

**Alternatives considered**: computing inside controllers (rejected - guarantees two screens eventually disagree, the defect Constitution II names explicitly); MongoDB aggregation pipelines via `$runCommandRaw` (rejected - moves the rules into untyped, untested pipeline JSON, out of reach of the one test suite the constitution asks for); a stored utilization field refreshed on write (rejected outright by FR-037 and Constitution III).

---

## D-05: Authentication and two roles - CONFIRMED

**Decision**: Users sign in with email and password; NestJS issues an HTTP-only, same-site session cookie. Passwords are Argon2id hashes. Two roles exist: **Project Manager** may create and change projects, role requirements, assignments, and replacements; **Administrator** may do all of that and additionally manage employees, the skill and role catalogues, and user accounts. Both roles read everything. A single Nest guard enforces the role on write routes.

**Rationale**: Some form of sign-in was already unavoidable - FR-081 requires every change attributed to a named person and FR-051 requires the swap to name who performed it. The requester chose the two-role model over a single flat one. Both roles keep full *read* access deliberately: FR-080 exists because reallocating someone between projects is impossible if you cannot see the other project, so the split is on write, never on visibility. Session cookies rather than bearer tokens because the front end is served by the same process - there is no cross-origin consumer, and cookies avoid shipping token storage and refresh logic for no benefit.

**Alternatives considered**: sign-in with all users equal (rejected by the requester); per-project ownership (rejected - contradicts FR-080's cross-project write need); OAuth2 or corporate SSO (rejected for this release - integrations are out of scope and no provider is named; the account collection leaves the door open); bearer tokens in browser storage (rejected - larger exposure, no offsetting benefit in a single-origin app).

**Now recorded in the spec** at FR-080 and FR-082 to FR-087, with a matching assumption.

---

## D-06: Employee lifecycle and concurrent edits - DEFERRED, reversing revision 1

**Decision**: Neither is built in this release. There is no departed-employee state, and no optimistic-locking check on simultaneous edits. Both are recorded as known gaps in [plan.md](./plan.md) with the cost of closing them.

**Why this reverses revision 1**: revision 1 called both unavoidable, on the reasoning that suggestions would otherwise keep recommending people who have left, and that two managers editing the same assignment would silently lose one of their decisions. That reasoning still holds - **these are real defects, not imagined ones**. What changed is that the ratified constitution sets a hard budget of a few hours and Principle VII forbids building for a case that does not yet exist. Neither gap is exercised by any demo scenario: the seed contains no departures, and a demo has one operator. Under those constraints the honest call is to defer them visibly rather than spend the budget on them, which is what the constitution's "defer, do not fake" prescribes.

**What is actually being accepted**: a manager may be recommended someone who has left the company, and simultaneous edits are last-write-wins with no warning. Both are cheap to close afterwards - a single enum field plus filters in `src/backend/calc/candidates.ts`, and a version field plus a compare-and-set in each update path.

**Alternatives considered**: building both anyway (rejected - Principle VII, and the budget is better spent on Stories 5 and 6, which the requester asked for by name); soft-deleting employees instead of a status flag (rejected - a second concept for the same need, and it complicates every read path); pessimistic record locking (rejected - needs lock lifetime and release rules the spec never asks for).

---

## D-07: Calendar dates are stored as `YYYY-MM-DD` strings

**Decision**: `startDate`, `endDate`, and a replacement's `effectiveDate` are stored as `YYYY-MM-DD` strings. Ranges are inclusive at both ends. BSON dates are used only for genuine timestamps such as `createdAt`. "Today" is resolved once per request in one configured organisation timezone and passed explicitly into `src/backend/calc/`.

**Rationale**: MongoDB has no date-only type - a BSON date is a UTC instant, so every write and read has to be pinned to midnight by hand, and a single missed conversion shifts a date by a day. That matters here more than in most systems, because FR-046 ends the outgoing commitment **the day before** the effective date and SC-007 measures precisely that boundary. ISO date strings remove the failure mode rather than managing it: equality is exact, lexicographic order is chronological so Prisma's `gte` and `lte` range filters work unchanged, and the stored value reads correctly in any tool. Date arithmetic all happens in `src/backend/calc/dates.ts`, where it is unit-tested.

**Alternatives considered**: BSON dates pinned to UTC midnight (rejected - workable, but it keeps a timezone bug permanently one careless constructor away, at the exact boundary a success criterion measures); per-user timezone resolution (rejected - two managers would see different headcounts for the same day, breaking SC-020); half-open ranges (rejected - the spec's language is inclusive, and translating conventions invites boundary bugs).

---

## D-08: Replacement is a transactional split, and the two records stay linked

**Decision**: Confirming a replacement runs one Prisma transaction that shortens the outgoing assignment to end the day before the effective date - or deletes it when the effective date equals its start date (FR-047) - creates the incoming assignment starting on the effective date, links the new record to the old through `predecessorAssignmentId`, and writes a `Replacement` record naming the effective date, the acting user, and the outgoing employee.

**Rationale**: The predecessor link is what makes FR-051 answerable. A replacement splits one commitment into two records, so "show the history on the assignment" only works if the records know they share a lineage; otherwise the history vanishes the moment a manager looks at the incoming half. The link also makes repeated replacement an appending chain rather than an overwrite, as the spec's edge cases require. The single transaction is what delivers SC-007 - at no instant is the role short a person.

**Correction from revision 1 under Constitution III**: revision 1 also denormalised `incomingEmployeeId`, `projectId`, and `roleId` onto `Replacement`, justified as making history survive assignment deletion. The spec explicitly does not require that - it states deleting an assignment removes its history - so the denormalisation was defending an imagined requirement, which Principle III forbids. Only `outgoingEmployeeId` remains, and only because FR-047 can delete the record it would otherwise be read from.

**Alternatives considered**: changing the assignment's employee in place (rejected - destroys the record of what the outgoing person actually held, contradicting the spec's position that a handover never rewrites the past); delete-and-recreate (rejected - precisely what FR-043 exists to replace, and it opens a window where the headcount is wrong); history only on `Replacement` with no record linkage (rejected - cannot answer "show this assignment's history" from either half).

---

## D-09: What-if scenarios - deferred, but the design leaves room for them

**Decision**: Stories 1 to 6 and the dashboard ship; Story 7 and FR-062 to FR-071 are deferred, and the spec has been updated to record it. No scenario collections are created and no scenario endpoints are exposed. The intended design is retained here so it can be built later without re-specification: draft changes stored as intent rows, comparison produced by loading the affected assignments, applying drafts to an in-memory copy, and running the **same** `src/backend/calc/` functions over both sets, with commit re-checking staleness and applying everything in one transaction or nothing.

**Rationale**: Story 7 is by a wide margin the most expensive in the spec - it needs an overlay, a comparison view, transactional commit, and staleness detection. The constitution's budget does not stretch to it alongside the six stories the requester named. "Defer, do not fake" means it is cut whole rather than stubbed, and the spec is amended to match rather than left describing something that does not exist.

**Why the deferral is cheap to reverse**: D-04 made `src/backend/calc/` pure functions with no I/O specifically so an overlay can feed them a modified record set and get the after column for free. Had the calculation been written inside controllers or as aggregation pipelines, adding scenarios later would have meant reimplementing every rule.

**Alternatives considered**: a cut-down scenario without the comparison view (rejected - the comparison is the value; a scenario you cannot inspect is just a delayed edit); stubbing the screen with a placeholder (rejected explicitly by Constitution I and the defer-do-not-fake rule).

---

## D-10: Candidate scoring is integer arithmetic with a total ordering

**Decision**: The skill component is `round(rating / 5 * 100)`, giving 20, 40, 60, 80, or 100. The capacity component is the remaining capacity percentage. The overall score is `round((skill + capacity) / 2)`. Ordering is score descending, then rating descending, then name ascending, then identifier ascending.

**Rationale**: FR-055 and FR-056 fixed the formula and the tie-break; only the numeric representation was open. Integer percentages keep the two displayed components exactly equal to the numbers the total came from, so a manager checking the arithmetic by hand always agrees with the screen - which is what Constitution IX and FR-054 exist for. Floating point would show 66.67 in one place and 67 in another. The trailing identifier tie-break exists because two people can share a name, and without it SC-012 fails on that case.

**Alternatives considered**: floats rounded only at display (rejected - displayed parts would stop reconciling with the displayed total, breaking Principle IX); scaled integers such as basis points (rejected - false precision from a 1-to-5 rating); leaving the final tie unordered (rejected - breaks SC-012 on duplicate names).

---

## D-11: Meeting the performance target on MongoDB without aggregation pipelines

**Decision**: For each derived read, fetch the records that could matter with one indexed query per collection, then compute in `src/backend/calc/`. Indexes on assignment by employee plus date range, and on assignment by project plus role plus date range. No caching, no read model, no background refresh, no `$lookup`.

**Rationale**: Prisma's MongoDB connector cannot express cross-collection joins through its typed API, so the relational instinct of one aggregate query for the whole organisation is unavailable without dropping to raw pipeline JSON. At this volume the constraint costs nothing: 2,000 assignments is a few hundred kilobytes, so the dashboard is two or three indexed fetches plus in-memory arithmetic, comfortably inside SC-017's two seconds. What would actually break the target is a query per employee or per project, so the plan fixes the fetch-then-compute shape up front. Caching was rejected on Constitution VII grounds and because an invalidation bug is a new way for two screens to disagree, which SC-020 forbids.

**Known ceiling**: sound to roughly the low tens of thousands of assignments. Beyond that the fetch stops being free and raw aggregation pipelines become necessary. That is an order of magnitude past the stated scale, so it is recorded rather than pre-solved.

**Alternatives considered**: raw aggregation pipelines (rejected - moves the rules out of the one tested module, contradicting Constitution II); caching derived figures (rejected - Constitution VII, and it risks SC-020); computing per entity in the client (rejected - turns one dashboard load into hundreds of requests).

---

## D-12: MongoDB operating requirements this design depends on

**Decision**: MongoDB runs as a **single-node replica set** in development, and a replica set in any deployment. `docker-compose.yml` initiates `rs0` on first start. Referential integrity is enforced in application code, because Prisma emulates it for MongoDB rather than the database enforcing it.

**Rationale**: Three consequences of the MongoDB and Prisma choice have to be designed for rather than discovered.

1. **Transactions need a replica set.** A standalone `mongod` cannot run multi-document transactions, and SC-007 - no phantom gap in headcount during a replacement - depends on one. This is a setup requirement, not a preference.
2. **Referential actions are emulated.** Cascading deletes of an employee's rated skills or a project's role requirements happen in application code, and must sit inside the same transaction as the parent delete or a partial delete becomes possible.
3. **There are no foreign keys.** A dangling reference is possible in a way it would not be relationally, which is a further reason D-03 makes skills and roles catalogue documents referenced by identity rather than free strings.

**Alternatives considered**: standalone `mongod` for development (rejected - transactions unavailable, so the behaviour SC-007 measures could not be built or demonstrated locally); Atlas for development (rejected - an external dependency and network latency in a local demo, though it satisfies the replica-set requirement and is the natural deployment target); sequencing writes carefully without transactions (rejected - leaves a window where a project's headcount is wrong, exactly what SC-007 forbids).

---

## Resolved unknowns summary

| Unknown | Resolved by | Outcome |
|---------|-------------|---------|
| Language, framework, storage, process shape | D-01 | One NestJS process serving Next.js; MongoDB via Prisma |
| Constitution VII vs two apps | D-01 | NestJS serves the Next.js build - principle satisfied without amendment |
| Project status vocabulary and gap eligibility | D-02 | Five statuses; only Planned and Active produce gaps - **now in the spec** |
| Skill and role identity | D-03 | Managed catalogues referenced by identity, extensible inline |
| Where derived figures are computed | D-04 | `src/backend/calc/`, pure functions, no I/O, unit-tested |
| Authentication and permissions | D-05 | Session cookies; Project Manager and Administrator - **now in the spec** |
| Employee lifecycle, concurrent edits | D-06 | **Deferred**, with the accepted defects stated plainly |
| Date and timezone semantics | D-07 | `YYYY-MM-DD` strings, inclusive ranges, one organisation timezone |
| How a replacement is applied | D-08 | Transactional split with a predecessor link; denormalisation cut per Constitution III |
| What-if scenarios | D-09 | **Deferred**; purity of `src/backend/calc/` keeps the door open |
| Score representation and ordering | D-10 | Integer percentages, four-level tie-break |
| Performance approach | D-11 | Indexed fetch then in-memory computation; ceiling recorded |
| MongoDB operating requirements | D-12 | Replica set required; referential integrity in application code |

**No unresolved unknowns remain.** Every decision that adds behaviour beyond the original specification is now written into the spec (revision 4). Every decision that removes scope is recorded in both the spec and the plan's known-gaps table, so the specification and the build stay in agreement as Governance requires.
