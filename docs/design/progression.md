# Prestige, rankings, and the institution's arc

How a school is founded, how standing accumulates, and how the outside world
reports on it.

## Startup

A **startup screen** asks the player three things before play: the **name** of
the school — their half of it only; every school opens as a *College* (see
"College, and University" below) — the **vernacular** its campus is built
in, and the **colours** it wears.

## The ladder

What the college can build, and which screens it has, opens a piece at a
time. The **ladder** is a set of named milestones (`data/ladderData.ts`),
each with one condition and a list of what it opens. The ticker strip shows
the nearest one and its progress, and clicking it opens the whole ladder.

- **Milestones are independent.** Each opens on its own condition, in any
  order. A college that never founds a school still grows to 20,000
  students, and one that barely grows still founds its schools.
- **Milestones are permanent.** One reached is never undone, even if
  enrolment or prestige later falls below its threshold.
- **Each milestone arrives as a letter** in the inbox (Plan 77), naming
  what it opened, and stays there to be read again for a year: since Plan
  80D a milestone records the week it was reached (`s.ladder.reachedWeek`),
  and its letter leaves the inbox a year after, read or not, as the
  founding years' note does. The milestones panel keeps the record.
  Letters never stop the clock.
- **The founding build list is short and curriculum-first:** the first
  dorm, the dining hall, the quad and the library. The Student Center and
  the Recreation Center follow the fourth program. (Until Plan 80D the
  college opened teaching three, and the fourth was the opening
  walkthrough's last step; now the walkthrough founds the first.)

| Tier | Milestone | Condition | Opens |
| --- | --- | --- | --- |
| Founding | The charter | founding | Founders Hall, the dorm and dining chains, the Campus Quad, the Library; Curriculum, Faculty, Treasury |
| Founding | A fourth program | a fourth program founded | Student Center, Recreation Center |
| Founding | First commencement | the first summer closes | In History (open from the first week with Prestige and the guide, Plans 78C and 80C), the record of the years; in Students (open from the first week, Plan 78B), the guidebook, the clubs and the funnel |
| Founding | A curriculum | eight courses developed | academic halls |
| Growing | A town's worth | 1,500 students | Health & Counseling Center |
| Growing | A regional name | prestige 55 | Athletics Complex, Student Union Expansion, Grand Quad & Gardens |
| Established | A small city | 6,000 students | University Clinic |
| Established | A research reputation | prestige 70 | The Bell Tower |
| Established | A market of its own | 8,000 students | Campus Grocery Store |
| National | A university town | 20,000 students | Medical Center |

**Four side milestones** show on the ladder but drive gates of their own:

- a school founded opens its laboratories;
- a laboratory finished opens Research;
- a sport club opens Athletics, and its venues open team by team;
- a school distinguished opens its graduate programs.

## The colours

A pair, picked from eight named collegiate pairings — *Maroon and gold*, *Navy
and orange*, *Black and gold* and so on (`data/schoolColors.ts`) — and worn as
the game's theme: the dock, the active tab, the primary button and the focus
ring all take the pair, so a navy-and-orange school plays in a navy-and-orange
game. Permanent, like the vernacular, and like it read by **no system at
all**: `self.colors` reaches the stylesheet (`components/theme.ts`) and
nothing else. Every rival is dealt a pair off its id from the same table,
unread until the playoff bracket and the annual report draw it.

Every offered pair passes one rule, pinned by `test/school-colors.test.ts`:
cream text on the primary and the primary as text on the secondary both read
at 4.5:1 or better, because those are the two pairings every screen draws.

## The vernacular

Which architecture the campus was founded in: **Georgian** (red brick, white
trim, a gilded cupola), **Collegiate Gothic** (grey ashlar and steep slate,
with corner towers, buttresses and a spire), **Classical** (limestone and
columns under copper roofs, with a stone dome), **Mission** (cream stucco,
red tile, arcades, bell-gables and a campanile) or **Modern** (white panel,
glass and burnt-orange brick under flat roofs). Chosen at founding and
**permanent** — a campus's architecture is what it was built as, so nothing
ever offers to change it.

It is deliberately the one thing on that screen with **no mechanical effect
whatsoever**. Every founding condition is identical across the five, and no
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
then compounds — so the public arc in the old harness (`sim/balanceSim.ts`, since retired) ended year 20 some 30
prestige points lower without it, while never becoming insolvent. Nothing
replaced it.

## Prestige: a slow-moving stock

`self.reputation` ("prestige") is a **stock**, not a flow: it is never
incremented directly by completing a course, a building, or a milestone — there
is no snappy "finish a course, get a prestige bump." Instead it is **graded
once a year**: at the summer admissions boundary the inputs below are scored
for the year just ended and summed into a year score on the same 5..150
scale, and prestige steps toward that score by a share of the gap —
`PRESTIGE_RISE_RATE` (0.20) above it, `PRESTIGE_FALL_RATE` (0.30) below (see
`src/systems/prestige/prestigeSystem.ts`'s `gradeYear`). A climb is capped at
`PRESTIGE_MAX_RISE` (2.1) a summer ([Plan 67](../plans/67-pacing-tuning.md), 2.1 since Plan 68):
a college that has outgrown its standing earns it a year at a time, so the
climb from the founding's low fifties to 150 takes about forty years whatever
order the catalogue fills in. It never jumps to
the score: a long-established school's prestige is sticky, and a school that
falls short falls faster than it climbs. Between summers a weekly tremor, a
tenth of the old drift, keeps the toolbar number alive. Welfare and crowding
are graded on the year's *average*, because those are the two a player could
game by timing a dorm's completion in week 50; everything else on state at
the summer.

**Prestige is the blend of four pillars** ([Plan 85](../plans/85-specializations.md)
PR B, by the owner's decision). Until then prestige *was* academic standing,
and research and campus life were rankings beside it that never fed it
([Plan 80](../plans/80-the-owners-playtest.md) §1). The owner asked for
prestige to measure all four things a college is known for, so each pillar
is now a standing on the prestige scale, from 32 (a college with nothing)
to 150 (every term in full), and prestige's target is their weighted mean:

| Pillar | Share | Its terms (their weights among themselves) |
|---|---|---|
| Academics | 35% | curriculum breadth (50, × library adequacy), concentration (30), teaching quality (30), incoming student quality (24, × scale) |
| Research | 25% | what the labs have produced (80: publications, finished projects, breakthroughs, prizes, doctorates, against 60 credits), fields with a lab (40) |
| Student life | 25% | welfare (20), campus life (12: the places, the clubs and chapters, what students report of their social life), beauty (6, either way from 50) |
| Athletics | 15% | program strength (30), championships (20), the flagships' quality (20) |

Athletics counts least, by the owner's decision; the shares are
`prestigeSystem.ts`'s `PILLAR_WEIGHTS`, beside the other prestige
constants, and Plan 85C tunes them. A term keeps its old weight where it had
one: academics' and student life's are prestige's, research's the research
standing's, athletics' the campus life standing's (the flagships' is new, at
the titles' weight). A capital project's lift is points on its pillar, on top
of its terms. Three **adjustments** stay outside every pillar:

- **financial resources per student** (+8, endowment against the enrolled
  body) — what the late-game endowment campaigns buy;
- **condition of the buildings** (up to −4) — only neglect counts;
- **crowding** — a *penalty* of up to 25, not an input: the worst of the
  housing, dining and health coverage ratios and the instruction-capacity
  ratio, averaged over the year as a shortfall below 85% coverage (Plan 71
  dropped the library and social space: a college that has not built one is
  short of it, not overcrowded). A subtraction, so it can take a school
  *below* what its pillars earned. The same reading shrinks next year's
  applicant pool (see [admissions.md](admissions.md)).

**No pillar is capped; each holds a share only its specialization fills**
(the owner's decision in [Plan 85](../plans/85-specializations.md) PR D's
review, 2026-09-30, replacing PR C's ceilings: "the game should just be
structured such that it's not possible (or highly improbable) to get as high
as 150 without the specialization bonus"). Each pillar holds a
specialization term (`prestigeSystem.ts`'s `SPECIALIZATION_TERM_WEIGHTS`,
beside `PILLAR_WEIGHTS`), and its other terms share the rest of the 118
points above the floor in their old proportions:

| Pillar | Specialization term | Natural maximum without it |
|---|---|---|
| Academics | 24 | 126 |
| Research | 24 | 126 |
| Student life | 30 | 120 |
| Athletics | 30 | 120 |

A college that does everything else perfectly stands at the natural maximum
(`UNSPECIALIZED_MAXIMA`), because the term is empty, not because anything
holds it. The capital projects are one of a pillar's terms, scaled with the
rest (before, their lift was points on top). The term is an ordinary row in
the pillar's breakdown, named for its program ("The faculty training
program": "+0.0 of 24 · comes only with a specialization in academics";
specialized in another pillar, "so this stays empty"). The college's own
specialization (below) fills its term (`specializationData.ts`'s
`SPECIALIZATION_READINGS`), each by its own mechanic as Plans 85E–H build
them, and until then a tenth for each year since the choice. Academics reads
the faculty training program (Plan 85E): the share of the faculty on the
roster trained at the Faculty Training Institute, full at 40%
(`trainingData.ts`'s `TRAINED_SHARE_FOR_FULL`), and nothing while no
institute stands (see [faculty.md](faculty.md)'s training). The strong
players fill it 10 or 11 years after the choice. Research reads the research
park (Plan 85F): the years of Landmark work the Research Park has hosted in
the last ten, a year for each program each year it runs and no more than
three at once, full at twelve (`researchParkData.ts`'s `parkReading`), and
nothing while no park stands (see [research.md](research.md)'s research
park). The Guided player held to research fills it 10 to 12 years after the
choice. Athletics reads the athletic performance complex (Plan 85G): the
deep runs its programs have made in the last ten years with the Athletic
Performance Complex standing, a title counting 1, a lost final a half and a
lost semifinal a quarter, full at 40 (`athleticsComplexData.ts`'s
`complexReading`), and nothing while no complex stands (see
[student-life.md](student-life.md)'s complex). The Guided player held to
athletics fills it 10 or 11 years after the choice. Student life's term is larger because
it is the easiest pillar to fill; athletics' because without the athletics
specialization a program's quality slows above 80 and titles are rare (see
[student-life.md](student-life.md)'s postseason). Tuned so that optimal play
without a specialization reaches the overall top ten and never first place.
Its cost, measured in Plan 85D: with no slack above a cap, every shortfall
shows, so every college stands lower through the middle of the run than it
did under the ceilings, and the strong players climb the guide about six
years later.

**The milestone and the choice** ([Plan 85](../plans/85-specializations.md)
PR D; `systems/prestige/milestone.ts`). The specialization is chosen once,
late, and kept:

- **The milestone is a rank, not a prestige figure,** so it survives a
  retune: the guide's top 20 (`SPECIALIZATION_MILESTONE_RANK`, beside the
  term weights). The plan's first number was the top 15, and the first
  version, with ceilings, used the top 12. Without them the climb is
  slower, and the owner kept the structure and lowered the milestone (Plan
  85 §2, 2026-09-30): the top 20 is the tightest rank the Guided and
  Completionist players reach in the owner's years 25–40 on every seed
  (Guided 29–31, the Completionist 30–38).
- **The board's notice** comes the first week the college stands within
  four places of it (`SPECIALIZATION_NOTICE_PLACES`, the top 24): a board
  letter in the inbox, which never stops the clock, naming the four
  specializations and the points of its pillar each opens. The strong
  players have it two to five years ahead of the milestone.
- **The offer** is made at the first summer the college stands at the
  milestone, read on the summer's own week after the field has moved (the
  table the summer's review prints), and stands for good.
- **The choice** is raised at that summer's close, after the page has
  turned (so it holds no week), as a page of its own in the inbox: the four
  specializations side by side, each with its pillar and the share of it
  it opens, its mechanics (those still to come are said to be), the college's
  value and rank in the pillar, and the rivals already specialized in it
  with the strongest of them. Choosing asks twice (Plan 47's confirm): the
  choice is permanent, saved as `s.specialization` with the summer's year
  (`specializationYear`), and the chronicle marks the year.
- **Not this year** leaves the offer standing: the choice comes back at
  the close of every summer until it is made, even if the college has
  slipped below the milestone since. The game never chooses for the player
  (the default answer puts it off). A college that never reaches the
  milestone is never offered it, and a sandbox run never is.
- **What it gives now:** its pillar's term opens and fills (academics as
  its faculty is trained at the institute, research as Landmark Programs
  run at the Research Park, athletics as its programs make deep runs with
  the Athletic Performance Complex standing, student life over ten years),
  so the pillar can rise to 150. The athletics specialization also takes
  away the slowdown of a program's quality above 80 and the big stage's
  edge (`specialization.ts`'s `athleticsLifted`, the hook Plan 85G's
  performance complex extends). Each specialization's own mechanics (the
  faculty training program, the research park, the downtown and the
  festival, the performance complex) are Plans 85E–H; the choice lists
  those not yet built as still to come, from `specializationData.ts`'s
  `SPECIALIZATION_CARDS`, where each PR marks its own ready. Academics'
  (Plan 85E) is built: the Faculty Training Institute, a capital project
  only a college specialized in academics may build, and the year's
  training picks (see [faculty.md](faculty.md)). So is research's (Plan
  85F): the Research Park, which only a college specialized in research may
  build now, with the Landmark Program it opens and, while it stands, a 15%
  boost to every lab's output (the owner's decision, 2026-10-01; see
  [research.md](research.md)). It lifts no standing of its own: its 18
  points of research went to the pillar's other terms, by the rule above. A
  park built before Plan 85F stays, with its Landmark Programs, whatever
  the college chooses, and fills no term and gives no boost unless it
  chooses research. So is athletics' (Plan 85G): the Athletic Performance
  Complex, a capital project only a college specialized in athletics may
  build, which while it stands gives the department two flagships above the
  subsidy level's, scholarships that recruit a sixth more and a college 3
  points stronger in its semifinals and 4 in its finals (the owner's
  decisions, 2026-10-01; see [student-life.md](student-life.md)). The build menu
  lists a specialization's building closed, with the reason, to a college
  that has earned it otherwise.
- History › Prestige and the standings say where the college stands on the
  choice (specialized, and since when; the offer standing; or the milestone
  still to reach), and the guide tags the college with its specialization as
  it tags every rival. The Final Report's title names it first ("a college
  known first for its teaching"), in place of the guidebooks' tag.

With only the term filling (Plan 85D), the Guided player (which chooses
its strongest pillar, academics, in years 29–31) reached first place in
years 42–44 and held it at year 50 on every seed; the Completionist
(academics, years 30–38) was first on two seeds of three, from years 45 and
49. With the training program filling it (Plan 85E), Guided is first from
years 43–45 on every seed and holds it; the Completionist is first on two
seeds of three, from years 46 and 50. With the research park a
specialization's (Plan 85F), Guided is first from years 42–47 on every
seed, the Completionist from 47 on two of three; both still choose
academics. Held to research, Guided is first from years 46–47 on every
seed. Held to athletics (Plan 85G, the complex built), Guided is first from
years 40–45 on every seed and the Completionist from 45 on two of three. Held to no
specialization, neither is ever first (best 4th; since Plan 85F, best
3rd).

The pillars' terms, as they were weighted inside prestige before:

- **curriculum breadth** — majors/schools completed *right now* (a stock
  read off the milestone booleans — see [curriculum.md](curriculum.md)) plus
  the **graduate programs** founded on top of them, not courses added this
  year. The four shares inside this one input sum to 1, so finishing
  everything scores exactly 1 and graduate work raises no ceiling — it
  occupies the last 0.15 of the one that already existed (see
  [graduate-programs.md](graduate-programs.md)). Multiplied by library
  adequacy.
- **concentration** — the "known for" term, breadth's other half: how
  deep the school's *deepest* school is — founded (six of its programs housed
  in one hall, 0.4) and distinguished (every one of its programs complete,
  0.6). Only the best school counts; a second founded school is breadth, and
  breadth already pays for it. This is what lets a small elite college and a
  broad state university both be real.
- **teaching quality** — the campus average course grade (see
  [faculty.md](faculty.md)'s "Course quality"). Its own input, not a multiplier
  on anything: a school teaching twenty courses beautifully in its first decade
  is credited for them, years before any milestone gate opens.
- **incoming student quality** — the average quality of the class that
  actually enrolled that cycle, scaled by how big the school is.
- **welfare** — the year's average satisfaction, scored `(sat − 40)/40`:
  below 40 it earns nothing, at 80 it pays in full. What lets a happy small
  college hold a standing a crowded large one cannot.

**The teaching standard caps the target** ([Plan 71](../plans/71-economy.md),
the owner's rule: "you don't become a highly prestigious school with mediocre
teaching"). Every graded course scores grade points (A 1, B 0.65, C 0.35,
D 0.1, F 0); their mean sets a ceiling of 88 + 62 × mean
(`prestigeSystem.ts`'s `teachingCeiling`), and the target is the lower of that
and the weighted sum. The line is straight since
[Plan 80F](../plans/80-the-owners-playtest.md) (it was 88 + 62 × mean^1.3,
which held an all-B campus near 123 and made each grade's first steps worth
the least): an all-B campus reaches about 128, half B's and half C's 119,
and only A's everywhere reach 150. The History tab names the ceiling, says
where a campus of B's tops out, and says when it binds.

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

**The player can see all of this.** The History tab opens with **Prestige**
— one row per pillar and per adjustment, each row a bar of what it is *worth*
against the most it could reach, and today's stock against the target it is
drifting toward. Each pillar's row opens onto its own make-up: its terms,
the two multipliers on the academic rows they touch, and a capital project's
lift. History's standings show the four pillars again, each broken down,
beside their rankings. It is read off `prestigeSystem.ts`'s
`prestigeBreakdown` and `pillarBreakdown`, and **each target function is a
sum over its own breakdown**, so the panel cannot disagree with the tick that
produced the number. The rows are data: an input that is added, retired
or reweighted changes that one file and the panel follows.
Prestige is there **from the first week**, and the dock's Prestige chip opens
it (Plan 78C; the Rank chip opens the guide's table, below); before the first summer its note says that prestige
is graded at the end of each year and the first grade comes at the first
summer. The summer Review lists each term's grade with the same "what moves
it" line under it (`standingDetailLine`), so the two cannot word a term
differently.

**The report card is shown.** The Prestige panel carries the summer model in
its note — what the year is grading toward, what the step would move — and
each row shows last summer's grade beside what it is worth now; the crowding
row is drawn as the subtraction it is. Under the inputs sits one **reading**
that counts for nothing: **instruction capacity**, the seats the housed
catalogue can teach, which is the ceiling on enrollment (see
[admissions.md](admissions.md)). A school whose grade drops thirty points
loses nine the first summer and six the next; climbing back takes years, and
the climb is *unblocked* — nothing about a low grade makes an input harder to
raise, which `test/report-card.test.ts` asserts and the sim's recovery
scenario proves on a broken school. Plan 15 is the record of how this model
replaced the weekly drift and what it was fitted to:
[`../plans/15-growth-has-a-cost.md`](../plans/15-growth-has-a-cost.md).

**Direct-mutation audit.** `self.reputation` is written in exactly three places,
and all three are intentional. (1) **Founding** sets the opening value
(`BASE_STARTING_REPUTATION + preset.prestigeBonus + GENED_BUILDING_REPUTATION_BONUS`
in `actions.ts`) — a one-time initialization, not a gameplay bump. (2)
**`prestigeSystem.ts`**: the summer step (`applyReportCard`, called from the
reducer's `RESOLVE_ADMISSIONS`), the weekly tremor (`tickPrestige`), and that
same file's `setPrestigeForPlaytest`, the debug panel's "set prestige" (see
[`../architecture/playtesting.md`](../architecture/playtesting.md)), which
lives there rather than in the reducer precisely so this audit stays a
*file*-level one, and which clamps to the same band the step does. (3)
**Rivals** write their *own* `reputation`
(`rivalsSystem.ts`), never the player's. Nothing else touches it: research,
student life, decision events, satisfaction and rankings all read prestige and
never write it. In particular, **being ranked does not raise prestige** —
rankings are a measurement *of* prestige (see "Rankings"), a strictly one-way
read. Any future change must preserve this: prestige is composed from inputs, it
is not a running tally of bonuses.

## Four pillars, and their rankings

A school is ranked on **prestige** and on each of its **four pillars**
(Plan 85B; before it, on three standings, academic, research and campus
life, of which only the first was prestige). All live in `prestigeSystem.ts`,
which is what lets one file hold every writer.

| Ranking | The player's | A rival's |
|---|---|---|
| Prestige | `reputation`, graded each summer toward the blend | the same blend of its four pillars (`rivalsSystem.ts`'s `rivalOverall`) |
| Academics | the academics pillar, read as it stands | its `reputation`, the stock the field has always drifted |
| Research | `researchStanding`, a stock drifting toward the research pillar | its `researchStanding` |
| Student life | `socialStanding`, a stock drifting toward the student-life pillar | its `socialStanding` |
| Athletics | the athletics pillar's score, 0–100 | its `athleticStrength`, 0–100 |

**A rival's prestige is the same blend.** Its stored `reputation` became its
academics, its research and campus life standings its research and student
life, all already on the prestige scale; its athletic strength runs 0–100 as
the player's athletic ranking does, and maps onto the scale the way the
player's athletics pillar does (32 + 118 × strength/100). The player's
prestige adds the endowment and loses its penalties, which a rival does not
carry. So a rival's overall and the player's are one scale and one formula:
a rival that is an academic power and an athletic minnow ranks below its
academic place, as the college would.

**The elite band chases the leader's prestige with its overall.** The closing
step (`eliteClosingStep`) is read on the rival's overall and added to every
one of its pillars, so its overall rises by the step; the no-leapfrog cap
likewise shifts every pillar down. The academic axis rises toward
`FIELD_CEILING`, the others drift on their own momentum, and the whole
annual pass still takes one draw on the global stream.

**Rivals specialize** (Plan 85C). Each rival is dealt one pillar off its id
(`rivalData.ts`'s `dealtSpecialization`, a hash under the salt
`specialization`), saved on the rival (`Rival.specialization`) and never
changed. Of the 99, 35 are academic, 23 research, 19 student-life and 22
athletic specialists, and the six strongest authored schools cover all four,
so every pillar has a leader to catch. The deal changes how the axes drift,
never how many draws they take:

- **The specialized axis runs higher and steadier.** It rises as the field's
  academics does (`fieldRise`: the strongest schools most, by the fourth
  power of their authored standing), at twice the rate
  (`SPECIALIZED_RISE_RATE`), easing toward `SPECIALIZED_CEILING`, 150 (for
  athletics, the top of its 0–100 band, 85). It takes half its momentum and
  its yearly shock (`SPECIALIZED_STEADINESS`). An academic specialist's
  academics rises this way instead of toward `FIELD_CEILING`.
- **The other three are not capped** (Plan 85D's review): each drifts
  toward `RIVAL_UNSPECIALIZED_TARGETS` (academics and research 112, student
  life 107, athletics 90, each at or below the college's natural maximum).
  An upward move shrinks to nothing over the last 8 points below the
  target (`RIVAL_TARGET_EASE`), a downward move is whole, and an axis
  already above (an authored standing, or an old save) takes no upward move
  until it has fallen below; nothing pushes it down. The elite band's
  closing eases the same way. (Plan 85C stopped them at its ceilings.)
- A year-ago estimate (the report's movers) steps each axis back by its
  momentum at its steadiness.

The guide tags each rival with its specialization after its name and marks
its specialized pillar's figure; the standings name each leader's
specialization. A save from before is dealt the same way on load (the
87 → 88 migration), with its standings left where they were.

The result is the shape the owner asked for: at year 50 the leader of each
pillar is a specialist in it, a handful of specialists stand above the
college's unspecialized best, and the college without a specialization
finishes in the top ten but not first. The college's own specialization
(Plan 85D, above) is what lets it past them.

**Access and financial strength** are ranked beside them and count toward
nothing.

**Ties go to the college in the standings** (Plan 85C, the owner's
decision). Prestige, the four pillars, access, financial strength and the
report's year-ago table sort by `rivalsSystem.ts`'s `byStanding`: the higher
value first and, level, the college ahead; rivals among themselves keep the
field's order. (Ties were common at Plan 85C's ceilings, where the college
and the rivals held there shared one value.) A sport's own table, and
so its playoff seeds, keeps the old rule: level, the rival is ahead.

Rivals carry the same field names as the player — which is what lets one
`rankedListBy(axis)` serve every leaderboard — seeded by a deterministic
spread off each school's own id and drifted annually on independent
momentum, so the tables tell different stories. Each axis's drift runs on its
own generator, all seeded from a single global draw.

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
  fires a one-time **"The college enters the guide"** interrupt — entering is the
  event, and it keeps its own moment.
- Thereafter the report has **no stop of its own**. It was the summer's
  Standing beat until Plan 33 dropped it (V1-1); the year's standing is read
  in the summer's Review, whose Standing section grades the year and names
  who passed the school (see [admissions.md](admissions.md)'s "The summer"),
  and in History's standings, which show the six rankings, who leads each and
  each rank over the run.
- **The guide's table is always one click away** (Plan 80C): the Rank chip
  opens History › the guide, the table the entry reveal prints
  (`components/RankingsTable.tsx`), read live from `rankedListBy` — the top
  fifty and, for a college below them, a gap and its own row with a neighbor
  either side.

The report's subject is the prestige table — as a real table now, with a
column for where each school stood a year ago (the player's exact, a rival's
the same momentum-step estimate the movers list uses, each pillar stepped
back) — with the four pillars and access and financial strength as a line
each beneath the headline rank: the school's place, and who leads that axis.
The live guide adds each school's four pillars as columns beside its score. Deliberately not two more tables: a full list belongs
where its subject does (research standing reads on the Research tab). Neither
line carries a year-over-year move, because `YearSnapshot` records only the
academic rank and a move needs a stored prior; naming the leader is the
context a bare ordinal was missing.

Every school also carries a **mascot** — the player's own is named at the
athletic-director interrupt rather than at founding, and is empty until then.
Nothing mechanical reads one; they are what lets a standings row read as a
sports page rather than a spreadsheet.

**The field's annual drift takes exactly one draw on the global random stream
per year**, whatever the field's size: `tickRivals` seeds a local generator from
it and runs all 99 schools off that. This is a *harness* property rather than a
gameplay one, and it is load-bearing — the harness binds the game's seeded
stream to make a run reproducible, so a per-rival draw meant that adding schools
reshuffled every faculty potential and candidate listing in the game and made
the balance gate unable to distinguish a rebalance from a reshuffle. Pinned at
one draw, the rival table can grow, or gain axes of its own, without moving the
economy's dice at all.

## The fifty years

A run is **fifty years**, and the fifty have three eras. The **found** era
(years 1–12) is the founding college, the first halls, the first schools — money tight,
faculty scarce, every slot a commitment. The **build** era (12–35) is where the
catalogue and the campus get made; completing every school is *barely*
possible in the window. The **defend** era (35–50) has little left to build,
and the field closes on the leader (below). The eras are a design target
([economy.md](economy.md)'s pacing table is fitted to them), not a rule: the
game never says which era it is in.

The fiftieth summer files the **final report** in place of the year in review
(see [admissions.md](admissions.md)'s "The summer"): the six standings graded
over the run, the promises kept and missed, the four numbers a founder would
want — students taught, faculty who served, prizes, titles — and the
fifty-year curves. Then the record is **sealed**: `s.ending` is written once,
at that summer's boundary, and never again. **The clock does not stop.** The fifty-first year
opens as any other, the sixtieth summer files an ordinary year in review, and a
player who wants to see the hospital finished can; the History tab keeps the
report as it was written, and every tenth year after adds an addendum. The startup screen says
what the game is — *Fifty years to build a university.* — and the History tab
counts down as well as up ("Year 23 of 50"), its charts fixed at fifty so the
curves have somewhere to go. Plan 17 is the record of the decision and its
fitting: [`../plans/17-the-endpoint.md`](../plans/17-the-endpoint.md).

### Promises

The objectives are **promises**: public commitments with a deadline, a reward
and a penalty (Plan 33, which retired the twenty ambitions). Twenty-seven are
authored (`data/promiseData.ts`) — *Four schools*, *A thousand students on the
lawn*, *Owing nothing to anybody*, *Into the guide's top twenty* and the rest —
each with when it may be offered and what keeping it means, both in the event
catalog's conditions. **Every promise states its target** (Plan 80C): the
offer and the Promises panel say the measure, the figure, the summer it is
judged and where the college stands now — *"Admit rate 25% or lower at the
summer of Year 14. Now 36%."* — written from the goal's conditions
(`systems/promises/promiseTargets.ts`), so the words cannot disagree with the
test. A promise is judged at the start of the summer it falls due, so an
admit-rate promise judges the rate set the summer before. Each summer's Review settles the promises that came
due, kept or missed and paid, and, from Year 3 and with fewer than three
open, may offer one; the player accepts or declines, and declining is free.
At the summers of Years 10, 20, 30 and 40 the offer is a list of three
instead, of which the player takes up to two. Offers are drawn from a hash of the college
and the year, never the run's random stream (`systems/promises/promises.ts`).
History lists them: open, kept and missed.

### The Final Report

**Six grades and a title, not a score.** A single number ranks runs and a
ranking has one right answer, which is what had turned the game into a
checklist. The report grades the whole arc, not the last snapshot
(`state/finalReport.ts`, its words in `data/reportData.ts`): each of the six
standings — academics, research, campus life, athletics, access and
financial strength — read from the history rows, graded A–F on its last
decade's average, its average over the run and its climb from the first
decade. Over them sits a mark, which also weighs where the guide left the
college and how many promises it kept. The **title** is built from what the
guidebooks call the college (its first tag), or its strongest standing, and
names its weakest standing where that one lags: *a research powerhouse that
never gave its students much of a campus life*. The money's verdict, the
chronicle's eras and the guide's last word complete it.

**The chronicle names eras for what the college did** (Plan 80C;
`systems/chronicle/chronicle.ts`, its words in `data/chronicleData.ts`). Each
closed year is classed by its largest new thing, in this order: the founding
years; the interim CFO and the troubles; reaching first in the guide; a
school founded; a graduate degree taught in full; entering the top ten; a
capital project or grand landmark finished; titles; research prizes; a
campaign closed; a fall in the guide; a building boom; else a quiet year
(named for a letter it answered, if any). Eras are runs of years, each the
largest kind among its years; a run too short to be an era folds into a
neighbor, and two eras of one kind never stand in a row. So a college that
climbs steadily is no longer the Rise, the Climb and the Ascent again: its
eras are *The Years of the School of Science*, *The Medical Center Years*,
*The Championship Years*. Rank names an era only at a real turn — entering
the top ten, reaching first, or a fall — and each turn only the first time
it comes (a fall for as long as it lasts), so a college drifting back and
forth across the top-ten line is not turning again each time. It reads what the game keeps for
good: the history rows (which count the research prizes), the milestones'
years (`milestoneYears`), the titles, the buildings and the journal.

Plan 17's legacy — seven axes and a name from twenty-one sentences — was
retired by Plan 33 for the report. It is kept as a harness reading only
(`sim/legacyReading.ts`), because the endpoint suite's strategies were
designed against its axes.

From the tenth year the History tab shows the report in draft — the arc so
far — the way the Prestige panel shows what the year is grading toward.

### The top has to be held

The ten schools authored at 87–99 (`rivalData.ts`'s `ELITE_RIVAL_IDS`) gain a
term in their annual drift: a pull toward the player's own standing less four,
at a rate that closes a ten-point gap in about five years
(`rivalsSystem.ts`'s `eliteClosingStep`). Applied only while the player is
above prestige 100, so the found and build eras meet the field they always did;
deterministic and only ever upward on the rival, so the field's one draw a year
is untouched. The player can still be first — the field arrives. With
prestige able to fall (above), a school that coasts in the defend era now loses
*rank* for it, which is the whole mechanism of the era and needs no new system.

**The field rises on its own** ([Plan 67](../plans/67-pacing-tuning.md)).
Every rival gains a little each year, in proportion to the fourth power of
its authored standing (`FIELD_RISE_RATE`, 1.05 a year at an authored 100),
easing to nothing at the field's ceiling (`FIELD_CEILING`, 138), past which
no rival drifts (since Plan 85D's review, an unspecialized rival's
academics eases toward its target of 112 instead, and an academic
specialist's toward 150). The top of the field climbs from the high 90s to the
ceiling over about forty years, the tenth and twenty-fifth places with it, so
the top 25, the top ten and first place come in the build era's second half
and the defend era, not the found era. The elite's closing on a leader is not
drift: a leader above the ceiling is still chased, and passed if it coasts.

**First place can be taken, late** ([Plan 72](../plans/72-owners-answers.md)
I). The band does not leapfrog a leader that holds its standing
(`ELITE_NO_LEAPFROG_GAP`): it closes to within a point and stops. In the
last fifteen years (`CONTEST_YEARS`), a college whose standing has slipped
more than three points below its own best (`CONTEST_SLIP`; the best is the
highest in its history, so nothing new is stored) loses that protection:
the band chases where it stood, less the slip, and may pass. A college that
climbs back within the slip is protected again. Losing a place says so as
any rank change does (the toast and its sound).

A rival that passes the school says so — in the year in review's Standing
section — and, once per rival and only in the defend era,
the board proposes a response at a real cost (see
[`../architecture/interrupts.md`](../architecture/interrupts.md)'s "The board's
response"). No poaching: that is the faculty-lifecycle plan's, and it will read
this drift when it comes.

## College, and University

A school opens as **"<Name> College"**. The player writes only the first half at
founding; the word after it is fixed institutional form. A "College" or
"University" typed after the name is dropped, and a typed "University" gets a
caption under the founding facade (Plan 78G): "Every college opens as a
College; the board grants 'University' with its first research lab." When the
**first lab is at work**, the board grants a **university charter** — the
same gate research hangs off, read through the same helper so the two can
never drift apart. Since Plan 78G the name is the President's to decide: the
charter waits in the inbox as a matter to decide, "The charter", with two
answers, **"Become <Name> University"** (the default, taken after four weeks)
and **"Keep the name <Name> College"**. Either answer writes the charter's
line in the log and the Answered list keeps the choice. It is a naming change
and nothing else: a `suffix` string plus a flag recording that the charter
was granted (set when it is raised, so it never recurs), joined for display
by `institutionName()`. No system reads the name. **The charter's letter
carries the college's one rename** (Plan 80D): beside the two answers, a
field holds the name as it stands, and an answer with a new name typed
renames the college first (`RENAME_COLLEGE`, refused at any other time).
Either answer is final: nothing renames the college after it, and a
college that keeps "College" keeps it. The bonus Second Empire
architecture is earned by the charter, whichever name is kept. Until Plan
72 the charter was a one-time question in a modal; from Plan 72E to Plan
78G it was a silent rename with a log line; and from Plan 72E to Plan 80D
the pennant renamed the college, name and suffix, as often as the player
liked.
