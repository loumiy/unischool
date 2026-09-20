# Plan 21 — The department

*Planning document only — no gameplay code is changed by this file. Its job is
to take a review of the athletics system — whether it wants re-imagining or
deepening, whether it belongs in the mid-late game, what a player can actually
decide inside it, and why its people are named the same eight things — and turn
the answer into an ordered sequence of PRs, each small enough to land on its
own.*

**Status: Proposed.** Nothing has landed.

**Written against `63fdedc`** (Plan 20 landed). Every reference below names a
file as it stands at that commit, and every number is measured against it —
see §3.

**The finding, in one line.** Athletics is the most complete and least
connected system in the game, and inside it there is no decision: the two
largest quality levers are department-wide and purchasable, the third is
gated on a market too thin to shop in, and a patient school reaches the
clamp in every sport it fields. This plan connects the outputs, makes the
department choose between its own programs against a pot that grows with its
own success, and gives the market something to be scarce about.

**It also settles a debt.** `prestigeSystem.ts` cut campus life's prestige
weight from 12 to 8 "with a condition rather than a shrug" — it returns when
athletics and student life reach something, and "the next plan to reach those
systems restores it here." Plan 17 left campus life out of the legacy's six
axes for the same reason, and `BACKLOG.md` calls that condition "the largest
single thing the sequence walks past." This is that plan; see Finding 3 and
PR B.

---

## 0. What athletics is today

Read as a player rather than as a codebase. These are the verbs, all year,
every year:

| Verb | Where | How often |
|---|---|---|
| Hire a coach into one of three chairs | Athletics tab, one pooled market | whenever a chair is open *and the market happens to list that sport* |
| Set the recruiting budget to low / medium / high | Athletics tab, one control | once, realistically — there is no reason to revisit it |
| Grant or decline a varsity petition | interrupt, on a deterministic week | once per sport club per five years |
| Site a venue | build rail | once per venue category |

And these are the outputs:

| Output | Composed from | Who reads it | Reaches a decision? |
|---|---|---|---|
| `teamQuality` | three coaches, the AD, the budget tier | everything below | — |
| per-sport rank | `teamQuality` vs `sportStrengthFor` | the Athletics tab | **no** |
| `athleticProgramStrength` → athletic standing | active teams, averaged, breadth-scaled | the tab, the toolbar | **no** |
| `athleticsSocialBonus` | active teams × tier multiplier | the `social` attribute | capped, and usually already saturated by facilities |
| campus-life standing | athletics is 50 of its 140 weight | the tab, History, a leaderboard | **no — pinned as a reading by `invariants.test.ts`** |
| the `athletes` cohort | `activeTeams × athleticsQuality / 100` | the summer funnel | **yes — the one real outlet** |
| titles | the bracket | campus-life standing, two ambitions | **no** |

Nine findings fall out, and they are the whole of the diagnosis.

### Finding 1 — No week contains a game

`PLAYOFF_WEEK` is one week of fifty-two, it resolves silently, and its report
is queued to a quiet week later. Every other week of every year, athletics
exists on screen as a table of numbers that changed because a coach aged.

This is the immersion problem and it is not a fidelity problem. The subject
matter's whole emotional register — Saturdays, a record, a rival, an upset —
is *recurrence in public*. No amount of additional hiring depth reaches it,
because the missing thing is **occasion**, not detail.

### Finding 2 — Four of the five outputs terminate in readings

[progression.md](../design/progression.md) is right that the standings are
readings, and right that the academic number must not depend on athletics. The
unintended consequence is that the longest chain in the game — student centre →
club → sport club → five years → petition → venue → three hires → quality →
rank → bracket → title → campus-life standing — ends on a number that
`test/invariants.test.ts` pins in place as a reading and that no system reads.

### Finding 3 — Campus life was cut with a condition, and this is the plan that owes it

`state/legacy.ts`'s `AXES` are breadth, concentration, teaching, research,
reach and stewardship. A run that won twenty national titles and a run that
never fielded a team are graded on **the same six axes**, and neither the axes
nor the name drawn from the `great` / `sound` / `troubled` tables can mention
it.

**That omission is a recorded debt, not an oversight**, and so is a second one
beside it. `prestigeSystem.ts` says it outright above `CAMPUS_LIFE_WEIGHT`:

> Campus life is UNDER-EARNED: two rec-centre rungs are its only sources,
> worth +1.8 ever, so it is cut from 12 with a condition rather than a shrug.
> IT RETURNS TO 12 when athletics and student life reach it … and **the next
> plan to reach those systems restores it here.**

[Plan 17](17-the-endpoint.md) left campus life out of the legacy's six axes for
the same reason, and `BACKLOG.md` names the condition as "the largest single
thing the sequence walks past". **This is the next plan to reach those
systems**, so both fall due here.

And the weight is only half of it. `campusLifeScore` sums
`effects.prestigeContribution` across done Buildables, and **only the rec
centre's two rungs carry one** — no athletics venue does. Restoring the weight
to 12 without widening what the score reads would move a term the player still
cannot earn. The under-earning is in the *score*, not the weight.

### Finding 4 — The applicant curve saturates before the interesting part starts

`athletes` is `boundedPull(0.7, 0.5, activeTeams × athleticsQuality/100)`. Six
teams at quality 70 is a pull of 1.61 — about **+6% to the whole pool** at a
0.10 base share. Six teams at quality 100 is 1.67. Flat from roughly four
decent programs onward, so the entire back half of athletics is worth nothing
at the funnel.

And it sits in an asymmetry with no design behind it: `researchOriented` reads
`researchOutput` — publications, breakthroughs, prizes at ×3 — alongside
capacity. **Research results reach the pool. Athletic results do not.**

### Finding 5 — There is no decision inside the department

Measured, not asserted (§3). `teamQuality` is

```
0.5×head + 0.25×assistant + 0.25×trainer   (a vacant chair scores 15)
  + budget tier bonus  (low 0 / medium 8 / high 18)
  + 0.12 × AD quality  (AD rolls 48..90 → up to +10.8)
```

so **28.8 of the ~67 points needed to make a bracket are department-wide and
purchasable**, applied identically to every team. The only per-team lever is
the three chairs, and a quarter of that is the trainer — hired from a generic
`strength-conditioning` pool identical across all eighteen sports.

There is therefore no way to concentrate resources on one program. **You
cannot decide to be a basketball school.** And because coach salaries are
~$3.3M/yr for a full department against an opex measured in hundreds of
millions, and team upkeep is fixed in dollars at petition time, none of it is
a financial decision either.

### Finding 6 — The market is scarce in the wrong way

`COACH_CANDIDATE_POOL_TARGET` is 18 listings spread over 19 fields on
`COACH_CANDIDATE_LISTING_WEEKS` of 12 — roughly **four listings per sport per
year**. A new team can sit with an empty chair for a year because nobody
rolled, which is neither realistic nor interesting: the frustration is the
absence of *any* candidate, while the thing that should be rare — a *good*
one — is uniform 45..90.

The pool raise (18 → 44) was proposed in Plan 08 and deferred twice, blocked by
an RNG-determinism constraint with the balance sim. That is a test harness
setting a content value.

### Finding 7 — The "now vs. later" hiring choice is fake

Potential rolls 45..90, is **printed on the card**, starts at
`COACH_STARTING_POTENTIAL_FRACTION` 0.55, closes linearly over
`COACH_GROWTH_PLATEAU_YEARS` 6, and salary tracks *current* quality. So
everybody converges to their ceiling on the same schedule and "hire the highest
potential" is strictly dominant. Tenure is free money and there is no retention
question, because nothing ever takes a coach away.

### Finding 8 — The schedule is on the wrong half, and the warm beat is behind the slow gate

The varsity petition is *guaranteed* by a deterministic week and produced 25 of
59 and 46 of 70 decision events in two sim runs — so the one athletics beat
that repeats is the one already answered. Meanwhile whether athletics exists at
all is `CLUB_FORMATION_WEEKLY_CHANCE` 0.05 × `SPORT_CLUB_SHARE` 0.3 ×
`VARSITY_PETITION_MIN_TENURE_YEARS` 5, measured at a **first varsity team in
year 8.75 in one run and 19.75 in another**.

And the mascot — the moment the school stops being an institution and becomes a
name people shout — is named inside the athletic-director modal, downstream of
all of that. The colours are chosen at founding; the name they belong to can
arrive two decades later.

### Finding 9 — Half of all coaches are drawn from 98 possible names

`rollCoachName` draws from `facultyData.ts`'s `NAME_POOLS`. The
Anglo/Western European pool is **7 male first names, 7 female, 14 surnames =
98 combinations**, and `ANGLO_POOL_WEIGHT` 6 against `OTHER_POOL_WEIGHT` 1 ×
6 regions means it is drawn **50% of the time**. The market churns ~78
candidates a year, ~3,900 over a run — so an Anglo first name recurs roughly
five times a year.

`rollCoachName` also has **no dedupe**, and the comment excusing that says "a
run mints at most eighteen of these… not drawn from or checked against the
standing candidate market." That was true of Athletics V1 and has been false
since V2 made it a weekly-churning market. `rollFullName` has deduped faculty
all along; coaches were simply never given the same treatment.

`COACH_GENDER_MATCH_CHANCE` is 0.82, so nearly one coach in five is
cross-gender for their sport.

---

## 1. Re-aim, not re-imagine and not deepen

Three things could be done with the effort.

**Deepen inward** — match simulation, fixtures, athlete rosters, recruiting
individual players. Wrong here, and not because it is hard: the system is
already the most complete and least connected in the game. Doubling the
machinery before connecting it draws more of the player's attention into the
cul-de-sac.

**Re-imagine** — delete the department, make athletics a facilities-and-
prestige line like the rec chain. Defensible only if the machinery were bad. It
is the best-built thing in the repository; this would be amputation for a
circulation problem.

**Re-aim** — keep every piece, change what it is *for*. The outputs get
outlets, the department gets something to decide, the market gets something to
be scarce about, and one genuinely new thing is added: dated public occasions,
so athletics occupies weeks rather than a week.

**Connect before deepening**, and the phase order enforces it. Phase 1 is
entirely connection and adds no simulation. If only Phase 1 lands, athletics is
materially better; if only Phase 4 lands, it is a better-built cul-de-sac.

---

## 2. The arrival: mid-game is right, the variance and the lump are wrong

Varsity athletics is something an institution acquires after it is an
institution. Offering it at founding would fight [Plan
19](19-the-founding-college.md) for the player's first decade and would give a
small liberal-arts college a football programme. **It stays a mid-game
system.**

Two things about the current arrival are indefensible. **The variance**: an
eleven-year spread is a coin flip deciding which game a player gets — one
player builds a dynasty over thirty years, another fields a team in year 23 and
runs out of run. **The lump**: what arrives late is not "the department" but
*everything at once* — team, tab, AD, mascot, standings, venue, market, budget —
which is the one shape the rest of the game avoids.

Three doors instead of one:

| When | What arrives | Why there |
|---|---|---|
| **Years 2–5**, with the student centre | The **identity**: the first sport club is a named beat, the school picks its **mascot** there, and the club's row says when it may petition | Costs nothing, ships the warmest moment two decades earlier, and turns a decade of silence into a decade of anticipation |
| **Years 7–12**, on a tightened fuse | The **department**: petition, venue, AD, market, the pot and the list | Unchanged in content; changed in *when*, and in how reliably |
| **Years 20+** | The **dynasty**: titles compounding, a rivalry with history, the risk a big programme carries, venues worth expanding | The late game is where the game runs out of things to do, and athletics is the **only system whose state keeps changing after the campus is finished** |

That last row is the argument *for* athletics being late rather than against
it. Every other system terminates — the catalogue is finished, the campus is
finished, the graduate schools are founded. A department that hires, ages,
wins, loses and can fall apart is the natural candidate for the thing that
keeps a fifty-year run alive in its fourth decade.

**Does the delay bury the lede?** The lede is the institution over fifty years,
and the beats that sell the first hour are the founding college and the summer
decision. Athletics is not the hook. But a delayed feature reads as *buried*
rather than *awaited* unless the player knows it is coming, the identity
arrives early even though the department does not, and the spread is narrow
enough that "mid-game" means the same thing for everybody. None of the three
is true today — and **the better athletics gets, the more expensive that
becomes**. PR O is therefore a precondition, not a garnish.

---

## 3. The measurements this plan is built on

Plan 08's most useful lesson was that three derivations looked right and
collapsed under measurement. These were taken against `63fdedc` before any of
the PRs below were written, and any PR that moves them should re-take them.

**What a department can reach.** Best coach potential is 90; fully grown, three
chairs at 90 weight to 90; plus 18 (high budget) plus 10.8 (a 90 AD) is
**118.8, clamped to 100**. A maxed department overshoots the ceiling by
nineteen points *in every sport at once*.

**What the field asks.** Across 18 sports and 99 rivals, the field-of-eight cut
averages **67 at founding and drifts to 76 by year 50**; the per-sport leader
averages **88 at founding and 98 by year 50**. The elite closing band applies
to `reputation` only — **the athletic field never reacts to the player**.

**What that means in brackets**, Monte Carlo against the shipped resolver
(`SPREAD` 25, three rounds):

| Staffing | quality | qualifies | wins the title (yr 10 → yr 25) |
|---|---|---|---|
| Every chair empty, medium budget, AD 70 | 31 | 0% | 0% |
| Three fresh average coaches, medium budget | 53 | 0% | 0% |
| Three fresh average coaches, **high budget, expensive AD** | 65 | 14% → 4% | ~0% |
| **The same three coaches six years later** | 95 | **100%** | **44% → 35%** |
| Three top-potential coaches grown out | 100 | 100% | 56% → 48% |

So: max the budget, take the expensive AD, hire anyone into all three chairs,
wait six years — **~95 in every sport, every bracket entered, ~40% of them
won**. With six programs that is ~2.4 titles a year against
`TITLES_FOR_FULL_SCORE` 12, so the titles term of campus-life standing
saturates in about five years and never moves again. Money is not the binding
constraint; patience is, and patience is free.

**What the venues carry.**

| Venue | Cost | Programs | Per program |
|---|---|---|---|
| Multi-sport field | $650k | 7 | $93k |
| Arena | $1.8M | 6 | $300k |
| Diamond | $480k | 2 | $240k |
| **Natatorium** | **$950k** | **2** | **$475k** |
| Football stadium | $6.5M | 1 | $6.5M (deliberately) |

The field and the arena are overloaded; the natatorium is the worst value in
the department. That is what PR Q answers, and it is why the answer is water
polo rather than breadth for its own sake.

**One constant makes content decorative.** `ATHLETIC_BREADTH_FOR_FULL_CREDIT`
is 6, so every sport past the sixth contributes nothing to athletic standing.
Any sport added before that is revisited is flavour.

---

# PR A — The names

*First, alone, and before anything else: it is pure content, it touches no
system, and it is the only item here a player feels the first week.*

**The change.** Three things and one bug.

1. **Expand every pool** well beyond seven first names and fourteen surnames.
   This is the root cause of the repetition and it helps faculty too — at 98
   combinations drawn half the time, `rollFullName`'s retry loop is working
   hard and its fallback path accepts a duplicate.
2. **Give `rollCoachName` the dedupe `rollFullName` already has** — the same
   `existingNames` set, checked against live staff, the standing market and the
   director. Delete the comment that excuses its absence; it describes
   Athletics V1.
3. **A coach-specific origin weighting**, heavier toward Anglo/American than
   the faculty default. This is an override at the coach call site, **not a
   change to `ANGLO_POOL_WEIGHT`** — the faculty weighting carries its own
   documented rationale about a real university's demographics and is correct
   as it stands.
4. `COACH_GENDER_MATCH_CHANCE` 0.82 → ~0.95.

**Where.** `src/data/facultyData.ts` (the pools, `rollCoachName`'s signature),
`src/data/studentLifeData.ts` (the constant, the call site).

**The risk.** None to balance — no number this plan measures moves. The only
care needed is that a bigger pool does not change how many draws the generator
takes per candidate, or the sim's forty-year trajectories shift for no reason.

---

# PHASE 1 — THE REACH

*Four PRs, no new simulation. Each takes an output that terminates in a reading
and gives it somewhere to go. Worth landing on its own.*

## PR B — Campus life becomes earnable, and the fiftieth summer grades it

**The change.** Finding 3's debt, discharged in the order the dependency runs:

1. **Widen `campusLifeScore`.** Athletics venues gain a `prestigeContribution`
   so the term reads more than two rec-centre rungs. This is the actual fix for
   "under-earned" and it must land before the weight moves.
2. **Restore `CAMPUS_LIFE_WEIGHT` 8 → 12**, discharging the condition
   `prestigeSystem.ts` records against it.
3. **A seventh legacy axis** — campus life, read from the inputs
   `socialStandingBreakdown` already composes (organisations, athletics,
   titles, what students report), scored the same 0..1 way the other six are.
   Athletic-flavoured entries in the name tables so a run whose leading axis is
   campus life can be named for it.

**Why first in the phase, and why it is not the trivial PR it looks like.** The
legacy axis alone would be trivial — the legacy grades, it does not feed. Items
1 and 2 are not: `CAMPUS_LIFE_WEIGHT` sits inside `computePrestigeTarget`,
which admissions, pricing, every `YearSnapshot` and `sim/balanceSim.ts` all
read. A four-point weight change against a score that has just been widened
moves the headline number for every school in every run.

**So this PR carries the balance gate, not PR C.** Take the §3 table and
`npm run sim` before and after. If the combined move is too large, ship item 1
alone, re-measure, and move the weight in a second pass — the condition says
*restore*, it does not say restore in one commit.

**Where.** `src/systems/prestige/prestigeSystem.ts` (the score and the weight),
`src/data/facilitiesData.ts` (venue contributions), `src/state/legacy.ts`,
`src/components/LegacyAxes.tsx`, the axis-count assertions in `test/`.

**Settle before writing it.** Seven axes, or campus life folded into a widened
stewardship? Seven. Stewardship is solvency, wealth and welfare — three things
about *running* a school. Campus life is a thing the school *is*.

## PR C — A title reaches the applicant pool, and the summer modal says so

**The change.** The `athletes` signal gains a results term beside its capacity
term, exactly as `researchOriented` has one: recent finishes and titles on a
decaying window, so a championship swells the next summer's pool and fades over
a few years rather than compounding forever. And the admissions breakdown,
which already apportions real head counts per cohort, names the cause —
*"the title in men's basketball is worth 4,100 of these."*

**Why.** The summer decision is the best beat in the game and athletics feeds
it a flat, saturated +6%. This puts athletics' most emotional moment inside the
one modal nobody skips, and closes Finding 4's asymmetry.

**Where.** `src/systems/admissions/cohorts.ts`, the admissions interrupt.
Nothing new to store — `s.orgs.titles` and `s.orgs.lastSeason` already carry
the years.

**The risk, named.** The pool is the input to an economy tuned four times. Size
the results term so a title is *visible* and not a strategy: the cohort's cap
should barely move: what changes is what it takes to reach it. `npm run sim` is
the gate.

## PR D — A venue earns, and the house is visible

**The change.** The game's first non-tuition, non-endowment revenue line: gate
revenue per home occasion, scaled by the venue's tier, the team's quality and
the body that would turn up — with an **attendance figure** on the team card,
because 1,200 in the rain in year 12 and a full house in year 34 is the growth
fantasy expressed in one number.

**It is paid to the department, not to the university.** Gate revenue funds
PR G's pot first, and only the surplus — what is left once every program on
the list is funded — spills into general income on the Treasury statement.
That routing is a deliberate fork: paying it to general income would make
athletics pay the *university*, which is a smaller and less interesting claim
than athletics **paying for itself**, and it is the half of PR G's pot that
makes a winning department stop being a cost centre. A dominant department
still eventually enriches the school, through the spill.

**Why.** The $6.5M stadium currently produces *satisfaction*. Sized so **a good
programme roughly pays for itself and a bad one does not**, which is the
knife-edge the budget tier has never actually posed.

**Where.** `financeSystem.ts` (the spill line in `financeBreakdown`),
`facilitiesData.ts` (a per-venue capacity), `src/systems/athletics/`.

**Ordering with PR G.** D can land first and pay everything to general income,
with G retargeting it — or G can land first against a subsidy-only pot, with D
adding the earned half. The second is cleaner: the pot exists before anything
pays into it. Either way the two must not both ship a routing rule.

**The risk, named.** This economy's history is a money-printing problem, and
routing the gate to the pot makes this PR one half of PR G's feedback loop
rather than a standalone income line. **Gate revenue must saturate** — a venue
holds what it holds, and the way to raise the ceiling is PR Q's rungs. Beyond
that the line must be material in the decade the venue is built and a rounding
error at scale, which is the opposite shape to instruction cost: size it
against opex at year 15, not year 40, and assert both properties in the
balance test.

**Ordering.** It reads "home occasion", which PR N provides. It can land first
by billing against the bracket plus a flat number of home dates. Do not block
it on Phase 4.

## PR E — The small outlets

**The change.** Three cheap ones in one PR because they are one idea: a title
year lifts donor-event weight and endowment-campaign yield; the existing
`naming-rights` and `state-capital-match` events learn to aim at venues; and
the tab grows a **trophy case** — every title as an object with a year and a
sport, not a count.

**Why.** Championships selling capital campaigns is how athletics actually
reaches a university's finances, and it reuses authored content rather than
adding a stream. The trophy case is the almanac feel the design review said to
protect.

---

# PHASE 2 — THE DEPARTMENT DECIDES

*Where Finding 5 is answered. This is the heart of the plan.*

## PR F — Sports are not equal

**The change.** Each sport gains a **scale**: a cost to compete, a coach-salary
multiplier, and a payoff multiplier on what a title is worth downstream.

- **Revenue sports** (football, men's and women's basketball): expensive to
  staff, a large share of the pot to stay competitive, and a title that moves
  the national needle — gate, applicant cohort, donor mood.
- **Olympic sports** (swimming, track, lacrosse, field hockey, the rest): cheap
  to staff and house, a modest ceiling on payoff, and the breadth credit.

`ATHLETIC_BREADTH_FOR_FULL_CREDIT` is revisited here, because this PR changes
what breadth means.

**Why.** The venues already spread 13× and everything downstream flattens them.
The point is not realism, it is that this creates **two coherent identities** —
the state-school football power and the liberal-arts school with eleven banners
in swimming — which is the "more than one way to earn a good legacy" thesis
applied to the one system that currently has a single way to play it.

**Where.** `src/data/studentLifeData.ts` (`SPORT_PROFILES` gains the scale),
`teamQuality`'s inputs, `coachSalaryFor`'s call sites.

## PR G — The priority list, and a pot that grows

**The change.** The department's programs sit in one **drag-and-drop ordered
list**. Dragging sets *order* and nothing else — there are no slots and no
caps.

Funding is a **queue, not a weighting**. Each program draws its sport's cost to
compete (PR F) off the pot in list order until the pot is exhausted. So the
same pot funds football and basketball and half of a third program — or six
Olympic programs outright — and the screen draws the line **where the money
runs out**.

**The bands are descriptive, not prescriptive**, and this is the load-bearing
call. Flagship / Competitive / Developmental are names for *which side of the
funded line a program sits on*, not compartments the player drags into. The
consequence is that the ratio of flagship programs to total programs is
**dynamic for free, with no constant to tune**: the line slides down the list
as the pot grows, and slides up as expensive sports are promoted above cheap
ones. A department that starts able to fund one program properly can end able
to fund five, and nothing had to be authored for that to happen.

About **a quarter of programs fully funded at mid-game** is the tuning target
the pot and the costs should be sized toward — a target for the measurement,
never a rule in the code. A successful department should drift past it; that
drift is the feature.

**The pot is two things added together**, and the second is what makes success
compound:

> **pot = institutional subsidy + what athletics earned**

The subsidy is the existing low/medium/high lever, which keeps its job and
gains a second meaning over the run — early it asks *how much are we willing to
spend on this*, late it asks *do we still need to subsidise it*. What athletics
earned is PR D's gate revenue plus PR E's athletics-attributable giving. A
young department is almost all subsidy; a mature winning one earns most of its
own pot and is a cost centre no longer. That is the arc, and it is the reason
this PR and PR D are the same idea seen from two ends.

**A program below the line is underfunded, not unfunded.** It runs at a
proportional quality penalty — the same shape `COACH_VACANCY_QUALITY` already
uses, a floor rather than a zero — so the cut line is a gradient and not a
cliff, and the bottom of a long list is not dead weight.

Position drives exactly **one** chain — order → share of pot → team quality —
so nothing is counted twice. It gates one genuinely different thing: **access
to the coach market** (PR L). Programs above the line attract the top of the
market; the ones below get journeymen.

**Demotion costs something.** A program dragged down decays over a season or
two and its head coach may leave rather than accept the cut — otherwise
reordering is free and the right play is to chase the bracket every year. The
list is a commitment, not a dial.

`'awaitingVenue'` teams sit out of the queue and draw nothing: they cannot
compete, the same reason they contribute no social bonus and are not ranked.

**Why this shape.** It scales identically from three programs to eighteen; it
is zero-sum by construction, so the tradeoff enforces itself rather than
needing a cap; the ratio question answers itself rather than being authored;
and the idiom already exists — [Plan 14](14-curriculum-on-the-map.md) made the
Curriculum tab drag-and-drop faculty onto program slots.

**The risk, named, and it is the serious one.** A pot fed by gate revenue and
giving is a **positive feedback loop on money**, in a game whose documented
history is money running away — win, earn, fund more, win more. It needs brakes
written in from the first commit, not retrofitted:

- **Gate revenue saturates.** A stadium holds what it holds. Raising the
  ceiling is PR Q's venue rungs — a capital decision — never a free ramp.
- **The subsidy must not scale with school size faster than costs do**, or a
  70,000-student school funds eighteen flagship programs without deciding
  anything, and the whole feature evaporates at exactly the point in the run it
  was built for.
- The plan's other brakes are load-bearing here and should be measured
  together with this one: PR H (athlete intake costs class quality), PR I (the
  field closes), PR L (poaching), PR P (scandal risk rising with the pot).

**Rejected alternatives, recorded.** Eighteen sliders (a spreadsheet); a budget
per venue category (groups the wrong things — the arena's six programs are not
one decision); a commitment level set once at varsity (the same idea, less
legible, and it cannot express *order*); and **fixed band sizes**, whether a
flat 1–2 slots or a ratio computed off team count — both make the design carry
a number that the funded line already expresses, and both have to be re-picked
every time the pot or the sport costs move.

**Where.** `src/state/types.ts` (an ordered list of team ids — the ordering is
the stored thing; the funded line and therefore the bands are *derived*, never
stored, so they cannot disagree with the pot),
`src/tabs/AthleticsTab.tsx`, `studentLifeData.ts`'s quality inputs.

## PR H — The cost of a big programme

**The change.** The one structural item. Today a cohort decides *how many*
applicants and the quality band decides *how good*, deliberately independent
dimensions. This couples them in one narrow place: the realised class's band
mix shifts slightly with the athlete share of the pool, **weighted by sport
scale** — so a football school admits a class that is larger, cheaper to fill
and academically a shade weaker, and a swimming school barely notices.

**Why.** It is the institutional tension the subject is actually about, and
without it athletics is a pure-good purchase whose only cost is cash — and cash
is not scarce. With it, and with PR G, "which programs are we serious about"
becomes a real strategic question with a real price.

Note what it does *not* do. Athletics still never touches the academic number
directly; it touches **the class the school admits**, and the class has always
been allowed to move prestige. That is the indirection
[student-life.md](../design/student-life.md) flagged as the acceptable shape.

**Where.** `src/systems/admissions/`, `cohorts.ts`'s own comment that band and
cohort are independent — the claim this PR retires — and
`docs/design/admissions.md`'s cohort section.

**The risk, named.** The one item that could break the funnel's tuning, so it
is last of the three that touch admissions. If the sim says no, the fallback is
weaker but still a cost: athletes carry **scholarship money** scaled by sport
and list position.

## PR I — The ceiling, and a field that closes

**The change.** Two corrections that only make sense once F and G are in.
Lower the effective ceiling so a maxed department does not overshoot 100 by
nineteen points — the last twenty points of coaching should be worth
something. And extend the **elite closing band to athletic strength**, so the
strongest athletic schools drift toward a leader the way academic rivals
already do.

**Why.** §3's measurement: today the top of the coach market is decorative,
and the athletic field never reacts to the player at all. A dynasty should be
**held**, which is the move [Plan 17](17-the-endpoint.md) already made for the
academic number.

**The risk, named.** This moves every number in §3 at once. Re-take the whole
measurement table after it, not just the balance sim.

---

# PHASE 3 — THE MARKET

*Finding 6 and Finding 7. PR J is the one that removes an actual frustration
and it goes first.*

## PR J — Every open chair has somebody

**The change.** Scarcity moves from *the existence of candidates* to *the
quality of them*. A **floor**: every open chair on an active team always has at
least one listing. The bottom of the market fills with journeymen (a low
potential band, always available, cheap); the top (the 75–90 band) becomes
genuinely rare. `COACH_CANDIDATE_POOL_TARGET` rises with it, **and the
RNG-determinism constraint that blocked the raise twice is fixed rather than
worked around** — the market's size must not decide how many times the game
rolls a die, which is the discipline Plan 08 established for the rival field.

**Why.** "Nobody is available" is not a decision, it is a wait. "Nobody *good*
is available" is a decision — field a journeyman now, or hold the chair open.
It also retires `COACH_VACANCY_QUALITY` as something the market does *to* you:
an empty chair becomes a choice to save money.

**Ordering.** This lands before PR Q. The pool already spreads across 19
fields; water polo makes it 21. Adding sports first would worsen the exact
scarcity this PR exists to fix.

## PR K — Now, or later

**The change.** Make the prospect-versus-veteran trade real, which today it is
not.

- Potential becomes an **uncertain range** on the card rather than a printed
  number, resolved only through tenure. Uncertainty is what makes it a bet.
- **The AD narrows the range** — a good director scouts better. That gives the
  AD a second job beyond a flat department-wide addend, and makes the expensive
  card worth reading.
- **Veterans and prospects become different goods**: high quality now, little
  growth left, expensive, a short horizon — against cheap, low, and a ceiling
  you cannot quite see.
- **Coaches age out.** Tenure stops being free money.

**Where.** `studentLifeData.ts`'s generation and growth curves,
`AthleticsTab.tsx`'s market rows.

## PR L — Who wants the job

**The change.** The top of the market is gated on **per-sport program
reputation** — title history and sustained quality in *that* sport, decaying —
and on the program's band in the priority list (PR G). And the loop gets a
leak: **a coach who succeeds gets poached**, on the shape
`faculty-outside-offer` already uses.

**Why.** This is the first feedback loop athletics would own: win → better
coaches want the job → win more. Gating per-sport rather than school-wide is
what keeps it legible — you climb sport by sport, and a football power is still
nobody in swimming. The poaching is what stops it running away, and it turns
"wait six years" into "keep what you built".

---

# PHASE 4 — THE SEASON

*The only genuinely new simulation in the plan, and deliberately behind the
connection work.*

## PR M — A rival with a name, per sport

**The change.** Each fielded sport has a **designated rival**: one named school,
derived (never stored) from the same deterministic hash `sportStrengthFor`
uses, drawn from schools of comparable strength and stable for the whole run.
Shown on the standings row and in every occasion involving them, with a
**streak** and a named trophy.

**Why.** The design review's unanswered complaint: *"nothing lets you do
anything about a specific rival."* A rank is a number; a rank against Wexford
State, whom you have beaten eleven times in thirty years, is a story. One
derivation, no storage.

## PR N — Four occasions, a record, and a log with Saturdays in it

**The change.** Each active team gets a small fixed set of **dated occasions** a
year — an opener, the rivalry game, a homecoming date, the postseason —
resolved by the weighted comparison `playoffs.ts` already uses, on one draw.
Each writes a log line the week it happens; a season record accumulates; an
**upset** (beating a school far stronger, or losing to a far weaker one) is
called out. Only the rivalry result and a title may raise anything modal, and a
title still queues.

**The line this crosses, stated plainly.** [BACKLOG.md](../../BACKLOG.md)
defers *match simulation and schedules*, and Plan 08 drew it hard: "a bracket is
not a season." Four authored occasions is not a schedule — no fixture
generator, no opponent pool, no table, no travel, and the resolver already
exists. But it **is** a season in the one sense that matters to a player: a
record accumulates week to week. That is a deliberate partial crossing and it
should be argued in the PR, not slipped in. The argument: four dates is the
minimum that produces a record and a rivalry, and a fixture list is the maximum
that produces nothing more.

**Where.** `src/systems/athletics/season.ts`, beside `playoffs.ts` and not
inside it. Cap the occasions in a named constant whose comment says why it is
not a schedule.

---

# PHASE 5 — THE ARRIVAL

## PR O — The mascot moves, the fuse shortens, the path is visible

**The change.** Four small things that together implement §2:

1. **A first-sport-club beat**, years 2–5, where the school names its
   **mascot** — moved out of the athletic-director modal, which keeps that
   modal about the director.
2. **A pity timer on the first sport club**: if a student centre has stood for
   *N* years and none has formed, the next club formation is one. The same
   "a pipeline is a guarantee, not a lottery" argument `fireVarsityPetition`
   already won, applied one step earlier. `VARSITY_PETITION_MIN_TENURE_YEARS`
   drops 5 → 3 alongside it.
3. **Foreshadowing**: a sport club's row on the Student Life tab says when it
   may petition.
4. **The Athletics tab opens with the first sport club**, empty and showing the
   path, rather than with the first team.

**Target.** First varsity team in roughly years 7–11 *for every run*, against
8.75–19.75 across two today. **The spread matters more than the mean** — report
first-club, first-varsity and first-title years across the sim's seeds before
and after.

---

# PHASE 6 — WHAT IT RISKS, AND WHAT IT BUILDS

## PR P — The scandal, and the postseason ban

**The change.** A recruiting or booster scandal whose probability rises with
the pot, with a program's band in the list, and with how far athletics has
outrun the academic school — and whose penalty is a **postseason ban for a
season or two**, not a cash cost. Authored into the shared decision table,
taking weight from the existing budget rather than adding a stream.

**Why.** *"Nothing can go wrong that the player can't ignore"* is the review's
finding about the whole game, and athletics is the right place to answer it
first, because the exposure is something the player **chose**. A cash penalty
is ignorable by year 20; losing a season is not.

## PR Q — Water polo, and venues with rungs

**The change.** One sport and two building ideas, all aimed at making what
already exists worth more.

- **Water polo (men's and women's)** on the natatorium, which takes the
  worst-value building in the department from two programs to four. Zero
  footprint, zero new venue type.
- **Rungs on the existing venues** — a larger arena, an expanded stadium. Every
  other chain in the game tiers (dorms, dining, health); athletics venues are
  one-and-done. Rungs give late-game cash somewhere to go, pair directly with
  PR D's gate and attendance, and express growth, which is the whole feeling of
  the game.
- **A field house** — a non-competition facility that lifts every program a
  little. Team quality is currently only people and a pot; a *building* as a
  quality lever gives the build rail a reason to exist in athletics after the
  venues are up, and it is a natural place for a donor's name.

**Deliberately not here.** Wrestling and gymnastics would take the arena to
eight and ten programs, against a code comment that already calls six "a lot of
load on one building." Cross country is free but homes at the field on a fig
leaf and pushes it to nine. **Tennis** is not a sport question but a
rec-versus-varsity question — the courts already stand as a rec facility and
the design explicitly rejected sharing — and should be reopened deliberately or
not at all. **Golf and rowing stay declined** for the reasons already recorded:
a course is a footprint larger than the campus, and a lake is terrain the map
has no concept of. An **ice rink** stays in reserve: the design doc
pre-authorises it if the arena reads thin, and it becomes necessary if
wrestling or gymnastics ever land.

## PR R — Docs

`docs/design/student-life.md`'s athletics half is the largest single edit — the
postseason section becomes the season section, and the "one budget lever"
paragraphs become the pot and the list. Then `progression.md` (campus life is
graded in the legacy), `economy.md` (the gate), `admissions.md` (PR H),
`faculty.md` or wherever the name pools are described, and `BACKLOG.md`'s
athletics deferrals.

Docs are last, not because they are an afterthought, but because Phases 1–6
change what the design *is* and writing it twice is worse than writing it once.

---

## What this plan does not do

- **A fixture list, a league table, or a simulated match.** PR N is four dates
  and a result each, and the line is defended in the PR.
- **An athlete roster, or recruiting individual players.** The player recruits
  through the pot, the list and a coaching staff.
- **Conferences or realignment.** A hundred schools and one national bracket is
  enough structure.
- **School-wide budgeting, or a CFO.** Discussed and deliberately out of scope
  — it is a whole-game economy change that happens to have been found through
  athletics, and it is gated on money actually being scarce. It is on
  `BACKLOG.md` instead.
- **Disbanding a team**, and therefore still not what happens to a venue whose
  last team folds. PR G's demotion makes it likelier to be asked and no easier
  to answer.
- **Anything to the academic standing.** PR H reaches prestige only through the
  class the school admits, which is a path that already exists.

## Open questions, to settle before PR B

1. **Seven legacy axes, or six?** This plan says seven. It is the one call that
   changes a shipped, sealed record shape.
2. **Does gate revenue want a crowd concept?** A venue's `serves` figure
   exists; whether the gate reads enrollment, alumni, or a stored attendance is
   a real fork, and the cheap answer is probably right.
3. **How much of a title should the funnel feel?** Between "nothing" (today)
   and "a strategy". The sim decides, not this document.
4. **Does PR N's record want to be visible to rivals?** A rival's season is
   derived and unstored. Keeping it that way is cheaper and makes a rivalry
   record one-sided — the player's memory, not the world's. Probably correct;
   say so deliberately.
5. ~~**How many bands, and how many slots in each?**~~ **Settled: none.** The
   bands are drawn where the pot runs out rather than being compartments with
   sizes, so the question dissolves — the ratio of flagship programs moves by
   itself as the pot grows. About a quarter fully funded at mid-game is the
   measurement to tune the pot and the sport costs toward, not a number the
   code carries. See PR G.
6. **How hard does the earned half of the pot compound?** The open question PR
   G leaves in its place, and a harder one: a pot fed by gate and giving is a
   positive feedback loop, and the brakes (saturating gate, a subsidy that does
   not track school size, PRs H/I/L/P) have to be measured *together* rather
   than one PR at a time. The first balance run that includes PR G should
   report the funded-line position at years 15, 25 and 40 — if it only ever
   moves down, a brake is missing.
