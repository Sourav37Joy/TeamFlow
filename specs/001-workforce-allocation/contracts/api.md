# API Contract

**Feature**: `001-workforce-allocation` | **Revision**: 2 | Conventions: [README.md](./README.md)

`PM` = Project Manager or Administrator. `ADMIN` = Administrator only (FR-083).

## Session and users

| Method | Path | Role | Purpose | Requirement |
|--------|------|------|---------|-------------|
| `POST` | `/api/session` | - | Sign in with email and password; sets the session cookie | FR-082 |
| `DELETE` | `/api/session` | any | Sign out | FR-086 |
| `GET` | `/api/session` | any | The signed-in user and their role | FR-082 |
| `GET` | `/api/users` | ADMIN | List user accounts | FR-083 |
| `POST` | `/api/users` | ADMIN | Create an account with a role | FR-083 |
| `PATCH` | `/api/users/{id}` | ADMIN | Change display name or role | FR-083 |

## Catalogues

| Method | Path | Role | Purpose | Requirement |
|--------|------|------|---------|-------------|
| `GET` | `/api/skills` | any | List skills, optional `?q=` | FR-003, D-03 |
| `POST` | `/api/skills` | PM | Create a skill; a duplicate name returns the existing one rather than failing, so creation flows are never blocked | D-03 |
| `PATCH`/`DELETE` | `/api/skills/{id}` | ADMIN | Rename or remove; removal refused while referenced | D-03, D-12 |
| `GET` | `/api/roles` | any | List roles, optional `?q=` | FR-002, D-03 |
| `POST` | `/api/roles` | PM | Create a role; duplicate returns the existing one | D-03 |
| `PATCH`/`DELETE` | `/api/roles/{id}` | ADMIN | Rename or remove; removal refused while referenced | D-03, D-12 |

## Employees

| Method | Path | Role | Purpose | Requirement |
|--------|------|------|---------|-------------|
| `GET` | `/api/employees` | any | List and search by `?q=`, `?skillId=`, `?loadLabel=`, with derived utilization at `?asOf=` | FR-014, FR-032 |
| `POST` | `/api/employees` | ADMIN | Create with name, role title, capacity, and initial rated skills | FR-009, FR-010, FR-015 |
| `GET` | `/api/employees/{id}` | any | One employee with rated skills, all assignments (active, past, future) with dates, derived utilization, and replacement history | FR-009, FR-035, FR-036, FR-051 |
| `PATCH` | `/api/employees/{id}` | ADMIN | Update name, role title, or capacity | FR-009 |
| `DELETE` | `/api/employees/{id}` | ADMIN | Delete. Without `?confirm=true` returns `409` listing the assignments that would be removed | FR-013 |
| `PUT` | `/api/employees/{id}/skills/{skillId}` | ADMIN | Set or update a rating, 1 to 5 | FR-010 to FR-012 |
| `DELETE` | `/api/employees/{id}/skills/{skillId}` | ADMIN | Remove a rated skill | FR-012 |

## Projects and role requirements

| Method | Path | Role | Purpose | Requirement |
|--------|------|------|---------|-------------|
| `GET` | `/api/projects` | any | List and search by `?q=`, `?status=`, `?staffingStatus=`, with derived staffing at `?asOf=` | FR-007, FR-039 |
| `POST` | `/api/projects` | PM | Create with name, status, and role requirements (role, required skill, headcount) | FR-001 to FR-003 |
| `GET` | `/api/projects/{id}` | any | One project with requirements, per-role staffing, fillers and their percentages, unrequested-role surplus, and overall status | FR-038 to FR-042 |
| `PATCH` | `/api/projects/{id}` | PM | Update name or status | FR-001, D-02 |
| `DELETE` | `/api/projects/{id}` | PM | Delete. Without `?confirm=true` returns `409` listing the assignments that would be removed | FR-006 |
| `POST` | `/api/projects/{id}/requirements` | PM | Add a role requirement | FR-002, FR-004 |
| `PATCH` | `/api/projects/{id}/requirements/{reqId}` | PM | Change headcount or required skill | FR-005 |
| `DELETE` | `/api/projects/{id}/requirements/{reqId}` | PM | Remove a role requirement | FR-005 |

## Assignments and replacement

| Method | Path | Role | Purpose | Requirement |
|--------|------|------|---------|-------------|
| `GET` | `/api/assignments` | any | Filter by `?employeeId=`, `?projectId=`, `?roleId=`, `?asOf=` | FR-024 |
| `POST` | `/api/assignments` | PM | Create with employee, project, role, percentage, start and end date. Supports `?dryRun=true` and `acknowledgeWarnings` | FR-016 to FR-022 |
| `GET` | `/api/assignments/{id}` | any | One assignment with its replacement history and lineage | FR-051, D-08 |
| `PATCH` | `/api/assignments/{id}` | PM | Edit role, percentage, or date range; same warning flow | FR-023, FR-021 |
| `DELETE` | `/api/assignments/{id}` | PM | Delete | FR-023 |
| `POST` | `/api/assignments/{id}/replacement` | PM | Replace the employee. Body: incoming employee, effective date, optional percentage and end-date overrides. One transaction; supports `?dryRun=true` and `acknowledgeWarnings` | FR-043 to FR-052 |

## Derived reads

| Method | Path | Role | Purpose | Requirement |
|--------|------|------|---------|-------------|
| `GET` | `/api/allocation-overview` | any | Who is assigned where. `?groupBy=person\|project`, `?q=`, `?skillId=`, `?roleId=`, `?asOf=`. Rows carry employee, project, role, percentage, dates, plus per-group totals | FR-026 to FR-031 |
| `GET` | `/api/dashboard` | any | Three panels in one response: overallocated people ordered most overloaded first, available people ordered by most spare capacity, and gaps on Planned or Active projects. `?asOf=` | FR-072 to FR-077 |
| `GET` | `/api/employees/{id}/utilization` | any | Utilization, remaining capacity, load label, contributing assignments at `?asOf=` | FR-032 to FR-036 |
| `GET` | `/api/projects/{id}/staffing` | any | Per-role required, filled, shortfall or surplus, fillers, overall status at `?asOf=` | FR-038 to FR-042 |
| `GET` | `/api/projects/{id}/requirements/{reqId}/candidates` | any | Ranked candidates with `overallScore`, `skillRating`, `skillComponent`, `capacityComponent`. Typed reason when empty or when the role has no gap | FR-053 to FR-061 |
| `GET` | `/api/assignments/{id}/replacement-candidates` | any | Ranked candidates for a replacement, excluding the outgoing employee | FR-052, FR-057 |

## Deferred

No `/api/scenarios` routes exist in this release. User Story 7 and FR-062 to FR-071 are deferred (D-09), and the spec records the deferral.
