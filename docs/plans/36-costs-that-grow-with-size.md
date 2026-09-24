# Plan 36 — Costs that grow with size

*Planning document only. Its job is to turn the first open question of the
[merge review](../reviews/2026-09-merge-review.md) into a sequence of PRs:
the boom, fixed by a mechanism rather than a constant.*

**Status: In progress.**

---

## 0. The finding

[Plan 35](35-balance-and-playtest.md) measured the boom. A college whose
founding works has:
- its catalogue four-fifths built by Year 15;
- 20,000 students by Year 14;
- first place by Year 16.

The design's eras put that building at Years 12–35
([progression.md](../design/progression.md)).

**The cause is that every running cost is linear in size.**
- Services are a price per student. Instruction is a price per section,
  and a full section's cost per student is fixed.
- Both are scaled by prestige alone (`marketRateMultiplier`).
- So a college at prestige 70 pays the same per student at 1,000 students
  as at 20,000.
- The marginal student's margin is 26–35% in Years 5–10, the same as the
  average student's.
- Growth that pays for itself at any size compounds until the catalogue
  runs out.

**No constant fixes this.** Plan 35 raised running costs, course prices and
the elite rivals, and cut the player's price. Each stalled the founding
before it slowed the boom, because a linear cost moves the founding college
and the boom by the same share.

**A cost that grows with size can.** It leaves the founding (a few hundred
students) untouched and bites as the roll grows. The marginal student's
margin then falls with size until the next thousand no longer pay, and
that size rises with prestige, since prestige lets a college charge more.
Size would follow standing rather than run ahead of it. The boom becomes a
climb.

## 1. The probes

A prototype on a copy of `main`, not committed:
- The two running costs (sections and services) are multiplied by a size
  factor, `1 + k × log2(students / 1,500)`, charged only above 1,500
  students.
- The strategies are played for fifty years on the default seed.

### Variant A: flatten the prestige curve

The prestige curve is flattened so a 33,520-student college at prestige
150 pays exactly what it does today.

| | k | Catalogue 80% | 20k students | First place | Founding blocked | Late operating margin |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Balanced builder** | — | Y16 | Y14 | Y16 | 0 wk | 2–4% |
| | 0.25 | Y21 | Y20 | Y16 | 0 wk | 2–3% |
| | 0.5 | Y43 | Y37 | Y47 | 0 wk | −6% |
| **Regional engine** | — | Y17 | Y12 | Y14 | 0 wk | 1–2% |
| | 0.25 | Y27 | Y19 | Y28 | 0 wk | −7% to 1% |
| **Selective college** | — | Y12 | never | Y18 | 0 wk | −2% to 15% |
| | 0.25 | Y12 | never | Y15 | 0 wk | **29–45%** |

- **It slows the build** smoothly, with no founding stall at any setting.
- **It does not move the Balanced builder's first place.**
- **It makes a small, famous college rich.** A flatter prestige curve is
  cheaper at every size below the reference, so the Selective college's
  margin triples. That is a subsidy, and it rules variant A out.

### Variant B: size on top

The size factor is applied on top of today's prestige curve, which is left
as it is.

| | k | Catalogue 80% | 20k students | First place | Weeks in the red | Year-50 rank |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Balanced builder** | 0.05 | **Y32** | **Y31** | **Y35** | 555 | #1 |
| | 0.10 | stops at ~100 courses | never | never | 975 | #5 |
| | 0.15 | stops at ~75 courses | never | never | 1,410 | #14 |
| **Regional engine** | 0.05 | Y31 | Y20 | Y20 | 782 | #4 |
| | 0.10 | stops at ~100 courses | never | never | 909 | #12 |
| **Selective college** | 0.05 | Y12 | never | Y15 | 146 | #1 |

- **At k = 0.05 the Balanced builder lands on the design's eras.** The
  catalogue is built in the early thirties, first place comes at Year 35,
  and the founding is untouched.
- **Small colleges are left alone:** the Selective college is unchanged.
- **The weeks in the red are the harness, not the game.** The harness
  admits by a fixed rate and builds whatever it can afford. It cannot see
  that the next thousand students lose money, so it grows past the break
  and carries the deficit. A player who can see the margin stops.
- **Above about k = 0.1 the break falls below the size the design wants.**
  The college settles smaller and never leads. k is a real dial with a
  narrow good range, which the harness has to find, not a guess.

### What takes a college to first place

The Balanced builder's prestige target, year by year:

| Year | Students | Breadth | Concentration | Target | Prestige |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 5,379 | 6 | 0 | 83 | 71 |
| 12 | 11,680 | 8 | 12 | 88 | 80 |
| 14 | 13,840 | 24 | 30 | 131 | 85 |
| 20 | 28,640 | 36 | 30 | 150 | 133 |

The jump to first place is the schools: founding them and dedicating
halls (breadth and concentration). A size cost slows it only by slowing
the catalogue.
- **The Balanced builder:** size bounds what it can afford to found, so
  its first place moves with its growth (variant B).
- **The Selective college:** it founds its schools with 4,000–6,000
  students and leads at Year 15 whatever size costs. That route is a
  question about prestige, not money, and this plan leaves it alone
  (§6).

## 2. The mechanism

**The cost of being large** (variant B):
- **What it is:** a new line of running cost, the administration a big
  institution needs to hold itself together. Registrars, advising, IT,
  compliance, facilities management, and the layers of management that
  coordinate them.
- **Its shape:** a per-student charge that rises with the logarithm of
  the roll. It is charged at the same prestige market rate as services,
  and free below a threshold.

```
scaleCost/week = students × SCALE_PER_STUDENT × marketRate(prestige)
                          × max(0, log2(students / SCALE_FREE_BELOW))
```

The rules for it:
- **One line, legible,** in the Treasury beside services. It carries a
  Figure explanation and its own chart against size (§4).
- **Free below the threshold,** so the founding is untouched. The
  threshold is about 1,500 students, to be fitted, and must sit above
  where a founding college stands at Year 5.
- **Logarithmic.** Doubling the college adds the same per-student
  overhead each time. The marginal student's margin falls smoothly, with
  no cliff.
- **On top of the prestige curve, never in place of it** (variant A's
  subsidy).
- **Derived, not stored.** It is read off the roll each week like
  services, so the save does not change and no migration is needed.

**The endowment carries a big college.**
- On the numbers above, a full-size college at prestige 150 runs an
  operating deficit before its endowment payout and annual fund.
- That is how real universities are built: tuition does not cover a
  large research university, and the endowment and its donors do.
- It turns the endowment into the second half of growing large. A college
  that wants 30,000 students needs the fund to carry them.
- It is the use for late money that the review found missing.
- The late game already has the money for it: the payout is $237M at
  Year 40, and the fund $77M.

This extends Plan 35's settled V1-25 decision; it does not reverse it.
The endowment stays the reward for decades of surplus. What changes is
that part of the reward is size.

## 3. Rules for this plan

- **The harness has to see the mechanism before its numbers mean
  anything.** A strategy that grows past the break and runs a
  decade-long deficit is a policy flaw, not a finding. So the harness's
  growth policies learn the marginal student first (PR C), and only then
  is k fitted (PR D).
- **Fit to the design's eras, as targets written in advance** (PR D).
- **The founding stays untouched.** Plan 35's tuition-sensitivity probe
  becomes a claim: a Balanced builder charging a tenth less still grows
  without a founding stall.
- **Legibility ships with the cost** (PR E). A player must be able to
  see why the next thousand students cost more, and where the break is.
  Otherwise the mechanism is a hidden cap.

## PR 36A — The plan

This document.

## PR 36B — The line, switched off

- **The line itself:**
  - `SCALE_PER_STUDENT` and `SCALE_FREE_BELOW` go in `financeSystem.ts`'s
    cost constants;
  - `scaleCost` is a line of `financeBreakdown`, inside `totalExpenses`;
  - the Treasury shows it beside services.
- **It ships at `SCALE_PER_STUDENT = 0`,** so the harness does not move
  and the slow suites prove it. The mechanism and its UI are reviewed on
  their own, apart from the tuning.
- **Tests:**
  - the cost is zero below the threshold;
  - it is monotone in size;
  - the marginal cost per student rises with size (the property the
    whole plan rests on);
  - the Treasury's line equals the tick's.

## PR 36C — The harness learns the margin

- **A shared reading, `marginalStudentMargin(s, extra)`** in
  `financeSystem.ts`: what the next `extra` students would add in tuition
  against what they would add in cost. Cost here means instruction,
  services and the scale line, all at the current rate.
- **The strategies that are meant to be sensible read it:**
  - the Balanced builder, the Regional engine and both Completionists stop
    raising their admit rate, and building for more students, once the
    next thousand would not pay;
  - the Curriculum rush and the Overbuilder do not read it, since they
    are meant to overreach.
- **Still harness-neutral while the line is zero.** The margin is then
  positive at every size the harness reaches, so no strategy's choices
  change. The slow suites prove it again.

## PR 36D — Fitting k to the design's eras

- **Targets written first,** as the Balanced builder's `TARGETS` in
  `sim/reference.ts`, from the design's eras:
  - its catalogue four-fifths built in Years 22–35;
  - 20,000 students no earlier than Year 20;
  - first place no earlier than Year 25;
  - no more than 60 weeks blocked by money in Years 1–10;
  - an operating margin between −15% and +15% from Year 20 on;
  - a margin with the endowment's payout of 0% or better from Year 35 on;
  - weeks in the red within the band a steward can recover from, to be
    set from the fit.
- **The fit is a grid** over `SCALE_PER_STUDENT`, `SCALE_FREE_BELOW` and
  the one tuition-sensitivity strategy (charging a tenth less), across
  three seeds. It is read off `npm run guardrails`, whose pacing section
  (Plan 35) reports exactly these readings.
- **Claims that must still hold:**
  - the founding sensitivity;
  - the idle college outranks nothing that tries;
  - the Overbuilder still fails;
  - a Selective college is not made richer.
- **The chosen values are written into `economy.md`** as "The cost of
  being large", beside Plan 35's settled late margin. The reference is
  then re-recorded, and every claim that moves is re-fitted with its
  reason beside it.

## PR 36E — Making the break visible

- **The summer's projection** says what the next thousand students would
  pay and cost: "The next thousand pay $X each and cost $Y." It is read
  off `marginalStudentMargin`, so the player sees the break approach.
- **The Treasury's chart gains the cost per student against tuition by
  size** (Plan 34's `MultiChart`), so the break is a crossing a player can
  read.
- **The line's Figure explanation** (`figureHints.ts`): "What being large
  costs: the administration a college this size needs, rising with every
  doubling of the roll."
- **One board letter,** when the college first crosses the threshold.
  It explains, in the board's voice, that the next students will cost
  more than the last. It lives in the writing data, with the opening
  letters.

## PR 36F — Readings

- **The review's numbers re-measured,** added as a dated addendum to the
  merge review:
  - the Balanced builder by decade;
  - the pacing guardrail;
  - the founding sensitivity.
- **As-implemented notes.**

## What this plan does not do

- **The Selective college's early first place.** A college of 4,000–6,000
  that founds its schools early leads by Year 15 whatever size costs.
  Whether that is right (a small elite college at the top of a national
  table) is a design question about how prestige weighs size and reach.
  It is a separate plan's.
- **The defend era.** First place is still permanent once taken at the
  cap. Slowing the climb moves first place to Year 35, the start of the
  defend era. That makes it the question the review's second open item
  asks, but it does not answer it.
- **Research grants.** They bring $13.9B over a run. That is late money
  the endowment is not the only home for, and it is left as measured.
