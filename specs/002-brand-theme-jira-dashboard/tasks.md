---

description: "Task list for Brand Theme and Project Board"
---

# Tasks: Brand Theme and Project Board

**Input**: Design documents from `/specs/002-brand-theme-jira-dashboard/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [design-tokens.md](./design-tokens.md)

**Tests**: Unchanged from feature 001 — automated tests cover `src/backend/calc` only. This feature changes no calculation, so it adds no calculation test. Its correctness properties are visual, dimensional, and temporal: contrast ratios, layout at width, frame rate, layout shift. Those are measured, and the measurements are recorded in Phase 8 rather than asserted in CI. The existing Vitest suite must still pass untouched (SC-123) — that is the guard proving no rule was altered.

**Organization**: Grouped by user story, in the priority order set by the plan. Each story leaves the application runnable and showable (Constitution I).

**Scope**: All six stories, FR-101 to FR-166. Nothing is deferred. Phase 9 reworks the dashboard layout after review — see the spec's Revision 2026-08-29.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on another unfinished task
- **[Story]**: Which user story the task serves
- Exact file paths appear in every task

## Path Conventions

Unchanged from feature 001. One deployable, NestJS serving Next.js, both halves under `src/`.

- Backend: `src/backend/`
- Front end: `src/web/`
- Calculation module: `src/backend/calc/` — **not opened by this feature**
- Schema: `prisma/schema.prisma`
- Seed: `seed/`

---

## Phase 1: Foundational — the token layer

**Purpose**: Establish the single definition of every brand value before anything consumes it. Nothing else in this feature can be styled correctly until this exists.

**Blocks**: every subsequent phase.

- [X] **T001** [P] [US1] Create `src/web/app/tokens.css` with tier 1, the raw brand values transcribed from [design-tokens.md](./design-tokens.md): brand ink `#141F40`, accent `#0145FE`, accent pressed `#003EE5`, surface tint `#F0F5F9`, panel `#FFFFFF`, hairline `#E2E9EF`, muted `#BEBEBE`, near-black `#000003`, gradient blue `#0C65F1`, deep navy `#091F5B`, deep teal `#052B42`, cyan `#44E6FE` and `#26E0FC`, success `#2AAE49`, danger `#E30707`, the six tints, and the neutral scale. Transcribe exactly — this file is the only place a hex may appear (FR-101, FR-102, D-01).
- [X] **T002** [US1] Add tier 2 to `src/web/app/tokens.css`: semantic aliases resolving to tier 1 — `--text-primary`, `--text-muted`, `--text-on-accent`, `--surface`, `--surface-raised`, `--border`, `--accent`, `--accent-pressed`, `--focus-ring`. Nothing outside this file may reference a tier 1 name (D-02).
- [X] **T003** [US1] Add the brand's metrics to `src/web/app/tokens.css`: radii (`--radius-card: 20px`, `--radius-large: 30px`, `--radius-control: 15px`, `--radius-pill: 48px`), shadows (`--shadow-ambient: 0 0 50px 0 rgba(0,0,0,0.05)`, `--shadow-elevated: 0 4px 25px 0 rgba(24,26,30,0.4)`, `--focus-ring: 0 0 0 3px rgba(20,31,64,0.5)`), and motion (`--motion-fast: 0.3s ease`) (FR-108, FR-109, FR-112, FR-152).
- [X] **T004** [US1] Add the brand gradients to `src/web/app/tokens.css` with their published stops, including the out-of-range percentages on the bold accent (`-2.84%`, `111.23%`) — reproducing them approximately changes the ramp visibly (FR-119).
- [X] **T005** [US1] Import `tokens.css` at the very top of `src/web/app/globals.css` and delete the old `:root` block entirely — `--bg`, `--panel`, `--ink`, `--muted`, `--line`, `--accent`, `--warn`, `--danger`. Deleted, not overridden (Constitution V).

**Checkpoint**: `tokens.css` is the only file in the repository containing a hex value.

---

## Phase 2: User Story 1 — The product wears the company brand (Priority: P1)

**Goal**: Every screen carries the brand's colours, typefaces, rounding, and elevation.

**Independent test**: Open every screen beside the company website and confirm no colour, radius, or shadow from the previous palette survives.

### Typography

- [X] **T006** [US1] Load Inter and IBM Plex Sans in `src/web/app/layout.tsx` via `next/font/google`, both self-hosted with `display: 'swap'`, exposing them as CSS variables. This is what supplies the fallback metric overrides that stop text reflowing when the webfonts land (FR-110, FR-111, D-03).
- [X] **T007** [US1] Set the body typeface to Inter in `src/web/app/globals.css` and make IBM Plex Sans available as a display face for headings and accent text (FR-110).

### Applying the palette

- [X] **T008** [US1] Rewrite the base rules in `src/web/app/globals.css` — `body`, `a`, `main`, `.shell` — against tier 2 tokens. Body text in `--text-primary`, page background in `--surface`, links in `--accent` (FR-103, FR-104, FR-105).
- [X] **T009** [US1] Restyle `.card`, `.dialog`, `.panel`, and `table` in `src/web/app/globals.css`: panel colour, `--radius-card`, `--shadow-ambient` on cards, `--shadow-elevated` on dialogs and overlays, `--border` on every edge (FR-105, FR-106, FR-108, FR-109).
- [X] **T010** [US1] Restyle the navigation in `src/web/app/globals.css` — `.nav`, `.nav a`, `.nav-links a.current`, `.nav-session` — with the accent marking the active item (FR-104).
- [X] **T011** [US1] Restyle form controls in `src/web/app/globals.css` — `input`, `select`, `label`, `button` and its `.link`, `.secondary`, `.danger`, and `:disabled` variants — using `--radius-control` and the accent with its pressed step (FR-104, FR-107, FR-108).
- [X] **T012** [US1] Give every focusable control the brand focus ring on `:focus-visible` in `src/web/app/globals.css`, and verify it is visible against both panel and tinted backgrounds (FR-112, SC-105).
- [X] **T013** [P] [US1] Retint the five project status badges — `.status-active`, `.status-planned`, `.status-on_hold`, `.status-completed`, `.status-cancelled` — in `src/web/app/globals.css` from the brand tint family, and add a non-colour distinction so status survives greyscale (FR-115, D-14, SC-106).
- [X] **T014** [P] [US1] Retint the five load badges — `.badge-unassigned`, `.badge-available`, `.badge-balanced`, `.badge-high_load`, `.badge-overallocated` — the same way, deriving the high-load tone from the brand's own tints since the brand publishes no amber (FR-116, FR-118, D-14, SC-106).
- [X] **T015** [P] [US1] Point success and danger states at the brand's published semantic colours in `src/web/app/globals.css`, including `.error`, `button.danger`, `.notice`, and `.warnings` (FR-117, FR-118).
- [X] **T016** [P] [US1] Restyle the remaining shared classes in `src/web/app/globals.css` — `.pill`, `.badge`, `.empty`, `.avatar`, `.avatar-initials`, `.filler`, `.figures`, `.score`, `.person` — against tokens (FR-101).
- [X] **T017** [US1] Measure contrast for every text-on-background pair the theme produces, small and large. Where a brand value fails, substitute the darker step from the same brand family for that text only, keeping the original for large text and fills. Record each measured pair and each substitution as a comment in `tokens.css` (FR-113, FR-114, D-15, SC-104).
- [X] **T018** [US1] Sweep `src/web/app/` and `src/web/components/` for any remaining hex, `rgb()`, or named colour and replace it with a token. Confirm by search that `tokens.css` is the only file containing one (FR-101, SC-101, SC-103).

**Checkpoint**: every screen is on brand. The dashboard is still the old table layout — correct at this point, and demonstrable.

---

## Phase 3: User Story 2 — The portfolio reads as a board (Priority: P2)

**Goal**: The dashboard presents every project as a card in a status column.

**Independent test**: Seed projects across all five statuses; confirm each appears exactly once, in the right column, with a counted heading.

**Depends on**: Phase 2 for the token layer.

### Board data

- [X] **T019** [US2] Extend `src/backend/views/dashboard.controller.ts` with a `board` section built from the `staffing` array the controller **already computes** for every project. Emit all five columns in the order Planned, Active, On hold, Completed, Cancelled, each with its status, label, count, and cards — including columns holding nothing (FR-120, FR-121, FR-122, FR-123, D-04).
- [X] **T020** [US2] Confirm by inspection that T019 introduced no additional Prisma query for staffing. The gaps panel keeps its `producesGaps` filter; the board deliberately does not, because a cancelled project still belongs on the board (D-04, FR-075).
- [X] **T021** [US2] Add the board types — `BoardColumn`, `ProjectCard`, and the `board` field on `Dashboard` — to `src/web/lib/api.ts` (FR-120).

### Board presentation

- [X] **T022** [US2] Create `src/web/components/ProjectBoard.tsx` rendering the columns from the payload, each with a heading naming its status and stating its count, and an explicit nothing-here state for empty columns (FR-122, FR-123).
- [X] **T023** [US2] Create the board layout in `src/web/app/globals.css`: a CSS grid of columns with `overflow-x: auto` on the board itself, so the board scrolls sideways without the page doing so (FR-124, D-09, SC-111).
- [X] **T024** [US2] Give each column `overflow-y: auto` and a bounded height, so a column holding many projects scrolls within itself rather than stretching the board (FR-126, D-09).
- [X] **T025** [US2] Add the handheld breakpoint in `src/web/app/globals.css`: columns stack vertically in status order and stay fully readable (FR-125, SC-111).
- [X] **T026** [US2] Replace the gaps table in `src/web/app/dashboard/page.tsx` with `ProjectBoard`, keeping the three existing panels in place. Delete the superseded markup rather than commenting it out (Constitution V).
- [X] **T027** [US2] Make the board keyboard-operable: cards are reachable in column order, focusable, and openable with the keyboard, carrying the brand focus ring from T012 (FR-129, FR-127).
- [X] **T028** [US2] Add the board's empty state for a portfolio with no projects at all — a stated absence, not an empty frame (FR-128).

**Checkpoint**: the dashboard is a board. Cards show name and status; lead and headcount arrive in the next two phases.

---

## Phase 4: User Story 3 — A project has a named lead (Priority: P3)

**Goal**: A project can record who leads it, and says so honestly when nobody does.

**Independent test**: Create a project with no lead and confirm it reads as having none; set one, confirm it appears; clear it, confirm it returns.

**Depends on**: Phase 3 only for where the lead is displayed; the data work is independent.

- [X] **T029** [US3] Add `leadEmployeeId String? @db.ObjectId` to the `Project` model in `prisma/schema.prisma` as a plain optional id, matching how `Assignment` already references employees (FR-139, FR-140, D-07).
- [X] **T030** [US3] Regenerate the Prisma client and confirm the existing Vitest suite still passes untouched (SC-123).
- [X] **T031** [US3] Accept and validate `leadEmployeeId` on create and update in `src/backend/projects/projects.controller.ts` — an ObjectId that must name an existing employee, explicitly clearable to nothing, using the existing Zod field helpers (FR-139, FR-141).
- [X] **T032** [US3] Return the lead as a resolved `{ employeeId, name, avatarUrl }` or `null` from the project read and list endpoints in `src/backend/projects/projects.controller.ts`, resolving names in one `findMany` over the lead ids rather than a query per project (FR-142).
- [X] **T033** [US3] Extend `deleteEmployeeWithAssignments` in `src/backend/common/cascade.ts` to clear `leadEmployeeId` on every project the deleted employee leads, inside the existing transaction (FR-144, D-08, SC-115).
- [X] **T034** [US3] Name the projects an employee leads in the delete confirmation returned by `src/backend/employees/`, alongside the assignments already named there (FR-144).
- [X] **T035** [US3] Add the lead to the project types and the create and update calls in `src/web/lib/api.ts` (FR-139).
- [X] **T036** [P] [US3] Create `src/web/components/LeadLine.tsx` showing the lead's portrait and name as a link to their record, or an explicit statement that no lead is set — never a blank and never a substitute person (FR-140, FR-142, FR-143).
- [X] **T037** [US3] Add a lead picker to the project form in `src/web/app/projects/[id]/page.tsx` and to project creation in `src/web/app/projects/page.tsx`: choose from the employee register, or clear (FR-141).
- [X] **T038** [US3] Show the lead on the project record in `src/web/app/projects/[id]/page.tsx` using `LeadLine` (FR-142).
- [X] **T039** [US3] Give some seeded projects a lead and deliberately leave others without one in `seed/index.ts`, including at least one lead who holds no assignment on the project they lead, so FR-145 is demonstrable (FR-146, Constitution X).

**Checkpoint**: leads are stored, displayed, editable, and survive employee deletion cleanly.

---

## Phase 5: User Story 4 — A card answers the standing questions (Priority: P4)

**Goal**: Each card carries name, status, lead, headcount, and staffing state.

**Independent test**: Seed fully staffed, short, surplus, and no-requirement projects; confirm every card figure matches the project's own record for the same date.

**Depends on**: Phase 3 for the board, Phase 4 for the lead.

- [X] **T040** [US4] Add `headcount` to each card in `src/backend/views/dashboard.controller.ts` using `activeHeadcount` from `src/backend/calc/utilization.ts` over the project's assignments — the existing distinct-person count, so somebody holding two roles on one project is counted once (FR-131, D-05).
- [X] **T041** [US4] Add `staffingStatus`, `totalShortfall`, and `shortRoles` to each card from the `staffingViews` output already in hand, with no recomputation (FR-130, FR-132, FR-133, FR-137).
- [X] **T042** [US4] Add the resolved `lead` to each card in `src/backend/views/dashboard.controller.ts`, fetching the named employees in one `findMany` over the lead ids (FR-130, FR-142).
- [X] **T043** [US4] Add the card's `people` and `peopleBeyond` in `src/backend/views/dashboard.controller.ts`, deduplicating fillers by employee across requirements and unrequested roles, capped at the display limit (FR-135, D-06).
- [X] **T044** [P] [US4] Create `src/web/components/AvatarStack.tsx` — overlapping portraits with an overflow count, falling back to initials where no portrait exists, reusing the existing `Avatar` component (FR-135).
- [X] **T045** [US4] Create `src/web/components/ProjectCard.tsx` showing name, status badge, `LeadLine`, headcount, staffing state, and `AvatarStack` (FR-130).
- [X] **T046** [US4] Show shortfall on the card: total short and the short roles named, for projects that have a gap (FR-132).
- [X] **T047** [US4] Handle the two non-gap card states distinctly in `ProjectCard.tsx`: fully staffed says so and reports no shortfall; **no declared requirements says exactly that and is never described as fully staffed** (FR-133, FR-134).
- [X] **T048** [US4] Style the card in `src/web/app/globals.css` against tokens — `--radius-card`, `--shadow-ambient`, `--border` — with a clear hierarchy from name down to portraits (FR-105, FR-108, FR-109).
- [X] **T049** [US4] Truncate an over-long project name visually while keeping it available in full on hover and to assistive technology, without reflowing the card (FR-136).
- [X] **T050** [US4] Wire the dashboard's evaluation date through the board so every card, badge, and figure reflects it (FR-138, FR-150).
- [X] **T051** [US4] Verify agreement: for a seeded portfolio covering all four staffing states, compare every figure appearing both on a card and on the project's own record for the same date, and confirm they match (FR-137, SC-112).

**Checkpoint**: the board is fully informative. Story 4's independent test passes.

---

## Phase 6: User Story 5 — The interface moves smoothly (Priority: P5)

**Goal**: Nothing snaps, jumps, flickers, or stutters.

**Independent test**: Exercise every hover, focus, dialog, filter, and scroll on a seeded database, then repeat with reduced motion requested.

**Depends on**: Phases 2 to 5 — the surfaces being tuned must exist first.

- [X] **T052** [US5] Apply `--motion-fast` to hover, focus, and selection changes across `src/web/app/globals.css`, declaring transitions **per property** and never as `transition: all`, which would sweep in layout-triggering properties (FR-152, D-10).
- [X] **T053** [US5] Audit every transition and animation and confine them to `transform`, `opacity`, and colour — the properties a browser composites without re-laying out the page (FR-153, D-10).
- [X] **T054** [US5] Add the global `prefers-reduced-motion: reduce` block to `src/web/app/globals.css`, zeroing durations product-wide in one rule so no call site can forget it (FR-156, D-11, SC-118).
- [X] **T055** [US5] Confirm no state is communicated by motion alone — every animated state change must also be visible when motion is suppressed (FR-157, SC-118).
- [X] **T056** [US5] Make `html { overflow-y: scroll }` permanent in `src/web/app/globals.css` so the scrollbar gutter is always reserved and the layout cannot jolt sideways between a short page and a long one (FR-159, D-12).
- [X] **T057** [US5] Replace the dashboard's loading text in `src/web/app/dashboard/page.tsx` with skeletons occupying the board's and rail's final dimensions (FR-155, D-13, SC-117).
- [X] **T058** [P] [US5] Do the same for the remaining screens — `projects/`, `employees/`, `allocation/` — so no screen jumps when its data arrives (FR-155, SC-117).
- [X] **T059** [US5] Give dialogs a composited enter and leave transition, move focus into the dialog on open, and return focus to the triggering control on close, across `ConfirmDeleteDialog`, `ReplacementDialog`, and `WarningDialog` (FR-158, SC-120).
- [X] **T060** [US5] Give every interactive control a pointer affordance and a visible pressed state (FR-160).
- [ ] **T061** [US5] Profile scrolling of the board and the dashboard at the volume in SC-108 and confirm 60fps with no frame exceeding 50ms. If a frame exceeds it, find the property forcing layout and remove it (FR-154, SC-116).
- [ ] **T062** [US5] Measure cumulative layout shift on the dashboard from first paint to fully loaded and confirm it is below 0.1 (SC-117).
- [ ] **T063** [US5] Confirm text is readable at first paint and does not reflow when the webfonts land (FR-111, SC-119).

**Checkpoint**: the product feels continuous, and behaves correctly for anyone who has asked for less motion.

---

## Phase 7: User Story 6 — The people questions stay answered (Priority: P6)

**Goal**: The three existing panels survive the redesign intact, beside the board.

**Independent test**: Seed overallocated people, spare capacity, and understaffed projects; confirm each still appears with the same figures and orderings as before.

**Depends on**: Phase 3 for the board they sit beside.

- [X] **T064** [US6] Lay out the dashboard in `src/web/app/globals.css` as board plus rail, the board primary and the three panels alongside (FR-147, FR-151).
- [X] **T065** [US6] Restyle the overallocated, spare-capacity, and open-gap panels in `src/web/app/dashboard/page.tsx` for the narrower rail, preserving every existing ordering, figure, link, and empty state (FR-148).
- [X] **T066** [US6] Add the breakpoint that moves the rail below the board when the two cannot sit side by side, keeping it fully usable (FR-151).
- [X] **T067** [US6] Verify each retained panel against feature 001's FR-072 to FR-077 one by one and confirm none has regressed (FR-147, SC-122).
- [X] **T068** [US6] Confirm a shortfall shown both on a card and in the open-gap panel is identical in both (FR-149, SC-112).
- [X] **T069** [US6] Confirm changing the evaluation date updates the board and all three panels together, from the one request (FR-150, D-04).

**Checkpoint**: the feature is complete. Every requirement FR-101 to FR-163 has an owner above.

---

## Phase 8: Verification and cross-cutting

**Purpose**: Prove the claims the specification makes rather than assuming them.

- [X] **T070** [P] Run the existing Vitest suite and confirm it passes **unchanged**, proving no calculation rule was altered (FR-162, SC-123).
- [X] **T071** [P] Confirm `src/backend/calc/` has no modifications in the diff for this feature. Any change there means a task went wrong (FR-162).
- [X] **T071a** [P] Confirm the schema diff contains exactly one addition — `Project.leadEmployeeId` — and that no headcount, shortfall, staffing state, or other derived figure has been persisted anywhere (FR-161, Constitution III).
- [X] **T072** [P] Search the repository and confirm `tokens.css` is the only file containing a hex, `rgb()`, or named colour (SC-101).
- [X] **T073** Change one brand value in `tokens.css`, confirm it changes everywhere it appears, and revert (SC-103, FR-102).
- [ ] **T074** Walk feature 001's acceptance scenarios for delivered scope and confirm each still passes (SC-121).
- [X] **T075** [P] View the board in greyscale and confirm all five statuses and all five load labels remain distinguishable (SC-106, FR-115, FR-116).
- [ ] **T076** [P] Tab through every screen and confirm every focusable control shows the focus ring (SC-105, FR-112).
- [ ] **T077** [P] Check the board at every width from handheld to desktop and confirm no horizontal page scrolling at any width (SC-111, FR-124, FR-125).
- [X] **T078** Confirm the seed still exercises every displayable state, now including led and unled projects and every status column populated (Constitution X, FR-146).
- [X] **T079** Time the board to usable at 100 projects, 500 employees, and 2,000 assignments (SC-108).
- [X] **T080** [P] Remove any dead CSS left by the old palette and the superseded gaps table (Constitution V).
- [X] **T081** Reconcile [design-tokens.md](./design-tokens.md) against `tokens.css` value by value, and record any deliberate divergence — a contrast substitution from T017, or the derived warning tone from T014 — with its reason.
- [ ] **T082** [P] Put the product and the company website side by side in front of somebody who has seen neither and confirm they read them as one organisation's work (SC-102).
- [ ] **T083** [P] Confirm a project manager can state how many projects sit in each status within 5 seconds of the board appearing, without scrolling or clicking (SC-107).
- [X] **T084** [P] Count the cards on the board against the project register and confirm every project appears exactly once — zero missing, zero duplicated (SC-109, FR-121).
- [X] **T085** [P] Confirm any project's full record is reachable from its card in one action (SC-110, FR-127).
- [X] **T086** Time setting and changing a project's lead from the project record and confirm it takes under 15 seconds (SC-113).
- [X] **T087** [P] Walk every card on a seeded board and confirm each either names a lead or states that none is set — zero blanks, zero invented leads (SC-114, FR-140).

---

## Phase 9: Rework — two tabs, and no scrollbars (2026-08-29)

**Why**: the board and the people panels were built side by side and collided — the board's columns ran under the panel rail at ordinary desktop widths — and the screen ended up with three scrolling surfaces on it. See the spec's Revision 2026-08-29 and the plan's D-16 to D-19.

**Supersedes**: T023, T024, T025, T026, T056, T064, T066. Those are left checked and their history intact; the tasks below replace what they built.

### The tabs

- [X] **T088** [US6] Create `src/web/components/DashboardTabs.tsx`: a tablist of Overview and Board carrying `role="tablist"`, `role="tab"`, `aria-selected`, and `aria-controls`, operable by keyboard (FR-147, FR-151).
- [X] **T089** [US6] Style the tabs in `src/web/app/globals.css` against tokens, marking the selected tab with **both** the accent colour and an underline, so selection does not rest on colour alone (FR-151).
- [X] **T090** [US6] Restructure `src/web/app/dashboard/page.tsx` around the two tabs: Overview renders the three panels full width, Board renders the board full width. Delete `.dashboard-layout` and `.dashboard-rail` rather than leaving them unused (FR-147, Constitution V).
- [X] **T091** [US6] Keep the evaluation-date control above the tabs, so changing the date updates both tabs and does not change which tab is in view (FR-150).
- [X] **T092** [US6] Confirm the three panels keep their ordering, figures, links, and empty states after the move (FR-148, SC-122).

### Removing the scrollbars

- [X] **T093** [US2] Replace the board's fixed-width scrolling grid in `src/web/app/globals.css` with `repeat(auto-fit, minmax(220px, 1fr))`, and delete `overflow-x` from `.board`. Five columns fit a desktop row; narrower viewports reflow onto further rows (FR-124, D-18).
- [X] **T094** [US2] Delete `max-height` from `.board-column` and `overflow-y` from `.column-body`, so a column grows to hold its cards (FR-126, D-17).
- [X] **T095** [US5] Delete `html { overflow-y: scroll }`. With no scrollbar drawn there is no gutter to reserve, and FR-159 is satisfied by the absence rather than by the reservation (D-12 superseded, D-17).
- [X] **T096** [US5] Hide every remaining scrollbar in `src/web/app/globals.css` with `scrollbar-width: none` and `::-webkit-scrollbar { display: none }`. **Never `overflow: hidden`** — that would remove the ability to scroll and cut off content (FR-164, FR-166, D-19).
- [X] **T097** [US5] Confirm the page still scrolls by wheel, trackpad, and keyboard with no scrollbar visible, and that no content is unreachable (FR-166).
- [X] **T098** [US2] Delete the now-unused `--board-column-width` and `--board-column-max-height` tokens from `src/web/app/tokens.css` (Constitution V).
- [X] **T099** Search `src/web` for any remaining `overflow-x`, `overflow-y`, or `overflow:` declaration and confirm each one left is deliberate and draws no bar (FR-164, FR-165).

### Re-verification

- [ ] **T100** Confirm the board shows no horizontal scrolling at any width from handheld to desktop, and that all five columns are reachable (FR-124, SC-111).
- [X] **T101** Re-run the card-versus-record figure comparison after the restructure and confirm it is still zero mismatches (SC-112, FR-137).
- [X] **T102** Re-run the existing Vitest suite and confirm it still passes unchanged (SC-123).

---

## Dependencies and Execution Order

### Phase dependencies

- **Phase 1** blocks everything. The token layer must exist before anything references it.
- **Phase 2 (US1)** depends on Phase 1. Delivers a fully rebranded, still-table-based product — a complete demonstrable slice.
- **Phase 3 (US2)** depends on Phase 2.
- **Phase 4 (US3)** depends on Phase 1 only for styling; **its backend work is independent of Phases 2 and 3** and can proceed alongside them.
- **Phase 5 (US4)** depends on Phase 3 and Phase 4.
- **Phase 6 (US5)** depends on Phases 2 to 5 — the surfaces must exist before their motion is tuned.
- **Phase 7 (US6)** depends on Phase 3.
- **Phase 8** depends on everything.

### The one real dependency worth stating

Story 4's cards cannot show a lead until Story 3 stores one. Everything else in this feature is either independent or blocked only by the token layer. In particular the schema and controller work in Phase 4 (T029 to T035) shares no file with the board work in Phase 3 and can run in parallel with it.

### Within each phase

Tasks marked **[P]** touch different files and may run together. Unmarked tasks in a phase touch a shared file — usually `globals.css`, `dashboard.controller.ts`, or `dashboard/page.tsx` — and should run in listed order to avoid conflicting edits.

### Parallel opportunities

- **T001** starts immediately with nothing before it.
- **T013, T014, T015, T016** retint independent class groups and can run together once T005 lands.
- **T029 to T035** (lead: schema, controller, cascade, API types) run alongside Phase 3.
- **T036** and **T044** are new components sharing no file with anything else.
- **T070, T071, T072, T075, T076, T077, T080** are independent checks and can run together at the end.

## Implementation Strategy

### First demonstrable slice: Phases 1 and 2

The product is fully on brand with its existing layout. Nothing is half-built, and the change is immediately visible on every screen. If work stopped here it would still be a coherent delivery.

### Incremental delivery

1. Phases 1 and 2 — on brand.
2. Phase 3 — the dashboard becomes a board.
3. Phases 4 and 5 — cards become informative.
4. Phase 6 — it feels smooth.
5. Phase 7 — the people rail is settled beside it.
6. Phase 8 — the claims are proven.

### If the clock runs out

Cut from the bottom of the priority list and update the spec to match — defer, do not fake (Constitution, Scope under pressure).

- **Phase 7 cannot be cut.** It preserves shipped requirements FR-072 to FR-077. If the rail is not placed, the dashboard has lost capability, which is a regression rather than a deferral.
- **Phase 6 can be reduced** to T052, T054, and T056 — the interaction tempo, the reduced-motion rule, and the scrollbar gutter. Those three carry most of the perceived smoothness for a fraction of the work. Skeletons and profiling can follow.
- **Phase 5 can be reduced** to headcount and staffing state, deferring the avatar stack (T043, T044). Cards stay useful without portraits.
- **Phase 4 is the smallest candidate for whole deferral.** Cards would show "no lead set" everywhere, which is honest but makes Story 3 pointless. Cut it only if Phases 2 and 3 are at risk.

## Notes

- `src/backend/calc/` is not opened by this feature. T071 makes that a checkable claim rather than an intention.
- The board adds no Prisma query for staffing — the controller already computes it for every project and discards most of it. The only new fetch is the leads, in one `findMany`.
- Every hex in this file is quoted from [design-tokens.md](./design-tokens.md), which records the evidence for each. If a value there is wrong, correct it there and in `tokens.css`, nowhere else.
- Contrast substitutions from T017 are the one sanctioned divergence from the brand's published values. Each is recorded with its measurement, per T081.
