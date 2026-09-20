# Plan 21 — The season

*Planning document only — no gameplay code is changed by this file. Its job is
to answer three questions asked of the athletics system — whether it wants
re-imagining or deepening, whether it belongs in the mid-late game, and whether
delaying it buries the lede — and to turn the answer into an ordered sequence of
PRs, each small enough to land on its own.*

**Status: Proposed.** Nothing has landed.

**Written against `63fdedc`** (Plan 20 landed). Every reference below names a
file as it stands at that commit.

**The short answer, before the argument.** Athletics does not want
re-imagining, and it does not want deepening either — the two things it is
usually asked for (a match simulator, an athlete roster) would both double the
size of the system that is already the largest in the game relative to its
reach. It wants **re-aiming**: the department, the market, the venue chain and
the bracket stay exactly as they are, four of its five outputs stop terminating
in readings nobody uses, and it acquires the one thing it has never had, which
is **a week with something in it**. Roughly four parts connecting to one part
new.

---

## 0. What athletics is today

Read as a player rather than as a codebase. Every year, forever, the athletics
system offers these verbs:

| Verb | Where | How often |
|---|---|---|
| Hire a coach into one of three chairs | Athletics tab, one pooled market | whenever a chair is open and the market has somebody |
| Set the recruiting budget to low / medium / high | Athletics tab, one control | once, realistically; there is no reason to revisit it |
| Grant or decline a varsity petition | interrupt, on a deterministic week | once per sport club per five years |
| Site a venue | build rail | once per venue category |

And it produces these:

| Output | Composed from | Who reads it | Does that reader reach a decision? |
|---|---|---|---|
| `teamQuality` | three coaches, the AD (`AD_QUALITY_SHARE`), the budget tier's `qualityBonus` | everything below | — |
| per-sport rank | `teamQuality` vs `sportStrengthFor` | the Athletics tab | **no** |
| `athleticProgramStrength` → athletic standing | active teams, averaged, breadth-scaled | the Athletics tab, the toolbar rank | **no** |
| `athleticsSocialBonus` | active teams × tier multiplier | the `social` satisfaction attribute | yes, but capped, and usually already saturated by facilities |
| campus-life standing | athletics is 50 of its 140 weight (`SOCIAL_ATHLETICS_WEIGHT` 30 + `SOCIAL_TITLES_WEIGHT` 20) | the Athletics tab, the History tab, a leaderboard | **no — by explicit invariant** (`test/invariants.test.ts`) |
| the `athletes` applicant cohort | `activeTeams × athleticsQuality / 100` | the summer funnel | **yes — the one real outlet** |
| titles | the bracket | campus-life standing, two ambitions | **no** |

Six findings fall out of that table, and they are the whole of the diagnosis.

### Finding 1 — Athletics is the only system in the game with no week in it

`PLAYOFF_WEEK` is one week of fifty-two, it resolves silently, and the report
it produces is queued to a quiet week later. Every other week of every year,
athletics exists on screen as a table of numbers that changed because a coach
aged.

This is the immersion problem, and it is not a fidelity problem. The subject
matter's entire emotional register — Saturdays, a record, a rival, a crowd, an
upset — is *recurrence in public*. UniSchool has an annual silent
tournament and a staffing screen. No amount of additional hiring depth reaches
the feeling the system is named after, because the missing thing is not
detail, it is **occasion**.

### Finding 2 — Four of its five outputs terminate in a reading

`docs/design/progression.md` is right that the three standings are readings and
not inputs, and right that the academic number must not be made to depend on
athletics. But the consequence, unintended, is that the longest chain in the
game — student centre → club → sport club → five years → petition → venue →
three hires → quality → per-sport rank → bracket → title → campus-life standing
— ends on a number that `test/invariants.test.ts` pins in place as a reading —
its writers confined, `computePrestigeTarget` asserted never to mention it —
and that no system in the game reads. The player is asked to run a department for forty years, and the
department's best possible outcome is a bigger number on the screen that shows
the number.

### Finding 3 — The fiftieth summer does not know athletics happened

`state/legacy.ts`'s `AXES` are breadth, concentration, teaching, research,
reach and stewardship. A run that won twenty national titles and a run that
never fielded a team are graded on **the same six axes**, and neither the axes
nor the name drawn from the `great` / `sound` / `troubled` tables can mention
it. The game's culminating statement of what the school became is blind to a
third of what the player did.

Of everything in this plan this is the cheapest to fix and the most
disproportionate in effect, which is why it is PR A.

### Finding 4 — The applicant curve saturates before the interesting part starts

`athletes` is `boundedPull(0.7, 0.5, activeTeams × athleticsQuality/100)`.
Six teams at quality 70 gives a signal of 4.2, a pull of 1.61, and — at a base
share of 0.10 — about **+6% to the whole applicant pool**. Six teams at quality
100 gives 1.67. The curve is effectively flat from about four decent programs
onward.

So the entire back half of athletics — the last twenty quality points, the
brackets, the titles, the dynasty — is worth nothing at the funnel. And note
the asymmetry it sits in: `researchOriented` reads `researchOutput`
(publications, breakthroughs, prizes at ×3) alongside capacity. Research
results reach the pool. **Athletic results do not.** There is no design reason
for that difference; it is simply what was built first.

### Finding 5 — The schedule is on the wrong half of the system

The varsity petition is *guaranteed* by a deterministic week and produced 25 of
59 and 46 of 70 decision events in two sim runs (Plan 08's own measurement) —
so the one athletics beat that repeats is the one the player has already
answered. Meanwhile the thing a run actually turns on, whether athletics exists
at all, is `CLUB_FORMATION_WEEKLY_CHANCE` 0.05 × `SPORT_CLUB_SHARE` 0.3 ×
`VARSITY_PETITION_MIN_TENURE_YEARS` 5, and the September 2026 design review
measured the first varsity team at **year 8.75 in one run and year 19.75 in
another**. Guaranteed where it should be occasional; a coin flip where it
should be designed.

### Finding 6 — The warm beat is locked behind the slow gate

The mascot — the moment the school stops being an institution and becomes a
name that people shout — is named inside the athletic-director modal, which
fires after the first varsity team, which is year 8.75 to 19.75. The colours
and the vernacular are chosen at founding; the name they belong to arrives up
to two decades later.

---

## 1. Re-imagine, or deepen? — Neither: re-aim

Three things could be done with the effort, and only one of them is right.

**Deepen inward** — match simulation, fixtures, an athlete roster, recruiting
individual players. This is what "athletics needs more" usually means, and it
is the wrong move here for a reason that has nothing to do with difficulty: the
system is **already the most complete and least connected in the game**. The
design review's line still holds at `63fdedc` — eighteen gendered sports, a
nineteen-field coach market, per-sport strength for 100 schools × 18 sports, a
bracket, an AD, a mascot flow, terminating in numbers nothing reads. Doubling
the machinery before connecting it makes the imbalance worse, not better: it
draws more of the player's attention into the cul-de-sac.

**Re-imagine** — throw the department out, make athletics a facilities-and-
prestige line like the rec-centre chain. This would be defensible if the
existing system were bad. It is not; it is the best-built thing in the
repository. Deleting it to solve a connection problem is amputation for a
circulation problem.

**Re-aim** — keep every piece of machinery, change what the machinery is *for*.
Four of the five outputs get real outlets (the record, the funnel, the money,
the risk), and one genuinely new thing is added: a handful of dated public
occasions a year, so that athletics finally occupies weeks rather than a week.

That is this plan, and the order matters more than the content. **Connect
before deepening.** Phase 1 is entirely connection and touches no new
simulation. Phase 2 is the season. Phase 3 is what the late game does with it.
If only Phase 1 ever lands, athletics is a materially better feature; if only
Phase 2 lands, it is a better-built cul-de-sac.

---

## 2. Mid-late game, or earlier? And does the delay bury the lede?

### The gate is right, the variance is wrong, and the lump is wrong

Varsity athletics genuinely is something an institution acquires after it is an
institution. Offering it at founding would fight Plan 19's founding college for
the player's first decade and would make a small liberal-arts college start with
a football programme, which is nonsense. **Athletics should stay a mid-game
system.** The question was the right one and the answer is: no, do not move it
to the front.

But two things about the current arrival are indefensible:

**The variance.** An eleven-year spread on when a major system appears is not
pacing, it is a coin flip deciding which game a player gets. One player meets
athletics in year 9 with thirty years to build a dynasty; another meets it in
year 20, fields a team at 23, and reaches the fiftieth summer with four titles
and no time. A designed pace and a random one are different things, and this is
the random one.

**The lump.** What arrives late is not "the department" — it is *everything at
once*: the first team, the tab, the AD, the mascot, the standings, the venue,
the market, the budget. Athletics is introduced as a single block dropped into
year 12, which is exactly the shape the rest of the game avoids (the curriculum
unlocks by tier, research by lab, graduate programs by completeness).

### The recommendation: three doors, not one

| When | What arrives | Why there |
|---|---|---|
| **Years 2–5** — with the student centre | The **identity**: the first sport club is a named beat, the school picks its **mascot** there, and the club's row says it could petition for varsity in *N* years | Costs nothing, ships the game's warmest moment two decades earlier, and makes the mid-game arrival a thing the player has been waiting for rather than a surprise |
| **Years 7–12** — on a tightened fuse | The **department**: petition, venue, AD, market, budget, tab, standings | Unchanged in content; changed in when, and in how reliably |
| **Years 20+** | The **dynasty**: titles compounding, a rivalry with history, the risk a big programme carries, the stadium worth expanding | The late game is where UniSchool currently runs out of things to do (4–14 actions a year after year 22 in the review's run) and athletics is the **only system whose state keeps changing after the campus is finished** |

That last row is the strongest argument *for* athletics being a late-game
feature rather than against it. Every other system terminates: the catalogue is
finished, the campus is finished, the graduate schools are founded, the faculty
board is full. A department that hires, ages, wins, loses and can fall apart is
the natural candidate for the thing that keeps a fifty-year run alive in its
fourth decade. Do not move athletics forward to rescue it — invest in it
*because* it is where the late game can live.

### Does that bury the lede?

Partly, today; not necessarily. The lede of UniSchool is not athletics — it is
the institution over fifty years, and the two beats that sell the first hour
are the founding college and the summer admissions decision. Athletics is not
the hook and should not be made into one.

But a delayed feature reads as *buried* rather than *awaited* unless three
things are true, and today none of them is:

1. **The player knows it is coming.** Right now a sport club is tagged `sport`
   on the Student Life tab and says nothing else. One line — "may petition for
   varsity in 3 years" — converts a decade of silence into a decade of
   anticipation, at the cost of a string.
2. **The identity arrives early even though the department does not.** The
   mascot beat belongs with the first sport club, not with the AD hire. A school
   can have a name to shout long before it has a stadium.
3. **The spread is narrow enough that "mid-game" means the same thing for
   everybody.** Year 8–12 for every run, not year 9 for one and year 20 for
   the next.

With those three, the delay is structure. Without them, it is burial — and
critically, **the better athletics gets, the more true that becomes**, which is
the sharpest form of the question that was asked. A mediocre system arriving in
year 19 is a shrug; an excellent system arriving in year 19 is a game that hid
its best hour. So PR G is not optional garnish on Phases 1 and 2 — it is the
precondition that makes them safe to build.

---

# PHASE 1 — THE REACH

*Four PRs, no new simulation. Each takes an output that currently terminates in
a reading and gives it somewhere to go. This phase is worth landing on its own.*

## PR A — The fiftieth summer learns that athletics happened

**The change.** A seventh axis on `state/legacy.ts`'s `AXES` — campus life —
read from the same inputs `socialStandingBreakdown` already composes
(organisations, athletics, titles, what students report), scored the same 0..1
way the other six are. Athletic-flavoured entries added to the name tables so
that a run whose leading axis is campus life can be named for it.

**Why first.** It is the smallest change in the plan and it closes the widest
gap: the game's final statement currently cannot describe a third of a run.
It also needs no balance work — the legacy grades, it does not feed.

**Where.** `src/state/legacy.ts` (the axis and the name tables),
`src/components/LegacyAxes.tsx` (a seventh row), `test/` (the axis-count
assertions).

**The call to make first.** Seven axes, or fold campus life into a widened
"stewardship"? Seven. Stewardship is solvency, wealth and welfare — three
things about *running* a school. Campus life is a thing the school *is*.

## PR B — A title reaches the applicant pool, and the summer modal says so

**The change.** Two things, in one PR because they are one sentence to the
player. The `athletes` cohort signal gains a results term alongside its
capacity term, exactly as `researchOriented` has one — recent finishes and
titles on a decaying window, so a championship swells the next summer's pool
and fades over a few years rather than compounding forever. And the summer
admissions breakdown, which already apportions real head counts per cohort,
gets to say **which** result did it: *"the title in men's basketball is worth
4,100 of these."*

**Why.** The summer decision is the best beat in the game and athletics
currently contributes a flat, saturated +6% to it. This converts the single
most emotional moment athletics can produce into a number the player watches
arrive in the one modal they never skip. It is also the symmetry fix from
Finding 4: research output reaches the funnel, athletic output should too.

**Where.** `src/systems/admissions/cohorts.ts` (the signal, the pull, the
detail line), `src/state/types.ts` (nothing new stored — `s.orgs.titles` and
`s.orgs.lastSeason` already carry the years), the admissions interrupt.

**The risk, named.** The pool is the input to an economy that has been tuned
four times. Size the results term so a title is worth a *visible* bump and not
a strategy — the cap on the whole cohort should not move much; what changes is
what it takes to reach it. `npm run sim` is the gate.

## PR C — A venue earns on the days it is used

**The change.** The game's first non-tuition, non-endowment revenue line: a
home occasion at a venue produces gate revenue scaled by the venue's tier
(a stadium is not a multi-sport field), the team's quality, and the size of the
body that would turn up. Reported as its own line on the Treasury statement.

**Why.** The football stadium is $6.5M and forty weeks, the most expensive
Buildable and the largest footprint in the game, and it currently produces
*satisfaction*. Gate revenue is what makes a venue an investment rather than a
trophy, and it is the mechanism by which real athletics departments justify
themselves — which is the point: sized so that **a good programme roughly pays
for itself and a bad one does not**. That knife-edge is the decision the
budget tier has never actually posed.

**Where.** `src/systems/finance/financeSystem.ts` (one more line in
`financeBreakdown`), `src/data/facilitiesData.ts` (a per-venue capacity
figure), `src/systems/athletics/`.

**The risk, named.** The economy's history is a money-printing problem. This
line must stay a rounding error at scale and be *material in the decade the
venue is built*, which is the opposite shape to instruction cost. It should be
sized against opex at year 15, not year 40, and asserted in the balance test.

**Ordering note.** PR C reads "a home occasion", which Phase 2 provides. It can
land before Phase 2 by billing against the bracket and a flat number of home
dates; it reads better after. Either order works; do not block C on E.

## PR D — The cost of a big programme: athletes are a different draw

**The change.** The one structural item in the plan. Today a cohort decides
*how many* applicants and the quality band decides *how good* — deliberately
independent dimensions (`cohorts.ts` says so). This PR couples them in one
narrow place: the realised class's band mix shifts slightly with the athlete
share of the pool, so a school that recruits hard on athletics admits a class
that is *larger, cheaper to fill, and academically a shade weaker*.

**Why.** It is the institutional tension the subject matter is actually about,
and without it athletics is a pure-good purchase whose only cost is cash — and
cash stops being scarce. With it, "how big should athletics be" becomes a real
strategic axis with a real trade: campus life, money and a national profile
against incoming student quality, which is a genuine `computePrestigeTarget`
input.

Note what this does *not* do. Athletics still never touches the academic
number directly; it touches the **class the school admits**, and the class has
always been allowed to move prestige. This is the indirection
`docs/design/student-life.md` flagged as the acceptable shape, honoured exactly.

**Where.** `src/systems/admissions/` (the band mix), `cohorts.ts`'s own
comment that quality band and cohort are independent dimensions — which is the
claim this PR retires — and `docs/design/admissions.md`'s cohort section.

**The risk, named.** This is the one item that could break the funnel's tuning,
and it is deliberately last in the phase so that A, B and C can land without it.
If the sim says no, the fallback is smaller and still worth having: athletes
cost **scholarship money** (a per-team cost that scales with quality and
budget tier) rather than class quality. Weaker, but it is still a cost.

---

# PHASE 2 — THE SEASON

*Two PRs of new simulation and one of pacing. This is the immersion half, and
it is deliberately behind Phase 1.*

## PR E — A rival with a name, per sport, for the whole run

**The change.** Each sport the school fields has a **designated rival** — one
named school, derived (never stored) from the same deterministic hash
`sportStrengthFor` already uses, chosen from schools of comparable strength and
stable for the entire fifty years. It is shown on the sport's standings row and
in every occasion that involves them.

**Why.** The design review's unanswered complaint: *"a rivalry that is legible
over forty years… nothing lets you do anything about a specific rival."* A rank
is a number; a rank against Wexford State, whom you have beaten eleven times in
thirty years, is a story. It costs one derivation and no storage, which is the
discipline Plan 08 established for the rival field.

**Where.** `src/data/rivalData.ts` (the derivation),
`src/tabs/AthleticsTab.tsx`.

## PR F — Four occasions a year, a record, and a log with Saturdays in it

**The change.** Each active team gets a small, fixed set of **dated occasions**
per year — an opener, the rivalry game, a homecoming date, and the postseason —
resolved by exactly the weighted strength comparison the bracket already uses
in `playoffs.ts`, on one draw. Each writes a log line the week it happens. A
season record accumulates and is shown on the team card and the standings row.
Only the rivalry result and a title may raise anything modal, and a title still
queues.

**Why.** This is the answer to Finding 1 and the only genuinely new thing in
the plan. The log strip is the game's ambient texture channel and athletics has
never appeared in it; four occasions a team means a department of six programs
puts something in the log a couple of dozen times a year, for free, with no
change to how often the clock stops.

**The line this crosses, stated plainly.** `BACKLOG.md` defers *match
simulation and schedules*, and Plan 08 drew that line hard: "a bracket is not a
season". Four authored occasions is not a schedule — there is no fixture
generator, no opponent pool, no table, no travel, and the resolver is the one
that already exists. But it **is** a season in the one sense that matters to a
player: a record accumulates week to week. That is a deliberate partial
crossing of a deferral, and it should be argued in the PR rather than slipped
in. The argument is that four dates is the minimum that produces a record and a
rivalry, and a fixture list is the maximum that produces nothing more.

**Where.** `src/systems/athletics/` (a new `season.ts` beside `playoffs.ts`,
not inside it), `src/state/types.ts` (a season record per team, bounded and
overwritten yearly like `lastSeason`), `src/tabs/AthleticsTab.tsx`.

**The risk, named.** Log volume, and the temptation to grow this into fixtures.
Cap the occasions at a fixed small number authored in data, and make the cap a
constant with a comment saying why it is not a schedule.

## PR G — The pacing split: the mascot moves early, the fuse shortens, the path is visible

**The change.** Three small things that together implement §2:

1. **A first-sport-club beat**, years 2–5, where the school names its
   **mascot** — moved out of the athletic-director modal, which keeps the
   director's modal about the director. The first sport club is the first time
   the question has an answer, and it is a decade earlier.
2. **A pity timer on the first sport club** — if a student centre has stood for
   *N* years and no sport club has formed, the next club formation is one. The
   same "a pipeline should be a guarantee, not a lottery" argument
   `fireVarsityPetition` already won, applied one step earlier.
   `VARSITY_PETITION_MIN_TENURE_YEARS` drops 5 → 3 alongside it. Together these
   should move the first varsity team to roughly years 7–11 for every run
   rather than 8.75–19.75 across two.
3. **Foreshadowing** — a sport club's row on the Student Life tab says when it
   may petition. One string.

**Why.** Per §2, this is the precondition that makes Phases 1 and 2 safe: the
better athletics becomes, the more expensive the current variance is.

**Where.** `src/data/studentLifeData.ts` (the constants),
`src/systems/events/eventSystem.ts` (the beat), `src/tabs/StudentLifeTab.tsx`,
`src/components/InterruptModal.tsx`.

**Measure it.** This PR is the one with a number to hit. Report first-sport-club
year, first-varsity year and first-title year across the sim's seeds before and
after; the spread matters more than the mean.

---

# PHASE 3 — THE DYNASTY

*What the late game does with a department. Only after Phases 1 and 2.*

## PR H — What a big programme risks

**The change.** Athletics acquires a downside the player cannot simply absorb:
a recruiting or booster scandal whose probability rises with the budget tier
and with how far the athletic programme has outrun the academic school, and
whose penalty is a **postseason ban for a season or two** rather than a cash
cost. Authored into the existing decision table, taking weight from the shared
budget rather than adding a stream.

**Why.** *"Nothing can go wrong that the player can't ignore"* is the review's
finding about the whole game, and athletics is the right place to answer it
first, because the exposure is something the player **chose** — a high budget
tier and a department outrunning its school is a posture, not bad luck. A cash
penalty would be ignorable by year 20; losing a season is not.

## PR I — A department that keeps moving after the campus is finished

**The change.** The late-game texture that makes athletics the living system of
the fourth decade: rivals poach a successful head coach (the faculty outside-
offer event, aimed at a coach), a venue worth expanding once the programme
outgrows it, and a coach who ages out. Each is small; together they are the
reason to open the Athletics tab in year 35.

**Why.** Because this is the row of §2's table that justifies athletics being a
mid-late feature at all, and it is the only phase that produces *new decisions*
in the decade where the review measured four to fourteen actions a year.

## PR J — Docs

`docs/design/student-life.md` (the athletics half, which is the largest single
edit — the postseason section becomes the season section), `progression.md`
(campus life is now graded in the legacy), `economy.md` (gate revenue),
`admissions.md` (if PR D lands), `BACKLOG.md`'s athletics deferrals (what has
left the list and what the season did to the line).

Per the plans README, docs are not a trailing afterthought — but they are
genuinely last here, because Phases 1–3 change what the design *is* and
writing it twice is worse than writing it once.

---

## What this plan does not do

- **A fixture list, a league table, or a simulated match.** PR F is four dates
  and a result each, and the line is defended in the PR.
- **An athlete roster, or recruiting individual players.** The player recruits
  through a budget tier and a coaching staff. A named-athlete layer is a second
  faculty system and the game does not need one.
- **Conferences or realignment.** The field is a hundred schools and one
  national bracket, and that is enough structure.
- **Disbanding a team**, and therefore still not what happens to a venue whose
  last team folds. Unchanged from Plan 08, still on the backlog, and PR H makes
  it likelier to be asked.
- **Anything to the academic standing.** PR D reaches prestige only through the
  class the school admits, which is a path that already exists.

## Open questions, to settle before PR A

1. **Seven legacy axes, or six with campus life folded in?** This plan says
   seven. It is the one call that changes a shipped, sealed record shape.
2. **Does gate revenue want a crowd concept?** A venue's `serves` figure exists;
   whether the gate reads enrollment, alumni, or a stored attendance is a real
   fork, and the cheap answer (enrollment × quality × venue tier) is probably
   the right one.
3. **How much of a title should the funnel feel?** Somewhere between "nothing"
   (today) and "a strategy". The sim decides, not this document.
4. **Does PR F's record want to be visible to rivals?** A rival's season is
   currently derived and unstored. Keeping it that way is cheaper and means a
   rivalry record is one-sided — the player's memory, not the world's. Probably
   correct, but say so deliberately.
