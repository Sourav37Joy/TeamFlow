# Error and Warning Contract

**Feature**: `001-workforce-allocation` | **Revision**: 2 | Conventions: see [README.md](./README.md)

FR-078 requires every validation failure to name the offending field and its permitted values, and to leave stored data unchanged. SC-018 measures this across every validation rule. The shape below exists so that requirement is testable once, centrally, rather than re-argued per endpoint.

## Response shape

Every non-2xx response uses one envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable sentence naming the field and what is permitted.",
    "details": [
      { "field": "allocationPercent", "value": 0, "permitted": "integer from 1 to 100", "code": "OUT_OF_RANGE" }
    ]
  }
}
```

## Status codes

| Status | Code | When |
|--------|------|------|
| `400` | `VALIDATION_FAILED` | Any field-level rule broken. `details` names every offending field (FR-078) |
| `401` | `NOT_AUTHENTICATED` | Missing or expired session (FR-082) |
| `403` | `ROLE_NOT_PERMITTED` | The action requires a role the signed-in user does not hold; names the action and the role required (FR-085) |
| `404` | `NOT_FOUND` | Referenced employee, project, requirement, assignment, or scenario does not exist |
| `409` | `CONFIRMATION_REQUIRED` | Delete of an employee or project holding assignments, without `?confirm=true`; body lists the assignments that would be removed (FR-006, FR-013) |
| `409` | `WARNINGS_NOT_ACKNOWLEDGED` | The write would cause overallocation and `acknowledgeWarnings` was not set; body carries the warnings (FR-021, FR-050) |
| `422` | `RULE_VIOLATION` | A domain rule rather than a field format - see the table below |

## Domain rule violations (`422`)

| `code` | Rule | Requirement |
|--------|------|-------------|
| `DUPLICATE_ROLE_REQUIREMENT` | Same role declared twice on one project | FR-004 |
| `DUPLICATE_EMPLOYEE_SKILL` | Same skill attached twice to one employee | FR-011 |
| `DUPLICATE_ASSIGNMENT` | Same employee, project, and role already assigned; directs the manager to edit the existing allocation | FR-022 |
| `END_BEFORE_START` | Assignment end date precedes its start date | FR-019 |
| `REPLACEMENT_SAME_EMPLOYEE` | Incoming and outgoing employee are the same person | FR-048 |
| `REPLACEMENT_INCOMING_ALREADY_ASSIGNED` | Incoming employee already holds that project and role | FR-048 |
| `REPLACEMENT_DATE_OUT_OF_RANGE` | Effective date outside the outgoing assignment's range; states the permitted window | FR-045 |
| `REPLACEMENT_ASSIGNMENT_ENDED` | The assignment has already ended, so there is nothing to hand over | FR-049 |
| `ROLE_ALREADY_STAFFED` | Candidate suggestions requested for a role with no shortfall | FR-061 |

## Warnings that permit override

Warnings are not errors. On `?dryRun=true` they return `200` with an empty `error` and a populated `warnings` array; on a real write without `acknowledgeWarnings` they return `409 WARNINGS_NOT_ACKNOWLEDGED`.

| `code` | Meaning | Requirement |
|--------|---------|-------------|
| `WOULD_OVERALLOCATE` | Names the employee, the resulting total percentage, and the dates on which it applies | FR-021, FR-050 |
| `REPLACEMENT_SINGLE_DAY` | The handover leaves the incoming person a one-day commitment; states the duration | edge case |
| `OUTGOING_ASSIGNMENT_REMOVED` | Effective date equals the outgoing start date, so that assignment is removed rather than shortened | FR-047 |
| `ROLE_NOT_DECLARED` | The assigned role is not declared on the project; it will show as unrequested surplus | FR-042 |

## Empty results that are not errors

FR-058, FR-059, and FR-077 require explicit explanation instead of a blank list. These return `200` with an empty collection and a typed reason, never `404`:

| `reason` | Meaning | Requirement |
|----------|---------|-------------|
| `NO_CANDIDATE_HAS_CAPACITY` | Every otherwise-eligible employee is at full capacity | FR-058 |
| `NO_EMPLOYEE_HOLDS_SKILL` | Names the required skill nobody holds | FR-059 |
| `NOTHING_TO_ACTION` | A dashboard panel has no entries | FR-077 |
| `NO_ASSIGNMENTS_ON_DATE` | Allocation overview empty for the evaluation date; names the date | FR-031 |
| `NO_REQUIREMENTS_DECLARED` | Project declares no role requirements | FR-039 |

## Where "warn, never block" stops

Constitution VIII requires the tool to surface uncomfortable truths about allocation rather than refuse them. It does **not** require accepting malformed records. The line drawn here:

| Surfaced as an overridable warning | Refused outright |
|-----------------------------------|------------------|
| An employee would exceed 100% (FR-021, FR-050) | An end date precedes its start date (FR-019) |
| A project is understaffed, or a role is short | An allocation percentage outside 1 to 100 (FR-018) |
| A role is assigned that the project never declared (FR-042) | A duplicate employee, project, and role assignment (FR-022) |
| A handover leaves a one-day commitment | Replacing someone with themselves (FR-048) |
| An outgoing assignment is removed rather than shortened (FR-047) | An effective date outside the assignment's range (FR-045) |
| | Replacing on an assignment that has already ended (FR-049) |
| | A skill rating outside 1 to 5 (FR-011) |

The test is whether the input describes a real, if uncomfortable, state of the world. Overallocation is real and the manager must be able to record it. An end date before its start date is not a state of the world; it is a typo.

## Deferred codes

`VERSION_CONFLICT` (optimistic concurrency) and the scenario codes are not implemented in this release - see the known gaps in [plan.md](./plan.md) and D-06, D-09.
