# Phase 1 Contracts: TeamFlow Resource Planning

**Feature**: `001-workforce-allocation` | **Revision**: 2 | **Date**: 2026-08-28

One NestJS process exposes a JSON API under `/api` and serves the Next.js front end for every other path. There are no third-party consumers and no import or export formats, because the spec rules out integrations.

## Files

| File | Contents |
|------|----------|
| [`api.md`](./api.md) | Every endpoint, the role it requires, and the requirement it satisfies |
| [`errors.md`](./errors.md) | The error and warning contract: refusals, overridable warnings, and explained empty results |

## Conventions

- **Base path**: `/api`; `application/json` throughout. Any path not under `/api` is handled by Next.js.
- **Authentication**: an HTTP-only, same-site session cookie (FR-082, D-05). Every route except `POST /api/session` requires it; without one the response is `401`.
- **Authorization**: two roles (FR-083). Each endpoint in [`api.md`](./api.md) names the role it needs. Both roles read everything (FR-084); only `ADMINISTRATOR` writes employees, the catalogues, and users. A refusal names the action and the role required (FR-085).
- **Attribution**: the acting user comes from the session, never from the request body (FR-087).
- **Dates**: calendar dates as `YYYY-MM-DD`, inclusive at both ends, never timestamps (D-07).
- **Evaluation date**: every read returning a derived figure accepts `?asOf=YYYY-MM-DD`, defaulting to today in the organisation timezone (FR-030, FR-032).
- **Percentages**: integers, never decimals (D-10).
- **Warn, never block** (Constitution VIII, FR-021, FR-050): a write that would cause overallocation is not refused. Call it with `?dryRun=true` to receive the warnings, then repeat with `"acknowledgeWarnings": true` to proceed. Data-integrity problems are still refused - see [`errors.md`](./errors.md) for where that line sits.
- **Explainable numbers** (Constitution IX): any response carrying a score also carries the inputs it was computed from. There is no endpoint that returns a ranking without its components.
- **Derived figures are never accepted on input** (FR-037). A body containing a utilization, staffing, or score field is rejected.
- **Deferred**: no scenario endpoints exist in this release (D-09).
