# UniSchool — Backlog

*The work that has been named but not yet planned. Nothing here is sequenced
into PRs; turning one of these into a sequence is what writing the next plan
does (see `docs/plans/README.md` for how that is done and named).*

**This is the one forward-looking document in the repository.** The docs in
`docs/design/` and `docs/architecture/` describe the game as it is; the plans
in `docs/plans/` are closed records of work that has landed. If something is
going to happen but has not, it belongs here.

*Re-read against the code after Plan 70J (September 2026): what later plans
delivered came off, and what plans left open "for the owner" came on. The
last section lists what came off and where it went.*

---

## Awaiting the owner's triage: the October 2026 review (Plan 73)

*The review's findings are in
[`docs/reviews/2026-10-game-review/`](docs/reviews/2026-10-game-review/README.md).
The owner triages them area by area. **Area 1 (the campus) is
[Plan 74](docs/plans/74-campus.md)**: every fix but A1-7 and A1-8, which
are under *Named, not sequenced* with the area's decorative assets.
**Area 2 (the screens and the words) is
[Plan 76](docs/plans/76-ui-and-text.md)**, which also takes G7-3, G7-4,
G7-5 and G7-14, the effect side of area 2's false claims; what it leaves
is under *Named, not sequenced*. **Area 3 (teaching the game) is
[Plan 78](docs/plans/78-learning-the-game.md)**, weighed against the inbox
(Plan 77), with area 4's A4-5 (decline an offer). **Area 4 (strategy)
is held by the owner**, who will playtest balance and strategy before
taking any of its fixes; its athletics direction, with the owner's
own playtest notes, is [Plan 80](docs/plans/80-the-owners-playtest.md).
**Area 7 (the bugs) is [Plan 79](docs/plans/79-the-bugs.md)**,
with what Plans 74 to 78 had not already fixed. Area 6 waits for triage;
this entry comes off when every area is answered.*

- **Fix first:**
  - two tabs on one save lose progress (G7-1, Plan 79B);
  - the winter model is half a year off (G7-3, taken into Plan 76D);
  - the tag attrition point is previewed but never applied (G7-4, Plan 76C);
  - the athletics axis is scaled twice (G7-5, Plan 76C);
  - the stale hall price in the second-year letter (G7-14, Plan 76C);
  - the committed `node_modules` symlink (G7-17a), already removed on the review branch.
- **The ten ranked improvements**, in the README's order:
  1. the first year explains itself (Plan 78B, C, F);
  2. the move to school halls is unstuck (Plan 78D);
  3. decisions stop happening unseen (Plan 78E; A4-3's digest waits for
     area 4);
  4. the text is made true;
  5. the late game gets a worklist and a lever;
  6. a usable Curriculum;
  7. strategies that end in different colleges (a plan of its own);
  8. a fair Final Report;
  9. one way to write a number;
  10. a campus worth a screenshot (area 1's part in Plan 74).

---

## On hold from Plan 70: analytics (K) and launch (L)

*Held by the owner's decision (September 2026), after Plan 70's PRs A–J
landed. Both specs stay in [Plan 70](docs/plans/70-launch.md); they wait
here until they are picked up again.*

- **70K — analytics.** Not started. PostHog through `posthog-js`, in
  production builds only, memory persistence and no cookies, autocapture
  off; page views and six run events with no free text (`run_started`,
  `year_reached`, `run_finished`, `report_shared`, `save_exported` /
  `save_imported`, `crashed`); *Share anonymous play statistics* in
  Settings; two sentences in the Credits. **Needs the owner** to set
  `VITE_POSTHOG_KEY` in Vercel's production environment before it reports
  anything.
- **70L — launch.** Not started. The owner plays a full run on a fresh
  browser and a second session on a tablet, against a short checklist in
  `docs/reviews/` (the first hour, the first school, the first summer, a
  save exported and re-imported, a rank change, the Final Report, play
  again); small findings are fixed in the PR, larger ones come here. Then
  1.0.0: `package.json`, `LAUNCH_SAVE_VERSION` confirmed as the public
  build's, the README re-shot, and this file updated with what launch left
  for later. Depends on K only if analytics should ship with 1.0.

## Taken into Plan 72

*The owner answered the backlog's questions in September 2026;
[Plan 72](docs/plans/72-owners-answers.md) sequences what they said yes to:
the high-price line's targets reset, a first place that can be taken late,
a poached professor who actually leaves, the graduate course descriptions,
v2's residence types, the charter as a log line, the two unused building
effects removed, sort and filter on the Faculty tab, a full residence on
the map, and clubs with diminishing returns; and, from later answers, the
Japanese garden, the split-school trap (the game suggests the merge) and
the statue and fountain drawn on their own. The entries below keep only
what Plan 72 leaves.*

## Named, not sequenced

*Each is a real piece of work with a known shape; none has been turned into
a sequence of PRs.*

- **Events that do what they say** (the October review, A2-2; left by
  Plan 76). Plan 76D relabels the event choices whose truth needs a system
  the events cannot reach. Each would make the event richer:
  - a hire from an event, through `appointFaculty` with a rolled
    candidate ("Fill the post", "Hire, whatever it costs", "Fund a
    teaching line");
  - closing a program ("Teach out … and close it");
  - placing a statue or paving a path from an event;
  - setting the draw rate ("Cut the draw", "Stop drawing");
  - starting a real campaign ("Run a capital campaign");
  - named funds, scholarships and chairs, kept apart from the general
    endowment;
  - retirement stories fired from the real retirement notice and naming
    that person;
  - **a memory of answers**, so decisions are not undone by recurrence:
    the boiler replaced and then "installed in the college's first
    decade", the writing course debated again, term limits adopted and
    the trustee of twenty-six years back, the strip sold and offered
    again, the guidebook's "first time" three times a game.
  - the offer (`star-poached`) and the tenure case naming their professor
    by kind, the strongest researcher and one a few years in: both let the
    professor go, so naming them changes who leaves and moves the run
    (Plan 79D measured it and left them drawn);
  - what Plan 76D left of the vague rows: a library lever for the
    acquisition, the booster club's gift routed to athletics, the essay
    ring's enrollment cost spread over the class years, repair letters
    that load backlog onto the named building, and the sinkhole and the
    ivy drawn on the map.
- **The Selective archetype restaffs** (found by Plan 76D). When a
  professor leaves, the Selective harness player hires only for blocked
  courses. Its academic score can sit below the 65 at which it builds
  for its worst need, and since nothing on the build menu serves
  academic, it stops building for the rest of the game and banks the
  cash (seed 12345, from year 16). It should restaff or retune a weak
  course the way the Guided player does (`tendTeaching`).
- **The course catalog's shape** (A2-5; left by Plan 76G, which fixes the
  sentences and titles). No course is numbered above 200. Five of the
  Social Sciences majors lack a standard core course (statistics,
  research methods, anthropological theory, modern philosophy,
  non-Western history), no major has a senior seminar, the JD has no
  Professional Responsibility, and the MD has no internal medicine,
  pediatrics or obstetrics. Plan 76G rewrote sentences rather than move
  courses where the audit swaps or renumbers them; the moves themselves
  wait here: FINA130/210, ACCT140/240, MED550/600, the JD's 540/570, and
  bridges before ACCT110 and MATH130. Each change moves course ids in
  every save.

- **Walks that draw straight** (the October review, A1-7). A walk is a run
  of square tiles with no diagonal piece, so a diagonal walk draws as a
  zigzag ribbon and a curve as a staircase, and desire lines across a lawn
  are the most campus-like path there is. Either draw a walk as a polyline
  through its tiles' centers with rounded joins over the tiles (the tiles
  stay the data), or fill the triangle between two diagonally adjacent
  walk tiles. About one PR either way.
- **Doors that meet the campus** (A1-8). The door checker
  (`npm run review:doors`) counts, over 63 saves and four views: 1,555
  doors onto lawn (the game never joins a door to a walk), 296 on the
  seam between two tiles (every even-length wall), 118 into another
  building's wall, 53 onto courts, a pool or a quad, 45 under trees, 22
  under a bike rack or a lamp, and 39 overhangs. The fixes: put an even
  wall's door on the tile nearest a walk; clear trees from a door's tile
  when the building is placed, and keep racks, lamps and the flag off door
  tiles and trees (`dressing.tsx`); and draw a short path from each door
  to the nearest walk.
- **Decorative assets** (the review's area 1 list, after seasons, which is
  Plan 74I), in its ranked order:
  1. water: a pond or a lake edge with a boathouse (a place for rowing,
     and bridges for the paths), a new tile kind beside the road;
  2. walls and gates along the road, so the campus has a front;
  3. a bandstand or a quad clock, a focal point that is not the fountain;
  4. sculpture of several kinds, picked by a hash of the tile;
  5. parking beside the road, a grounds lot with stall markings;
  6. signage: a plate by each door naming the building, shown from zoom 3.
- **Faculty lifecycle: rival poaching and paid retention.** A departure the
  player did not choose, and money spent to prevent it. **This has gone
  backwards and is the most visible gap:** Plan 29 left poaching to the
  old `faculty-outside-offer` event and built only retirement; Plan 32
  retired that event, and its catalogue successor `star-poached` says a
  professor has an offer but, answered *Wish them well*, costs two points
  of mood and nobody leaves (the catalogue's effects cannot remove a
  person). Plan 72B makes that departure real; a retention offer and the
  rest of the lifecycle stay here. Their shape stands: the paid faculty
  search is what a retention offer would reuse, salaries scale with
  standing so a poach has a price, and the closing elite band gives a
  poacher a motive. The athletics side already works (`coach-poached`).
- **The admit rate's early slope.** `admitRate(prestige)` still seeds a
  founding college at about 36% (`admissionsSystem.ts`: ceiling 0.38,
  midpoint 100) where about 86% would suit a small school; the slider
  then opens at last year's rate. Plan 05's fit reproduced the old
  funnel's class sizes rather than the rate a player should want. A
  re-fit wants its own probe (the old `ADMIT_PROBES` went with Plan 63)
  and a pass of the scorecard after it. Deferred by Plan 70.
- **A school-wide budget, and a CFO to run it.** Most expense lines are
  still derived from what the college owns and enrolls, so underfunding
  can only have a consequence where there is a lever. The levers that
  exist: maintenance funding (backlog, condition, and the heating and roof
  events that read them, Plan 26), the endowment draw and borrowing (Plan
  27), the sweep (Plan 70D), research funding per initiative, and the
  athletics pot (Plan 21). Missing: instruction, student services and
  financial aid as low/adequate/generous levers with one visible
  consequence each, and a pot sized as a share of income, so that "spend
  now or compound the endowment" is the top-level dial. **A CFO is what
  stops it being tedious**, hired as the athletic director is, whose
  quality decides how good the auto-allocation is; the budget arrives
  pre-filled in the summer and the CFO flags exceptions. The only CFO
  today is the interim one at the bottom of the distress ladder. The
  precondition the old entry set, money that is actually scarce, now
  holds for the first half of a run (Plan 71).
- **The Faculty tab, and a person page.** The tab has roster and market
  views, *Show every field*, and per-department short and over flags; the
  order is fixed by teaching. Sort and filter are Plan 72F. Missing
  still: a page that narrates a career, which is half of what makes the
  faculty lifecycle worth having.
- **Per-major mechanical effects.** A cohort pull, a grant rate, a major
  that recruits differently. Today the pull is by category
  (`cohorts.ts`) and one tag (*artsy*) reads the arts. The content half
  landed in Plan 20, and the graduate courses' sentences are Plan 72C.
- **Events that reach further.** The catalogue has 154 events (134 inline,
  20 seismic), but their effects reach only cash, the endowment, debt, the
  maintenance backlog, mood, the board's confidence, alumni warmth, course
  quality, enrollment and trees. None reaches the faculty (see poaching),
  a prestige input through durable state (a scandal that costs a program
  its distinguished status for a year), or campus life. Nobody has
  audited the catalogue for dominant choices since it replaced the old
  table.
- **Athletics deferrals.** Capped flagships, recruiting, the college's
  pull and a coach market that always offers someone solid landed in
  [Plan 80G](docs/plans/80-the-owners-playtest.md). **Founding a team
  directly** (not through a sport club's petition) is unbuilt.
  **Disbanding a team** is unbuilt, and so what
  happens to a venue whose last team folds is unanswered. **Match
  simulation and a fixture list** stay out by the argument at the head of
  `systems/athletics/season.ts`: three dated occasions and the postseason
  produce a record and a rivalry, and a schedule would produce nothing
  more. **Rowing** wants a lake, a lake is terrain, and the map has none;
  golf stays declined.
- **Half-step camera views (45°)** (the owner, Plan 80). A turn of 45°
  lands on straight-on angles, where every building shows a single wall;
  the art assumes two (doors, steps, corner towers, window bays), so each
  motif needs a one-wall view. The projection and depth sort already work
  at any angle.
- **A faster map** (the owner, Plan 80). Plan 80H lightens a turn; beyond
  that, the SVG scene redraws every building, tree and prop per frame, and
  only a canvas or WebGL renderer changes that. A desktop wrapper runs the
  same engine and would not be faster.
- **From Plan 70's "does not do":** key rebinding and more than one save
  slot. Unlocks that carry across runs now exist for the four bonus
  vernaculars (`state/unlocks.ts`), with no in-run notice yet when one is
  earned.
- **From earlier plans' notes for the owner, partly answered:** a narrow
  college cannot choose which schools it founds (Plan 63; Plan 71's offers
  from started schools help); money piles up with nowhere to go late in a
  run (Plan 63; Plans 70D and 71 help); the guided line asks for a lab
  project when one can be started only about a third of the weeks (Plan
  58, not re-measured since).

## Direction, not plan

*Not sequenced, not estimated, and listed only so the work above is not
designed in a way that forecloses them.*

- **Physical-object tabs:** the treasury as a ledger, athletics on a
  clipboard. The register (`ui-shell.md`) neither rules them out nor needs
  them.
- **A board of directors as people**, and the executive seats beyond Plan
  28's (Provost, a Dean per school, Facilities, Dean of Students, VP of
  Advancement): a CFO above all (see the budget). The board acts today
  through its confidence and the distress ladder's letters.
- **The mix needs ears** (the merge review's §5, #4): the sound and the
  four state-switched music themes were built without a listening pass on
  real speakers.
- **Camera polish:** a look at the stands from behind.

## Taken off in September 2026

*Delivered or settled since the entries were written; each now lives in the
plan named and in `docs/design/` or `docs/architecture/`.*

- **Research grants after the hosting rule:** re-fitted per depth in Plan
  70D (`GRANT_DEPTH_SCALE`), now about 2× their cost and inside the
  scorecard's band.
- **A richer demand curve:** the frontier bites now, with price tolerance
  rising with prestige, an overreach penalty, a crowding factor and an
  applicant trickle (Plan 71). Prestige and scale archetypes were not
  built, and nothing asks for them.
- **Campus map feedback:** beauty feeding the pool and prestige, and capped
  pairing bumps (Plan 26).
- **More authored events:** the catalogue (Plan 32), three tellings each
  for the frequent ones (Plan 70I). What is left is reach, above.
- **The old event table (H4):** replaced by the catalogue (Plan 32).
- **The tutorial:** the opening walkthrough, the board's letters, the
  school letters and the next-step line (Plans 16, 55, 58).
- **The startup screen and the mascot:** Plans 07, 08 and 21.
- **The dead `prize` row:** deleted with its table (Plan 22C).
- **Research and campus life as inputs rather than ranked axes, and a
  simpler athletics:** declined in effect; Plan 31 made six standings and
  Plan 21 built the department out.
- **Camera rotation and tilt, moving pedestrians, the README screenshots,
  sound and music:** Plans 24, 34, 37, 38, 44, 48, 62, 64 and 70H.
- **The consistency review's questions:** all sixteen answered (Plans
  46–51, 59, 70C).
- **The quiet founding years, and night and seasons on the map:** declined
  by the owner (September 2026). The founding years are the tutorial by
  design, with the board's letters and Plan 70I's notes.
- **The rest of the map reading the college:** walkers by enrollment, the
  crane, labs at work, crowds, banners and weathering are built; a full
  residence's mark is Plan 72G.
