# Feature Specification: Brand Theme and Project Board

**Feature Branch**: `002-brand-theme-jira-dashboard`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "visit niftycoders.com website, that is my company website, I want complete color theme taken from that website. Also I need to change the dashboard and make it appear more like a JIRA board (like each projects are presented as a card, with a status, name of project lead, no of people working on that project, status etc). The css should be butter smooth on this website and eye pleasing."

**Relationship to feature 001**: This feature re-presents and re-skins what [001-workforce-allocation](../001-workforce-allocation/spec.md) already built. It adds one piece of stored data (a project lead) and changes no calculation. Requirement and criterion identifiers continue from 001 — which ends at FR-087 and SC-020 — starting at **FR-101** and **SC-101**, so the two specifications can be read side by side without collision.

## Clarifications

### Session 2026-08-29

- Q: The data model has no project-lead concept. Where should the lead name on a card come from? → A: **Add an explicit optional lead to Project**, chosen by a person on the project form and populated by the seed. Deriving a lead from the largest allocation was rejected: the busiest person on a project is frequently not the lead, and a card that confidently names the wrong person is worse than one that says the lead is not set.
- Q: How literally should the dashboard read as a board? → A: **Kanban columns keyed to project status** — one column per status, cards inside. *(The original answer added "horizontally scrollable when the viewport is narrow"; the revision below replaces that with reflow onto further rows.)*
- Q: What becomes of the three panels the dashboard ships today (FR-072 to FR-077)? → A: **Retained in full**; no existing dashboard requirement is withdrawn. *(Superseded on 2026-08-29 — see the revision below.)*

### Revision 2026-08-29 — tabs, and no scrollbars anywhere

Two changes after seeing the built dashboard, both requested with a screenshot of the fault.

- **The board and the panels were placed side by side, and they collided.** The board's columns ran underneath the panel rail at ordinary desktop widths, and the two regions competed for horizontal space at every width. Splitting them into **two tabs, Overview and Board**, removes the contention rather than tuning it: each surface gets the full width, and neither has to be narrowed to accommodate the other. Overview carries the three people panels; Board carries the project cards. This supersedes the rail answer above, and FR-147 and FR-151 are rewritten accordingly. No requirement of feature 001 is withdrawn — the three panels are all still present, on the Overview tab.
- **Scrollbars are removed product-wide.** The board scrolled sideways, each column scrolled inside itself, and a permanent scrollbar gutter was reserved on every page. Three scrolling surfaces on one screen. The fix is to stop needing them: with the full width available, all five columns fit without sideways scrolling, and columns grow to hold their cards instead of scrolling within themselves. Any scrollbar the browser would still paint is hidden. FR-124, FR-126, and FR-159 are rewritten, and FR-164 and FR-165 are added.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The product wears the company brand (Priority: P1)

A project manager who uses the company's public website and then opens TeamFlow sees one organisation, not two. The same navy, the same blue for anything clickable, the same typefaces, the same generous rounding on cards, the same soft lift under raised surfaces. Nothing about the tool looks like a different company's software.

**Why this priority**: It is the request's first clause, it touches every screen at once, and it is the change that makes the largest visible difference for the least risk. It also has to land before the board is built, or the board gets built twice — once in the old palette and again in the new one.

**Independent Test**: Open every existing screen — sign-in, dashboard, projects, project detail, employees, employee detail, allocation — alongside the company website. Confirm the text colour, the accent, the surface tints, the typefaces, the corner rounding, and the card shadows match, and that no screen still shows a colour from the previous palette.

**Acceptance Scenarios**:

1. **Given** any screen in the product, **When** a project manager looks at body text and headings, **Then** they are set in the brand ink and the brand's body typeface.
2. **Given** any screen, **When** a project manager looks at a link, an active navigation item, or a primary button, **Then** it carries the brand's interactive accent.
3. **Given** any screen, **When** a project manager looks at a card or panel, **Then** it sits on the brand's panel colour with the brand's card rounding and the brand's ambient shadow, separated from neighbours by the brand's hairline.
4. **Given** any screen, **When** a project manager moves focus with the keyboard, **Then** the focused control carries the brand's focus ring, visible against both panel and tinted backgrounds.
5. **Given** the product's status and load badges, **When** a project manager reads them, **Then** each is tinted from the brand palette rather than from the previous palette, and each remains distinguishable from the others.
6. **Given** any screen, **When** a project manager reads text on a tinted or coloured background, **Then** the contrast is sufficient to read comfortably.

---

### User Story 2 - The portfolio reads as a board (Priority: P2)

A project manager opens the dashboard and sees the whole portfolio laid out as a board: one column per project status, every project sitting as a card in the column matching its status. The shape of the portfolio — how much is planned, how much is running, how much is stalled — is legible in one glance without reading a single row of a table.

**Why this priority**: It is the structural half of the request and the reason the dashboard is being changed at all. It depends on the theme (P1) being in place but on nothing else.

**Independent Test**: Seed projects across all five statuses, open the dashboard, and confirm every project appears exactly once, in the column matching its status, with each column reporting how many it holds. Change a project's status elsewhere in the product, return, and confirm the card has moved column.

**Acceptance Scenarios**:

1. **Given** projects spanning several statuses, **When** a project manager opens the dashboard, **Then** a column appears for each project status and each project is shown as a card in the column matching its status.
2. **Given** a column, **When** a project manager reads its heading, **Then** the heading names the status and states how many projects it holds.
3. **Given** a status with no projects, **When** a project manager looks at that column, **Then** the column is still present and states that it holds nothing, rather than disappearing.
4. **Given** a project card, **When** a project manager selects it, **Then** they are taken to that project's full record.
5. **Given** any viewport width, **When** a project manager opens the board, **Then** every column is reachable without scrolling sideways, and no horizontal scrollbar appears on the board or the page.
6. **Given** a viewport too narrow to hold all five columns in a row, **When** a project manager opens the board, **Then** the columns reflow onto further rows in status order and remain fully readable, down to a single column at handheld width.
7. **Given** a column holding more cards than its neighbours, **When** a project manager reads it, **Then** the column has grown to hold them all and no card is hidden behind a scrolling region.
7. **Given** a project whose status is changed, **When** a project manager returns to the board, **Then** the card appears in the new status column and no longer in the old one.
8. **Given** no projects at all, **When** a project manager opens the dashboard, **Then** the board states that no projects exist rather than rendering an empty frame.

---

### User Story 3 - A project has a named lead (Priority: P3)

A project manager records who leads each project, choosing from the people already in the register. A project without a lead says so plainly rather than inventing one.

**Why this priority**: It is the one piece of genuinely new information the board needs. It has to exist before a card can display it truthfully, and it is small enough to build in isolation.

**Independent Test**: Create a project without a lead and confirm it reads as having none. Set a lead, confirm the name appears on the project record and on its board card. Clear the lead, confirm it returns to having none.

**Acceptance Scenarios**:

1. **Given** the project form, **When** a project manager creates or edits a project, **Then** they may choose a lead from the employee register, or leave it unset.
2. **Given** a project with a lead, **When** a project manager views the project or its board card, **Then** the lead's name is shown, alongside their portrait where one exists.
3. **Given** a project with no lead, **When** a project manager views the project or its board card, **Then** it states that no lead is set, rather than showing a blank or a substitute person.
4. **Given** a project with a lead, **When** a project manager clears the lead, **Then** the project returns to having no lead and nothing else about the project changes.
5. **Given** an employee who leads a project, **When** an administrator deletes that employee, **Then** the projects they led are named in the confirmation, and after deletion those projects read as having no lead rather than referring to somebody who no longer exists.
6. **Given** a project's lead, **When** a project manager selects the lead's name, **Then** they are taken to that person's record.
7. **Given** a lead who holds no assignment on the project they lead, **When** a project manager views the card, **Then** the lead is still shown, because leading a project and being allocated to it are different facts.

---

### User Story 4 - A card answers the standing questions (Priority: P4)

Without opening anything, a project manager reads from each card: what the project is called, what state it is in, who leads it, how many people are working on it, and whether it is short of anybody.

**Why this priority**: This is what makes the board worth looking at rather than merely tidy. It composes the lead from Story 3 with figures feature 001 already computes.

**Independent Test**: Seed projects that are fully staffed, short-staffed, over-staffed, and without declared requirements, then confirm each card reports the correct headcount and the correct shortfall, and that those figures match the project's own record exactly.

**Acceptance Scenarios**:

1. **Given** a project card, **When** a project manager reads it, **Then** it shows the project name, its status, its lead, the number of people working on it, and its staffing state.
2. **Given** a project with people assigned on the evaluation date, **When** a project manager reads the headcount on its card, **Then** it counts each person once regardless of how many roles they hold on that project, and matches the figure on the project's own record.
3. **Given** a project short of people, **When** a project manager reads its card, **Then** the card states how many are missing and which roles are short.
4. **Given** a fully staffed project, **When** a project manager reads its card, **Then** it is marked as fully staffed and reports no shortfall.
5. **Given** a project with no declared role requirements, **When** a project manager reads its card, **Then** it states that no requirements are declared, rather than claiming the project is fully staffed.
6. **Given** a project card, **When** a project manager reads the people on it, **Then** the portraits of assigned people are shown up to a small fixed number, with a count of any beyond that.
7. **Given** an evaluation date chosen by the project manager, **When** the board is shown for that date, **Then** every headcount, shortfall, and staffing state on every card reflects that date.
8. **Given** a project card and the project's own record open on the same date, **When** a project manager compares any figure appearing in both, **Then** the two agree.

---

### User Story 5 - The interface moves smoothly (Priority: P5)

Hovering a card, opening a dialog, switching a tab or a filter, or scrolling a long page feels continuous rather than abrupt. Nothing jumps, nothing flickers as it loads, and nothing stutters while scrolling.

**Why this priority**: It is the request's third clause. It is genuine work rather than decoration — but the board must exist before its motion can be tuned.

**Independent Test**: Exercise every hover, focus, dialog, filter, and scroll on a seeded database, watching for stutter, for content jumping as it arrives, and for the page shifting when a scrollbar appears. Repeat with the operating system set to reduce motion and confirm movement is suppressed while every state change stays legible.

**Acceptance Scenarios**:

1. **Given** any interactive element, **When** a project manager hovers or focuses it, **Then** it changes at the brand's interaction tempo rather than snapping instantly.
2. **Given** a long page being scrolled, **When** a project manager scrolls on standard hardware at the stated data volume, **Then** motion stays continuous without visible stutter.
3. **Given** a screen whose data is still loading, **When** the data arrives, **Then** it appears without the surrounding layout jumping, and the waiting state occupies the space the content will occupy.
4. **Given** a project manager who has asked their system to reduce motion, **When** they use the product, **Then** transitions and animations are suppressed while every state change remains clearly visible.
5. **Given** a dialog being opened or dismissed, **When** a project manager triggers it, **Then** it enters and leaves smoothly, and focus moves into the dialog on open and back to the trigger on close.
6. **Given** a page short enough not to need scrolling next to one long enough to need it, **When** a project manager moves between them, **Then** the layout does not shift sideways, because no scrollbar is drawn on either.
7. **Given** the product's typefaces still loading, **When** the first text paints, **Then** it is readable immediately and does not visibly reflow when the typefaces arrive.

---

### User Story 6 - The people questions stay answered (Priority: P6)

The three standing questions about people — who is over capacity, who has room, what is unfilled — remain answerable from the dashboard, on an Overview tab beside the Board tab. Each surface gets the whole width, so neither is squeezed by the other.

**Why this priority**: It protects capability that already ships. It is last because it is preservation rather than addition, but the feature is not finished without it.

**Independent Test**: Seed overallocated people, people with spare capacity, and understaffed projects, then confirm each still appears on the Overview tab in the correct panel with the correct figures, and that every figure agrees with the Board tab for the same date.

**Acceptance Scenarios**:

1. **Given** the dashboard, **When** a project manager opens it, **Then** two tabs are offered — Overview and Board — and one of them is selected.
2. **Given** the Overview tab, **When** a project manager selects it, **Then** the overallocated, spare-capacity, and open-gap panels are all shown, across the full width.
3. **Given** the Board tab, **When** a project manager selects it, **Then** the project board is shown across the full width, and the people panels are not.
4. **Given** each panel, **When** a project manager reads it, **Then** it retains the ordering, figures, links, and empty states it had before the redesign.
5. **Given** a project appearing both as a board card and in the open-gap panel, **When** a project manager compares the shortfall in the two places, **Then** they agree.
6. **Given** an evaluation date, **When** a project manager changes it, **Then** both tabs reflect that date, and the tab in view does not change.
7. **Given** a project manager using the keyboard alone, **When** they reach the tabs, **Then** they can move between them and select one, and the selected tab is evident without relying on colour.

---

### Edge Cases

- **A project's lead is not assigned to that project**: permitted and displayed. Leadership and allocation are separate facts; the card shows the lead and counts them in the headcount only if they actually hold an assignment.
- **The lead is deleted**: the deletion confirmation names every project they lead, and afterwards those projects read as having no lead. No project is left pointing at a person who no longer exists.
- **The lead's assignment ends but they remain lead**: they continue to be shown as lead and stop being counted in the headcount.
- **One person holds several roles on one project**: counted once in the headcount, matching the existing rule.
- **A column holding many projects**: the column grows to hold them and the board's rows grow with it. Nothing is hidden behind a scrolling region.
- **Every project shares one status**: the remaining columns are still drawn, each stating that it holds nothing.
- **A project name too long for a card**: truncated with the full name available on hover and to assistive technology, never reflowing the card or overlapping other content.
- **A project with an unrequested-role surplus**: the card reports the surplus without claiming a shortfall.
- **An evaluation date before any assignment began**: every card reports zero people and every declared role as short, consistent with the project records for that date.
- **Portraits missing for assigned people**: initials are shown, as elsewhere in the product.
- **A brand colour that fails contrast for small text**: the brand value is kept for large text and decorative fills, and a darker step from the same brand family is used where small text requires it. Contrast is never traded away to preserve an exact hex.
- **The brand publishes no amber**: the warning tint is derived from the brand's own tint family rather than borrowed from outside it, and stays distinguishable from both success and danger.
- **A project manager who has asked for reduced motion**: every transition is suppressed, and no state is communicated by motion alone.
- **A viewport narrower than one board column**: the column shrinks to the viewport width. The page never scrolls sideways at any width.

## Requirements *(mandatory)*

### Functional Requirements

#### Brand theme

- **FR-101**: Every colour used anywhere in the product MUST come from the brand palette recorded in [design-tokens.md](./design-tokens.md). No colour from the pre-existing palette may remain.
- **FR-102**: The palette MUST be defined in exactly one place and referenced everywhere else, so that changing a brand colour changes it product-wide from a single edit.
- **FR-103**: Primary text, headings, and strong interface elements MUST use the brand ink.
- **FR-104**: Links, active navigation items, primary actions, and selected states MUST use the brand's interactive accent, with its darker step for the pressed state.
- **FR-105**: Cards and panels MUST use the brand panel colour; page and section backgrounds MUST use the brand surface tint.
- **FR-106**: Every 1px divider, card edge, and input border MUST use the brand hairline colour.
- **FR-107**: Secondary, inactive, and disabled text MUST use the brand muted colour.
- **FR-108**: Cards and panels MUST adopt the brand's dominant card radius; circular elements MUST remain fully circular; smaller controls MUST use the brand's small-control radius.
- **FR-109**: Raised surfaces MUST carry the brand's ambient shadow; dialogs and overlays MUST carry the brand's elevated shadow.
- **FR-110**: Body and interface text MUST be set in the brand's body typeface; the brand's display typeface MUST be available for headings and accent text.
- **FR-111**: Typefaces MUST be loaded so that text is readable from first paint and does not visibly reflow once they arrive.
- **FR-112**: Every focusable control MUST show the brand focus ring when focused from the keyboard, and that ring MUST be visible against both panel and tinted backgrounds.
- **FR-113**: Text MUST meet a contrast ratio of at least 4.5:1 against its background, and at least 3:1 for text at or above the large-text threshold.
- **FR-114**: Where a brand colour cannot meet FR-113 for small text, a darker step from the same brand family MUST be used for that text while the original value is retained for large text and decorative fills.
- **FR-115**: Project status badges MUST be tinted from the brand palette, MUST be mutually distinguishable, and MUST NOT rely on colour alone to convey status.
- **FR-116**: Employee load badges — unassigned, available, balanced, high load, overallocated — MUST be tinted from the brand palette, MUST remain mutually distinguishable, and MUST NOT rely on colour alone.
- **FR-117**: Success and danger states MUST use the brand's published semantic colours.
- **FR-118**: The warning state MUST use a tone derived from the brand's own tint family, and MUST remain distinguishable from both success and danger.
- **FR-119**: Brand gradients MUST be reproduced with their published stops and percentages where gradients are used.

#### The project board

- **FR-120**: The dashboard MUST present all projects as a board of columns, one column per project status, in the order Planned, Active, On hold, Completed, Cancelled.
- **FR-121**: Every project MUST appear as exactly one card, in the column matching its status.
- **FR-122**: Each column heading MUST name its status and state how many projects it holds.
- **FR-123**: A status with no projects MUST still show its column, stating that it holds nothing.
- **FR-124**: The board MUST fit the width available to it at every viewport width, without scrolling sideways. Columns that do not fit in one row MUST reflow onto further rows in status order.
- **FR-125**: At handheld width, columns MUST stack vertically in status order and remain fully readable.
- **FR-126**: A column MUST grow to hold every card it contains. No card may be placed behind a scrolling region inside a column.
- **FR-127**: Selecting a card MUST open that project's full record.
- **FR-128**: A board with no projects at all MUST state that no projects exist rather than rendering an empty frame.
- **FR-129**: The board MUST be reachable and operable by keyboard alone, including moving between cards and opening one.

#### Card content

- **FR-130**: Each card MUST show the project name, its status, its lead, the number of people working on it, and its staffing state.
- **FR-131**: The headcount on a card MUST count each person once regardless of how many roles they hold on that project, and MUST be evaluated on the dashboard's evaluation date.
- **FR-132**: A card for a project short of people MUST state the total shortfall and name the short roles.
- **FR-133**: A card for a fully staffed project MUST say so and report no shortfall.
- **FR-134**: A card for a project with no declared role requirements MUST say that no requirements are declared, and MUST NOT describe it as fully staffed.
- **FR-135**: A card MUST show portraits of the people assigned to the project up to a fixed small number, with a count of any beyond it, falling back to initials where no portrait exists.
- **FR-136**: A project name too long for its card MUST be truncated visually while remaining available in full on hover and to assistive technology.
- **FR-137**: Every figure on a card MUST be produced by the product's existing shared calculation rules, so a card and the project's own record can never disagree.
- **FR-138**: The dashboard MUST let a project manager choose the evaluation date, and every card, badge, and panel MUST reflect it.

#### Project lead

- **FR-139**: A project MUST be able to record a lead, chosen from the employee register.
- **FR-140**: A project's lead MUST be optional; a project without one MUST state that no lead is set rather than showing a blank or a substitute.
- **FR-141**: A project manager MUST be able to set, change, and clear a project's lead from the project form.
- **FR-142**: A project's lead MUST be shown with their name and, where one exists, their portrait, on both the project record and its board card.
- **FR-143**: Selecting a lead's name MUST open that person's record.
- **FR-144**: Deleting an employee MUST name every project they lead in the confirmation, and MUST leave those projects with no lead rather than a reference to a deleted person.
- **FR-145**: Leading a project MUST NOT imply an assignment to it; a lead MUST be counted in a project's headcount only if they hold an assignment on the evaluation date.
- **FR-146**: The seed MUST give leads to some projects and leave others without one, so both states are demonstrable.

#### The two tabs

- **FR-147**: The dashboard MUST offer two tabs, **Overview** and **Board**. Overview MUST carry the overallocated, spare-capacity, and open-gap panels, satisfying FR-072 through FR-077 unchanged. Board MUST carry the project board. Exactly one tab is shown at a time, and each gets the full width.
- **FR-148**: Each panel on the Overview tab MUST keep its existing ordering, figures, links, and empty states.
- **FR-149**: A shortfall shown both on a card and in the open-gap panel MUST be identical in both.
- **FR-150**: Changing the evaluation date MUST update both tabs together, and MUST NOT change which tab is in view.
- **FR-151**: The selected tab MUST be evident without relying on colour alone, MUST be selectable by keyboard, and MUST carry the accessible roles and state that assistive technology needs to announce it.

#### Motion and smoothness

- **FR-152**: Hover, focus, and selection changes MUST transition at the brand's interaction tempo rather than snapping.
- **FR-153**: Animated properties MUST be limited to those the browser can composite without re-laying out the page, so scrolling and hovering stay continuous.
- **FR-154**: Scrolling the page MUST remain visually continuous at the data volume stated in SC-108.
- **FR-155**: A screen awaiting data MUST reserve the space that data will occupy, so nothing jumps when it arrives.
- **FR-156**: When the operating system requests reduced motion, all transitions and animations MUST be suppressed while every state change stays clearly visible.
- **FR-157**: No state MUST be communicated by motion alone.
- **FR-158**: Dialogs MUST enter and leave smoothly, MUST move focus into themselves on opening, and MUST return focus to their trigger on closing.
- **FR-159**: The layout MUST NOT shift sideways when a page becomes long enough to scroll.
- **FR-160**: Interactive controls MUST present a pointer affordance and a visible pressed state.

#### Scrolling

- **FR-164**: No scrollbar may be rendered anywhere in the product, on the page or inside any region.
- **FR-165**: The page itself MUST be the only surface that scrolls. No region — board, column, panel, or dialog body — may introduce a scrolling area of its own, except a dialog too tall for the viewport, which MUST still show no scrollbar.
- **FR-166**: Hiding a scrollbar MUST NOT remove the ability to scroll: wheel, trackpad, touch, and keyboard scrolling MUST all continue to work wherever content extends beyond the viewport.

#### Scope boundaries

- **FR-161**: No derived figure introduced by this feature may be stored; the project lead is the only new stored fact.
- **FR-162**: No calculation rule from feature 001 may be changed by this feature.
- **FR-163**: Cards MUST NOT be draggable between columns in this release; a project's status is changed from the project record.

### Key Entities

- **Project** *(changed)*: gains an optional **lead**, referring to one employee. Everything else about a project is unchanged. The lead is a stored fact, not a derived one, and is independent of any assignment.
- **Board column**: a presentational grouping of projects sharing one status. Holds no data of its own; its membership and its count are derived from project status at display time.
- **Project card**: the presentation of one project on the board. Every figure it shows — headcount, shortfall, staffing state — is derived at display time from existing assignments and role requirements. It stores nothing.
- **Brand palette**: the named set of colours, radii, shadows, typefaces, and motion timings taken from the company website and recorded in [design-tokens.md](./design-tokens.md). Defined once, referenced everywhere.

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### Brand fidelity

- **SC-101**: 100% of colours rendered anywhere in the product resolve to a value in the brand palette; zero values from the previous palette remain.
- **SC-102**: A person shown the company website and the product side by side identifies them as the same organisation's work.
- **SC-103**: Changing one brand colour in its single definition changes it everywhere it appears, verified by changing one and observing every affected screen.
- **SC-104**: 100% of text passes its required contrast ratio — 4.5:1 for small text, 3:1 for large — measured across every screen and every badge.
- **SC-105**: 100% of focusable controls show a visible focus ring when reached by keyboard.
- **SC-106**: All five project statuses and all five load labels remain distinguishable when viewed without colour.

#### The board

- **SC-107**: A project manager can state how many projects are in each status within 5 seconds of the dashboard appearing, without scrolling or clicking.
- **SC-108**: The board renders and becomes usable within 2 seconds at 100 projects, 500 employees, and 2,000 assignments — the volume feature 001 is specified against.
- **SC-109**: Every project appears exactly once on the board; across a seeded portfolio, zero projects are missing and zero are duplicated.
- **SC-110**: A project manager can reach any project's record from the board in one action.
- **SC-111**: The board is fully usable at every width from handheld to desktop, with no horizontal scrolling of the page or of any region within it, and no scrollbar visible anywhere.
- **SC-112**: Every figure appearing both on a card and on the project's own record agrees, checked across a seeded portfolio covering fully staffed, short, surplus, and no-requirement projects.

#### Leads

- **SC-113**: A project manager can set or change a project's lead in under 15 seconds from the project record.
- **SC-114**: Every project either names a lead or states that none is set; zero projects display a blank or an invented lead.
- **SC-115**: After deleting an employee who leads projects, zero projects refer to a person who no longer exists.

#### Smoothness

- **SC-116**: Scrolling the dashboard sustains 60 frames per second on standard hardware at the volume in SC-108, with no frame taking longer than 50ms.
- **SC-117**: Cumulative layout shift on the dashboard is below 0.1 from first paint to fully loaded.
- **SC-118**: Zero interactive elements change state without a transition, and zero transitions play when reduced motion is requested.
- **SC-119**: Text is readable at first paint and does not reflow when the typefaces finish loading.
- **SC-120**: Every dialog returns focus to the control that opened it on close.

#### Preservation

- **SC-121**: Every acceptance scenario of feature 001 that covers delivered scope still passes after this feature ships — 60 are recorded, of which those under the deferred Story 7 are excluded.
- **SC-122**: The three people panels answer the same three questions with the same figures and the same orderings as before the redesign.
- **SC-123**: The shared calculation module's test suite passes unchanged, confirming no calculation rule was altered.

## Assumptions

- The brand values in [design-tokens.md](./design-tokens.md) were extracted from the live site on 2026-08-29 and are treated as authoritative. The site publishes no formal brand guide; roles were assigned from usage frequency and declaration context, and the evidence for each is recorded so any mapping can be challenged.
- The company website's own layout is not being copied — only its colours, typefaces, rounding, elevation, and motion timing. TeamFlow keeps its own information architecture.
- The brand publishes no amber and no neutral scale suitable for a five-step status system, so warning tones and intermediate greys are derived from the brand's own tint and neutral families rather than imported.
- "JIRA board" is read as a status-column kanban layout. Cards are not draggable in this release (FR-163); status is changed from the project record, which is where it is changed today.
- The project lead is a single person. Co-leads, deputies, and lead history are out of scope.
- The lead is an unvalidated reference to an employee — any employee may lead any project, whether or not they are assigned to it, and whether or not they hold a leadership role title.
- Light appearance only. A dark theme is out of scope; the brand site does not publish one.
- Both existing roles — Project Manager and Administrator — may set a project's lead, since setting a lead is changing a project, which a Project Manager may already do.
- Every derived figure on a card comes from the existing shared calculation module. This feature adds presentation, not arithmetic.
- Target browsers, hardware, and data volumes are those already stated by feature 001.
- Feature 001's dashboard requirements FR-072 to FR-077 remain in force and are satisfied by the Overview tab, not withdrawn.
