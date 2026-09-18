# Prestige, rankings, and the institution's arc

How a school is founded, how standing accumulates, and how the outside world
reports on it.

## Startup

A **startup screen** asks the player two things before play: the **name** of
the school — their half of it only; every school opens as a *College* (see
"College, and University" below) — and the **vernacular** its campus is built
in.

## The vernacular

Which architecture the campus was founded in: **Georgian** (red brick, white
trim, a gilded cupola), **Collegiate Gothic** (grey ashlar, steep slate, a
spire), **Mission** (cream stucco, red tile, arcades and a campanile) or
**Brutalist** (board-marked concrete in stacked slabs, and no ornament at
all). Chosen at founding and **permanent** — a campus's architecture is what
it was built as, so nothing ever offers to change it.

It is deliberately the one thing on that screen with **no mechanical effect
whatsoever**. Every founding condition is identical across the four, and no
system reads `self.vernacular` except the map. That is what makes it a safe
question to ask before the player knows anything: it cannot be the wrong
answer. It is also why it does not contradict the rule below — you are
choosing what your campus *looks* like, not what kind of school it becomes.

**Six of the eleven building motifs do not vary**, and that is true of real
campuses rather than a shortcut: a Gothic university's gym is still a
clear-span shed, its teaching hospital is still a modern hospital, and its
5,000-bed apartment tower still postdates the founding quad by eighty years.
So the vernacular reads loudest on a young campus — where almost everything
is a hall, a dorm or a dining room — and dilutes as labs, venues, towers and
the hospital arrive, which is roughly what happens to a real campus's
founding architecture. See `components/buildingSpec.ts`'s `VERNACULARS` for
the sets and `VERNACULAR_INVARIANT_MOTIFS` for the six.

**Archetypes emerge, they are not chosen.** The game should let different kinds
of successful school (Harvard-like, ASU-like, Johns-Hopkins-like) arise from the
player's choices over time, rather than being selected up front. Every founding
condition is the same for every school and lives in one `FOUNDING_PRESET` (see
`data/foundingData.ts`); everything that distinguishes one run from another
happens in play. (Later: save/load, color schemes, more customization.)

**There used to be a second question — private vs. public — and Plan 07
retired it.** It is worth recording what it was, because it is the clearest
case the project has of a decision that looked structural and was not:

- A **tuition ceiling**, $22,000 public against $100,000 private. The low cap
  was the real mechanic; the high one had already been raised out of reach.
- A **state appropriation**, a flat $7,000/week grant plus $5,500 per enrolled
  student per year. It existed to compensate for the cap.
- Three **opening dials** — starting cash, starting prestige, applicant-pool
  size.

The first two were one mechanic wearing two hats: the subsidy's entire job was
to offset the cap, so removing either left the other with nothing to do. What
remained was the third bullet, which is not a different kind of school but the
same school with its dials nudged — asked at the one moment a player knows
least about what those dials do. The fork was the single place the game
contradicted "archetypes emerge, they are not chosen", and it no longer does.

A note on what the removal cost, since it was measured rather than assumed:
the appropriation turned out to be an *early-game* mechanic. It was funding the
first decade's curriculum build-out, which is the 90-weight prestige term, which
then compounds — so the public arc in `sim/balanceSim.ts` ended year 20 some 30
prestige points lower without it, while never becoming insolvent. Nothing
replaced it.

## Prestige: a slow-moving stock

`self.reputation` ("prestige") is a **stock**, not a flow: it is never
incremented directly by completing a course, a building, or a milestone — there
is no snappy "finish a course, get a prestige bump." Instead, **once a week**,
prestige drifts a small fraction of the way toward a target computed from durable
inputs — see `src/systems/prestige/prestigeSystem.ts`. It never jumps to the
target: a long-established school's prestige is sticky and does not evaporate the
moment growth stalls, but it can move gently week to week rather than sitting
frozen all year between summers. The drift runs **weekly**, in the `SYSTEMS`
array (`prestigeSystem.ts`'s `tickPrestige`), at a rate sized to preserve the
old ~12%-per-year stickiness; the admissions-derived input below changes
only at the summer boundary, while every other input can move any week. The
inputs:

- **curriculum breadth** — majors/schools completed *right now* (a stock read
  off the milestone booleans — see [curriculum.md](curriculum.md)) plus the
  **graduate programs** founded on
  top of them, not courses added this year. The four shares inside this one
  input sum to 1, so finishing everything scores exactly 1 and graduate work
  raises no ceiling — it occupies the last 0.15 of the one that already
  existed (see [graduate-programs.md](graduate-programs.md)).
- **teaching quality** — the campus average course grade (see
  [faculty.md](faculty.md)'s "Course quality"). Its own input, not a multiplier
  on anything: a school teaching twenty courses beautifully in its first decade
  is credited for them, years before any milestone gate opens.
- **incoming student quality** — the average quality of the class that actually
  enrolled that cycle.
- **research standing** — what the university's research has actually
  produced: publications, breakthroughs, prizes, doctorates, and a credit for
  every initiative carried to completion (see [research.md](research.md)). A
  monotone
  count of the same shape as curriculum breadth, weighted small and clamped like
  every other input.
- **campus life** and **financial resources per student** (endowment measured
  against capacity) — two smaller inputs; the second is what the late-game
  endowment campaigns buy.

**Faculty quality is no longer an input of its own.** It used to average every
hire's teaching and research straight off the roster, which was the right
reading while that was the only way either stat reached prestige. Both have a
job now, and each arrives through the work it actually does — teaching through
the grades its courses earn, research through what its initiatives produce — so
the old input was paying a third time for the same people. *Retiring it broke
the game before it fixed it:* deleting the term and spreading its weight across
the survivors sent a forty-year run from prestige 145 to 63 and from 421 courses
to 212. The ceiling was unchanged; *when* it could be earned was not, and that
traced to a real flaw rather than a tuning error — course quality reached
prestige only as a multiplier on breadth, and breadth is milestone-gated.
Teaching quality became its own input and breadth went back to breadth ×
library. Recorded in `docs/plans/02-academic-core.md` §6b so it is not re-attempted.

Each input is clamped to its own 0..1 share of the target before being
weighted, and the admissions-derived input (incoming student quality)
is additionally scaled by how big the enrolled class is — being selective with
a class of 200 is a boutique, not a national university, and without that a
school that built nothing at all could drift into the top of the rankings. This
is what keeps the prestige/quality feedback loop from spiraling: student quality alone can only push prestige to a
fixed ceiling (reachable by staying small and cutting tuition), and climbing
past that ceiling toward the very top of the rankings requires the curriculum-
breadth term too — i.e. sustained, decades-long buildout, not an early
course-development sprint.

**The player can see all of this.** The History tab opens with a **Standing**
section — one panel per standing, one row per input, each row a bar of what that
input is *worth* against the weight it could reach, the two multipliers named on
the rows they touch, and today's stock against the target it is drifting toward.
It is read off `prestigeSystem.ts`'s `prestigeBreakdown` /
`researchStandingBreakdown` / `socialStandingBreakdown`, and **each target
function is a sum over its own breakdown**, so the panel cannot disagree with the
tick that produced the number. The rows are data: an input that is added, retired
or reweighted changes that one file and the panel follows.

**The summer report card (Plan 15's PR B).** Academic standing no longer
drifts weekly toward its target. At the admissions boundary the inputs are
graded for the year just ended and summed into a **year score**; prestige then
steps toward that score by a share of the gap — `PRESTIGE_RISE_RATE` (0.12)
above it, `PRESTIGE_FALL_RATE` (0.40) below. A school whose grade drops thirty
points loses twelve the first summer and seven the next; climbing back takes
the better part of a decade, and the climb is unblocked. Between summers a
weekly tremor, a tenth of the old drift, keeps the toolbar number alive. Three
terms joined the budget: **concentration** (30, out of breadth's 90 — how deep
the deepest school is, founded and distinguished), **welfare** (20 — the year's
average satisfaction, scored from 40 to 80) and **crowding**, a *penalty* of up
to 25 — the worst of the five coverage ratios and the instruction-capacity
ratio, averaged over the year as a shortfall below 90%, which can take a school
below what its curriculum earned. Campus life and endowment fell to 8 each.
The Standing panel shows last summer's grade beside each input, and the one
remaining **reading** under them — **instruction capacity**, the seats the
housed catalogue can teach (developed courses in housed programs at
`SEATS_PER_COURSE` each) — is the ceiling Plan 15's PR E turns into a cap. See
[`../plans/15-growth-has-a-cost.md`](../plans/15-growth-has-a-cost.md).

**Direct-mutation audit.** `self.reputation` is written in exactly three places,
and all three are intentional. (1) **Founding** sets the opening value
(`BASE_STARTING_REPUTATION + preset.prestigeBonus + GENED_BUILDING_REPUTATION_BONUS`
in `actions.ts`) — a one-time initialization, not a gameplay bump. (2) The
**drift** in `prestigeSystem.ts` moves reputation toward the computed target on
its regular cadence — as does that same file's `setPrestigeForPlaytest`, the
debug panel's "set prestige" (see
[`../architecture/playtesting.md`](../architecture/playtesting.md)), which lives
there rather than in the reducer precisely so this audit stays a *file*-level
one, and which clamps to the same band the drift does. (3) **Rivals** write their
*own* `reputation`
(`rivalsSystem.ts`), never the player's. Nothing else touches it: research,
student life, decision events, satisfaction and rankings all read prestige and
never write it. In particular, **being ranked does not raise prestige** —
rankings are a measurement *of* prestige (see "Rankings"), a strictly one-way
read. Any future change must preserve this: prestige is composed from inputs, it
is not a running tally of bonuses.

## Three standings

A school is ranked on **three** numbers, not one. All three are stocks of the
same shape — a target computed weekly from durable inputs, drifted toward at
`PRESTIGE_DRIFT_RATE`, clamped to the same band — and all three live in
`prestigeSystem.ts`, which is what lets one file hold every writer of any of
them.

| Standing | Field | Composed from |
|---|---|---|
| Academic | `reputation` | Curriculum breadth (×library adequacy), teaching quality, incoming student quality (×admissions scale), research output, campus life, endowment per student |
| Research | `researchStanding` | What the labs have produced, and how many fields the school can research in at all |
| Campus life | `socialStanding` | Social facilities, student organisations, **varsity athletics**, and the `social` satisfaction attribute |

**The academic number was not decomposed, and this is not that.** The earlier
direction here was to split `reputation` into underlying components; what
happened instead is that two more standings were added *beside* it. The reason
is that `reputation` is what the economy reads — `admitRate`, the applicant
pool, price tolerance, every recorded `YearSnapshot`, and
`sim/balanceSim.ts`'s strategies — so a decomposition moves all of them at
once. `computePrestigeTarget` is untouched by the three-standings change, and
the sim's forty-year trajectories are byte-identical across it.

**The new standings are readings, never inputs.** Nothing in
`computePrestigeTarget` reads either one, and no system reads either back into
a decision. This is the same one-way rule rankings already follow, extended to
cover all three, and `test/invariants.test.ts` asserts it rather than trusting
it: every writer of all three stocks is confined, and the academic target is
checked for any mention of the other two.

**This is where athletics finally reaches a standing.**
[student-life.md](student-life.md) records that athletics touches satisfaction
and "never prestige directly; if athletics should eventually touch prestige,
that is a separate prestige-model decision, flagged rather than wired." That is
the decision, made in the narrow shape it was flagged in: a varsity program
moves **campus-life** standing, which no system reads back. The headline number
athletics is forbidden to touch remains untouched.

Rivals carry the same three fields under the same names — which is what lets
one `rankedListBy(axis)` serve every leaderboard — seeded by a deterministic
spread off each school's own id and drifted annually on independent momentum,
so the three tables tell different stories. A school can be an academic power
and an athletic minnow, or a modest college that is a wonderful place to spend
four years.

Each axis's drift runs on its own generator, all three seeded from a single
global draw. That keeps the field's whole annual pass at one draw however many
axes it grows — and, because the academic stream is then untouched by the
others, adding a standing cannot perturb the trajectory the balance harness
measures.

## Rankings: the U.S. News report

The field is **100 schools** — the player's, and 99 rivals (`rivalData.ts`) —
so a **top 50** is the upper half of a real one rather than a near-certainty.
Rival prestige **fluctuates dynamically** year to year rather than sitting
static while the player grows. **Rankings are a measurement *of* prestige, not a
driver of it:** entering or climbing the rankings never itself raises the
player's prestige (see the prestige direct-mutation audit), and rivals stay
deliberately lightweight — a dynamic scoreboard whose relative standings shift,
not a strategic AI that reacts to the player.

**The field is authored in two bands, and the split is what makes both halves
work.** The first 55 span reputation 45 to 99, all of them above a founding
school; the other 44 are a **tail** deliberately authored *below* that floor.
Growing the field without that discipline would have changed what rank 50 means
— six schools to pass instead of fifty — and quietly turned the mid-game reveal
below into a late-game one. Authored downward, the 50th school by reputation is
the same school it always was, so entering the top 50 costs exactly the prestige
it did before.

What the tail buys is the other half: **a standing that means something from
week one.** A founding school opens at 50 (`foundingData.ts`'s
`FOUNDING_PRESET`) — above the whole tail, and so ranked mid-table at about
#55 of 100 rather than last of 56. It also gives the rank somewhere to
**fall**: a school that stalls, or spends a decade in the red, slides into a
field of real schools instead of sitting on a floor it cannot drop through.

**Standing is shown from the first week** — on the toolbar, and in the History
table — because the number now says something in both directions. The **report** remains a
mid-game reveal, and the two are not in tension: the U.S. News list publishes
fifty names, so where a school stands is knowable from the start and *being
published* is the event.

- The player starts **unaware of the report**, though not of their own rank.
- Reaching enough prestige to crack the **top 50** (which should take some time)
  fires a one-time **"you've entered the rankings"** interrupt.
- Thereafter the player gets an **annual report** (top 50 standings) once per year.

The report's subject is the academic table, with the other two standings as a
line each beneath the headline rank — the school's place, and who leads that
axis. Deliberately not two more tables: the report is a modal, and a full list
belongs where its subject does (research standing reads on the Research tab).
Neither line carries a year-over-year move, because `YearSnapshot` records only
the academic rank and a move needs a stored prior; naming the leader is the
context a bare ordinal was missing.

Every school also carries a **mascot** — the player's own is named at the
athletic-director interrupt rather than at founding, and is empty until then.
Nothing mechanical reads one; they are what lets a standings row read as a
sports page rather than a spreadsheet.

**The field's annual drift takes exactly one draw on the global random stream
per year**, whatever the field's size: `tickRivals` seeds a local generator from
it and runs all 99 schools off that. This is a *harness* property rather than a
gameplay one, and it is load-bearing — `sim/balanceSim.ts` seeds `Math.random`
to make a run reproducible, so a per-rival draw meant that adding schools
reshuffled every faculty potential and candidate listing in the game and made
the balance gate unable to distinguish a rebalance from a reshuffle. Pinned at
one draw, the rival table can grow, or gain axes of its own, without moving the
economy's dice at all.

## College, and University

A school opens as **"<Name> College"**. The player writes only the first half at
founding; the word after it is fixed institutional form. When the **first
research facility** finishes, a one-time interrupt offers to promote it to
**"<Name> University"** — the same gate research hangs off, read through the
same helper so the two can never drift apart. It is a naming change and nothing else: a `suffix` string
plus a flag recording that the question has been asked, joined for display by
`institutionName()`. No system reads the name, and either answer closes the
question for good.
