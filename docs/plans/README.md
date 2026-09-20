# UniSchool — Plans

A **plan** is a document that takes a pile of notes, an audit, or a brief, and
turns it into an ordered sequence of PRs — each one small enough to land on its
own, each one landing in the order that makes the next one cheaper. Writing one
is how work gets started here.

Almost everything in this folder is a **closed record**. A plan is not a to-do
list and never was: by the time a plan reads `Landed`, the work is in `main`.
The one exception is a plan still reading `Proposed` — the sequence has been
written but no PR has landed — which lives here from the day it is written,
because the sequencing IS the record of the thinking and it is no use filed
anywhere else. A plan that is `Superseded` stays too, unedited below its status
line, for the same reason: Plans 10–13 are the thinking that Plans 14–17 came
out of, and what each one got wrong is recorded in the status line of the plan
that replaced it. Work that has not been sequenced at all lives in `BACKLOG.md` at
the repository root, and the game as it actually is lives in `docs/design/` and
`docs/architecture/`. Three tenses, three homes.

## The plans

| | Plan | Covered | Status |
|---|---|---|---|
| 01 | [Design alignment](01-design-alignment.md) | Making the game execute the intended design, and README an accurate spec of it. PRs A–H. | Landed |
| 02 | [The academic core](02-academic-core.md) | Curriculum, course quality, the faculty roster and research becoming one loop. PRs A–G. | Landed |
| 03 | [Campus assets](03-campus-art.md) | One scale, one detail vocabulary, and a correct depth sort for the campus map. PRs A–G, plus F2 and G2. | Landed |
| 04 | [The shell, research, the roster, and the site](04-shell-research-roster-site.md) | Four phases from a page of playtest notes: the shell, research end to end, the roster, campus art. 23 PRs. | Landed |
| 05 | [Summer admissions](05-summer-admissions.md) | Reworking the annual admissions decision: per-class tuition, scholarships retired, admit rate promoted to a decision, and the reveal. PRs A–G. | Landed |
| 06 | [Enrollment](06-enrollment.md) | The enrolled body's cohort mix, stored per class at admission; Admissions becomes Enrollment and grows the infographic. History untouched. PRs A–E. | Landed |
| 07 | [The startup screen, and the campus vernacular](07-startup-and-vernacular.md) | Retiring the private/public fork, giving the campus a chosen architectural vernacular, and making the founding facade Founders Hall. PRs A–K. | Landed |
| 08 | [Athletics, and the field it plays in](08-athletics-rivals.md) | Athletics V3 and Rival schools as one sequence: a hundred-school field, standing split into three ranked axes, per-sport strength, four more sports, an athletic director, and a playoff whose titles are the first thing athletics moves. Two phases, PRs 1A–1C and 2A–2G. | Landed |
| 09 | [The playtest harness](09-playtest-harness.md) | Scenarios, a debug panel behind a flag, the prestige breakdown, and a sim scorecard with reference bands — the instrumentation the design changes are measured with. PRs A–F. | Landed |
| 10 | [Growth has a cost](10-growth-has-a-cost.md) | Prestige as an asymmetric stock, instruction cost per section, an interim intake ceiling, attrition. | Superseded by Plan 15 |
| 11 | [Academic halls](11-academic-halls.md) | Halls with one room per program, developed continuously from the room's roster. | Superseded by Plan 14 |
| 12 | [The year](12-the-year.md) | The summer as four beats, year-over-year on the reveal, modal widths, a scripted first year, toasts. | Superseded by Plan 16 |
| 13 | [The endpoint](13-the-endpoint.md) | A fifty-year run with ambitions, a legacy and an elite band that closes. | Superseded by Plan 17 |
| 14 | [The curriculum on the map](14-curriculum-on-the-map.md) | Repeatable halls with six program slots, one hall to a school; programs offered three at a time instead of forty-two at once; every course keeps its instructor choice and `Develop N` retires; the Curriculum tab becomes forty-two colour-coded rows with drag-and-drop faculty. PRs A–I. | Landed |
| 15 | [Growth has a cost](15-growth-has-a-cost.md) | Prestige as an asymmetric stock with a summer report card and a concentration term, instruction per section, seats from housed courses as the ceiling, attrition, research that produces something — and one re-fit against the scorecard. PRs A–H. | Landed |
| 16 | [The year](16-the-year.md) | The summer as four beats (review, standing, admissions, students), year-over-year on the reveal, a fourth gear and no skip, three modal widths, a scripted first year, toasts. PRs A–H. | Landed |
| 17 | [The endpoint](17-the-endpoint.md) | A fifty-year run in three eras — found, build, defend — with ambitions, a six-axis legacy, the semicentennial report, an elite band that closes on the leader, and a balance target where completionism is one good run among four. PRs A–G. | Landed |
| 18 | [The look](18-the-look.md) | The Varsity register: the school's own colours as the theme, cream and outline ink around them, two self-hosted typefaces, chips and hard offsets, a labelled tab bar — one token layer, then one screen per PR. PRs A–G. | Landed |
| 19 | [The founding college](19-the-founding-college.md) | Retiring the general-education core and the school that holds it: Founders Hall becomes an ordinary six-slot hall, the college opens already teaching three programs, and the first year is a choice between depth and breadth. PRs A–G. | Proposed |
| 20 | [The catalogue](20-the-catalogue.md) | What the course data *says*: two prereq bridges that hide a whole school behind a capstone, 108 research topics no facility can host, 336 course descriptions written by eight templates, and the graduate programs four schools do not have. PRs A–I. | Proposed |
| 21 | [The season](21-the-season.md) | Athletics re-aimed rather than re-imagined: the outputs that terminate in readings get outlets (the legacy, the applicant pool, the gate, a real cost), a handful of dated occasions a year give the department weeks instead of one week, and the mascot moves a decade earlier while the fuse to the first team stops being a coin flip. Three phases, PRs A–J. | Proposed |

## Naming

```
docs/plans/NN-subject.md
```

- **`NN`** — two digits, assigned in the order the plan was *started*, never
  reused and never renumbered. It is the plan's permanent handle: "Plan 04's 4A"
  is a citable reference, and a filename that sorts is a folder that reads in
  order.
- **`subject`** — short, kebab-case, and about the *area of the game*, not the
  kind of document. `campus-art`, not `campus-art-plan`; the folder already says
  plan, and a suffix that repeats the folder is noise.
- **No `ROADMAP`, `SPEC`, `DESIGN`, `TODO` or `NOTES`.** One word for this kind
  of document, and it is *plan*. A second word invites a second convention.

## Shape

Every plan opens with the same three things, in this order:

```markdown
# Plan NN — Subject in sentence case

*Planning document only — no gameplay code is changed by this file. Its job is
to <what this plan is for>.*

**Status: Landed.** <what shipped, and where the implementation departed>
```

`Status:` takes one of exactly four values:

| Value | Means |
|---|---|
| `Proposed` | Written, not started. Lives here anyway — a plan nobody has started is still the record of the thinking. |
| `In progress` | Some PRs have landed. Say which. |
| `Landed` | All of it shipped. |
| `Superseded by Plan NN` | Abandoned or absorbed. Say which plan took over. |

## Two rules that make these worth keeping

**Record deviations in the PR that deviated.** A plan is written before the work
and is therefore wrong in places. When the implementation departs from it, the
departure goes in an **`**As implemented:**`** note attached to the PR it
belongs to — not into a changelog at the bottom, and not by quietly editing the
plan to match what was built. Plan 04 has eight of these, and they are the most
useful thing in it: they are the record of what the planning got wrong.

**Do not edit a landed plan to keep it current.** Its value is that it says what
was believed at the time. If the world has moved, that belongs in the design
and architecture docs, in `BACKLOG.md`, or in the next plan.
