# Plan 19 — The founding college

*Planning document only — no gameplay code is changed by this file. Its job is
to take a playtest observation about the guided opening — that the
general-education core is a six-course pseudo-school in a one-slot building,
and that finishing it leaves a year with nothing in it — and turn the fix into
an ordered sequence of PRs, each small enough to land on its own and each one
leaving the game playable.*

**Status: Proposed.** Nothing has landed.

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

Four jobs. Two are now vestigial and two must be replaced.

| Job | Where | Verdict |
|---|---|---|
| Tutorial content — six cheap, fast courses to learn develop-and-assign | `initialTech()` | **Replaceable.** A tier-1 course is the same price and the same four weeks. |
| Prereq root for all 42 tier-1 courses | `techData.ts:1153`, `if (tier === 1) prereqs = [...GENED_CORE_IDS]` | **Vestigial.** Plan 14 made the offer queue the real gate: three programs at a time whatever the prereqs say. |
| Gate on the first academic hall | `techData.ts:1249`, `prereqs: i === 0 ? [...GENED_CORE_IDS] : […]` | **Keep the job, change the reading.** It stops a $750k purchase in week one. |
| 480 founding seats | `instructionCapacity.ts`, the core counts whether or not it is `done` | **Must be replaced.** Without it a founding college has no room for its own 350 students. |

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

Six decisions. Each is settled below with the answer this plan is written on;
each names the alternative, so changing one is a change to this document
rather than to the sequence.

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

**3. What happens to the six gen-ed names? — Retired, with one rename.**
`PHIL110` is currently "Ethics II" and is left orphaned by retiring "Ethics
I", so it becomes **"Ethics"**. Everything else goes: `HIST101` is already
"World History", `PHYS101` is already "Classical Mechanics", `ENGL101` is
already the English entry. *Optional, not taken by default:* renaming
`MATH101` from "Calculus II" to "Calculus" — "Calculus II" implies a
prerequisite taken before matriculation, which is true of real universities.
The catalogue goes from **384 undergraduate courses to 378** (421 → 415 with
graduate work), which moves the completion ring, the *whole catalogue*
ambition and about 480 seats off the late-game ceiling.

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

**6. Is the founding offer draw rigged? — Yes, once.** The draw made at
founding guarantees **at least one offer whose field already has a free slot
on the founding roster** — in practice Physics or Mathematics, since English,
History and Philosophy are housed. After that the ordinary weighting applies.
The player's first founding decision should not require a hire they cannot
afford. *Alternative:* leave it to the ordinary draw and accept that some
seeds open with three programs the college cannot staff.

**A seventh, deliberately not settled here.** Year one currently grades **40**
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
- `PHIL110` renamed to "Ethics".

**Founding** (`src/state/actions.ts`)
- `halls` opens as six slots: `ENGL`, `HIST`, `PHIL` housed, three `null`.
- `ENGL101/110`, `HIST101/110`, `PHIL101/110` seeded `'done'`, with
  `courseFaculty` assigning Bennett, Okafor and Novak. Bennett keeps one free
  slot, Reyes and Iyer keep two each: **five free slots against three free
  rooms**, so the opening is staffable without a hire and the player still
  meets the faculty gate the first time they reach for a fourth field.
- `programOffers` is drawn at founding rather than left empty, through the
  rigged first draw (open question 6, implemented in `programOffers.ts` as a
  one-time preference, not a standing rule).

**Seats** (`src/systems/techtree/instructionCapacity.ts`)
- The `CORE_PROGRAM_ID` exemption goes. Capacity becomes what it says:
  `SEATS_PER_COURSE` for every developed course in a housed, settled program.
  Founding capacity is 6 × 80 = **480**, exactly what it is today, now for an
  honest reason.

**Everything else keyed on `'CORE'`** — `demandSystem`'s seat-demand filter,
`techSystem`'s housed gate, `persistence`'s slot validation, `types.ts`'s
`HallSlot` comment — drops the special case rather than repointing it.

**Save:** bump. No migration (`game-state.md`'s discard-by-default).

**Tests:** `founding.test.ts` (the core cannot be founded → the three housed
programs can't be re-founded), `intake-ceiling.test.ts` and
`standing-readings.test.ts` (both assert `GENED_CORE_IDS.length *
SEATS_PER_COURSE`, which becomes the same number by a different route),
`invariants.test.ts`'s slot/offer checks, `relocation.test.ts`,
`save-load.test.ts`, `cost-model.test.ts`, `year-in-review.test.ts`,
`opening.test.ts` (rewritten in C).

**Verify.** A founding save has one hall, six slots, three housed, six
developed courses, 480 seats, three offers of which at least one is staffable,
and a first summer that reads "room for 217" as it does today.

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
  rule** ("six programs of one school in one hall founds a school; you have
  three of Social Sciences & Humanities already") and offers the hall as the
  other road. Letters three and four are unchanged.
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

---

## What this plan does not do

- **It does not touch the satisfaction chains**, so year one still grades
  around 40 with the crowding penalty at full. That is the founding package's
  problem, not the core's, and it is the next thing to look at.
- **It does not author course content.** The 378 remaining courses still
  differ only by tier, field and a templated sentence.
- **It does not change the offer queue's rules**, beyond the one-time founding
  draw. No reroll, no decline, three at a time.
- **It does not re-price the hall chain past `HALL-01`**, nor add the cheaper
  early rung the review floated. If 19F finds the ladder wrong above the first
  rung, that is its own plan.
