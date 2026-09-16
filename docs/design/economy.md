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
   (`curriculumBreadthScore`).
2. **Prestige** — reputation drifts toward that target week by week, and prestige
   is what lets the school *charge more* (`priceTolerance`) and *draw more*
   applicants at all.
3. **Demand** — the applicant pool is prestige x price x word of mouth
   (satisfaction). Enrollment is earned, never automatic.
4. **Revenue** — every class at the price it was admitted under, summed; the
   dominant income line (see
   [admissions.md](admissions.md)'s "Tuition follows the class that paid it").
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
