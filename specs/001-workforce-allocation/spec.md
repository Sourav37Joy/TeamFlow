# Feature Specification: TeamFlow Resource Planning

**Feature Branch**: `001-workforce-allocation`

**Created**: 2026-08-28

**Last Updated**: 2026-08-28 (revision 4 - project status vocabulary, authentication with two roles, managed skill and role catalogues, what-if scenarios deferred)

**Status**: Draft

**Input**: User description (original): "TeamFlow is a workforce allocation tool for managers who need to know who is available, who is overloaded, and what breaks if they move someone between projects. Managers maintain employees (with rated skills from 1 to 5), projects (which declare the roles and headcount they require), and assignments that link an employee to a project with a role, an allocation percentage of their working time, and a date range. Because an employee can hold several assignments at once, the system derives each person's current utilization by summing their active allocations and labels them as unassigned, available, balanced, high load, or overallocated; it derives each project's staffing level by comparing required headcount per role against who is actually assigned. When a project has an unfilled role, the system suggests ranked candidates using a transparent score that combines the employee's proficiency in the required skill with their remaining free capacity, showing both components so the manager can see why someone was recommended. Managers can also build a named what-if scenario containing draft assignment changes, view a before-and-after comparison of the affected people's utilization and the affected projects' staffing, then either commit the scenario or discard it without ever touching the real data. A single dashboard brings this together: overallocated people, available people with spare capacity, and projects with open role gaps."

**Input** (revision 2): "we want to develop phase resource planning system where project manager can see who assigns where, project manager can create a project, also project will be able to assign employee and replace if needed, so update the specification again"

**Note on revision 2 input**: the word "phase" in the description above was confirmed by the requester to be a spelling mistake and carries no meaning. There is no phase, stage, or sub-project concept in this feature - see FR-008.

## Clarifications

### Session 2026-08-28

- Q: What does "phase" mean in "phase resource planning system"? → A: A spelling mistake; no phase, stage, or sub-project entity exists (FR-008).
- Q: Which project statuses does the system recognise, and which produce staffing gaps? → A: Planned, Active, On hold, Completed, Cancelled; only Planned and Active produce gaps (FR-001, FR-039, FR-053, FR-075).
- Q: Should the system authenticate users, and with what permission model? → A: Yes; two roles - Project Manager and Administrator - both with full read access, Administrator additionally managing employees, catalogues, and accounts (FR-082 to FR-087, FR-080).
- Q: Which user stories must ship in the initial release, given the constitution's time budget? → A: User Stories 1 to 6 plus the dashboard (Story 8); User Story 7, what-if scenarios, is deferred.
- Q: Are skills and roles free text or a managed vocabulary? → A: Managed catalogues referenced by identity, extensible while creating a project or employee, so that skill matching and per-role staffing counts are reliable.
- Q: The user stories say "project manager" throughout, but two roles now exist - which requirements are Administrator-gated? → A: In the user stories and edge cases, "project manager" means any signed-in user. Where a role actually matters, the requirement names it: Administrator-gated writes are employees (FR-009, FR-010, FR-012), catalogue renames and removals (FR-083), and user accounts (FR-083). Everything else is available to both roles.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set up projects, people, and assignments (Priority: P1)

A project manager creates a project and declares what it needs: the roles it requires, how many people per role, and the skill each role depends on. They maintain the register of employees with their rated skills. They then assign people to projects, stating the role filled, the percentage of working time it consumes, and the date range. Assignment can be started from either direction: from a project's unfilled role, or from an employee's record.

**Why this priority**: Nothing else in the product can be derived without this data. On its own it already replaces the scattered spreadsheets project managers keep today, giving one authoritative register of who is working on what and for how long.

**Independent Test**: Fully testable by creating a project with role requirements, creating employees with rated skills, creating assignments linking them from both the project side and the employee side, then reading it all back accurately. Delivers value as a single source of truth even with no derived analytics.

**Acceptance Scenarios**:

1. **Given** an empty system, **When** the project manager creates a project named "Atlas Migration" with status Active requiring 2 Frontend Developers (skill: React) and 1 QA Engineer (skill: Test Automation), **Then** the project is stored with both role requirements, their headcount, and their required skill.
2. **Given** an empty system, **When** an administrator creates an employee with a name, a role title, and the skills "React: 4" and "Node.js: 3", **Then** the employee is stored and both skills appear with their ratings.
3. **Given** an existing employee, **When** an administrator changes a skill rating from 3 to 5, **Then** the updated rating is reflected everywhere that employee's proficiency is shown.
4. **Given** a project with an unfilled Frontend Developer role, **When** the project manager chooses to fill that role from the project view and picks an employee at 50% from 2026-09-01 to 2026-12-31, **Then** the assignment is created with the role pre-filled and is visible from both the project's record and the employee's record.
5. **Given** an employee's record, **When** the project manager creates an assignment from there by picking a project and role, **Then** the assignment is created and appears identically in the project's record.
6. **Given** the project manager is creating an assignment, **When** they submit an end date earlier than the start date, **Then** the system rejects the assignment with a message naming the invalid date range and stores nothing.
7. **Given** the project manager is creating an assignment, **When** they submit an allocation percentage of 0 or above 100, **Then** the system rejects it and states the permitted range.
8. **Given** an employee holds one or more assignments, **When** the project manager attempts to delete that employee, **Then** the system names the assignments that would be removed and requires explicit confirmation before proceeding.
9. **Given** a project holds one or more assignments, **When** the project manager attempts to delete that project, **Then** the system names the assignments that would be removed and requires explicit confirmation before proceeding.

---
### User Story 2 - See who is assigned where (Priority: P2)

A project manager opens one allocation overview that answers "who is assigned where" in a single place: every assignment with the person, the project, the role they fill, their allocation percentage, and the date range. They can group the same information by person (to read it as "this is what Priya is working on") or by project (to read it as "this is who is on Atlas Migration"), search it by person, project, role, or skill, and change the evaluation date to see the picture as it stood or as it will stand.

**Why this priority**: This is the question the project manager asks most often and the one that currently requires opening several spreadsheets. It turns the register from Story 1 into an answer without requiring any derived analytics yet.

**Independent Test**: Testable by seeding several people across several projects, opening the overview, and confirming every active assignment appears exactly once with correct person, project, role, percentage, and dates under both groupings, and that search and the evaluation date filter the list correctly.

**Acceptance Scenarios**:

1. **Given** a workforce with assignments across several projects, **When** the project manager opens the allocation overview, **Then** every assignment active on the evaluation date is listed once with employee name, project name, role, allocation percentage, and date range.
2. **Given** the allocation overview, **When** the project manager groups by person, **Then** each person appears once with their assignments nested beneath and their total committed percentage shown.
3. **Given** the allocation overview, **When** the project manager groups by project, **Then** each project appears once with its assigned people nested beneath and its total assigned headcount shown.
4. **Given** the allocation overview, **When** the project manager searches for a skill, **Then** the list narrows to assignments held by people who hold that skill.
5. **Given** the allocation overview, **When** the project manager sets the evaluation date to a date three months out, **Then** the list shows the assignments that will be active on that date and excludes those that will have ended.
6. **Given** an entry in the overview, **When** the project manager selects it, **Then** they are taken to the full record of that person, project, or assignment.
7. **Given** a system with no assignments at all, **When** the project manager opens the overview, **Then** an explicit empty state explains that nobody is assigned yet and offers to create an assignment.

---

### User Story 3 - See who is overloaded and who has spare capacity (Priority: P3)

A project manager opens a person's record, or a list of all people, and immediately sees how much of that person's working time is already committed, how much is left, and a plain-language load label. The figure is derived by summing the allocation percentages of that person's assignments active on the date being viewed, so it stays correct as assignments are added, edited, and expire.

**Why this priority**: Answers "who is available and who is drowning" - the judgement the project manager must make before assigning or replacing anyone.

**Independent Test**: Testable by creating a person with several overlapping assignments and confirming the summed utilization, the remaining capacity, and the load label all match expected values; then by letting one assignment fall outside the viewing date and confirming it is excluded.

**Acceptance Scenarios**:

1. **Given** an employee with active assignments at 50% and 30%, **When** the project manager views that employee, **Then** utilization shows 80%, remaining capacity shows 20%, and the load label is Balanced.
2. **Given** an employee with active assignments at 60% and 60%, **When** the project manager views that employee, **Then** utilization shows 120%, remaining capacity shows 0%, and the load label is Overallocated with a clear visual warning.
3. **Given** an employee with no assignments at all, **When** the project manager views that employee, **Then** utilization shows 0% and the load label is Unassigned.
4. **Given** an employee whose only assignment ended last month, **When** the project manager views that employee as of today, **Then** the expired assignment is excluded from utilization and the employee is labelled Unassigned.
5. **Given** an employee whose only assignment starts next quarter, **When** the project manager views that employee as of today, **Then** the future assignment is excluded from today's utilization but is still listed on the employee's record with its date range.
6. **Given** any employee, **When** the project manager views their utilization, **Then** the contributing assignments are listed with their individual percentages so the total can be traced back to its sources.

---
### User Story 4 - Spot understaffed projects (Priority: P4)

A project manager opens a project and sees, role by role, how many people the project asked for versus how many are actually assigned, plus a summary staffing status for the project as a whole. Roles short of people are called out as gaps with the shortfall count, and each gap offers to be filled on the spot.

**Why this priority**: The mirror image of Story 3 - capacity is only useful next to demand. It identifies where work is at risk before a deadline slips.

**Independent Test**: Testable by creating a project requiring 3 of a role, assigning 1 person, and confirming the role shows 1 of 3 filled with a shortfall of 2 and the project is reported as understaffed.

**Acceptance Scenarios**:

1. **Given** a project requiring 3 Backend Developers with 3 people actively assigned to that role, **When** the project manager views the project, **Then** the role shows 3 of 3 filled and the project staffing status is Fully staffed.
2. **Given** a project requiring 3 Backend Developers with 1 person actively assigned, **When** the project manager views the project, **Then** the role shows 1 of 3 filled with a shortfall of 2 and the project staffing status is Understaffed.
3. **Given** a project requiring 1 Designer with 2 people actively assigned to that role, **When** the project manager views the project, **Then** the role is flagged as overstaffed by 1 and the project staffing status highlights the surplus.
4. **Given** a project with role requirements, **When** an assignment covering one of those roles expires, **Then** the project's staffing figures update to reflect the new shortfall without any manual action.
5. **Given** a project view, **When** the project manager inspects a role requirement, **Then** the names of the people currently filling that role are listed alongside their allocation percentages.
6. **Given** a role requirement with a shortfall, **When** the project manager chooses to fill it, **Then** they are taken to assignment creation with that project and role pre-filled.

---

### User Story 5 - Replace someone on an assignment (Priority: P5)

Someone leaves, goes on long-term leave, or is needed more urgently elsewhere. Rather than deleting an assignment and rebuilding it from scratch, the project manager replaces the person on it: they pick the assignment, choose the incoming employee, and set the date the handover takes effect. The role, allocation percentage, and end date carry across by default and can be adjusted during the swap. The outgoing person's commitment ends the day before the handover; the incoming person's begins on it, so the project's staffing never shows a phantom gap. Both people's records, and the assignment itself, retain a readable history of the replacement.

**Why this priority**: Explicitly requested, and the operation project managers perform under time pressure - exactly when a delete-and-recreate workflow loses information and miscounts staffing. It depends on assignments existing but not on any derived analytics.

**Independent Test**: Testable by creating an assignment, replacing its employee with an effective date, then confirming the outgoing person's utilization drops from that date, the incoming person's rises, the project's staffing count for the role is unchanged across the handover, and both records show the replacement history.

**Acceptance Scenarios**:

1. **Given** an active assignment of Priya to Atlas Migration as Frontend Developer at 50% until 2026-12-31, **When** the project manager replaces Priya with Sam effective 2026-10-01, **Then** Priya's commitment ends 2026-09-30, Sam holds the same role at 50% from 2026-10-01 to 2026-12-31, and the project's Frontend Developer count is 1 on both 2026-09-30 and 2026-10-01.
2. **Given** a replacement in progress, **When** the project manager adjusts the incoming person's allocation percentage or end date during the swap, **Then** the adjusted values apply to the incoming assignment only and the outgoing assignment is unaffected.
3. **Given** a replacement in progress, **When** the incoming person's other commitments mean the swap would take them above 100%, **Then** the system warns prominently, states the resulting total, and lets the project manager proceed deliberately.
4. **Given** a replacement in progress, **When** the project manager selects the same person who already holds the assignment, **Then** the system rejects the replacement and explains that the incoming and outgoing person must differ.
5. **Given** a replacement in progress, **When** the chosen incoming person already holds an assignment to that project in that same role, **Then** the system rejects the replacement and directs the project manager to adjust that existing assignment instead.
6. **Given** a replacement in progress, **When** the project manager sets an effective date outside the assignment's date range, **Then** the system rejects it and states the permitted date window.
7. **Given** an assignment that has already ended, **When** the project manager attempts to replace its employee, **Then** the system refuses and explains that there is no remaining commitment to hand over.
8. **Given** a completed replacement, **When** the project manager views the assignment, the outgoing person, or the incoming person, **Then** each shows the replacement history naming both people, the effective date, and who performed the swap.
9. **Given** a replacement in progress, **When** the project manager asks for help choosing the incoming person, **Then** ranked candidate suggestions for that role are offered with their score components visible.
10. **Given** a replacement in progress, **When** the project manager cancels before confirming, **Then** no change is made to either person or to the project's staffing.

---
### User Story 6 - Get explainable candidate suggestions (Priority: P6)

When a project role is short of people, or when the project manager is choosing who should take over a replacement, they ask the system for candidates. The system returns a ranked shortlist scored on two visible components - how proficient the person is in the skill the role requires, and how much free capacity they have left - so the project manager can see exactly why each name was suggested and can overrule the ranking with judgement.

**Why this priority**: Accelerates the decisions Stories 4 and 5 surface, but the project manager can already make those decisions manually using the views above.

**Independent Test**: Testable by creating an open role, several employees with differing skill ratings and differing existing loads, requesting suggestions, and confirming the returned order and the two displayed score components match the expected calculation.

**Acceptance Scenarios**:

1. **Given** a project role short of people, **When** the project manager requests suggestions, **Then** a ranked list of candidates is returned, each showing an overall score, their proficiency rating in the required skill, and their remaining capacity percentage.
2. **Given** two candidates with identical skill ratings but different remaining capacity, **When** suggestions are ranked, **Then** the candidate with more free capacity ranks higher.
3. **Given** two candidates with identical remaining capacity but different skill ratings, **When** suggestions are ranked, **Then** the more proficient candidate ranks higher.
4. **Given** an employee already assigned to that project in that role, **When** the project manager requests suggestions, **Then** that employee is excluded from the shortlist.
5. **Given** every employee is already at or above full capacity, **When** the project manager requests suggestions, **Then** the system returns an explicit no-candidate-has-free-capacity result rather than an unexplained empty list.
6. **Given** no employee holds the skill the role requires, **When** the project manager requests suggestions, **Then** the system says so explicitly and names the missing skill.
7. **Given** a suggested candidate for an open role, **When** the project manager accepts the suggestion, **Then** they are taken to assignment creation pre-filled with that person, project, and role.
8. **Given** a suggested candidate offered during a replacement, **When** the project manager accepts the suggestion, **Then** that person is set as the incoming employee on the replacement without leaving the replacement flow.

---

### User Story 7 - Test a reallocation safely with a what-if scenario (Priority: P7) - DEFERRED

**Status**: **Deferred from the initial release.** Under the constitution's hard time budget, scope is cut rather than faked ("defer, do not fake"). This story remains fully specified so it can be built later without re-specification, but it is not part of the first delivery. Nothing else in the spec depends on it.

Before moving people around, the project manager creates a named scenario, adds draft changes to it (add an assignment, change an allocation percentage, date range, or role, remove an assignment, or replace the person on one), and reviews a before-and-after comparison showing how each affected person's utilization and each affected project's staffing would change. They then commit the scenario to make the changes real, or discard it. Until commit, live data is untouched.

**Why this priority**: The safety net that answers "what breaks if I move someone" - but it depends on every derivation and every edit operation above being correct first.

**Independent Test**: Testable by creating a scenario with draft changes, confirming the comparison shows correct before and after figures, confirming live utilization and staffing are unchanged while the scenario is open, then committing and confirming the changes take effect.

**Acceptance Scenarios**:

1. **Given** live assignment data, **When** the project manager creates a scenario named "Q4 rebalance" and adds a draft assignment, **Then** the draft is held in the scenario and no live utilization or staffing figure changes.
2. **Given** a scenario containing draft changes, **When** the project manager views the comparison, **Then** each affected employee is listed with before utilization, after utilization, and before and after load labels, and each affected project is listed with before and after staffing per role.
3. **Given** a draft change that would push someone above full capacity, **When** the project manager views the comparison, **Then** that person is flagged as newly overallocated in the after column.
4. **Given** a draft change that fills a project's role gap, **When** the project manager views the comparison, **Then** that project's role shows as resolved in the after column.
5. **Given** a draft replacement inside a scenario, **When** the project manager views the comparison, **Then** the outgoing person's utilization falls and the incoming person's rises in the after column, and the project's staffing count for the role is unchanged.
6. **Given** an open scenario, **When** the project manager commits it, **Then** all draft changes are applied to live data as one all-or-nothing operation, the scenario is marked committed, and live figures reflect the changes.
7. **Given** an open scenario, **When** the project manager discards it, **Then** the scenario and its drafts are removed and live data is provably unchanged.
8. **Given** an open scenario whose draft change references an assignment that has since been deleted from live data, **When** the project manager attempts to commit, **Then** the commit is refused with a message naming the stale change, and no partial changes are applied.
9. **Given** a scenario has been committed, **When** the project manager reopens it, **Then** it is read-only and clearly marked as already committed.

---

### User Story 8 - One planning dashboard (Priority: P8)

The project manager lands on a single dashboard that answers the three standing questions at once: which people are overallocated, which people have spare capacity and how much, and which projects have open role gaps. Each entry links through to the underlying person or project.

**Why this priority**: Composes the insight from Stories 3 and 4 into a daily starting point. Genuinely useful, but every figure it shows must exist and be correct first.

**Independent Test**: Testable by seeding a mix of overloaded people, free people, and understaffed projects, then confirming each appears in the correct panel with correct figures and nobody is double-counted or missing.

**Acceptance Scenarios**:

1. **Given** a workforce containing 2 overallocated people, **When** the project manager opens the dashboard, **Then** both appear in the overallocated panel with their utilization percentages, ordered most overloaded first.
2. **Given** a workforce containing people with spare capacity, **When** the project manager opens the dashboard, **Then** they appear in the available panel with their remaining capacity, ordered by most spare capacity first.
3. **Given** projects with unfilled roles, **When** the project manager opens the dashboard, **Then** each appears in the gaps panel naming the project, the short roles, and the shortfall counts.
4. **Given** a dashboard entry, **When** the project manager selects it, **Then** they are taken to the full record for that person or project.
5. **Given** a workforce with no overallocation, no spare capacity, and no gaps, **When** the project manager opens the dashboard, **Then** each panel shows an explicit nothing-to-action state rather than an empty box.

---
### Edge Cases

- **Overlapping assignments exceeding capacity**: multiple concurrent assignments can sum beyond 100%; the system records the fact and reports the person as overallocated rather than silently capping the total.
- **Partial date overlap**: an assignment that overlaps the evaluation date only partially still counts in full for that date; utilization is evaluated per date, not pro-rated across a month.
- **Replacement effective on the assignment's own start date**: the outgoing person is left with a zero-length commitment, so the system removes their assignment outright instead of leaving an empty record, and still records the replacement history.
- **Replacement effective on the assignment's last day**: permitted, leaving the incoming person a single-day commitment; the system states the resulting duration before confirming.
- **Replacement of a future-dated assignment**: permitted; the effective date must still fall inside the assignment's range, and neither person's present-day utilization changes.
- **Repeated replacement of the same assignment**: permitted; each swap appends to the replacement history rather than overwriting the previous entry.
- **Replacing someone whose outgoing commitment is their only assignment**: the outgoing person becomes Unassigned from the effective date, and appears in the dashboard's available panel from that date.
- **Assignment to an undeclared role**: a project manager may assign someone to a role the project never declared; the assignment is accepted, the person is counted as staffed on that role, and the role appears as an unrequested surplus in the project's staffing view.
- **Zero-headcount role requirement**: a role declared with headcount 0 is rejected as meaningless.
- **Duplicate role requirement**: declaring the same role twice on one project is rejected, and the project manager is directed to adjust the existing headcount instead.
- **Same person assigned twice to the same project and role**: rejected as a duplicate, and the project manager is directed to adjust the existing allocation percentage.
- **Employee with no rated skills**: appears in the register, the allocation overview, and utilization views, but is never returned as a suggested candidate for a role requiring a skill.
- **Project with no declared role requirements**: reported as No requirements declared rather than as fully staffed.
- **Skill rating outside 1 to 5**: rejected with the permitted range stated.
- **Duplicate skill on one employee**: rejected, and the project manager is directed to edit the existing rating.
- **Deleting an employee or project with live assignments**: names the assignments that would be removed and requires explicit confirmation.
- **Two open scenarios touching the same assignment**: both are allowed to exist independently; committing the first makes the second's affected changes stale, and the second's commit is refused until the project manager resolves it.
- **Scenario draft removing or replacing an assignment that has already been removed**: treated as a stale change on commit, per Story 7 scenario 8.
- **Suggestions requested for a role that is already fully staffed**: the system states the role has no gap rather than returning a shortlist.
- **Allocation overview with an evaluation date before any assignment began**: shows an explicit empty state naming the date, not a blank list.
- **Assignments with no natural end**: every assignment is still required to carry an explicit end date; open-ended assignments are not supported in this version.

## Requirements *(mandatory)*

### Functional Requirements

#### Projects and role requirements

- **FR-001**: Project managers MUST be able to create, view, update, and delete projects, each with at minimum a name and a status drawn from the fixed set Planned, Active, On hold, Completed, and Cancelled.
- **FR-002**: Project managers MUST be able to declare, per project, the roles the project requires and the headcount required for each role, where headcount is an integer of 1 or more.
- **FR-003**: Each role requirement MUST identify the skill that role depends on, so that candidate suggestions have a skill to score against.
- **FR-004**: The system MUST reject a headcount below 1, and MUST reject the same role being declared twice on one project.
- **FR-005**: Project managers MUST be able to change a role requirement's headcount and required skill, and to remove a role requirement, after the project is created.
- **FR-006**: The system MUST require explicit confirmation, naming the assignments that would be removed, before deleting a project that holds any assignment.
- **FR-007**: Project managers MUST be able to list and search projects by name, status, and staffing status.
- **FR-008**: Role requirements and assignments MUST attach directly to a project. The system MUST NOT introduce any intermediate phase, stage, or sub-project layer between a project and its role requirements or assignments.

#### Employees and skills

- **FR-009**: Every employee MUST carry at minimum a name and a role title. Administrators MUST be able to create, update, and delete employees; every signed-in user MUST be able to view them.
- **FR-010**: Administrators MUST be able to attach any number of skills to an employee, each with a proficiency rating that is an integer from 1 to 5 inclusive.
- **FR-011**: The system MUST reject a skill rating outside 1 to 5, and MUST reject the same skill being attached twice to the same employee.
- **FR-012**: Administrators MUST be able to update or remove an employee's individual skill ratings without recreating the employee.
- **FR-013**: The system MUST require explicit confirmation, naming the assignments that would be removed, before deleting an employee who holds any assignment.
- **FR-014**: Every signed-in user MUST be able to list and search employees by name, role title, skill, and load label.
- **FR-015**: Every employee MUST carry an explicit total working capacity, expressed as a percentage, which all remaining-capacity figures are calculated against.

#### Assignments

- **FR-016**: Project managers MUST be able to create an assignment linking one employee to one project, stating the role filled, an allocation percentage, a start date, and an end date.
- **FR-017**: The system MUST allow an assignment to be started from a project's unfilled role requirement, pre-filling the project and role, and from an employee's record, pre-filling the employee.
- **FR-018**: The system MUST accept allocation percentages from 1 to 100 inclusive, and MUST reject 0, negative values, and values above 100 for a single assignment.
- **FR-019**: The system MUST reject an assignment whose end date precedes its start date.
- **FR-020**: The system MUST permit an employee to hold multiple concurrent assignments whose allocations sum above 100%, recording them faithfully and surfacing the resulting overallocation.
- **FR-021**: When a new or edited assignment would push an employee above their total capacity on any date in its range, the system MUST warn prominently, state the resulting total, and allow the project manager to proceed deliberately rather than blocking the save.
- **FR-022**: The system MUST reject a second assignment of the same employee to the same project in the same role, directing the project manager to edit the existing allocation instead.
- **FR-023**: Project managers MUST be able to edit an assignment's role, allocation percentage, and date range, and to delete an assignment.
- **FR-024**: Every signed-in user MUST be able to view assignments from both directions: all assignments held by an employee, and all people assigned to a project.
- **FR-025**: Every assignment MUST record when it was created and when it was last changed, so that the register can be audited.

#### Allocation overview - who is assigned where

- **FR-026**: The system MUST provide a single allocation overview listing every assignment active on the evaluation date with the employee name, project name, role, allocation percentage, and date range.
- **FR-027**: The overview MUST be groupable by person, showing each person once with their assignments nested beneath and their total committed percentage.
- **FR-028**: The overview MUST be groupable by project, showing each project once with its assigned people nested beneath and its total assigned headcount.
- **FR-029**: The overview MUST be searchable and filterable by employee name, project name, role, and skill.
- **FR-030**: The overview MUST allow the evaluation date to be changed, and MUST then show exactly the assignments active on that date.
- **FR-031**: Every row in the overview MUST link through to the full record of the employee, the project, or the assignment it refers to, and the overview MUST show an explicit empty state naming the evaluation date when nothing is active.

#### Derived utilization

- **FR-032**: The system MUST derive each employee's utilization as the sum of the allocation percentages of that employee's assignments whose date range includes the evaluation date, where the evaluation date defaults to today.
- **FR-033**: The system MUST derive each employee's remaining capacity as their total capacity minus their utilization, floored at 0%.
- **FR-034**: The system MUST assign each employee exactly one load label using these utilization bands: Unassigned at 0%, Available from 1% to 50%, Balanced from 51% to 85%, High load from 86% to 100%, and Overallocated above 100%.
- **FR-035**: The system MUST exclude assignments whose date range does not include the evaluation date from that date's utilization, while still keeping them visible on the employee's record with their dates.
- **FR-036**: The system MUST show the individual assignments contributing to an employee's utilization, each with its own percentage, so that the total is traceable to its sources.
- **FR-037**: Derived utilization MUST update automatically whenever an underlying assignment is created, edited, replaced, or deleted, and MUST never be stored as a manually maintained figure.

#### Derived project staffing

- **FR-038**: The system MUST derive, per project role requirement, the required headcount, the count of employees actively assigned to that role, and the resulting shortfall or surplus.
- **FR-039**: The system MUST derive a project-level staffing status of Fully staffed, Understaffed, Overstaffed, or No requirements declared. Projects whose status is On hold, Completed, or Cancelled MUST retain a readable staffing status but MUST NOT contribute gaps to be chased.
- **FR-040**: The system MUST count an employee toward a role's staffing only when their assignment to that role is active on the evaluation date.
- **FR-041**: The system MUST list, per role requirement, the names of the employees currently filling it together with their allocation percentages, and MUST offer to fill any role that has a shortfall.
- **FR-042**: The system MUST surface assignments made to roles the project never declared as an unrequested surplus, rather than omitting them from the staffing view.

#### Replacing an employee on an assignment

- **FR-043**: Project managers MUST be able to replace the employee on an existing assignment with a different employee, as a single operation, without deleting and recreating the assignment.
- **FR-044**: A replacement MUST carry the role, allocation percentage, and end date across to the incoming employee by default, and MUST allow the project manager to adjust the incoming allocation percentage and end date before confirming.
- **FR-045**: A replacement MUST take an effective handover date that falls within the outgoing assignment's date range; the system MUST reject any effective date outside that window and state the permitted range.
- **FR-046**: On confirming a replacement, the system MUST end the outgoing employee's commitment on the day before the effective date and begin the incoming employee's commitment on the effective date, leaving no gap and no overlap in the project's staffing count for that role.
- **FR-047**: Where the effective date equals the outgoing assignment's start date, the system MUST remove the outgoing assignment rather than leave a zero-length commitment, while still recording the replacement.
- **FR-048**: The system MUST reject a replacement where the incoming and outgoing employee are the same person, and MUST reject one where the incoming employee already holds an assignment to that project in that role.
- **FR-049**: The system MUST refuse to replace the employee on an assignment that has already ended, explaining that there is no remaining commitment to hand over.
- **FR-050**: When a replacement would take the incoming employee above their total capacity, the system MUST warn prominently, state the resulting total, and allow the project manager to proceed deliberately.
- **FR-051**: The system MUST record a replacement history entry naming the outgoing employee, the incoming employee, the effective date, and the project manager who performed it, and MUST show that history on the assignment and on both employees' records.
- **FR-052**: The system MUST allow the project manager to request ranked candidate suggestions for the role while choosing the incoming employee, and to accept one without leaving the replacement flow; abandoning the replacement before confirming MUST leave all data unchanged.

#### Candidate suggestions

- **FR-053**: For any role requirement with a shortfall on a Planned or Active project, and for any replacement in progress, project managers MUST be able to request a ranked list of suggested candidate employees.
- **FR-054**: Each suggested candidate MUST be presented with an overall score plus both of its components shown separately: the candidate's proficiency rating in the role's required skill, and the candidate's remaining capacity percentage.
- **FR-055**: The overall score MUST be the equally weighted average of a skill component and a capacity component, each normalised to a 0 to 100 scale, where the skill component is the proficiency rating divided by 5 and expressed as a percentage, and the capacity component is the candidate's remaining capacity percentage.
- **FR-056**: Where two candidates share the same overall score, the system MUST rank the more proficient candidate first, and where proficiency is also equal MUST order them by name, so that the ranking is stable and repeatable.
- **FR-057**: The system MUST exclude from suggestions any employee already assigned to that project in that role, and for a replacement MUST also exclude the outgoing employee.
- **FR-058**: The system MUST exclude from suggestions any employee with no remaining capacity, and MUST state explicitly when this leaves no candidates.
- **FR-059**: The system MUST state explicitly, naming the skill, when no employee holds the skill the role requires.
- **FR-060**: The system MUST allow the project manager to act on a suggestion by moving to assignment creation pre-filled with the suggested employee, project, and role, and MUST NOT create any assignment automatically.
- **FR-061**: The system MUST refuse a suggestion request for a role that has no shortfall, stating that the role is already staffed.

#### What-if scenarios - DEFERRED

**Deferred with User Story 7.** FR-062 to FR-071 remain specified and unchanged, but are out of scope for the initial release. No other requirement depends on them.

- **FR-062**: Project managers MUST be able to create a named scenario and add to it any number of draft changes of these kinds: add an assignment, change an existing assignment's allocation percentage, date range, or role, remove an assignment, or replace the employee on one.
- **FR-063**: Draft changes MUST NOT affect live employees, projects, assignments, utilization figures, staffing figures, the allocation overview, or the dashboard while the scenario remains uncommitted.
- **FR-064**: The system MUST show a before-and-after comparison for a scenario, listing every affected employee with before and after utilization and load label, and every affected project with before and after per-role staffing.
- **FR-065**: The comparison MUST highlight employees who become newly overallocated, and role gaps that become resolved or newly created.
- **FR-066**: For a draft replacement, the comparison MUST show the outgoing employee's utilization falling, the incoming employee's rising, and the project's staffing count for the role unchanged.
- **FR-067**: Project managers MUST be able to commit a scenario, applying all of its draft changes to live data as a single all-or-nothing operation.
- **FR-068**: The system MUST refuse to commit a scenario whose draft changes reference assignments, employees, or projects that no longer exist, naming the stale changes and applying nothing.
- **FR-069**: Project managers MUST be able to discard a scenario, removing it and its drafts and leaving live data unchanged.
- **FR-070**: Project managers MUST be able to list scenarios and see each one's name, status of open or committed, and change count; committed scenarios MUST be read-only.
- **FR-071**: Project managers MUST be able to edit and remove individual draft changes within an open scenario.

#### Dashboard

- **FR-072**: The system MUST provide a single dashboard presenting three panels: overallocated employees, employees with spare capacity, and projects with open role gaps.
- **FR-073**: The overallocated panel MUST list each affected employee with their utilization percentage, ordered most overloaded first.
- **FR-074**: The available panel MUST list each employee with spare capacity together with their remaining capacity percentage, ordered by most spare capacity first.
- **FR-075**: The gaps panel MUST list each understaffed project with its short roles and shortfall counts, and MUST include only projects whose status is Planned or Active.
- **FR-076**: Every dashboard entry MUST link through to the full record of the employee or project it refers to.
- **FR-077**: Each panel MUST show an explicit empty state explaining that there is nothing to action, rather than rendering blank.

#### Cross-cutting

- **FR-078**: All validation failures MUST be reported with a message that names the offending field and its permitted values, and MUST leave stored data unchanged.
- **FR-079**: All derived figures shown anywhere in the product, including the dashboard, the allocation overview, employee views, project views, and scenario comparisons, MUST be computed from the same rules, so that the same person or project never shows conflicting numbers in two places.
- **FR-080**: Every signed-in user MUST be able to see all projects, all employees, and all assignments, because reallocating a person between projects requires visibility beyond any single project. Write access is governed by role, per FR-083.
- **FR-081**: Every operation that changes live data, including creating, editing, deleting, replacing, and committing a scenario, MUST record which project manager performed it and when.

#### Authentication and authorization

- **FR-082**: Users MUST authenticate before reaching any project, employee, assignment, or derived figure; unauthenticated requests MUST be refused.
- **FR-083**: The system MUST support exactly two roles. A **Project Manager** MUST be able to create and change projects, role requirements, assignments, and replacements. An **Administrator** MUST be able to do everything a Project Manager can, and MUST additionally be able to create and change employees, rename or remove skill and role catalogue entries, and manage user accounts. Both roles MUST be able to add a new skill or role to the catalogue while creating a project or an employee, so that a creation flow is never blocked.
- **FR-084**: Both roles MUST have full read access to all projects, employees, assignments, and derived figures, so that reallocation decisions are never blocked by visibility (FR-080).
- **FR-085**: An attempt to perform an action the signed-in user's role does not permit MUST be refused with a message naming the action and the role required, and MUST leave stored data unchanged.
- **FR-086**: Users MUST be able to sign out, after which their session no longer grants access.
- **FR-087**: Every audited change (FR-081) MUST record the signed-in user's identity taken from their session, never from a value supplied in the request.

### Key Entities

- **User**: A signed-in person holding one of two roles (FR-083). A **Project Manager** maintains projects, role requirements, assignments, and replacements. An **Administrator** may additionally maintain employees, the skill and role catalogues, and user accounts. Every live-data change is attributed to the signed-in user.
- **Employee**: A person whose time is being allocated. Holds a name, a role title, a total working capacity, and a set of rated skills. Their utilization and load label are derived, never stored.
- **Skill**: A named capability that employees can hold and that role requirements can demand - the shared vocabulary linking supply to demand.
- **Employee Skill**: The link between an employee and a skill, carrying an integer proficiency rating from 1 to 5.
- **Project**: A body of work with a name and a status that declares the roles it needs. Its staffing level is derived, never stored.
- **Role Requirement**: A project's declared need for a role - the role name, the headcount required, and the skill that role depends on for scoring candidates.
- **Assignment**: The commitment of one employee to one project in a stated role, for a stated percentage of their working time, over a start-to-end date range. The single source from which all utilization and staffing figures are derived.
- **Replacement**: The record of one employee handing an assignment over to another - the outgoing employee, the incoming employee, the effective date, and the project manager who performed it. Retained as history on the assignment and on both employees.
- **Allocation Overview**: A derived, groupable view answering "who is assigned where" on a given date - every active assignment with its person, project, role, percentage, and dates.
- **Utilization**: A derived view of one employee on one date - total committed percentage, remaining capacity, load label, and the contributing assignments.
- **Project Staffing**: A derived view of one project on one date - per role, required versus filled headcount and the resulting shortfall or surplus, plus an overall staffing status.
- **Candidate Suggestion**: A derived, ranked recommendation of an employee for a specific role requirement or replacement, carrying the overall score and both visible components of skill proficiency and remaining capacity.
- **Scenario** (DEFERRED with User Story 7): A named, isolated container of draft changes with a status of open or committed, owned by the project manager who created it.
- **Scenario Change** (DEFERRED with User Story 7): One draft modification held inside a scenario - adding, editing, removing, or replacing the employee on an assignment - never applied to live data until the scenario is committed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A project manager can answer "who is assigned where" for the whole organisation within 10 seconds of opening the tool, from a single view, without building a filter or running a report.
- **SC-002**: A project manager can answer "who is overallocated right now?" within 10 seconds of opening the tool.
- **SC-003**: A project manager can create a project with three role requirements in under 2 minutes.
- **SC-004**: A project manager can record a new employee with three rated skills in under 90 seconds.
- **SC-005**: A project manager can create a new assignment, including finding the employee and the project, in under 60 seconds.
- **SC-006**: A project manager can replace the person on an existing assignment in under 60 seconds and in 4 interactions or fewer, without deleting or re-entering the role, percentage, or dates.
- **SC-007**: In 100% of replacements with a contiguous handover, the affected project's headcount for that role is identical on the day before and the day of the effective date - no phantom gap is ever reported.
- **SC-008**: 100% of completed replacements are traceable afterwards from the assignment and from both employees' records, naming both people, the effective date, and who performed the swap.
- **SC-009**: 100% of displayed utilization figures equal the sum of the person's assignments active on the viewed date, verified across a test set covering no assignments, a single assignment, overlapping assignments, expired assignments, future assignments, and assignments changed by a replacement.
- **SC-010**: 100% of displayed project staffing figures equal required headcount minus actively assigned headcount per role, verified across fully staffed, understaffed, overstaffed, and no-requirement projects.
- **SC-011**: Every candidate suggestion displays both score components, so that a project manager can explain any recommendation's ranking without consulting documentation - verified for 100% of suggestions in acceptance testing.
- **SC-012**: Candidate ranking is repeatable: the same data produces the same order on every request, verified across 100% of tie cases.
- **SC-013**: A project manager can go from spotting a role gap to reading a ranked candidate shortlist in 3 interactions or fewer.
- **SC-014** (DEFERRED with User Story 7): A project manager can build a scenario with three draft changes and read its before-and-after comparison in under 3 minutes.
- **SC-015** (DEFERRED with User Story 7): In 100% of test cases, live utilization and staffing figures are identical before and after a scenario is created, viewed, and discarded.
- **SC-016** (DEFERRED with User Story 7): In 100% of failed scenario commits, no draft change is partially applied.
- **SC-017**: The dashboard, the allocation overview, and every detail view become usable within 2 seconds for an organisation of 500 employees, 100 projects, and 2,000 assignments.
- **SC-018**: 100% of rejected inputs produce a message naming the offending field and its permitted values, verified against every validation rule in the requirements.
- **SC-019**: A project manager who has never seen the tool can complete the journey "find someone with spare capacity and assign them to an understaffed project" unaided on the first attempt.
- **SC-020**: Zero occurrences, across acceptance testing, of the same employee or project showing different derived figures in two different views.

## Assumptions

- **Two roles, shared visibility**: users sign in (FR-082) and hold one of two roles - Project Manager or Administrator (FR-083). Both see everything; only an Administrator may change employees, the skill and role catalogues, and user accounts (FR-084, FR-085). Per-project ownership restrictions, employee self-service, and approval workflows remain out of scope. Actions are attributed to the signed-in user (FR-081, FR-087).
- **Uniform full-time capacity**: every employee's total working capacity defaults to 100%. Part-time contracts and per-person capacity overrides are out of scope for this version, though capacity is modelled explicitly (FR-015) so it can vary later.
- **Load label thresholds are fixed**: Unassigned 0%, Available 1 to 50%, Balanced 51 to 85%, High load 86 to 100%, Overallocated above 100% (FR-034). These were chosen as a reasonable default because no canonical industry banding exists; they are stated as fixed values so the labels are testable, and can be revisited without affecting any other requirement.
- **Suggestion score is an equal 50/50 blend** of skill proficiency and remaining capacity (FR-055), chosen as the neutral default because the description asks for a transparent score showing both components without stating a preference between them. Tie-breaking favours proficiency, then name (FR-056).
- **Overallocation is recorded, not prevented**: because the description requires an Overallocated label, the system must be able to represent totals above capacity. Assignments and replacements that cause overallocation are therefore warned about but permitted (FR-021, FR-050).
- **Replacement is a handover, not a reassignment of history**: the outgoing person keeps the portion of the commitment they actually held, and the incoming person takes the remainder (FR-046). The outgoing person's past contribution is never rewritten.
- **Replacement handovers are contiguous by default**: the incoming commitment starts the day the outgoing one ends, with no deliberate gap. Leaving a role deliberately empty for a period is done by editing the assignment's dates, not by replacing.
- **Utilization is evaluated per date, not pro-rated**: an assignment active on the evaluation date contributes its full allocation percentage to that date, regardless of how much of the viewed period it covers.
- **Active means the evaluation date falls within the assignment's inclusive start-to-end range**, and the evaluation date defaults to today.
- **Allocation percentages are whole numbers**; fractional percentages are not supported.
- **Skill proficiency is a whole number from 1 to 5**, with 5 the most proficient, as stated in the description.
- **Assignments are date-bounded**: open-ended assignments with no end date are not supported.
- **No calendar awareness**: public holidays, leave, vacation, and sickness do not reduce capacity in this version. Availability is a function of assignments only.
- **Scenarios are private to their creator** (DEFERRED with User Story 7) and are not shared, reviewed, or approved by another person before commit.
- **Scenario drafts are not auto-refreshed** (DEFERRED with User Story 7): a comparison reflects live data as read at view time, and conflicts caused by live changes surface at commit as stale-change refusals rather than being silently merged.
- **Delete is a hard delete** behind a confirmation step, not an archive with restore. Replacement history survives as part of the assignment record; deleting the assignment removes it.
- **No notifications**: the tool surfaces overallocation and gaps when a project manager looks; it does not proactively alert anyone.
- **No integrations**: this version neither imports from nor exports to HR systems, project trackers, or payroll. Data is entered and maintained inside the tool.
- **Single organisation**: multi-tenancy, business units, and cross-organisation reporting are out of scope.
- **Reporting is present-tense**: the evaluation date lets a project manager look at any single date, but historical trend reporting and forward capacity forecasting are out of scope.
- **What-if scenarios are deferred**: User Story 7 and FR-062 to FR-071 remain specified but are out of the initial release, cut under the constitution's time budget. Nothing else in the spec depends on them.
- **Employee lifecycle and concurrent-edit protection are deferred**: this version has no departed-employee state and no optimistic-locking check on simultaneous edits. Both are recorded as known gaps in the plan rather than requirements, on the same time-budget grounds.
- **Knowledge concentration is not addressed, and this is an open constitution question**: Constitution VIII names three states the tool exists to surface - overallocation, understaffed projects, and knowledge concentration. This specification covers the first two and says nothing about the third: there is no requirement for spotting a skill held by only one person, or a project depending on a sole holder of a required skill. Recorded here so the omission is explicit rather than silent, as Governance requires. It needs either a new requirement group or an explicit amendment to Principle VIII, and it is outstanding.
