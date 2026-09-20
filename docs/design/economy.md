# Economy and pacing

Money is the game's clock. This document is what `financeSystem.ts`,
`admissionsSystem.ts` and `campusData.ts` are tuned to.

## Pacing model: money is the throttle, and the growth loop is what makes it bite

**Money is the primary pacing resource, and it is a bottleneck, not a threat.**
It is also the *only* throttle: there is no development-slot mechanic, and none
is coming back. Any number of Buildables can be developing at once, and the
single gate on starting one more is that **the school can actually pay for it** —
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
   (satisfaction). Enrollment is earned, never automatic — and the freshman
   class cannot exceed the seats the catalogue has left after graduation.
4. **Revenue** — every class at the price it was admitted under, summed; the
   dominant income line (see
   [admissions.md](admissions.md)'s "Tuition follows the class that paid it").
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
  students. The Treasury says "415 courses in 1,830 sections of 40" and
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
against the scorecard, where the record of what each value is and why lives.

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

Balance claims about any of this are checked with `npm run sim` — a headless
fast-forward through the real reducer under several scripted strategies (see
`sim/balanceSim.ts`), which prints cash/enrolled/prestige/opex by year — and
gated by its scorecard (`sim/reference.ts`: hand-written targets for the
Balanced builder and the two controls, three-seed envelopes for the rest; see
[playtesting.md](../architecture/playtesting.md)).
