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

**Direct-mutation audit.** `self.reputation` is written in exactly three places,
and all three are intentional. (1) **Founding** sets the opening value
(`BASE_STARTING_REPUTATION + preset.prestigeBonus + GENED_BUILDING_REPUTATION_BONUS`
in `actions.ts`) — a one-time initialization, not a gameplay bump. (2) The
**drift** in `prestigeSystem.ts` moves reputation toward the computed target on
its regular cadence. (3) **Rivals** write their *own* `reputation`
(`rivalsSystem.ts`), never the player's. Nothing else touches it: research,
student life, decision events, satisfaction and rankings all read prestige and
never write it. In particular, **being ranked does not raise prestige** —
rankings are a measurement *of* prestige (see "Rankings"), a strictly one-way
read. Any future change must preserve this: prestige is composed from inputs, it
is not a running tally of bonuses. (The long-term direction is to decompose
prestige into several underlying components; that is future work, and must keep
the composed-stock discipline.)

## Rankings: the U.S. News report

Rivals are populated densely enough that a **top 50** is meaningful (~55 schools,
not 5). Rival prestige **fluctuates dynamically** year to year rather than
sitting static while the player grows. **Rankings are a measurement *of*
prestige, not a driver of it:** entering or climbing the rankings never itself
raises the player's prestige (see the prestige direct-mutation audit), and rivals
stay deliberately lightweight — a dynamic scoreboard whose relative standings
shift, not a strategic AI that reacts to the player. The report is a **mid-game
reveal**:

- The player starts **unaware** of the report.
- Reaching enough prestige to crack the **top 50** (which should take some time)
  fires a one-time **"you've entered the rankings"** interrupt.
- Thereafter the player gets an **annual report** (top 50 standings) once per year.

"Standing among peers" does not need to be shown constantly — the annual report
is the touchpoint.

## College, and University

A school opens as **"<Name> College"**. The player writes only the first half at
founding; the word after it is fixed institutional form. When the **first
research facility** finishes, a one-time interrupt offers to promote it to
**"<Name> University"** — the same gate research hangs off, read through the
same helper so the two can never drift apart. It is a naming change and nothing else: a `suffix` string
plus a flag recording that the question has been asked, joined for display by
`institutionName()`. No system reads the name, and either answer closes the
question for good.
