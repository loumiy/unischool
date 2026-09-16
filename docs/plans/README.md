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
anywhere else. Work that has not been sequenced at all lives in `BACKLOG.md` at
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
| 07 | [The startup screen, and the campus vernacular](07-startup-and-vernacular.md) | Retiring the private/public fork, giving the campus a chosen architectural vernacular, and making the founding facade Founders Hall. PRs A–K. | Proposed |
| 08 | [Athletics, and the field it plays in](08-athletics-rivals.md) | Athletics V3 and Rival schools as one sequence: a hundred-school field, standing split into three ranked axes, per-sport strength, four more sports, an athletic director, and a playoff whose titles are the first thing athletics moves. Two phases, PRs 1A–1C and 2A–2G. | Proposed |

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
