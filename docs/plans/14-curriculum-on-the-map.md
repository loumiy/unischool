# Plan 14 — The curriculum on the map

*Planning document only — no gameplay code is changed by this file. Its job is
to take the September review's finding that the curriculum is "421 Buildables
that differ only by tier, developed one click at a time behind a Develop-N
button", the playtest finding that developing every course is tedious and that
the button is too much of a shortcut, and the design that answers both —
repeatable academic halls with six program slots, programs founded from a
rolling offer of three, and a Curriculum tab that becomes forty-two rows — and
turn them into an ordered sequence of PRs.*

**Status: In progress.** PRs A, B and C have landed. Depends on
[Plan 09](09-playtest-harness.md) for the scenarios and the scorecard this is
measured with. Supersedes
[Plan 11](11-academic-halls.md), whose rooms-and-continuous-development model
this replaces.

---

## 0. The finding, and why this is the answer to it

Three readings of the same problem:

- **The review**: 421 courses that differ only by tier and field, so "develop
  everything" is the honest way to play, and `Develop N · $X` is the honest UI
  for it. The tier-1 floodgate opens 42 alphabetical cards at once, most with a
  red dot, "not yet organised by school".
- **The review again, from the other side**: instructor assignment — the tier
  penalty, the load penalty, the grade each candidate would earn — is *the best
  micro-decision in the game*, and the Develop-N button makes it for you.
- **The playtest**: developing every course is tedious, *and* the shortcut that
  relieves the tedium is worse than the tedium.

Plan 11 answered this by deleting the decision: a founded room advanced its own
queue and auto-assigned its own faculty. That relieves the chore by removing the
best thing in the tab, and it was the wrong trade.

This plan takes the opposite route. **Every one of the 421 courses keeps its
instructor choice.** What goes is the *wall* — the moment 42 doors open at once
with no structure and no reason to prefer any of them — and the button that
existed only because the wall was unanswerable.

### The three moves

1. **A hall holds six programs.** An academic hall is a repeatable, placeable
   Buildable with **six program slots**. Six slots is not an arbitrary number:
   every school in the game has exactly six majors, so **one hall is exactly one
   school**, and that is a rule a player can learn in one sentence and plan a
   decade around.
2. **Programs arrive three at a time.** After the gen-ed core, the player is
   never shown 42 doors. They are shown **three**, drawn from what remains.
   Founding one draws a replacement, so the offer is always three, and the
   catalogue is discovered rather than enumerated.
3. **A school is founded, not unlocked.** Nothing is called "the School of
   Engineering" until six Engineering programs sit in one hall. A young college
   with two computer-science programs does not have a School of Computer
   Science; it has two programs. The school is something the player *makes*,
   over a decade, by deciding what goes in a building.

The third move is the one that pays for the other two. It turns "which program
next" — today a question with the answer "all of them" — into a question about
a building the player has to fund, site, fill and keep pure.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 14A | Halls and slots as state; the repeatable hall Buildable; Founders Hall re-seeded. Nothing reads them | — |
| 14B | The offer queue: three programs, drawn and refilled, with tests and no UI | A |
| 14C | Founding a program from the hall panel; the tier-2 gate becomes "housed"; the seven school halls retire | A, B |
| 14D | The program tile: courses added from the map, one instructor choice each | C |
| 14E | Schools are founded: the milestone as a reading over halls, naming rights, the lab and graduate gates re-pointed | C |
| 14F | Relocation: a program moves halls and goes dark for a term | C |
| 14G | The Curriculum tab becomes forty-two rows; faculty drag-and-drop; Develop-N retires | C, D, E |
| 14H | The faculty market as a real gate, and a search the player can pay for | D |
| 14I | The harness founds programs and sites halls; docs | all |

---

## Open questions, settled before the first PR

**What founds a school — the count, or the hall?** The hall. Six programs of
one school, **housed in one hall**, founds that school. Six of one school
scattered across four halls founds nothing. This is what makes a slot a
decision rather than a container.

**Where do the first programs go, if Founders Hall is full?** Founders Hall
holds the gen-ed core and **nothing else** — the core occupies the building,
not one slot of six. The alternative (core plus five free slots) strands the
player's first five programs in a building that can never found a school, which
is a trap laid in the first ten minutes.

So the first thing the player does after the core is **build a hall**, and the
game guides them there hard: completing the gen-ed core unlocks a **deliberately
cheap** first academic hall, the letter in Plan 16's scripted opening names it,
and the offer queue is visible (and unusable) until a slot exists. "You have
three programs waiting and nowhere to put them" is a better first pressure than
anything the game currently applies in year one.

**Can the player refuse the offer?** There is no reroll and no decline. The
three stand until one is taken. What keeps that from stalling a run is the
draw, not an escape hatch: the replacement is **weighted toward schools the
player has already started**, so a school converges once begun — and **at least
one of the three is always from a school not yet started**, so discovery never
dries up and the player is never locked into finishing what they opened first.

**Is the queue global or per hall?** Global. The same three are offered at any
free slot on campus, and taking one anywhere removes it from everywhere. A
per-hall queue would make the player open panels looking for a better draw,
which is a slot machine, not a decision.

**Where are courses started?** Founding a program — the tier-1 course that
opens it — happens **only from a hall panel**, because the decision is "what
goes in this building" and it needs the building on screen. Every course after
that (tier 2, tier 3, graduate) can be started **from the hall panel or from
the Curriculum tab's row**, with the same instructor picker either way. The map
is where a program is founded; the tab is where it is filled in and tuned.

**What replaces `school-complete` and the seven school-hall Buildables?** Both
retire. A tier-2 course's prerequisite becomes its tier-1 plus the dynamic gate
"this program is housed"; `BLDG-BUSINESS` and its six siblings leave the seed
entirely. The milestone they gated is replaced by something better —
`school-founded`, which is earned by filling a hall rather than by completing a
checklist.

**Can a founded school be un-founded?** No. The milestone is written once and
never revoked, because a school that existed existed and the History tab should
not have to un-write itself. Any *live* bonus that reads hall purity reads
current state, so moving a program out costs the bonus and not the school.

**Save compatibility.** None. This changes the shape of the seed, the meaning of
`placements` for eight ids, and the prerequisite graph. Per `game-state.md`,
bump `SAVE_VERSION` and let old saves drop. This is also the moment to take the
review's cut — **freeze the migration chain and delete it**; 2,870 lines of
`persistence.ts` migrating v3 → v40 for a game nobody is playing yet is the
clearest overdevelopment in the repository, and a hard break is the honest
moment to stop paying for it.

**Are the hall's numbers final?** No, and the plan should say so loudly. Every
cost, duration and slot-seat constant introduced here is fitted against an
economy the September review found broken and [Plan 15](15-growth-has-a-cost.md)
is about to replace. They are sized to feel right in a scenario, not to hold a
trajectory. **Plan 15's PR G is where they are fitted once, properly, against
the scorecard** — which is the whole reason the economy work lands after this
plan rather than before it.

---

## PR 14A — Halls and slots as state

**What.**

- `types.ts`: `HallSlot = { programId: string | null }` and
  `s.halls: Record<string, HallSlot[]>` — hall Buildable id to its six slots,
  positional, so slot 3 is slot 3 forever. A `slots?: number` field on
  `Buildable`, set only on hall-kind Buildables.
- The **program id** is the major prefix (`FINA`, `MECH`), `'CORE'` for the
  gen-ed core, or a `GRADUATE_PROGRAMS` id (`MED`, `PHDE`).
- `campusData.ts` gains **the academic hall**: one repeatable `building`-kind
  Buildable, six slots, the existing 7×5 `SCHOOL_BUILDING_FOOTPRINT` (odd width,
  so the door lands on a tile rather than a seam — see `campusMap.ts`), the
  `hall` motif. **No tiers, no floors, no upgrade chain.** A 4/8/16-room ladder
  would destroy the one rule this plan is built on; six slots is six slots.
- Its cost **escalates per hall already built** — the first is cheap enough that
  a founding school builds it without thinking, the fifth is a multi-year
  commitment. Opening shape: cheap, then a fixed ratio per rung, tuned so a
  balanced run affords roughly **eight halls by year 35** and a completionist
  ten or eleven. That is the pacing spine of the whole game now, and 15G owns
  the numbers.
- Founders Hall re-seeded: `slots: 1`, `s.halls[GENED_BUILDING_ID] =
  [{ programId: 'CORE' }]` from founding. Its one slot is filled before the
  player sees the game.

**No reader yet.** `test/invariants.test.ts` asserts every non-null slot points
at a real program, that no program is housed twice, and that every hall in
`s.halls` is a placed Buildable with exactly its `slots` entries.

**Verify.** A founding save has one hall, one slot, the core in it, and no way
to found anything.

**As implemented:** the hall is a *chain*, not one Buildable cloned. Every
Buildable in `s.tech` has a unique id, and the dorm chain is already the
repository's shape for "several of one thing": twelve halls (`HALL-01` to
`HALL-12`) in `techData.ts`'s `initialTech()` — beside the school buildings
they replace rather than in `campusData.ts` — each unlocked by the one before
it, the first by the gen-ed core. Twelve because that is the completionist
ceiling: seven schools plus a second Business, Engineering, Science, Social
Sciences and Health Science hall for the six graduate programs. A hall's
`s.halls` entry is written the week it *finishes*, not when it is placed: a
building site has no room in it, and "a slot exists" then means "a hall
stands", which is the gate 14C needs. The sim skips the chain until 14I
teaches it to site a hall on purpose, so the balance regression is untouched
by a bill with nothing behind it. The save break is taken in full: the
`MIGRATIONS` table, its three feeder helpers and the migration test fixtures
are deleted, `loadGame` accepts exactly the current version, and
`test/save-migrations.test.ts` becomes `test/save-load.test.ts`.

## PR 14B — The offer queue

**What.**

- `s.programOffers: string[]` — exactly three program ids, or fewer only when
  fewer remain unfounded.
- `refillOffers(s)`: draws from unfounded, revealed programs (graduate programs
  and Medicine/Law excluded until their own gates open, unchanged) on the
  existing per-year RNG stream, under two rules:
  - **Weighted toward started schools** — a school with programs already founded
    is likelier to offer another, so a school the player has begun converges
    rather than dribbling out over forty years.
  - **At least one offer from a school not yet started**, whenever one exists.
    Without this the weighting eats itself and the last two schools are never
    seen.
- Called at founding (to replace what was taken) and once at the gen-ed core's
  completion (to seed the first three).

**Verify.** A test that founds all 42 programs in sequence asserts the offer is
always three until fewer than three remain, never repeats a founded program,
never offers a gated one, and — across three seeds — always includes an
unstarted school while one exists. A second test asserts a player who only ever
takes the same school's offers still sees every school eventually.

**As implemented:** the draw does **not** ride the per-year RNG stream, and
the reason is a measurement. The first cut took one `Math.random` draw per
refill, the discipline `rivalsSystem.ts` keeps, and that single extra draw at
core completion shifted every faculty potential and candidate listing after
it enough to send the balance sim's overbuilder into a distress it never
climbed out of — one check off `test/balance-regression.test.ts`. The offer
is not what the bands measure, so it must not move them: the local PRNG is
seeded from the state instead (the school's name, the week, how many
programs are housed) and the global stream is untouched, which the test
pins by counting draws. Two schools with different names draw differently; a
reloaded save draws what it would have drawn. The refill is also called from
`tickTech` on every finish rather than once at core completion by name: it
is a no-op on any week that reveals nothing, and that is one call instead of
a special case. The
seed gains `programs()`, a fourth independent read of the school table — the
unit that takes a slot, by the id `s.halls` carries — which the sanitizer, the
sweep and every later PR read instead of re-deriving school membership.

## PR 14C — Founding a program

**What.**

- `FOUND_PROGRAM { programId, hallId, slot, facultyId }`: gated on the program
  being in `s.programOffers`, the slot being empty, cash for the entry course,
  and the chosen faculty member having a free slot in the course's field. It
  writes `s.halls`, starts the tier-1 course through the existing
  `START_DEVELOPMENT` path with the chosen instructor, refills the offers, and
  logs "Founded Mechanical Engineering in the North Academic Hall".
- **The hall panel.** `BuildingInfoPanel.tsx` grows a hall view: a **2×3 grid**
  of slots. An empty slot is a pale parchment tile with a **+**. Clicking it
  fans out the three offers as course tiles — the entry course's code, its
  name, its cost, its field, and the school's colour (Plan 14G's palette, which
  this PR introduces). Picking one opens the instructor picker the course drawer
  already uses. A filled slot shows its program.
- `unlockAvailable`: a tier-2 course's prereqs become `[t1Id]` plus the dynamic
  gate **"this course's program is housed"**, checked in `meetsUnlockGates`
  against `s.halls`. The seven school-building Buildables and their
  `tier1IdsInSchool` prereqs leave `initialTech()`; `BUILDING_DESCRIPTIONS`,
  `SCHOOL_BUILDING_COST/WEEKS/UPKEEP` and the Curriculum tab's "complete this
  school's entry courses to raise its building" caption go with them.
- The gen-ed core's completion unlocks the first academic hall and seeds the
  offers. **This is the new year-one beat** and Plan 16's PR F writes the letter
  that names it.

**Verify.** On a fresh game: core completes, one hall is offered cheaply, three
programs wait, and nothing can be founded until the hall stands. Founding one
replaces it in the offer. A tier-2 course of an unhoused program stays locked.

**As implemented:** the housed gate covers **every** course of a program,
tier 1 included, not tier 2 alone: with tier-1 courses merely `available`
after the core, the Curriculum tab's drawer could have started one and
bypassed the founding. So a tier-1 course stays `locked` until
`FOUND_PROGRAM` writes the slot, resolves unlocks and starts it in one
transaction — and the tab's forty-two-card tier-1 pool, which 14G was to
delete, goes now, because a wall of locked cards that says "found this from
a hall" is worse than no wall. The pool is the core, captioned with the
three programs on offer. Sections are keyed by school **name**, not by a
building that no longer exists. The naming-rights event stands down (its
donor pool reads empty) until 14E points it at a dedicated hall. A lab's
prerequisite drops the school building and keeps only the entry course,
again until 14E re-points it at `school-founded`. Medicine and Law keep
their buildings until 14E, and are not offered until those stand. And
because the balance sim cannot progress past the core without founding, it
learned to site a hall and found the cheapest affordable offer *here*
rather than in 14I — cheapest-first for every strategy; the completionist's
school-first rule and the scatterer control are still 14I's. Two regression
checks needed an honest answer rather than a re-tune. The Overbuilder's
twenty-year distress turned out to be an artefact of the wall: forty-two
`available` tier-1 courses made it hire forty professors it could not pay,
and with three programs on offer it hired three. Its character is building
capital ahead of demand, so the two spend-to-the-wire archetypes now site the
next hall whenever it is affordable rather than when a slot is needed, and do
so even while "saving" for a dorm they cannot afford — which is what a player
with no buffer does — and the distress-and-recovery is back. And the discount
strategy's decade-over-decade cash trend tripped on phase alone (its tower
purchase moved from the late twenties into the early thirties), so that claim
is now judged across seeds like its sibling, per the test's own policy.

## PR 14D — The program tile, and courses from the map

**What.**

- A filled slot renders as a **program tile**: the program's name, its school
  colour, its progress (courses done of nine), and its aggregate grade. Clicking
  it expands the tile in place to a strip of its nine courses in tier order —
  each done course showing its grade and instructor, each available course
  showing a **+**.
- Clicking a **+** opens the same instructor picker and starts that course. One
  course, one deliberate choice of who teaches it, 421 times. There is no
  auto-assignment anywhere in this plan.
- `START_DEVELOPMENT` is unchanged and still serves the Curriculum tab's drawer;
  the hall panel is a second caller, not a second mechanism.

**Verify.** Every course in a housed program can be started from its hall panel,
with the same grade preview and the same faculty eligibility rules the drawer
applies. A course whose field has no free faculty slot shows why.

## PR 14E — Schools are founded

**What.**

- **A hall is dedicated** when all six slots are housed and every program in it
  belongs to one school. Dedication is a *reading* over `s.halls`, computed in
  one exported function, not a flag.
- `school-founded:<School>` milestone, awarded once on first dedication,
  celebrated, **never revoked**. `checkMilestones` gains the pass.
- The school's **name** is revealed on founding — until then the Curriculum tab
  shows its programs in its colour with no label (see 14G). The celebration is
  the naming: *"Six programs, one building. This is the School of Engineering."*
- The hall renders as "<School> Hall" on the map, and the existing naming-rights
  event becomes eligible for a dedicated hall (it already reads `donorSurname`),
  so a founded school can become "the Halvorsen School of Engineering".
- **Gates re-pointed**: a school's lab prerequisite, today `[major tier-1,
  school building]`, becomes the `school-founded` milestone.
  `graduateGateMet` reads established programs and is untouched.
- **Graduate programs belong to their `homeSchool`** — the field already exists
  in `GRADUATE_PROGRAMS`. A grad program housed in a hall counts as that school
  for dedication. Since the six undergraduate majors already fill their school's
  hall, an MD or a doctorate needs a **second Health Science hall**, and that
  second hall is dedicated on its own terms. Medicine and Law lose their bespoke
  `BLDG-MED`/`BLDG-LAW` buildings and take ordinary slots like everything else.

**Verify.** Six Business programs in one hall founds the School of Business and
names it; five plus one Engineering program founds nothing. A second hall of
Health Science programs plus the MD dedicates separately. Moving a program out
of a dedicated hall keeps the milestone.

## PR 14F — Relocation

**What.**

- `RELOCATE_PROGRAM { programId, hallId, slot }`: moves a housed program to any
  empty slot in any standing hall. **Free in money, expensive in time** — the
  program goes dark for `RELOCATION_WEEKS` (opening value 12): its courses count
  toward no seats, contribute no teaching quality, and cannot be started or
  advanced while it is in transit.
- The natural brake is already structural: **you can only move into a free
  slot**, so reorganising six programs into one hall requires having built the
  spare capacity to shuffle through. The dark term is what stops a free,
  instant, end-of-run tidy-up from defusing every slot decision the player made
  along the way.
- The hall panel shows a program in transit and what it is costing.

**Verify.** A program mid-move teaches nobody and contributes nothing; it
resumes with its courses and instructors intact. A run that founds greedily and
reorganises later reaches its schools later than one that sited carefully — the
scorecard in 15G should be able to see the difference.

## PR 14G — Forty-two rows

The Curriculum tab stops being seven school pages and becomes **one row per
program**, which is the view the progression actually has now.

- **A row per program**, in the lane shape that exists today: tier bands left to
  right, nine cells, undeveloped courses drawn as empty cells so every row is
  the same width and position carries tier. Rows **compress** to fit rather than
  scrolling horizontally; horizontal scroll is a narrow-viewport fallback only.
- **Colour, not label.** Each row carries its school's colour. The school's
  *name* appears only once it is founded. Rows **auto-sort by school**, so
  clusters form on their own and "three of this colour already, and I have a
  hall with three slots free" is a conclusion the player reaches by looking.
  **This is the one place the game deliberately breaks the parchment / navy /
  brass register**: seven mid-saturation, mid-luminance hues, colourful without
  being bright, chosen to sit on parchment and to stay distinct at row height.
  Each school also gets a small **motif** alongside its colour, so the grouping
  survives for a colour-blind player and at a glance.
- **Faculty chips.** A compact instructor chip sits with each developed course —
  portrait, surname, the grade. Chips are **drag-and-drop between courses to
  swap instructors**, with a **live grade delta on both courses while dragging**,
  which is the entire reason the mechanic is worth building. A drop that is not
  a legal swap (no free slot, wrong field) is a no-op and **both professors stay
  where they were** — nothing is displaced to unassigned behind the player's
  back.
- **`Develop N` is deleted**, along with the tier-1 pool, its alphabetical
  40-card wall and `test/develop-all.test.ts`. Starting a course from a row cell
  opens the same instructor picker the hall panel uses.
- The course drawer survives unchanged. It was always the model for what an
  entity view should be and nothing here improves on it.

**Verify.** A year-15 scenario shows forty-two rows sorted into colour blocks,
three of them unnamed; dragging a distinguished professor from a survey to a
capstone previews both grades and applies both.

## PR 14H — The market as a gate, and a search worth paying for

Every course now needs a deliberate instructor, and the candidate market lists
somebody in a thin field (Clinical Health, AI, Neuroscience) every few months.
That makes **hiring, not cash, the thing a run stalls on** — which is the
pressure the review asked for, and a wall if the player can only wait it out.

- `POST_SEARCH { field }`: spend money to raise the weekly probability that a
  candidate in a named field is listed, for a fixed window. It rides
  `facultySystem.ts`'s existing `tickCandidatePool` rather than inventing a
  second market.
- Surfaced where the shortage is felt: the instructor picker, when no one is
  eligible, offers the search instead of a dead end; the Faculty board offers it
  per short department.
- It is also the recurring **money sink the mid-game needs** — a cost that scales
  with ambition and produces people rather than a bigger number.

**Verify.** A run blocked on Clinical Health can spend its way to a candidate in
a measurable fraction of the wait. The sim's blocked-week column (Plan 09's PR E)
distinguishes money-blocked from faculty-blocked.

## PR 14I — The harness, and docs

- `sim/balanceSim.ts`'s `decide()` sites halls when slots run out, founds from
  the offer (cheapest-first, or school-first for the completionist), starts
  courses with the best eligible instructor, and posts searches when blocked.
  The earnest completionist fills halls by school; a new **scatterer** control
  founds whatever is offered wherever it fits and should visibly under-perform.
- `sim/milestones.ts` gains first hall, first founded school, every school
  founded.
- `docs/design/curriculum.md` rewritten around halls, slots and the offer;
  `docs/architecture/buildables.md` gains the hall kind and loses the seven
  school buildings; `docs/architecture/campus-map.md` loses "read by no system"
  in the one place the hall panel now reads it; `game-state.md` records the
  save break and the deleted migration chain.

---

## What this plan does not do

- **It does not touch the economy.** Halls are priced by feel here and fitted
  for real in [Plan 15](15-growth-has-a-cost.md)'s PR G. Between the two plans
  the game will be badly balanced, and knowingly so — that is the cost of
  fitting the constants once, against the shape the game will actually have,
  instead of twice.
- **It does not make seats a ceiling.** `instructionCapacity` reading developed
  courses in housed slots is Plan 15's PR E, because a ceiling without a cost
  model behind it is a wall rather than a tradeoff.
- **It does not add adjacency, pedestrians or any wider reading of the map.**
  The hall panel is the map's first mechanical surface; what the map *shows* of
  the simulation stays on the backlog.
- **It does not author course content.** All 421 courses still differ only by
  tier, field and a templated sentence. The review's H2 asked for authored
  per-course texture and it is content work that can land in any order; what
  this plan removes is the *wall*, not the sameness behind it.
- **It does not add the faculty lifecycle.** Retirement, poaching and retention
  are deferred by decision, and this plan is what makes them worth writing: a
  program is now a room in a building with a named person in it, and losing that
  person is a visible hole rather than a row in a table.
