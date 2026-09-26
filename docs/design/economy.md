# Economy and pacing

Money is the game's clock. This document is what `financeSystem.ts`,
`admissionsSystem.ts` and `campusData.ts` are tuned to.

## Pacing model: money is the throttle, and the growth loop is what makes it bite

**Money is the primary pacing resource, and it is a bottleneck, not a threat.**
It is the throttle for the first half of the game (the owner's rule, restated
by [Plan 71](../plans/71-economy.md)): the thing that keeps a player waiting is
saving for the next thing they want. The one other limit is the curriculum
committee's seats on undergraduate courses (four, up to eight with prestige —
see [curriculum.md](curriculum.md)), a bandwidth the owner kept on purpose; there
is no allowance on new majors. Buildings are never queued, and the gate on
starting one more is that **the school can actually pay for it** —
cost is charged in full, up front, and a purchase it can't cover is simply not
offered (plus the faculty course-slot gate on the curated `requiresFaculty`
courses, which is a per-field capacity rule, not a pacing throttle). The pacing
is the *wait* to afford the next thing, never a debt you have to dig out of.

There is no development-slot mechanic, no Pace mechanic, and no siting queue: a
placeable Buildable is developed and placed by one action (see
[buildables.md](../architecture/buildables.md)). The one remnant of siting is
`RETROACTIVE_SITING_COST`, a small recovery fee for the rare
`'done'`-but-unplaced Buildable. How the design arrived here is recorded in
[Plan 01](../plans/01-design-alignment.md).

Money can only pace the game if the school's own growth keeps spending it. That
is what the **growth loop** is for, and it is the shape everything in
`financeSystem.ts`, `admissionsSystem.ts` and `campusData.ts` is tuned to:

1. **Curriculum** — finishing majors and schools raises the prestige target
   (`curriculumBreadthScore`), and a hall filled with one school and finished
   raises it again (`concentrationScore`). Every developed course in a housed
   program also adds seats, and seats are the ceiling on enrollment.
2. **Prestige** — reputation is graded each summer and steps toward the grade
   (slowly up, faster down — see [progression.md](progression.md)), and
   prestige is what lets the school *charge more* (`priceTolerance`) and *draw
   more* applicants at all. It is also what the school *pays*: salaries,
   sections and services all carry the market rate its standing commands.
3. **Demand** — the applicant pool is prestige x price x word of mouth
   (satisfaction) x overcrowding. The prestige pool is a curve that trickles
   early and reaches 56,000 at prestige 140 ([Plan 71](../plans/71-economy.md);
   a straight line since [Plan 67](../plans/67-pacing-tuning.md), a steep logistic
   before that), a price past the tolerance costs applicants faster than one
   under it, and beds throttle it only in the founding years (full at 2,500). Enrollment is earned, never automatic — and the freshman
   class cannot exceed the seats the catalogue has left after graduation.
4. **Revenue** — every class at the price it was admitted under, summed; the
   dominant income line (see
   [admissions.md](admissions.md)'s "Tuition follows the class that paid it").
   Beside it the reputation dividend, the endowment payout and — since
   [Plan 21](../plans/21-the-department.md) — the **athletics surplus**: the
   gate is paid to the department's own pot first, and only what is left once
   every program on the priority list has drawn its cost spills into general
   income, with the tier's subsidy on the expense side. A winning department
   returns more than it was given; a losing one returns nothing.
5. **Strain** — more students mean more sections to run and more services to
   provide, more upkeep, and diluted satisfaction (four of the five ratio
   attributes are scored against the *enrolled* body; housing against beds
   over enrolled), which forces dorms and facilities, which cost money, which
   sends you back to 1. A bad year costs students too: below 50 satisfaction a
   share of every class does not come back, and a crowded campus loses
   standing.

**Cost leads; revenue follows.** That lag is the whole game, and it is
structural rather than a special case: every cost is charged the moment a
commitment is made (a dorm's price up front, its seat upkeep from the week it
opens, a hire's salary from the week they arrive, a course's running cost and
its first section from the week it finishes), while every payoff waits for the
annual summer admissions boundary, and the prestige payoff waits for the
summer report card on top of that. Adding capacity and students is supposed
to hurt before the tuition heals it.

### The catalogue's price (Plan 71)

Income grows with the college — roughly tenfold between years 5 and 30 — so a
fixed price list is dear in the first decade and pocket change by the third.
Plan 71 prices the catalogue so money paces the first half:

| Item | Before | Plan 71 |
|---|---|---|
| Undergraduate course, tier 1 / 2 / 3 (list) | $80k / $180k / $400k | $300k / $900k / $2.2M |
| Their upkeep a week | $130 / $380 / $800 | $300 / $800 / $1,800 |
| Graduate course, professional / doctoral | $6M / $4M | $9M / $6M |
| Academic hall, first and ratio | $750k, ×1.3 | $2.5M, ×1.45 |
| Academic hall, weeks (first / rest) | 16 / 24 | 26 / 36 |
| Lab | $700k, 16 weeks | $3M, 26 weeks |
| Dorms and facilities, weeks | — | ×1.3 |

**The catalogue's price grows with the catalogue.** Every undergraduate course
on offer raises the price of every one not yet started by 0.3%
(`techData.ts`'s `CATALOGUE_PRICE_GROWTH`; `techSystem.ts`'s
`repriceCatalogue`): the 378th course costs about three times its list price.
A started course keeps the price it was started at. Founding a major is its
entry course, so majors grow dearer too. Graduate courses keep their list
price: a school's whole curriculum gates them already.

**How long money binds** (the pacing scorecard's three players, three seeds,
[`2026-09-pacing-economy.md`](../reviews/2026-09-pacing-economy.md)): a college
at a fair price teaches half its courses by year 15–16 and adds its last
graduate course between years 31 and 49; one charging just short of the red
tier has a smaller early pool and more per student, teaches half by year 19–20
and finishes by year 44–47. Every one reaches #1 by year 50 when it hand-picks
faculty, and a teaching-blind one finishes around #16.

### The cost side (Plan 15)

Three lines replaced the old per-student instruction charge, and each one is
read in the Treasury off the same arithmetic the tick charges
(`financeSystem.ts`'s `financeBreakdown`):

- **Instruction, per section.** A course costs `SECTION_COST` a week for every
  `SECTION_SIZE` students enrolled in it, with per-course enrollment read off
  the aggregate body — every student takes `COURSES_PER_STUDENT` at once,
  spread evenly over the catalogue — and no per-student state. An offered
  course runs at least one section however few take it, and at most the
  sections its seats hold, so that at the ceiling every section is exactly
  full. A big catalogue at a small school runs empty sections dearly; a small
  catalogue at a big school runs enormous sections cheaply and crowds its
  students. The Treasury says "427 courses in 1,880 sections of 40" and
  whether they are running full, empty or over.
- **Services, per student.** A flat `SERVICES_PER_STUDENT_PER_WEEK` — advising,
  the registrar, IT, grounds — the line that makes the marginal student's
  profit thin. Past 85% of instruction capacity it rises, to +50% at the
  ceiling and capped at ×2: a school at its ceiling pays for it before it is
  over it.
- **Salaries at market rate.** A top-20 school pays what top-20 schools pay:
  the roster's salaries carry `marketRateMultiplier(prestige)` — 1.0 at
  prestige 50, 3.4 at 130, capped at 4 — applied at the payroll, never written
  into a hire's `salary`, so a listing shows the person's price and the
  Treasury what this school pays.

**Sections and services carry the same market rate.** That is the one lever
that makes the founding years viable *and* the late game tight: a founding
school pays the base and a school at prestige 130 pays three and a half times
it per student, and tuition does not rise that fast. Fitted by Plan 15's PR G
against the old harness's scorecard (retired in Plan 63; `npm run sim` reports
the trajectories now).

**Capital events scale to what broke**, not to opex: a roof is a quarter of
its building, a kitchen 30% of its dining hall, the boiler 12% of the standing
residence halls, a storm 3% of everything standing, floored at $60k.

**The ceiling.** Instruction capacity — `SEATS_PER_COURSE` (80) for every
developed course in a housed, settled program, the founding college's six
courses included — is the one hard cap in the game, on enrollment
and nothing else: the freshman class cannot exceed the seats left after the
seniors graduate (`instructionCapacity.ts`'s `intakeCeiling`). Beds, dining
and health stay soft — crowding, never caps. See [admissions.md](admissions.md).

The loop turns roughly once per course tier, escalating each time:

- **Found (years 1–12)** — the founding college, the first halls, the first schools. A
  founding school nets a quarter to a third of its opex, and that surplus is
  what the first hall ($750k, then ×1.3 a rung) and its programs are bought
  with; a school that spends it on beds houses students it cannot admit.
- **Build (12–35)** — the catalogue and the campus are made. Growth is paced by
  seats (a program's developed courses), by faculty (the market is a gate),
  and by money: net falls toward a tenth of opex as standing raises what every
  section, service and salary costs, and completing every school is *barely*
  possible by 35.
- **Defend (35–50)** — little is left to build and the surplus reappears; the
  elite of the field close on the leader (see
  [progression.md](progression.md)'s "The top has to be held"), and holding
  the top only means anything because prestige can now fall.

Consequences that the code must honor:

- **No hard insolvency game-over.** A cash shortfall should *stall expansion*,
  not end the run. "Stall, don't die" is the bottleneck expressed mechanically,
  and it fits a run that is graded rather than won — a school in the red at
  fifty is *a school that grew too fast*, not a game over. There is no bankruptcy state and no
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
  empty beds are charged at a reduced mothball rate, a course's sections
  follow its enrollment down to the one it always runs, satisfaction (and so
  word of mouth) is floored, curriculum breadth is a stock that never
  decreases, and the tuition decision and firing faculty are zero-cost
  recovery levers. What is *not* floored any more is standing: prestige falls
  when the grade does, and a school that charges less than a student costs to
  teach at its standing loses money on every one — the price is the lever. These invariants
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

Balance claims about any of this are measured with `npm run sim` — a headless
fast-forward through the real reducer under the harness's four archetypes and
its guided player (`sim/report.ts`), which prints each one's trajectory
against the committed baseline. It reports and never gates: only checks gate
a merge (see [playtesting.md](../architecture/playtesting.md)).

## The late margin (V1-25), settled

Plan 35 (Phase N of the merge) measured the Balanced builder's income
statement decade by decade. **A mature college's operating margin runs at
1–3%** from Year 15 on, which is about what a real one runs. The headline
margin that had climbed to 67% at Year 50 was the endowment's: the harness
moves every spare dollar into it, it compounds at `ENDOWMENT_ANNUAL_RETURN`,
and its payout comes back as income, $666M a year by Year 50 against a
$17B fund.

That is the decision: **the endowment is the reward for decades of surplus,
and grows as a real one does; it is not a margin to be taxed away.** The
operating margin — the week's net less the endowment payout and the annual
fund, over operating cost — is the figure a mature college is read by. What the money is *for* late in a
run (the capital projects, the endowment's half of them) is Plan 33's.

### Idle cash, and the standing sweep (Plan 70D)

Financial strength, one of the report's six standings, reads the endowment
per student (full marks at $80,000), not cash. A player who never moved money
in was graded F however rich: the natural line finished with $49B in cash and
an F. Two things answer that, and the endowment stays a choice
(`systems/finance/sweep.ts`):

- **A standing sweep** in the Treasury: keep 13, 26 or 52 weeks of expenses
  as cash and move the rest into the endowment at each quarter's close, **until
  the endowment reaches the full mark**. Off until set.
- **The board's letter,** the first time cash has sat above a year of
  expenses for a year with no sweep set; its button (and the next-step line)
  sets the sweep at 26 weeks. A reminder comes at most once a decade.

The cap at the full mark is the owner's call. Uncapped, swept cash
compounded: the payout came back as income and was swept again, and the
natural line's endowment reached $80B and its weekly net $80M by year 50,
growing 44% in the last decade instead of coasting. Capped, the natural line
grades full marks from about year 10, its net is where Plans 67–69 left it,
and cash above the mark piles up as before (watched on the scorecard).

The same plan measured the other end. **The founding has no slack of its
own**: the economy is a threshold system, and a player who charges a tenth
less than the harness's price, or whose costs run a tenth higher, stalled
for a decade on a gift of $1.4M. The gift is $3.0M (`FOUNDING_PRESET`),
which a strong strategy does not need and a weaker one does. The boom that
follows a founding that works (the catalogue built by Year 15, first place
by Year 17) is left open for the owner: every cost lever measured tips the
economy into a stall before it slows the boom, so the fix is a mechanism
that smooths the threshold, not a constant ([Plan 35](../plans/35-balance-and-playtest.md)).

## The cost of being large (Plan 36)

Every running cost used to be linear in size: services a price per student,
instruction a price per full section, both scaled by prestige alone. So the
marginal student paid as well at 20,000 as at 1,000, and a college whose
founding worked compounded until its catalogue ran out: built by Year 15,
first place by Year 16. **The cost of being large** is the administration a
big institution needs to hold itself together, charged per student and
rising with every doubling of the roll:

```
scaleCost/week = students × SCALE_PER_STUDENT_PER_WEEK × marketRate(prestige)
                          × max(0, log2(students / SCALE_FREE_BELOW))
```

- **Free below 1,500 students** (`SCALE_FREE_BELOW`, the size "A town's
  worth" announces), so a founding college never pays it.
- **Logarithmic**, so the next student's margin falls smoothly with size,
  and the size where it reaches zero rises with prestige, since prestige
  lets a college charge more. Size follows standing instead of running
  ahead of it.
- **On top of the prestige market rate, never in place of it.** Flattening
  the prestige curve to pay for it was measured, and made small famous
  colleges three times richer.
- **5 a student a week per doubling** (`SCALE_PER_STUDENT_PER_WEEK`),
  fitted to the design's eras on the Balanced builder: catalogue
  four-fifths built in Year 35, 20,000 students in Year 24, first place in
  Year 29, and no founding week blocked by money.
- **A big college runs a small operating deficit** that its endowment
  payout and annual fund carry, as a real one does. It extends the settled
  late margin above: the endowment is still the reward for decades of
  surplus, and part of the reward is size.

The break is shown, not hidden:
- the summer's projections read what the next thousand would pay and cost;
- the Treasury charts the next student's cost against the price at every
  size the catalogue can seat.

**What it does not do: first place by prestige alone.** A college that
founds its schools early leads by Years 13–18 whatever size costs. That is
the Selective college with 4,000 students, and the Earnest completionist.
It is a question of how prestige weighs size and reach, and it is left open.
