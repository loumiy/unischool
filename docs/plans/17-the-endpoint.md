# Plan 17 — The endpoint

*Planning document only — no gameplay code is changed by this file. Its job is
to take the September review's finding that the run is over by year twenty of a
sandbox with no end — rank #1 in year 18, the last building in year 29, then two
decades of endowment campaigns — and turn the decision that followed it into an
ordered sequence of PRs: a fifty-year run with a sealed record, an ending that
legitimises more than one way to play, and a top of the table that has to be
held.*

**Status: Landed.** All seven PRs shipped, in order, each with an *as
implemented* note under its section. The largest departures: ambitions are
detected weekly rather than on the milestone pass; the trustee's response is
gated on the defend era, which the first measurement insisted on; the elite
band **does not leapfrog** — a chasing rival stops a point short of the
leader, and only a leader who falls is passed — because at the 150 cap the
plan's closing term left every archetype tied out of first place; and the
balance target came out as the plan said it might, with the findings in the
harness and the offer rule before the prestige model — the selective college
needed strays it never develops, a stable reading of its chosen schools, a
price over tolerance and restraint on the completionist's spending to be
*the finest college in the country*, and the regional engine needed the
founding price and no research at all to be *an engine of the region*. What
this plan did not reach is recorded under PR E: the completionist is first
in year 13, not after 30, which is Plan 15's pacing; the balanced builder is
a great school, not a sound one; the selective college's teaching is an A on
most seeds and a B on one. Depended on [Plan 15](15-growth-has-a-cost.md)
for a prestige that can fall and on [Plan 16](16-the-year.md) for the summer
the final report rides in. Supersedes [Plan 13](13-the-endpoint.md).

---

## 0. Fifty years, and the shape of them

"No win condition" was borrowed from a city builder, and a campus is not a city.
A city can sprawl for centuries; a university's arc is a human lifetime — a
founder's career, a generation of faculty, the first class returning for its
fiftieth reunion. Fifty years is the length of that story, and it is also, not
by coincidence, the length at which the review's completionist run had been idle
for two decades.

So the run gets a **semicentennial**: the fiftieth summer files a final report,
the record is sealed, and the game goes on as a sandbox for anyone who wants it
to.

**And the fifty years have three eras**, which is the thing this plan exists to
make true. [Plan 15](15-growth-has-a-cost.md)'s re-fit targets build-out ending
around **year 35**, not 50:

| Era | Years | What the player is doing |
|---|---|---|
| **Found** | 1–12 | The core, the first halls, the first schools. Money is tight, faculty is scarce, every slot is a commitment. |
| **Build** | 12–35 | The catalogue and the campus get made. Completing every school is *barely* possible in this window. |
| **Defend** | 35–50 | Little left to build, and the field closes on you. |

The defend era is the new risk and the new opportunity. The review's complaint
was twenty years of nothing; fifteen years of *holding* is only better if
holding is an activity. It is an activity for exactly one reason: Plan 15 made
prestige a number that can fall. PR D is what makes something push it down.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 17A | Ambitions: a record of named achievements with the year each was reached; a History checklist | — |
| 17B | The legacy model: six graded axes and a name, read off state at any moment | A |
| 17C | The semicentennial: the final report as the fiftieth summer's first beat; the sealed record; play continues | B, Plan 16A |
| 17D | The top has to be held: the elite band closes on the leader, and a rival that passes you says so | Plan 15B |
| 17E | The balance target: four archetypes finish, and completionism is one good run among them | B, D, Plan 15G |
| 17F | Founding and the History tab frame the fifty years | C |
| 17G | Docs | all |

---

## Open questions, settled before the first PR

**Does the game stop at fifty?** No. The report is filed, the legacy is sealed
into the record, and the clock keeps running. Nothing after year 50 changes the
legacy — the History tab shows it as "the record, sealed in the fiftieth year" —
but a player who wants to see the hospital finished can.

**Is there a score?** Six grades and a name, not a number. A single number
invites optimising one thing; six grades let a run be an A in research and a C
in campus life and be *called* something for it.

**Do the ambitions gate anything?** No. They are a record, like milestones
without the prestige. The review's H1 asked for objectives and consequences to
be clear; ambitions are the objectives, the legacy is the consequence.

**Does the defend era need new content to be interesting?** This plan bets that
it does not — that a closing field, a prestige that falls when the school coasts,
and a legacy still being graded are enough to make years 35–50 about holding
what you built. That bet is testable and PR E is where it is tested. If the
scorecard says a well-run school at year 40 has nothing to do and cannot lose,
that is a finding for the next plan, not a reason to invent a late-game system
here.

---

## PR 17A — Ambitions

- `s.ambitions: Record<AmbitionId, number>` — the year reached, written once,
  never revoked. Detected in `tickTech`'s milestone pass and at the summer
  boundary, by the shape `checkMilestones` already uses.
- The first set, authored in `data/ambitionsData.ts` with a name, a line and a
  detector: *A hall of your own* (the first academic hall beyond Founders) ·
  *A school founded* · *Every school founded* · *In the top fifty* · *In the top
  ten* · *First in the nation* · *A distinguished program* · *A distinguished
  school* · *A university* (the charter) · *A laboratory* · *A landmark program
  concluded* · *A prize* · *A professional school* · *A national title* · *A
  title in every sport fielded* · *Ten thousand students* · *Never in the red*
  (checked at year 50 only) · *A billion in the endowment* · *The whole
  catalogue* · *Fifty years*.
- The History tab gains an **Ambitions** panel: the list, greyed until reached,
  with the year. The log names each as it lands; none stops the clock — the
  milestone celebrations already cover the ones worth stopping for.

**As implemented:** detection is a weekly system (`tickAmbitions`, registered
after `tickRivals` so a rank is this week's) rather than a hook in the
milestone pass plus one at the summer boundary — half the list is about rank,
money, prizes and enrolment, which no milestone pass ever sees, and twenty
predicates over state the game already keeps cost nothing a week. The two
year-fifty ambitions read true on the one week the summer holds the clock on
year fifty, which is the week the final report renders. *Never in the red*
needed a record the game did not keep: `finance.weeksInTheRed`, counted by
`tickFinance` where cash settles, rather than a reading off fifty summer
snapshots that would miss a mid-year dip. The list is the plan's twenty;
"A landmark program concluded" excludes a cancelled one. Save version 63.

## PR 17B — The legacy

`legacy(s)`: six axes, each graded A–F from readings that already exist, and a
name chosen from the pattern of grades.

| Axis | Read from |
|---|---|
| Academic breadth | `curriculumBreadthScore`, plus the graduate share |
| Concentration | schools founded and distinguished — Plan 15's new prestige term, which is also the axis that tells a deep school from a wide one |
| Teaching | `campusAverageCourseQuality` and the share of A/B courses |
| Research | research credits, prizes, doctorates |
| Selectivity and reach | incoming quality, admit rate, applicant pool against prestige |
| Stewardship | years solvent, endowment per student, satisfaction's fifty-year average |

*(Campus life is deliberately **not** an axis. Plan 15 cut its prestige weight
because it cannot be earned — grading a run on it before athletics and student
life reach anything would grade every run the same. It becomes the seventh axis
in the plan that gives those systems an outlet.)*

Grades are banded against the reference bands Plan 15 sets: an A in breadth is
what the earnest completionist reaches at year 50; a C is what a balanced school
reaches. Names come from a small authored table keyed on the two strongest axes
and the weakest — *a great research university*, *the finest college in the
country*, *a place students never leave*, *an engine of the region*, *a school
that grew too fast* — and a dozen more. The name is flavour; the six grades are
the record.

**As implemented:** `state/legacy.ts`, a pure reading in the shape of
`yearInReview.ts`; the `Legacy` type lives in `types.ts` so PR C can store it.
Breadth, concentration and research read the standing's own functions
exactly (`curriculumBreadthScore`, `concentrationScore`, `researchScore`, the
last two newly exported), so the legacy cannot disagree with the prestige
model. Teaching is half the campus average on `courseQuality.ts`'s own floor
and ceiling, half the share of courses graded A or B. *Selectivity and reach*
is the **greater** of two readings rather than a blend — how selective the
school is (class quality and admit rate) or how far past its standing it
draws (the realised pool against the pool prestige alone would draw, off
`lastFunnel`) — because a selective college and a regional engine earn the
same axis two different ways. Stewardship is thirds: the share of weeks
solvent (PR A's counter), endowment per student against a reference a well-run
school reaches, and the students' average over every year on the books. The
bands are one table (`LEGACY_GRADE_BANDS`: A at 0.85, B 0.65, C 0.45, D 0.25)
and are what PR E fits. Twenty-one names in three tables — *great*, *sound*,
*troubled* — tested in that order with the troubled entries first, so a broad
school in the red is *a school that grew too fast* before it is anything
else; every one of the 5⁶ grade patterns finds a name, and `Legacy.table`
records which family it came from, which is what PR E asserts against.

## PR 17C — The semicentennial

- The fiftieth summer's first beat ([Plan 16](16-the-year.md)'s sequence) is the
  **final report** in place of the year in review: the six grades, the name, the
  ambitions reached with their years, the four numbers a founder would want
  (students taught in fifty years, faculty who served, prizes, titles), and the
  fifty-year curves from the History tab.
- `s.self.legacy` is written once, here. The History tab shows it sealed. Play
  continues; the sixtieth summer files an ordinary year in review.
- The sim's tally records the legacy so PR E can assert against it.

**As implemented:** the summer interrupt raised on year fifty carries a
`final` flag in its payload, so the modal and its width rule
(`modalLayout.ts`: the final report is a page) read it off the payload and a
save taken between beats still knows. The record is sealed at the top of
`RESOLVE_ADMISSIONS`, before the digest, the report card or the funnel touch
the school, so it is byte-for-byte the reading the beat displayed; the test
pins that identity. Two of the founder's four numbers needed a record the
game did not keep: `YearSnapshot.graduated` (the seniors each summer sends
out, so *students taught* is every class that left plus the body still here)
and `University.facultyServed` (counted at `appointFaculty`, the one door
onto the roster, seeded at the founding five). The History tab gains a
**Legacy** panel that shows the sealed record after year fifty and the same
reading taken live before it, labelled as what the school would be called
today, with a countdown to the report. `HistoryChart` was lifted out of the
tab into `components/HistoryChart.tsx` so the report draws the same curves.
The final report's fourth curve is rank rather than the catalogue: at fifty
the catalogue is a flat line for most runs and the rank is the story. Save
version 64.

## PR 17D — The top has to be held

This is the PR that makes the defend era an era.

- The elite band of rivals (`r6`–`r15`, authored 87–99) gains a term in its
  annual drift: a pull toward `max(own, player.reputation − 4)` at a rate that
  closes a ten-point gap in about five years. The player can still be first; the
  field arrives. Applied only above prestige 100, so the found and build eras
  are untouched.
- A rival that overtakes the player fires a **"passed"** line in the year in
  review and, once per rival, a decision event: a trustee proposes a response —
  a campaign, a chair, a facility — at a real cost.
- **Coasting has to be losable.** With Plan 15's asymmetric prestige, a school
  that stops maintaining welfare, lets crowding climb, or lets teaching quality
  decay will fall — and a closing field means falling now costs rank. That is
  the whole mechanism of the defend era, and it needs no new system.
- Deliberately no poaching here. That is the faculty-lifecycle plan, and it will
  read this drift when it comes.

**As implemented:** the term is `eliteClosingStep` in `rivalsSystem.ts` — a
pull of 0.35 of the distance to `player − 4` a year, applied to the ten
authored ids (`rivalData.ts`'s `ELITE_RIVAL_IDS`, r6–r15) on top of their
ordinary momentum and shock, only while the player is above 100, and only
ever upward on the rival — deterministic, so the field's one draw a year is
untouched. The "passed" line rides in the review's Standing section off the
same `passedBy` the Standing beat reads, so the two beats agree. The trustee's
response is a decision event (`'rival-passed'`) fired **directly** on the
first quiet week the shared cooldown allows, like the varsity petition, rather
than drawn — being passed is a moment — but it stamps `lastDecisionWeek`, so
it spends the ordinary budget rather than adding to it. Two paid responses
rather than the plan's three: an endowed chair (the visiting scholar's own
best-of-five roll, in a field the school already teaches) and a board
campaign into the endowment at a match the ordinary campaign never reaches;
"a facility" was dropped, because a building has to be sited and an event
cannot site one. Once per rival for the run, stamped at fire time on
`events.passedResponses`, so a dismissed modal never comes back for the same
school. It fires for any rival that passes, elite or not — but **only above
the same prestige gate the closing term uses**, which the plan did not say
and the first measurement insisted on: a mid-table school is passed by
somebody most years in a hundred-school field, so ungated the board asked
every year from year three, took the whole decision budget, and (through the
chair's candidate roll) moved the sim's dice for every strategy from year
five. Save version 65.

## PR 17E — The balance target

The scorecard gains a fiftieth-year row and four assertions the sim runs at 50
years, each across three seeds:

- The **earnest completionist** finishes 90–100% of the catalogue and every
  building, founds every school, reaches #1 after year 30, and holds it in at
  least half of years 40–50. Ambitions: all but one or two.
- The **balanced builder** ends with a B or better in four axes and a legacy
  name from the "sound" table.
- A new **selective college** strategy — admit rate ≤ 15%, no growth past 4,000,
  two or three schools founded and finished rather than seven, every facility,
  deep research — ends with an A in teaching, concentration and selectivity,
  prestige within 15 of the completionist, and a legacy of its own.
- A new **regional engine** strategy — cheap, broad, big, no research — ends with
  an A in reach, a C in research, solvent, and a legacy of its own.

**The selective college is the assertion that matters**, because it is the one
that fails if Plan 15's concentration term is not pulling its weight. Four
archetypes finishing differently is not something constants can be tuned into;
it is something the prestige model either permits or does not. If this
assertion cannot be met by tuning, the finding belongs back in the prestige
model, not in the bands.

Constants move in Plan 15's PR G and here until all four hold. This is the PR
that makes "build everything" one good run among several rather than the answer.

**As implemented:** `test/endpoint.test.ts` plays the four at fifty years on
the reference's three seeds and asserts off the **sealed legacy** the fiftieth
summer wrote (`tally.legacy`), through a reading shared with `npm run
endpoint` (`sim/endpointReading.ts`), so a tuning pass sees what the gate sees.
Five passes of fitting; what they found, in the order they found it:

- **The defend era was unwinnable.** The elite band closes to `player − 4`
  and then random-walks on its own momentum and shocks, and prestige is
  capped at 150 — so a school holding the cap was tied at it by two or three
  elite schools inside a decade and ranked behind them (the sort favours
  nobody). Every archetype held #1 in *zero* of years 40–50. Two changes:
  the gap is eight, and **the band does not leapfrog** — while the closing
  applies, a rival below the leader rises no closer than a point
  (`ELITE_NO_LEAPFROG_GAP`); only a leader who falls into the band is passed,
  which is exactly and only "coasting has to be losable". After it, every
  earnest, balanced and regional run holds #1 in 11 of 11 late years.
- **"Reaches #1 after year 30" is not what Plan 15 fitted.** The earnest
  completionist is first in year 13–14 and at the cap by 25; the balanced
  builder is first in year 26–27. That is the pacing PR G of Plan 15
  recorded ("by 35 it has finished the catalogue and sits at the top of the
  scale"), not something this PR's constants reach. Held: reaches #1, and
  holds it.
- **The balanced builder is a great school, not a sound one.** Under Plan
  15's fit it finishes 98% of the catalogue and every school by fifty and is
  *a national university* like the completionist, with a B or better in five
  axes. Held: four axes at B or better, and a name from any table but the
  troubled one.
- **The selective college is the finding the plan said to look for, and it
  came out in the harness before the prestige model.** Three things stood
  between the policy and its own shape. (1) Plan 14's offer rule — three
  programs stand until one is taken, no decline — means a school that wants
  three schools must take a *stray* whenever every offer is from elsewhere;
  the policy puts strays in halls of their own and never develops them past
  the course founding started (`Strategy.maxSchools`). (2) A quota read off
  housed-program *counts* flipped every few years as strays tied at one, and
  scattered every school across two halls; it is read off the *first three
  halls' schools* now, which is stable. (3) Money: the completionist's
  coaching market, fill-every-chair and build-everything on a four-thousand-
  student line put it in the red for thirty years; priced a notch **over**
  tolerance (it takes one applicant in a hundred), building every facility its
  students want rather than every facility in the game, and hiring for
  teaching alone, it is *the finest college in the country* — prestige
  147–150 against the completionist's 150, an A in concentration, reach and
  research and a B-to-A in teaching. Teaching is the one claim not fully
  held: 0.83–0.96 on the axis, one seed under the A line, so the gate asks
  for a B everywhere and an A on most seeds. The concentration term *is*
  pulling its weight; what it cannot do is make a three-school college's
  breadth read as anything but a D, which is the fifty-weight term doing
  what it says.
- **The regional engine died three ways before it lived.** Priced under the
  founding line (2,500 + 150/point, then 3,000 + 170) the founding body of
  480 could not carry the core and the first hall was never sited; hiring
  like the completionist killed it in year two; and at a quarter under the
  balanced ramp its costs — every section, service and salary at the market
  rate for a standing its breadth carried to the top of the scale — outran
  a four-year price lock by 60% between years 20 and 25 (−846M at fifty). At
  a tenth under (5,500 + 200/point), admitting 60% rather than 75%, building
  for its students sooner and commissioning **nothing** (`research: 'none'`
  — 'shallow' pilots published their way to an A over thirty years), it is
  *an engine of the region* on every seed: solvent, an A in reach, an F in
  research. The plan's "C in research" is not a reading no-research can
  produce on a scale where a doctorate is two credits of twenty; the gate
  holds the ceiling (no better than a C).
- **Two readings moved.** Teaching is graded on the course grade's own
  scale (the campus average at the A line scores the half), not the prestige
  term's 35..85 map, on which every big school read the same mid-C whatever
  it did about its grades. Reach is the greater of the pool ratio and the
  body served against 25,000 — an engine of the region is one that teaches
  tens of thousands.
- **A run that came out differently every time it was played.** The
  selective college's small classes put two equal professors in most of its
  departments, and `eligibleInstructors` broke a tie on teaching by faculty
  id — a random UUID — so the game's own default pick of who teaches a
  course (and the harness's) was made by the dice, and the reference could
  not hold the strategy. The tie goes to roster order now (hire order, which
  is deterministic); nothing about a non-tied pick changed, and the sim is
  reproducible again. Pre-existing, and invisible until a policy made ties
  the common case.
- **Two harness policies were added** for the college that plays teaching
  (`Strategy.balancesTeaching`: every course to the instructor who grades it
  best, weekly, and a hire for small classes with twice the reserve in hand)
  and for the school that commissions nothing (`Strategy.research`). The
  archetypes that predate them are unchanged, which is why their campus
  averages sit in the low sixties whatever they build.

The reference was re-recorded for the ten strategies (`--write-reference`);
the earnest completionist builds three in four of every placeable thing, not
every building, because its own policy builds a facility only when an
attribute is short of 80 — held at three in four.

## PR 17F — Framing

- The startup screen's eyebrow says what the game is: *"Fifty years to build a
  university."*
- The History tab's header counts down as well as up ("Year 23 of 50"), and its
  charts fix their x-axis at fifty so the curves have somewhere to go.
- The toolbar's clock is unchanged.

**As implemented:** as written, plus the header's count turns into "Year 53 ·
the record sealed in year 50" once the run has played past fifty. The
fixed axis is a `span` on the shared `HistoryChart` (and an `xAt` placement
on `linePoints`), so the final report's curves and the tab's are the same
drawing; a run past fifty extends the axis to its own last year rather than
clipping. The eyebrow reads *Fifty years to build a university.*

## PR 17G — Docs

`docs/design/gameplay.md` retires "no win condition" for "a fifty-year run with a
sealed record and a sandbox after it"; `progression.md` gains the three eras, the
legacy and the ambitions; `README.md`'s opening paragraph follows.

**As implemented:** as written, plus `progression.md` gains "The top has to be
held" and the legacy's axis table; `admissions.md`'s summer names the final
report; `economy.md`'s defend-era line and "no-win-condition sandbox" follow;
`architecture/interrupts.md` gains the final report and the board's response,
`game-state.md` the two records of the run's own story, `systems.md` the one
annual boundary, and `playtesting.md` the two new players, `npm run endpoint`
and the endpoint gate; `tools/scenarios.ts` gains a `final-report` recipe;
`docs/plans/README.md` and `BACKLOG.md` mark the four-plan sequence landed.

---

## What this plan does not do

- No faculty poaching, no retirement. That is the faculty-lifecycle plan, which
  now has PR D's drift, Plan 14's halls and Plan 15's market-rate salaries to
  read — every precondition it needs, and it should be the next plan written.
- No second campus, no expansion beyond the grid, no late-game sink beyond the
  endowment. If fifty years with Plan 15's costs still leaves a school rich and
  idle at year 40, that is a finding for the scorecard, not a feature to invent
  here.
- No multiple endings beyond the legacy name. Six grades and a sentence.
