# Plan 11 — Academic halls

*Planning document only — no gameplay code is changed by this file. Its job is
to take the September review's finding that the curriculum is "421 Buildables
that differ only by tier, developed one click at a time" and the response to
it — repeatable academic halls with rooms, programs housed in rooms, schools
that emerge from a filled hall, and a hall popup on the map as the place the
curriculum is actually built — and turn it into an ordered sequence of PRs.*

**Status: Proposed.** Depends on [Plan 10](10-growth-has-a-cost.md): the
instruction-capacity ceiling it introduces is what this plan replaces with
classrooms, and the section-cost model it introduces is what makes a room
worth something.

---

## 0. What changes, and what does not

Today a school's hall is a milestone reward (finish its six entry courses,
build "Engineering Hall", tier 2 opens) and a course is a Buildable the player
starts by hand, choosing an instructor each time: three or four clicks, 421
times. The hall itself does nothing after it unlocks tier 2; the map reads
nothing; and "which course next" has no answer except "all of them".

After this plan:

- **Halls are repeatable, placeable Buildables with rooms.** A room hosts one
  **program** — a major, the gen-ed core, or a graduate program — for as long
  as the program exists. Founders Hall opens with two rooms: the core in one,
  the other empty.
- **Founding a program in a room is the decision.** It reveals the program's
  nine courses *in that room*, and the courses then develop in sequence from
  the room's own roster, charging cash as each starts, without a click per
  course. The player can pause a room, reorder its queue, or reassign an
  instructor; the default is that a staffed, funded program keeps building.
- **Schools emerge.** A hall whose rooms all belong to one school *becomes*
  that school's hall — a celebrated milestone, a naming-rights offer, and the
  gate the school's lab and graduate programs already read. Nothing is called
  "Engineering Hall" until the player has made one.
- **Rooms are the ceiling.** Plan 10's interim instruction capacity becomes
  seats in rooms. A school that wants more students builds more halls, and a
  hall full of empty rooms teaches nobody.
- **The map has its first mechanical reading**: a single-school hall teaches
  better than a mixed one, and a lab standing beside its school's hall
  produces more.

What stays: the 421 courses, their tiers, prerequisites and bridges; course
quality graded per course from its instructor; `courseFaculty` as the
assignment record; the Curriculum tab as the reference view; milestones as
the breadth stock prestige reads; Medicine and Law as halls of their own.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 11A | Rooms as state: `s.rooms`, hall Buildables with room counts, Founders Hall re-seeded; nothing reads them yet | Plan 10 landed |
| 11B | Founding a program in a room; the tier-2 gate reads "housed" instead of "school building built"; the seven school halls retired | A |
| 11C | Continuous development and auto-assignment from the room's roster; the hall panel on the map | B |
| 11D | Schools emerge: the `school-founded` milestone, naming rights on a filled hall, lab and graduate gates re-pointed | B |
| 11E | Seats: instruction capacity from rooms replaces Plan 10's formula; hall tiers and floors | C, Plan 10D |
| 11F | The map reads: the single-school bonus, lab adjacency | D |
| 11G | The Curriculum tab follows: schools as emergent sections, lanes link to rooms, the tier-1 pool becomes "programs you could found" | B–D |
| 11H | The harness founds programs and sites halls; docs | all |

---

## Open questions, settled before the first PR

**One room, one program — not one room, one course.** A course per room is
421 rooms in 35–50 halls, which is more buildings than the map or the budget
wants and more clicks than today. A program per room is 42 undergraduate
programs, the core, and six graduate programs — 49 rooms in roughly eight to
twelve halls over a run. The unit of decision becomes "what goes in this
building", which is a decision worth a building.

**Do courses still develop one at a time?** Yes, in the model — each course
keeps its cost, duration, prerequisites and instructor, and `developing`
still counts it down — but *no longer one click at a time*. A founded,
staffed room advances its own queue. The player's controls are the room's
roster, its pause switch, its queue order, and per-course instructor
overrides. That preserves everything the course-quality model does and
removes the chore the review named.

**What is a hall's roster?** The faculty assigned to the room's program: the
same `courseFaculty` record, read per room. Assigning somebody to a room
means "they teach in this program"; the auto-assigner puts the strongest
teacher on the highest tier, exactly as `planCommitmentCoverage` already
re-homes shed courses. A professor can be in one room at a time; that is the
`facultyLoad` slot rule read through rooms.

**What happens to the seven school halls and to `school-complete` gating?**
Retired. The tier-2 prerequisite `[t1Id, school.buildingId]` becomes
`[t1Id]` plus the dynamic gate "this course's program is housed". The gate on
a school's lab — today `[major tier-1, school building]` — becomes the
`school-founded` milestone. `graduateGateMet` reads established programs and
is untouched. Medicine and Law keep `BLDG-MED` / `BLDG-LAW` as
single-program halls whose one room is pre-dedicated.

**Save compatibility.** None. This changes the seed's shape and the meaning of
`placements` for eight ids; per `game-state.md`, bump `SAVE_VERSION` and let
old saves drop.

---

## PR 11A — Rooms as state

- `types.ts`: `RoomAssignment = { hallId: string; room: number }` and
  `s.rooms: Record<programId, RoomAssignment>`; a `rooms?: number` field on
  `Buildable` for hall-kind Buildables. The program id is the major prefix,
  `'CORE'` for the gen-ed core, or a graduate program id.
- `campusData.ts` (or a new `hallsData.ts`): the hall chain as repeatable
  `building`-kind Buildables — **Lecture Hall** (4 rooms, 7×5, the existing
  `hall` motif), **Academic Hall** (8 rooms, 9×7, a new two-wing motif or the
  `block` motif at scale), **Academic Tower** (16 rooms, 7×7, the `tower`
  motif, gated on prestige 90). Costs sized in Plan 10's post-refit money so
  a hall is one to two years of surplus at the stage it is needed.
- Founders Hall re-seeded with `rooms: 2`, and `s.rooms.CORE` pointing at it
  from founding.
- No reader yet. `test/invariants.test.ts` asserts every `s.rooms` entry
  points at a placed hall with a free index.

## PR 11B — Founding a program

- `FOUND_PROGRAM { programId, hallId, room }`: gated on the program being
  revealed (its entry course available, or its graduate gate met), the room
  empty, and cash for the entry course. It writes `s.rooms`, starts the entry
  course (the old `START_DEVELOPMENT` path), and logs "Founded Mechanical
  Engineering in Lecture Hall 2".
- `unlockAvailable`: tier-2 courses require the program housed; the seven
  school-hall Buildables and their prerequisites leave the seed; the
  Curriculum tab's "raise its building" caption goes with them.
- The founding-school milestone chain is unchanged from `program-established`
  onward.

## PR 11C — Continuous development, and the hall panel

- Per room: `paused: boolean` and a queue order (default: tier, then id).
  `tickTech` gains one step before `unlockAvailable`: for every unpaused room,
  if no course of its program is developing, start the next queued course
  whose prerequisites are met, whose cost is affordable *above the player's
  reserve* (a `s.finance.reserve` the Treasury exposes, default four weeks of
  opex, so the queue never spends the last dollar), and for which the room's
  roster has a free slot — assigning the strongest free teacher by tier.
- The **hall panel**: `BuildingInfoPanel` grows a hall view. A room grid;
  an empty room offers "Found a program" from what is revealed; a program room
  shows its nine courses as a strip with grades and progress, its roster
  chairs (assign from the department's people or the market, the same
  eligibility as the drawer), the pause switch, and the queue. This is where
  the curriculum is built from now on; the Curriculum tab is where it is read.
- `START_DEVELOPMENT` with an explicit instructor stays as the override path
  the drawer uses.

## PR 11D — Schools emerge

- A hall is **dedicated** when every housed room belongs to one school and at
  least `SCHOOL_FOUNDING_ROOMS` (opening value 4) are housed. Dedication is a
  reading, not a flag, so moving a program out un-dedicates it.
- `school-founded:<School>` milestone, celebrated, on first dedication; the
  lab's prerequisite and `researchSchools()` read it; the naming-rights event
  becomes eligible for a dedicated hall (it already reads `donorSurname`), and
  the hall renders as "<School> Hall" or "<Donor> School of <School>".
- `school-distinguished` is unchanged.

## PR 11E — Seats

- `instructionCapacity(s)` = Σ over housed rooms of `developedCoursesInRoom
  × SEATS_PER_COURSE × hallTierMultiplier`. Plan 10D's formula is deleted;
  its readers (the intake cap, the reveal's "room for N more", the crowding
  penalty) stay.
- Halls take floors the way the library does (`RENOVATE_HALL`: +rooms, taller
  motif), so a mid-game campus can grow up rather than only out.

## PR 11F — The map reads

- **Collegiality**: courses in a dedicated hall gain `+2` quality (one grade
  band is 16–18 points, so this is a nudge, not a lever). Mixed halls carry
  no penalty; the bonus is the reason to sort, not a punishment for not.
- **Lab adjacency**: a lab whose footprint touches its school's dedicated
  hall (Chebyshev distance 1 on the grid, no pathfinding) adds `+0.06` to
  `researchRateBonus`. Small, visible in the lab's info panel, and the first
  time `placements` is read by a system — the invariant sweep that forbids it
  is amended to allow exactly these two readers.

## PR 11G — The Curriculum tab follows

- School cards become emergent: a school section appears when its first
  program is founded; the aggregate ring counts housed programs' courses.
- The tier-1 pool becomes **"Programs you could found"**: 42 cards grouped by
  school, each naming the room it would need and the field its entry course
  wants. The 42-card alphabetical wall goes.
- A lane's header links to its room; a cell's drawer keeps the override.

## PR 11H — The harness, and docs

- `balanceSim.ts`'s `decide()` sites halls when rooms run out and founds
  programs by the same cheapest-first order it used for courses; continuous
  development does the rest. The earnest completionist fills halls by school.
- `docs/design/curriculum.md` and `docs/architecture/buildables.md`
  rewritten; `campus-map.md` loses "read by no system".

## What this plan does not do

- No pedestrians, no pathfinding, no wider adjacency model. Two readers of
  the map, both local.
- No change to course content, descriptions or per-course effects. That is
  content work the review's H2 also asked for and it can land in any order.
- No faculty lifecycle. A room that loses its professor to an outside offer
  is now a visible hole in a building, which is the moment that plan becomes
  worth writing.
