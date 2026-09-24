# Plan 29 — The people

*Planning document only. Its job is to turn Phase H of the v2 merge
(people, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a sequence
of PRs.*

**Status: Landed.**

---

## 0. The finding

This game's people are its strongest system: a churning faculty market,
eight applicant cohorts, six served-population satisfaction attributes,
clubs, Greek life and demands. What the merge adds is texture and
friction, and a better screen. The owner's decisions (v2's
`docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V1-9 | This game's market (a standing, weekly-churning pool, field scarcity, paid searches), with v2's quirks on candidates, and a Faculty tab that hides the fields the college has not developed. |
| V2 #16 | Faculty churn: retirement, and poaching with counter-offers. No random quitting. |
| V1-13 | Admissions: this game's decision and caps, with a projection line: the expected class against beds and last year. |
| V1-15, V2 #18 | Satisfaction: this game's served-population attributes, with v2's rising expectations and diminishing returns above 80. |
| V1-33 | The Students tab: Student Life and Enrollment merged into one screen. |
| V1-16 | Demands delivered through a panel with a deadline and a default, not a clock-stopping modal. |

## Rules for this plan

- **Content in data.** Quirks are a data file ported from v2's
  `faculty.json`.
- **The random stream.** Nothing new draws from the shared stream where a
  derived roll will do: a quirk is picked from a hash of the professor's
  id, so adding quirks moves the harness only through what they do.
- **What moves the harness moves it on purpose:** quirks, retirement and
  expectations. The slow suites run after those PRs, and the bands they
  move are re-recorded with a note.
- **Poaching with counter-offers is already here:** "an outside offer"
  (`faculty-outside-offer`) is v2's poaching, and this game has no random
  quitting. So V2 #16 is retirement alone.
- **Identity tags are Phase J's.** The cohorts, clubs and Greek life feed
  them there.

## PR 29A — The plan

This document.

## PR 29B — Quirks

- **`data/quirkData.ts`:** v2's quirks, each with a line and small
  effects on teaching and research potential, salary and morale.
- **One quirk per candidate,** picked from a hash of their id, applied
  when they are generated. Some candidates have none.
- **Morale** is a small term in satisfaction's academic attribute, the
  sum across the roster, capped.
- **The Faculty tab and the candidate list** show a quirk as a chip with
  its line.

**As implemented:**

- **All forty of v2's quirks,** ported as data.
- **About three candidates in five** have one. It is picked by hashing the
  id, which is drawn at the same point in the stream as before, so the
  candidate's other draws are the ones they always were.
- **Effects:**
  - teaching and research move the rolled potentials, clamped to 0–100;
  - salary multiplies pay, both at generation and every week's recompute;
  - morale, summed across the roster, moves academic satisfaction by a
    tenth of a point a unit, capped at three either way, and shows in its
    breakdown as "The faculty's characters".
- **The founding five** have none.

## PR 29C — Retirement

- **Every professor has a career length,** rolled from their id: 25 to 40
  years. A year before it ends, the log gives notice. At the end they
  retire, and their courses wait for a new instructor.
- **The retiring professor's year** is a chance to hire before they go.

**As implemented:** `careerWeeks(id)` takes another slice of the same hash,
giving 25 to 40 whole years. `tickRetirements` runs after the faculty grow
each week: notice at a year out, then retirement, which leaves the courses
unstaffed exactly as a dismissal does. Seats' holders left the roster when
appointed (Plan 28), so they do not retire.

## PR 29D — The Faculty tab, scanned

- **Only the fields the college has developed are shown:** those with a
  course offered, a professor on the roster or a program housed. "Show
  every field" opens the rest.

**As implemented:** "developed" means a course offered or revealed in the
field, or somebody on the roster. A department the Curriculum tab links to
is always shown. The toggle sits with Expand and Collapse all, and counts
the fields it hides.

## PR 29E — The admissions projection

- **The summer's admissions panel** gets one line: the expected entering
  class against the beds and dining seats it will need, and last year's
  class.

**As implemented:** under the Freshman class and Incoming quality figures:
"A class of N against M last year: T students next year, for B beds and
dining for D." T is the projection's own whole body (the three continuing
classes plus the incoming one).

## PR 29F — Expectations

- **Rising expectations:** what satisfies a student rises with the
  college's prestige. Each attribute's target ratio tightens as prestige
  climbs.
- **Diminishing returns above 80:** satisfaction above 80 counts half.

**As implemented:**

- **Each point of prestige over 50 raises the library, social and housing
  targets by 0.1%,** so a college at 150 needs a tenth more of each.
- **Dining and health are needs, not expectations,** and do not rise. A
  tenth more dining would have cut a well-fed elite college's basic needs
  from 100 to about 81 on the steep curve that attribute uses.
- **Diminishing returns apply to the headline target,** which therefore
  tops out at 90. Word of mouth (neutral at 70) and welfare prestige
  (paid in full at 80) both read that headline.

## PR 29G — The Students tab

- **Student Life and Enrollment become one tab, Students,** with sections
  for the body (enrollment and the funnel), what students think
  (satisfaction and demands), and their societies (clubs and Greek life).
  The gates of both tabs carry over.

**As implemented:** `tabs/StudentsTab.tsx` stacks the two old tabs:

- **what students think comes first**, since it explains the headline:
  satisfaction, the active demand, clubs and chapters;
- **then who enrolled** and the funnel that drew them.

The tab keeps the Student Life icon and the `l` key. It opens at the first
commencement, and the petition toast points at it. `TabId` loses
`enrollment` and `studentlife`, and the Enrollment icon goes with them.

## PR 29H — Demands in the panel

- **A demand arrives as a note that does not stop the clock,** with its
  deadline and what happens if it is missed. The Students tab keeps it in
  view until it is met or lapses.

**As implemented:**

- **`raiseDemand` sets `events.demandUnread`** in place of the interrupt,
  and `DemandNote.tsx` shows the ask, the weeks left, progress, and the
  stakes met and missed.
- **One note at a time:** it waits behind a milestone's note and the
  board's letters.
- **"Noted"** (`READ_DEMAND`) puts it away.
- **Old saves:** the `'demand'` interrupt still resolves for a save taken
  with the old modal open.

## The harness, re-measured

Quirks, retirement and expectations move the harness on purpose (the
plan's rules). What moved, and what was done:

- **Quirks change who the market offers,** and the harness picks from it.
  The effects average mildly positive (+0.5 teaching, +1.4 research, pay
  ×1.01), so the change is which candidates, not a tilt. The Curriculum
  rush, which lives or dies by its first hires, diverges from year 6.
- **Retirement exposed a harness habit.** A college in the red did not
  replace a retiree, since its restaffing waited on a cash buffer. From
  year 30 its catalogue went unstaffed, enrollment fell, and the deficit
  deepened: the rush fell to 164 students by year 50. A player replaces a
  retiree, whose successor's salary replaces the one that left. The
  harness now does too (`restaffOrphans`, a credit per retirement that
  skips the buffer).
- **The rush now has two fates by seed.** It recovers into a large college
  at 7, 12346 and 12347, and stays a small one near break-even at 12345
  and 2024. On Plan 28 the default seed already ended year 40 at −$0.1M.
  Its three year-40 recovery claims are judged across seeds, as its net
  claim already was.
- **Retirement returns the seniority premium,** so a long-running college's
  late payroll falls. The Balanced builder's year-50 margin rose from 8%,
  14% and 25% on the three seeds to 26%, 32% and 13%. The hand-written
  target's ceiling moves from 30% to 40% with a note, and Phase N
  rebalances the late margin (V1-25).
- **The Overbuilder stalls lower.** Its early hires retire from year 25
  into a college in receivership that is also cutting its payroll. At
  4242 it bottoms out in year 35 at 297 students and prestige 24, then
  recovers to 407 and 27. Its hand-written floors move:
  - year 35: 250 students and prestige 20;
  - years 35 and 50: a −60% margin;
  - year 50: prestige 25.

  It still stalls rather than dies. The regression's "stall, don't die"
  claims pass unchanged.
- **The reference bands are re-recorded.**
