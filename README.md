# UniSchool

A turn-based university management sim. You advance week by week over a long
playthrough (target 20–50 in-game years), building an institution from nothing.
The core feeling is the **builder's long arc**: investing time, watching
something grow, and seeing the scale of progress over decades — RollerCoaster
Tycoon or Cities: Skylines applied to building a university. There is no win
condition; it's an indefinite sandbox that naturally tapers once the curriculum
is fully built out and the rankings are topped.

This is a **systems-first build with no campus map and no art**, on purpose. The
map is a deliberately deferred later layer — do not add one. Everything is kept
as clean data and logic that a map could later read from without rework. In
particular, **buildings are modeled as data now and placed on a map later**; the
mapless build shows courses and buildings together in one list.

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
- `src/App.tsx` — the dashboard: reads state, dispatches actions

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
- a **`duration`** — weeks of development, occupying a development slot.
- **`prereqs`** — other Buildable ids that must be `done` first. Prereqs may
  **cross majors and cross kinds**: a course can require a building; a course can
  require a course from another school; a facility can require a dorm. Prereqs
  are authored data, not derived from tier.
- optional **`requiresFaculty`** — a faculty field that must be present on the
  roster before development can start (e.g. Microeconomics needs an Economics
  faculty member). This gates *starting*, not completion.
- a **`status`** — `locked` → `available` → `developing` → `done`.
- **`effects`** — applied once, on completion. Effects can grant capacity,
  tuition headroom, satisfaction, **development slots**, applicant-pool
  bumps, and — crucially — can **unlock other Buildables** (this is how the
  milestone chain works). Effects do **not** grant reputation directly —
  prestige is a slow-moving stock computed and drifted toward separately
  (see "Prestige: a slow-moving stock" below), not a sum of completion
  bonuses.

This means one develop/build flow, one slot system, one prereq resolver, one
completion-effects applier, serve all content types. **Do not build parallel
subsystems for buildings, dorms, or sports.** Add content and, where a genuinely
new rule is needed, extend the shared Buildable model — never fork it.

### Courses and buildings share one screen

In the mapless build there is a single Buildables list, grouped or filtered by
`kind`, with one uniform develop/build affordance showing cost, duration, and
prereqs. When the map arrives, `building`/`dorm`/`facility`/`sports` Buildables
gain a placement step; `course` Buildables never do. Until then they are the
same interaction. Keep the shared screen dumb.

## The milestone chain (how the curriculum gets its shape)

The 330-course curriculum is not a flat list; buildings give it a progression
spine. The intended climb:

1. Start with **one academic building** and the **gen-ed (tier-0/entry)** courses
   available.
2. Completing **all tier-1 courses in a school** unlocks the ability to **build
   that school** (a `building` Buildable).
3. Completing that **school building** unlocks the school's **tier-2** courses.
4. Completing **all tier-2 courses in a major** unlocks that **major** — granting
   an applicant-pool bonus and unlocking the major's **tier-3** courses.
5. Completing the **tier-3** courses fully **masters** that major.

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
- **faculty quality** — a planned fourth input; the formula already sums it in
  at zero weight as a seam for a future task.

Each input is clamped to its own 0..1 share of the target before being
weighted, which is what keeps the prestige/selectivity/quality feedback loop
from spiraling: selectivity and quality alone can only push prestige to a
fixed ceiling (reachable by staying small and cutting tuition), and climbing
past that ceiling toward the very top of the rankings requires the curriculum-
breadth term too — i.e. sustained, decades-long buildout, not an early
course-development sprint.

## Pacing model: money is the throttle

**Money is the primary pacing resource, and it is a bottleneck, not a threat.**
The intended feel: cash trickles in at a rate that forces the player to *wait*
to afford what they want next — you should generally be a few development cycles
away from your next purchase — but the player is not meant to be pushed into the
negatives or to lose by going broke.

Consequences that the code must honor:

- **No hard insolvency game-over.** A cash shortfall should *stall expansion*
  (you cannot start new development while in the red), not end the run. "Stall,
  don't die" is the bottleneck expressed mechanically, and it fits the
  no-win-condition sandbox.
- **Development slots are a secondary, purchasable relief, not the primary
  throttle.** Slots can be expanded, but they are one money sink among many. The
  binding constraint is cash flow, not slot count. (This is a deliberate revision
  of the earlier "development capacity is the scarce resource" framing.)
- **The trickle must scale with the school.** Revenue grows with enrollment and
  prestige (both of which the player grows through play) while costs scale more
  slowly, so the gap between income and ambition narrows over the arc. The
  bottleneck is an early-and-mid-game feeling that should *ease* as the school
  matures — the late-game pleasure is finally affording the big things freely.
  Do **not** tune the trickle as a flat constant, which would make hour 20 feel
  identical to hour 2 and flatten the long arc.
- Keep finances structured so a richer **demand-curve** model (where prestige
  shifts the frontier between tuition and enrollment volume) can replace the
  simple version later without touching the rest of the system.

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
required — hiring is a genuine subsystem, not a stub. (Note: `HIRE_FACULTY` is
currently a declared action with no reducer case; it must be wired up.) Whether
faculty age, retire, or get poached over decades is an open design question — do
not silently assume "permanent once hired"; flag it if a task forces the choice.

## Save / load

The game is measured in hours; the annual report and annual admissions make a
full run long. **Persistence is therefore a near-term priority, not "eventually."**
State must stay serializable and reasonably light as it grows (curriculum +
buildings + dozens of rivals + history). Building save/load early keeps that
honest. Currently state lives only in a `useReducer` hook and a refresh returns
you to the start.

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
  trickle, slots as one sink among many.
- Annual summer admissions interrupt (tuition/aid/selectivity/enrollment).
- Dense rivals (~55) + the U.S. News report as a mid-game reveal.
- The academic-buildings / milestone-chain / curriculum-depth cluster: school &
  major buildings, milestone bonuses, course descriptions, cross-kind and
  cross-major prereqs, faculty-gated courses (with hiring wired up).
- Save / load.
- Component decomposition of `App.tsx` once the screen grows.

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
- The campus map, as its own system reading the same state, with Buildables
  gaining placement.

UniSchool — systems-first, no map, no art (yet)
