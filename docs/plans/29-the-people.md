# Plan 29 — The people

*Planning document only. Its job is to turn Phase H of the v2 merge
(people, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a sequence
of PRs.*

**Status: In progress.**

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

## PR 29C — Retirement

- **Every professor has a career length,** rolled from their id: 25 to 40
  years. A year before it ends, the log gives notice. At the end they
  retire, and their courses wait for a new instructor.
- **The retiring professor's year** is a chance to hire before they go.

## PR 29D — The Faculty tab, scanned

- **Only the fields the college has developed are shown:** those with a
  course offered, a professor on the roster or a program housed. "Show
  every field" opens the rest.

## PR 29E — The admissions projection

- **The summer's admissions panel** gets one line: the expected entering
  class against the beds and dining seats it will need, and last year's
  class.

## PR 29F — Expectations

- **Rising expectations:** what satisfies a student rises with the
  college's prestige. Each attribute's target ratio tightens as prestige
  climbs.
- **Diminishing returns above 80:** satisfaction above 80 counts half.

## PR 29G — The Students tab

- **Student Life and Enrollment become one tab, Students,** with sections
  for the body (enrollment and the funnel), what students think
  (satisfaction and demands), and their societies (clubs and Greek life).
  The gates of both tabs carry over.

## PR 29H — Demands in the panel

- **A demand arrives as a note that does not stop the clock,** with its
  deadline and what happens if it is missed. The Students tab keeps it in
  view until it is met or lapses.
