# UniSchool — Backlog

*The work that has been named but not yet planned. Nothing here is sequenced
into PRs; turning one of these into a sequence is what writing the next plan
does (see `docs/plans/README.md` for how that is done and named).*

**This is the one forward-looking document in the repository.** The docs in
`docs/design/` and `docs/architecture/` describe the game as it is; the plans
in `docs/plans/` are closed records of work that has landed. If something is
going to happen but has not, it belongs here. What has come off, and where
it went, is in [`docs/backlog-archive.md`](docs/backlog-archive.md).

*Re-read against the code on 12 October 2026, after Plan 97 (0.1.0 on
itch.io). Only work still to do or decide is left.*

---

## Decisions waiting on the owner

- **Targets against actuals** (the owner, kept here at their request).
  Satisfaction shows *target* beside *today*, and prestige shows
  "current → target" and "Drifting toward…". The owner likes the idea but
  suspects it confuses a new player. Decide whether to keep both, keep one,
  or show only the actual with a direction arrow.

- **The price is set blind, the other half** (A4-6). The tuition slider
  shows the tier and what families expect at the college's prestige
  (Plan 96I), and once a price is set the summer says why the pool moved
  against last year, the price among the factors (`poolChange`,
  `systems/admissions/yearOverYear.ts`). What is missing is last year's
  price and the pool it drew, shown beside the slider *before* the
  price is set. Plan 89's Admissions Office shows a range for a college
  that opens it.
- **Hide other schools' offers in a claimed hall** (Plan 78D, for the
  owner). They show behind a confirmation today; hiding them is one line
  (`78-learning-the-game.md`, the owner's notes).

- **A full endowment can still carry an unspecialized college to first**
  (accepted by the owner in Plan 85I, "worth watching"). Decide whether it
  needs anything or comes off.

## Launch: toward Next Fest and 1.0

*The timeline is decided (the second review's B6-4, Plan 95): Next Fest in
June 2027 (registration closes 25 April 2027). The Steam page goes live by
January 2027 so wishlists build before the fest, the demo goes live in
February–March, and the game launches in late summer.*

- **The playtest's findings** (B6-5). 0.1.0 is public on itch.io (Plan 97)
  and measures a first run's real length and whether players reach year 30.
  Read the numbers and decide what they change.
- **The Steam page.** The store forms' AI-disclosure answers are drafted in
  `docs/store/ai-disclosure.md`; nothing is on a store page yet. The price
  is undecided ($14.99 was recommended in the October review's area 6).
- **The owner's own tasks** (B6-3):
  - a human edit of the most-read text: the founding letters, the summer,
    the specialization letter and the Final Report;
  - a devlog started from the plans' quotes;
  - the capsule art and the logo, commissioned.
- **Held from Plan 97.** Moved out of the itch.io playtest by the owner
  (8 October 2026); both come back with the demo launch and its marketing
  push. Their specs stand in [Plan 97](docs/plans/97-the-itch-playtest.md);
  the build flags they need (`VITE_EDITION=demo`, `VITE_PLATFORM=desktop`)
  already exist (97B), and the feedback module already lists the demo's
  end as a place its link opens from (97F).
  - **97G — the ten-year demo.** `VITE_EDITION=demo` ends the run after
    the tenth summer, on an end screen that shows what is ahead; sandbox
    hidden; demo saves carry into the full game, one way.
  - **97H — the desktop build.** Electron in `desktop/`, loading the built
    game through `app://`; Windows, macOS and Linux packages from the
    release workflow; unsigned until the Steam plan signs them.
- **1.0.0** (what Plan 70L kept for launch). `package.json` to 1.0.0 (it
  is 0.1.0), `LAUNCH_SAVE_VERSION` confirmed as the public build's (78
  today), and this file updated with what launch leaves for later.

## Named, not sequenced

*Each is a real piece of work with a known shape; none has been turned into
a sequence of PRs.*

### The college's choices

- **Size levers** (A4-5). Declining an offer (78D) and recruiting (80G)
  exist; a target enrolment, or *stay small on purpose*, in the summer's
  admissions beat does not.
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
- **Walks that draw straight** (A1-7, and the second review's B1-4, partly done). Diagonal runs whose
  tiles touch only at corners already draw as one straight band (Plan 24F,
  `components/pathways.tsx`). A run of edge-joined tiles (a slow freehand
  drag, and the walks the tools lay) still draws as steps, and a curve is
  only rounded corners. Either draw such a run as a polyline through its
  tiles' centres, or have the path tool lay corner-joined diagonals. About
  one PR.
- **Doors that meet the campus** (A1-8, and the second review's B1-5). The
  second review counted 814 doors onto lawn on 187 buildings over three
  year-51 campuses
  ([`b1-doors-grown.md`](docs/reviews/2026-10-game-review-ii/data/b1-doors-grown.md)). At the review's commit the door
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
     and bridges for the paths), a new tile kind beside the road. Rowing,
     the one sport still wanted, waits on it;
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
  - **Measured again (Plan 96G).** A headless TICK at year 45 is 47 ms,
    of which the state's clone is 5 ms. Under a tab, after 96G stopped the
    map there, a week costs about 160 ms of main thread in a production
    build, most of it React rendering the shell and the open tab, which a
    worker would not move. Rendering less per week (memoised tabs, a
    shell that re-renders only what changed) is the larger win.
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
- **Founding a team directly**, not through a sport club's petition. Plan
  89's Athletics Development Office builds it for a college that opens the
  office; a college without the office still cannot.

### Plan 85's leftovers

- **Three slow readings still read the old stocks**, not the pillars: the
  faculty market's standing (`facultyData.ts`, `marketStandingOf`), the
  sports' pull (`studentLifeData.ts`, `collegePull`) and the research
  powerhouse tag (Plan 85I, the owner's decision 2).
- **The championships goal player never reaches the specialization
  milestone** (85G), so the review tool cannot measure the athletics
  specialization.

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
  slot.
- **No notice when an unlock is earned.** Unlocks that carry across runs
  exist for the four bonus vernaculars (`state/unlocks.ts`), and
  `recordUnlocks` returns what was newly earned, but both callers ignore
  it.
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
