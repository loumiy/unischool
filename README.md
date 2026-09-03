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
other view — Faculty, Curriculum, Treasury, Admissions, Student Life,
Athletics — opens as a dismissible overlay on top of it. That is a **layout fact, not a mechanical
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
- `src/data/` — seed content (the curriculum, buildings, rival universities, and
  the authored decision-event table)
- `src/components/` — the always-on-screen base layer plus shared chrome: the
  campus map (`CampusMap.tsx`), the build rail beside it (`BuildPanel.tsx`),
  the log ticker under it (`LogStrip.tsx`), the frame every other view pops up
  in (`TabOverlay.tsx`), and the persistent header/status bar, interrupt modal,
  tab nav, and startup screen
- `src/tabs/` — one component per overlay view (Faculty, Curriculum, Treasury,
  Admissions, Student Life, History, Athletics); each reads the slice of
  `GameState` it needs and dispatches actions, and knows nothing about being
  rendered in an overlay
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
separate `placements` record on `GameState` (id -> `{ row, col, w, h }`: the
top-left tile plus the footprint covered from it), never as a field on
`Buildable`, so the single Buildable model stays unforked. **How big a footprint
a Buildable gets is a placement rule, not data on the Buildable** — a school
hall covers 2x2 tiles, a dorm 2x1, a lab 1x1 — and it lives in
`campusMap.ts`'s `footprintOf`, keyed on the `kind`/`facilityType` the Buildable
already carries. Size is purely geometric: a bigger building grants nothing and
costs nothing extra. Keep both screens dumb.

## The milestone chain (how the curriculum gets its shape)

The 421-course curriculum is not a flat list; buildings give it a progression
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
7. Once most of a school's majors are complete — or, for a doctorate, once the
   school has a lab — a **graduate program** opens on top of it, and completing
   one founds it (see "Graduate programs" below).

Milestone bonuses (school-complete, major-complete, major-mastered,
grad-program-complete) are dedicated
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
  off the milestone booleans above) plus the **graduate programs** founded on
  top of them, not courses added this year. The four shares inside this one
  input sum to 1, so finishing everything scores exactly 1 and graduate work
  raises no ceiling — it occupies the last 0.15 of the one that already
  existed (see "Graduate programs").
- **selectivity** — the emergent admit rate from the most recently resolved
  admissions cycle; more selective scores higher.
- **incoming student quality** — the average quality of the class that actually
  enrolled that cycle.
- **faculty quality** — the roster's average current teaching/research, which
  rises with retention.
- **research standing** — the breakthroughs and prizes the school's labs have
  produced (see "Research" below). A monotone count of the same shape as
  curriculum breadth, weighted small and clamped like every other input.
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
single gate on starting one more is that **the school can actually pay for it** —
cost is charged in full, up front, and a purchase it can't cover is simply not
offered (plus the faculty course-slot gate on the curated `requiresFaculty`
courses, which is a per-field capacity rule, not a pacing throttle). The pacing
is the *wait* to afford the next thing, never a debt you have to dig out of.
(This supersedes both the earlier "development capacity is the scarce resource"
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
- **Tier 1** — the first real pinch: a full department roster and 42 entry
  courses roughly triple weekly opex while enrollment cannot move until the
  next summer. The founding cushion visibly drains.
- **Tier 2** — enrollment growth forces dorms and the dining/parking/health
  capacity that keeps satisfaction from throttling demand; their cost lands
  ahead of the class that justifies them.
- **Tier 3** — the largest, slowest turns: big buildings, mature faculty at peak
  salary, the widest cost-before-revenue gaps — easing only as prestige- and
  enrollment-driven revenue finally scales.

Consequences that the code must honor:

- **No hard insolvency game-over.** A cash shortfall should *stall expansion*,
  not end the run. "Stall, don't die" is the bottleneck expressed mechanically,
  and it fits the no-win-condition sandbox. Note the two distinct forms this
  takes: an unaffordable Buildable is refused at the moment of the decision, so
  the player cannot buy their way into debt at all; and if the *operating*
  budget runs a deficit, cash can still drift below zero, at which point nothing
  with a cost is startable until it recovers. Every downward path has a floor, deliberately:
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
- **Milestone celebrations** — a stop-the-clock moment for the handful of
  genuinely special accomplishments (a major completed, a major mastered, a
  school finished), showing what was unlocked and what it did to the prestige
  target. Deliberately *not* fired by routine course completions: which
  milestone kinds qualify, and how close together two celebrations may land,
  are named constants in `src/data/eventData.ts`, so the frequency is a
  one-line dial. Milestones are queued (`s.events.pendingMilestones`) rather
  than fired on the spot, so a milestone landing on the admissions or report
  week is delayed to the next quiet week instead of being dropped, and a burst
  of simultaneous completions folds into a single modal.
- **Decision-interrupt events** — the donor offers, faculty departures and
  facility failures that give the quiet weeks between milestones their texture.
  Authored as data (`src/data/eventData.ts`: trigger conditions, prompts,
  choices, effects) and fired by one ordinary tick function
  (`src/systems/events/eventSystem.ts`) on a weighted random draw across
  whatever the current game state makes eligible. Their effects route through
  hooks that already exist — cash and endowment, the satisfaction stock, the
  faculty roster and hiring pool — and never write prestige directly, because
  prestige is a stock (see above). Every event is guaranteed to offer at least
  one zero-cost choice, so no event can strand a school that has no money.
- **A research prize** — the one research output momentous enough to stop the
  clock (see "Research" below). Grants and breakthroughs never do.
- **Greek-life decisions** — the Hellenic Council opt-in, chapter scandals
  and chapter-housing petitions (see "Student life" below). These are
  entries in the decision-event table above rather than a stream of their
  own, so they change the MIX of what stops the clock, never how often it
  stops. Clubs and new chapters never stop it at all: they queue as
  petitions and are answered in a digest folded into the summer admissions
  interrupt.
- **A student demand** — the one stop-the-clock beat student life gets of its
  own (see "Student demands" below), and only at a school whose satisfaction
  has fallen below the trigger threshold, so a well-run run never sees one. It
  queues like a milestone rather than firing on the spot, and it shares the
  decision events' cooldown, so it redistributes the existing texture budget
  instead of adding a stream on top of it.
- **The university charter** — a single question, asked once, the first quiet
  week after any lab finishes: keep the "College" the school opened as, or
  become a "University". Cosmetic in full.
- **Later:** the tutorial sequence.

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

A **startup screen** lets the player **name the school** before play — the
player's half of the name only; every school opens as a *College* (see "College,
and University" above). The MVP also asks one structural question: **private vs.
public**. That single choice
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

**Recruiting is a standing, churning market, not a post-and-wait errand.**
`s.candidates` holds a long list of people currently available; the player
appoints straight off it, immediately, with no posting to open, no fee and no
countdown. What turns over is the list itself: every week
`facultySystem.ts`'s `tickCandidatePool` ages every listing, withdraws the ones
that have been up longer than `CANDIDATE_LISTING_WEEKS`, and adds new ones to
bring the pool back toward `CANDIDATE_POOL_TARGET`. A new listing's field is a
weighted draw — how many courses in the whole curriculum need that field
(read off `techData.ts`, so it can never drift from it), times an authored
per-field *market supply* multiplier for how thin that discipline's academic
job market is. All of it lives in one labelled tuning block in
`facultyData.ts`.

That weighting is the point, and both halves are load-bearing. Demand alone
cannot produce a common/rare split — after the field re-specialisation every
field carries between 9 and 20 courses, so weighting by course count alone
would make all 28 equally intermittent. The supply multiplier is what makes an
English or Computer Science hire something you pull whenever you want one
(~80-83% of weeks someone is listed) while a Clinical Health, Neuroscience or
Artificial Intelligence specialist turns up every few months (~43%, ~28% and
~25%) and is worth taking the moment they do. **Specialisation is meant to create interesting scarcity while
churn removes boring scarcity** — if the pool ever covers every field at once
the specialisation stops mattering, and if it is too short or too slow
recruiting is just tedium again. Those are the two failure modes the constants
are tuned between.

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
attrition: salaries compound as a roster matures, and a thin-market field
puts someone on the list only every few months, so specialization is a choice
forced by what you can afford and who happens to be available that week, not
by losing people you already have.

## Graduate programs

The layer that grows on top of a finished undergraduate school, and the
deliberately **low-risk "one loop" version** of it. A graduate program is **more
curriculum**: a small cluster of higher-tier `course` Buildables gated on an
undergraduate parent, feeding the same prestige stock, pulling the same faculty
through the existing `field` demand, and sized in the same weeks-of-opex
language as everything else. There is **no second admissions funnel and no
second student population**.

Two boundaries hold absolutely, and are the reason the feature is this shape:

1. **No second population.** No graduate-student count, no separate
   housing/dining/satisfaction ratio, no parallel funnel. The students in a
   graduate course are the same `s.students` the summer funnel already commits,
   and graduate courses are curriculum breadth like every other course. If
   differentiating medicine from law ever seems to need a distinct population,
   that is the signal to stop and re-open the design rather than build one.
2. **No bespoke per-school system.** Medicine, law and the MBA are
   **mechanically identical**. Everything that distinguishes them is authored
   data in `techData.ts`'s `GRADUATE_PROGRAMS`: the gate, the prestige-input
   weight, the cost/upkeep rung, which faculty field each course demands, and
   the names.

**The graduate "course" is a plain `course` Buildable.** It adds no
`BuildableKind`, no tier-above-tier-3, and no `graduate` flag — only one
optional field, `graduateProgram`, naming which program a course belongs to.
That was the shape that touched least: as a `course` it is academic upkeep, it
counts toward the instruction cost of the catalogue, it occupies a faculty
course-slot, and it is unplaceable, all without a single `kind === 'course'`
read in the codebase having to learn about it. A new kind would have meant
editing every one of those just to put graduate courses back where they already
were.

**Six programs, thirty-seven courses**, each a handful rather than a second
nine-course major (Medicine and Law are the two exceptions — see "Two of six
get their own building" below):

| Program | Degree | Home school | Gate | Own building? |
| --- | --- | --- | --- | --- |
| School of Medicine | MD | Health Science | **Science AND Health Science** near-complete | **Yes — BLDG-MED** |
| School of Law | JD | Social Sciences & Humanities | Social Sciences & Humanities near-complete | **Yes — BLDG-LAW** |
| Graduate School of Business | MBA | Business | Business near-complete | No |
| Doctoral Program in Engineering | PhD | Engineering | a finished lab in Engineering | No |
| Doctoral Program in the Natural Sciences | PhD | Science | a finished lab in Science | No |
| Doctoral Program in Health Science | PhD | Health Science | a finished lab in Health Science | No |

**One predicate, two readings** (`techData.ts`'s `graduateGateMet`), both taken
off the seed helpers that already exist, so graduate gating can never drift from
the school structure the rest of the game reads:

- a **professional school** gates on `milestoneSchools()` — enough of its parent
  school's majors carrying the same `major-complete:` milestone prestige's
  curriculum breadth reads. "Enough" is one dial,
  `PROFESSIONAL_GATE_MAJOR_SHARE`, at 0.75: five of a six-major school. It is
  deliberately *not* `school-complete:` (which additionally wants every major
  **mastered**), which lands so late that the professional schools would arrive
  with nothing left to spend the rest of the run on.
- a **research doctorate** gates on `researchSchools()` — a finished lab in its
  parent school, the same gate research itself and the university charter hang
  off. Three schools bear labs after the Science reorg, which is exactly why
  there are three doctorates.
- **medicine's gate is two of those readings and-ed together** — the School of
  Science *and* Health Science, because medicine draws on the basic sciences and
  the applied health majors both. A two-school gate is a conjunction, not a new
  kind of gate.

**Reveal, not scarcity.** A program is invisible until its gate opens, the way
tier-3 courses are invisible until their major completes. There is no wall of
greyed-out professional schools from year one, and the Curriculum tab's headline
completion ring counts revealed graduate work only, so a `0 / 421` never
announces courses the player has no way to see.

**Prestige: capped inputs only, and no new weight.** Founding a program never
writes `s.self.reputation` and carries no completion bonus. Graduate breadth is
the **fourth share inside the existing curriculum-breadth input** — 0.34 major
complete / 0.26 mastered / 0.25 school complete / **0.15 graduate**, still
summing to 1 — so the ceiling did not move: finishing everything scores exactly
1 and no more. Inside that share, programs are weighted against each other by an
authored `prestigeWeight` (medicine 2.0, law 1.6, the MBA 1.4, each doctorate
1.0) and normalized by the total. **That is how a top law school is allowed to
move standing more than its five courses suggest** — a share of an
already-capped input, never a weight of its own — which is the same discipline
the research cap follows. A research doctorate additionally credits the
**research** input (two credits each, into the same clamped 0..1 the
breakthroughs feed), because a PhD program genuinely *is* research standing;
professional schools get nothing there.

The deliberate consequence: a fully built **undergraduate** catalogue now scores
0.85 on curriculum breadth rather than 1.0. Finishing the catalogue is no longer
the top of the curriculum curve — it is the point at which the graduate curve
opens.

**Cost is the most expensive rung in the game**, with its own constants rather
than an extension of the tier table, and aimed squarely at the late-game "nothing
to buy when cash-rich" gap: a professional course is $6M / 40 weeks / $12k a week
forever, a doctoral course $4M / 32 weeks / $7k. Two rungs because cost is one of
the authored axes professional schools are differentiated on. All six programs,
plus the two professional-school buildings below, are about **$203M of capital
and $394k a week of upkeep** — real, and about 4% of a mature school's opex, but
see the balance notes: the endowment campaign remains the *unbounded* sink and
graduate programs are a finite one.

**Faculty come from the existing `field` demand**, authored **per course** the way
the gen-ed core is rather than per program, which is what lets medicine lean on
Clinical Health, Biology, Neuroscience and Public Health at once and the MBA on
all four business departments. One new field was needed and only one: **`Law`**.
Every other graduate course is taught by a department that already exists, but
hanging the law school off Political Science would have meant a hire made to
teach Comparative Politics could staff Constitutional Law, and the law school
would have cost no new recruiting at all. Law is also the only field whose demand
is entirely graduate, so it carries the taxonomy's only above-1 market-supply
multiplier — an oversupplied market with nowhere to teach until a school founds
one.

**The Curriculum UI** fits most programs into the view that already exists: a
revealed program is one more labeled sub-group inside its parent school's
section, marked as the higher tier it is, with its credential beside the name
and one line naming the gate it cleared. That's still exactly how the MBA and
all three PhD doctorates work — they build on the same subject matter as their
parent school and correctly live there. Medicine and Law are the two
exceptions (see below). The circle-network overhaul of the curriculum view is
a separate, later arc and was not attempted here.

**Two of six get their own building.** Medicine and Law are the only
programs that award an external professional degree rather than extending
their parent school's own subject matter, and each stands as its OWN
top-level Curriculum section — own heading, own completion ring, its own
`BLDG-MED`/`BLDG-LAW` building as the section key — never a sub-group inside
Health Science or Social Sciences & Humanities. The MBA and the three PhD
doctorates are unchanged.

The gate chain reuses every existing mechanism, adding none:

1. The building is a plain `building`-kind Buildable, seeded 'locked', shaped
   exactly like an undergraduate school building — except its prereqs are
   empty and its availability instead carries the SAME `graduateProgram`
   field a graduate course does. `meetsUnlockGates` (techSystem.ts) already
   routes that field through `graduateGateMet`, so the building reveals the
   moment the program's ordinary academic gate reads true — no second gate.
2. The program's first course adds the building as an extra prereq — a
   cross-kind course-requires-building prereq, exactly like an undergraduate
   tier-2 course requiring its school building.
3. So the full chain is: academic gate met -> building revealed -> building
   BUILT -> first course available -> the rest of the program follows its
   ordinary internal prereqs, unchanged.

The Curriculum tab reveals each section on the same boolean an undergraduate
school section reveals on — `building.status === 'done'` — not merely on the
academic gate, so there is no greyed-out School of Medicine sitting on screen
years before the building exists (reveal, not scarcity, same as everywhere
else in this feature).

Two judgment calls from this pass, flagged rather than resolved quietly:

- **Naming rights** (the naming-rights decision event, see "Interrupts")
  deliberately does NOT offer BLDG-MED/BLDG-LAW — a "Johnson School of Law"
  is thematically obvious, but the event's donor pool is looked up through
  `discoverySchools()`, which only ever covers the seven undergraduate
  schools; wiring a professional building in for real needs a school-shaped
  lookup for it too, plus a heading path in the Curriculum tab that reads a
  professional section's `donorSurname`. Flagged as follow-up scope rather
  than attempted alongside the buildings themselves.
- **A save that had already founded Medicine or Law** under the old
  buildingless rule keeps every one of those courses done — nothing is
  un-finished, no milestone is revoked — but the new building still arrives
  locked and, since the academic gate it waits on is a read of milestones
  that save already earned, flips to buildable on the very first tick after
  load. The honest read: a school that had already staffed and founded a
  professional school is handed a brand-new, real construction bill for a
  hall it apparently never had. That is new content applying retroactively,
  accepted as the cost of the feature rather than smoothed over — see
  persistence.ts's v11 -> v12 migration comment.

## Research: the quiet second output

Research is **mostly-silent flavour, not a second decision stream**. The
mid-game stays a build-and-price game; research runs underneath it, resolving
into systems that already exist.

**Only a school with a finished lab does research at all.** Labs
(`facilityType: 'lab'`, authored in `techData.ts` for ten lab-heavy majors)
already require their school's building and their major's entry course, so the
full chain is school building -> lab -> research. Faculty are tied to a school
through the field they were hired into, so a hire researches once *any* school
their field teaches in has a lab — and a school with no lab contributes exactly
zero however many professors it employs. That invariant is the feature; keep it
true through any refactor.

**Research points are one aggregate stock** (`s.research.points`), not a
per-school ledger. The "only a school with a lab produces" rule lives in the
production function (`researchData.ts`'s `weeklyResearchPoints` walks the roster
school by school and skips every school with no finished lab), not in where the
total is kept, so a per-school record would be state no rule actually needs.
Weekly output is weighted by **quality and seniority** — the research stat, a
tenure premium on its own slower curve, and any prizes won — and multiplied
campus-wide by `effects.researchRateBonus`, live-read off every finished
Buildable that carries one (each lab, plus the research library). That effect
field is the hook: it multiplies output, it never creates it.

Every so often — a weekly chance that **rises with the banked stock**, floored by
a cooldown, the same two-dial cadence machinery the decision events use — the
stock converts into one of three outputs, **spending** its cost:

- **Grants** -> cash. Silent: a log line, straight into the operating account.
  Sized in **weeks of opex**, like the decision-event table, so the figure scales
  across a run spanning four orders of magnitude of budget.
- **Breakthroughs** -> prestige, and **only through a capped input**. A
  breakthrough increments a count that `prestigeSystem.ts`'s `researchScore`
  reads as one clamped 0..1 input among seven. It never writes
  `s.self.reputation` — that would be exactly the completion-bonus flow the
  prestige model exists to forbid (the decision-events pass refused events any
  prestige access for the same reason). Weighted small on purpose: a lab-heavy,
  curriculum-thin school can move its prestige target by at most the research
  weight, nowhere near enough to outrun the breadth term.
- **A prize** -> the momentous case, and the only one that stops the clock. A
  named faculty member gains a permanent honor, a permanent boost to their own
  research output and to the school's prestige input, and a permanently higher
  salary. Rare twice over: the most expensive output *and* the least likely of
  the three even once affordable.

The prize needs the one new `Faculty` field, **`acclaim`**. Teaching, research
and salary are all recomputed from potential + tenure on *every* tick, so a
permanent post-prize bump cannot hang on any of them — it would be erased the
following week. Both the salary curve and the research-output formula read
`acclaim` as an input instead.

**How wide research reaches**, and what still doesn't. Three schools bear labs
— Engineering, Health Science, and the School of Science — and Science is the
one that widened it, because its majors are the lab sciences (Chemistry,
Biology, Physics) and its FIELDS are the ones that turn up everywhere else in
the catalogue. Since a hire researches once *any* school their field teaches in
has a lab, the Science Center puts a Mathematics hire made for Data Science, a
Physics hire made for Aerospace Engineering, and a Psychology hire (which could
previously never research at all, Psychology having sat in Social Sciences) all
into production at once. Neuroscience carries Health Science's second lab,
which is what keeps that school a research school after Biology moved to
Science and Pre-Med and Dentistry were retired.

**The tension that remains** is narrower but real: Business, Arts & Media,
Social Sciences & Humanities and Computer Science still have no lab-gated
major, so a run concentrated in any of them produces nothing directly — though
Computer Science now reaches research sideways, through the Mathematics
department it shares with Science. Widening it further is still the same
one-line data change (`techData.ts`'s `LAB_GATED_MAJOR_PREFIXES`); what a
humanities or business "lab" should even be is a content question, not a
mechanical one, and is deliberately left open.

## Student life: clubs and Greek letters

The layer that grows *inside* the campus rather than on it, and the second
thing after research to be gated on buildings the player already put up.
Two layers, the second gated by the first, both riding machinery that
already exists — there is no third interrupt stream and no parallel
subsystem.

**Clubs.** Once a **student center** stands (any tier — read off
`facilityType`, so a retune of the facility chain can't silently close the
gate), students occasionally organise one. This is deliberately the
*lightest* beat in the game and **never stops the clock**: a formation
raises a **petition** — a record on `s.orgs.pendingPetitions` and a log
line — and a whole year's petitions are answered together in a **digest
folded into the summer admissions interrupt**, which is a stop the player
was already making. Approve and the club adds a small, permanent
contribution to the satisfaction target and a recurring line on the weekly
statement; decline and the students notice, transiently. Which shape this
took was a real choice: an in-log accept/dismiss control would have made
`LogStrip` interactive for the first time, while the digest reuses a modal
that fires anyway, so student life adds **zero** stop-the-clock moments a
year.

**Greek life** is an extension of clubs behind a **one-time, declinable
opt-in**, so it can never appear unbidden. Once the club scene is real
enough, students petition to charter a **Hellenic Council**; a school may
refuse, permanently, and the question never returns. With a council,
chapters form on the same petition/digest path as clubs — same light
treatment, heavier numbers on both sides. What makes chapters
*consequential* is what happens to them afterwards, and all of it is
**authored into the existing decision-event table** (`eventData.ts`) rather
than given a stream of its own:

- **A scandal.** Fund a public-relations campaign (a cash cost; the chapter
  survives) or pull the charter (free, and permanent — the satisfaction it
  contributed and the cost it carried both go). The zero-cost path is
  disbanding, so the no-soft-lock invariant holds unchanged.
- **A housing petition.** One chapter at a time asks for a dedicated house,
  and **each chapter asks at most once** — both answers set `housingAsked`,
  so the supply of asks is bounded by the number of chapters that exist and
  it can never become a modal spiral.

Because those three live in the shared table, they **redistribute the
existing event budget rather than adding to it**: the weekly chance and
cooldown that govern how often the clock stops are untouched, and their
`weight` values are the dial for how much of that fixed budget Greek life
takes.

**What an organisation does, mechanically**, is exactly two things, both
read **live** off `s.orgs` every week rather than applied once:

- it carries an `upkeepPerWeek` that `financeSystem.ts` sums as one more
  expense line, so disbanding a chapter removes its cost the same week —
  there is no total stored anywhere to leave behind;
- it adds a **flat** contribution to the `social` satisfaction attribute
  (the same non-population-scaling shape the quad's bonus has), capped in
  aggregate so student life can never carry the attribute on its own.

Both key off *"an organisation exists"*, flat per org — **never off member
count**. Membership is display-and-flavour only: it is *derived* from three
founding facts on the record (founding size, founding enrollment, founding
year) plus today's enrollment, so an older club reads as larger than a young
one at the same headcount, and nothing in the game reads it. Coupling it to
money or satisfaction would be a deliberate later decision with its own
playtest, not something to slip in silently. There is no trend line and no
sparkline — a current number is enough.

Organisation costs are sized in **weeks of operating cost** (the same unit
the decision-event table uses, shared via `moneyScale.ts`) and fixed in
dollars the moment the player approves the organisation. Fixed rather than
re-derived weekly because deriving a line of opex *from* opex is circular;
the consequence — an old club keeps an old club's budget and fades to noise
against a mature school's spending — is deliberate, and is part of what
makes clubs low-stakes.

**Prestige is untouched.** Student life moves satisfaction and cash and
nothing else, the same discipline the decision events hold: `self.reputation`
is a stock that drifts toward a computed target once a year, and student
life is not one of that target's inputs.

**Satisfaction effects are transient by construction**, exactly like the
decision events': the stock drifts back toward its facilities-derived target
at `SATISFACTION_DRIFT_RATE` a week, floored by `ATTRIBUTE_SCORE_FLOOR`. The
teeth are timing near the summer funnel, not permanence. What *is* durable is
the ongoing source: a disbanded chapter's real cost is that its contribution
to the target stops, not the one-week dent.

**The Student Life tab** is the home for all of it — active clubs and Greek
chapters with founding year and current membership, the petitions waiting on
the next digest, and an empty state that reads sensibly through the founding
years before any student center exists. It also has to make the satisfaction
effect **legible**, which is what stops the system feeling arbitrary, and it
does so by *reading the model rather than inventing a display number*:
`satisfactionSystem.ts`'s `studentLifeSatisfaction` runs the very computation
the weekly tick runs against throwaway copies of the state with one source
removed, and reports the difference — the same way the milestone modal reads
`prestigeTargetWithout`. That honesty is the point: when the `social`
attribute is already clamped at its ceiling from facilities alone, the panel
reports that the clubs are adding *nothing*, because nothing is what the
model is applying.


## Student demands: the inverse of clubs

Clubs are what a happy student body gives the institution. A **demand** is what
an unhappy one asks of it, on a clock. One system
(`systems/demands/demandSystem.ts`), one content/tuning file
(`data/demandData.ts`), and no new economy: demands move satisfaction and,
through it, admissions — **prestige is untouched**, exactly as it is for
student life and the decision events.

- **Trigger.** Satisfaction below `DEMAND_SATISFACTION_THRESHOLD` and the
  student body organises. Above it nothing is ever demanded, which is why a
  well-run school sees this feature only as an empty line in the Student Life
  tab.
- **The ask is derived, not drawn.** The system scores every candidate
  shortfall against `satisfactionSystem.ts`'s **own** coverage reading
  (`attributeCoverage`, the exact 0..1 ratio the attribute is scored on) and
  asks for the **worst** one, resolved to the actual next rung of that actual
  chain — so "another parking lot" is a named parking Buildable the school
  could start today, and it is asked for because parking is genuinely what
  this campus is most short of. A completely full campus can instead be asked
  for **beds**, measured against `students.capacity`. There is no parallel
  capacity model anywhere in this: both readings are ones the game already
  keeps.
- **Deadline, and the queue.** Raising a demand sets a target and an expiry on
  `s.events.activeDemand`. A demand that would fire during a busy week WAITS
  in `s.events.pendingDemand` — the same queue pattern `pendingMilestones`
  uses, and for the same reason — and its deadline clock is stamped when it is
  **announced**, not when it is rolled, so waiting never eats the player's time.
- **Resolution is something the player does, not clicks.** Met is detected off
  existing state — the served population for that attribute, or capacity —
  reaching the target, i.e. off a Buildable finishing. There is no acknowledge
  button on the resolution side at all; the only button in the feature is the
  dismissable acknowledgement on the modal that raises it.
- **Failing needs no new machinery.** The satisfaction penalty feeds word of
  mouth, which costs applicants at the next summer funnel
  (`admissionsSystem.ts`'s `WORD_OF_MOUTH_STRENGTH`). That is the whole
  consequence, and it is why a demand for something the school cannot yet
  afford is survivable rather than a trap: `ATTRIBUTE_SCORE_FLOOR` still
  floors satisfaction, so ignoring every demand a run ever raises **stalls**
  the school exactly as the economy already promises, and never sinks it.
- **No spiral, and no to-do list.** At most one demand is open at a time, and
  `DEMAND_COOLDOWN_WEEKS` runs after **any** resolution — met, failed, or
  overtaken by the player fixing the shortfall before anyone got round to
  asking. A failed demand therefore cannot be followed by an immediate second
  unmeetable one.

**Cadence.** Announcing a demand reads *and writes*
`s.events.lastDecisionWeek`, the global floor the authored decision events run
on, so a demand and an event can never land in consecutive weeks and the
number of stop-the-clock moments a year does not rise by the number of demands
— the mix changes, the budget does not. That is the same discipline the
Greek-life entries in `eventData.ts` follow.

**The Student Life tab** carries the outstanding demand: the ask, the deadline,
weeks remaining, and a progress bar driven by the very reading the resolution
runs on, so the bar cannot disagree with whether the demand is met. Its stakes
are **read from the model** the way the club panel's contribution is: the
satisfaction figures are the nudges the system would apply, and the applicant
figures come from running the shipped admissions funnel (`projectAdmissions`)
at today's policy against each of them. When nothing is outstanding the section
says so in one quiet line.

## College, and University

A school opens as **"<Name> College"**. The player writes only the first half at
founding; the word after it is fixed institutional form. When the **first lab**
finishes, a one-time interrupt offers to promote it to **"<Name> University"** —
the same lab gate research hangs off, read through the same helper so the two
can never drift apart. It is a naming change and nothing else: a `suffix` string
plus a flag recording that the question has been asked, joined for display by
`institutionName()`. No system reads the name, and either answer closes the
question for good.

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
reasonably light as it grows: a fresh run is ~165 KiB (the standing
candidate market is ~24 KiB of that — 30 listings with bios), and the per-year
`YearSnapshot` and the capped log are what keep a decades-long run in the low
hundreds of KiB.

`SAVE_VERSION` is the escape hatch for the shape changing. Bump it whenever a
field is added-as-required, renamed, retyped, or given a new meaning. Additive
*optional* fields don't need a bump.

An older save is then either **migrated** forward or **discarded**, never
half-loaded. Migrations live in `persistence.ts`'s `MIGRATIONS` table, keyed on
the version they migrate *from*, and the load path walks them one version at a
time; a version with no entry is discarded and the player starts fresh. Migrate
when the old data still describes the same game (v3 -> v4 filled in the campus
map's new placement footprints, which were all 1x1 before footprints existed;
v4 -> v5 re-pointed every course's `requiresFaculty` and every hire's `field`
at the re-specialised faculty-field taxonomy, which renamed and split the
departments a run is staffed against without changing the run itself; v5 -> v6
dropped the job-posting state and gave every hire the candidate market's
`weeksListed` clock, changing how faculty are acquired but not the roster,
the economy or the curriculum; v6 -> v7 added the `research` slice, gave
every hire the `acclaim` count the salary curve now multiplies by, and split
the institution's name into the player's half plus a fixed suffix — none of
which changes the school a resumed run describes, so it carries forward and
simply starts producing research the moment it has a lab; v7 -> v8 added the
`orgs` slice — the clubs and Greek chapters the campus has grown, the
petitions waiting on the next summer digest, and the Hellenic Council flags
— empty, and deliberately not reconstructed: a v7 run genuinely had no
student life, so a resumed school starts forming clubs the moment it has a
student center, exactly as a new one does; v8 -> v9 added the student-demand
slice of `events` — the demand queued for the next quiet week, the demand
currently outstanding with its target and expiry, and the week the last one
resolved — filled in empty with the cooldown clear, so an old save resumes
with no demand outstanding and its students free to ask for something the
moment they are unhappy enough; v9 -> v10 reorganised the CURRICULUM itself —
a School of Science, six majors sitting in a different school than they did,
two retired, four added, and the labs moved with them — so every saved course
is re-pointed at the new structure by id off the seed, keeping only its
`status`, which is what lets a decades-in save keep every finished course and
every milestone through a reorg that is not one-to-one. The two retired majors,
Pre-Med and Dentistry, are dropped outright rather than mapped onto a
replacement: marking a major complete whose nine courses the player has never
developed would be a milestone that lies, so a clean retirement is the honest
answer and the small prestige-target dip settles over a couple of years of
drift); v10 -> v11 added the GRADUATE PROGRAMS — six clusters of
higher-tier course Buildables (see "Graduate programs" above), spliced in
BY ID off the seed, which is the simplest curriculum migration there is
because nothing existing moved, was renamed or was retired: every node a
v10 save already holds is left completely untouched, and the
twenty-eight new ones arrive locked, revealing the moment their
parent-school gate reads true — which for a decades-in save may be the
very first tick, since the gate is a reading of milestones it already
earned. What does move is the prestige TARGET: graduate work is now the
last 0.15 of curriculum breadth, so a school that had finished the whole
undergraduate catalogue scores 0.85 on that input until it founds some
programs. Prestige itself does not lurch — it is a stock drifting 12% a
year — so that reads as a ceiling that moved up rather than standing
taken away); v11 -> v12 added the two PROFESSIONAL-SCHOOL BUILDINGS
(BLDG-MED, BLDG-LAW) and expanded Medicine (6 -> 12) and Law (5 -> 8) —
see "Two of six get their own building" above. The same id-splice shape
as v10 -> v11: every seed node the save doesn't already have (the two
buildings, plus nine new courses) is appended locked, and every node it
already holds — including the eleven pre-existing Medicine/Law courses,
whatever their status — is left completely untouched, nothing re-pointed.
The one real edge case: a save that had already FOUNDED Medicine or Law
keeps every one of those courses done, but its new building still arrives
locked and, since the gate it waits on is a milestone reading that save
already satisfies, flips buildable on the very first tick — a real,
honestly-flagged construction bill for a hall the school apparently never
had, not a bug;
discard when it doesn't (v1 and v2 predate an economy rebalance, so those runs
would be describing a different game).

Loading also runs **placement hygiene** on the campus map every time: orphaned
ids, placements whose footprint no longer fits the grid, and overlapping
placements are clamped back inside or dropped. That is safe precisely because
placement is visual-only — a dropped placement just returns its building to the
siting tray.

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

- Speed simplification: real-game speed and a 2x of it (the same week-tick,
  twice as often — no second timing path), plus one sandbox-only fast speed.
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
- Research depth: labs for the four schools that still have none, so a
  fully non-STEM run has a research path of its own rather than reaching it
  through a shared department (see "Research"). This would also give those
  schools a research doctorate, which they cannot have today for exactly the
  same reason (see "Graduate programs").
- Campus life depth, and more authored decision events on top of the thirteen
  that now exist (see "Interrupts" above) — including events that reach
  systems the first pass deliberately left alone.
- Faculty lifecycle (aging, retirement, poaching) if desired.
- A richer demand-curve finance model with prestige/scale archetypes.
- Campus map depth: adjacency weighting between neighboring buildings, and any
  economic/prestige feedback from the layout. The map itself (a fixed tile grid,
  placement of finished `building`/`dorm`/`facility` Buildables at their own
  footprint sizes, SVG rendering) now exists as a visual-only layer; nothing
  mechanical reads it yet.
- A circle-network view of the curriculum, replacing the current cell grid.
  Deliberately deferred: the graduate-programs pass fitted itself into the
  existing view rather than starting that overhaul (see "Graduate programs").
- An isometric rebuild of the map. Deliberately a separate, later arc: the map
  is still plain flat SVG, and the refinement passes on it (finer grid, mixed
  footprints, per-kind colour) are not steps toward isometric.

UniSchool — systems-first, no art (yet)
