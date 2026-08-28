# Implementation Plan: Brand Theme and Project Board

**Branch**: `002-brand-theme-jira-dashboard` | **Date**: 2026-08-29 | **Revision**: 2 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-brand-theme-jira-dashboard/spec.md`, brand extraction in [design-tokens.md](./design-tokens.md)

## Summary

Three changes to a product that already works. First, the entire palette, typography, rounding, elevation, and motion timing are replaced with values taken from `niftycoders.com`, defined in one file and referenced everywhere. Second, the dashboard's flat gaps table becomes a **status-column board** of project cards, each carrying the project's name, status, lead, headcount, and staffing state, with the three existing people panels retained on an Overview tab beside a Board tab. Third, motion and loading behaviour are tightened so that nothing snaps, jumps, or stutters.

The critical property of this plan is how little it disturbs. **No calculation changes.** `activeHeadcount` already counts distinct people on a date, `staffingViews` already returns per-project shortfalls with named, portrait-bearing fillers, and the dashboard controller already computes staffing for *every* project before discarding all but the gaps. The board is therefore assembled from data that is already fetched and already derived — it adds a projection, not a query and not a rule.

Exactly one new stored fact is introduced: an optional `leadEmployeeId` on `Project`. Everything else on a card is derived at render time from assignments, as Constitution III requires.

## Technical Context

**Language/Version**: TypeScript 5.7 on Node.js 22 LTS — unchanged

**Primary Dependencies**: Unchanged. NestJS 11 serving Next.js 15 (App Router, React 19), Prisma 6 on MongoDB, Zod, Argon2id. **No new runtime dependency is added by this feature** — no CSS framework, no CSS-in-JS library, no drag-and-drop library, no animation library

**Storage**: MongoDB 7, single-node replica set — unchanged. One optional field added to `Project`

**Testing**: Vitest over `src/backend/calc`, unchanged and expected to pass untouched (SC-123). This feature adds no calculation, so it adds no calculation test. Theme, layout, contrast, and motion are verified by using the application, per the constitution's testing policy

**Target Platform**: Evergreen desktop browsers plus handheld widths, which this feature makes a first-class requirement rather than an afterthought (FR-125)

**Project Type**: Single deployable web application — unchanged

**Performance Goals**: Board usable within 2 seconds and scrolling at 60fps at 100 projects, 500 employees, 2,000 assignments (SC-108, SC-116). Cumulative layout shift below 0.1 (SC-117)

**Constraints**: One definition per brand value (FR-102). No derived figure stored or recomputed outside `src/backend/calc` (FR-137, FR-161, FR-162). Contrast never traded for hex fidelity (FR-114). No colour-only signalling (FR-115, FR-116, FR-157). Reduced motion fully honoured (FR-156)

**Scale/Scope**: 6 stories, 66 requirements (FR-101 to FR-166), 23 success criteria. Touches every screen for the theme; substantially rewrites one screen

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution `v1.0.0`. Evaluated principle by principle against this feature specifically.

| # | Principle | Assessment | How this plan complies |
|---|-----------|-----------|------------------------|
| I | Ship in demonstrable slices | **Pass** | Six stories in dependency order, each leaving the app runnable. The theme lands first and is visible immediately; the board replaces the gaps table in one move rather than sitting half-built beside it. No "coming soon" surface at any point |
| II | One source of derived truth | **Pass** | Every figure on a card comes from `src/backend/calc`. Headcount uses the existing `activeHeadcount`; shortfall and staffing state use the existing `staffingViews`. The card computes nothing — the risk this principle guards against is precisely a card and a project page disagreeing, which FR-137 and SC-112 make a testable failure |
| III | The assignment is the only primitive | **Pass, with a stated addition** | `leadEmployeeId` is new stored data, and that needs justifying against a principle that forbids shortcut fields. It is permitted because it is **not derivable and not a cache**: who leads a project is an independent fact, not a summary of assignments. The alternatives were both derivations — highest allocation, or a role named "Lead" — and both were rejected in the spec's clarifications as heuristics that would name the wrong person. FR-145 keeps the distinction sharp: leading a project grants no assignment and adds nothing to headcount. No count, percentage, or staffing figure is stored |
| IV | Respect the established architecture | **Pass** | The board's data is assembled in `src/backend/views/dashboard.controller.ts`, where dashboard shaping already lives. Card presentation goes in `src/web/components`, where components already live. Styling stays in plain CSS in `src/web/app`, where styling already lives. No new layer, no parallel structure, no second way of styling |
| V | Clean code is not optional | **Pass** | The old palette is deleted, not overridden. Superseded dashboard markup is removed, not commented out. A brand value appears once |
| VI | Code explains itself | **Pass** | Token names carry the meaning (`--brand-ink`, `--hairline`), so no comment restates a hex. The few comments are reserved for non-obvious intent: why the focus ring is that alpha, why scrollbars are hidden rather than disabled, why a gradient's stops fall outside 0–100% |
| VII | Simplicity over extensibility | **Pass** | No CSS framework, no CSS-in-JS, no animation library, no drag-and-drop library. The board is CSS grid and flexbox over data the dashboard already fetches. Cards are deliberately not draggable (FR-163) — drag-and-drop is the single most expensive part of a JIRA-like board and buys nothing the project record does not already do |
| VIII | Warn, never block | **Pass** | Shortfalls and surpluses are surfaced on cards as visible states, never as errors. A project with no declared requirements says so rather than being scored (FR-134) |
| IX | Explainable numbers | **Pass** | A card's headcount and shortfall are stated with their basis — which roles are short, and by how many — and every card names its evaluation date through the board's date control (FR-138) |
| X | Always populated | **Pass** | The seed must give some projects a lead and leave others without one (FR-146), so both states are demonstrable, and must continue to populate every status column so no column is empty on the demo path |

**Workflow rules**: testing scope is unchanged. **No commit will be made without explicit permission in the moment.** If the clock runs short, stories are cut from the bottom of the priority list and the spec is updated to say so.

**Post-Phase 1 re-check**: to be re-evaluated once the token file and board payload exist. The Principle III addition above is the only entry expected in Complexity Tracking, and it is argued rather than waived.

## Project Structure

### Documentation (this feature)

```text
specs/002-brand-theme-jira-dashboard/
├── spec.md              # Feature specification
├── plan.md              # This file
├── design-tokens.md     # Brand extraction with evidence - the authority for every brand value
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Task breakdown
```

### Source Code (repository root)

The layout established by feature 001 is unchanged. Files this feature adds are marked **NEW**; files it changes are marked **CHANGED**.

```text
prisma/
└── schema.prisma                          # CHANGED  Project gains leadEmployeeId

src/
├── backend/
│   ├── calc/                              # UNTOUCHED - no rule changes (FR-162, SC-123)
│   ├── common/
│   │   └── cascade.ts                     # CHANGED  clear leads on employee delete (FR-144)
│   ├── projects/
│   │   └── projects.controller.ts         # CHANGED  accept, return, and validate the lead
│   └── views/
│       └── dashboard.controller.ts        # CHANGED  add the board projection to the payload
│
└── web/
    ├── app/
    │   ├── tokens.css                     # NEW      the single definition of every brand value
    │   ├── globals.css                    # CHANGED  old palette deleted; everything references tokens
    │   ├── layout.tsx                     # CHANGED  Inter + IBM Plex Sans via next/font
    │   ├── dashboard/page.tsx             # CHANGED  two tabs: Overview and Board
    │   └── projects/[id]/page.tsx         # CHANGED  lead picker and display
    ├── components/
    │   ├── DashboardTabs.tsx              # NEW      Overview / Board, keyboard-operable
    │   ├── ProjectBoard.tsx               # NEW      the columns
    │   ├── ProjectCard.tsx                # NEW      one project
    │   ├── AvatarStack.tsx                # NEW      overlapping portraits with an overflow count
    │   ├── LeadLine.tsx                   # NEW      lead, or an honest statement that none is set
    │   └── (existing components)          # CHANGED  restyled against tokens, no logic changes
    └── lib/api.ts                         # CHANGED  board types, lead on project types

seed/
└── index.ts                               # CHANGED  leads on some projects, none on others
```

**Structure Decision**: no new directory and no new layer. Every file above sits where feature 001's structure already says that kind of code belongs, which is what Constitution IV demands of a follow-up feature. The one genuinely new concept — a design token layer — is given its own file rather than being appended to `globals.css`, because FR-102 and SC-103 require a *single place* to change a brand value, and a `:root` block buried above four hundred lines of component CSS satisfies that on paper but not in practice.

Three points are load-bearing:

- **`src/backend/calc/` is not opened by this feature.** If a task finds itself editing a calculation, the task is wrong. The board reuses `activeHeadcount` and `staffingViews` exactly as they are.
- **The board costs no additional query.** `DashboardController.read` already calls `staffingViews` over *all* projects and then filters to those with gaps. The board consumes the unfiltered array. The only new fetch is the small set of employees named as leads.
- **Plain CSS stays.** Feature 001 chose plain CSS with custom properties. Introducing Tailwind or styled-components here would create the parallel structure Constitution IV forbids, and would be a second way to do something already solved. The brand site uses styled-components; that is a fact about the brand site, not an instruction to this codebase.

## Phase 0 — Decisions

| # | Decision | Rationale | Rejected alternative |
|---|----------|-----------|---------------------|
| D-01 | Brand values live in `tokens.css`, imported first by `globals.css` | One file to change, one file to audit against `design-tokens.md`. Makes SC-103 a five-second check | Extending the existing `:root` — technically one place, but not a legible one |
| D-02 | Semantic aliases layer over raw brand values | `--status-active-bg` resolving to a brand tint means a status can be recoloured without hunting for a hex, and it keeps the raw palette honest to the source | Referencing raw brand names at every use site, which couples meaning to appearance |
| D-03 | Fonts via `next/font/google` for Inter and IBM Plex Sans | Self-hosts the files, emits `font-display: swap`, and generates the fallback metric overrides automatically — which is exactly the mechanism the brand site uses to avoid reflow, and directly satisfies FR-111 and SC-119 | Linking Google Fonts at runtime: a third-party request on every load and a reflow when it lands |
| D-04 | The board is a new section on the **existing** `/api/dashboard` payload | One request keeps both tabs on one evaluation date, which is what makes FR-149 and FR-150 true by construction rather than by discipline. It also means switching tabs costs no request | A second endpoint, which would let the two tabs drift to different dates |
| D-05 | Headcount comes from `activeHeadcount(assignments filtered to the project, asOf)` | It is the existing distinct-person count, so a card and a project page cannot disagree (FR-131, SC-112) | Counting `fillers` across requirements, which double-counts anyone holding two roles on one project |
| D-06 | Card avatars are taken from the fillers `staffingViews` already returns | The names and portraits are already fetched and already sorted. Deduplicated by employee, capped, with an overflow count (FR-135) | A separate query per project — a query per row, which the plan for 001 explicitly ruled out |
| D-07 | `leadEmployeeId` is a plain optional ObjectId, not a Prisma relation | Matches how `Assignment` already references employees and projects in this schema. Consistency with the established pattern (Constitution IV) | A declared relation, which the MongoDB connector supports but which no other model here uses |
| D-08 | Lead clearing on employee delete joins the existing cascade in `common/cascade.ts` | Deletion already runs as a transaction that detaches successors and removes assignments; the lead is one more statement inside it. Leaving it out would break FR-144 and strand a dangling reference | A background cleanup or a nullable read-time guard, both of which leave wrong data in the database |
| D-09 | ~~Columns are a CSS grid with `overflow-x: auto` on the board and `overflow-y: auto` on each column~~ **Superseded by D-16 and D-17** | — | — |
| D-10 | Only `transform`, `opacity`, and colour are animated | These are the properties a browser composites without re-laying out the page, which is what makes 60fps achievable rather than hoped for (FR-153, SC-116) | Animating width, height, or offsets, which forces layout on every frame |
| D-11 | `prefers-reduced-motion` handled once, globally | One rule that zeroes durations product-wide cannot be forgotten at a call site (FR-156, SC-118) | Per-component handling, which is forgotten exactly once and then ships |
| D-12 | ~~`html { overflow-y: scroll }` made permanent~~ **Superseded by D-17** — a permanently reserved gutter means a permanently visible scrollbar, which is the opposite of what FR-164 now requires. With no scrollbar drawn at all, there is no gutter to reserve and no jolt to prevent, so FR-159 is satisfied more completely than the reservation achieved | — |
| D-13 | Loading states reserve the final layout | Skeletons sized to the content they replace are what keep cumulative layout shift under 0.1 (FR-155, SC-117) | A centred spinner, which guarantees a jump when data arrives |
| D-14 | Status and load are carried by shape and text as well as colour | Required by FR-115, FR-116, and SC-106, and it is also what keeps the board readable to anyone who does not distinguish the brand's blues | Colour-only chips |
| D-15 | Contrast is checked per token pair and the darker brand step substituted where small text fails | FR-113 and FR-114. The brand's muted grey against a white panel is the pair most likely to fail and must be measured, not assumed | Shipping the brand hex everywhere and hoping |

### Phase 0 revision — 2026-08-29

Taken after seeing the built dashboard. D-09 and D-12 are superseded; the reasoning is recorded rather than edited away, because both were wrong for the same reason and the reason is worth keeping.

| # | Decision | Rationale | Rejected alternative |
|---|----------|-----------|---------------------|
| D-16 | The board and the people panels become **two tabs on the dashboard**, not two regions side by side | Side by side, the two competed for width at every viewport size, and at ordinary desktop widths the board's columns ran underneath the panel rail. Narrowing either one to fit the other makes both worse: the board wants five columns, the panels want readable tables. Tabs remove the contention instead of tuning it — each surface gets the entire width and neither constrains the other. This is also why the collision was not simply a CSS bug to patch: the layout was over-subscribed by design | Keeping the rail and fixing the overlap with `min-width: 0` and a narrower board. It would have stopped the overlap and left both surfaces cramped, which is the actual complaint. Also rejected: moving the rail below the board permanently, which buries the people questions under a full-height board |
| D-17 | **No scrollbar is drawn anywhere**, and no region scrolls inside itself | Three scrolling surfaces were stacked on one screen — the page gutter, the board sideways, each column vertically. The fix is ordered: first stop *needing* to scroll (full width fits five columns; columns grow to hold their cards), then hide what the browser would still paint. Hiding alone would have been a cosmetic patch over a layout that still trapped content in nested scroll regions | `scrollbar-gutter: stable`, which still paints a visible track. Custom-styled thin scrollbars, which are still scrollbars. Leaving column scrolling in place and hiding only the page bar, which would hide the fact that cards were cut off |
| D-18 | The board is `repeat(auto-fit, minmax(220px, 1fr))` rather than fixed-width columns | One rule covers every width: five columns in a row on a desktop, fewer as the viewport narrows, one on a handheld — with no media query for the board and no horizontal overflow at any size (FR-124) | Fixed 300px columns with media-query breakpoints, which is what produced the overflow in the first place |
| D-19 | Scrolling is hidden with `scrollbar-width: none` plus `::-webkit-scrollbar { display: none }`, never with `overflow: hidden` | `overflow: hidden` would remove the *ability* to scroll, cutting off any content past the fold. These two hide only the indicator, so wheel, trackpad, touch, and keyboard scrolling all still work — which FR-166 requires | `overflow: hidden` on the page, which trades a cosmetic complaint for lost content |

## Phase 1 — Design notes

### The board payload

`DashboardController.read` gains a `board` section built from the `staffing` array it already computes. Sketch, not final code:

```text
board: {
  columns: [
    { status, label, count, projects: [ card, ... ] },   // one per ProjectStatus, always all five
    ...
  ]
}

card: {
  projectId, projectName, status,
  lead: { employeeId, name, avatarUrl } | null,          // null means none set - FR-140
  headcount,                                             // activeHeadcount, distinct people - D-05
  staffingStatus, totalShortfall,
  shortRoles: [ { roleName, filledHeadcount, requiredHeadcount } ],
  people: [ { employeeId, name, avatarUrl } ],           // deduplicated fillers, capped - D-06
  peopleBeyond                                           // overflow count for the stack
}
```

Columns are emitted for **all five statuses regardless of contents** (FR-123), in the fixed order Planned, Active, On hold, Completed, Cancelled. The gaps panel keeps filtering to `producesGaps`; the board does not, because a cancelled project still belongs on the board.

One extra fetch is introduced: the employees named as leads, by id. It is a single `findMany` over a small set, not a query per project.

### The token layer

`tokens.css` holds three tiers, in this order:

1. **Raw brand values** — named for what they are, transcribed from `design-tokens.md` and changed only when the brand changes.
2. **Semantic aliases** — named for their job (`--text-primary`, `--surface`, `--border`, `--focus-ring`), resolving to tier 1.
3. **Component roles** — status and load tints, board and card metrics, resolving to tiers 1 and 2.

`globals.css` and every component reference tier 2 or tier 3. Nothing outside `tokens.css` contains a hex.

### Motion

One global block sets the brand tempo as `--motion-fast: 0.3s ease`, one rule suppresses everything under `prefers-reduced-motion: reduce`, and transitions are declared per property — never `transition: all`, which would sweep in layout-triggering properties and quietly break D-10.

## Complexity Tracking

One entry. It is argued in the Constitution Check above rather than waived.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `Project.leadEmployeeId` adds stored data to a model whose relationships are otherwise expressed only as assignments (Principle III) | FR-139 to FR-146. Who leads a project is not derivable from assignments, and a card must be able to name a lead truthfully | Both derivations were considered and rejected in the spec's clarifications. "Highest allocation" names the busiest person, who is frequently not the lead; "a role called Lead" is silent whenever a project has not declared that role. Both would put a wrong or missing name on a card that claims to state a fact. Principle III forbids shortcut fields and cached totals — this is neither |

## Scope for this release

| Story | Priority | Status | Requirements |
|-------|----------|--------|--------------|
| The product wears the company brand | P1 | In scope | FR-101 to FR-119 |
| The portfolio reads as a board | P2 | In scope | FR-120 to FR-129 |
| A project has a named lead | P3 | In scope | FR-139 to FR-146 |
| A card answers the standing questions | P4 | In scope | FR-130 to FR-138 |
| The interface moves smoothly | P5 | In scope | FR-152 to FR-160 |
| The people questions stay answered, on two tabs | P6 | In scope | FR-147 to FR-151 |
| No scrollbars anywhere | - | In scope | FR-164 to FR-166 |
| Scope boundaries | - | In scope | FR-161 to FR-163 |

**In scope: 66 of 66 requirements.** Nothing is deferred. If the clock runs short, the cut is taken from the bottom of the priority list and recorded in the spec, per the constitution.

## Known gaps carried deliberately

| Gap | What breaks | Why carried | Cost to close later |
|-----|-------------|-------------|--------------------|
| Cards cannot be dragged between columns | A manager who expects JIRA's drag-to-change-status must open the project record instead | Drag-and-drop is the most expensive element of a board by a wide margin — pointer and keyboard interaction, live reordering, optimistic update, rollback on failure — and it duplicates a control that already exists. Constitution VII. Recorded as FR-163 so it reads as a decision, not an omission | Moderate. The board's data shape does not need to change; the work is entirely interaction and an optimistic status update |
| Light appearance only | Anyone working in a dark environment gets a bright screen | The brand publishes no dark palette, so a dark theme would be invention rather than brand fidelity — the opposite of this feature's purpose | Small once the brand defines one, because every colour already resolves through tokens. That is much of the point of D-01 |
| One lead per project, no history | Co-leads cannot be recorded, and a handover leaves no trace | The board needs one name on a card. Multi-lead is a data-model question that no requirement here asks for | Small for co-leads, moderate for history, which would need its own record like `Replacement` |
| No automated visual or contrast regression test | A future change can reintroduce an off-brand colour or a failing contrast pair without CI noticing | The constitution scopes automated testing to the calculation module. Contrast is verified once by measurement during this build | Small. A token-file lint that rejects hexes outside the brand list would catch most of it |
| Board not virtualised | A portfolio far beyond 100 projects would render every card | 100 projects is the specified volume, and column-level scrolling keeps the DOM proportionate to the portfolio, not to a page of it | Small, and localised to the column component |

## Phase status

| Phase | Output | Status |
|-------|--------|--------|
| 0 — Decisions | D-01 to D-15 above | Complete |
| 1 — Design notes | Board payload, token tiers, motion above | Complete |
| 2 — Task breakdown | [tasks.md](./tasks.md) | Complete |

## Note on the constitution question left open by feature 001

Feature 001's plan closes by recording that **Constitution VIII names three states the tool exists to surface — overallocation, understaffed projects, and knowledge concentration — and that the specification covers only the first two.** That question is still open and this feature does not settle it.

It is worth restating here for one reason: this feature redesigns the surface where such a panel would live. If knowledge concentration is later added to the spec, it becomes a fourth panel in the rail or a badge on a card, and the board's column-and-rail layout accommodates either without rework. No decision is being taken now, and none is being foreclosed.
