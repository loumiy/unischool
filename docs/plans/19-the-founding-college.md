# Plan 19 — The founding college

*Planning document only — no gameplay code is changed by this file. Its job is
to take a playtest observation about the guided opening — that the
general-education core is a six-course pseudo-school in a one-slot building,
and that finishing it leaves a year with nothing in it — and turn the fix into
an ordered sequence of PRs, each small enough to land on its own and each one
leaving the game playable.*

**Status: Proposed.** Nothing has landed. Revised once before starting, after
a review of the authored curriculum, research and faculty data read this plan
against the content it moves: open question 3 grew from one rename into a
catalogue-wide test for orphaned titles, open question 6 learned that a field
is not a major, and open questions 7 and 8 are new — both are consequences of
making Social Sciences and Humanities the opening school, and neither is
visible until you ask who is on the founding payroll. The same review's
findings that are *not* about the core are sequenced as
[Plan 20](20-the-catalogue.md).

---

## 0. The finding, and what it says about the fix

Three complaints from the same ten minutes of play:

1. **Founders Hall is the same 7×5 footprint as every other academic hall and
   holds one program where they hold six** (`techData.ts`'s `slots: 1` against
   `ACADEMIC_HALL_SLOTS = 6`). Not six courses against fifty-four by accident
   of content: one slot against six.
2. **"General Studies" is a school with no majors and a six-course program**,
   where every other program has nine. It exists to hold the core and nothing
   else.
3. **There is a lull.** The core finishes about week 5. `HALL-01` unlocks on
   the core and costs $750,000 against the $920,000 left after paying for it,
   and the balanced builder does not finish its first hall until **week 68**.
   That is roughly forty-seven weeks with one thing to buy and no way to buy
   it.

The observation that settles it is in the data rather than the complaint. A
core course is authored with `cost: TIER_COURSE_COST[1]` and
`duration: TIER_DURATION_WEEKS[1]` — **$80,000 and four weeks, identical to a
tier-1 course**. The general-education core is already six tier-1 courses
wearing a costume. Replacing them with six real entry courses costs nothing in
pacing, teaches the same flow, and puts the player on programs that lead
somewhere.

### What the core is load-bearing for

Five jobs. Three are now vestigial and two must be replaced.

| Job | Where | Verdict |
|---|---|---|
| Tutorial content — six cheap, fast courses to learn develop-and-assign | `initialTech()` | **Replaceable.** A tier-1 course is the same price and the same four weeks. |
| Prereq root for all 42 tier-1 courses | `techData.ts:1153`, `if (tier === 1) prereqs = [...GENED_CORE_IDS]` | **Vestigial.** Plan 14 made the offer queue the real gate: three programs at a time whatever the prereqs say. |
| Gate on the first academic hall | `techData.ts:1249`, `prereqs: i === 0 ? [...GENED_CORE_IDS] : […]` | **Keep the job, change the reading.** It stops a $750k purchase in week one. |
| 480 founding seats | `instructionCapacity.ts`, the core counts whether or not it is `done` | **Must be replaced.** Without it a founding college has no room for its own 350 students. |
| A row in the research denominator | `researchSchools()` folds `GENED_FIELDS` in; `researchableFields()` is the union across it | **Vestigial, and checked rather than assumed.** General Studies carries no lab, so it never produced research. It also moves no denominator: every gen-ed field already teaches in another school, so `researchableFields()` reads **29 either way**. Research standing does not shift. |

The seat job is the one that decides the shape of the fix. Six courses at
`SEATS_PER_COURSE = 80` is 480 seats, and `intakeCeiling` turns that into the
"room for 217" the first summer shows. **So the replacement is also six
developed courses** — the same number, belonging to real programs.

### The fix, in one sentence

Retire the core and the school that holds it; give Founders Hall six slots
like every other hall; and open the game with **three Social Sciences &
Humanities programs already founded in it, six of their courses already
developed and taught by the founding roster**, three slots free, and the
offer queue drawing from week one.

### Why those three programs

The founding roster is already built for this. `actions.ts`'s five hires cover
**English** (Bennett, 3 slots), **History** (Okafor, 2), **Philosophy**
(Novak, 2), **Mathematics** (Iyer, 2) and **Physics** (Reyes, 2), and the
comment above them already records the intent: five tier-1 courses "share a
field with a founding hire, so the spare slot lets the player open one of
those the moment gen-ed clears, without a hire in the way."

English, History and Philosophy are three of the six majors in **Social
Sciences & Humanities**. So the college opens as a small liberal-arts college
that teaches exactly what its five professors can teach, and the first goal
the game can name is the one the dedication rule already rewards: *six
programs of one school in one hall founds the school.* Three of the six are
already there. Sociology, Anthropology and Political Science are what is
missing, and the offer queue's standing rule — always one offer from a school
not yet started — is what makes going broad a temptation instead of a chore.

**One hire moves, and open question 7 is where that is argued.** The roster
above is today's, and none of it reaches the three majors this paragraph just
named as the goal: Sociology and Political Science are not on it. Reyes's
field moves from Physics to Sociology so that it does, which costs nothing
(her stats, slots and salary are untouched) and is what stops the breadth path
from being the only one the college can afford in week one.

That is the depth-versus-breadth choice the lull was standing in for, and the
two directions spend different currencies: **deeper costs faculty slots in one
field** (Bennett has three, so English stalls at three courses until the
school hires another), **broader costs a building and hires in new fields**.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 19A | The core is retired and the founding college teaches instead. The one atomic change. | — |
| 19B | The first hall's gate, and the year-one cash curve it now faces | A |
| 19C | The opening walkthrough and the four letters | A |
| 19D | The Curriculum tab loses its core section | A |
| 19E | The harness: strategies, scenarios, firsts | A |
| 19F | The re-fit, and the bands re-recorded | B, E |
| 19G | Docs | all |

---

## Open questions, settled before the first PR

Eight decisions. Each is settled below with the answer this plan is written
on; each names the alternative, so changing one is a change to this document
rather than to the sequence. Questions 7 and 8 were added after a review of
the authored curriculum data read this plan against it: both are consequences
of making Social Sciences and Humanities the opening school, and neither is
visible until you ask who is on the payroll.

**1. How many slots does Founders Hall get? — Six, the same as every other
hall.** It deletes a special case rather than adding a rung, and it answers
the footprint complaint outright: every hall in the game has six rooms.
*Alternative:* four slots and a smaller footprint, which keeps the first
purchased hall more urgent. Taken if 19F finds that three free slots at
founding make year one too loose.

**2. Which programs are pre-founded? — English, History, Philosophy, with two
courses each developed** (the `101` and the `110`, one tier-1 and one tier-2).
Six courses, 480 seats, six of the roster's eleven course slots used, and the
three-of-six-toward-a-school story above. *Alternative:* spread the three
across schools, which trades the school-dedication goal for a wider opening
board.

**3. What happens to the six gen-ed names? — Retired, and the orphans they
leave are renamed with them.** The catalogue goes from **384 undergraduate
courses to 378** (421 → 415 with graduate work), which moves the completion
ring, the *whole catalogue* ambition and about 480 seats off the late-game
ceiling. `HIST101` is already "World History", `PHYS101` is already "Classical
Mechanics", `ENGL101` is already the English entry, so those three need
nothing.

The rename question is not one course, it is a **test applied to the whole
catalogue**: which titles name a predecessor that the retirement deletes, or
that was only ever supplied by the core? Four answers, and they land in this
PR rather than a later one because after 19A the catalogue is the first thing
a player reads and these are the courses they read first.

| Course | Today | Becomes | Why |
|---|---|---|---|
| `PHIL110` | Ethics II | **Ethics** | "Ethics I" was `GE130`. Orphaned outright. |
| `MATH101` | Calculus II | **Calculus** | "Calculus" was `GE120`. Orphaned outright. |
| `CIVE101` / `CIVE130` | Physics I / Physics II | **Statics** / **Mechanics of Materials** | Collides with `PHYS101`. |
| `CHEM101` / `CHEM130` | Chemistry I / Chemistry II | **Principles of Chemical Engineering** / **Material & Energy Balances** | Collides with `CHMY101`. |

**`MATH101` is no longer optional, and that is a change to this plan.** It was
listed as a nicety on the reasoning that real universities assume calculus
before matriculation. Open question 6 is what overturns it: Mathematics keeps
a spare slot on the founding roster, so `MATH101` is one of the two majors the
rigged first draw is written against and is plausibly among the first three
programs a player is ever offered. "Calculus II" with no Calculus anywhere in the game is a
first-ten-minutes legibility problem, not a catalogue-depth one. Its bridge
comment on `AERO210` names the old title and is edited with it.

**The two engineering pairs are a consequence of the prereq change, not of the
names.** Today every tier-1 course sits behind the core, so `GE120` and
`GE140` are a shared maths-and-science foundation under the whole catalogue.
After 19A tier-1 prereqs are empty, and "Physics I" (Civil) and "Chemistry I"
(Chemical) sit beside "Classical Mechanics" (Physics) and "General Chemistry"
(Chemistry) as four unrelated entry courses, two pairs of which are plainly
the same subject under two names with nothing linking them. The replacements
are the real first two courses of those majors. *Alternative:* leave them, and
accept that the first engineering program a player founds appears to duplicate
a science program they have not built.

**One more, on the same test but for a different reason.** `POLS101` is
titled "Civics", which is a secondary-school name for an introductory survey.
It is included here because Political Science is one of the three programs a
player founds to dedicate the opening school (open question 7), so it stops
being an obscure row and becomes an early, named goal. It becomes
**"Introduction to Political Science"**.

**4. Does the General Studies school survive? — No.** It has no majors and
exists to hold the core. `SCHOOLS` goes from eight entries to seven,
`SchoolSeed.core` and `coreIds` are deleted, and `milestoneSchools()` /
`discoverySchools()` lose their "the school with no majors" special cases.
`GENED_BUILDING_ID` keeps its string (`'BLDG-GENSTUDIES'`, a save break is
being taken anyway) and is renamed `FOUNDERS_HALL_ID`; Founders Hall stops
carrying a school at all. *Alternative:* keep an empty shell so the id and the
prose stay put, at the cost of a school that is never founded, never
distinguished and never drawn.

**5. What gates the first purchased hall? — A developed-course reading.**
`HALL-01` unlocks at **eight developed courses** (the six it opens with, plus
two the player chose), which reads as "the college is teaching enough to
justify a second building" and keeps a $750,000 purchase out of week one.
*Alternatives:* Founders having no free slot, which hard-blocks a player who
wants to branch immediately; or no gate at all, which lets a player spend more
than half their founding cash before they know what a slot is.

**6. Is the founding offer draw rigged? — Yes, once, and it names majors
rather than fields.** The draw made at founding guarantees **at least one
offer the college can staff out of the roster it already has**. After that the
ordinary weighting applies. The player's first founding decision should not
require a hire they cannot afford. *Alternative:* leave it to the ordinary
draw and accept that some seeds open with three programs the college cannot
staff.

The plan first wrote this as "a field with a free slot". A field is not a
major: each of the roster's spare fields staffs two, and they do not read
alike. With question 7's roster the staffable set is five:

| Major | School | Reads as a founding college's fourth program |
|---|---|---|
| `SOCY` Sociology | the opening school | **yes** — and it is the depth path |
| `MATH` Mathematics | Science | **yes** — and it is the breadth path |
| `ANTH` Anthropology | the opening school | yes, but `ANTH110` bridges to `SOCY101`, so it wants Sociology first |
| `DATA` Data Science | Computer Science | no |
| `CRWR` Creative Writing | Arts & Media | no |

A college teaching literature, history and logic whose fourth program is Data
Science is a funny opening, and it is reachable on an ordinary seed. **The
guarantee is therefore written against two named majors, `SOCY` and `MATH`,
not against the fields.** One is the school the college is already in and one
is a school it is not, so the guaranteed offer states the plan's own question
in week one. The other three remain perfectly ordinary draws once the rig has
been spent; they simply are not what the game promises first.

**7. Does the founding roster reach the school the plan names as the goal? —
No, and one hire moves to fix it.** This is the finding that open question 2
implies and does not state. The opening school's six majors split like this:

| Majors | Field | At founding |
|---|---|---|
| English, History, Philosophy | English, History, Philosophy | pre-founded |
| Sociology, **Anthropology** | Sociology | needs a hire |
| Political Science | Political Science | needs a hire |

Neither Sociology nor Political Science is on the founding roster, **while the
breadth path is free**. Question 6 hands the player a staffable offer from
another school at no cost, and finishing the school this plan builds its whole
story around always costs an appointment first. That is a thumb on the scale
against the goal the plan names, which is the opposite of the intent.

**Reyes moves from Physics to Sociology.** Her name, stats, tenure, slots and
salary are unchanged; `field` and `bio` move. Three things fall out, and the
third is why this hire rather than Iyer:

- The roster now reaches **five of the opening school's six majors**. Reyes's
  two spare slots cover `SOCY101` and `ANTH101` together, because Sociology
  and Anthropology share a department. Only Political Science needs an
  appointment.
- **Dedicating the opening school becomes one hire and three foundings, and it
  fits in Founders Hall**, whose three free slots are exactly `SOCY`, `ANTH`
  and `POLS`. That is a countable first goal, which is what letter two should
  say (19C), and it is the thing the forty-seven-week lull was standing in
  for.
- **Mathematics stays on the roster, and question 3 needs it to.** Moving Iyer
  instead would take `MATH101` out of the founding draw, and the case for
  renaming it to "Calculus" rests on a player meeting it in week one. Moving
  Reyes also retires the Aerospace Engineering opening on its own, since
  Physics leaves the roster with her.

The founding faculty is then letters, history, philosophy, mathematics and
social science, which is a more believable five for a small college than the
physicist it replaces.

**The cost of this, stated.** It makes the depth path cheaper than the breadth
path rather than merely equal to it: three programs for $240,000 inside a hall
you already own, against $750,000 for the next one. A player will dedicate
first and buy second, so the opening becomes a sequence where the plan wanted
a choice. That is judged the better failure — a clear first goal beats a
balanced one nobody can see — but it is the thing to watch. *Alternative:*
leave the roster alone and have the founding draw guarantee an opening-school
offer as well, which shows the player the path while still charging two hires
for it. Take that one if 19F finds year one has no decision in it.

**8. Does the opening school depend on another one? — Once, and it is kept.**
Establishing Political Science requires `POLS140` Public Policy Analysis,
which bridges to `ECON110` Macroeconomics. So the school the college opens in
**cannot be fully established without housing a Business program**. It is the
school's only foreign dependency, it is a true prerequisite, and after 19A a
bridge's real cost is a hall slot for the foreign program rather than a course
chain. It is kept because it is honest and because it is the first time the
game asks the player to reach outside a school they are invested in. What
changes is that it is now **known**: every run meets it, where before it was
one bridge among forty-six in a school like any other. *Alternative:* retarget
`POLS140` in-school, to `SOCY110` or `HIST120`, if 19F finds the opening
school stalls on it.

**A ninth, deliberately not settled here.** Year one currently grades **40**
on the report card, with the crowding penalty at its full −25, because dining,
housing and social coverage are all near zero at founding whatever the
curriculum does. This plan does not change that and does not try to: it is a
founding-package question about the satisfaction chains, not about the core,
and it is named in §6 as a finding rather than a fix.

---

## PR 19A — The core is retired, and the founding college teaches

**Deliberately not split, and the reason is the finding.** The core is
simultaneously the slot occupant, the prereq root, the seat floor and the
founding faculty's work. Retiring those one at a time leaves an intermediate
commit with a college that has no room for its own students. So this PR is
large and the rest of the plan is its consequences.

**Content** (`src/data/techData.ts`)
- `SCHOOLS` loses its General Studies entry; `SchoolSeed.core`,
  `GENED_CORE_IDS`, `CORE_PROGRAM_ID`, `GENED_FIELDS`, `coreIds` and the
  `kind: 'core'` program all go.
- `if (tier === 1) prereqs = [...GENED_CORE_IDS]` becomes `prereqs = []`. The
  housed gate in `meetsUnlockGates` is what keeps a tier-1 course locked, and
  it already covers tier 1 (Plan 14's PR C).
- Founders Hall: `slots: 1` becomes `slots: ACADEMIC_HALL_SLOTS`, keeps its
  `'done'` seeding and its placement, loses its school. `isAcademicHall` stops
  excluding it, and every reader of that predicate is checked (`BuildPopup`,
  `nextStep`, `eventData`'s letter two).
- **The six renames of open question 3**: `PHIL110` to "Ethics", `MATH101` to
  "Calculus", `CIVE101`/`CIVE130` to "Statics"/"Mechanics of Materials",
  `CHEM101`/`CHEM130` to "Principles of Chemical Engineering"/"Material &
  Energy Balances", and `POLS101` to "Introduction to Political Science". The
  `AERO210` bridge comment naming "calculus II" is edited with them.

**Founding** (`src/state/actions.ts`)
- `halls` opens as six slots: `ENGL`, `HIST`, `PHIL` housed, three `null`.
- `ENGL101/110`, `HIST101/110`, `PHIL101/110` seeded `'done'`, with
  `courseFaculty` assigning Bennett, Okafor and Novak. Bennett keeps one free
  slot, Reyes and Iyer keep two each: **five free slots against three free
  rooms**, so the opening is staffable without a hire and the player still
  meets the faculty gate the first time they reach for a fourth field.
- **Reyes's field moves from Physics to Sociology** (open question 7), so the
  roster reaches five of the opening school's six majors and the dedication
  path costs no more at founding than the breadth path does. Her name, stats,
  tenure, slots and salary are unchanged; `field` and `bio` move. The free
  slots become Bennett 1 (English), Iyer 2 (Mathematics), Reyes 2 (Sociology).
- The comment above the roster currently justifies the five hires by the
  gen-ed core's `GENED_FIELDS`, which is the thing this PR deletes. It is
  rewritten to justify them by the three pre-founded programs plus the spare
  capacity question 6 draws against, so the roster stops being pinned to a
  taxonomy that no longer exists.
- `programOffers` is drawn at founding rather than left empty, through the
  rigged first draw (open question 6, implemented in `programOffers.ts` as a
  one-time preference over `SOCY` and `MATH`, not a standing rule).

**Seats** (`src/systems/techtree/instructionCapacity.ts`)
- The `CORE_PROGRAM_ID` exemption goes. Capacity becomes what it says:
  `SEATS_PER_COURSE` for every developed course in a housed, settled program.
  Founding capacity is 6 × 80 = **480**, exactly what it is today, now for an
  honest reason.

**Everything else keyed on `'CORE'`** — `demandSystem`'s seat-demand filter,
`techSystem`'s housed gate, `persistence`'s slot validation, `types.ts`'s
`HallSlot` comment — drops the special case rather than repointing it.

**One piece of authored tuning goes dead with it.** `courseQuality.ts` builds
its tier map by walking `discoverySchools()`'s `coreIds` and marking those
courses `'core'`, and `TIER_PENALTY` carries a `core: 0` entry for them. With
`coreIds` empty no course can ever be `'core'` again, so the `CourseTier`
variant and its penalty row are removed rather than left as an unreachable
branch. Nothing else about the grade changes: a tier-1 course already scores
the same zero penalty.

**Save:** bump. No migration (`game-state.md`'s discard-by-default).

**Tests:** `founding.test.ts` (the core cannot be founded → the three housed
programs can't be re-founded), `intake-ceiling.test.ts` and
`standing-readings.test.ts` (both assert `GENED_CORE_IDS.length *
SEATS_PER_COURSE`, which becomes the same number by a different route),
`invariants.test.ts`'s slot/offer checks, `relocation.test.ts`,
`save-load.test.ts`, `cost-model.test.ts`, `year-in-review.test.ts`,
`opening.test.ts` (rewritten in C), `course-quality.test.ts` (the `'core'`
tier goes), and `curriculum-graph.test.ts`, whose reachability walk starts
from what is seeded `'available'` or `'done'` and must still admit all 378
courses once the core is no longer the root.

**Verify.** A founding save has one hall, six slots, three housed, six
developed courses, 480 seats, three offers of which at least one is staffable,
and a first summer that reads "room for 217" as it does today. No course title
names a predecessor the catalogue does not contain, which is a grep rather
than a test: `Calculus II`, `Ethics II`, `Chemistry I`, `Physics I` are all
gone, and the four remaining `II` titles (`MUSC110`, `MUSC240`, `NURS240`,
`PHRM210`) each have their `I` inside the same major.

## PR 19B — The first hall, and the year the player now has

Two things, and the second is why this is its own PR.

- `HALL-01`'s prereq becomes the eight-developed-course reading (open question
  5). `HALL-02`…`HALL-12` keep their chain.
- **The cash curve moved and has to be looked at.** Today the player spends
  $480,000 of $1,400,000 on the core and cannot afford a $750,000 hall until
  about week 52. After A they start with the whole $1,400,000, six courses of
  upkeep, and three free rooms at $80,000 a program. The opening choice is
  *three programs for $240,000* against *one hall for $750,000*, which is the
  dilemma this plan is for — but it is also a much richer week one, and the
  hall may now be affordable immediately. This PR measures it and, if the hall
  is a week-one purchase, moves its price or the founding cash rather than
  re-adding a gate.

**Verify.** `npm run milestones -- 50 "Balanced"` reports a first hall built
materially before week 68, and the first-program-established first moves
earlier than year 2.5.

## PR 19C — The walkthrough and the letters

The opening currently teaches a verb the game no longer has.

- `src/state/opening.ts`'s five stages become: **welcome → site Founders Hall
  → the college already teaches (open the Curriculum) → found your fourth
  program (the hall panel, an offer, an instructor) → play.** The forced step
  is now *founding*, which is the verb the rest of the run is built on, and it
  is taught on the surface that owns it.
- `OPENING_LETTERS` (`eventData.ts`): letter one asks for the fourth program
  rather than six gen-ed courses; **letter two carries the school-dedication
  rule** and offers the hall as the other road. Letters three and four are
  unchanged. Letter two can now be specific, because open question 7 makes the
  goal countable: six programs of one school in one hall founds a school, you
  have three of Social Sciences and Humanities already, Founders Hall has
  exactly three rooms left, and of the three programs that would fill them the
  roster can already teach two. It names the one appointment the school still
  needs rather than gesturing at hiring in general.
- `nextStep.ts`'s year-one branch follows the letters, as it does now.

**Verify.** `opening.test.ts`, rewritten: every stage advances on the action
it names, the skip still skips, and a guided founding still marks letter one
read.

## PR 19D — The Curriculum tab loses its core section

`CurriculumTab.tsx`'s `coreIds` pool, its `school-group core` section and the
"General Studies" fallbacks go; `styles.css` loses the four `.core` rules. The
tab opens on seven school groups with three rows already filled, which is the
first screen that says what kind of college this is.

## PR 19E — The harness

- `sim/balanceSim.ts`: strategies stop developing the core and start from
  three housed programs; the founding policies (`school-first`, `scatter`,
  `maxSchools`) are re-read against an opening that already has a school
  started.
- `tools/scenarios.ts`: `founding` and `year-3-first-hall` re-described.
- `sim/milestones.ts`: "first program established" and "first school founded"
  now have a head start; the firsts list is re-measured rather than re-fitted.

## PR 19F — The re-fit

Run the scorecard. Six fewer courses, a different opening, an earlier first
hall and possibly a different hall price all move trajectories. Re-record
`sim/reference.ts`'s generated envelopes; check the three hand-written
`TARGETS` still describe the game; move constants only where a band says to,
and say which in the PR summary.

## PR 19G — Docs

`docs/design/curriculum.md` (the milestone chain's first rung is founding, not
the core), `progression.md` (founding conditions), `admissions.md` (where the
founding seats come from), `architecture/buildables.md` and `campus-map.md`
(Founders Hall is an ordinary hall), and the README's course count.

**The source comments are part of this, not a tidy-up after it.** Several of
them state counts this plan changes, and they are load-bearing enough that a
reader trusts them: `techData.ts`'s module header ("384 course Buildables",
"Eight SchoolSeeds in all"), `facultyData.ts`'s field-taxonomy block, and
`researchSchools()`'s note on folding the core's fields in. The figures become
**378 undergraduate courses, 415 with graduate work, seven `SchoolSeed`s**,
and History and Philosophy drop to nine courses each. While there: the claim
in `facultyData.ts` that every field carries at least nine courses is already
false and stays false — Law carries eight, all of them in the law school — so
it is corrected to say so rather than re-asserted.

---

## What this plan does not do

- **It does not touch the satisfaction chains**, so year one still grades
  around 40 with the crowding penalty at full. That is the founding package's
  problem, not the core's, and it is the next thing to look at.
- **It does not author course content.** The 378 remaining courses still
  differ only by tier, field and a templated sentence.
  [Plan 20](20-the-catalogue.md) is where that is sequenced, along with the
  prerequisite bridges and the research topics the same review found. The
  renames above are in scope here and only here because the retirement is what
  orphans them; everything else about what the catalogue *says* is Plan 20's.
- **It does not change the offer queue's rules**, beyond the one-time founding
  draw. No reroll, no decline, three at a time.
- **It does not re-price the hall chain past `HALL-01`**, nor add the cheaper
  early rung the review floated. If 19F finds the ladder wrong above the first
  rung, that is its own plan.
