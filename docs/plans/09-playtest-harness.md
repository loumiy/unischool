# Plan 09 — The playtest harness

*Planning document only — no gameplay code is changed by this file. Its job is
to take the first item of the roadmap in
[`docs/reviews/2026-09-design-review.md`](../reviews/2026-09-design-review.md)
— the instrumentation and shortcuts every later plan will be measured with —
and turn it into an ordered sequence of PRs, each small enough to land on its
own and each landing in the order that makes the next one cheaper.*

**Status: Landed.** All six PRs shipped. Where the implementation departed from the plan — the championship scenario moving from PR A to PR E, the jump looping inside the reducer, the scorecard's band floors, the seed the earnest completionist reproduces the review at — it is recorded in an **As implemented** note on the PR it belongs to.

---

## 0. Why this comes before the design changes

Plans 10 through 13 change the economy, the prestige model, the curriculum's
shape and the arc of a run. Every one of them is a claim about a trajectory,
and today a trajectory can be checked three ways: by reading `npm run sim`'s
table by eye, by naming a school "test" and fast-forwarding through a run from
week one, or by writing a one-off script the way the September review did. None
of those tells the next PR whether it made the game better.

Three things are missing, and they are cheap next to what they enable:

1. **A way to stand the game up at any point in a run**, in the browser, in
   seconds — year 8 with a balanced school, year 30 with a rich one, the week a
   championship modal is pending — without playing there. The review dumped
   these saves by hand from a script; the game should be able to make them.
2. **A way to see and change the simulation's state while looking at it.** The
   "test" name gates a sandbox speed and a cash grant. A tuning pass needs to
   set prestige, set satisfaction, force an event, jump five years, and above
   all *see the prestige inputs* — which no screen shows today, to a player or
   to the developer.
3. **A scorecard the sim can be held to.** `test/balance-regression.test.ts`
   pins no numbers; every assertion is a sign or an inequality. The review
   found the Balanced builder — the intended line of play — ending year 20
   overdrawn on the default seed, and enrollment of 70,000 on 9,000 beds, and
   nothing in the suite objected to either. Plan 10 is a rebalance; it needs
   reference bands to rebalance *toward*.

The prestige breakdown (PR C) is the one piece of this plan that is a player
feature rather than a developer one. It is here because the developer needs it
first and because the review's recommendation C5 says the player needs it
anyway; building it once, read off the same function the tick uses, serves
both.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 09A | Scenarios: `npm run scenario` builds a save at any year under any strategy, optionally with a named modal pending; a scenario index of the dozen states a playtest keeps returning to | — |
| 09B | The debug panel: gated by a flag rather than the school's name; set cash / prestige / satisfaction, jump years, force an event or an interrupt, load a scenario file | A (for the load) |
| 09C | The prestige breakdown, as a pure reading and as a panel on the History tab | — |
| 09D | The sim scorecard: reference bands per strategy per year, an in-band / out-of-band report, and run-to-run comparison | — |
| 09E | The "earnest completionist" strategy, and the review's per-year action / idle / modal counts as sim columns | D |
| 09F | `docs/architecture/playtesting.md`, and the README's "Development" section pointing at it | A–E |

A, C and D are independent and can land in any order. B needs A's file format
for its load button; E needs D's columns to have somewhere to go.

---

## Open questions, settled before the first PR

**How is playtest mode gated?** Today: the school is named "test"
(`StatusHeader.tsx`'s `isTestUniversity`). That works, and it has a real
drawback — a scenario save carries a name, so every scenario has to be renamed
to "test" to be usable, which the review's scripts did by hand. The gate
becomes **a flag, checked in one place**: `?debug=1` on the URL, or the
`unischool.debug` key in `localStorage`, read once at boot into a module-level
`playtestEnabled()` that `StatusHeader.tsx`, the new panel and the sandbox
speed all consult. Naming a school "test" keeps working as a third way to set
the same flag, so nothing a developer does today stops working.

**Do playtest actions go through the reducer?** Yes, the way the cash grant
already does (`reducer.ts` line 855). The reducer stays the one interpreter of
every action; the panel is UI that dispatches. What changes is that they are
grouped into one `DEBUG_*` block with one comment, and none is reachable from
any non-playtest surface. `sim/balanceSim.ts` never dispatches one.

**Is the scorecard a test?** Not a failing one, yet. Reference bands are a
statement of intent about a game whose economy Plan 10 is about to change, so
a hard assertion would be red from the day it lands until Plan 10 finishes.
PR D prints the scorecard from `npm run sim` and adds a test that **reports**
out-of-band figures without failing. Plan 10's last PR turns it into a real
gate, once the bands describe the game that exists.

**Where do scenarios live?** `tools/scenarios/` as generated JSON is the wrong
answer — a 300 KiB save per scenario, regenerated whenever the save shape
changes. Scenarios are **recipes**, not files: a strategy, a year, an optional
modal to arrive at, and an optional list of overrides, in
`tools/scenarios.ts`. `npm run scenario -- <name>` builds the save on demand
through the reducer, exactly as `tools/makeSave.ts` does today.

---

## PR 09A — Scenarios

**What.** Generalise `tools/makeSave.ts` into `tools/scenario.ts`:

```
npm run scenario -- <name> [out.json]
npm run scenario -- --strategy "Balanced builder" --year 12 [--modal milestone] [--vernacular gothic] [--seed 7]
npm run scenario -- --list
```

- `play()` in `sim/balanceSim.ts` grows one optional argument, a `stopWhen(s)`
  predicate; when it returns true the run halts *with the pending interrupt
  intact* and hands the state back. That is how a scenario arrives at "the
  week a championship modal is pending" rather than at a year boundary.
  Today's callers pass nothing and are unaffected.
- The scenario index in `tools/scenarios.ts` names the states a playtest
  keeps returning to. The first dozen: `founding`, `year-3-first-hall`,
  `year-8-balanced`, `year-8-discount`, `year-15-completionist`,
  `year-25-rich`, `year-40-done`, `first-milestone`, `rankings-entry`,
  `annual-report`, `championship`, `athletic-director`, `research-report`,
  `demand`. Each is a strategy, a year, and an optional `stopWhen`.
- The written save is a real save (`SAVE_VERSION`, `persistence.ts`'s shape)
  with `self.name` left as the strategy's, not renamed — PR B's flag is what
  makes it playable with the shortcuts on.

**Why first.** Every later PR in this plan and every PR in Plan 10 is checked
by standing the game up somewhere specific and looking. This is the thing
that stands it up.

**Verify.** `npm run scenario -- --list` prints the index; `npm run scenario
-- championship` writes a save whose `pendingInterrupt.type` is
`championship`; `npm run shot` still works on its output.

**As implemented:** the index ships fifteen names — the fourteen above, less
`championship`, plus `admissions` (a summer that has a prior year to be read
against) and `decision-event`. `championship` could not be built. **No strategy in
`STRATEGIES` has ever won a national title** — measured across all six over
forty years, zero, including the Completionist, which finishes every venue
and fields all ten teams. None of them hires a coach, and `teamQuality` is
what seeds a bracket (`systems/athletics/playoffs.ts`), so none of them ever
reaches its sport's strongest eight. The recipe arrives with PR E's earnest
completionist, the first strategy that plays the coaching market. The
verification above is therefore PR E's, not PR A's — and it passes there:
`npm run scenario -- championship` writes a save whose `pendingInterrupt.type`
is `championship`, and it opens in the browser on the real modal.

`tools/makeSave.ts` is *replaced* rather than generalised beside: it was this
tool with the strategy, the school's name and the modal-clearing all
hardcoded, so it became three flags (`--strategy`, `--name`, `--clear-modal`)
and the `shot:save` script went with it. `tools/README.md` carries the new
command. `play()` also returns its final `state` now — `makeSave` used to
recover it through `onWeek`, which a run halted by `stopWhen` cannot do,
since it stops *between* weeks. And `tsconfig.sim.json` now includes `tools`,
so the scripts in it are typechecked by `npm run build` the way `sim/` is.

## PR 09B — The debug panel

**What.** A floating panel, below the main-menu hamburger, present only when
`playtestEnabled()`:

- **Read:** the clock, cash, net, enrolled/beds, prestige today and the
  target, the five satisfaction attributes, the count of pending petitions and
  queued milestones, and which interrupt (if any) is pending. One column of
  monospace pairs; it is a developer's panel and does not need the parchment.
- **Set:** cash, prestige, satisfaction, listed tuition — each a number field
  and an Apply. `DEBUG_SET_CASH`, `DEBUG_SET_PRESTIGE`,
  `DEBUG_SET_SATISFACTION`, `DEBUG_SET_TUITION` — the existing grant action
  is folded into the first.
- **Jump:** advance N weeks or N years. This is TICKs dispatched in a loop
  from the panel, with interrupts **auto-resolved with the sim's default
  answers** (`balanceSim.ts`'s interrupt branch, extracted into a shared
  `resolveWithDefaults(s)` so the panel and the harness answer a modal the
  same way). A checkbox turns auto-resolve off, so a jump stops at the first
  modal instead.
- **Force:** a decision event by id (a `<select>` over `DECISION_EVENTS`,
  bypassing eligibility and cooldown — the payload is rolled as it would be
  at fire time), a student demand for a chosen attribute, the next milestone
  in the queue, the annual report.
- **Load:** a file input that reads a save written by 09A into
  `localStorage` and reloads. The one thing that stops a playtest needing
  devtools.

The "+$1B" button and the sandbox speed move behind the same flag and out of
`StatusHeader.tsx`'s conditional; the name-based gate becomes one of three
ways to set the flag (see the open question above).

**Verify.** With `?debug=1` the panel appears on a school named anything;
without it, nothing in the DOM mentions debug, the speed row has three
buttons, and `npm run build` contains no `DEBUG_` string in the served
bundle's visible UI. Force each of the fifteen events in turn and resolve
each; jump 20 years on `founding` with auto-resolve and compare the toolbar to
the sim's Balanced row for year 20.

**As implemented:** verified in a headless browser — the panel is absent
without the flag and present with it, all fifteen scenario saves load
through the file input, and fourteen of the fifteen authored events fire and
resolve from the Force row. The fifteenth, `varsity-petition`, is *refused*,
correctly: its own `rollContext` returns null when no sport club is left to
petition, and forcing bypasses eligibility, not possibility.

Three departures.

**The jump loops inside the reducer**, as a `DEBUG_JUMP` action, rather than
being TICKs dispatched from the panel. The panel cannot see the state
between two of its own dispatches, so it cannot notice a modal came up on
week 37 and answer it — auto-resolve is impossible from outside the
reducer. This is the shape `DEVELOP_ALL_AVAILABLE_COURSES` already has: a
loop over ordinary primitives, inside the reducer, taking no shortcut the
single step does not take. It also costs one render instead of a thousand.
A twenty-year jump takes about half a minute, and the UI is frozen for it.

**The plan's year-20 comparison does not hold, and should not.** A jump has
no *player*: nobody develops a course, sites a dorm or hires anybody, so
twenty years from `founding` ends at 455 students and prestige 38 — the idle
trajectory, not the Balanced builder's 33,000 and 87. The panel and the
harness answer *modals* identically because they call the same
`defaultAnswer` (that is what the shared module is for); they differ in
everything a strategy does, which is everything else. Reaching year 20 of a
school somebody played is what `npm run scenario` is for.

**The panel sits top LEFT**, not under the hamburger: that corner already
stacks the main menu over the map's zoom/'?' pill, and a third thing in it
pushes the map controls off a short viewport. It also renders on the
*startup screen*, with Load as its only section — a browser with no save is
exactly where somebody opening a scenario file starts from, and requiring
them to found a throwaway school first would be the devtools detour this
button exists to remove.

Two things came along because the block needed them: the balance harness's
own interrupt answers moved into `src/engine/defaultAnswers.ts` (`npm run
sim` prints an identical table across the move), and `DEBUG_SET_PRESTIGE`
writes through a new `setPrestigeForPlaytest` in `prestigeSystem.ts` rather
than touching `s.self.reputation` in the reducer — `invariants.test.ts`
section 5 confines every writer of that field to three files, and that
invariant is worth more than handling the write where the action is
handled.

## PR 09C — The prestige breakdown

**What.** Two halves, and the first is the one that matters.

*The reading.* `prestigeSystem.ts` gains `prestigeBreakdown(s)`: an object
with one entry per input — its raw score (0..1), its weight, its contribution,
and for the two multiplied inputs the multiplier and what it is worth — plus
the baseline, the target, today's stock and the drift rate. **`computePrestigeTarget`
becomes a sum over that object**, so the panel cannot disagree with the tick;
that is the same discipline `attributeDetail` and the satisfaction dials
follow. `test/invariants.test.ts` gets one line: the sum of the breakdown's
contributions equals the target for the sim's year-20 states.

*The panel.* A **Standing** section at the top of the History tab: six rows,
one per input, each a bar of contribution against the weight it could reach,
the two multipliers named on the rows they touch ("× 0.62 library adequacy —
3,700 seats for 40,000 students"), the target against today, and the
research and campus-life standings beside it with *their* inputs, read the
same way from `computeResearchTarget` and `computeSocialTarget`.

Plan 10 will change the inputs and how the stock moves. The panel is written
so that it renders whatever the breakdown contains — rows are data — and the
review's C5 is satisfied by the reading, not by the row set.

**Verify.** The History tab on `year-15-completionist` shows a breadth row
worth roughly three-quarters of its 90 and a campus-life row worth under 2 of
its 12, which is what the review measured by hand.

**As implemented:** built as specified, and the measurement is half right.
On `year-15-completionist` (seed 12345) campus life reads **+0.6 of 12**, as
predicted. Breadth reads **+35.9 of 90**, not three-quarters — the review's
figure came off its own seed-4242 earnest run, which had far more programs
distinguished by year 15 than the scripted Completionist does. The panel is
right; the expectation was measured on a different school.

All three standings get a breakdown, not just the academic one, and the
three target functions are now sums over them. `test/invariants.test.ts`
asserts the identity structurally on three hand-built states (founding,
saturated, crowded — the interesting cases are the clamped ones);
`test/balance-regression.test.ts` asserts it on the real year-20 state of
every strategy, which is the "sim's year-20 states" the plan asked for and
which invariants cannot reach without importing the harness.

**A finding, flagged not fixed.** Writing the breakdown surfaced a unit
mismatch in `researchBreadthScore`: it divides equipped **fields** by the
count of research **schools**, and a school teaches several fields. At year
15 a completionist campus reads 29 equipped fields against 8 schools, so
that 40-weight term has been pinned at its maximum since about the fourth
lab. Plan 09 changes no constant the model reads, so this is recorded in
`prestigeSystem.ts` beside the code and left for whichever plan next opens
the research model. The panel states both numbers rather than printing
"29 of 8", which would read as a panel bug rather than the finding it is.

`docs/design/progression.md` gains the panel, and its direct-mutation audit
now names PR B's `setPrestigeForPlaytest` — which was PR B's omission,
corrected here.

## PR 09D — The sim scorecard

**What.**

- `sim/reference.ts`: for each strategy the harness runs, bands for cash,
  enrolled, prestige, net-margin-as-share-of-opex and weeks-in-the-red at years
  5, 10, 20, 30 and 40. The first version of every band is **the current run
  ±25%**, generated by a `--write-reference` flag and committed — a statement
  of where the game *is*, so that Plan 10 can see what it moved. The bands
  become a statement of where the game *should be* when Plan 10 edits them,
  and that edit is the plan's design decision recorded as data.
- `npm run sim` prints, after each strategy's table, one line per out-of-band
  figure: `year 20 enrolled 42,000 (band 8,000–14,000) HIGH`.
- `npm run sim -- --compare last.json` diffs against a saved run's rows and
  prints what moved by more than 5%, so a PR summary can quote "what the sim
  said" as a diff rather than as a table pasted twice.
- `test/balance-scorecard.test.ts`: runs the default seed, prints the
  out-of-band list, **passes regardless**. The comment says which plan turns
  it into a gate.

**Verify.** `--write-reference` then `npm run sim` reports nothing out of
band; edit one band and it reports that one.

**As implemented:** verified exactly — after `--write-reference` every
strategy reads "every sampled figure inside its band", and narrowing the
Balanced builder's year-20 enrolment band by hand produces the one line the
plan wrote: `year 20 enrolled 33k (band 8k–14k) HIGH`.

`--compare` needs something to compare against, so `--save last.json` came
with it: the sim writes its sampled rows, and a later run diffs against
them. (Run at a different seed, the diff is the non-monotonicity
`balanceSim.ts` has always warned about, printed line by line.)

Two things the plan did not settle, decided here and written into
`reference.ts` beside the code:

- **Bands need a floor as well as a percentage.** ±25% of "0 weeks in the
  red" is `[0, 0]`, which would report every run that has one bad week. Each
  metric gets a minimum half-width — a million dollars, a hundred students,
  two prestige points, five points of margin, ten weeks — and the two
  metrics that cannot go negative have their low end held at zero.
- **One tolerance suits some metrics better than others.** Cash and
  enrolment span orders of magnitude over a run, so ±25% is tight on them;
  prestige lives on a bounded 5..150 scale, so the same 25% is ±13 points at
  year 5 — wide enough to pass a trajectory a tuning pass would call
  different. Per-metric tolerances are a decision about what "the same run"
  means for each figure, and it belongs to Plan 10, which is the plan that
  has to answer it.

`test/balance-scorecard.test.ts` is in `npm test` and names Plan 10's last
PR as the place its `REPORT_ONLY` flag flips.

## PR 09E — The earnest completionist, and what a year contains

**What.**

- A seventh strategy in `STRATEGIES`: the review's policy. Price at 90% of
  tolerance; admit `clamp(1.35 − prestige/100, 0.08, 0.65)`; develop
  cheapest-tier-first with a four-week-opex buffer; every facility rung when
  its attribute is under 80; beds at 35% of enrolled; deepest affordable
  research in every idle lab without gutting a department; every petition
  granted, every chair filled, budget high once flush; campaigns with
  surplus. It is the first strategy that plays the admit slider and the
  coaching market, and it is the one a human completionist most resembles.
- Three columns on `Row` and the printed table: **actions** (discretionary
  dispatches that year), **idle weeks** (weeks with nothing startable at
  all), **money-blocked weeks** (something startable, nothing affordable), and
  a modal count by type in the tally. These are the review's "what did the
  player have to do" measurements, and Plans 12 and 13 are checked against
  them: the review's run averaged 25 actions a year and fell to 4–14 after
  year 22.
- `sim/milestones.ts` grows the review's firsts list (first hall, first lab,
  rankings entry, first varsity team, first title, all courses, everything
  built) so a pacing change reads as "rank #1 moved from year 18 to year 31".

**Verify.** The new strategy reproduces the review's Appendix A within seed
noise: rank #1 before year 25, all 421 courses before year 25, 0 weeks in the
red. Those numbers are the *problem*; PR D's bands record them so Plan 10 can
move them.

**As implemented:** it reproduces Appendix A, and the honest way to say so is
to name the seed. **At seed 4242, the review's own**, the run lands on top of
it: rank #1 at year 21.2, all 421 courses at 24.2, **0 weeks in the red** with
a minimum cash of $230k against the review's $325k, and at year 40 73,000
enrolled (review 72,908), prestige 146.9 (148) and tuition $37,000 ($37.0k).
The firsts line up too — rankings entry 7.75 (7.5), varsity team 8.77 (8.8),
the AD 8.79 (8.8), prestige 100 at 17.1 (16.6), the first campaign 25.5
(24.7).

**At the default seed 12345 it is a rougher run**: 144 weeks in the red,
a trough of -$5.4M, and the catalogue finishing in the last decade rather
than the third. That is the non-monotonicity `balanceSim.ts` has warned about
since Plan 08 — a threshold economy where a few weeks' difference in when a
dorm goes up compounds over forty years — and it is worth leaving visible
rather than tuning away: "the earnest player never has a bad week" is a claim
about a seed, and one seed away it is already false.

**The coaching market is the strategy's real discovery.** PR A recorded that
no strategy had ever won a national title; this one wins 15 at the default
seed and 36 at 4242, because it is the first to hire a coach. `championship`
joins the scenario index on the back of it, and the postseason, the
championship modal and the titles term in campus-life standing are in a
measured trajectory for the first time.

Two deviations of scope. The three columns are `actions`, `idleWeeks` and
`blockedWeeks` — the review's "actions / idle / money-blocked" — and the
modal count went into the tally as a **count by type** plus a printed
`modals answered` line, beside a `what a year contained` line that reports
actions per year against the LAST DECADE's average, because the review's
finding was about the shape (25 a year, falling to 4–14) rather than the
mean. The earnest completionist reads 23.1 actions a year over twenty, 8.3 in
the last ten: the same shape, measured rather than remembered. **Idle weeks
are always zero**, for every strategy — with 421 courses there is always
something startable — so what the review experienced as "nothing to do" shows
up here as money-blocked weeks and as the collapse in actions, never as an
empty board. That is worth knowing before Plan 12 tries to fix idleness.

`sim/milestones.ts` grew the firsts list as specified (twenty of them,
printed in the order they happen rather than the order they were declared),
with one correction: "first school hall" counts the first hall BUILT, since
General Studies stands on the founding campus and counting it would report
week 1 for every strategy.

## PR 09F — Documentation

`docs/architecture/playtesting.md`: the flag, the panel, the scenarios, the
scorecard, and the rule that playtest actions live in one reducer block and
are dispatched from one component. `README.md`'s "Development" section gains
a line pointing at it, and `docs/architecture/README.md`'s table a row.

---

## What this plan does not do

- It does not change a single constant the economy reads. Plan 10 does.
- It does not decide what the reference bands *should* be. It records what
  they are.
- It does not add a "skip to next event" or a 4× speed for players. Those are
  Plan 12; the sandbox speed stays a playtest control.
- It does not touch the save-migration chain. A scenario is built through the
  reducer at the current `SAVE_VERSION`, so it never needs migrating.
