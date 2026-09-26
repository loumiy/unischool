# Research

Research is **work the university commissions**, not a by-product of owning a
building. The player picks a topic, a team and a depth, out of a specific
facility; the dice then resolve *that*, rather than resolving everything. All
the randomness the old model had is still here and still does the same job —
what changed is which end the player touches.

**What this replaced, and why.** Scholarship used to be a bank: every faculty
member in a school with a finished lab trickled points into one campus-wide
pool (`s.research.points`), and the pool occasionally bought an output. It
produced research because the school OWNED A BUILDING, with no decision
anywhere in it. The stock is now dead state — kept in the saved shape, written
by nothing, marked not to be rewired, the way `Faculty.morale` was. **Idle
capacity produces nothing**: the way to produce is to start something.

### The facility is the slot

Each research facility hosts **one initiative at a time**, and that is an
invariant of the data shape rather than a rule anybody enforces:
`s.research.initiatives` is keyed by the facility's Buildable id, so a second
one cannot be started there without overwriting the first. It also scales
itself — thirteen facilities exist across the catalogue, so a young school runs
one project and a mature one runs a dozen, with no separate tuning.

**Every school can now do research.** The nine lab-science and engineering
facilities are joined by one apiece for the four schools that had none — an
Experimental Economics Lab, a Computing Research Center, a Humanities Research
Institute, a Media Production Studio (`techData.ts`'s
`LAB_GATED_MAJOR_PREFIXES`, with `RESEARCH_FACILITY_NAMES` for the ones where
"Labs" would be wrong: a history department has an institute with archives in
it). They run on identical machinery — no second kind of research — and since
one facility equips the whole school, every field that school teaches comes
into production behind it. What differs is **vocabulary**, not mechanics. A model
that can only describe research as laboratory science is one that quietly
tells four schools their work does not count, so `DISCIPLINE_VOCAB` authors
**three** things per school, not one:

- **The output nouns and the verb.** The humanities publish monographs and
  landmark works of scholarship; business publishes case studies and influential
  studies; the arts show exhibited works and acclaimed works, and are *shown*
  rather than published, because a film that "has been published" is the same
  mistake one word further along.
- **The funders.** Each discipline draws from a shared neutral pool — trusts,
  foundations, a federal research council — plus its own: the National Science
  Foundation and a defense research agency for the lab sciences, the National
  Endowment for the Humanities and a library fellowship for the humanities, an
  arts council and a film fund for the arts.
- **The prize names.** Same shape: four discipline-neutral names everybody can
  win, plus one of the discipline's own. A history department does not win an
  award for Scientific Achievement.

**The vocabulary follows the facility the work is running in**, not the campus.
That is the only reading that makes sense — an initiative *is* a topic, a team
and a facility, and the facility is the half of it that has a school
(`facilitySchool`). An earlier pass drew the school campus-wide, weighted across
everyone producing research, which was right under the old model where
production genuinely was the whole roster trickling into one pool; against
initiatives it meant a project in the Humanities Research Institute logged "a
new paper" whenever the campus also ran physics labs.

### Topics, teams and depth

**249 authored topics** (`researchTopics.ts`) — six per department, plus **73
cross-disciplinary** ones that name more than one field and can only be staffed
by drawing somebody from each. What is on offer at a vacant facility is
**derived, never stored**: a deterministic function of the facility's id and a
slowly-turning quarterly epoch, so the list is stable across renders and still
turns over every few months. A topic is only offered when the university can
actually staff it.

**The pool belongs to the FACILITY, not to its school.** A topic is offerable
where the facility's own field is among the fields the topic names (`labFields`,
`initiativeOffers`), so a project always belongs to the place it is happening —
the alternative, a school-wide pool, is what once offered "Acoustics of
Performance Spaces" to an aerospace lab. A cross-disciplinary topic is offerable
in each of the labs it names and in no others, and the two pairs of facilities
that share a field (chemistry / chemical engineering, physics / aerospace) keep
their halves apart through an optional per-topic facility list.

Only **eleven** of the twenty-nine faculty fields have a facility of their own.
The other eighteen lead work **in the building their school built** (Plan 20's
hosting rule, `techData.ts`'s `hostableFields`): a facility hosts its own field
and every field its school teaches that has no facility *anywhere*, so the
Computing Research Center runs the AI department's projects and the Humanities
Research Institute the English department's. "No facility anywhere" is read
campus-wide, which matters twice over — a field with a building somewhere is
hosted there and nowhere else, so the Neuroscience labs are not offered
Biology's work merely because the MD's anatomy course makes Biology a Health
Science field; and a field with no building is hosted by every school that
teaches it, so English is offered in both the institute and the studio,
Mathematics in both the Science labs and the computing center, Operations
Research in both Business and Engineering, which is where those departments
actually work. The rule does not reopen the shared-field bug: a shared field
*has* a facility and is never widened, and the two pairs keep their per-topic
lists. Every one of the 249 topics is therefore offerable somewhere, and the
topics test pins it; before the rule, 108 departmental topics were reserve
content no facility could host. Each facility has at least **eight**
interdisciplinary topics, the ceiling on its landmark work, which the same
test holds.

Four depths, and the money is the smaller half of what they cost:

| Depth | Scholars | Duration | Up-front funding |
| --- | --- | --- | --- |
| Pilot Study | 1 | 6 months | 0.4 weeks of opex |
| Funded Project | 2 | 18 months | 1.0 weeks |
| Major Program | 3 | 3 years | 2.2 weeks |
| Landmark Program | 4 | 5 years | 4.0 weeks |

Funding is sized in **weeks of operating cost**, the same scaling device grants
and the decision-event table use, so the figure stays sane across four orders
of magnitude of budget. A **Landmark Program requires a cross-disciplinary
topic**, which is the structural point of the tier: the most prestigious work
in the game is out of reach for a single strong department however deep it
goes.

**Research is staged** (Plan 53). The first three depths are open from the
first lab. Two letters lead the way (Plan 59): *The laboratories*, when
the first lab stands, asks for an initiative seen through in every lab; *The
Research Park*, when the park opens, asks to site it. The next-step line
names a lab that has not yet seen one through before any other idle lab.
The Landmark Program opens with **the Research Park**, a capital
project that itself waits on every standing lab having seen an initiative
through (`s.research.finishedLabs`, recorded when one ends uncancelled): a
college earns its landmark work by doing research everywhere it can first.

**Participants teach a reduced load for the duration.** `effectiveCourseSlots`
subtracts `RESEARCH_COMMITMENT_SLOTS` (2) with a floor at zero, so a junior hire
with two slots stops teaching entirely while a senior professor keeps most of
their catalogue — which makes WHO you commit a real choice rather than a uniform
tax. This is the one place the two loops compete for the same people.

Only the **excess** moves. Each member sheds courses lowest tier first, so a
professor on a five-year programme keeps the capstone and hands away the survey
course, and each shed course is then offered to any colleague in the field with
room — the same `eligibleInstructors` list the Curriculum tab's assignment panel
uses, strongest teacher first, highest-tier course first. What nobody can cover
goes unstaffed. `planCommitmentCoverage` works all of that out before anything
changes, so the warning the Research tab shows before the click and the
reassignment the reducer performs after are the same arithmetic.

### What a run produces

Weekly output is `Σ facultyResearchOutput × depth intensity ×
interdisciplinary bonus × researchRateMultiplier` — every term something the
player chose: who is on it, how deep they committed, what the campus has built.
The **interdisciplinary bonus** (+18% per extra field on the team) is why
breadth pays off twice: a team drawn from several departments produces
meaningfully more than the same people would apart, which is what makes a wide
university worth building rather than a deep one worth drilling.
`researchRateMultiplier` is live-read off every finished Buildable carrying
`effects.researchRateBonus` (each facility; the research library that added
to it was retired in Plan 53) — that
field multiplies output, it never creates it.

**Output is guaranteed** (Plan 15's PR C). The weekly lottery that used to
draw an output at 0.5–3.4% a week is gone; three legible rules replace it:

- **Publications are banked.** Every week's output goes toward the next paper,
  and every `PUBLICATION_POINTS` of it publishes one — so a run's expected
  papers are a plain product of its output and its length, which is what the
  offer shows before the commitment. A Funded Project or deeper always
  publishes at least once, the concluding paper; a pilot publishes what it
  earned. A cheap, frequent output gives a school something to show from its
  first year, and gives the humanities an output that reads right.
- **A breakthrough is rolled once a year**, at each anniversary of the start
  and once more at the end, at `annualBreakthroughChance` — depth times team
  strength, capped — so a three-year program gets three real chances.
  Breakthroughs reach prestige **only through a capped input**: a count that
  `prestigeSystem.ts`'s `researchScore` reads as one clamped 0..1 input. It
  never writes `s.self.reputation` — that would be exactly the
  completion-bonus flow the prestige model exists to forbid.
- **Grants ride on publications.** Each paper has a one-in-five chance of
  bringing a grant with it -> cash, sized at 0.4–1.2 weeks of opex,
  **scaled by team strength**, so a grant is a thing the work did rather than
  a thing that happened, and **scaled by the run's depth**
  (`GRANT_DEPTH_SCALE`, Plan 70D). A grant is a welcome cheque, not a funding
  round; it must never become a second economy.
  - **Research is a modest profit:** over a run, every depth returns about
    twice its funding in grants on an ordinary team. A deeper run publishes
    far more per dollar (about 3×, 6× and 10× a pilot's papers per dollar for
    a Funded Project, a Major Program and a Landmark), so before Plan 70D a
    Landmark returned about five times its cost and a pilot under half: the
    natural line, which funds the deepest work, drew 5× its research spend
    back in grants while the guided player, funding pilots, lost money on
    research.
  - The pacing scorecard counts the natural line's lifetime grants over its
    lifetime funding (`research.funding`), in 1.7–2.3×.

**The odds are shown before the commitment.** Every offer carries
`initiativeOdds` — expected publications, the at-least-one-breakthrough chance
over the run's rolls, the award chance — computed off the same functions the
tick applies, so the card cannot promise a bet the run does not give. A player
committing three professors for three years is entitled to know it.

**Output reaches somewhere.** A breakthrough, and every fourth paper out of
one project, puts a scholar in the team's field on the candidate market with
a log line — a physicist saw your paper — and the applicant funnel's
research-oriented cohort reads what the labs have produced (publications at a
tenth, breakthroughs, prizes at three) beside the labs themselves.

**Team strength** is the mean research *stat* (0..100) plus 0.08 per point of
acclaim the team already carries, capped at 1.4. It is the research stat and
NOT `facultyResearchOutput`, which is points per week on a completely different
scale; confusing the two is silent, and did happen — see the note in
`researchData.ts`'s `teamStrength`.

### The award, at conclusion and nowhere else

A prize is no longer a weighted draw against a bank. It is **what a finished
piece of work is judged to have been**, rolled once when an initiative
concludes:

- **Gated on a breakthrough.** A run that banked none can never end in an award,
  however distinguished its team. This is why the breakthrough weight cannot be
  pushed too low: that would not make awards rare, it would make them
  impossible.
- **Then depth × team strength, with real noise.** Base odds run 1.5% for a
  pilot study to 45% for a landmark program, multiplied by
  `(0.15 + teamStrength)` — the team floor is small on purpose, so a strong team
  roughly doubles a weak one's odds at the same depth rather than the tier
  swamping the choice of who to commit.
- **The winner is drawn from the team**, weighted by their own output, so it
  usually but not always goes to the strongest person on it.

So a prize arrives with a named topic, a named team and five years behind it,
rather than out of a pool.

**The completion is the event, and the award is one of its results.** A
concluded project files a `research-complete` report — topic, facility, team,
years, publications, breakthroughs, grant income, and the award if it won one —
and that report is the modal. It used to be the other way round: a separate
prize interrupt stopped the clock for the trophy while five years of work passed
as a log line. Like a milestone the report is **queued**, not fired: the week a
project ends may already belong to the summer admissions decision, and only one
interrupt can be pending at a time. Everything in it has already happened —
outputs counted, grant money banked, the winner's premium applied — so a delayed
report never delays an effect.

Two things deliberately do not report. A **cancelled** project: winding one up
early is the player's own action and already logs, and a modal confirming what
the player just did is noise. And **a run that produced papers alone**, at any
depth: the most frequent interrupt in the game was a project concluding with
nothing to say — a quarter of every modal in a forty-year run — and a
one-paper report is still one. Only a breakthrough or an award stops the
clock. A papers-only run logs what it produced, and still appears in the
Research tab's history.

Finishing a run is worth something **in itself**, separate from whatever it
produced along the way: `INITIATIVE_COMPLETION_CREDIT` (0.3 / 1 / 2.5 / 6 by
depth) counts into `researchScore` for every non-cancelled completion.

The prize still needs the one extra `Faculty` field, **`acclaim`**. Teaching,
research and salary are all recomputed from potential + tenure on *every* tick,
so a permanent post-prize bump cannot hang on any of them — it would be erased
the following week. Both the salary curve and the research-output formula read
`acclaim` as an input instead.

**One survival from the old model.** `weeklyResearchPoints` still exists, but
as a reading of **capacity**, not a stock that accumulates: "how much research
could this campus be doing", consumed by the admissions funnel's applicant
appeal (`cohorts.ts`) and printed as the sim's `rsch/wk` column. Nothing banks
it any more.

**Research standing's breadth term** divides the fields with a lab by *every
field the university could research in* (`researchableFields`), not by the
count of schools — Plan 09 found it pinned at its maximum from the fourth lab
because a school teaches several fields, and Plan 15's PR C fixed the
denominator to what the sentence beside it always claimed.
