# TeamFlow Constitution

TeamFlow is a workforce allocation tool built under a hard time budget of a few hours. These principles govern all planning, implementation, and review work on the project. Where a principle conflicts with convenience, the principle wins.

## Core Principles

### I. Ship in demonstrable slices

Every step of the build must leave the application runnable and showable. No half-finished features, no stubbed screens, no placeholder pages that say "coming soon". A feature is either fully working or not started.

### II. One source of derived truth

Utilization, staffing levels, and candidate scores are calculated in a single shared module that every screen calls. No view recomputes a derived number on its own. If two pages ever disagree about a percentage, that is a defect in this principle.

### III. The assignment is the only primitive

Employee-to-project relationships exist solely as assignment records carrying a role, an allocation percentage, and a date range. No shortcut fields such as a current project stored on the employee, and no denormalized counts or cached totals.

### IV. Respect the established architecture

Once the project structure and layer boundaries are set during planning, all subsequent work conforms to them. New code goes where the existing pattern says it goes. No parallel structures, no second way of doing something already solved, no bypassing a layer for convenience. If the architecture genuinely needs to change, state the reason and change it deliberately rather than working around it.

### V. Clean code is not optional

Descriptive names for variables, functions, and files. Small functions with a single responsibility. No duplicated logic — extract it. No dead code, no commented-out blocks, no leftover debugging output. Consistent formatting throughout.

### VI. Code explains itself; comments are rare

Write code clear enough that it needs no narration. Do not add comments that restate what the line already says, do not label sections with banner comments, and do not annotate obvious operations. Comments are reserved for the small number of cases where intent cannot be expressed in code: a non-obvious business rule, a deliberate trade-off, or the reason behind a formula. Every calculation in the shared module may carry one brief comment stating the rule it implements.

### VII. Simplicity over extensibility

One deployable application, one database, one command to run it. No abstraction introduced for a second use case that does not yet exist: no plugin layers, no generic engines, no repository or service indirection where a direct call works. Prefer the boring implementation.

### VIII. Warn, never block

The tool exists to reveal uncomfortable truths about allocation. Overallocation, understaffed projects, and knowledge concentration are states to surface clearly, not validation errors to prevent.

### IX. Explainable numbers

Any score or ranking shown to a manager must display the inputs that produced it. No opaque recommendations.

### X. Always populated

A single command seeds data that exercises every state the tool can display. Empty-database screens are never the demo path.

## Development Workflow

### Testing

Automated tests cover the shared calculation module, since that is where correctness actually matters. CRUD, forms, and views are verified by using the application. Full test-driven development is not adopted for this project; the time budget does not permit it.

### Version control

Never commit without permission. Do not run `git commit`, `git push`, or any history-altering command unless explicitly asked in that moment. Staging changes is fine; creating commits is not. When work reaches a natural checkpoint, say so and propose a commit message, then wait.

### Scope under pressure

Defer, do not fake. When time runs short, features are cut from scope and the specification is updated to match. Nothing is mocked, hardcoded, or faked to appear finished.

## Governance

This constitution supersedes competing conventions and default agent behavior. Any plan or implementation that violates a principle must either be revised or the constitution amended explicitly — never silently.

Amendments require stating which principle changes, why, and what existing code is affected.

**Version:** 1.0.0 | **Ratified:** 2026-08-28
