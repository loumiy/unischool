# Prestige, rankings, and the institution's arc

How a school is founded, how standing accumulates, and how the outside world
reports on it.

## Startup and school type

A **startup screen** lets the player **name the school** before play — the
player's half of the name only; every school opens as a *College* (see
"College, and University" below). The MVP also asks one structural question:
**private vs. public**. That single choice
sets starting conditions — starting cash, prestige bonuses, applicant-pool size,
tuition ceiling, any baseline funding — expressed purely as tunable constants.

**Archetypes emerge, they are not chosen.** The game should let different kinds
of successful school (Harvard-like, ASU-like, Johns-Hopkins-like) arise from the
player's choices over time, rather than being selected up front. Private/public
is the only starting fork; everything else is emergent. (Later: save/load, color
schemes, more customization.)

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

What the tail buys is the other half: **a field the player is inside from week
one.** A private school opens at 50 ranked above the whole tail; a public opens
at 35 with a dozen schools directly above it to pass in its first decade.

**Standing is shown from the first week** — on the toolbar, and in the History
table — because there is now somewhere to climb from. The **report** remains a
mid-game reveal, and the two are not in tension: the U.S. News list publishes
fifty names, so where a school stands is knowable from the start and *being
published* is the event.

- The player starts **unaware of the report**, though not of their own rank.
- Reaching enough prestige to crack the **top 50** (which should take some time)
  fires a one-time **"you've entered the rankings"** interrupt.
- Thereafter the player gets an **annual report** (top 50 standings) once per year.

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
