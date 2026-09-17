# Plan 13 — The endpoint

*Planning document only — no gameplay code is changed by this file. Its job is
to take the September review's finding that the run is over by year twenty of
a sandbox with no end — rank #1 in year 18, the last building in year 29,
then two decades of endowment campaigns — and the decision that followed it: a
fifty-year run with a scorecard, an ending that legitimises more than one way
to play, and a top of the table that has to be held.*

**Status: Superseded by [Plan 17](17-the-endpoint.md).** The semicentennial,
the ambitions, the six-axis legacy and the closing elite band all carry over.
What changed is the arc underneath them: build-out now ends around year 35
rather than 50, so years 35–50 become an explicit *defend* era rather than a
taper, and the legacy's axes swap campus life — which cannot be earned until
athletics reaches something — for concentration, which Plan 14's founded schools
and Plan 15's prestige term make into a real measure of what kind of university
was built.

---

## 0. Fifty years, and what they are for

"No win condition" was borrowed from a city builder, and the response to the
review put the difference plainly: a city can sprawl for centuries; a campus
cannot. A university's arc is a human lifetime — a founder's career, a
generation of faculty, the students of the first class returning for the
fiftieth reunion. Fifty years is the length of that story, and it is also,
not by coincidence, the length at which the review's completionist run had
been idle for two decades.

So the run gets a **semicentennial**: the fiftieth summer files a final
report, the record is sealed, and the game goes on as a sandbox for anyone
who wants it to. And the fifty years get something to be measured by that is
not "did you build everything" — because Plan 10 is about to make building
everything in fifty years barely possible, and a run that chose to be a
small, selective, research-heavy college has to be able to finish proud.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 13A | Ambitions: a record of named achievements with the year each was reached; a History checklist | — |
| 13B | The legacy model: six graded axes, a legacy name, read off state at any moment | A |
| 13C | The semicentennial: the final report as the fiftieth summer's first beat; the sealed record; play continues | B, Plan 12A |
| 13D | The top has to be held: the elite band's drift is pulled toward the leader's level, and the field notices a stalled school | Plan 10B |
| 13E | The balance target: completionism is barely achievable; three other archetypes finish with a legacy of their own | B, D, Plan 10F |
| 13F | Founding and the History tab frame the fifty years | C |
| 13G | Docs | all |

---

## Open questions, settled before the first PR

**Does the game stop at fifty?** No. The report is filed, the legacy is
sealed into the record, and the clock keeps running. Nothing after year 50
changes the legacy — the History tab shows it as "the record, sealed in the
fiftieth year" — but a player who wants to see the hospital finished can.

**Is there a score?** Six grades and a name, not a number. A single number
invites optimising one thing; six grades let a run be an A in research and a
C in campus life and be *called* something for it.

**Do the ambitions gate anything?** No. They are a record, like milestones
without the prestige. The review's H1 asked for objectives and consequences to
be clear; ambitions are the objectives, the legacy is the consequence.

---

## PR 13A — Ambitions

- `s.ambitions: Record<AmbitionId, number>` — the year reached, written once,
  never revoked. Detected in `tickTech`'s milestone pass and at the summer
  boundary, by the same shape `checkMilestones` uses.
- The first set, authored in `data/ambitionsData.ts` with a name, a line and a
  detector: *A hall of your own* (first academic hall beyond Founders, or
  under Plan 11 the first dedicated hall) · *In the top fifty* · *In the top
  ten* · *First in the nation* · *A distinguished school* · *Every school
  distinguished* · *A university* (the charter) · *A laboratory* · *A landmark
  program concluded* · *A prize* · *A professional school* · *A national
  title* · *A title in every sport fielded* · *Ten thousand students* ·
  *Never in the red* (checked at year 50 only) · *A billion in the endowment*
  · *The whole catalogue* · *Fifty years*.
- The History tab gains an **Ambitions** panel: the list, greyed until
  reached, with the year. The log names each as it lands; none stops the
  clock — the milestone celebrations already cover the ones worth stopping
  for.

## PR 13B — The legacy

`legacy(s)`: six axes, each graded A–F from readings that already exist, and a
name chosen from the pattern of grades.

| Axis | Read from |
|---|---|
| Academic breadth | `curriculumBreadthScore`, plus the graduate share |
| Teaching | `campusAverageCourseQuality` and the share of A/B courses |
| Research | research credits, prizes, doctorates |
| Campus life | the social standing's inputs: organisations, titles, the social attribute |
| Selectivity and reach | incoming quality, admit rate, applicant pool against prestige |
| Stewardship | years solvent, endowment per student, satisfaction's fifty-year average |

Grades are banded against the reference bands Plan 10 sets (an A in breadth is
what the earnest completionist reaches at year 50; a C is what a balanced
school reaches). Names come from a small authored table keyed on the two
strongest axes and the weakest: *a great research university*, *the finest
college in the country*, *a place students never leave*, *an engine of the
region*, *a school that grew too fast*, and a dozen more. The name is
flavour; the six grades are the record.

## PR 13C — The semicentennial

- The fiftieth summer's first beat (Plan 12A's sequence) is the **final
  report** in place of the year in review: the six grades, the name, the
  ambitions reached with their years, the four numbers a founder would want
  (students taught in fifty years, faculty who served, prizes, titles), and
  the fifty-year curves from the History tab.
- `s.self.legacy` is written once, here. The History tab shows it sealed.
  Play continues; the sixtieth summer files an ordinary year in review.
- The sim's tally records the legacy so PR E can assert against it.

## PR 13D — The top has to be held

- The elite band of rivals (`r6`–`r15`, authored 87–99) gains a term in its
  annual drift: a pull toward `max(own, player.reputation − 4)` at a rate
  that lets them close a ten-point gap in about five years. The player can
  still be first; the field arrives. Applied only above prestige 100, so the
  early and mid game are untouched.
- A rival that overtakes the player fires a **"passed"** line in the year in
  review and, once per rival, a decision event: a trustee proposes a response
  (a campaign, a chair, a facility) at a real cost.
- Deliberately no poaching here. That is the faculty-lifecycle plan, and it
  will read this drift when it comes.

## PR 13E — The balance target

The scorecard bands from Plan 10 gain a fiftieth-year row and four assertions
the sim runs at 50 years, each across three seeds:

- The **earnest completionist** finishes 90–100% of the catalogue and every
  building, reaches #1 after year 30, and holds it in at least half of years
  40–50. Ambitions: all but one or two.
- **Balanced builder** ends with a B-or-better in four axes and a legacy
  name from the "sound" table.
- A new **selective college** strategy (admit rate ≤ 15%, no growth past
  4,000, every facility, deep research in three labs) ends with an A in
  teaching and selectivity, prestige within 15 of the completionist, and a
  legacy of its own.
- A new **regional engine** strategy (cheap, broad, big, no research) ends
  with an A in reach, a C in research, solvent, and a legacy of its own.

Constants move in Plan 10's PR F and here until all four hold. This is the PR
that makes "build everything" one good run among several rather than the
answer.

## PR 13F — Framing

- The startup screen's eyebrow says what the game is: *"Fifty years to build
  a university."*
- The History tab's header counts down as well as up ("Year 23 of 50"), and
  its charts fix their x-axis at fifty so the curves have somewhere to go.
- The toolbar's clock is unchanged.

## PR 13G — Docs

`docs/design/gameplay.md` retires "no win condition" for "a fifty-year run
with a sealed record and a sandbox after it"; `progression.md` gains the
legacy and the ambitions; `README.md`'s opening paragraph follows.

## What this plan does not do

- No faculty poaching, no retirement. Those are the faculty-lifecycle plan,
  which now has the drift in PR D and the halls in Plan 11 to read.
- No second campus, no expansion beyond the grid, no late-game sink beyond
  the endowment. If fifty years with Plan 10's costs still leaves a school
  rich and idle at year 40, that is a finding for the scorecard, not a
  feature to add here.
- No multiple endings beyond the legacy name. Six grades and a sentence.
