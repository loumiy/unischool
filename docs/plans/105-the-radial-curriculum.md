# Plan 105 — The radial curriculum

*Planning document only — no gameplay code is changed by this file. Its job
is to turn the owner's pick from a round of Curriculum tab mockups (October
2026) into PRs: the tab's forty-two rows give way to one radial drawing of
the whole curriculum, entry courses at the centre and capstones at the rim,
that draws only what the college has opened and fills the screen between
two side panels.*

**Status: Landed, and since shelved.** The owner played it and found it too busy and confusing;
a simplified round (one school at a time, one panel) was mocked up and also
set aside, and the owner chose to go back to the List. The Curriculum tab is
the list again, and the History tab and Final Report lose the replay. Only
105E stays in the game: each course's `completedWeek` is still recorded and
derived on load, so saves carry it if the drawing returns. The whole build is
kept in git: it is main at `4f453cf` (PR #388 plus #389's upright school
names); restoring it is `git revert` of the commit that shelved it.

As landed, before it was shelved: A, B–D, E–F and G in four commits on one branch. The
owner answered the five decisions as proposed (§4). Two departures, both the
owner's, made while B landed: the drawing carries no caption until the pointer
is on a course, and cross-program prerequisites are not drawn at all (§2's
rule 3 and §3.4, below).

---

## 0. The owner's ask

> "Come up with some ways to completely change the curriculum UI. I want to
> be able to showcase the detail of each individual course, while avoiding
> overwhelming the player with a big wall of courses. I want progress
> through the curriculum to be enticing and then rewarding."

Three directions were mocked up as clickable canvases on a Year 38 save
with the real catalog: the **Hall Facade** (each hall a building, each
program a window, each course a pane), the **Card Catalogue** (a drawer per
school, a divider per program, an index card per course) and a **radial
tree**. The owner picked the radial tree and shaped it in three rounds:

> "Try modeling the curriculum as a radial tech tree; T1s in the middle,
> which branch out to T2s, then T3s, then T4s."

> "Could you make it so the tree grows as you develop, rather than
> appearing in full but not lit up?"

> "The tree / constellation should take up the full space, with info panels
> on the sides, rather than the tree sitting in one window. … And remove
> references to 'buds' — the 'tree' just describes the shape, it doesn't
> need to be a metaphor."

So the picks are:

- **Radial by tier.** Entry courses (tier 1) on the inner ring, the core
  quartet (tier 2), the advanced quartet (tier 3), the capstone (the 310)
  at the rim. Graduate programs sit beyond the rim of their home school.
- **Only what is open is drawn.** A course appears when it is taught,
  being written, or could be started. A program appears when it is housed.
  Nothing else is drawn: no grey skeleton of the 473.
- **Full stage.** The drawing takes the whole middle of the tab, with panels
  down both sides, not a framed picture inside a panel.
- **Plain words.** "Tree" and "branch" describe the shape; the copy never
  talks about buds, sprouts or growing. A course is *taught*, *being
  written*, *ready to start* or *not open yet*.

## 1. Where the game is now

Read against `main` at `0aca0aa`.

- **The tab** is `tabs/CurriculumTab.tsx` (1,416 lines):
  - one `SchoolGroupView` per school (binder dividers, Plan 90), one
    `ProgramRowView` per housed program (`data-program`, ten cells in tier
    order with rules at 1, 5 and 9), folded to one line by default
    (`useCollapse('program:<id>', true)`, Plan 76B);
  - `CourseCell` (`id="course-<id>"`) with draggable instructor chips that
    swap by `SWAP_COURSE_FACULTY` (1253–1267);
  - `RowAction`, the row's next course with Develop / Choose… / "All N with
    X" (801–902), also drawn in the hall panel's `ProgramTile` since Plan
    104A;
  - `CourseDrawer` (567–~790): instructor choice, `START_DEVELOPMENT`,
    `REASSIGN_COURSE_FACULTY`, the market search;
  - `CommitteePanel` / `CommitteeBox` (1127–1212) and `FilterBar`
    (1043–1120: search, status, Below 78, No instructor, One course from
    established, Waiting on {field});
  - targets `program:`, `course:`, `field:`, `belowA`, `unstaffed`,
    `curriculum.committee` and a school key (1292–1318).
- **What is revealed** is derived, never stored (CurriculumTab 43–58): a
  program's courses show once it is housed; its tier-3s and capstone once
  `program-established:<prefix>` is reached; a graduate program in full once
  housed. "Locked" in the tab means revealed but blocked.
- **Course state** is `BuildableStatus` `locked | available | developing |
  done` (`state/types.ts:300`); the tab adds `blocked` (available but
  `!canStartDevelopment`) in `curriculumFilter.ts`'s `cellState`.
- **Teaching is shown as a number** (Plan 104G): `GradeChip` wraps
  `ScoreMark`; letters survive only as the ink band and in the Hall of Fame
  and Final Report. The mockups used letters; the build uses numbers.
- **The catalog's shape** is `techData.ts`'s `discoverySchools()` (1033):
  seven schools of six majors, each `tier1Id`, four `tier2Ids`, four
  `tier3Ids` and the capstone. `CROSS_MAJOR_BRIDGES` (311) holds ~50
  authored cross-program prerequisites; `GRADUATE_PROGRAMS` (499) ten
  programs of 4–12 courses, housed in hosts (`projectData.ts:157`).
- **No course records when it was finished.** `builtYear` is set only for
  buildings (`techSystem.ts:823`). Each completion writes a log line
  (834–848), but `s.log` is capped at 200. `Career.courses` spans
  (`types.ts:274`) say when a professor first taught a course.
  `milestoneYears` (types.ts:1450) dates each `program-established:` and
  school founding.
- **Callers that must keep working:** `App.tsx`'s `openWalkProgram` (Plan
  103B, 304–309); the hall panel's "Open in Curriculum →" and
  `ProgramTile` (`BuildingInfoPanel.tsx:199–273`); `FacultyPerson.tsx:168`
  (`field:`); `HistoryTab.tsx:347` (`belowA`); the opening's
  `second-course` stage ringing `.row-action-develop.opening-target`
  (CurriculumTab 874, `state/opening.ts:129–140`); the "!" badge
  (`Toolbar.tsx:24–26`, `visibleCourseIds`); the committee lamps
  (`CommitteeLamps.tsx`, unchanged). Tests that render the tab or its
  pieces: `teaching-numbers`, `hall-develop`, `curriculum-sections`,
  `curriculum-filter`, `staffing`, `opening`. No harness move selects the
  tab's DOM.

## 2. Why this is not the constellation again

Plan 2 built a constellation and took it out ("Why the constellation
failed"): it spent its drawing on ~336 tier-to-tier edges that all said the
same thing, the ~50 bridges drowned in them, and course names shrank to
dots. The radial layout keeps that lesson as four rules:

1. **Position carries the tier.** The rings are the tiers; a program's
   courses sit in its own wedge. No edge is needed to say "the core comes
   after the entry course".
2. **Lines carry progress, not structure.** A line is drawn only to a course
   that is taught, being written or ready, so the drawing grows with the
   college instead of starting as a web. The core quartet meets at one
   junction before fanning to the advanced quartet: eight short lines, not
   sixteen.
3. **Bridges only in focus.** The cross-program prerequisites of the
   selected program are drawn, dashed, and nothing else's.
4. **Names live in the panels.** The drawing is for shape and progress; the
   right panel lists the selected program's ten courses by name, and a
   school's program names appear along their branches only when the view is
   zoomed to that school.

## 3. The design

### 3.1 The stage

The tab becomes three columns under its header:

- **Left panel** (~300px, scrolls): the committee (today's
  `CommitteePanel`, seats as a list), **View** (Whole curriculum, then the
  seven schools with "taught / 60", then the graduate sections), the
  filters (§3.5) and a small key.
- **Centre:** the drawing, sized to the largest square that fits, with no
  frame. A caption line floats at its top edge (what the pointer is on);
  nothing floats at the bottom unless the replay is shown there (§3.7).
- **Right panel** (~390px, scrolls): the selected program (name, school,
  milestone tag, its average as a number, its ten courses by ring) and the
  selected course (description, weeks, cost, upkeep, seats, the
  instructor, Develop / Choose…, what it is worth toward the next
  milestone, Requires / From other programs / Leads to / Feeds, facility
  gate). This is today's `CourseDrawer` and `RowAction`, moved.

Below ~1100px the columns stack, drawing first.

### 3.2 Geometry

- Seven school sectors in a fixed order, separated by a small gap; each
  sector six equal program wedges in `discoverySchools()` order. Positions
  never move as the college grows, so a course always appears where it
  will stay.
- Rings (in a 1120-unit square): seal at the centre, entry 120, core 250,
  advanced 370, capstone 462, school arc 488, graduate 516, school names
  545. Core and advanced quartets alternate ±14 radially so neighbours
  never touch.
- Graduate programs: one diamond each in its home school's sector beyond
  the arc (the MD and the health doctorate in Health Science, the JD and
  the humanities doctorate in Social Sciences & Humanities, and so on).
- The whole layout is a pure function of the catalog, computed once.

### 3.3 What is drawn

| Course | Drawn as |
|---|---|
| `done` | Solid brass node; a solid brass line from its prerequisite |
| `developing` | Node filling like a clock face with the committee's progress; solid line |
| `available`, can start | White node with a dashed gold ring; dashed line |
| `available`, blocked (`cellState` `blocked`) | As ready, with the reason in the caption and card |
| revealed `locked`, or not revealed | Not drawn |

- A **program** is drawn from the moment it is housed: a short stem from
  the seal to its entry course. A program in transit draws its nodes at
  half strength; a dark (unstaffed) program draws them hatched, with
  "Staff from the market" on its card.
- A **school** shows its name at the edge of what is drawn once its first
  program is housed, and an arc at the rim that fills in its colour as
  courses are taught (taught / 60). Unfounded schools keep their colour
  and mark; the name follows today's rule (Plan 95Q).
- A **distinguished program's** capstone is a star; a **distinguished
  school's** arc and name turn gold.
- A **graduate program** is drawn once housed, its diamond filling as its
  courses are taught.
- The **camera fits what is drawn**: the whole view scales so the
  outermost drawn ring fills the stage, up to a cap, and eases out as the
  college reaches further.
- A course finished while the tab is open scales in, and the ready rings
  it opens appear after it. Reduced motion skips both.

### 3.4 Interaction

- **Point** at a node: the caption names it ("PHYS 220 · Solid State
  Physics — Physics · Advanced · being written").
- **Click** a node: select its program and course in the right panel. The
  program's own lines draw in navy; its bridges to and from other programs
  draw as dashed maroon curves, and the courses at their far ends are
  ringed.
- **Zoom:** a school in View, or its name on the rim, rotates and scales
  that sector to fill the stage and shows program names along the
  branches; Whole curriculum zooms out.
- **Keyboard:** every node is a button in reading order (school, program,
  tier); arrow keys move along a ring and in or out between rings; Enter
  selects. The right panel's course list is the same choice without the
  drawing.

### 3.5 Filters

The filters stop replacing the view with a worklist. A filter **dims every
node it does not match** and lists the matches in the left panel, where a
click selects one. Search, Below 78, No instructor, One course from
established and Waiting on {field} all keep their meaning. Courses that a
filter names but that are not drawn (a revealed `locked` course) appear in
the list only.

### 3.6 Instructors

Drag-and-drop between cells goes with the cells. In its place the right
panel's course list carries each taught course's instructor chip, and a
chip dragged onto another course of the same department swaps them with the
live preview of both numbers (`canSwapInstructors`, `SWAP_COURSE_FACULTY`,
unchanged). The course card keeps today's instructor choice.

### 3.7 Replay

The mockup's year slider replays the run from the founding. The game cannot
do that today because nothing records when a course was finished (§1). A
course gains `completedWeek?: number` (absolute week), set in
`completeDevelopment`. For an older save, a sanitize step fills it from the
earliest `Career.courses` span for that course, else the matching log line,
else the `milestoneYears` of its program's establishment for a core course,
else leaves it unset (drawn as taught from the start of the replay's last
year). Where the replay lives is a decision (§4).

### 3.8 What does not change

The reveal rules, `START_DEVELOPMENT` and its gate, the committee and its
lamps, `RowAction` in the hall panel, the "!" badge and `visibleCourseIds`,
quality computed on read, and every number shown.

## 4. Decisions for the owner

| # | Question | Proposed |
|---|---|---|
| 1 | Keep today's rows as a second view? | **Yes, until PR G.** A "Drawing / List" switch in View, List being today's tab unchanged. It keeps accessibility and the tests whole while the drawing settles; G asks again. |
| 2 | Where does the replay live? | **The History tab and the Final Report**, as "The curriculum, year by year". The Curriculum tab is for deciding what to write next; the replay is a record. |
| 3 | A revealed course that is `locked` (a cross-program prerequisite or a faculty gate missing) | Not drawn; listed in the program card as "not open yet" with its reason. |
| 4 | Graduate programs not yet offered | Not drawn. Their schools' arcs say how far each is from its gate in the card, not the drawing. |
| 5 | Program names on the whole view | **Only when zoomed** to a school; the whole view shows school names alone. |

## 5. PRs

### 105A — The layout, as data

- `systems/techtree/radialLayout.ts`: ring radii, sector and wedge angles,
  every course's and graduate program's position, the junction points, from
  `discoverySchools()` and `graduatePrograms()`; pure and computed once.
- `radialDrawing(s)`: the drawn set for a state (§3.3), the line segments
  in three classes (taught, writing, ready), the school arcs, the fit
  scale, and `bridgesFor(programId)`.
- Tests (`test/radial-layout.test.ts`): positions are stable across states;
  no two nodes overlap; nothing `locked` is drawn; a housed program with
  nothing taught draws exactly its entry course and stem; the drawn set
  grows monotonically as courses complete; every bridge in
  `CROSS_MAJOR_BRIDGES` resolves to two positions.

**As implemented (A):** `systems/techtree/radialLayout.ts` and
`test/radial-layout.test.ts`. The inner rings moved out (entry 145, core 262,
advanced 376) when the overlap check found neighbouring entry courses
touching at 120. `bridgesFor` and its checks went with B's departure.

### 105B — The stage

- `tabs/curriculum/` holds `CurriculumStage` (the three columns),
  `RadialDrawing` (one SVG of paths for lines and arcs, HTML buttons for
  nodes, as the mockup), `ProgramPanel` and `CoursePanel` (from
  `CourseDrawer` and `RowAction`, which stays exported for the hall
  panel).
- The View list with zoom; the caption; the camera fit.
- Behind the Drawing / List switch (decision 1), Drawing by default.
- Numbers, not letters, everywhere (`ScoreMark`).
- Memoised on the course statuses so a week's tick that changes nothing in
  the catalog does not re-render 473 nodes; measured with the profiler as
  Plan 83 does for the map.

### 105C — Wiring

- Targets: `program:` and `course:` select (and zoom to the school);
  `field:`, `belowA`, `unstaffed` set the filter (§3.5);
  `curriculum.committee` scrolls the left panel; a school key zooms.
  `openWalkProgram` selects instead of unfolding a row.
- The opening's `second-course` ring moves to the course panel's Develop
  button (`.opening-target`), and `docs/architecture/ui-shell.md`'s list of
  ringed controls says so.
- Unseen courses (`seen.courseIds`) get a ring until selected or the tab is
  left; MARK_SEEN as today.
- Restaff: "Staff from the market · N" on a school's View row and on a dark
  program's card.
- Tests: `teaching-numbers` renders the stage; `hall-develop` unchanged;
  `opening` finds the ring in the panel.

### 105D — Instructors in the panel

The chip-drag swap in the program card's course list (§3.6), the dark and
in-transit drawings, keyboard navigation (§3.4). Tests for the swap
preview and for arrow-key order.

**As implemented (B–D):** one commit. `tabs/RadialCurriculum.tsx` (the
stage, the program card, wiring), `tabs/curriculumView.ts` (the Drawing /
List switch, which App.tsx also reads to give the overlay `split`), and,
since E–F, `components/RadialSvg.tsx` (the drawing). Departures:
- **No bridges drawn** (the owner: "extra clutter"). The program in focus
  draws only its own branch in navy; the course drawer lists cross-listed
  prerequisites as before.
- **No idle caption** (the owner): the caption shows only while the pointer
  or focus is on a course; the tab's help moved to the View card's band.
- **The schools' arcs run just outside the outermost course drawn**, not at
  the fixed rim, so the camera's fit is not held small by an empty rim in a
  young college.
- The right column shows the selected course's drawer **above** the program
  card, and scrolls to its top on a selection.
- The program in focus is chosen in the first render (the walk's program,
  else the first drawn), not in an effect, so a static render and the first
  paint both have it.
- Instructor swaps use the course cells themselves in the program card,
  unchanged from the rows (`CourseCell`, `SWAP_COURSE_FACULTY`).

### 105E — When a course was finished

`completedWeek` set in `completeDevelopment`; the sanitize step for old
saves (§3.7); `docs/architecture/game-state.md`. Tests: a fresh completion
records the week; an old save derives it from a career span, a log line,
then a milestone.

### 105F — The curriculum, year by year

The replay where decision 2 puts it: a year slider and Play over a
read-only `RadialDrawing` fed by `completedWeek`. Reduced motion steps
without animation.

**As implemented (E–F):** one commit. `completedWeek` in `types.ts`, set in
`completeDevelopment`, cleared in `closeProgram`, derived in
`persistence.ts`'s `sanitizeCompletedWeeks` (no save version: the field is
optional and the step runs on every load). The replay is
`components/CurriculumReplay.tsx` over `radialLayout.ts`'s `curriculumAt`,
in the History tab's record (after the chronicle) and at the foot of the
Final Report; `test/completed-week.test.ts` and the replay's checks in
`radial-layout.test.ts`.

### 105G — The words, and the list

- `docs/design/curriculum.md` §"The Curriculum tab" (268–391) rewritten:
  the stage, what is drawn, the four rules of §2 replacing "Almost no edges
  are drawn"; `ui-shell.md` (the opening ring, the school divider); the
  mentions in `graduate-programs.md`, `faculty.md`, `research.md`; a new
  `tab-curriculum.png` for the README.
- Grep `src/` for words that describe rows and cells ("row", "cell",
  "unfold") in help text and figure hints, and rewrite them (Plan 95E's
  rule).
- Ask decision 1 again: retire the List view, or keep it.

**As implemented (G):** `docs/design/curriculum.md`'s tab section rewritten
around the drawing, with the rows as "The List view" and the four rules of
§2 (as landed: no bridges) closing it; `ui-shell.md`'s opening drive and ring
list; `buildables.md` on `completedWeek`; a new `docs/images/tab-curriculum.png`
from a Year 40 run. No help text in `src/` described rows as the only view:
the List view's own help still describes its rows. Decision 1 stays open:
the List view is kept until the owner retires it.
