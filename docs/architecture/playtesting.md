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
| To know whether a change moved a trajectory | `npm run sim`'s scorecard |
| To know when things happen for the first time | `npm run milestones` |
| To know how a run finishes — its legacy, its ambitions, its rank curve | `npm run endpoint` |

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
npm run scenario -- --strategy "Balanced builder" --year 12 --modal milestone
npm run scenario -- --strategy Completionist --year 22 --vernacular gothic \
  --name Blackmoor --clear-modal /tmp/gothic.json   # a campus to photograph
```

A scenario is a **recipe, never a file**: a strategy, a year, an optional
stopping point and, since Plan 15's PR G, an optional `mutate` step that
breaks the school after the run (the `crisis` scenario stands a balanced
school up at year 15 and puts it in the hole — satisfaction 35, a body half
again too big, cash gone — the state `test/balance-regression.test.ts` hands
back to the Balanced builder to prove recovery is possible), in
`tools/scenarios.ts`. `npm run scenario` plays the real
reducer forward and writes a real save (`persistence.ts`'s `SavePayload` at
the current `SAVE_VERSION`), so nothing generated is committed and nothing
needs migrating. A committed save would be a few hundred KiB and stale the
next time the save shape moved; a recipe survives it.

Flags: `--strategy` `--year` `--modal` `--seed` `--vernacular` `--name`
`--clear-modal` `--list`. A positional argument ending in `.json` is the
output path; anything else is a scenario name. The default output is
`node_modules/.tmp/<name>.json`.

**Stopping inside a year** is what `play()`'s optional `stopWhen(s)` predicate
is for (`sim/balanceSim.ts`). It is checked at the top of a week and *before*
the scripted player answers anything, so a run halted that way hands back a
state with its modal still pending — which is the only way to reach "the week
a championship modal is on screen", a state no year boundary ever lands on. A
scenario that asks to stop somewhere and never gets there **fails and writes
nothing**, rather than quietly handing back year 40.

Load a scenario with the debug panel's **Load** button (it is offered on the
startup screen too, which is where a browser with no save starts), or hand it
to `npm run shot` for a screenshot — through `npm run layout` first if the
picture is the point, since the scripted player sites every building along
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
  the U.S. News report as a modal of its own (in play it is the summer's
  Standing beat; this is the way to look at the table without waiting for a
  summer). An event whose context cannot be rolled against this state is
  refused rather than shown empty.
- **Load** — a save from `npm run scenario`.

### The two rules

**Every playtest action goes through the reducer**, as a `DEBUG_*` action.
They live in one block in `src/state/actions.ts` and one in
`src/engine/reducer.ts`, and the panel is the only component that dispatches
any of them. The reducer stays the one interpreter of every action; what
makes these playtest-only is the *gate*, not a back door. `sim/balanceSim.ts`
never dispatches one — a trajectory the sim measures has to be one a player
could have produced.

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
and **both** fast-forwards ask it: the balance harness and the panel's Jump.
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
saturated, crowded — the interesting cases are where the clamps bite);
`test/balance-regression.test.ts` asserts it on the real year-20 state of
every strategy.

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

## The sim, and the scorecard

```sh
npm run sim                              # 40 years, every 2nd year, all strategies
npm run sim -- 60 5                      # 60 years, every 5th year
npm run sim -- 40 2 earnest              # only strategies matching "earnest"
SIM_SEED=4242 npm run sim                # a different stream
npm run sim -- --write-reference         # re-record the bands from this run
npm run sim -- --save last.json          # keep this run's sampled rows
npm run sim -- --compare last.json       # print what moved against them
npm run milestones -- 40 earnest         # when each thing happened for the first time
npm run endpoint -- selective            # how a run finishes at fifty, on the reference's three seeds
```

`sim/reference.ts` holds two kinds of band, read at years 5, 10, 20, 35 and
50 — the early pinch, the build-out, the review's horizon, the end of
build-out, the endpoint — for cash, enrolment, prestige, rank, net margin as
a share of opex, and weeks in the red. **`TARGETS`** are hand-written: Plan
15 §6's table for the Balanced builder and the plan's own sentences for the
two controls (the Idle school falls; the Overbuilder is underwater by year 5),
the design decision recorded as data, with the fitted game's deviations noted
above them. **`REFERENCE`** is generated: where every other strategy *is*, as
the envelope of three seeds (the default plus `REFERENCE_EXTRA_SEEDS`) at ±25%
with an absolute floor, written by `npm run sim -- --write-reference` — a
band fitted to one seed is a claim about that seed. Every table printed by
`npm run sim` is followed by its scorecard: one line per figure outside its
band.

`test/balance-scorecard.test.ts` plays every strategy on the default seed at
the full fifty-year horizon and **fails** on any figure outside its band
(Plan 15's PR G flipped it; Plan 09 wrote it to report). A failure is a
regression, or a re-fit that has not re-recorded the reference. When a
change moves a trajectory on purpose, re-run `--write-reference` and commit
the envelope — and if it moves a target, edit the target and say why in the
comment above it.

### Reading a strategy's run

Four columns say what the year contained for the *player* rather than for
the school: **actions** (discretionary dispatches that year), **idle weeks**
(nothing startable at all), **money-blocked weeks** (something startable,
nothing affordable) and **faculty-blocked weeks** (`fblk`: nothing startable
*only* because no department had a free slot for it — an available course or
a program on offer whose field has nobody to teach it, which is what a search
is for). Under the table, `modals answered` counts every interrupt by type,
and `what a year contained` reports the averages against the last decade's —
because the finding these exist to measure is about the *shape* of a run,
not its mean.

A note on what they show: idle weeks used to be always zero — with 421
courses there was always something startable. Since Plan 14 a run can
genuinely have nothing to do: three programs on offer and no slot to put
them in is an idle week, and a department nobody can hire into is a
faculty-blocked one.

### The strategies

Most of the strategies in `STRATEGIES` are **archetypes** — crude, reproducible
corners of the space (build everything, price low, overreach, sit still).
**Earnest completionist** is a *player*: the September 2026 review's
own policy, written down. It is the run the design plans are about, and at
the review's own seed (4242) it reproduces that appendix closely. Since Plan
17 it has two companions that are players too, written so that "build
everything" is one good run among several rather than the answer: the
**Selective college** — the admit rate never past 15% and pulled down to hold
the body near four thousand, priced at what its standing tolerates, two or
three schools founded and finished rather than seven (`Strategy.maxSchools`),
every facility, every idle lab running the deepest project it can afford —
and the **Regional engine** — cheap, admitting three quarters of what applies,
founding whatever is offered, its labs ticking over on the cheapest project
only (`Strategy.research: 'shallow'`). The two, the earnest completionist and
the balanced builder are the four archetypes Plan 17's balance target names.

### The endpoint

`test/endpoint.test.ts` plays those four at the full fifty years on the
reference's three seeds and asserts how each **finishes** — the sealed legacy
(`tally.legacy`, exactly what the fiftieth summer's final report showed), the
ambitions reached, the catalogue and the campus, the rank curve. The
assertions are Plan 17 §E's; where the fitted game landed beside them is in
that PR's *as implemented* note. `npm run endpoint` prints the same readings
(`sim/endpointReading.ts` is shared by both) without judging them, which is
where a tuning pass starts.

Since Plan 15 the harness knows two things about the game it did not need
to before. **Seats before beds:** the freshman class is capped by the
catalogue's seats, so a prudent strategy founds programs and sites halls
while seats are the binding constraint, and saves for those rather than for
a dorm; the two spend-to-the-wire archetypes keep overreaching on beds. And
**halls stay pure** for every policy but the scatterer, because a hall of
one school is what founds it and concentration is thirty points of standing
— which means a hall is sited whenever none of the three offers fits the
slots there are. `play()` also takes a `from` state, so a run can continue
where another left off; the recovery assertion is built on it.

## When you add something

- **A new interrupt** → add its case to `defaultAnswers.ts`, or every
  fast-forward will dismiss it unread and the feature will never appear in a
  measured run.
- **A new strategy** → re-run `npm run sim -- --write-reference`, or the
  scorecard will report it as unmeasured.
- **A new prestige input** → it appears in the Standing panel by itself. Give
  it a `detail` line that says what the score actually read.
- **A term that should be measured before it counts** → a `StandingReading`
  in `prestigeReadings`, with the weight the plan proposes for it, so the
  panel can say what it would be worth. Promote it to an input in the PR
  that makes it count, and drop the reading in the same PR.
- **A new playtest shortcut** → a `DEBUG_*` action in the one block, and a
  control in the one panel.
