# Phase 1 Data Model: TeamFlow Resource Planning

**Feature**: `001-workforce-allocation` | **Date**: 2026-08-28 | **Revision**: 2 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

MongoDB collections declared through Prisma. Every document has an `id` mapped to `_id` as an ObjectId. Calendar dates are `YYYY-MM-DD` strings; BSON dates are used only for genuine timestamps (D-07).

**Nothing derived is stored.** Utilization, remaining capacity, load labels, staffing counts, shortfalls, and candidate scores exist only as return values from `src/backend/calc/` (FR-037, Constitution II and III).

**No foreign keys exist.** Prisma emulates referential integrity for MongoDB, so every cascading delete happens in application code inside the same transaction as its parent (D-12).

---

## Collections

### User

The signed-in person (FR-082, FR-083).

| Field | Type | Rules |
|-------|------|-------|
| `id` | ObjectId | primary key |
| `email` | String | required, unique index, lowercased on write |
| `displayName` | String | required |
| `passwordHash` | String | required, Argon2id |
| `role` | enum | `PROJECT_MANAGER` or `ADMINISTRATOR` (FR-083) |
| `createdAt` | DateTime | system |

Both roles read everything (FR-084). Only `ADMINISTRATOR` may write employees, the catalogues, and users (FR-083); a single Nest guard enforces this and refuses otherwise (FR-085).

### Skill

Catalogue document (D-03).

| Field | Type | Rules |
|-------|------|-------|
| `id` | ObjectId | primary key |
| `name` | String | required, unique index, trimmed, compared case-insensitively |

### Role

Catalogue document (D-03). Distinct from `User.role` - this is a job role such as Frontend Developer.

| Field | Type | Rules |
|-------|------|-------|
| `id` | ObjectId | primary key |
| `name` | String | required, unique index, trimmed |

### Employee

A person whose time is allocated (FR-009, FR-015).

| Field | Type | Rules |
|-------|------|-------|
| `id` | ObjectId | primary key |
| `name` | String | required |
| `roleTitle` | String | required - job title, distinct from the `Role` filled on an assignment |
| `totalCapacityPercent` | Int | required, 1 to 100, default 100 (FR-015) |
| `skills` | embedded array | see below (FR-010) |
| `createdAt`, `updatedAt` | DateTime | system |

**Embedded `skills[]`** - a rated skill is a composite type embedded in the employee document rather than its own collection, because it is never queried independently of its employee and MongoDB has no join to reassemble it cheaply:

| Field | Type | Rules |
|-------|------|-------|
| `skillId` | ObjectId | required, references `Skill` |
| `rating` | Int | required, 1 to 5 inclusive (FR-011) |

Uniqueness of `skillId` within the array is enforced in application code - the same skill cannot be attached twice (FR-011). Ratings are editable and removable in place (FR-012).

**Deleting an employee** requires explicit confirmation naming the assignments that would be removed, and deletes those assignments in the same transaction (FR-013, D-12). Administrator only (FR-083).

**Deferred**: no departed-employee status in this release. Consequence stated in [plan.md](./plan.md) known gaps (D-06).

### Project

A body of work that declares what it needs (FR-001).

| Field | Type | Rules |
|-------|------|-------|
| `id` | ObjectId | primary key |
| `name` | String | required |
| `status` | enum | `PLANNED`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED` (FR-001, D-02) |
| `createdAt`, `updatedAt` | DateTime | system |

Only `PLANNED` and `ACTIVE` projects contribute gaps to the dashboard or make a role eligible for suggestions (FR-039, FR-053, FR-075). Deleting a project requires confirmation naming its assignments, and removes them and its role requirements in the same transaction (FR-006, D-12).

### RoleRequirement

A project's declared need for a role (FR-002, FR-003). Its own collection rather than an embedded array, because candidate suggestions and the dashboard gaps panel address a single requirement directly by id.

| Field | Type | Rules |
|-------|------|-------|
| `id` | ObjectId | primary key |
| `projectId` | ObjectId | required, references `Project` |
| `roleId` | ObjectId | required, references `Role` |
| `requiredSkillId` | ObjectId | required, references `Skill` (FR-003) |
| `headcount` | Int | required, 1 or more (FR-004) |

Compound unique index on `(projectId, roleId)` - the same role cannot be declared twice on one project (FR-004). Headcount and required skill are editable; the requirement is removable (FR-005).

### Assignment

The commitment of one employee to one project in a role, for a percentage, over a date range (FR-016). **The only primitive from which every derived figure comes** (Constitution III).

| Field | Type | Rules |
|-------|------|-------|
| `id` | ObjectId | primary key |
| `employeeId` | ObjectId | required, references `Employee` |
| `projectId` | ObjectId | required, references `Project` |
| `roleId` | ObjectId | required, references `Role` - need not be declared on the project |
| `allocationPercent` | Int | required, 1 to 100 inclusive (FR-018) |
| `startDate` | String | required, `YYYY-MM-DD` (D-07) |
| `endDate` | String | required, `YYYY-MM-DD`, must not precede `startDate` (FR-019) |
| `predecessorAssignmentId` | ObjectId? | set when this record was created by a replacement (FR-051, D-08) |
| `createdAt`, `updatedAt` | DateTime | required for audit (FR-025) |
| `createdByUserId`, `updatedByUserId` | ObjectId | required, taken from the session (FR-081, FR-087) |

**Rules**:

- Duplicate `(employeeId, projectId, roleId)` is rejected in application code, directing the manager to edit the existing allocation instead (FR-022). Not a database index, because a replacement legitimately produces two records with the same triple over adjoining date ranges.
- Concurrent assignments summing above capacity are permitted and recorded faithfully; the system warns and allows the manager to proceed (FR-020, FR-021, Constitution VIII).
- Ranges are inclusive at both ends. An assignment is *active on a date* when that date falls within the range (FR-032, D-07).
- Indexes: `(employeeId, startDate, endDate)` and `(projectId, roleId, startDate, endDate)` (D-11).

### Replacement

The audit record of one employee handing an assignment to another (FR-051, D-08).

| Field | Type | Rules |
|-------|------|-------|
| `id` | ObjectId | primary key |
| `outgoingAssignmentId` | ObjectId? | null when the effective date equalled the assignment's start date, so the record was removed (FR-047) |
| `incomingAssignmentId` | ObjectId | required |
| `outgoingEmployeeId` | ObjectId | required |
| `effectiveDate` | String | required, `YYYY-MM-DD`, fell within the outgoing range (FR-045) |
| `performedByUserId` | ObjectId | required (FR-051) |
| `performedAt` | DateTime | required |

**Constitution III note**: `outgoingEmployeeId` is the only field carried here that could otherwise be read from a referenced record, and it is kept solely because FR-047 can delete the outgoing assignment. The earlier draft also copied the incoming employee, project, and role; those were removed, because they are readable from `incomingAssignmentId` and the case they were defending - history surviving assignment deletion - is one the spec explicitly does not require.

**Rules**: history is readable from either half of the split via `predecessorAssignmentId`, and from both employees' records (FR-051). Repeated replacement appends a further record, forming a chain. Records are never updated.

### Deferred: Scenario and ScenarioChange

Not created in this release (D-09). Story 7 and FR-062 to FR-071 are deferred, and the spec records the deferral. The intended shape is preserved in [research.md](./research.md) so it can be added without re-specification.

---

## Derived values - `src/backend/calc/`, computed at read time

Pure functions. Each takes already-fetched records plus an evaluation date and returns numbers; none performs I/O (D-04). This is the single shared calculation module Constitution II requires, and the only code the constitution asks to be covered by automated tests.

### `utilization.ts` - per employee, per date

| Value | Rule |
|-------|------|
| `utilizationPercent` | sum of `allocationPercent` over the employee's assignments active on the evaluation date (FR-032) |
| `remainingCapacityPercent` | `totalCapacityPercent - utilizationPercent`, floored at 0 (FR-033) |
| `loadLabel` | `UNASSIGNED` at 0; `AVAILABLE` 1 to 50; `BALANCED` 51 to 85; `HIGH_LOAD` 86 to 100; `OVERALLOCATED` above 100 (FR-034) |
| `contributingAssignments` | the active assignments with their individual percentages, so the total is traceable (FR-036, Constitution IX) |

Assignments outside the evaluation date are excluded from the total but stay listed on the employee's record with their dates (FR-035).

### `staffing.ts` - per project, per date

| Value | Rule |
|-------|------|
| `requiredHeadcount` | the requirement's `headcount` |
| `filledHeadcount` | count of distinct employees whose assignment to that project and role is active on the evaluation date (FR-040) |
| `shortfall` / `surplus` | required minus filled, signed (FR-038) |
| `fillers` | names and allocation percentages of the people filling it (FR-041) |
| `unrequestedRoles` | roles assigned on the project that no requirement declares, reported as surplus (FR-042) |
| `staffingStatus` | `FULLY_STAFFED`, `UNDERSTAFFED`, `OVERSTAFFED`, or `NO_REQUIREMENTS_DECLARED` (FR-039) |

### `candidates.ts` - per role requirement or replacement

| Value | Rule |
|-------|------|
| `skillRating` | the candidate's rating in the requirement's `requiredSkillId` |
| `skillComponent` | `round(rating / 5 * 100)` (FR-055, D-10) |
| `capacityComponent` | the candidate's `remainingCapacityPercent` (FR-055) |
| `overallScore` | `round((skillComponent + capacityComponent) / 2)` (FR-055, D-10) |
| ordering | score desc, rating desc, name asc, id asc (FR-056, D-10) |

Excluded: employees already assigned to that project in that role, and the outgoing employee on a replacement (FR-057); employees with zero remaining capacity (FR-058); employees lacking the required skill, reported by naming the skill (FR-059). Requirements on projects that are not `PLANNED` or `ACTIVE` are not eligible (FR-053, D-02).

### `dates.ts`

`YYYY-MM-DD` parsing and formatting, inclusive-range membership, and the day-before calculation FR-046 depends on. Unit-tested at the boundaries SC-007 measures.

---

## Relationships

```text
User --performs--> every write on Assignment and Replacement (FR-081, FR-087)

Employee --embeds--> skills[] --references--> Skill
Project  --has many--> RoleRequirement --references--> Role
                                        --references--> Skill (required skill)

Assignment --references--> Employee, Project, Role
Assignment --predecessorAssignmentId--> Assignment      (replacement lineage)
Replacement --references--> outgoing Assignment (nullable), incoming Assignment,
                            outgoing Employee, performing User
```

## State transitions

- **Project**: `PLANNED` -> `ACTIVE` -> `COMPLETED`; `PLANNED` or `ACTIVE` -> `ON_HOLD` -> `ACTIVE`; any state -> `CANCELLED`. Only `PLANNED` and `ACTIVE` produce gaps (D-02).
- **Assignment**: created; edited (role, percentage, dates); shortened and superseded by a replacement; or deleted. **The employee is never changed in place** (D-08).
- **Replacement**: written once inside the replacement transaction, never updated.
- **User**: role is set at creation and changeable by an Administrator (FR-083).

## Referential integrity enforced in application code

MongoDB has no foreign keys and Prisma emulates referential actions, so each of these runs inside the same transaction as its trigger (D-12):

| Trigger | Cascade |
|---------|---------|
| Delete employee | delete their assignments; embedded skills go with the document (FR-013) |
| Delete project | delete its role requirements and its assignments (FR-006) |
| Delete assignment | null the `predecessorAssignmentId` of any successor; leave `Replacement` records intact but with a null reference |
| Delete skill | rejected while any employee rates it or any requirement demands it |
| Delete role | rejected while any requirement or assignment references it |
