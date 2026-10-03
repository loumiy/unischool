# UniSchool — Backlog

*The work that has been named but not yet planned. Nothing here is sequenced
into PRs; turning one of these into a sequence is what writing the next plan
does (see `docs/plans/README.md` for how that is done and named).*

**This is the one forward-looking document in the repository.** The docs in
`docs/design/` and `docs/architecture/` describe the game as it is; the plans
in `docs/plans/` are closed records of work that has landed. If something is
going to happen but has not, it belongs here.

*Re-read against the code after Plan 85 (October 2026): what later plans
delivered came off, and what plans left open "for the owner" came on. The
last two sections list what came off and where it went.*

---

## Awaiting the owner's triage: the second review (Plan 86)

*The review's findings are in
[`docs/reviews/2026-10-game-review-ii/`](docs/reviews/2026-10-game-review-ii/README.md):
52 findings and 9 bugs, none a blocker. Its README ranks ten improvements and
a fix-first list (the migrated Landmark count, the passive wheel listener, a
tab that stops without saving, four false sentences, two scenarios). Where a
finding there continues an entry below, the entry stays and the review's
finding is the newer measurement. This entry comes off when every area is
answered.*

## Awaiting the owner: the October 2026 review's area 6

*Areas 1, 2, 3 and 7 of the October review
([`docs/reviews/2026-10-game-review/`](docs/reviews/2026-10-game-review/README.md))
were answered by Plans 74–79. Area 4 was answered by Plans 76B, 78D, 80 and 85,
except what is listed under *Named, not sequenced* below (the digest, size
levers, the blind price, the report's last phrase). The fix-first list and
eight of the ten ranked improvements are done; what became of every finding
is in [the review's status note](docs/reviews/2026-10-game-review/STATUS.md).*

**Area 6 (marketability) has not been triaged.** Its memo
([`6-marketability.md`](docs/reviews/2026-10-game-review/6-marketability.md))
made shipping depend on three things. Where each stands:

- **A picture a stranger wants to click.** Seasons, the landmarks and the
  ring of land are built (Plans 74, 81). The title screen still shows no
  campus, and the README's screenshots predate Plans 80–85 (the History
  and Faculty captions describe screens that have since changed).
- **Choices that exclude each other.** Plan 85's specializations.
- **AI disclosure and visible human direction.** Only the Credits line
  ("Claude Code, plan by plan"). Nothing on the title screen or a store
  page.

And the owner's decisions: a free web demo of the first decade, a Steam
page, Next Fest (February or June 2027), and a price ($14.99 was
recommended). Whether the owner's playtest (70L) or the demo comes first
is part of the same decision.

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
  save exported and re-imported, a rank change, a specialization, the
  Final Report, play again); small findings are fixed in the PR, larger
  ones come here. Then 1.0.0: `package.json` (still `0.0.0`),
  `LAUNCH_SAVE_VERSION` confirmed as the public build's, the README
  re-shot, and this file updated with what launch left for later. Depends
  on K only if analytics should ship with 1.0.

## Named, not sequenced

*Each is a real piece of work with a known shape; none has been turned into
a sequence of PRs.*

### From the October review, still open

- **A digest for the stops that ask nothing** (A4-3, with the rest of Plan
  77B). Milestone notes and research reports still stop the clock as
  interrupts (`systems/events/eventSystem.ts`), now answered in the inbox;
  60–85% of weeks ask nothing while these crowd the rest. Fold them into
  the summer or a weekly digest, and keep stops for choices. Plan 77B's
  other half belongs here too: the year's review counts the matters that
  took their default ("N left unanswered", `state/yearInReview.ts`) but
  does not name them. Plan 78E built 77B's setting (pause when a matter
  arrives); Plan 78 left the digest to this entry.
- **Size levers** (A4-5). Declining an offer (78D) and recruiting (80G)
  exist; a target enrolment, or *stay small on purpose*, in the summer's
  admissions beat does not.
- **The price is set blind** (A4-6). The summer's tuition slider shows a
  tier but not how last year's price moved the pool
  (`components/InterruptModal.tsx`). Show last year's response beside it.
  Plan 87's Admissions Office answers it for a college that opens the
  office; this entry stays for the rest.
- **Small leftovers of the Final Report and the worklist** (A4-2, A4-4):
  - the access weakness still reads "never opened its doors very wide"
    (`data/reportData.ts`), which goes to the largest colleges; the
    review proposed "stayed hard to get into";
  - the Curriculum's *Below A* filter exists (76B) but nothing links to it
    from the Prestige panel's teaching line.
- **Hide other schools' offers in a claimed hall** (Plan 78D, for the
  owner). They show behind a confirmation today; hiding them is one line
  (`78-learning-the-game.md`, the owner's notes).

### The campus

- **Hand-built campuses as layout plans** (the owner, September 2026).
  `tools/campuses/` holds campuses the owner laid out by hand in a sandbox
  run and exported (`tudor-year-1.unischool.json` first); see
  `tools/README.md`, *Hand-built campuses*. They are meant to replace
  `tools/layout.ts`'s hardcoded plan for screenshots, sample builds and
  marketing, on a real (non-sandbox) scenario run's buildings:
  - `layout.ts` takes `--plan <save>` and reads `placements`, `pathways`,
    `dressing` and `trees` from it in place of its own `PLAN` and walks;
  - each building the run built goes to the plan's site for the same id,
    keeping the plan's `w`/`h` (a rotation); ids the plan names that the
    run did not build stay empty ground (and their doorstep walks are
    dropped), and ids the run built that the plan does not name
    (chapter houses, whatever the plan left out) go to the overflow block
    as now;
  - the existing rules still run over the result — clear footprints, every
    visible door on a path, one connected walk network — so a plan drawn
    against an older catalogue fails loudly rather than drawing through a
    building;
  - the run's own vernacular, colours and name are kept; the plan's
    `self`, finances and everything else in its `state` are ignored, which
    is what lets one plan be shot in every vernacular.
- **Walks that draw straight** (A1-7, partly done). Diagonal runs whose
  tiles touch only at corners already draw as one straight band (Plan 24F,
  `components/pathways.tsx`). A run of edge-joined tiles (a slow freehand
  drag, and the walks the tools lay) still draws as steps, and a curve is
  only rounded corners. Either draw such a run as a polyline through its
  tiles' centres, or have the path tool lay corner-joined diagonals. About
  one PR.
- **Doors that meet the campus** (A1-8). At the review's commit the door
  checker (`npm run review:doors`) counted, over 63 saves and four views:
  1,555 doors onto lawn (the game never joins a door to a walk), 296 on
  the seam between two tiles (every even-length wall), 118 into another
  building's wall, 53 onto courts, a pool or a quad, 45 under trees, 22
  under a bike rack or a lamp, and 39 overhangs. Re-run it before
  planning. The fixes: put an even wall's door on the tile nearest a walk;
  clear trees from a door's tile when the building is placed, and keep
  racks, lamps and the flag off door tiles and trees (`dressing.tsx`); and
  draw a short path from each door to the nearest walk.
- **Decorative assets** (the review's area 1 list, after seasons), in its
  ranked order. None is built; the ring of land (Plan 81) has no water,
  and the only gate is the player-built Triumphal Gate (Plan 75B):
  1. water: a pond or a lake edge with a boathouse (a place for rowing,
     and bridges for the paths), a new tile kind beside the road;
  2. walls and gates along the road, so the campus has a front;
  3. a bandstand or a quad clock, a focal point that is not the fountain;
  4. sculpture of several kinds, picked by a hash of the tile;
  5. parking beside the road, a grounds lot with stall markings;
  6. signage: a plate by each door naming the building, shown from zoom 3.
- **Half-step camera views (45°)** (the owner, Plan 80). A turn of 45°
  lands on straight-on angles, where every building shows a single wall;
  the art assumes two (doors, steps, corner towers, window bays), so each
  motif needs a one-wall view. The projection and depth sort already work
  at any angle.
- **Real slopes on campus** (the owner, Plan 81). Gentle elevation inside
  the parcel, with buildings on leveled pads and a plinth or steps on the
  downhill side. Everything on the map assumes flat ground today (the
  projection, the depth sort, siting, paths, walkers, doors, hit-testing
  and shadows), so it is a geometry change to all of them; the canvas
  renderer (Plan 83) removes only its cost, not that work. Plan 81 puts
  the hills around the campus instead.
- **A smoother turn** (what Plan 83 left). The map is a canvas now, and a
  turn frame takes about half what the SVG's did, but not the 30 ms the
  prototype aimed for. The floor is the art's own JS, which recomputes
  every projected point for each camera (40–50 ms a frame). A truly
  smooth turn needs either geometry projected by a transform (WebGL, or an
  affine transform per face on a canvas), which is an art change, or a
  turn's in-between frames drawn from the last image, with only the
  settled view redrawn. A desktop wrapper runs the same engine and would
  not be faster.
- **The sim on a worker thread** (after Plan 83). The sim is pure
  TypeScript with no React and no dependencies (DD §15), so its weekly tick
  and the snapshot the UI reads could run in a Web Worker, off the main
  thread.
  - **Why.** After Plan 83 most of a change's main-thread cost at Play is
    the game's own update, not the map: when a building finishes, 68 of
    the 76 ms, the canvas taking 8.
  - **What it takes.** The tick posts each week's state back. The
    snapshot must cross the thread boundary, either by structured clone
    or as the changed records. Actions go the other way, with the one
    seeded RNG staying in the worker. Saves and the headless harness are
    unchanged.

### The events

- **Events that do what they say** (the October review, A2-2; left by
  Plan 76). Plan 76D relabelled the event choices whose truth needs a
  system the events cannot reach. Each would make the event richer:
  - a hire from an event, through `appointFaculty` with a rolled
    candidate (the trustees' chair letter in `data/eventData.ts` already
    does this outside the catalogue; the catalogue's effects have no hire);
  - closing a program;
  - placing a statue or paving a path from an event;
  - setting the draw rate;
  - starting a real campaign;
  - scholarships and chairs as named funds (a restricted `buildingFund`
    exists since 76D);
  - retirement stories fired from the real retirement notice and naming
    that person;
  - **a memory of answers**, so decisions are not undone by recurrence
    (only `cooldownYears` exists today): the boiler replaced and then
    "installed in the college's first decade", the writing course debated
    again, term limits adopted and the trustee of twenty-six years back,
    the strip sold and offered again, the guidebook's "first time" three
    times a game;
  - the offer (`star-poached`) and the tenure case naming their professor
    by kind, the strongest researcher and one a few years in: both let the
    professor go, so naming them changes who leaves and moves the run
    (Plan 79D measured it and left them drawn);
  - what Plan 76D left of the vague rows: a library lever for the
    acquisition, the booster club's gift routed to athletics, the essay
    ring's enrollment cost spread over the class years, repair letters
    that load backlog onto the named building, and the sinkhole and the
    ivy drawn on the map.
- **Events that reach further.** The catalogue has 160 events (140 inline,
  20 seismic). Their effects reach cash, the endowment, debt, the
  maintenance backlog, mood, alumni warmth, the incoming class's quality,
  enrollment, trees, a restricted building fund, historic status, the
  charter, the town's goodwill and the festival, and one faculty
  departure (`departs`). None reaches a prestige input through durable
  state (a scandal that costs a program its distinguished status for a
  year). Nobody has audited the catalogue for **dominant choices** (Plan
  76D audited truth, not dominance).

### The people and the money

- **Faculty lifecycle: rival poaching and paid retention.** A departure is
  real now (`star-poached`'s *Wish them well* lets the professor go, Plan
  72B), and the event offers a retention bonus, but a flat $50,000 that
  ignores the salary. Missing: rivals that poach by standing as a system
  rather than one event, and a retention offer priced from the salary and
  the career record (Plan 84C), reusing the paid faculty search. Plan 84
  kept this here. The athletics side already works (`coach-poached`).
- **A school-wide budget, and a CFO to run it.** Most expense lines are
  still derived from what the college owns and enrolls, so underfunding
  can only have a consequence where there is a lever. The levers that
  exist: maintenance funding, the endowment draw and borrowing, the sweep,
  research funding per initiative, the athletics subsidy tier (which caps
  the flagships, 80G) and team scholarships, the festival's scale (85H)
  and the training program's picks (85E). Missing: instruction, student
  services and financial aid as low/adequate/generous levers with one
  visible consequence each, and a pot sized as a share of income, so that
  "spend now or compound the endowment" is the top-level dial. **A CFO is
  what stops it being tedious**, hired as the athletic director is, whose
  quality decides how good the auto-allocation is; the budget arrives
  pre-filled in the summer and the CFO flags exceptions. The only CFO
  today is the interim one at the bottom of the distress ladder. Money is
  scarce for the first half of a run (Plan 71) but still piles up late: a
  guided run held $1.1B at year 50 (Plan 85C).
- **Per-major mechanical effects.** A cohort pull, a grant rate, a major
  that recruits differently. Today the pull is by category
  (`cohorts.ts`) and one tag (*artsy*) reads the arts.
- **The course catalog's shape** (A2-5; left by Plan 76G, which fixed the
  sentences and titles). No undergraduate course is numbered above the
  200s. Five of the Social Sciences majors lack a standard core course
  (statistics, research methods, anthropological theory, modern
  philosophy, non-Western history), no major has a senior seminar, the JD
  has no Professional Responsibility, and the MD has no internal medicine,
  pediatrics or obstetrics. The moves Plan 76G did not make wait here:
  FINA130/210, ACCT140/240, MED550/600, the JD's 540/570, and bridges
  before ACCT110 and MATH130. Each change moves course ids in every save.
- **Athletics deferrals.** **Founding a team directly** (not through a
  sport club's petition) is unbuilt; Plan 87's Athletics Development
  Office builds it for a college that opens the office. **Disbanding a team** is unbuilt,
  and so what happens to a venue whose last team folds is unanswered.
  **Match simulation and a fixture list** stay out by the argument at the
  head of `systems/athletics/season.ts`: three dated occasions and the
  postseason produce a record and a rivalry, and a schedule would produce
  nothing more. **Rowing** wants a lake (see water, above); golf stays
  declined.

### Plan 85's leftovers

- **Three slow readings still read the old stocks**, not the pillars: the
  faculty market's standing (`facultyData.ts`, `marketStandingOf`), the
  sports' pull (`studentLifeData.ts`, `collegePull`) and the research
  powerhouse tag (Plan 85I, the owner's decision 2).
- **A full endowment can still carry an unspecialized college to first**
  (accepted by the owner in 85I; worth watching).
- **The championships goal player never reaches the specialization
  milestone** (85G), so the review tool cannot measure the athletics
  specialization.
- A dead string: `comingNote: 'Arrives in a later update.'` in
  `data/specializationData.ts`, now that every card is `ready`.

### The harness

- **The Selective archetype never tends teaching.** When a professor
  leaves it hires only for blocked courses (`sim/harness/archetypes.ts`;
  Completionist, Guided and Natural call `tendTeaching`, Selective does
  not), and since Plans 80 and 85 it ends around 61st at year 50 (Plan
  85I's table). Give it `tendTeaching` and re-measure.
- **The guided line's lab-project step** asks for a project when one can
  be started only about a third of the weeks (Plan 58), not re-measured
  since.

### Small things

- **From Plan 70's "does not do":** key rebinding and more than one save
  slot. Unlocks that carry across runs exist for the four bonus
  vernaculars (`state/unlocks.ts`), and `recordUnlocks` returns what was
  newly earned, but both callers ignore it, so there is still no in-run
  notice when one is earned.
- **Report tags whose test does not read the standing they claim**
  (commuter, country club, pressure cooker; left by Plan 76C).
- **What Plan 76H skipped:** the share card's embedded fonts, its own
  glyphs for fell, lamps and benches, and one set of rank arrows.

## Direction, not plan

*Not sequenced, not estimated, and listed only so the work above is not
designed in a way that forecloses them.*

- **Physical-object tabs:** the treasury as a ledger, athletics on a
  clipboard. The register (`ui-shell.md`) neither rules them out nor needs
  them.
- **A board of directors as people**, and the executive seats beyond Plan
  28's (Provost, a Dean per school, Facilities, Dean of Students, VP of
  Advancement): a CFO above all (see the budget). The board acts today
  through the distress ladder's letters and its seismic letters (its
  confidence was removed in Plan 80C).
- **The mix needs ears** (the merge review's §5, #4): the sound and the
  four state-switched music themes were built without a listening pass on
  real speakers.
- **Camera polish:** a look at the stands from behind.

## Taken off in October 2026

*Delivered or settled since the September re-read.*

- **The October review's fix-first list:** all six (G7-1 in 79B; G7-3,
  G7-4, G7-5 and G7-14 in 76C–D; the `node_modules` symlink on the review
  branch).
- **The October review's ranked improvements:** the first year explains
  itself, the move to school halls unstuck, the text made true, a usable
  Curriculum, one way to write a number, and a campus worth a screenshot
  (Plans 74–79); strategies that end in different colleges (Plan 85). The
  rest of 3, 5 and 8 is above.
- **Area 4 of the review:** A4-1 (Plan 85), A4-2 (the *Below A* filter in
  76B, the training program in 85E; the Provost's auto-fill declined by
  the owner in Plan 80), A4-4 (76C and 85I: athletics scaled once, the
  finance phrase, the student-life pillar on the experience axis), and
  A4-5's decline and recruiting (78D, 80G).
- **Plan 72's list** (the owner's answers on the September backlog):
  landed, A–M.
- **The Faculty tab, and a person page:** Plan 84.
- **A faster map:** Plan 83, the canvas, with the SVG map kept as its
  fallback. Its prototype missed the 30 ms bar and the owner went ahead
  anyway; what is left is *A smoother turn*, above.
- **A narrow college choosing which schools it founds:** a claimed hall
  offers its own school's programs, and one offer a year can be declined
  (Plan 78D).
- **Research and campus life as inputs rather than ranked axes:** reversed
  by Plan 85, which made prestige a blend of four pillars (academics 35%,
  research 25%, student life 25%, athletics 15%).
- **Seasons on the map:** built (Plan 74I). Only night stays declined.
- **Board confidence:** removed (Plan 80C).
- **Athletics deferrals:** capped flagships, recruiting, the college's
  pull and a coach market that always offers someone solid (Plan 80G),
  and the athletic performance complex's extra flagship slots (85G).

## Taken off in September 2026

*Delivered or settled before the October review; each now lives in the
plan named and in `docs/design/` or `docs/architecture/`.*

- **Research grants after the hosting rule:** re-fitted per depth in Plan
  70D (`GRANT_DEPTH_SCALE`), now about 2× their cost and inside the
  scorecard's band.
- **A richer demand curve:** the frontier bites now, with price tolerance
  rising with prestige, an overreach penalty, a crowding factor and an
  applicant trickle (Plan 71).
- **Campus map feedback:** beauty feeding the pool and prestige, and capped
  pairing bumps (Plan 26).
- **More authored events:** the catalogue (Plan 32), three tellings each
  for the frequent ones (Plan 70I). What is left is reach, above.
- **The old event table (H4):** replaced by the catalogue (Plan 32).
- **The tutorial:** the opening walkthrough, the board's letters, the
  school letters and the next-step line (Plans 16, 55, 58), and Plan 78.
- **The startup screen and the mascot:** Plans 07, 08 and 21.
- **The dead `prize` row:** deleted with its table (Plan 22C).
- **Camera rotation and tilt, moving pedestrians, the README screenshots,
  sound and music:** Plans 24, 34, 37, 38, 44, 48, 62, 64 and 70H.
- **The consistency review's questions:** all sixteen answered (Plans
  46–51, 59, 70C).
- **The quiet founding years:** declined by the owner (September 2026).
  The founding years are the tutorial by design, with the board's letters
  and Plan 70I's notes.
- **The rest of the map reading the college:** walkers by enrollment, the
  crane, labs at work, crowds, banners and weathering are built; a full
  residence's mark is Plan 72G.
