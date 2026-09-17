# Plan 10 — Growth has a cost

*Planning document only — no gameplay code is changed by this file. Its job is
to turn the September review's two critical findings — money stops mattering
after year five, and enrollment is unbounded — and the prestige redesign that
answers them into an ordered sequence of PRs. This is a design outline: the
model is argued here, the open questions are named, and the PR sequence is a
sketch to be firmed up after Plan 09 has landed and the scorecard exists.*

**Status: Superseded by [Plan 15](15-growth-has-a-cost.md).** The model this
outline argued for — an asymmetric prestige stock with a summer report card,
instruction cost per section, a capacity ceiling, attrition — is the model Plan
15 sequences. What changed is the order and the source of the ceiling: this plan
put an interim capacity formula (courses × sections) ahead of the halls that
would replace it, which meant fitting the economy twice. Plan 15 lands after
[Plan 14](14-curriculum-on-the-map.md) instead and fits it once, and it absorbs
two things this outline left out — a concentration term in prestige, which Plan
14's founded schools make possible, and the research model, which Plan 09's
breakdown found a unit mismatch in.

---

## 0. The finding, and what it says about the fix

Two measurements from the review, both from the real reducer:

- At year 15 of a completionist run: 65,008 students on 4,350 beds, dining for
  36,550, satisfaction 60, cash $96M, net +$4.0M a week, of which instruction
  cost is 95% of expense and faculty salaries 0.7%.
- At year 1: admitting 100% of the pool turned a founding school's net from
  +$62k to +$264k a week, and the only thing on screen that objected was
  "incoming quality 41".

The design docs describe an economy where "cost leads revenue" and "adding
capacity and students is supposed to hurt before the tuition heals it". The
code describes one where the marginal student is always profit at every price
the slider offers, where nothing caps intake, and where the penalties for an
unhoused, unfed, untaught student are a satisfaction floor of 12 and a word of
mouth floor of 0.55×, neither of which reaches prestige at all.

The earlier design had intake capped on beds and was retired because "the
player should just always accept as many as possible" — which was true, and
it was true because of the *money*, not because of the cap. Removing the cap
did not change that; it removed the one thing standing between the player and
70,000 students. The fix has to be on both sides at once:

1. **Over-admitting has to cost money**, so that the right class size is a
   decision with an answer that depends on what the school has built.
2. **Falling short of what the students need has to cost prestige**, fast
   enough to feel and slow enough to climb out of.

And the prestige model has to change shape for (2) to be possible, because
today's prestige is a stock that drifts toward a target that only ever rises.

### The map

| PR | Delivers |
|---|---|
| 10A | Readings: crowding and welfare as pure functions, on the breakdown panel from 09C before anything reads them |
| 10B | Prestige becomes an asymmetric stock with a summer report card; welfare and crowding become inputs |
| 10C | The cost side: instruction per section, services per student, salaries at market rate |
| 10D | The ceiling: an interim instruction capacity that intake cannot exceed, and crowding past it |
| 10E | Consequences: attrition below a satisfaction line, demands from 60 |
| 10F | The re-fit: constants tuned against the scorecard's bands, and the bands rewritten as targets |
| 10G | Docs: `economy.md`, `progression.md`, `admissions.md` rewritten to describe the game that runs |

---

## 1. Prestige: slow up, fast down, and a report card

### The problem with the target

`self.reputation` drifts 0.25% of the gap a week toward
`computePrestigeTarget(s)`. The target is a weighted sum of six inputs, five
of which are monotone stocks (milestones, research credits, endowment) or
things a player never lets fall (teaching average). So the target rises, and
prestige follows it, and the only way down is to shrink — which the
`enrolled/6000` scale term punishes silently.

The review's player-side complaint is that the target is invisible and the
drift is imperceptible. The design-side complaint is the one above: a number
that cannot fall is not a reputation.

### The model

**Prestige stays a stock**, in `[5, 150]`, with the same weights and the same
readers (`admitRate`, the pool, `priceTolerance`, the snapshots, the sim).
Nothing downstream needs to know the model changed. Three things change:

1. **A summer report card.** At the admissions boundary, the six existing
   inputs plus two new ones (§1's welfare and crowding) are graded for the
   year just ended and summed into a **year score** on the same 5–150 scale.
   This is the target, computed once a year and *shown* — PR 09C's panel gets
   a "this year's grade" column beside each input.
2. **Asymmetric movement.** Prestige moves toward the year score by a fraction
   of the gap: `PRESTIGE_RISE_RATE` when the score is above it, `PRESTIGE_FALL_RATE`
   when below. Opening values to tune from: rise 0.12 a year (the old weekly
   drift's annual equivalent, so a run that never falls short is unchanged),
   fall 0.40 a year. A school whose grade drops 30 points loses 12 the first
   summer and 7 the next; getting it back at the rise rate takes a decade.
3. **A weekly tremor, not a weekly drift.** Between summers prestige still
   moves, at a tenth of the old weekly rate, toward a *running* estimate of
   the year score — enough that the number is alive on the toolbar, not
   enough to pre-empt the summer step. The summer step is the beat.

**What the player sees.** The report card in the summer sequence (Plan 12
puts it before the sliders). Until then, the panel from 09C: last summer's
grade per input, prestige today, and the arrow.

### The two new inputs

- **Welfare** (weight 20): the trailing-year average satisfaction, scored
  `(sat − 40)/40` clamped to 0..1. Below 40 it contributes nothing; a school
  at 80 gets the full 20. This is the input that lets a happy small college
  hold a standing a crowded large one cannot.
- **Crowding** (a *penalty*, up to −25): the worst of the five coverage
  ratios (`attributeCoverage`, which already exists) and the instruction
  capacity ratio from 10D, scored as a shortfall: a campus feeding 55% of its
  students loses 11; one at 90%+ loses nothing. It is a subtraction, not a
  weighted input, so it can take a school *below* what its curriculum earned
  — which is the point.

The weight budget is rebalanced so a perfect school still tops out at 150:
breadth 90 → 80, and the two dead-weight inputs the review found — campus
life, which cannot exceed 1.8 of its 12, and endowment, which needs $400k a
student — shrink to 6 and 8 until Plan 13 gives them something to read.

### Open questions for §1

- **Does the summer step replace the weekly drift entirely?** The tremor is a
  compromise so the toolbar number moves. If it reads as noise in play, drop
  it and let prestige change once a year, which is how a ranking actually
  behaves.
- **Should the report card be graded on the year's *average* inputs or on
  the summer's *state*?** Average is honest (a dorm finished in week 50 does
  not fix a year of crowding); state is legible (what you see is what is
  graded). Proposal: average for welfare and crowding, state for everything
  else, because those two are the ones a player can game by timing.

## 2. The cost side

### Why instruction cost is the whole economy

`instructionCostPerStudent = 38 + 1.00 × coursesOffered` per week, times
enrolled. Every course is a permanent tax on every student and nothing else
scales: a 421-course school pays $459 a week per student in instruction and
$2.70 in salaries. So the marginal student costs $459 and pays $700; the
marginal *course* costs $73,000 a week at 73,000 students; and buildings,
people and research are noise. The model makes tuition the only revenue,
enrollment the only lever, and every other decision irrelevant to the ledger.

### The model

Three lines replace one:

1. **Instruction per section.** A course costs `SECTION_COST` per week for
   every `SECTION_SIZE` students enrolled in it (or fraction thereof), with
   enrollment in a course read as `enrolled / coursesOffered × COURSES_PER_STUDENT`
   — the same aggregate-body reading the satisfaction ratios use, no
   per-student state. Opening values: section size 40, cost $1,200 a week a
   section. The effect: a small catalogue at a big school runs enormous
   sections cheaply; a big catalogue at a small school runs empty sections
   dearly; and the *right* catalogue size for a given enrollment is a real
   question with an answer that changes as the school grows.
2. **Services per student.** A flat `SERVICES_PER_STUDENT_PER_WEEK` (advising,
   registrar, IT, grounds) — opening value $60 — that grows with enrollment
   and nothing else. This is the line that makes the marginal student's
   profit thin, and it is the line crowding will raise (10D).
3. **Salaries at market rate.** `facultySalary` gains a multiplier from the
   school's prestige tier — a top-20 school pays what top-20 schools pay —
   opening at 1.0 at prestige 50 and 2.2 at prestige 130. Salaries go from
   under 1% of opex to a fifth of it at a mature school, and the "can I
   afford this hire" question returns after year five.

### Open questions for §2

- **Per-section reads as a real thing to a player only if the Treasury says
  so.** "Instruction: 421 courses in 1,850 sections of 40 — $2.2M/wk" is the
  line; the note beside it says whether sections are running full.
- **Should the campus upkeep lines scale with use?** A dining hall serving
  16,000 costs the same to run as one serving 350 today. Probably yes, as a
  per-served-student component, but it is a smaller term and can wait for the
  re-fit in 10F to say whether it is needed.

## 3. The ceiling

### Interim, and what replaces it

Plan 11's academic halls give the school classrooms, and classrooms are the
honest ceiling: you cannot teach students you have no room for. Plan 10 needs
a ceiling before Plan 11 exists, and it should be one that Plan 11 can
*replace* rather than remove:

- **Instruction capacity** = `Σ over offered courses of SECTION_SIZE × MAX_SECTIONS_PER_COURSE`
  — the seats the catalogue can teach if every course runs its maximum
  sections. Opening values give a founding school (6 courses) room for ~1,400
  students, a 48-course school ~11,000, and the full catalogue ~100,000, so
  the ceiling is real early and loose late, which is the shape the pacing
  wants until halls arrive.
- **Intake is capped at the seats left**: the freshman class cannot exceed
  `instructionCapacity − enrolledAfterGraduation`. The admit-rate slider's
  range shrinks to what fits, and the reveal says so ("room for 1,240 more").
  This is a hard cap on *enrollment*, not on applicants, so the pool and the
  cohort reveal are untouched.
- **Crowding past 85%** of capacity raises the services line (10B's per-student
  cost × a crowding multiplier) and feeds the crowding penalty in §1. A school
  at the ceiling is paying for it before it is over it.

Plan 11 then defines instruction capacity as classroom seats and deletes the
formula above; every reader stays.

### Open questions for §3

- **Hard cap or soft?** The review argued for soft (admit past capacity at a
  steep cost). The response argued for consequences rather than caps. This
  outline proposes **both**: a hard cap on the *teaching* ceiling (you cannot
  enroll a student in courses that do not exist) and soft consequences on
  everything else (beds, dining, health are crowding, not caps). That keeps
  "I over-admitted and paid for it" as a story the game can tell, while
  removing the absurd case.
- **Does the cap read as unfair when a course finishes mid-year?** Capacity
  is read at the summer boundary; a course that lands in week 30 adds seats
  next summer. The reveal should say "next summer: room for N more" so a
  player building toward a bigger class sees it coming.

## 4. Consequences

- **Attrition.** Below `ATTRITION_SATISFACTION_LINE` (opening value 50), each
  class loses a share of its students at the summer boundary — up to 8% a year
  at satisfaction 30, scaling linearly. The cohort record per class
  (`cohortsByClass`) shrinks proportionally; a class's price does not change.
  This is the review's "retention as a satisfaction consequence", and it is
  what turns a crowding hole into lost tuition rather than a number.
- **Demands from 60**, not 45, and a demand can name the *instruction*
  shortfall ("classes are full") as well as the five coverages. Failing one
  now dents welfare, which dents prestige — the chain the docs always
  described.
- **Word of mouth** widens from ±0.45 to ±0.60 so that satisfaction moves the
  pool enough to notice across two summers.

## 5. The re-fit

With 09D's scorecard, the bands stop describing the game as it was and start
describing the game as it should be. The targets this outline proposes, for
the Balanced builder at the default seed:

| Year | Enrolled | Cash | Net as share of opex | Prestige | Rank |
|---|---|---|---|---|---|
| 5 | 1,500–2,500 | one to three years of surplus | 5–15% | 55–60 | 45–55 |
| 10 | 4,000–7,000 | same | 5–15% | 65–75 | 30–45 |
| 20 | 10,000–18,000 | same | 5–15% | 85–100 | 8–20 |
| 30 | 15,000–28,000 | same | 5–15% | 100–120 | 2–8 |
| 40 | 18,000–35,000 | same | 5–15% | 110–135 | 1–5 |

The earnest completionist should reach rank #1 in the thirties, not the
teens, and should finish the catalogue in the thirties. The Idle control
should *fall* — prestige into the 30s and enrollment under 300 by year 20 —
and the Overbuilder should be underwater by year 5 and recover by year 15,
because beds without students now cost real money and students without beds
now cost prestige.

Every constant introduced above is an opening value. 10F is the PR that moves
them, and its summary quotes the scorecard diff.

---

## PR sketch

- **10A — Readings.** `crowdingPenalty(s)`, `welfareScore(s)` and
  `instructionCapacity(s)` as pure functions with tests; rows on the
  breakdown panel, contributing zero. Nothing changes in play; everything is
  visible before it bites.
- **10B — The report card.** The year score, the asymmetric step at the
  admissions boundary, the tremor, the reweighting; `YearSnapshot` records
  the score; the panel shows last summer's grade. The sim's prestige column
  moves; the scorecard says by how much.
- **10C — The cost side.** Sections, services, market-rate salaries; the
  Treasury's lines and notes rewritten; the projection in `consequences.ts`
  reads the new breakdown unchanged because it already calls `financeBreakdown`.
- **10D — The ceiling.** Instruction capacity caps intake at the summer
  boundary; the admit slider's range and the reveal's "room for" line; the
  crowding multiplier on services.
- **10E — Consequences.** Attrition, the demand threshold and the instruction
  demand, the wider word of mouth.
- **10F — The re-fit.** Constants tuned; `sim/reference.ts` rewritten as
  targets; `test/balance-scorecard.test.ts` becomes a gate.
- **10G — Docs.** `economy.md`, `progression.md`, `admissions.md` and
  `satisfaction`'s comments (which still claim ratios are scored against
  capacity) rewritten to describe the shipped model.

## What this plan does not do

- It does not add classrooms or halls (Plan 11), the summer sequence UI
  (Plan 12), or the year-50 scorecard (Plan 13).
- It does not touch the applicant pool's logistic, the cohort model, sticker
  shock or the price tolerance curve. Those are downstream of prestige and
  price, and both are being moved; refit them in 10F only if the bands
  demand it.
- It does not change what athletics, research or student life feed. Their
  reach is a later plan; this one makes sure that when they reach prestige,
  prestige can move in both directions.
