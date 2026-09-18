# Plan 15 — Growth has a cost

*Planning document only — no gameplay code is changed by this file. Its job is
to turn the September review's two critical findings — money stops mattering
after year five, and enrollment is unbounded — together with the prestige
redesign that answers them, the specialisation term that Plan 14's founded
schools finally make possible, and the research model the review found inert,
into an ordered sequence of PRs ending in a single re-fit.*

**Status: In progress.** PRs A and B have landed. Depends on
[Plan 14](14-curriculum-on-the-map.md) for halls, slots and founded schools —
the seats this plan turns into a ceiling and the concentration this plan turns
into prestige both come from there. Supersedes
[Plan 10](10-growth-has-a-cost.md).

---

## 0. The findings, and why the economy lands after the halls

Four measurements, all from the real reducer:

- At year 15 of a completionist run: 65,008 students on 4,350 beds, dining for
  36,550, satisfaction 60, cash $96M, of which instruction cost is 95% of
  expense and faculty salaries 0.7%.
- At year 1: admitting 100% of the pool turned a founding school's net from
  +$62k to +$264k a week, and the only thing on screen that objected was
  "incoming quality 41".
- Prestige is a stock drifting 0.25% a week toward a target built from six
  inputs, five of which are monotone. It cannot fall. A number that cannot fall
  is not a reputation.
- Plan 09's breakdown found a **unit mismatch in `researchBreadthScore`**
  (`prestigeSystem.ts:613`): it divides equipped *fields* by the count of
  research *schools*, and a school teaches several fields. At year 15 that is 29
  against 8, so a 40-weight term has been pinned at maximum since roughly the
  fourth lab. Plan 09 flagged it and changed no constant. It is this plan's.

**Why this lands after Plan 14 rather than before it.** Every constant here has
to be fitted against a trajectory, and Plan 14 moves the trajectory more than
anything else in the sequence: halls gate the curriculum, the offer paces
program founding, and the faculty market gates courses. Fitting the economy
first would mean fitting it twice — once against today's shape and again against
the one that ships. Everything in this plan is written so the fit happens **once**,
in PR G, against the game as it will actually be played.

The cost of that choice is that the game is badly balanced between the two
plans. That is real and it is accepted.

### The map

| PR | Delivers |
|---|---|
| 15A | Readings: welfare, crowding, concentration, instruction capacity — pure functions on the breakdown panel, contributing zero |
| 15B | Prestige becomes an asymmetric stock with a summer report card; concentration and welfare become inputs; crowding becomes a penalty |
| 15C | Research: the unit mismatch fixed, output guaranteed, odds shown, the report of nothing killed |
| 15D | The cost side: instruction per section, services per student, salaries at market rate, capital events scaled to what broke |
| 15E | The ceiling: seats from housed courses cap intake, and crowding past it costs money |
| 15F | Consequences: attrition at the year boundary, demands from 60, wider word of mouth |
| 15G | The re-fit: every constant tuned against the scorecard across three seeds, and the bands rewritten as targets |
| 15H | Docs |

**As implemented (15A):** the four readings live in `prestigeSystem.ts` as a
`readings` list on the academic breakdown — its own list, not zero-weight
rows, so the target stays a sum over `inputs` and the invariant sweep can
assert that no reading is also an input. Each carries the weight §1 proposes
so the panel can say what it would be worth today. Instruction capacity is
its own module (`systems/techtree/instructionCapacity.ts`), since PR D and
PR E read it from finance and admissions, and it carries no weight: it is
the ceiling, shown as a ratio. Three decisions the plan left open were made
here and are PR G's to revisit: `SEATS_PER_COURSE` opens at 80, sized so the
whole catalogue holds about 34,000 (the top of the year-50 band) and a
year-20 completionist 12,000–18,000; crowding's shortfall is linear from
nothing at 90% coverage to full at 0%, with health below its population gate
read as covered, the rule the satisfaction and demand systems already share;
and concentration reads only the *deepest* school — founded 0.4,
distinguished 0.6 — because a second founded school is breadth, and breadth
already pays for it. A program in transit contributes no seats, matching
the no-teaching-quality rule relocation already has.

**As implemented (15B):** the card is graded at the top of
`RESOLVE_ADMISSIONS`, before the accumulators reset and before the funnel
runs, and the step is applied after the funnel — two calls, `gradeYear` and
`applyReportCard`, so the card grades the year that ended and the class the
admissions panel projected is the class that enrolls; the panel's own
projection (`consequences.ts`) carries the same step on its copy. The card
lives on `s.self.reportCard` (save version 55), keyed by input, and the
Standing panel shows each input's grade beside what it is worth now, with
the summer model in the note. Crowding's accumulator sits beside
satisfaction's on `s.students` and is fed by `tickPrestige`. Only the
academic standing steps at the summer: research and campus-life standings
keep the weekly drift, since neither is graded and nothing reads them back.
The penalty is a row with `penalty: true` and a negative contribution, so
the breakdown identity holds with a sign. The cost the plan said it would
accept arrived on schedule: with prestige able to fall, the Overbuilder and
the Idle control sink, and `test/balance-regression.test.ts`'s economy-shape
claims (the stall-and-recover arcs, solvency at the horizon) are *reported,
not failed* behind an `ECONOMY_REPORT_ONLY` flag — the scorecard's own
device — until PR G re-fits them; every claim about a mechanism stays hard.

---

## 1. Prestige: slow up, fast down, and a report card

### The model

**Prestige stays a stock** in `[5, 150]` with the same readers — `admitRate`,
the applicant pool, `priceTolerance`, the snapshots, the sim. Nothing downstream
needs to know the model changed. Three things do change:

1. **A summer report card.** At the admissions boundary the inputs are graded
   for the year just ended and summed into a **year score** on the same 5–150
   scale. That is the target, computed once a year and *shown* — Plan 09's
   breakdown panel gains a "this year's grade" column beside each input, and
   Plan 16's summer sequence makes it a beat.
2. **Asymmetric movement.** Prestige moves toward the year score by a fraction
   of the gap: `PRESTIGE_RISE_RATE` above, `PRESTIGE_FALL_RATE` below. Opening
   values: rise 0.12 a year — the old weekly drift's annual equivalent, so a
   run that never falls short is roughly unchanged — and fall 0.40. A school
   whose grade drops 30 points loses 12 the first summer and 7 the next;
   climbing back at the rise rate takes the better part of a decade.
3. **A weekly tremor.** Between summers prestige still moves, at a tenth of the
   old weekly rate, toward a running estimate — enough that the toolbar number
   is alive, not enough to pre-empt the summer step. If it reads as noise in
   playtest, drop it; the summer step is the beat.

**Recovery has to be possible.** The asymmetry is the point, but a run that can
fall and cannot climb is a worse failure than the one this plan is fixing. The
climb is slow and it is *unblocked*: nothing about being at a low grade makes
the inputs harder to raise. PR G owns an explicit assertion for this — see the
recovery scenario below.

### The new inputs

- **Concentration** (weight 30, taken out of breadth). This is the term
  [Plan 14](14-curriculum-on-the-map.md) makes possible and the review's
  recommendation H2 asked for: *a distinguished school concentrated in one hall
  is worth more than the same number of programs scattered*. It reads
  `school-founded` and `school-distinguished` milestones — the founded-school
  unit Plan 14 created — so a player who fills a hall with one school and
  finishes it outranks a player with the same course count spread across seven.
  This is what lets a small elite college and a broad state university both be
  real, and it is the single change that makes Plan 17's four-archetype balance
  target achievable rather than aspirational.
- **Welfare** (weight 20): the trailing-year average satisfaction, scored
  `(sat − 40)/40` clamped to 0..1. Below 40 it contributes nothing; at 80 it
  pays in full. This is what lets a happy small college hold a standing a
  crowded large one cannot.
- **Crowding** (a *penalty*, up to −25): the worst of the five coverage ratios
  (`attributeCoverage`, which exists) and the instruction-capacity ratio from
  PR E, scored as a shortfall. A campus feeding 55% of its students loses
  around 11; one at 90%+ loses nothing. It is a subtraction rather than a
  weighted input, so it can take a school **below** what its curriculum earned,
  which is the point.

### The weight budget

| Input | Was | Becomes | Why |
|---|---|---|---|
| Curriculum breadth | 90 | **50** | Still the largest single term, no longer the whole game |
| Concentration | — | **30** | The "known for" term; breadth's other half |
| Teaching quality | 30 | 30 | Unchanged |
| Student quality | 24 | 24 | Unchanged |
| Research | 22 | 22 | Weight unchanged; its *score* is fixed in PR C |
| Welfare | — | **20** | New |
| Campus life | 12 | **8** | Under-earned — two rec-centre rungs are the only sources, worth +1.8 ever. Cut with a condition, not a shrug: it returns to 12 when athletics and student life reach it (backlog), and the constant carries that note |
| Endowment | 18 | **8** | Needs $400k per student to pay; a term nobody can earn is not a term |
| Crowding | — | **−25** | A penalty, not an input |

**Grading average or state?** Welfare and crowding are graded on the **year's
average**, because those two are the ones a player can game by timing a dorm's
completion in week 50. Everything else is graded on **state at the summer**,
because what you see is what is graded.

## 2. Research that produces something

The most frequent interrupt in the game (61–74 of ~223 modals in a 40-year run)
is a project concluding with "The work produced nothing publishable." Forty
years of continuous research at a top-ranked school produced 9 breakthroughs and
1 prize, and research standing is read by nothing.

- **Fix the unit mismatch first.** `researchBreadthScore` divides equipped
  fields by research schools. Whether the denominator should be *fields* or the
  score should be *per school* is the design decision Plan 09 deferred here.
  Proposal: equipped fields over **total researchable fields**, which is what
  the sentence beside it already claims it measures. The term stops being pinned
  at maximum from the fourth lab and starts being something a research school
  earns.
- **Guarantee output.** A Funded Project always publishes something. A Program
  always banks at least one breakthrough roll a year, at a stated probability.
  The 0.5–3.4%-a-week silent lottery goes.
- **Show the odds before the commitment.** The research offer names expected
  publications, breakthrough chance and award chance at this team's strength.
  A player commits three professors for three years; they are entitled to know
  the bet.
- **Kill the report of nothing.** A project that produced nothing logs a line
  and, once [Plan 16](16-the-year.md)'s PR G exists, raises a toast. It never
  stops the clock. This is the review's cut-list item and it removes roughly a
  quarter of every interrupt in the game.
- **Let output reach somewhere.** Publications and prizes become *labelled*
  pulls on the research-oriented applicant cohort and on the candidate market
  ("a physicist saw your paper"). Small, and it is the difference between
  research being a system and research being a number.

## 3. The cost side

`instructionCostPerStudent = 38 + 1.00 × coursesOffered` per week, times
enrolled. Every course is a permanent tax on every student, and nothing else
scales: a 421-course school pays $459 a week per student in instruction and
$2.70 in salaries. Three lines replace one.

1. **Instruction per section.** A course costs `SECTION_COST` a week for every
   `SECTION_SIZE` students enrolled in it, with per-course enrollment read from
   the aggregate body the satisfaction ratios already use — no per-student
   state. Opening values: 40 students a section, $1,200 a week a section. A
   small catalogue at a big school runs enormous sections cheaply; a big
   catalogue at a small school runs empty sections dearly; and the *right*
   catalogue size for a given enrollment becomes a real question whose answer
   changes as the school grows.
2. **Services per student.** A flat `SERVICES_PER_STUDENT_PER_WEEK` — advising,
   registrar, IT, grounds — opening at $60. This is the line that makes the
   marginal student's profit thin, and the line crowding raises.
3. **Salaries at market rate.** `facultySalary` gains a multiplier from the
   school's prestige tier: a top-20 school pays what top-20 schools pay, opening
   at 1.0 at prestige 50 and 2.2 at 130. Salaries go from under 1% of opex to a
   fifth of it, and "can I afford this hire" returns after year five — which
   matters more now that [Plan 14](14-curriculum-on-the-map.md) makes hiring the
   thing a run stalls on.

**And the Treasury has to say so.** "Instruction: 421 courses in 1,850 sections
of 40 — $2.2M/wk", with a note on whether sections are running full. A cost
model the player cannot read is the same problem as a prestige formula they
cannot read.

**Capital events scaled to what broke.** The review found the late-game boiler
costing $10M against $21M a week of income because event amounts scale with
opex. They scale to the **building's own cost** instead. This plan moves the
whole money scale underneath the event table, so it is the moment to fix it.

## 4. The ceiling

- **Instruction capacity** = the seats the housed catalogue can teach: a sum
  over developed courses in housed slots of `SEATS_PER_COURSE`. Plan 14's halls
  are what make this honest — you cannot teach students in programs you have
  nowhere to put. A founded-but-shallow program contributes less than a
  distinguished one, so depth and breadth both buy growth, in different shapes.
  An empty slot teaches nobody, which makes a hall a bet rather than a purchase.
- **Intake is capped at the seats left**: the freshman class cannot exceed
  `instructionCapacity − enrolledAfterGraduation`. The admit slider's range
  shrinks to what fits and the reveal says so ("room for 1,240 more"). This is a
  hard cap on *enrollment*, not on applicants — the pool and the cohort reveal
  are untouched.
- **Everything else is soft.** Beds, dining and health are crowding, not caps.
  A hard teaching ceiling removes the absurd case (65,000 students in a school
  with room for 11,000); soft consequences everywhere else keep "I over-admitted
  and paid for it" as a story the game can tell.
- **Crowding past 85%** of capacity raises the services line by a multiplier and
  feeds §1's penalty. A school at its ceiling is paying for it before it is over
  it.
- Capacity is read at the summer boundary, and the reveal says what next summer
  will hold, so a player building toward a bigger class sees it coming.

## 5. Consequences

- **Attrition, with a beat.** Below `ATTRITION_SATISFACTION_LINE` (opening value
  50) each class loses a share of its students at the summer boundary — up to 8%
  a year at satisfaction 30, scaling linearly. `cohortsByClass` shrinks
  proportionally; a class's price does not change. **This gets its own line in
  the year in review** ([Plan 16](16-the-year.md)'s PR B): *"340 students did not
  return — housing, dining."* Attrition that arrives as a silently smaller number
  is the single most likely source of "I don't understand what happened to my
  school", and this plan is adding enough hidden machinery already.
- **Demands from 60**, not 45, and a demand can name the *instruction* shortfall
  ("classes are full") alongside the five coverages. Failing one dents welfare,
  which dents prestige — the chain the docs have always described and the code
  has never run.
- **Word of mouth** widens from ±0.45 to ±0.60, so satisfaction moves the pool
  enough to notice across two summers.

## 6. The re-fit

This is the PR the other seven exist to make possible.

**The bands change shape.** `REFERENCE_YEARS` becomes `[5, 10, 20, 35, 50]` —
the early pinch, the build-out, the review's own horizon, **the end of build-out
at 35**, and the endpoint at 50. And they become **three-seed** bands: Plan 09's
PR E found the earnest completionist reproducing the review exactly at seed 4242
and running 144 weeks in the red at seed 12345. A band fitted to one seed is a
claim about that seed.

The targets, for the Balanced builder:

| Year | Enrolled | Net as share of opex | Prestige | Rank |
|---|---|---|---|---|
| 5 | 1,500–2,500 | 5–15% | 55–60 | 45–55 |
| 10 | 4,000–7,000 | 5–15% | 65–75 | 30–45 |
| 20 | 10,000–18,000 | 5–15% | 85–100 | 8–20 |
| 35 | 15,000–28,000 | 5–15% | 100–125 | 2–8 |
| 50 | 18,000–35,000 | 5–15% | 110–140 | 1–5 |

Cash at every sample is one to three years of surplus, and capital costs at each
stage take one to three years of surplus to meet.

**The arc this describes has three eras**, and PR G is where they get their
shape: **found** (1–12, the core, the first halls, the first schools), **build**
(12–35, where the catalogue and the campus are made, and where completing every
school is *barely* possible), and **defend** (35–50, where there is little left
to build and the field closes — which is [Plan 17](17-the-endpoint.md)'s to
make interesting, and which only works because prestige can now fall).

Controls: the **Idle** school should *fall* — prestige into the 30s, enrollment
under 300 by year 20. The **Overbuilder** should be underwater by year 5 and
recovered by 15, because halls and beds without students now cost real money and
students without seats now cost prestige.

**And a recovery scenario, asserted.** A new `crisis` scenario stands a school
up at satisfaction 35 in year 15, and the sim asserts that correct play has it
back above 60 satisfaction and climbing in prestige by year 25. The review's
failure mode was that nothing pushes back; the opposite failure is a run that is
over at year 12 and does not end. PR G fails on either.

`test/balance-scorecard.test.ts` becomes a gate here — the comment Plan 09 left
in it names this PR.

## 7. Docs

`docs/design/economy.md`, `progression.md` and `admissions.md` rewritten to
describe the shipped model — including the correction the review found and Plan
09 left standing, that `satisfactionSystem.ts` scores four of five attributes
against *enrolled* while its own source comment and `economy.md` both still say
capacity. `docs/design/research.md` gains the guaranteed-output model and the
fixed breadth term.

---

## What this plan does not do

- **It does not change the curriculum's shape.** Halls, slots and the offer are
  [Plan 14](14-curriculum-on-the-map.md); this plan reads what that one built.
- **It does not build the summer sequence.** The report card needs somewhere to
  be shown and [Plan 16](16-the-year.md)'s PR A is where it lands. Until then it
  lives on Plan 09's breakdown panel, which is enough to tune against.
- **It does not add the faculty lifecycle**, athletics' reach into the economy,
  or student life with teeth. Campus life's weight is cut *with a named
  condition* rather than quietly, so the next plan to reach those systems knows
  what it is restoring.
- **It does not touch the applicant pool's logistic, the cohort model, sticker
  shock or the price-tolerance curve.** All four are downstream of prestige and
  price, and both are moving; re-fit them in PR G only if the bands demand it.
- **It does not author more decision events.** It re-scales the capital ones
  because it is moving the money scale under them; fixing the five dominant
  choices and adding to the table stays on the backlog.
