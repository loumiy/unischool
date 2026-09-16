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
finish, purely as rendering — drawn at an angle, with each kind carrying an
architectural form (see `src/components/buildingMotifs.tsx`), which is still
only rendering: no system reads any of it. Placement grants nothing, gates nothing, and no
system reads it; adjacency effects and any economic/prestige feedback from the
map are still deliberately deferred.

Varsity athletics venues (the multi-sport field, arena, diamond, natatorium,
and football stadium) are ordinary `facility` Buildables too, reveal-gated the
same way a graduate program is (see "Student life: clubs, Greek letters, and
varsity athletics" below) — there is no separate sports subsystem and no
`sports` Buildable kind, despite what an earlier draft of this README's
roadmap sketched.

The **campus map is the central interface** (see `src/App.tsx`): it holds the
middle of the screen at all times, the build menu opens over it, and every
other view — Curriculum, Faculty, Research, Student Life, Athletics,
Admissions, History, Treasury — opens as a dismissible **full-bleed screen** on
top of it: the tab takes the viewport and the dock (log ticker + toolbar) lays
over it. Every tab, the same way — the shell used to draw two shapes and a
short list of which tabs got which, and the playtest notes retired the sheet.
The map is what a player returns to, by the home button at the head of the
toolbar's icon row, the panel's own close button, or `Esc`. That is a **layout
fact, not a mechanical one**: no system reads the map, and nothing gained
authority over the sim by moving to the middle of the screen.

Three tabs are **gated on the thing they are about existing** (see
`TabNav.tsx`'s `TAB_GATES`): Research appears once a lab is finished, Athletics
once a varsity team exists, History in year 2. Each gate is the same condition
the system behind it already hangs off, and the first time one opens the
activity log says so.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL. Start the clock to begin.

## Keyboard

The map is the screen the player spends the most time on and the one where the
mouse is most often already busy — holding a path stroke down, or carrying a
picked-up building toward its spot — so most of the game is reachable without
it.

| Key | Does |
| --- | --- |
| `W` `A` `S` `D`, arrows | Pan the camera. Held keys glide; two at once give a diagonal. |
| Middle mouse drag | Pan too, in every mode — including mid-stroke under a path tool, where the left button is busy painting. |
| Scroll / pinch, `+` `−` | Zoom. |
| `Space` | Pause, or resume at whatever speed was last running. |
| `1` `2` | Play, play at 2×. (`3` is sandbox fast — see `isTestUniversity`.) |
| `P` | Arm the path tool. Left button draws, right button erases; a ghost tile marks the square under the cursor. |
| `R` | Rotate the picked-up building 90°, same as the ⟳ on its footprint ghost. |
| `Esc` | One ladder, top down: the activity-log popup, then the build menu, then the open view; on the map, back out of the path tool, then a picked-up building, then an open info panel. |
| `Enter` | Dismiss the interrupt on screen (every type with a plain "continue" — not the admissions form or the charter offer, which are real choices). |
| `C` `F` `L` | Open (or close) Curriculum, Faculty, Student Life. |

The plumbing is one module, `src/components/hotkeys.ts`: it owns the window
listener, the "not while the player is typing" guard, the rule that a key held
with Ctrl/Meta/Alt belongs to the browser, and which device the player is
currently driving with. That last one is what keeps `Space` honest: a focused
button answers `Space` natively, so the game must stand aside for a player who
tabbed to one — but a button that was *clicked* is focused too, which is how
`Space` came to re-click a tab icon instead of pausing. The modality is settled
by the interaction that chose the device (a pointer press, or `Tab`) rather
than by the key being arbitrated, because `:focus-visible` alone flips true on
that very keypress.

What each key MEANS stays with the component that owns the thing it does —
speed on `StatusHeader.tsx`, pan/draw/rotate on `CampusMap.tsx`, the tab
letters and the whole `Esc` ladder on `App.tsx`, `Enter` on
`InterruptModal.tsx`. `App.tsx` owns `Esc` because it is the only place that
can see every rung, and it gates the map's keyboard off while something is on
top of it, so only one layer is ever listening.

**The build menu is not "on top" in that sense, and it is the one place the
gate is not a single switch.** It has no backdrop: the map stays visible and
clickable underneath it, and it is where the map's own tools are reached from
— a building is picked up in there and deliberately survives the menu staying
open, the path tool is armed in there and is deliberately dropped when it
closes. Working the map with the menu up is the main line, not an edge case.

So **the build menu takes exactly one key from the map, and it is `Esc`** —
because `App.tsx` owns one `Esc` ladder and two handlers answering the same
key is what arbitration exists to prevent. `hotkeys.ts` answers the question
twice: `mapBackOutLive` for `Esc`, and `mapControlsLive` for everything else
the map does (pan, `R`, `P`), which the menu leaves alone. Folding those
together produced the same bug three times — `R`, `P` and `W`/`A`/`S`/`D` each
went dead for exactly the stretch in which a player reaches for them. A tab,
the log popup and an interrupt still silence both.

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
  tab metadata, and startup screen
- `src/tabs/` — one component per overlay view (Faculty, Curriculum, Research,
  Treasury, Admissions, Student Life, History, Athletics); each reads the slice
  of `GameState` it needs and dispatches actions, and knows nothing about being
  rendered in an overlay. `TabOverlay` draws one shape — **full-bleed**, where
  the tab owns the viewport and the dock is laid over it
- `src/App.tsx` — the shell: owns the game loop hook and which view (if any) is
  open over the map, renders the persistent chrome, the map + build rail + log,
  and the active overlay

### The three documents

Everything written down about this project is in one of three places, and which
one depends on **tense**:

- **`README.md`** (this file) — the game as it **is**. The spec. Source comments
  cite it by section, so it has to stay true.
- **`BACKLOG.md`** — work that is going to happen but **has not**. Named, not
  sequenced. The only forward-looking document here.
- **`docs/plans/`** — numbered plans for work that **has** happened, each a
  closed record of how a pile of notes became an ordered sequence of PRs. See
  `docs/plans/README.md` for the naming and shape a new one follows.

Nothing belongs in two of them at once. If a plan lands, what it changed goes
into README and the plan is left alone as the record of what was believed at
the time.

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
academic buildings, dormitories, campus-life facilities, and varsity athletics
venues are all the same kind of thing** — a *Buildable*. A Buildable is
anything the player commits development capacity to over time. They differ only
in their data, not their machinery.

Every Buildable has:

- a **`kind`** — `course`, `building`, `dorm`, `facility`. Athletics venues are
  `facility`-kind, reveal-gated, like everything else in that list — there is
  no separate `sports` kind.
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
buildings, dorms, or campus-life/athletics facilities.** Add content and, where
a genuinely new rule is needed, extend the shared Buildable model — never fork
it.

### Courses and buildings share one flow

Every Buildable goes through the same develop/build gate — cost, duration,
prereqs, `canStartDevelopment` — regardless of `kind`. Where that affordance is
*drawn*, and exactly how it's initiated, differs by whether the Buildable is
placeable:

- `course` Buildables live in the Curriculum overlay and start through the
  `START_DEVELOPMENT` action: pick one, pay the cost, watch the countdown. No
  location, ever — a course is not a place.
- Placeable kinds (`building`/`dorm`/`facility` — athletics venues included)
  live in the build menu beside the map, because the map is where they stand.
  **Placement IS how a placeable Buildable starts**, through the
  `PLACE_BUILDABLE` action: pick one from the build menu, then click (or drag)
  an empty footprint on the map — that single action passes the same
  `canStartDevelopment` gate a course uses, charges the cost, starts the
  countdown, AND writes the chosen location into `placements`, all at once.
  There is no second, later placement step, and no "awaiting siting" tray of
  finished-but-unplaced buildings: a placeable Buildable is never `developing`
  without also being in `placements`, so it renders under construction right
  where it was put down, and its tiles are reserved from week one — nothing
  else can be sited on top of it until it finishes.

  One narrow exception: a Buildable that starts already `'done'` at founding
  (the starting dorm, the founding dining hall, General Studies Hall — see
  `actions.ts`'s `placeFoundingBuildables`) is auto-sited the moment a new
  game is created, via a plain top-left `firstFreeSpot` scan — there is no
  player choice to preserve at that instant, so there's nothing to ask about.
  If that scan ever finds no room (or an old save predates it), the
  Buildable stays `'done'` with no location. Since nothing else in the build
  menu can ever revive a `'done'`-but-unplaced row, `campusMap.ts`'s
  `needsSiting`/`canSiteRetroactively` offer exactly that one as a "site →"
  row for a small flat `RETROACTIVE_SITING_COST` instead of the Buildable's
  own (already-paid) cost — a location to mark, not a build to start.

Placement lives in a separate `placements` record on `GameState` (id ->
`{ row, col, w, h }`: the top-left tile plus the footprint covered from it),
never as a field on `Buildable`, so the single Buildable model stays unforked
and `course` Buildables — which are never placeable, at any status — never
carry a `placements` entry. **How big a footprint a Buildable gets is a
placement rule, not data on the Buildable** — and it lives in `campusMap.ts`'s
`footprintOf`, keyed on what the Buildable already carries: its `kind` and
`facilityType`, plus, for anything whose instances differ in SCALE rather than
in kind, a SIZE LADDER read off `effects.servesPopulation` (facilities) or
`effects.capacityBonus` (dorms). A 350-seat campus restaurant is 3x3 and the
16,000-seat market hall at the end of the same dining chain is 11x9; a 500-bed
residence hall is 9x4 and a 5,000-bed residential tower is 7x7 carried very
high. **Every footprint with a door on it is an ODD number of tiles across.**
A door is drawn at the centre of its front span, and on an even width that
centre is a tile SEAM — so the one square a student would walk through does
not exist, and a path can only ever reach the corner of two tiles. Open
ground keeps its even spans, because nothing enters a tennis court or a
running track through a drawn door. A `Placement` stores the footprint it was
built with, so this applies to new campuses only; an existing one keeps the
halls it has. Everything is sized against a rough **15m to a tile**, which the football
stadium (a real one is about 220m by 180m — 15x12) pins down, so a library, a
pool, a hospital and a stadium stand in something like their real proportions
to each other. Size is purely geometric: a bigger building grants nothing and
costs nothing extra — and
placement itself still grants nothing beyond what `START_DEVELOPMENT` always
granted a course: a placed-but-`developing` building contributes nothing until
it's `done`, exactly like an undeveloped course. Keep both screens dumb.

There is **one exception**, and it is about a building being EXTENDED rather
than built. The tier-1 library is renovated by adding a floor to the building
already standing — the same node goes back to `'developing'` at its existing
spot (see `RENOVATE_LIBRARY`) — and the floors that already exist keep
working: the node records what it was serving before the work started
(`Buildable.renovatingFrom`) and the satisfaction sums read that, through
`types.ts`'s `servingPopulation`. Otherwise adding a fourth floor first took
three away for six months, and a school could watch its academic score fall
for a year and read the renovation as the cause. The map agrees: such a
building is drawn at the height of the floors it has, with the scaffold
rising off its finished roof rather than off the grass.

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
5. Completing **all tier-2 courses in a major** **establishes that program** —
   granting an applicant-pool bonus and unlocking the major's **tier-3** courses.
6. Completing the **tier-3** courses **distinguishes that program**.
7. Once a school's programs are distinguished — or, for a doctorate, once the
   school has a lab — a **graduate program** opens on top of it, and completing
   one founds it (see "Graduate programs" below). Every school is intended to
   have a meaningful payoff for progressing through tier 3; some school-specific
   T4+ payoffs are still being designed and are deliberately left unspecified
   here rather than invented (see "Graduate programs").

**A note on terminology.** The game models an *institution*, so the language is
institutional: a university **establishes** and then **distinguishes** an
academic **program** — it does not "complete" or "master" a major. Students are
the ones who complete degrees; the player builds the programs they graduate from.
The confirmed vocabulary is **establish** (all tier-2 done), **distinguish** (all
tier-3 done), and a **distinguished school** (every program distinguished). The
tier labels themselves stay **T1 / T2 / T3** for now; the possible relabel to
Unlocked / Established / Distinguished is deferred until the full progression
rules are specified. The code still carries the older milestone keys
(`major-complete:`, `major-mastered:`, `school-complete:`) and constant names;
those are renamed to match this vocabulary, with a save migration, in the
terminology pass (see the alignment roadmap's PR C).

Milestone bonuses (program-established, program-distinguished, distinguished-
school, program-founded — keyed `major-complete:` / `major-mastered:` /
`school-complete:` / `grad-program-complete:` in code until the terminology
pass) are dedicated milestone logic in `techSystem.ts` — they are a first-class
part of the model, not an afterthought. Note this makes buildings prerequisites
for courses, which is exactly why prereqs must cross kinds. These milestones no
longer grant reputation directly; instead they are the durable "curriculum
breadth" stock that feeds the prestige target (see below) — establishing or
distinguishing a program, or distinguishing a whole school, raises the ceiling
prestige can drift toward, rather than instantly bumping it.

## Prestige: a slow-moving stock

`self.reputation` ("prestige") is a **stock**, not a flow: it is never
incremented directly by completing a course, a building, or a milestone — there
is no snappy "finish a course, get a prestige bump." Instead, **once a week**,
prestige drifts a small fraction of the way toward a target computed from durable
inputs — see `src/systems/prestige/prestigeSystem.ts`. It never jumps to the
target: a long-established school's prestige is sticky and does not evaporate the
moment growth stalls, but it can move gently week to week rather than sitting
frozen all year between summers. The drift runs **weekly**, in the `SYSTEMS`
array (`prestigeSystem.ts`'s `tickPrestige`), at a rate sized to preserve the
old ~12%-per-year stickiness; the admissions-derived input below changes
only at the summer boundary, while every other input can move any week. The
inputs:

- **curriculum breadth** — majors/schools completed *right now* (a stock read
  off the milestone booleans above) plus the **graduate programs** founded on
  top of them, not courses added this year. The four shares inside this one
  input sum to 1, so finishing everything scores exactly 1 and graduate work
  raises no ceiling — it occupies the last 0.15 of the one that already
  existed (see "Graduate programs").
- **teaching quality** — the campus average course grade (see "Course quality"
  below). Its own input, not a multiplier on anything: a school teaching twenty
  courses beautifully in its first decade is credited for them, years before any
  milestone gate opens.
- **incoming student quality** — the average quality of the class that actually
  enrolled that cycle.
- **research standing** — what the university's research has actually
  produced: publications, breakthroughs, prizes, doctorates, and a credit for
  every initiative carried to completion (see "Research" below). A monotone
  count of the same shape as curriculum breadth, weighted small and clamped like
  every other input.
- **campus life** and **financial resources per student** (endowment measured
  against capacity) — two smaller inputs; the second is what the late-game
  endowment campaigns buy.

**Faculty quality is no longer an input of its own.** It used to average every
hire's teaching and research straight off the roster, which was the right
reading while that was the only way either stat reached prestige. Both have a
job now, and each arrives through the work it actually does — teaching through
the grades its courses earn, research through what its initiatives produce — so
the old input was paying a third time for the same people. *Retiring it broke
the game before it fixed it:* deleting the term and spreading its weight across
the survivors sent a forty-year run from prestige 145 to 63 and from 421 courses
to 212. The ceiling was unchanged; *when* it could be earned was not, and that
traced to a real flaw rather than a tuning error — course quality reached
prestige only as a multiplier on breadth, and breadth is milestone-gated.
Teaching quality became its own input and breadth went back to breadth ×
library. Recorded in `docs/plans/02-academic-core.md` §6b so it is not re-attempted.

Each input is clamped to its own 0..1 share of the target before being
weighted, and the admissions-derived input (incoming student quality)
is additionally scaled by how big the enrolled class is — being selective with
a class of 200 is a boutique, not a national university, and without that a
school that built nothing at all could drift into the top of the rankings. This
is what keeps the prestige/quality feedback loop from spiraling: student quality alone can only push prestige to a
fixed ceiling (reachable by staying small and cutting tuition), and climbing
past that ceiling toward the very top of the rankings requires the curriculum-
breadth term too — i.e. sustained, decades-long buildout, not an early
course-development sprint.

**Direct-mutation audit.** `self.reputation` is written in exactly three places,
and all three are intentional. (1) **Founding** sets the opening value
(`BASE_STARTING_REPUTATION + preset.prestigeBonus + GENED_BUILDING_REPUTATION_BONUS`
in `actions.ts`) — a one-time initialization, not a gameplay bump. (2) The
**drift** in `prestigeSystem.ts` moves reputation toward the computed target on
its regular cadence. (3) **Rivals** write their *own* `reputation`
(`rivalsSystem.ts`), never the player's. Nothing else touches it: research,
student life, decision events, satisfaction and rankings all read prestige and
never write it. In particular, **being ranked does not raise prestige** —
rankings are a measurement *of* prestige (see "Rankings"), a strictly one-way
read. Any future change must preserve this: prestige is composed from inputs, it
is not a running tally of bonuses. (The long-term direction is to decompose
prestige into several underlying components; that is future work, and must keep
the composed-stock discipline.)

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
framing and the purchasable-slots revision of it: both are gone. So too are the
obsolete **Pace** mechanic and the old **siting queue** — the two-step
"develop → await siting → place" flow is replaced by the single develop-and-place
action; see "Courses and buildings share one flow." The only remnant of siting is
`RETROACTIVE_SITING_COST`, a small recovery fee for the rare `'done'`-but-unplaced
Buildable, which is a recovery path, not the old queue.)

Money can only pace the game if the school's own growth keeps spending it. That
is what the **growth loop** is for, and it is the shape everything in
`financeSystem.ts`, `admissionsSystem.ts` and `campusData.ts` is tuned to:

1. **Curriculum** — finishing majors and schools raises the prestige target
   (`curriculumBreadthScore`).
2. **Prestige** — reputation drifts toward that target week by week, and prestige
   is what lets the school *charge more* (`priceTolerance`) and *draw more*
   applicants at all.
3. **Demand** — the applicant pool is prestige x price x word of mouth
   (satisfaction). Enrollment is earned, never automatic.
4. **Revenue** — every class at the price it was admitted under, summed; the
   dominant income line (see "Tuition follows the class that paid it" below).
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
admissions boundary, and the prestige payoff waits for a slow weekly drift on top
of that. Adding capacity and students is supposed to hurt before the tuition
heals it.

The loop turns roughly once per course tier, escalating each time:

- **Gen-ed / intro** — the tutorial-by-design ramp. Starting cash covers it
  comfortably; money barely registers. Strain is ~zero on purpose.
- **Tier 1** — the first real pinch: a full department roster and 42 entry
  courses roughly triple weekly opex while enrollment cannot move until the
  next summer. The founding cushion visibly drains.
- **Tier 2** — enrollment growth forces dorms and the dining/health
  capacity that keeps satisfaction from throttling demand; their cost lands
  ahead of the class that justifies them.
- **Tier 3** — the largest, slowest turns: big buildings, mature faculty at peak
  salary, the widest cost-before-revenue gaps — easing only as prestige- and
  enrollment-driven revenue finally scales.

Consequences that the code must honor:

- **No hard insolvency game-over.** A cash shortfall should *stall expansion*,
  not end the run. "Stall, don't die" is the bottleneck expressed mechanically,
  and it fits the no-win-condition sandbox. There is no bankruptcy state and no
  `gameOver` flag: the run continues indefinitely even when cash is deep in the
  red and the player is effectively unable to act — an accepted state for now.
  (The vestigial `gameOver` scaffolding is dead — nothing sets it — and is
  removed in the alignment roadmap's PR B.) The intended *eventual* response to
  sustained distress is natural cost-cutting/contraction — faculty departures,
  disbanded clubs, unstaffed courses going on hold — which lets the institution
  **contract rather than die**; that system is deliberately not built yet and is
  not part of the current cleanup. Note the two distinct forms the stall takes
  today: an unaffordable Buildable is refused at the moment of the decision, so
  the player cannot buy their way into debt at all; and if the *operating*
  budget runs a deficit, cash can still drift below zero, at which point nothing
  with a cost is startable until it recovers. Every downward path has a floor, deliberately:
  empty beds are charged at a reduced mothball rate, an extra student is always
  worth more than they cost, satisfaction (and so word of mouth) is floored,
  curriculum breadth is a stock that never decreases, and the tuition
  decision and firing faculty are zero-cost recovery levers. These invariants
  are guarded by `test/financial-distress.test.ts` (run with `npm test`): every
  priced action (course, placement, endowment campaign, decision-event choice,
  retroactive siting) is refused unless the cash is there, so only the operating
  deficit can carry cash below zero — and when it does, the clock keeps ticking.
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
  genuinely special accomplishments (a program established, a program
  distinguished, a school distinguished), showing what was unlocked and what it
  did to the prestige target. Deliberately *not* fired by routine course completions: which
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
  clock, awarded when an initiative concludes (see "Research" below).
  Publications, grants and breakthroughs never do.
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
When it fires, the clock stops and the player sets exactly **two** levers for
the coming year: **tuition** and the **admit rate**. There is no scholarship
rate and no discount — what a family is quoted is what they pay.
**Both are set once a year here — there is no live, continuously adjustable
tuition control**, and they are taken as **three beats**, which disagree on
purpose about how much the player is allowed to know:

1. **Tuition, set blind.** The slider's only feedback is whether the price is in
   line with what the school's standing supports (`priceTier`). No applicant
   count, no sticker-shock reading, and **no stated cap** — the cap is simply
   where the slider ends. **Setting it locks it**: the pool is revealed next,
   and a price you could revise after seeing what it bought would be a lookup
   table rather than a gamble.
2. **The reveal.** The applicant pool that price actually drew, broken down by
   cohort as head counts. It **ticks up from zero, slower than any other number
   in the game** (`REVEAL_MS`): every other animated figure is a consequence of
   a slider the player is still holding and wants to keep up with them, while
   this one is the payoff for a price already committed and not retractable.
   The pool and the seven cohort rows share the duration, so the panel fills as
   one reveal rather than seven races. A reader who has asked for reduced motion
   gets the settled figures immediately — the same numbers either way.
3. **Admit rate, fully projected.** The opposite posture: every consequence
   visible before it is taken (see "Tuition follows the class that paid it").

What the tuition slider sets is the **listed** price
(`finance.listedTuition`), which reaches a student only as the price their class
is admitted under — see "Tuition follows the class that paid it" below.

Everything else is **emergent** — the player sets no target enrollment, and the
pool, the mix and the class that arrives all follow from the two decisions
above. Admissions is a distribution funnel resolved by `admissionsSystem.ts`,
modeled as aggregate applicant *statistics*, never individual applicants:

- **Applications** are driven by **price**, **current prestige**, and the
  **average student satisfaction over the preceding year** (word of mouth).
  Higher prestige and a lower price grow the pool; a happy student body grows
  it further. Word of mouth reads the **average satisfaction over the preceding year** —
  accumulated weekly and averaged at the summer boundary
  (`admissionsSystem.ts`'s `trailingYearSatisfaction`), not the current week's
  reading. Dorm capacity scales the pool toward its full size as housing
  investment grows, but is a floor rather than a wall — even a pure commuter
  school with zero beds draws a real, meaningful pool.

  **Word of mouth is deliberately not shown.** It is one of the strongest
  forces on the pool, and a player who is told "+12% applicants" reads a number
  instead of learning the rule. Left unlabelled it is something to notice
  across a few years — the pool grew and the only thing that changed was that
  the students got happier — which is the understanding worth having. It is
  the same reasoning sticker shock gets: real, and not its own readout.
- **Sticker shock** is the *band-specific* half of the price response, and it
  is what ties price to **who** applies rather than only how many. A price that
  overreaches what the school's prestige has earned (`priceTolerance`) scares
  off applicants hardest in the lower/mid quality bands and barely at all in
  the top band (the real-world "undermatching" effect), so an overreaching
  school gets a smaller pool that is also relatively richer in the applicants
  least sensitive to price. It is **not shown as its own reading** — beat 1 is
  blind, and by beat 2 it is already priced into the pool the player is
  looking at. See `admissionsSystem.ts`'s `STICKER_SHOCK_RATE`,
  whose rates were sized to close an exploit that no longer exists — with one
  price, the "inflate the sticker and match it with aid" construction cannot be
  written — and which are kept for the effect itself.
- **Selectivity** (the admit rate) is the player's **second decision**. It is
  still not capacity-derived — admissions skims from the top of the quality
  distribution, taking that share of the pool, best band first — but the share
  is chosen. `admitRate(prestige)` is what the slider *opens* at: what a school
  of this standing would normally take, more selective the more standing it has.
  The chosen rate is sticky, so an unchanged strategy is a one-click continue.
- **There is no yield step.** What the skim takes is what enrolls. The price of
  a bigger class is **quality**: admitting a larger share reaches further down
  the distribution, dragging average incoming quality, which feeds prestige.
  Class size is bought with quality rather than conceded to yield.

The panel projects **what committing would do** before it is committed
(`systems/admissions/consequences.ts`): the weekly net, the satisfaction target,
and whichever capacity need the incoming class would stretch furthest — all read
at the body this decision produces, which is the three classes still enrolled
(each still paying the price it was admitted under) plus the incoming one.

Nothing there is a second model. It advances a **shallow copy** of the state
with `advanceClasses` — the very function `RESOLVE_ADMISSIONS` commits with —
and reads it with `financeBreakdown` and `satisfactionTarget`, the same
functions the Treasury and Student Life show. The copy replaces only the two
slices the advance touches, and both readings are pure, so projecting cannot
write back into the live game. `test/class-pricing.test.ts` pins the projection
against what the tick actually charges on the far side of the interrupt.

  Two things followed from deleting yield, both deliberate. `admitRate`'s
  constants were **refitted** against the enrolled share the old two-step funnel
  produced, so a school accepting the default commits about the class it always
  did — the number now means "share of applicants who enroll", not "share who
  get a letter". And a school nobody has heard of is no longer hurt twice: it
  used to have to admit nearly everyone *and* watch most of them go elsewhere,
  so its enrolled share peaked mid-range. A single monotone curve cannot express
  that, and a player setting the slider is not subject to it at all.

Students **attend for four years**, so each summer admits a **new freshman
class** while the existing classes advance a year and the seniors graduate (see
"Students: four aggregate classes" below). Shape the tuition input with the
future demand-curve model in mind.

### Tuition follows the class that paid it

A price belongs to the class that was quoted it. The summer decision sets the
**listed** price (`finance.listedTuition`); at the next admissions boundary that
becomes the incoming class's price and is carried, unchanged, until that class
graduates. `finance.tuitionByClass` holds the four, advanced in lockstep with
`students.classes` by the same lines of `reducer.ts`'s `RESOLVE_ADMISSIONS` that
move the head counts — the graduating seniors take their price with them.

So **tuition revenue is the sum of four products, never `enrolled × price`**
(`financeSystem.ts`'s `annualTuitionBilled`), and a school that has raised its
price is collecting up to four different prices at once. The Treasury's
Balance & Policy panel lists all four, which is the only screen that says so.

**Why the model is worth the extra three numbers.** Under a single scalar, a
raise repriced every student already enrolled, and the strongest line of play
was to stay cheap while the school grew and then bill four captive classes at
the new price. Per-class pricing closes that: a raise is worth exactly the
incoming class and nothing more, which is also what makes the decision legible —
the player is pricing one class, not the school. A `tuitionBonus` Buildable
effect raises the listed price only, for the same reason (`techSystem.ts`).

Two readings follow the four prices rather than the listed one, because they are
about the students actually on the books: the Treasury's tuition line, and
satisfaction's **affordability** bonus to basic needs, which scores the
enrollment-weighted average price the body pays against `priceTolerance` (see
`satisfactionSystem.ts`). A school that has just raised its price hard still has
three classes cushioned at the old one, and both readings say so.

### Admissions cohorts: who the school pulls in

The applicant pool is not undifferentiated. **Seven cohorts** — high achievers,
pre-professional, research-oriented, social, arts-focused, price-sensitive,
athletes (`systems/admissions/cohorts.ts`) — each respond to something the
player has actually built: labs and research output pull the research-oriented,
established career-track majors pull the pre-professional, clubs and chapters
pull the social, a real varsity program pulls athletes, and an honest net price
pulls the price-sensitive. This is what gives several different strategies each
their own reason for enrollment to grow, instead of only prestige and price.

A cohort is **not a segment of the funnel**: it gets no quality band or
sticker-shock rate of its own. Every cohort's pull blends into one
multiplier on the whole pool, the same architectural role word of mouth and
capacity already play. Nothing about a cohort is stored — its pull is a pure
function of state, recomputed wherever it is needed.

The summer reveal shows the breakdown as **head counts, not multipliers**: how
many of this year's applicants each cohort is worth, as seven small cards — the
audience's name small at the top, the count big in the middle. Seven squares
read at a glance where seven labelled rows read as a paragraph. The counts sum
exactly to the applicant pool above them (apportioned by largest remainder, so
they are whole students that actually add up), which makes "the new labs brought
in 400 more research-minded applicants" something the player reads off the board
rather than computes.

What each cohort *responds to* — labs, established majors, clubs, a fielded
team — is on the card's **hover tooltip**, not under it. It explains the number
rather than being the number, so it costs nothing until it is asked for.

## Students: four aggregate classes

The player manages an **institution**, not individual students. The student body
is modeled as **four aggregate classes** — **freshmen, sophomores, juniors,
seniors** — each a plain count, never a list of simulated people. **Do not
introduce individual-student simulation.**

- Students attend for **four years**. Each summer, at the admissions boundary
  (`RESOLVE_ADMISSIONS`), classes **advance**: seniors graduate and leave, each
  younger class moves up a year, and the admissions funnel commits a **new
  freshman class**. Total enrolled = the sum of the four classes.
- **Satisfaction** represents both current student happiness *and* an input to
  future attractiveness: the causal chain is **current student experience →
  satisfaction → next year's applications**. Satisfaction stays an aggregate
  institutional reading, not a per-student one.
- Capacity, instruction cost and appropriations all scale with the **total
  body** across the four classes (`totalEnrolled()` in `types.ts` is the one
  place the sum lives; nothing stores a separate total that could drift).
  Tuition does **not** — it is charged per class, at four possibly different
  prices (see "Tuition follows the class that paid it").

The settled v1 rules:

- **Full progression, no attrition.** Every student who enrolls advances each
  year and graduates after four; there is no inter-year dropout. (Retention as a
  satisfaction consequence is a plausible future hook, deliberately not built.)
- **Capacity is a demand floor, never an enrollment ceiling.** Housing and
  enrollment are decoupled (see "Commuters" below): the funnel sizes the
  incoming freshman class purely from the admissions model above, with no
  reference to open seats. Bed capacity still matters, just earlier in the
  pipeline — it scales the applicant *pool* toward its full size
  (`admissionsSystem.ts`'s `capacityFactor`), so a school with no dorms at all
  still draws a real pool (the floor), while one that invests in housing draws
  a bigger one, up to a reference scale beyond which more beds buy nothing
  further. An older design capped the incoming class at open seats and damped
  growth with an `INTAKE_SURGE_MULTIPLIER`; both were deliberately removed
  (commit "Introduce commuters: decouple enrollment from dorm capacity") once
  a build-nothing school was found growing to five figures of enrollment with
  no throttle at all — `docs/plans/01-design-alignment.md`'s class-smoothing follow-up note
  predates that removal and is superseded on this point.
- **Founding mix.** A new college opens **fully commuter** — capacity 0, no
  dorm built yet (see "Commuters" below) — with **all four class years
  present** and **balanced**: each class ≈ FOUNDING_BODY / 4
  (`FOUNDING_CLASSES`, `88 / 88 / 87 / 87`, summing to 350). This puts a
  graduating class on the books from year one, without needing a founding dorm
  to justify it.
- **Commuters.** Enrollment is never capacity-gated: `students.capacity` is
  bed count, tracked separately from `totalEnrolled()`, and a large commuter
  school with few dorms is still a large school for every other purpose
  (instruction cost, satisfaction's non-housing attributes, prestige). Housing
  is one input to the admissions applicant-pool factor and its own
  satisfaction attribute — never a ceiling.

Implemented in the four-class model (`students.classes`), with a save
migration that splits an existing `students.enrolled` scalar evenly across the
four classes.

### Class, cohort, course

Three words that all sound like "a group of students", kept strictly apart:

- A **class** is a year group — freshman, sophomore, junior, senior. It is
  admitted in one summer and graduates four years later, and it is what
  `students.classes` counts.
- A **cohort** is a *kind* of applicant — research-oriented, price-sensitive,
  athletes, and four more (see "Admissions cohorts" above and
  `systems/admissions/cohorts.ts`). It cuts across all four classes, and
  nothing stores it: a cohort's size is recomputed from what the school has
  built whenever it is needed.
- A **course** is a Buildable a student enrolls in (`techData.ts`), and is
  never called a class anywhere in this codebase or its UI.

Every class is made of students from every cohort, which is why one word could
not go on doing both jobs.

## Rankings: the U.S. News report

Rivals are populated densely enough that a **top 50** is meaningful (~55 schools,
not 5). Rival prestige **fluctuates dynamically** year to year rather than
sitting static while the player grows. **Rankings are a measurement *of*
prestige, not a driver of it:** entering or climbing the rankings never itself
raises the player's prestige (see the prestige direct-mutation audit), and rivals
stay deliberately lightweight — a dynamic scoreboard whose relative standings
shift, not a strategic AI that reacts to the player. The report is a **mid-game
reveal**:

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

Faculty are **named individuals** with **lightweight** attributes (teaching,
research, salary) — enough to make a hire a real, appreciating asset, but
deliberately *not* a detailed life/personality simulation. Students, by contrast,
are **aggregate classes**, not individuals (see "Students: four aggregate
classes"). Faculty are needed to unlock course development via `requiresFaculty`,
so a **real hiring pool** is required — hiring is a genuine subsystem, not a stub
(`HIRE_FACULTY`/`FIRE_FACULTY` are wired up in the reducer; see
`facultySystem.ts`).

(A `Faculty.morale` field once existed but was written and never read — dead
state — so it was removed in the faculty-semantics pass. A resumed save that
still carries it is harmless: no code reads it. If the future faculty-lifecycle
system needs morale, it returns as an additive field then. The lightweight
attributes above, plus `acclaim` for a won research prize, are the whole of a
faculty member's model; there is no life/personality simulation. This is
conformance-tested in `test/faculty.test.ts`.)

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

**Who teaches what is real state, and the player chooses it.**
`s.courseFaculty` maps course id -> faculty id: a side record keyed by id, the
same idiom `placements` uses, so the single `Buildable` model stays unforked.
Starting a course names its instructor; `REASSIGN_COURSE_FACULTY` moves it
later, free and immediate, since the real cost is the opportunity cost — whoever
takes it on has one slot less for everything else.

This replaced a **display-only projection**, and the reason matters. The old
round-robin sorted a field's faculty by id, sorted its courses by id, and paired
them off. Fine for a caption; it cannot carry a grade. Hire one person into
Economics and every Economics course silently re-pairs, so the A− Microeconomics
wore last week is now attached to somebody else, for reasons the player never
chose and cannot see. **Player-selected faculty is not a feature next to course
quality — it is the mechanism that makes the pairing stable enough to grade.**

Two consequences fall straight out of the record existing:

- **Dismissal orphans courses.** `FIRE_FACULTY` clears the leaving person's
  assignments and logs how many courses are now without an instructor. What does
  NOT happen is the department getting its capacity back — `usedFacultySlots`
  counts an unstaffed course exactly as it counts a staffed one, because the
  course still exists and still needs teaching. (Counting only staffed courses
  made dismissal a way to *buy* capacity: the sim reached 421 offered courses on
  68 faculty, healthy-looking only because nothing read the silence.) A
  replacement hire can always take the orphans over — eligibility is per-person —
  but an over-committed department cannot open NEW courses until it has the
  people for the ones it already offers.
- **Committing somebody to research takes two of their course slots**, the same
  way and with the same bookkeeping (see "Research").

**The Faculty tab is a roster BY FIELD** (`FacultyTab.tsx`): one section per
department, in the `FACULTY_FIELDS` grouping, each carrying its own slot
arithmetic, its people, and the candidates listed in that field underneath them.
The header's tooltip names the courses that pull from the field, grouped by
major — the answer to "why do I need a physicist". A field nobody has hired
into, nobody is listed in, and no revealed course asks for is not rendered; a
field with courses and nobody in it is, and reads as the vacancy it is.

It is a place to LOOK AT your faculty, not a place to hire from. Hiring belongs
where the shortage is felt — the Curriculum tab, where a course will not start —
and the tab's old alert badge went with the loop it prompted for. The curriculum
says whether waiting will help: a course blocked on capacity draws an **amber**
dot when somebody in that field is on the market (one appointment away) and a
**red** one when nobody is (`techSystem.ts`'s `facultyGate`).

That is the first half of the "department left understaffed → its courses go on
hold" chain the roadmap had deferred: the consequence is built, and it arrives
through the player's own decisions rather than through attrition.

**In the current build, faculty are ageless: no aging, no retirement, and no
rival poaching** — a hire stays on the roster until the player dismisses them.
This is the *current* state, **not** a permanent design commitment: **occasional
rival poaching, and spending money to retain a poached hire, are an intended
future direction**, along with the chain a departure would set off — a department
left understaffed, its courses going **on hold** until a replacement is hired.
That system is deliberately **not** built in this cleanup (do not add it here);
this note only corrects the earlier "settled, never" framing so the spec and the
roadmap agree. What retention buys **today** is growth: a
faculty member's teaching/research stats start below a rolled ceiling
("potential") and rise toward it over years of tenure, then plateau; salary
rises with them, on its own slower-to-plateau curve, so a long-retained star
costs substantially more than the day they were hired (see `facultyData.ts`'s
`grownStat`/`facultySalary`). This makes faculty a genuine **prestige
investment**, though no longer a direct one: roster quality is not itself a
prestige input any more (see "Prestige"). A matured hire reaches standing
through the work they do — the grades their courses earn, and what their
initiatives produce — which keeps the "great cheap early hire, kept and matured"
payoff and stops paying for people who are doing neither. The scarcity that keeps a player from staffing
every school at top quality is money and hiring-pool availability, not
attrition: salaries compound as a roster matures, and a thin-market field
puts someone on the list only every few months, so specialization is a choice
forced by what you can afford and who happens to be available that week, not
by losing people you already have.

## Course quality: every course carries a grade

Every offered course has a letter grade, A–F, and it is **derived on read** —
there is no stored score to migrate, and a course quietly improves as its
instructor matures or is relieved of some of their load. `courseQuality.ts`
holds the whole model; `facultyAssignment.ts` holds the aggregates.

This is what makes academic satisfaction more than "develop everything". A
catalogue of 421 courses staffed by whoever was free is a school full of Ds, and
it now reads as one.

**The inputs are all things the player decided about a person:**

| Input | Effect |
| --- | --- |
| Instructor's teaching stat | the base, 0..100 |
| Teaching load | up to −7, scaling with how full their slots are |
| Course tier | 0 for core and tier-1, −2 tier-2, −5 tier-3, −8 graduate |
| Prize-winning instructor | +3 per prize, capped at +6 |

Bands at 78 / 62 / 44 / 30. The **tier penalty is the load-bearing one**: it
turns assignment from a RANKING problem ("who is best") into a MATCHING one
("who is right for this"), and it gives a senior hire a natural home. Put your
star on the tier-3 seminar, not the gen-ed survey, because that is where their
strength shows up in the grade.

**Overload is a cost, not a cliff.** The load penalty was 12, against bands
16–18 points wide, which made a professor's second and third course read as a
punishment for expanding the catalogue rather than as a price paid for it. At 7
a matured instructor (teaching ~71) on a capstone still drops a visible grade at
a full load — B to C — so overloading somebody stays legible in the middle of
the range where most courses live; what changed is the depth of the drop. The
property to preserve through any further retune is stated in `courseQuality.ts`
and checked in `test/course-quality.test.ts`: **a D on a new department's course
is the system working, a D on a veteran's course means the player overloaded
them**, and those must stay distinguishable.

**Campus facilities are deliberately NOT an input.** The library already reaches
academic satisfaction through seats-per-student and already reaches prestige as
a multiplier on curriculum breadth. A third path would let one building move the
dominant input three ways at once.

**An unstaffed course scores zero, not nothing.** Aggregates count it, because a
school gutted to fifteen professors across four hundred courses is not a
comfortable B — excluding orphans was tried, and that is exactly what it
reported. A course that has not been developed at all is a different case and
scores `null`: an empty slot in the catalogue is not a failing course, it is a
course the university has not opened.

**A performance trap worth knowing about before you touch this.**
`techSystem.ts`'s `facultyLoad` answers "how many courses does this person
teach" by filtering all of `s.tech` — fine for the one call the reducer makes,
fatal in a loop. Grading every course that way is 421 × 421 filtered rows, twice
a week, which over a forty-year sim is billions of comparisons and a run that
never finishes. **Anything grading more than one course builds
`facultyLoads(s)` first** — one pass over `s.tech`, then every lookup is O(1) —
and threads it through.

## The Curriculum map: three levels over one revealed set

The Curriculum tab, like every tab, is **full-bleed**: it owns the viewport and
the dock is laid over it. The layering is the crux — a dialog sits *above* the
chrome because it stands in front of the screen; a full-bleed tab *is* the
screen, so it drops below and reserves the dock's measured height instead of
drawing under it. (Curriculum is where the shape was first proven, which is why
it is described here; the shell now gives it to everything.)

Three levels, all derived from the unlock/milestone state progressive discovery
already computes — the view adds no state of its own:

1. **Schools.** One card per revealed school, with its completion and its
   aggregate grade.
2. **Lanes and tier bands.** A school opens into its majors, each a lane banded
   by tier, so position carries the regular structure.
3. **The course drawer.** A course opens into who teaches it, what grade that
   earns, who else is eligible and what it leads to.

**Almost no edges are drawn, and that is the argument.** 42 majors in a fixed
1/4/4 shape means the tier chain is ~336 edges all saying the same thing.
Position carries that; what gets highlighted instead are the **~50 authored
cross-major bridges**, which are the interesting ones — and only when they are
relevant to what you are looking at. Every prerequisite in the drawer is a link
that opens its school and selects it, so the only edges that exist are the ones
you walk.

*(A literal constellation layout was built and abandoned before this — see
`docs/plans/02-academic-core.md`'s "Why the constellation failed", which is the most
useful thing that experiment produced. The one finding carried forward is the
full-bleed shell above.)*

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
  school's programs **established** (the milestone prestige's curriculum breadth
  reads). **The threshold is defined explicitly, per program, and may differ by
  school** — it is authored data, not inferred by the implementation. It is
  deliberately *not* "every program distinguished," which lands so late that the
  professional schools would arrive with nothing left to spend the rest of the
  run on. (Today the code derives the count from one shared dial,
  `PROFESSIONAL_GATE_MAJOR_SHARE` at 0.75 — five of a six-program school; the move
  to authored per-program thresholds is the roadmap's PR C.)
- a **research doctorate** gates on `researchSchools()` — a finished facility
  in its parent school, the same gate research itself and the university charter
  hang off. Three doctorates were authored back when three schools bore labs.
  Every school with majors now has a facility, so the gate would admit more —
  but the doctorates themselves are authored content that does not yet exist
  (see the Roadmap).
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
the **fourth share inside the existing curriculum-breadth input** — 0.34 program
established / 0.26 program distinguished / 0.25 school distinguished / **0.15
graduate**, still summing to 1 — so the ceiling did not move: finishing everything
scores exactly 1 and no more. Inside that share, programs are weighted against each other by an
authored `prestigeWeight` (medicine 2.0, law 1.6, the MBA 1.4, each doctorate
1.0) and normalized by the total. **That is how a top law school is allowed to
move standing more than its five courses suggest** — a share of an
already-capped input, never a weight of its own — which is the same discipline
the research cap follows. A research doctorate additionally credits the
**research** input (two credits each, into the same clamped 0..1 the
breakthroughs feed), because a PhD program genuinely *is* research standing;
professional schools get nothing there.

**Future directions (undecided — do not invent).** Beyond the shipped
medicine / law / MBA trio, several school-specific advanced payoffs are named in
the design as *possible* directions but are **not yet specified**, and must not
be implemented speculatively: an MBA-style intro → middle-courses-in-any-order →
capstone structure; Masters → PhD sequencing for science and health sciences; a
Medical School drawing on Science + Health Sciences; a Law School from Social
Sciences & Humanities with a middle-course structure; and an advanced joint
Engineering + Computer Science institution (possibly robotics/research-
oriented). (Arts & Media's own payoff — a Performing Arts Center and an Art
Gallery — is shipped; see "Arts payoffs" below.) Every school should
ultimately have a meaningful tier-3 payoff, but
where the rules are undecided the spec leaves them open on purpose. Graduate-
program thresholds, by contrast, are meant to be **explicitly defined** rather
than inferred (see the professional-school gate above).

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
exceptions (see below). That view has since become the three-level curriculum
map (see "The Curriculum map" above); graduate programs kept their place inside
it unchanged.

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

## Research: work the player commissions

Research is **work the university commissions**, not a by-product of owning a
building. The player picks a topic, a team and a depth, out of a specific
facility; the dice then resolve *that*, rather than resolving everything. All
the randomness the old model had is still here and still does the same job —
what changed is which end the player touches.

**What this replaced, and why.** Scholarship used to be a bank: every faculty
member in a school with a finished lab trickled points into one campus-wide
pool (`s.research.points`), and the pool occasionally bought an output. It
produced research because the school OWNED A BUILDING, with no decision
anywhere in it. The stock is now dead state — kept in the saved shape, written
by nothing, marked not to be rewired, the way `Faculty.morale` was. **Idle
capacity produces nothing**: the way to produce is to start something.

### The facility is the slot

Each research facility hosts **one initiative at a time**, and that is an
invariant of the data shape rather than a rule anybody enforces:
`s.research.initiatives` is keyed by the facility's Buildable id, so a second
one cannot be started there without overwriting the first. It also scales
itself — thirteen facilities exist across the catalogue, so a young school runs
one project and a mature one runs a dozen, with no separate tuning.

**Every school can now do research.** The nine lab-science and engineering
facilities are joined by one apiece for the four schools that had none — an
Experimental Economics Lab, a Computing Research Center, a Humanities Research
Institute, a Media Production Studio (`techData.ts`'s
`LAB_GATED_MAJOR_PREFIXES`, with `RESEARCH_FACILITY_NAMES` for the ones where
"Labs" would be wrong: a history department has an institute with archives in
it). They run on identical machinery — no second kind of research — and since
one facility equips the whole school, every field that school teaches comes
into production behind it. Only General Studies, which has no majors of its
own, has no facility. What differs is **vocabulary**, not mechanics. A model
that can only describe research as laboratory science is one that quietly
tells four schools their work does not count, so `DISCIPLINE_VOCAB` authors
**three** things per school, not one:

- **The output nouns and the verb.** The humanities publish monographs and
  landmark works of scholarship; business publishes case studies and influential
  studies; the arts show exhibited works and acclaimed works, and are *shown*
  rather than published, because a film that "has been published" is the same
  mistake one word further along.
- **The funders.** Each discipline draws from a shared neutral pool — trusts,
  foundations, a federal research council — plus its own: the National Science
  Foundation and a defense research agency for the lab sciences, the National
  Endowment for the Humanities and a library fellowship for the humanities, an
  arts council and a film fund for the arts.
- **The prize names.** Same shape: four discipline-neutral names everybody can
  win, plus one of the discipline's own. A history department does not win an
  award for Scientific Achievement.

**The vocabulary follows the facility the work is running in**, not the campus.
That is the only reading that makes sense — an initiative *is* a topic, a team
and a facility, and the facility is the half of it that has a school
(`facilitySchool`). An earlier pass drew the school campus-wide, weighted across
everyone producing research, which was right under the old model where
production genuinely was the whole roster trickling into one pool; against
initiatives it meant a project in the Humanities Research Institute logged "a
new paper" whenever the campus also ran physics labs.

### Topics, teams and depth

**238 authored topics** (`researchTopics.ts`) — six per department, plus **62
cross-disciplinary** ones that name more than one field and can only be staffed
by drawing somebody from each. What is on offer at a vacant facility is
**derived, never stored**: a deterministic function of the facility's id and a
slowly-turning quarterly epoch, so the list is stable across renders and still
turns over every few months. A topic is only offered when the university can
actually staff it.

**The pool belongs to the FACILITY, not to its school.** A topic is offerable
where the facility's own field is among the fields the topic names (`labFields`,
`initiativeOffers`), so a project always belongs to the place it is happening —
the alternative, a school-wide pool, is what once offered "Acoustics of
Performance Spaces" to an aerospace lab. A cross-disciplinary topic is offerable
in each of the labs it names and in no others, and the two pairs of facilities
that share a field (chemistry / chemical engineering, physics / aerospace) keep
their halves apart through an optional per-topic facility list.

Only **eleven** of the twenty-nine faculty fields have a facility, so only those
eleven can LEAD work. That is not a department being locked out: the way a
marketer, a violinist or a lawyer does research is the interdisciplinary tier,
hosted by a facility whose field the topic names, with the rest of the team
drawn from wherever the topic says. Every interdisciplinary topic names at least
one field that has a facility; the departmental topics in the other eighteen
fields are reserve content, ready the day the catalogue gives one of those
fields a building.

Four depths, and the money is the smaller half of what they cost:

| Depth | Scholars | Duration | Up-front funding |
| --- | --- | --- | --- |
| Pilot Study | 1 | 6 months | 0.4 weeks of opex |
| Funded Project | 2 | 18 months | 1.0 weeks |
| Major Program | 3 | 3 years | 2.2 weeks |
| Landmark Program | 4 | 5 years | 4.0 weeks |

Funding is sized in **weeks of operating cost**, the same scaling device grants
and the decision-event table use, so the figure stays sane across four orders
of magnitude of budget. A **Landmark Program requires a cross-disciplinary
topic**, which is the structural point of the tier: the most prestigious work
in the game is out of reach for a single strong department however deep it
goes.

**Participants teach a reduced load for the duration.** `effectiveCourseSlots`
subtracts `RESEARCH_COMMITMENT_SLOTS` (2) with a floor at zero, so a junior hire
with two slots stops teaching entirely while a senior professor keeps most of
their catalogue — which makes WHO you commit a real choice rather than a uniform
tax. This is the one place the two loops compete for the same people.

Only the **excess** moves. Each member sheds courses lowest tier first, so a
professor on a five-year programme keeps the capstone and hands away the survey
course, and each shed course is then offered to any colleague in the field with
room — the same `eligibleInstructors` list the Curriculum tab's assignment panel
uses, strongest teacher first, highest-tier course first. What nobody can cover
goes unstaffed. `planCommitmentCoverage` works all of that out before anything
changes, so the warning the Research tab shows before the click and the
reassignment the reducer performs after are the same arithmetic.

### What a run produces

Weekly output is `Σ facultyResearchOutput × depth intensity ×
interdisciplinary bonus × researchRateMultiplier` — every term something the
player chose: who is on it, how deep they committed, what the campus has built.
The **interdisciplinary bonus** (+18% per extra field on the team) is why
breadth pays off twice: a team drawn from several departments produces
meaningfully more than the same people would apart, which is what makes a wide
university worth building rather than a deep one worth drilling.
`researchRateMultiplier` is live-read off every finished Buildable carrying
`effects.researchRateBonus` (each facility, plus the research library) — that
field multiplies output, it never creates it.

Against that output, a weekly chance — 0.5% at a standing start, rising to 3.4%
for a team producing flat out — draws one of three **during-run** outputs:

- **Publications** (weight 26) — the bottom rung, and the reason it exists: the
  other outputs all cost enough that a young department's first decade was a
  long silence. A cheap, frequent output gives a school something to show from
  its first year, and gives the humanities an output that reads right.
- **Grants** (weight 6) -> cash, sized at 0.4–1.2 weeks of opex and then
  **scaled by team strength** — the most legible place stronger faculty produce
  better outcomes. A grant is a welcome cheque, not a funding round: across the
  sim's runs they settle at **0.6–3.5% of lifetime operating cost**. They must
  never become a second economy.
- **Breakthroughs** (weight 5) -> prestige, and **only through a capped input**.
  A breakthrough increments a count that `prestigeSystem.ts`'s `researchScore`
  reads as one clamped 0..1 input among six. It never writes
  `s.self.reputation` — that would be exactly the completion-bonus flow the
  prestige model exists to forbid.

**Team strength** is the mean research *stat* (0..100) plus 0.08 per point of
acclaim the team already carries, capped at 1.4. It is the research stat and
NOT `facultyResearchOutput`, which is points per week on a completely different
scale; confusing the two is silent, and did happen — see the note in
`researchData.ts`'s `teamStrength`.

### The award, at conclusion and nowhere else

A prize is no longer a weighted draw against a bank. It is **what a finished
piece of work is judged to have been**, rolled once when an initiative
concludes:

- **Gated on a breakthrough.** A run that banked none can never end in an award,
  however distinguished its team. This is why the breakthrough weight cannot be
  pushed too low: that would not make awards rare, it would make them
  impossible.
- **Then depth × team strength, with real noise.** Base odds run 1.5% for a
  pilot study to 45% for a landmark program, multiplied by
  `(0.15 + teamStrength)` — the team floor is small on purpose, so a strong team
  roughly doubles a weak one's odds at the same depth rather than the tier
  swamping the choice of who to commit.
- **The winner is drawn from the team**, weighted by their own output, so it
  usually but not always goes to the strongest person on it.

So a prize arrives with a named topic, a named team and five years behind it,
rather than out of a pool.

**The completion is the event, and the award is one of its results.** A
concluded project files a `research-complete` report — topic, facility, team,
years, publications, breakthroughs, grant income, and the award if it won one —
and that report is the modal. It used to be the other way round: a separate
prize interrupt stopped the clock for the trophy while five years of work passed
as a log line. Like a milestone the report is **queued**, not fired: the week a
project ends may already belong to the summer admissions decision, and only one
interrupt can be pending at a time. Everything in it has already happened —
outputs counted, grant money banked, the winner's premium applied — so a delayed
report never delays an effect.

Two things deliberately do not report. A **cancelled** project: winding one up
early is the player's own action and already logs, and a modal confirming what
the player just did is noise. And a **quiet pilot study** — six months, no
breakthrough, no award — because reporting every completion took the balance
sim's texture count from 1.7 to 3.0 modals a year, nearly all of it the smallest
tier of work interrupting most often. Anything at Funded Project depth or deeper
always reports. A quiet pilot still logs, and still appears in the Research
tab's history.

Finishing a run is worth something **in itself**, separate from whatever it
produced along the way: `INITIATIVE_COMPLETION_CREDIT` (0.3 / 1 / 2.5 / 6 by
depth) counts into `researchScore` for every non-cancelled completion.

The prize still needs the one extra `Faculty` field, **`acclaim`**. Teaching,
research and salary are all recomputed from potential + tenure on *every* tick,
so a permanent post-prize bump cannot hang on any of them — it would be erased
the following week. Both the salary curve and the research-output formula read
`acclaim` as an input instead.

**One survival from the old model.** `weeklyResearchPoints` still exists, but
as a reading of **capacity**, not a stock that accumulates: "how much research
could this campus be doing", consumed by the admissions funnel's applicant
appeal (`cohorts.ts`) and printed as the sim's `rsch/wk` column. Nothing banks
it any more.

## The health chain, and clinical coursework

Three buildings, each a different institution rather than the same one with
a bigger number on it (`facilitiesData.ts`), unlocked in order past rising
population thresholds:

- **Health & Counseling Center** (3x3) — the small campus clinic a school
  needs once it crosses 1,500 enrolled.
- **University Clinic** (5x5) — real outpatient care, and the **practicum
  site** two clinical majors train in (see below).
- **University Hospital** (11x11, the largest *building* on campus) — the
  late-game rung, and the one facility in the game gated on **another
  building**: `BLDG-MED`, the School of Medicine's own hall. A university
  hospital is a teaching hospital, and a campus without a medical school
  does not have one.

Capacity tracks footprint at a near-flat ~220-250 students served per tile
across all three, while cost per seat climbs (280 -> 400 -> 650) the way
every chain in that file does.

**Clinical coursework gates on a clinical facility**, the same cross-kind
mechanism the labs and the arts facilities use — but keyed by COURSE id
rather than by major prefix (`techData.ts`'s `CLINICAL_PRACTICUM_GATE`),
because a clinic gates the courses that are actually clinical:

- **Nursing's four capstones** need the University Clinic. This retired the
  **Nursing Lab**: a lab here means a *bench science*, and nursing is not
  one — its capstones are clinical practica, which happen where patients
  are. Health Science stays a research school on Neuroscience's lab, which
  is a bench science and keeps its own.
- **Pharmacy's Clinical Pharmacy Practicum** — and only that one of its
  capstones — needs the Clinic too.
- **The MD's Advanced Clinical Practicum** needs the **Hospital**. A
  clerkship is inpatient work, so the chain reads: found the school ->
  build its hospital -> finish the degree.

None of this can be circular: every gate points at a health-chain facility,
and the health chain's own prereqs are earlier rungs of itself plus the
medical school BUILDING — never a course.

## Arts payoffs: two facilities, two majors

Arts & Media's version of "every school gets a meaningful tier-3 payoff" —
the same curated cross-kind gate `LAB_GATED_MAJOR_PREFIXES` gives the lab
sciences (a Buildable gates a major's capstone coursework), but with each of
two majors pointed at its **own** facility instead of a lab per major:

- **Performing Arts Center** (`facilitiesData.ts`'s `PERFORMING_ARTS_CENTER_ID`)
  unlocks once **Music's** full tier-2 quartet (`MUSC110`–`MUSC140`) is done,
  then gates Music's own tier-3 capstone courses — the concert hall and
  theater is where those capstones perform.
- **Art Gallery** (`ART_GALLERY_ID`) unlocks once **Studio Art's** tier-2
  quartet (`SART110`–`SART140`) is done, then gates Studio Art's tier-3
  capstones the same way — the rotating-exhibit gallery is where those
  capstones exhibit.

Each facility's unlock and its own gate sit two tiers apart (tier-2 to
unlock, tier-3 gated), so this can never be circular: building the facility
can never require the facility. The two are otherwise independent of each
other — nothing orders the gallery against the performing arts center, only
each against its own major's coursework.

**Graphic Design, the school's third major, sits outside both gates.** A
two-building, two-major split already covers the school's performing
(Music) and exhibited (Studio Art) halves; there's no third facility for a
third major to specialize into, so Graphic Design's capstones take the
plain tier-2 prereq every non-gated major's capstones get.

**Both facilities also feed student satisfaction** like any other
campus-life facility — `satisfactionAttribute: 'social'` plus a
`servesPopulation` (1,500 for the Performing Arts Center, 500 for the Art
Gallery), read by the same `social` ratio the rec center and student-center
tiles feed. There is no separate arts-specific satisfaction input; it is the
existing mechanism, not a new one.

## Student life: clubs, Greek letters, and varsity athletics

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
is a stock that drifts toward a computed target once a week, and student
life is not one of that target's inputs.

**Satisfaction effects are transient by construction**, exactly like the
decision events': the stock drifts back toward its facilities-derived target
at `SATISFACTION_DRIFT_RATE` a week, floored by `ATTRIBUTE_SCORE_FLOOR`. The
teeth are timing near the summer funnel, not permanence. What *is* durable is
the ongoing source: a disbanded chapter's real cost is that its contribution
to the target stops, not the one-week dent.

**Varsity athletics** is a third layer that **grows out of clubs** rather
than adding a parallel sport simulation: a varsity team is mechanically
close to a Greek chapter that needs a venue. Athletics V2 (below) added a
real coaching-staff hiring pool, team quality, and standings against
rivals' own athletic strength — but there is still **no match simulation
and no schedules**: standings are read off one comparable strength number
per school, the same shape `self.reputation` vs. `Rival.reputation`
already uses for the academic ranking, not a simulated season.

A named share of new club formations (`SPORT_CLUB_SHARE`) roll as a **sport
club** instead of an ordinary one — the same weekly club roll, no second
formation stream — drawn from a fixed, **gendered** `SPORTS` list
(`data/studentLifeData.ts`) that also maps each sport to the **venue
category** it needs (field sports share a multi-sport field; basketball/
volleyball share an arena; baseball and softball share a diamond; swimming
needs a natatorium; football is alone, gated behind its own petition, and
gets the pinnacle **football stadium** — the most expensive Buildable and
largest map footprint in the game). Every sport is one of three profiles
(`SPORT_PROFILES`): **men-only** (football, baseball), **women-only** (field
hockey, softball), or **two-gender**, fielding independent men's and women's
lineages (soccer, lacrosse, basketball, volleyball, swim & dive) — 14 gendered
`SPORTS` entries in all. A men's and a women's program of the same sport are
two entirely separate club/team records (a gendered id, not a `gender` field
alongside a shared one), so they form, petition and graduate on their own
timelines, sharing only the venue category — the second lineage into a
category, of either gender, finds the venue already revealed or built and
pays only the varsity fee. A sport club may petition to go varsity **five
years after it was founded** (`VARSITY_PETITION_MIN_TENURE_YEARS`,
`studentLifeData.ts`); a decline is not permanent — the same tenure gate
re-opens the ask **five years after the decline** rather than closing the
door forever (`StudentClub.varsityLastAskedYear`, re-checked by
`sportClubsAwaitingVarsity`) — an authored decision event (`eventData.ts`'s
`varsity-petition`) modeled directly on the chapter housing petition for its
prompt/choices, but fired on its **own deterministic schedule**
(`eventSystem.ts`'s `fireVarsityPetition`) rather than drawn from the shared
decision-event lottery, so the pipeline is a guarantee rather than a roll of
the dice. It surfaces on the first quiet week at or after
`VARSITY_PETITION_WEEK` — three-quarters through the year, evenly spaced from
both summer admissions and the U.S. News report — so it never reads as just
another summer or midyear beat. Granting it costs a weeks-of-opex program
fee — the coaching staff is no longer part of that cost, or auto-generated:
the team arrives with all three staff roles vacant (see below) — and
**reveals** the required venue Buildable if it isn't already `'done'` —
hidden-until-demanded, the same gate a graduate program
uses (`Buildable.athleticsVenueReveal`, checked in `meetsUnlockGates`; a
team's own existence on `s.orgs.teams` *is* the reveal signal, no separate
flag). Like the chapter-house grant, the venue is **not** pushed straight to
`'done'` and auto-placed — it goes through the ordinary build-rail cost/
duration cycle like any other facility, and the team sits `'awaitingVenue'`
until it finishes. The
**second** team in a category finds the venue already revealed (or built) and
pays only the varsity fee, never a second building — the mechanism that keeps
this an athletic department rather than one building per team.

Venues are **ordinary, reveal-gated `facility` Buildables**, and deliberately
**distinct** from the rec-facility trio (gym/tennis/pool): a natatorium is not
the rec Swimming Pool, a stadium is not a rec field. "Shared" means shared
*among varsity teams* in one category, not shared with recreational use — a
named design fork; see `facilitiesData.ts`'s note above `GYM_ID` for the
rejected alternative and why.

**Coaching staff (Athletics V2)** is a standing hiring pool
(`s.orgs.coachCandidates`) that deliberately **mirrors Faculty's own
market** (`facultyData.ts`'s `generateCandidate`/`grownStat`/
`facultySalary`/`candidateArrivalsThisWeek`) rather than inventing a
second hiring mechanism — `studentLifeData.ts`'s
`generateCoachCandidate`/`grownCoachQuality`/`coachSalaryFor`/
`coachCandidateArrivalsThisWeek`, ticked weekly by
`systems/athletics/athleticsSystem.ts`, the exact same "age every listing,
drop anyone past the window, top back up toward target" shape
`facultySystem.ts`'s `tickCandidatePool` uses. A candidate's `field` is
either a `SPORTS` id (a head/assistant coach candidate, hireable only into
that exact sport's team) or `TRAINER_FIELD` ('strength-conditioning', hireable
as any team's trainer regardless of sport) — and candidates skew
**disproportionately to the gender of the sport they'd coach**
(`COACH_GENDER_MATCH_CHANCE`), a trainer's listing staying an even coin
flip since strength & conditioning carries no sport gender to skew toward.
**Every team needs three separately hired roles** — head coach, assistant
coach, trainer (`VarsityTeam.headCoach`/`assistantCoach`/`trainer`,
`types.ts`) — each grown week over week once hired
(`athleticsSystem.ts`'s `growCoach`: quality climbs toward a rolled
ceiling, salary rises with it plus a tenure premium, the same shape
`growFaculty` uses) but NOT while still listed, exactly like Faculty. A
vacant role is not a hard block — the team still competes — just a real,
felt gap: `teamQuality` (`studentLifeData.ts`) scores an empty slot at a
fixed low floor rather than zero.

A live team's own upkeep (a fixed program fee plus its three coaches'
live, tenure-appreciating salaries) and its flat, capped contribution to
the `social` satisfaction attribute both run through **one recruiting &
scholarship budget lever** (`ATHLETICS_BUDGET_TIERS`, replacing the old
"investment" tier of the same shape) — low/medium/high, scaling the whole
department's upkeep and social contribution together rather than
budgeting per team, and now ALSO adding a flat quality bonus
(`qualityBonus`) on top of whatever the coaching staff itself is worth —
the "recruiting" a shallow model with no individual athlete roster can
actually represent. Athletics reaches satisfaction only through this same
capped social contribution, same as clubs and Greek life — **never
prestige directly**; if athletics should eventually touch prestige, that
is a separate prestige-model decision, flagged rather than wired.
Disbanding a team is not built in this pass either; when it is, what
happens to a now-teamless venue is a call worth making explicitly rather
than silently.

**Standings** are a second, independent ranking axis
(`rivalsSystem.ts`'s `athleticRank`/`athleticRankedList`, read against
`Rival.athleticStrength` — `rivalData.ts`'s `athleticStrengthFor`, a
deterministic function of a rival's own id and current `reputation`, wide
enough (0.6x-1.4x) that a rival can be an athletic power without being an
academic one and vice versa) — the exact same shape `playerRank`/
`rankedList` already use for the U.S. News report, just sorted on
`athleticProgramStrength` (`studentLifeData.ts`: active teams' own
`teamQuality`, averaged and scaled up with how many are fielded — a
department with five solid teams outranks one with a single elite team)
instead of `reputation`. No annual report, movers list, or reveal
interrupt of its own — just a live rank readout on the Athletics tab, a
narrower slice of the U.S. News machinery's own depth, not a parallel copy
of it.

**The Student Life tab** is the home for clubs (a sport club stays here,
tagged, until it graduates — only VARSITY status moves out) and Greek
chapters with founding year and current membership, the petitions waiting on
the next digest, and an empty state that reads sensibly through the founding
years before any student center exists. **Athletics has its own tab**: once a
sport club goes varsity it moves there — active and awaiting-venue teams,
each with its own hire/release controls for its three staff roles, plus the
one budget lever and the standings readout — a plain relocation out of
Student Life once
athletics grew gendered lineages of its own, not a change to how any of it
works. Student Life still has to make the satisfaction
effect **legible**, which is what stops the system feeling arbitrary, and it
does so by *reading the model rather than inventing a display number*:
`satisfactionSystem.ts`'s `studentLifeSatisfaction` runs the very computation
the weekly tick runs against throwaway copies of the state with one source
removed, and reports the difference — the same way the milestone modal reads
`prestigeTargetWithout`. That honesty is the point: when the `social`
attribute is already clamped at its ceiling from facilities alone, the panel
reports that the clubs are adding *nothing*, because nothing is what the
model is applying.

**The Satisfaction Breakdown is the other half of that legibility, and it is
on screen from week one.** Five cards, one per attribute, each with a ring
that fills toward 100, how much of the headline number that attribute is
worth, and a one-line coverage reading; expanding a card lists every
building behind the score, what it serves, and any named bonus — all of it
read from `attributeDetail` rather than reauthored, so the expansion can
never disagree with the dial above it. It renders **unconditionally**: the
panel used to sit below an early return that fired whenever the campus had
no clubs and no pending petitions, which is the first ten to fifteen
founding years of most runs — precisely the stretch where a player is
working out what satisfaction responds to — and made the panel appear for
the first time the week a chess club was recognised, as if the club had
summoned it. Only the two organisation rosters collapse to a note when
there are no organisations.

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
  chain — so "somewhere to eat" is a named dining Buildable the school could
  start today, and it is asked for because dining is genuinely what this
  campus is most short of. A completely full campus can instead be asked
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

## The campus you build on: trees

A new university does not open on a bare plate. `data/treeData.ts` seeds a
**founding woodland** at `createInitialState` — groves rather than an even
scatter, with a deliberate clearing around the middle where Founders Hall
already stands, so the map has *places* on it and siting a building is a
choice about ground. `GameState.trees` is one entry per wooded tile,
keyed by the same `pathTileKey()` `pathways` uses, and its value is a single
integer SEED: `components/trees.tsx` derives species, size and the tree's
offset within its own tile from it, so a wood is varied without storing
anything per tree and a given tree looks the same forever.

**Two rules, and the difference between them is the whole feature:**

- **Building FELLS.** The reducer's `PLACE_BUILDABLE` deletes every tree
  under the footprint it commits, in the same transaction, permanently. You
  cleared the ground to build there.
- **Paving only HIDES.** A path tile on a tree's tile stops it being drawn,
  and lifting the path brings it straight back. Nothing is deleted, so this
  is a pure *render-time* read of `pathways` in `CampusMap.tsx` — not a
  second piece of state to keep in step.

Trees draw in the **same depth-sorted pass as buildings**, not a layer of
their own: a tree in front of a hall paints over it and one behind it is
hidden by it, which a separate layer could never do. And, like `placements`
and `pathways`, `trees` is **read by no system** — the invariant sweep
enforces it.

**Flat ground is the exception to that pass, and has to be.** Painter's
order is the occlusion here, and one depth key per placement (the far corner
of its footprint) expresses a mass well enough — but it cannot express a
large FLAT plate. A 9x9 quad sorted on its far corner draws *after*, and so
over, a tree standing in front of its near corner but off to one side, whose
own depth is smaller. That is not a tuning problem; it is what a single sort
key cannot say about a big footprint.

So an open-ground facility (quad, pitch, ball field, courts, pool deck) is
split in two. Its **paint** has no height, can never legitimately occlude
anything, and is drawn in a pass of its own *under* every mass, needing no
depth at all. What genuinely **stands** on it — planting, hedges, a
fountain, a monument, a stand, an outfield fence — comes back from
`groundMarkings.ts`'s `groundProps` and joins the ordinary sorted pass, each
prop on the point it actually stands on, so a quad's own trees interleave
correctly with the woodland around them.

## College, and University

A school opens as **"<Name> College"**. The player writes only the first half at
founding; the word after it is fixed institutional form. When the **first
research facility** finishes, a one-time interrupt offers to promote it to
**"<Name> University"** — the same gate research hangs off, read through the
same helper so the two can never drift apart. It is a naming change and nothing else: a `suffix` string
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
programs. Prestige itself does not lurch — it is a stock drifting
slowly, week by week — so that reads as a ceiling that moved up rather than
standing taken away); v11 -> v12 added the two PROFESSIONAL-SCHOOL BUILDINGS
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

**The narrative above stops at v12; `SAVE_VERSION` is well past it.** Each
later migration documents itself at its own entry in the `MIGRATIONS` table,
which is the canonical record — this prose is a walk through the *shapes* a
migration can take, not an index. The three from the academic-core arc are
worth naming here because they are the ones a reader of the sections above will
look for: **v30 -> v31** materialises the old display-only round-robin into real
`courseFaculty` assignments, so a resumed run keeps the instructors it appeared
to have rather than waking up with four hundred orphans; **v31 -> v32** splices
in the four new research facilities and re-points the unbuilt capstones that
gate on them; **v32 -> v33** adds the initiative slices, empty. Each keeps what
a resumed run earned, and each is covered in `test/save-migrations.test.ts`.

Loading also runs **placement hygiene** on the campus map every time: orphaned
ids (or ones that aren't currently `done`/`developing` — see "Courses and
buildings share one flow" above), placements whose footprint no longer fits the
grid, and overlapping placements are clamped back inside or dropped. That is
safe precisely because placement is visual-only — a dropped `done` placement
just stops rendering, keeping every effect it already granted; a dropped
`developing` one keeps counting down in `developing` regardless (`tickTech`
never reads `placements`), it just won't render anywhere until it finishes.

## Working style for coding agents

Keep changes focused on the task described. If you spot a tension or a decision
the task doesn't specify, **flag it in the PR summary rather than silently
choosing** — surfacing tradeoffs is more useful than smoothing them over. After
making changes, run `npm run build` (compiles), `npm run lint`, and `npm test`
before opening a PR. `npm test` chains nine suites with `&&` — invariants, save
migrations, faculty, the curriculum graph, cohorts, admissions pricing,
financial distress, gendered sports, and the balance regression gate — so
**a failure in an early suite silently skips the later ones**; read the tail of
the output, not just the exit line. A change that alters save shape or
migrations should extend `test/save-migrations.test.ts`. A change that moves a
number the economy depends on should be checked against `npm run sim` (40 years
× seven scripted strategies) as well, and its result quoted in the PR summary.
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
- Annual summer admissions interrupt: the player sets tuition and the admit
  rate; the applicant pool, incoming quality and enrollment follow from them.
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
- **Varsity athletics v1, then Athletics V2, both shipped** as a growth out
  of clubs, not the parallel develop-track sketch this line used to
  describe — see "Student life: clubs, Greek letters, and varsity
  athletics" above. V2 added the standing coaching-staff hiring pool
  (recruiting through a real candidate market, mirroring Faculty's own,
  rather than auto-generating a coach), the three-role team roster, the
  recruiting & scholarship budget lever, team quality, and a second,
  independent standings axis against rivals' athletic strength. Still
  deferred: match simulation and schedules (standings stay a single
  comparable strength number per school, not a simulated season), any
  prestige coupling, and a considered answer for what happens to a shared
  venue once its last team disbands.
- **Research depth: shipped**, and more than this line asked for. The four
  schools that had no facility each got one, so every school but General
  Studies can do research directly; and research itself stopped being a
  by-product of owning the building — the player now commissions a topic, a
  team and a depth out of a specific facility (see "Research"). Still open:
  research doctorates for those four schools, which the facilities now make
  possible (see "Graduate programs").
- Campus life depth, and more authored decision events on top of the thirteen
  that now exist (see "Interrupts" above) — including events that reach
  systems the first pass deliberately left alone.
- Faculty lifecycle: **rival poaching and paid retention** (a poached hire the
  player can spend to keep). The downstream chain a departure sets off —
  department understaffed → its courses left without an instructor → hire or
  reassign a replacement — **now exists**, reached through the player's own
  dismissals and research commitments rather than through attrition (see
  "Faculty"); what poaching would add is a departure the player did not choose.
  Aging/retirement remain optional.
- A richer demand-curve finance model with prestige/scale archetypes.
- Campus map depth: adjacency weighting between neighboring buildings, and any
  economic/prestige feedback from the layout. The map itself (a fixed tile grid,
  placement of finished `building`/`dorm`/`facility` Buildables at their own
  footprint sizes, SVG rendering) now exists as a visual-only layer; nothing
  mechanical reads it yet.
- **The curriculum view: shipped, but not as this line described it.** A
  literal constellation layout was built and abandoned — 421 nodes of a graph
  whose edges are almost all the same edge is a picture of nothing. What
  replaced it is the three-level map: schools, then tier-banded lanes, then a
  course drawer, with position carrying the regular structure and only the ~50
  authored cross-major bridges highlighted (see "The Curriculum map"). Still
  open from the original idea: nothing worth keeping —
  `docs/plans/02-academic-core.md`'s "Why the constellation failed" is the record of
  why.
- Camera rotation on the campus map. The map is now drawn at an angle (2:1
  dimetric — see `src/components/isoProjection.ts`), which means a tall
  building can hide a shorter one standing behind it. The genre's answer is
  letting the player turn the camera through four views; until that exists,
  occlusion is a real cost of the angle and a reason to leave room around
  what you build.

UniSchool — systems-first, no art (yet)
