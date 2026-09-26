# UniSchool — Playtesting

The instrumentation a change is measured with: how to stand the game up at
any point in a run, how to read and change the simulation while looking at
it, and how to tell whether a trajectory moved.

Everything here is a **developer** surface except one — the prestige
breakdown, which is a player feature the developer happens to need first.

| Want | Use |
|---|---|
| A school at year 8, or the week a modal is pending | `npm run scenario` |
| To read, set, jump, force, or load, in the browser | the debug panel |
| To know why prestige is what it is | the History tab's **Standing** section |
| To know whether a change moved a trajectory | `npm run sim`, the report against its baseline |
| To know how the intended line of play goes | `npm run guided` |
| To know how the owner's natural line of play goes, year by year | `npm run natural` |

## The flag

Playtest controls are gated in one place: `src/components/playtest.ts`. Three
ways to turn them on, all setting the same thing:

```
?debug=1                          on the URL — sticks, see below
localStorage['unischool.debug']   = '1'
a school named "test"             the original gate, still working
```

`?debug=1` also writes the localStorage key (and `?debug=0` clears it), which
is what makes the URL form usable at all: the panel's own Load button reloads
the page, and a flag that lived only in the query string would be one every
reload had to re-type. The URL and storage forms are read **once, at module
load** — a gate that flickered mid-session would mean a panel appearing and
disappearing under the player. The name check is per-call, since the name
lives in the state.

The name gate had to stop being the *only* gate the moment scenarios
arrived: a scenario save carries the name the run was played under, so every
state a playtest wanted would otherwise have to be renamed "test" by hand,
which is exactly what the September 2026 review's scripts were doing.

## Scenarios

```sh
npm run scenario -- --list                    # the index
npm run scenario -- year-8-balanced           # build one by name
npm run scenario -- championship              # …including one that only exists for a week
npm run scenario -- summer                    # the four-beat summer, stopped on its first beat
npm run scenario -- final-report              # the fiftieth summer, stopped on the final report
npm run scenario -- --player Guided --year 12 --modal milestone
npm run scenario -- --player Completionist --year 22 --vernacular gothic \
  --name Blackmoor --clear-modal /tmp/gothic.json   # a campus to photograph
```

A scenario is a **recipe, never a file**: a player (the guided player or an
archetype, below), a year, an optional stopping point and, since Plan 15's
PR G, an optional `mutate` step that breaks the school after the run (the
`crisis` scenario stands the guided player's college up at year 15 and puts
it in the hole — satisfaction 35, a body half again too big, cash gone — the
state `test/archetypes.test.ts` hands back to the guided player to prove
recovery is possible), in `tools/scenarios.ts`. `npm run scenario` plays the real
reducer forward and writes a real save (`persistence.ts`'s `SavePayload` at
the current `SAVE_VERSION`), so nothing generated is committed and nothing
needs migrating. A committed save would be a few hundred KiB and stale the
next time the save shape moved; a recipe survives it.

Flags: `--player` (or `--strategy`) `--year` `--modal` `--seed` `--vernacular` `--name`
`--clear-modal` `--list`. A positional argument ending in `.json` is the
output path; anything else is a scenario name. The default output is
`node_modules/.tmp/<name>.json`.

**Stopping inside a year** is what the harness's `playUntil(g, player, years,
stop)` is for (`sim/harness/game.ts`). The predicate is checked at the top of
a week and *before* the player answers anything, so a run halted that way hands back a
state with its modal still pending — which is the only way to reach "the week
a championship modal is on screen", a state no year boundary ever lands on. A
scenario that asks to stop somewhere and never gets there **fails and writes
nothing**, rather than quietly handing back year 40.

Load a scenario with the debug panel's **Load** button (it is offered on the
startup screen too, which is where a browser with no save starts), or hand it
to `npm run shot` for a screenshot — through `npm run layout` first if the
picture is the point, since the harness's players site every building along
one edge of the grid (see `tools/README.md`).

## The debug panel

`src/components/DebugPanel.tsx`, top left, behind the flag. Five sections:

- **Read** — the clock, cash and weekly net, enrolled against beds, all three
  standings *including prestige's target*, the five satisfaction attributes,
  pending petitions, queued milestones, and which modal is up.
- **Set** — cash, prestige, satisfaction, listed tuition. The fields start
  empty with the live figure ghosted behind them: a field seeded with the
  current value goes stale on the next tick, and the current figure is in
  Read, one section up, where it stays true.
- **Jump** — N weeks or years, answering modals on the way with the shared
  default answers, or stopping at the first one when auto-resolve is off. A
  twenty-year jump takes about half a minute and the UI is frozen for it.
- **Force** — any authored decision event (its payload rolled exactly as at
  fire time), a student demand for a named shortfall, the queued milestones,
  the U.S. News report as a modal of its own (in play the table lives in the
  History tab's standings since Plan 33). An event whose context cannot be rolled against this state is
  refused rather than shown empty.
- **Load** — a save from `npm run scenario`.

### The two rules

**Every playtest action goes through the reducer**, as a `DEBUG_*` action.
They live in one block in `src/state/actions.ts` and one in
`src/engine/reducer.ts`, and the panel is the only component that dispatches
any of them. The reducer stays the one interpreter of every action; what
makes these playtest-only is the *gate*, not a back door. The harness
(`sim/harness/`) never dispatches one — a trajectory it measures has to be
one a player could have produced.

**One component dispatches them.** If a second surface ever needs a shortcut,
the answer is to open the panel, not to add a button elsewhere.

Two consequences worth knowing:

- `DEBUG_JUMP` loops **inside** the reducer rather than dispatching TICKs from
  the panel. A component cannot see the state between two of its own
  dispatches, so it cannot notice a modal came up on week 37 and answer it.
- `DEBUG_SET_PRESTIGE` writes through `setPrestigeForPlaytest` in
  `prestigeSystem.ts`, not in the reducer: `test/invariants.test.ts` section 5
  confines every writer of `s.self.reputation` to three files, and that
  invariant is worth more than handling the write where the action is handled.

### Answering modals when nobody is looking

`src/engine/defaultAnswers.ts` holds the default answer to every interrupt,
and **both** fast-forwards ask it: the harness and the panel's Jump.
Two fast-forwards that answered a championship differently would be two
different games.

A new interrupt type falls into that module's `default` branch and is
dismissed. That is a real hazard rather than a theoretical one — the athletic
director's offer spent a release being silently dismissed by a harness that
did not know it existed, so the feature never ran in any measured
trajectory. **Add the case when you add the interrupt.**

## Standing: the prestige breakdown

The History tab opens with a **Standing** section: one panel per standing,
one row per input, each row a two-layer bar — the pale layer is what the
input reaches on its own (weight × score), the solid one what it is worth
after its multiplier. The gap between them is what a short library or a small
student body is costing the school.

It is read off `prestigeSystem.ts`'s `prestigeBreakdown`,
`researchStandingBreakdown` and `socialStandingBreakdown`, and **each target
function is a sum over its own breakdown**. A panel that computed its own
version of the arithmetic would be wrong within a release, quietly, and the
only reader who would notice is the one it exists for. The rows are data:
nothing in the view names an input, so reweighting the model changes one file.

`test/invariants.test.ts` asserts the identity on hand-built states (founding,
saturated, crowded — the interesting cases are where the clamps bite).

**Readings.** Below the academic standing's inputs sits a second list, *read,
not counted*: terms the model measures and shows but does not sum. Plan 15's
PR A put four there — welfare, concentration, crowding and the instruction
capacity crowding reads — so that the year of play before PR B made them
count was a year of reading them; PR B promoted the first three, and
instruction capacity (`systems/techtree/instructionCapacity.ts`) remains,
carrying no weight — it is the ceiling PR E turns into a cap, shown as the
ratio it is. A reading with a weight is drawn as the pale bar alone, what it
would reach, with nothing over it. `readings` is its own list on the
breakdown rather than a set of zero-weight rows, so the identity above stays
a sum over `inputs` alone, and the invariant sweep asserts that no reading's
key is also an input's. `test/standing-readings.test.ts` pins each term's
arithmetic; `test/report-card.test.ts` pins the summer step that grades them.

**Grades.** Since Plan 15's PR B the academic standing carries a *summer
model*: the panel's note says what the year is grading toward and what the
summer step would move, and each row shows last summer's grade beside what it
is worth now. A penalty row (crowding) is drawn in the bad colour and reads as
a subtraction. Both are data on the breakdown (`summer`, `penalty`), so the
view still names no row.

## The harness (Plans 56–63)

The harness is four layers, each answering one question, with one rule
from the owner: **only checks gate a merge; balance numbers are reported.**
Its code is `sim/harness/`; the old scripted-strategy sim
(`sim/balanceSim.ts`, its bands and its reports) went in Plan 63.

- **The game** (`sim/harness/game.ts`): one headless college and the week
  loop every player drives it through — every interrupt answered (the
  player's answer, else `engine/defaultAnswers.ts`), then the player acts,
  then the clock ticks. An interrupt still standing after 64 answers is an
  error. A game can start from a checkpoint (`from`) instead of a founding.
  It sends actions through `reduceInPlace` (engine/reducer.ts), the reducer
  without its clone, unless a run asks for the real one (`clone`).
- **The moves** (`sim/harness/moves.ts`): the one vocabulary every player is
  a policy over — found an offer where it belongs, move a program home,
  site the next hall, develop a course, hire for a blocked field, build for
  a shortfall, build a dorm. Each reads the game's own gates and readings,
  so a rule change updates one move. Two knobs: `pick` (first, or random)
  and `reserve` (cash left behind).
- **The rules** (`sim/harness/invariants.ts`, `brokenRules`): what any state
  must keep, however it was played — every number finite, the clock on its
  scale, halls real and the right size, every program housed once and only
  where its kind may go, at most three distinct unhoused majors on offer,
  placements real, on the grid and apart, development counting down only
  what develops, every instructor on the payroll, no class below zero, every
  score on 0–100. Never a number the owner could tune.
- **Fuzz** (`sim/harness/fuzz.ts`): random but legal play over the moves and
  the rest of what a player can send, some of which the game refuses.
  `test/fuzz.test.ts` (fast) plays four foundings six years each through the
  cloning reducer, checks the rules every week and a save round trip each
  year; a random college stalls before it has a lab or a team, so
  `test/fuzz-late.test.ts` (slow) fuzzes three years from the
  Completionist's college at years 12 and 30.

- **The guided player** (`sim/harness/guided.ts`, Plan 58): does what the
  game tells it. Each week it carries out the toolbar's line — its
  `intent`, the same reading as the words (`systems/guidance/intent.ts`) —
  and otherwise plays with plain sense: it saves for what the line asks
  when the cash does not cover it, fixes any satisfaction attribute under
  25 even while saving, keeps a reserve of eight weeks' expenses for its
  own spending, takes on nothing recurring while the week runs at a loss,
  and prices the summer at what its standing tolerates (the admissions
  screen's "fair"). `test/guided.test.ts` (slow) checks three fifty-year
  runs for the rules, no stuck interrupt, and every letter delivered with
  its ask done. `npm run guided` measures five runs: when the letters' asks
  are done, when each school is founded, when Founders Hall empties, the
  rank and the body, and how often the line asked for something the player
  could not do.

- **The archetypes** (`sim/harness/archetypes.ts`, Plan 63): four ways to
  run a college, each a policy over the moves and the guided player's plain
  sense. **Completionist** builds and develops everything it can afford,
  fields every team and keeps its labs busy, on a thin reserve; **Selective**
  stays narrow — twelve programs at most, its own schools' offers first —
  prices over the market and admits fewer, on a deep reserve; **Lean**
  spends only while the week's net is in the black and builds only for a
  real shortfall; **Idle** does nothing. `test/archetypes.test.ts` (slow)
  plays each fifty years on two seeds and checks only what must hold: no
  stuck interrupt, the rules every quarter, *stall, don't die* (solvent or
  climbing out at the end); that the Completionist finishes above the Idle
  college; and that a college broken into crisis at year 15 climbs out under
  the guided player.
- **The natural player** (`sim/harness/natural.ts`, Plan 65): the line of
  play the owner thinks a new player falls into, spending cash to zero —
  fix any satisfaction attribute under 100 a building would raise; found
  every program on offer (market hires only, never a posted search), the
  next hall when slots run out, deeper courses meanwhile, the building a
  course waits on; sort the schools at seven halls; accept every varsity
  petition, build its venue and fill its chairs; fund every lab's deepest
  initiative that leaves no course dark; build everything else the menu
  offers; price just short of the red tier and approve every club.
  `test/archetypes.test.ts` plays it fifty years and checks the rules hold
  and every school is founded. `npm run natural` writes one run as a
  markdown report (`-- --seed N`, `-- --out file.md`): every year's
  enrollment, applicants, net, programs, prestige and satisfaction; what was
  built and why, and what never was; research grants against what the
  initiatives cost; the Final Report's mark
  (`docs/reviews/2026-09-natural-play.md` is seed 12345).
- **The report** (`sim/report.ts`, `npm run sim`): the archetypes and the
  guided player, fifty years on three seeds, the median at years 10, 25 and
  50 of rank, prestige, students, cash, satisfaction, courses, schools and
  teams, with weeks in the red and the lowest cash — each with its change
  from the committed baseline, `sim/baseline.json`. `npm run sim -- --save`
  writes a new baseline; a PR that moves the numbers on purpose commits it,
  so main's baseline is main's numbers. Measures, never fails.

## When you add something

- **A new interrupt** → add its case to `defaultAnswers.ts`, or every
  fast-forward will dismiss it unread and the feature will never appear in a
  measured run.
- **A change that moves the numbers on purpose** → `npm run sim -- --save`
  and commit `sim/baseline.json`, so the next report diffs against it.
- **A new prestige input** → it appears in the Standing panel by itself. Give
  it a `detail` line that says what the score actually read.
- **A term that should be measured before it counts** → a `StandingReading`
  in `prestigeReadings`, with the weight the plan proposes for it, so the
  panel can say what it would be worth. Promote it to an input in the PR
  that makes it count, and drop the reading in the same PR.
- **A new playtest shortcut** → a `DEBUG_*` action in the one block, and a
  control in the one panel.
