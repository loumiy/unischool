# UniSchool

A turn-based university management sim. You advance week by week over a long
playthrough (target 20–50 in-game years), building an institution from nothing.
The core feeling is the **builder's long arc**: investing time, watching
something grow, and seeing the scale of progress over decades — RollerCoaster
Tycoon or Cities: Skylines applied to building a university. There is no win
condition; it's an indefinite sandbox that naturally tapers once the curriculum
is fully built out and the rankings are topped.

This is a **systems-first build with no art**, on purpose. Everything is kept as
clean data and logic that presentation layers read from without rework. In
particular, **buildings are modeled as data first and placed on a map second**:
`building`/`dorm`/`facility` Buildables can be sited on a tile grid once they
finish, purely as rendering. Placement grants nothing, gates nothing, and no
system reads it; adjacency effects and any economic/prestige feedback from the
map are still deliberately deferred.

The **campus map is the central interface** (see `src/App.tsx`): it holds the
middle of the screen at all times, the build rail sits beside it, and every
other view — Faculty, Curriculum, Treasury, Admissions, Athletics — opens as a
dismissible overlay on top of it. That is a **layout fact, not a mechanical
one**: no system reads the map, and nothing gained authority over the sim by
moving to the middle of the screen.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL. Start the clock to begin.

## Project structure

- `src/state/` — the shared `GameState` type, initial state, and action definitions
- `src/engine/` — the reducer (game loop) and the React store hook
- `src/systems/` — one folder per system; each exports a pure `tick(state)` function
- `src/data/` — seed content (the curriculum, buildings, rival universities)
- `src/components/` — the always-on-screen base layer plus shared chrome: the
  campus map (`CampusMap.tsx`), the build rail beside it (`BuildPanel.tsx`),
  the log ticker under it (`LogStrip.tsx`), the frame every other view pops up
  in (`TabOverlay.tsx`), and the persistent header/status bar, interrupt modal,
  tab nav, and startup screen
- `src/tabs/` — one component per overlay view (Faculty, Curriculum, Treasury,
  Admissions, Athletics); each reads the slice of `GameState` it needs and
  dispatches actions, and knows nothing about being rendered in an overlay
- `src/App.tsx` — the shell: owns the game loop hook and which view (if any) is
  open over the map, renders the persistent chrome, the map + build rail + log,
  and the active overlay

## Architecture — follow these rules strictly

- There is **one central `GameState`** (in `src/state/types.ts`) that all systems
  read and write. It is the single source of truth.
- **Each system is a pure `(state) => void` tick function.** Systems never call
  each other directly — they only read and write shared state, and the engine
  composes them in a fixed order each week.
- The **engine reducer** (`src/engine/reducer.ts`) owns the game loop and
  interprets all actions. UI dispatches actions; systems never dispatch.
- To **add a system**, write a tick function and register it in the `SYSTEMS`
  array in the reducer. To **add content**, edit `src/data/`.
- **All tunable numbers** (costs, rates, bonuses, time scales) go in clearly
  labeled named constants — never scattered magic numbers. Balancing is done by
  feel later, so they must be easy to find and change.

## The central abstraction: Buildables

The single most important structural idea in this codebase is that **courses,
academic buildings, dormitories, campus-life facilities, and (later) sports
facilities are all the same kind of thing** — a *Buildable*. A Buildable is
anything the player commits development capacity to over time. They differ only
in their data, not their machinery.

Every Buildable has:

- a **`kind`** — `course`, `building`, `dorm`, `facility` (and later `sports`).
- a **`cost`** — money spent up front, at the moment development starts.
- a **`duration`** — weeks of development.
- **`prereqs`** — other Buildable ids that must be `done` first. Prereqs may
  **cross majors and cross kinds**: a course can require a building; a course can
  require a course from another school; a facility can require a dorm. Prereqs
  are authored data, not derived from tier.
- optional **`requiresFaculty`** — a faculty field that must be present on the
  roster before development can start (e.g. Microeconomics needs an Economics
  faculty member). This gates *starting*, not completion.
- a **`status`** — `locked` → `available` → `developing` → `done`.
- **`effects`** — applied once, on completion. Effects can grant capacity,
  tuition headroom, satisfaction, applicant-pool bumps, and — crucially — can
  **unlock other Buildables** (this is how the milestone chain works). Effects
  do **not** grant reputation directly — prestige is a slow-moving stock
  computed and drifted toward separately (see "Prestige: a slow-moving stock"
  below), not a sum of completion bonuses.

This means one develop/build flow, one prereq resolver, one completion-effects
applier, serve all content types. **Do not build parallel subsystems for
buildings, dorms, or sports.** Add content and, where a genuinely new rule is
needed, extend the shared Buildable model — never fork it.

### Courses and buildings share one flow

Every Buildable goes through the same develop/build affordance — cost, duration,
prereqs — regardless of `kind`. Where that affordance is *drawn* is a
presentation split and nothing more: placeable kinds (`building`/`dorm`/
`facility`, and later `sports`) live in the build rail beside the map, because
the map is where they end up; `course` Buildables live in the Curriculum
overlay. Both render the same shared machinery, and neither screen
may grow rules of its own.

Placeable kinds gain exactly one extra step beyond that shared flow — placement
on the campus map, once done; `course` Buildables never do. Placement lives in a
separate `placements` record on `GameState` (id -> `{ row, col }`), never as a
field on `Buildable`, so the single Buildable model stays unforked. Keep both
screens dumb.

## The milestone chain (how the curriculum gets its shape)

The 330-course curriculum is not a flat list; buildings give it a progression
spine. The intended climb:

1. Start with **one academic building** and the **gen-ed core** available — nothing
   else. Every major's tier-1 entry course requires the *entire* gen-ed core, not
   just its own school, so the core is the one true root every climb shares.
2. Completing the gen-ed core unlocks **every major's tier-1 course**, across every
   school, all at once.
3. Completing **all tier-1 courses in a school** unlocks the ability to **build
   that school** (a `building` Buildable).
4. Completing that **school building** unlocks the school's **tier-2** courses.
5. Completing **all tier-2 courses in a major** unlocks that **major** — granting
   an applicant-pool bonus and unlocking the major's **tier-3** courses.
6. Completing the **tier-3** courses fully **masters** that major.

Milestone bonuses (school-complete, major-complete, major-mastered) are dedicated
milestone logic in `techSystem.ts` — they are a first-class part of the model,
not an afterthought. Note this makes buildings prerequisites for courses, which
is exactly why prereqs must cross kinds. These milestones no longer grant
reputation directly; instead they are the durable "curriculum breadth" stock
that feeds the prestige target (see below) — finishing a major or a school
raises the ceiling prestige can drift toward, rather than instantly bumping it.

## Prestige: a slow-moving stock

`self.reputation` ("prestige") is a **stock**, not a flow: it is never
incremented directly by completing a course, a building, or a milestone. Once a
year, at the summer admissions boundary, prestige drifts a small fraction of the
way toward a target computed from durable inputs — see
`src/systems/prestige/prestigeSystem.ts`:

- **curriculum breadth** — majors/schools completed *right now* (a stock read
  off the milestone booleans above), not courses added this year.
- **selectivity** — the emergent admit rate from the most recently resolved
  admissions cycle; more selective scores higher.
- **incoming student quality** — the average quality of the class that actually
  enrolled that cycle.
- **faculty quality** — the roster's average current teaching/research, which
  rises with retention.
- **campus life** and **financial resources per student** (endowment measured
  against capacity) — two smaller inputs; the second is what the late-game
  endowment campaigns buy.

Each input is clamped to its own 0..1 share of the target before being
weighted, and the two admissions-derived inputs (selectivity, incoming quality)
are additionally scaled by how big the enrolled class is — being selective with
a class of 200 is a boutique, not a national university, and without that a
school that built nothing at all could drift into the top of the rankings. This
is what keeps the prestige/selectivity/quality feedback loop from spiraling: selectivity and quality alone can only push prestige to a
fixed ceiling (reachable by staying small and cutting tuition), and climbing
past that ceiling toward the very top of the rankings requires the curriculum-
breadth term too — i.e. sustained, decades-long buildout, not an early
course-development sprint.

## Pacing model: money is the throttle, and the growth loop is what makes it bite

**Money is the primary pacing resource, and it is a bottleneck, not a threat.**
It is also the *only* throttle: there is no development-slot mechanic, and none
is coming back. Any number of Buildables can be developing at once, and the
single gate on starting one more is that cash is not negative (plus the faculty
course-slot gate on the curated `requiresFaculty` courses, which is a per-field
capacity rule, not a pacing throttle). Cost is charged up front, so buying
eagerly is what pushes you into the red and stalls the *next* start. (This
supersedes both the earlier "development capacity is the scarce resource"
framing and the purchasable-slots revision of it: both are gone.)

Money can only pace the game if the school's own growth keeps spending it. That
is what the **growth loop** is for, and it is the shape everything in
`financeSystem.ts`, `admissionsSystem.ts` and `campusData.ts` is tuned to:

1. **Curriculum** — finishing majors and schools raises the prestige target
   (`curriculumBreadthScore`).
2. **Prestige** — reputation drifts toward that target once a year, and prestige
   is what lets the school *charge more* (`priceTolerance`) and *draw more*
   applicants at all.
3. **Demand** — the applicant pool is prestige x price x word of mouth
   (satisfaction). Enrollment is earned, never automatic.
4. **Revenue** — enrolled students x net tuition, the dominant income line.
5. **Strain** — more students and more beds mean more instruction cost, more
   upkeep, and diluted satisfaction (every ratio attribute is scored against
   planned capacity), which forces dorms and facilities, which cost money, which
   sends you back to 1.

**Cost leads; revenue follows.** That lag is the whole game, and it is
structural rather than a special case: every cost is charged the moment a
commitment is made (a dorm's price up front, its seat upkeep from the week it
opens, a hire's salary from the week they arrive, a course's running cost from
the week it finishes, and a bigger catalogue raises instruction cost across the
*whole* student body), while every payoff waits for the annual summer
admissions boundary, and the prestige payoff waits for a 12%-a-year drift on top
of that. Adding capacity and students is supposed to hurt before the tuition
heals it.

The loop turns roughly once per course tier, escalating each time:

- **Gen-ed / intro** — the tutorial-by-design ramp. Starting cash covers it
  comfortably; money barely registers. Strain is ~zero on purpose.
- **Tier 1** — the first real pinch: a full department roster and 36 entry
  courses roughly triple weekly opex while enrollment cannot move until the
  next summer. The founding cushion visibly drains.
- **Tier 2** — enrollment growth forces dorms and the dining/parking/health
  capacity that keeps satisfaction from throttling demand; their cost lands
  ahead of the class that justifies them.
- **Tier 3** — the largest, slowest turns: big buildings, mature faculty at peak
  salary, the widest cost-before-revenue gaps — easing only as prestige- and
  enrollment-driven revenue finally scales.

Consequences that the code must honor:

- **No hard insolvency game-over.** A cash shortfall should *stall expansion*
  (you cannot start new development while in the red), not end the run. "Stall,
  don't die" is the bottleneck expressed mechanically, and it fits the
  no-win-condition sandbox. Every downward path has a floor, deliberately:
  empty beds are charged at a reduced mothball rate, an extra student is always
  worth more than they cost, satisfaction (and so word of mouth) is floored,
  curriculum breadth is a stock that never decreases, and the tuition/aid
  decision and firing faculty are zero-cost recovery levers.
- **The trickle must scale with the school.** Revenue grows with enrollment and
  prestige (both of which the player grows through play), and the bottleneck is
  an early-and-mid-game feeling that should *ease* as the school matures — the
  late-game pleasure is finally affording the big things freely. Do **not** tune
  the trickle as a flat constant, which would make hour 20 feel identical to
  hour 2 and flatten the long arc.
- **Late game still needs a sink.** The dorm and facility chains run out and the
  curriculum finishes, so a mature school's surplus needs somewhere to go or
  cash stops mattering exactly when the player finally has a lot of it. That is
  what endowment campaigns are (see `financeSystem.ts`): a repeatable,
  ever-more-expensive conversion of cash into endowment, which pays out into
  income and feeds a capped prestige input.
- **Reveals, not new scarcities.** Where growth opens new options, gate them on
  thresholds the loop already produces (enrollment reached, prestige level,
  majors completed) the way Cities: Skylines gates on population milestones. A
  blanket "finish N courses before you may build" gate is exactly the
  sequencing-jail that removing development slots was meant to end.
- Keep finances structured so a richer **demand-curve** model (where prestige
  shifts the frontier between tuition and enrollment volume) can replace the
  simple version later without touching the rest of the system.

Balance claims about any of this are checked with `npm run sim` — a headless
fast-forward through the real reducer under several scripted strategies (see
`sim/balanceSim.ts`), which prints cash/enrolled/prestige/opex by year.

## Interrupts: the decision-event system

Several features share one mechanic: **pause the clock, surface something the
player must resolve, then resume.** Rather than special-case each, there is a
single interrupt system. A system enqueues an interrupt onto `GameState`; the
game loop halts ticking while an interrupt is pending; the UI renders it as a
modal; the player resolves it by dispatching an action, which clears it and lets
the clock resume.

Everything that needs to stop time rides on this one mechanism:

- **Annual admissions** (see below) — a summer interrupt.
- **The U.S. News report** — the "you've entered the rankings" alert and the
  annual standings update.
- **The tutorial** — a scripted sequence of interrupts (see below).
- **Later:** decision-interrupt events (donor offers, faculty scandals,
  facilities failures) that give the quiet weeks between milestones their texture.

Build this once, generically. Do not bolt the report, admissions, or tutorial on
as one-off pauses.

## Admissions: an annual summer decision

Admissions is **a once-a-year task, in the summer**, delivered as an interrupt.
When it fires, the clock stops and the player sets the coming year's **tuition,
financial aid, selectivity, and target enrollment**; those settings then drive
the sim passively for the rest of the year. **Tuition is set once a year here —
there is no live, continuously adjustable tuition control.** Shape the aid /
selectivity / tuition inputs with the future demand-curve model in mind.

## Rankings: the U.S. News report

Rivals are populated densely enough that a **top 50** is meaningful (~55 schools,
not 5). Rival prestige **fluctuates dynamically** year to year rather than
sitting static while the player grows. The report is a **mid-game reveal**:

- The player starts **unaware** of the report.
- Reaching enough prestige to crack the **top 50** (which should take some time)
  fires a one-time **"you've entered the rankings"** interrupt.
- Thereafter the player gets an **annual report** (top 50 standings) once per year.

"Standing among peers" does not need to be shown constantly — the annual report
is the touchpoint.

## Startup and school type

A **startup screen** lets the player **name the university** before play. The MVP
also asks one structural question: **private vs. public**. That single choice
sets starting conditions — starting cash, prestige bonuses, applicant-pool size,
tuition ceiling, any baseline funding — expressed purely as tunable constants.

**Archetypes emerge, they are not chosen.** The game should let different kinds
of successful school (Harvard-like, ASU-like, Johns-Hopkins-like) arise from the
player's choices over time, rather than being selected up front. Private/public
is the only starting fork; everything else is emergent. (Later: save/load, color
schemes, more customization.)

## Faculty

Faculty are **named individuals** with attributes (teaching, research, salary,
morale); students are **aggregate cohorts**, not individuals. Faculty are needed
to unlock course development via `requiresFaculty`, so a **real hiring pool** is
required — hiring is a genuine subsystem, not a stub (`HIRE_FACULTY`/
`FIRE_FACULTY` are wired up in the reducer; see `facultySystem.ts`).

**Faculty are ageless: no aging, no retirement, no rival poaching.** This is a
deliberate, settled choice, not a placeholder — a hire stays on the roster
until the player dismisses them. What retention buys instead is growth: a
faculty member's teaching/research stats start below a rolled ceiling
("potential") and rise toward it over years of tenure, then plateau; salary
rises with them, on its own slower-to-plateau curve, so a long-retained star
costs substantially more than the day they were hired (see `facultyData.ts`'s
`grownStat`/`facultySalary`). This makes faculty a genuine **prestige
investment** — aggregate roster quality is one of the four inputs to the
prestige target (see `prestigeSystem.ts`) — with a real "great cheap early
hire, kept and matured" payoff. The scarcity that keeps a player from staffing
every school at top quality is money and hiring-pool availability, not
attrition: salaries compound as a roster matures, and the candidate pool
refills slowly, so specialization is a choice forced by what you can afford
and who's available, not by losing people you already have.

## Save / load

The game is measured in hours; the annual report and annual admissions make a
full run long, so **a refresh must not destroy a run**. The whole `GameState`
is JSON-serialized into a single versioned `localStorage` key (see
`src/state/persistence.ts`). It is written at the **annual admissions
boundary** — the one point where a meaningful chunk of progress has just been
committed — when a university is founded, and whenever the player hits
**Save**. On mount, `useGame.ts` resumes a valid save instead of showing the
startup screen; a save that is missing, unreadable, corrupt, or written under a
different `SAVE_VERSION` falls back to a new game rather than crashing. **New
Game** erases the save and returns to the startup screen.

This stays a ten-line module only because **`GameState` is plain data** — no
functions, no `Date`s, no `Map`/`Set`, no references between slices — so every
field survives a JSON round trip untouched and there is no per-field serializer
to keep in sync. Keep it that way; anything added to the state that isn't
JSON-round-trippable breaks save/load silently. State must also stay
reasonably light as it grows: a fresh run is ~121 KiB, and the per-year
`YearSnapshot` and the capped log are what keep a decades-long run in the low
hundreds of KiB.

`SAVE_VERSION` is the escape hatch for the shape changing. Bump it whenever a
field is added-as-required, renamed, retyped, or given a new meaning — an old
save is then discarded rather than half-loaded. Additive *optional* fields
don't need a bump. There is deliberately no migration path yet; when one is
wanted, it belongs in `persistence.ts`'s load path, keyed on the version it is
migrating from.

## Working style for coding agents

Keep changes focused on the task described. If you spot a tension or a decision
the task doesn't specify, **flag it in the PR summary rather than silently
choosing** — surfacing tradeoffs is more useful than smoothing them over. After
making changes, run `npm run build` and confirm it compiles before opening a PR.
Preserve the pure-tick-function architecture and the single-Buildable model in
any refactor.

## Roadmap

**Keystones (build first, everything hangs off these):**

- The **generalized Buildable model** — unify courses and buildings/dorms/
  facilities into one type with `kind`, `cost`, `duration`, cross-kind `prereqs`,
  `requiresFaculty`, and unlock-granting `effects`.
- The **interrupt system** — one generic pause-the-clock-and-resolve mechanism.

**Near-term:**

- Speed simplification: one real-game speed plus one sandbox-only fast speed.
- Startup screen: name + private/public starting conditions.
- Money-as-bottleneck finance: remove hard game-over, stall-in-the-red, scaling
  trickle. The rebalancing pass that money-paces-alone needed is done — costs
  now lead revenue at every turn of the growth loop (see "Pacing model"), with
  the constants grouped for hand-tuning and `npm run sim` to check the shape.
- Annual summer admissions interrupt (tuition/aid/selectivity/enrollment).
- Dense rivals (~55) + the U.S. News report as a mid-game reveal.
- The academic-buildings / milestone-chain / curriculum-depth cluster: school &
  major buildings, milestone bonuses, course descriptions, cross-kind and
  cross-major prereqs, faculty-gated courses (with hiring wired up).
- Save / load.
- Further decomposition as screens grow (`App.tsx` is already a thin shell:
  chrome, the map + build rail + log, and whichever view is open over them).

**Later (Phase 2+):**

- Tutorial: a scripted interrupt sequence walking the Year-0 opening (develop
  gen-ed, hire faculty) and handing off to Summer Year 1.
- **Sports** as a layer on rivals: teams on a parallel develop track, coaches/
  trainers as faculty-like individuals, facilities as Buildables, a second
  ranking axis. Deferred deliberately; it rides on Buildables + hiring + rivals
  all being mature.
- Campus life depth and richer decision-interrupt events for week-to-week texture.
- Faculty lifecycle (aging, retirement, poaching) if desired.
- A richer demand-curve finance model with prestige/scale archetypes.
- Campus map depth: adjacency weighting between neighboring buildings, and any
  economic/prestige feedback from the layout. The map itself (a fixed tile grid,
  placement of finished `building`/`dorm`/`facility` Buildables, SVG rendering)
  now exists as a visual-only layer; nothing mechanical reads it yet.

UniSchool — systems-first, no art (yet)
