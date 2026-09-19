# Plan 17 — The endpoint

*Planning document only — no gameplay code is changed by this file. Its job is
to take the September review's finding that the run is over by year twenty of a
sandbox with no end — rank #1 in year 18, the last building in year 29, then two
decades of endowment campaigns — and turn the decision that followed it into an
ordered sequence of PRs: a fifty-year run with a sealed record, an ending that
legitimises more than one way to play, and a top of the table that has to be
held.*

**Status: In progress.** PRs A, B and C have landed. Depends on [Plan 15](15-growth-has-a-cost.md) for a
prestige that can fall and an economy that makes the fiftieth year cost
something, and on [Plan 16](16-the-year.md) for the summer sequence the final
report rides in. PRs A and D can start before either. Supersedes
[Plan 13](13-the-endpoint.md).

---

## 0. Fifty years, and the shape of them

"No win condition" was borrowed from a city builder, and a campus is not a city.
A city can sprawl for centuries; a university's arc is a human lifetime — a
founder's career, a generation of faculty, the first class returning for its
fiftieth reunion. Fifty years is the length of that story, and it is also, not
by coincidence, the length at which the review's completionist run had been idle
for two decades.

So the run gets a **semicentennial**: the fiftieth summer files a final report,
the record is sealed, and the game goes on as a sandbox for anyone who wants it
to.

**And the fifty years have three eras**, which is the thing this plan exists to
make true. [Plan 15](15-growth-has-a-cost.md)'s re-fit targets build-out ending
around **year 35**, not 50:

| Era | Years | What the player is doing |
|---|---|---|
| **Found** | 1–12 | The core, the first halls, the first schools. Money is tight, faculty is scarce, every slot is a commitment. |
| **Build** | 12–35 | The catalogue and the campus get made. Completing every school is *barely* possible in this window. |
| **Defend** | 35–50 | Little left to build, and the field closes on you. |

The defend era is the new risk and the new opportunity. The review's complaint
was twenty years of nothing; fifteen years of *holding* is only better if
holding is an activity. It is an activity for exactly one reason: Plan 15 made
prestige a number that can fall. PR D is what makes something push it down.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 17A | Ambitions: a record of named achievements with the year each was reached; a History checklist | — |
| 17B | The legacy model: six graded axes and a name, read off state at any moment | A |
| 17C | The semicentennial: the final report as the fiftieth summer's first beat; the sealed record; play continues | B, Plan 16A |
| 17D | The top has to be held: the elite band closes on the leader, and a rival that passes you says so | Plan 15B |
| 17E | The balance target: four archetypes finish, and completionism is one good run among them | B, D, Plan 15G |
| 17F | Founding and the History tab frame the fifty years | C |
| 17G | Docs | all |

---

## Open questions, settled before the first PR

**Does the game stop at fifty?** No. The report is filed, the legacy is sealed
into the record, and the clock keeps running. Nothing after year 50 changes the
legacy — the History tab shows it as "the record, sealed in the fiftieth year" —
but a player who wants to see the hospital finished can.

**Is there a score?** Six grades and a name, not a number. A single number
invites optimising one thing; six grades let a run be an A in research and a C
in campus life and be *called* something for it.

**Do the ambitions gate anything?** No. They are a record, like milestones
without the prestige. The review's H1 asked for objectives and consequences to
be clear; ambitions are the objectives, the legacy is the consequence.

**Does the defend era need new content to be interesting?** This plan bets that
it does not — that a closing field, a prestige that falls when the school coasts,
and a legacy still being graded are enough to make years 35–50 about holding
what you built. That bet is testable and PR E is where it is tested. If the
scorecard says a well-run school at year 40 has nothing to do and cannot lose,
that is a finding for the next plan, not a reason to invent a late-game system
here.

---

## PR 17A — Ambitions

- `s.ambitions: Record<AmbitionId, number>` — the year reached, written once,
  never revoked. Detected in `tickTech`'s milestone pass and at the summer
  boundary, by the shape `checkMilestones` already uses.
- The first set, authored in `data/ambitionsData.ts` with a name, a line and a
  detector: *A hall of your own* (the first academic hall beyond Founders) ·
  *A school founded* · *Every school founded* · *In the top fifty* · *In the top
  ten* · *First in the nation* · *A distinguished program* · *A distinguished
  school* · *A university* (the charter) · *A laboratory* · *A landmark program
  concluded* · *A prize* · *A professional school* · *A national title* · *A
  title in every sport fielded* · *Ten thousand students* · *Never in the red*
  (checked at year 50 only) · *A billion in the endowment* · *The whole
  catalogue* · *Fifty years*.
- The History tab gains an **Ambitions** panel: the list, greyed until reached,
  with the year. The log names each as it lands; none stops the clock — the
  milestone celebrations already cover the ones worth stopping for.

**As implemented:** detection is a weekly system (`tickAmbitions`, registered
after `tickRivals` so a rank is this week's) rather than a hook in the
milestone pass plus one at the summer boundary — half the list is about rank,
money, prizes and enrolment, which no milestone pass ever sees, and twenty
predicates over state the game already keeps cost nothing a week. The two
year-fifty ambitions read true on the one week the summer holds the clock on
year fifty, which is the week the final report renders. *Never in the red*
needed a record the game did not keep: `finance.weeksInTheRed`, counted by
`tickFinance` where cash settles, rather than a reading off fifty summer
snapshots that would miss a mid-year dip. The list is the plan's twenty;
"A landmark program concluded" excludes a cancelled one. Save version 63.

## PR 17B — The legacy

`legacy(s)`: six axes, each graded A–F from readings that already exist, and a
name chosen from the pattern of grades.

| Axis | Read from |
|---|---|
| Academic breadth | `curriculumBreadthScore`, plus the graduate share |
| Concentration | schools founded and distinguished — Plan 15's new prestige term, which is also the axis that tells a deep school from a wide one |
| Teaching | `campusAverageCourseQuality` and the share of A/B courses |
| Research | research credits, prizes, doctorates |
| Selectivity and reach | incoming quality, admit rate, applicant pool against prestige |
| Stewardship | years solvent, endowment per student, satisfaction's fifty-year average |

*(Campus life is deliberately **not** an axis. Plan 15 cut its prestige weight
because it cannot be earned — grading a run on it before athletics and student
life reach anything would grade every run the same. It becomes the seventh axis
in the plan that gives those systems an outlet.)*

Grades are banded against the reference bands Plan 15 sets: an A in breadth is
what the earnest completionist reaches at year 50; a C is what a balanced school
reaches. Names come from a small authored table keyed on the two strongest axes
and the weakest — *a great research university*, *the finest college in the
country*, *a place students never leave*, *an engine of the region*, *a school
that grew too fast* — and a dozen more. The name is flavour; the six grades are
the record.

**As implemented:** `state/legacy.ts`, a pure reading in the shape of
`yearInReview.ts`; the `Legacy` type lives in `types.ts` so PR C can store it.
Breadth, concentration and research read the standing's own functions
exactly (`curriculumBreadthScore`, `concentrationScore`, `researchScore`, the
last two newly exported), so the legacy cannot disagree with the prestige
model. Teaching is half the campus average on `courseQuality.ts`'s own floor
and ceiling, half the share of courses graded A or B. *Selectivity and reach*
is the **greater** of two readings rather than a blend — how selective the
school is (class quality and admit rate) or how far past its standing it
draws (the realised pool against the pool prestige alone would draw, off
`lastFunnel`) — because a selective college and a regional engine earn the
same axis two different ways. Stewardship is thirds: the share of weeks
solvent (PR A's counter), endowment per student against a reference a well-run
school reaches, and the students' average over every year on the books. The
bands are one table (`LEGACY_GRADE_BANDS`: A at 0.85, B 0.65, C 0.45, D 0.25)
and are what PR E fits. Twenty-one names in three tables — *great*, *sound*,
*troubled* — tested in that order with the troubled entries first, so a broad
school in the red is *a school that grew too fast* before it is anything
else; every one of the 5⁶ grade patterns finds a name, and `Legacy.table`
records which family it came from, which is what PR E asserts against.

## PR 17C — The semicentennial

- The fiftieth summer's first beat ([Plan 16](16-the-year.md)'s sequence) is the
  **final report** in place of the year in review: the six grades, the name, the
  ambitions reached with their years, the four numbers a founder would want
  (students taught in fifty years, faculty who served, prizes, titles), and the
  fifty-year curves from the History tab.
- `s.self.legacy` is written once, here. The History tab shows it sealed. Play
  continues; the sixtieth summer files an ordinary year in review.
- The sim's tally records the legacy so PR E can assert against it.

**As implemented:** the summer interrupt raised on year fifty carries a
`final` flag in its payload, so the modal and its width rule
(`modalLayout.ts`: the final report is a page) read it off the payload and a
save taken between beats still knows. The record is sealed at the top of
`RESOLVE_ADMISSIONS`, before the digest, the report card or the funnel touch
the school, so it is byte-for-byte the reading the beat displayed; the test
pins that identity. Two of the founder's four numbers needed a record the
game did not keep: `YearSnapshot.graduated` (the seniors each summer sends
out, so *students taught* is every class that left plus the body still here)
and `University.facultyServed` (counted at `appointFaculty`, the one door
onto the roster, seeded at the founding five). The History tab gains a
**Legacy** panel that shows the sealed record after year fifty and the same
reading taken live before it, labelled as what the school would be called
today, with a countdown to the report. `HistoryChart` was lifted out of the
tab into `components/HistoryChart.tsx` so the report draws the same curves.
The final report's fourth curve is rank rather than the catalogue: at fifty
the catalogue is a flat line for most runs and the rank is the story. Save
version 64.

## PR 17D — The top has to be held

This is the PR that makes the defend era an era.

- The elite band of rivals (`r6`–`r15`, authored 87–99) gains a term in its
  annual drift: a pull toward `max(own, player.reputation − 4)` at a rate that
  closes a ten-point gap in about five years. The player can still be first; the
  field arrives. Applied only above prestige 100, so the found and build eras
  are untouched.
- A rival that overtakes the player fires a **"passed"** line in the year in
  review and, once per rival, a decision event: a trustee proposes a response —
  a campaign, a chair, a facility — at a real cost.
- **Coasting has to be losable.** With Plan 15's asymmetric prestige, a school
  that stops maintaining welfare, lets crowding climb, or lets teaching quality
  decay will fall — and a closing field means falling now costs rank. That is
  the whole mechanism of the defend era, and it needs no new system.
- Deliberately no poaching here. That is the faculty-lifecycle plan, and it will
  read this drift when it comes.

## PR 17E — The balance target

The scorecard gains a fiftieth-year row and four assertions the sim runs at 50
years, each across three seeds:

- The **earnest completionist** finishes 90–100% of the catalogue and every
  building, founds every school, reaches #1 after year 30, and holds it in at
  least half of years 40–50. Ambitions: all but one or two.
- The **balanced builder** ends with a B or better in four axes and a legacy
  name from the "sound" table.
- A new **selective college** strategy — admit rate ≤ 15%, no growth past 4,000,
  two or three schools founded and finished rather than seven, every facility,
  deep research — ends with an A in teaching, concentration and selectivity,
  prestige within 15 of the completionist, and a legacy of its own.
- A new **regional engine** strategy — cheap, broad, big, no research — ends with
  an A in reach, a C in research, solvent, and a legacy of its own.

**The selective college is the assertion that matters**, because it is the one
that fails if Plan 15's concentration term is not pulling its weight. Four
archetypes finishing differently is not something constants can be tuned into;
it is something the prestige model either permits or does not. If this
assertion cannot be met by tuning, the finding belongs back in the prestige
model, not in the bands.

Constants move in Plan 15's PR G and here until all four hold. This is the PR
that makes "build everything" one good run among several rather than the answer.

## PR 17F — Framing

- The startup screen's eyebrow says what the game is: *"Fifty years to build a
  university."*
- The History tab's header counts down as well as up ("Year 23 of 50"), and its
  charts fix their x-axis at fifty so the curves have somewhere to go.
- The toolbar's clock is unchanged.

## PR 17G — Docs

`docs/design/gameplay.md` retires "no win condition" for "a fifty-year run with a
sealed record and a sandbox after it"; `progression.md` gains the three eras, the
legacy and the ambitions; `README.md`'s opening paragraph follows.

---

## What this plan does not do

- No faculty poaching, no retirement. That is the faculty-lifecycle plan, which
  now has PR D's drift, Plan 14's halls and Plan 15's market-rate salaries to
  read — every precondition it needs, and it should be the next plan written.
- No second campus, no expansion beyond the grid, no late-game sink beyond the
  endowment. If fifty years with Plan 15's costs still leaves a school rich and
  idle at year 40, that is a finding for the scorecard, not a feature to invent
  here.
- No multiple endings beyond the legacy name. Six grades and a sentence.
