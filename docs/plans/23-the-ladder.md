# Plan 23 — The ladder

*Planning document only. Its job is to turn Phase B of the v2 merge (the
unlock track, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a
sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

UniSchool v2's first hour was the owner's biggest complaint: too many
buildings, tabs and systems at once. The fix they asked for is the one
Cities: Skylines uses, a visible ladder of milestones that opens the game a
piece at a time.

This game's first hour is already fairly narrow:

- a founding college can build six things;
- three tabs are gated;
- the rest opens through prerequisite chains.

The pressure comes later. Phase D ports v2's catalogue of building types,
Phases F–J add treasury options, seats, alumni and a league, and all of it
needs somewhere to land. Today that somewhere is scattered:

- `minCapacityToUnlock`, `minPrestigeToUnlock` and `minCoursesToUnlock` on
  individual Buildables;
- three predicates in `TabNav.tsx`'s `TAB_GATES`;
- a handful of per-system reveal flags.

None of them is visible to the player until it fires.

## 1. The design

**A milestone is a named achievement with one condition and a list of
what it opens:** buildings, tabs, and in later phases, systems. Reaching one
is permanent. It never re-locks, as today's gates never did.

**Milestones are independent, not a strict sequence.** A strict ladder, one
rung after another, would lock whole playstyles out. Measured on the
harness (the year each condition is first met):

| Condition | Balanced | Selective | Regional | Scatterer | Curriculum rush |
| --- | --- | --- | --- | --- | --- |
| First commencement | 2.0 | 2.0 | 2.0 | 2.0 | 2.0 |
| Eight courses developed | 2.2 | 2.3 | 2.2 | 1.1 | 1.2 |
| 1,500 students | 5.0 | 7.0 | 5.0 | 5.0 | 48 |
| A school founded | 6.1 | 9.3 | 10.4 | never | 3.6 |
| Prestige 70 | 9.0 | 9.0 | 11.0 | 11.0 | never |
| 20,000 students | 15.0 | never | 13.0 | 14.0 | never |

The Scatterer never founds a school, and the curriculum rush barely grows.
A ladder that made either wait on the other's rung would block most of the
game. So each milestone opens on its own condition.

**The ladder is how they are shown:**

- in the order they typically land;
- grouped into four tiers (Founding, Growing, Established, National);
- each with its progress ("1,120 of 1,500 students") and what it opens.

**Thresholds are v1's own.** Each retired gate becomes a milestone with the
same number, so the balance moves only where a building changes milestone
on purpose. Only three items move:

- The **Student Center**, **Recreation Center** and **Second Quad** move from
  day one to the first commencement. They are no longer on offer in the
  first year, so the founding build list is the dorm, the dining hall, the
  quad and the library, with the curriculum first. That is the curated
  founding sequence the plan asks for.
- The **Student Union Expansion** and the **Grand Quad** move behind
  prestige 55. They had only chain prerequisites before. They are showpieces,
  and the Athletics Complex already sat at 55.

**Structural gates stay where they are.** They are not pacing, they are
logic:

- prerequisite chains;
- a lab waiting on its school (`schoolGate`);
- a graduate program's gate;
- an athletics venue waiting on a team that needs it.

The ladder lists the side milestones that drive them, so the player can see
them, but it does not replace them.

**Tabs open from milestones.** `TAB_GATES` folds into the ladder:

- Enrollment, Student Life and History open at the first commencement;
- Research opens with the first finished lab;
- Athletics opens with the first sport club.

Curriculum, Faculty and Treasury are open from the charter.

**Each milestone arrives with a letter.** A short note names what just
opened and what it is for. These are the "each unlock introduced as it
lands" letters the plan asks for, and they are few: one per milestone,
about a dozen over fifty years. They queue behind anything more urgent
and never drop.

## 2. The milestones

| Tier | Milestone | Condition | Opens |
| --- | --- | --- | --- |
| Founding | The charter | always | Founders Hall, the dorm and dining chains, the Campus Quad, the Library; Curriculum, Faculty, Treasury |
| Founding | First commencement | the first summer closes | Student Center, Recreation Center (and its chain), Second Quad; Enrollment, Student Life, History |
| Founding | A curriculum | eight courses developed | academic halls |
| Growing | A town's worth | 1,500 students | Health & Counseling Center |
| Growing | A regional name | prestige 55 | Athletics Complex, Student Union Expansion, Grand Quad & Gardens |
| Growing | A school founded *(side)* | any school founded | that school's labs (by their own gate) |
| Growing | A laboratory *(side)* | a lab finished | Research |
| Growing | A sport club *(side)* | a sport club or team | Athletics (venues open team by team) |
| Established | A small city | 6,000 students | University Clinic |
| Established | A research reputation | prestige 70 | Research Library |
| Established | A market of its own | 8,000 students | Campus Grocery Store |
| Established | A school distinguished *(side)* | any school distinguished | graduate programs (by their own gate) |
| National | A university town | 20,000 students | University Hospital |

Later phases add rows: Phase D's building types, Phase G's seats and speed
tiers, Phase I's alumni office, Phase J's league, and Phase L's capital
projects.

## PR 23A — The plan

This document.

## PR 23B — The ladder in the sim

- **`src/data/ladderData.ts`** holds the milestones: id, tier, name,
  condition, progress reading, the buildable ids and tabs each opens, and
  its letter.
- **`src/systems/ladder/ladderSystem.ts` (`tickLadder`)** records each
  milestone the week its condition first holds. It runs before `tickTech`,
  so a building a milestone opens is available that same week.
- **`GameState.ladder`** is `{ reached: Record<id, week>; unread: id[] }`.
  The charter is reached at founding. `SAVE_VERSION` 71.
- **`techSystem.ts`'s `meetsUnlockGates`** asks the ladder for a buildable's
  milestone. `minCapacityToUnlock`, `minPrestigeToUnlock` and
  `minCoursesToUnlock` leave `Buildable` and the data files, and their
  constants move into the ladder's conditions.
- **`TabNav.tsx`'s `tabAvailable`** reads the ladder. `TAB_GATES` is gone.
- **Tests:**
  - milestones open on their conditions and never close;
  - every buildable a milestone names exists, and none is named twice;
  - a gated building stays locked until its milestone;
  - the tab gates now read the ladder;
  - the content suite checks the ladder's references.

## PR 23C — The letters

- **A new interrupt type, `milestone-reached`.** The events system fires
  it on a quiet week for the oldest unread milestone: after earned
  celebrations, before decision events.
- **`MilestoneReachedView`** shows the milestone, its one-paragraph letter,
  and a list of what it opened, each with a line on what it is for.
- **`RESOLVE_MILESTONE_LETTER`** marks it read and turns the calendar page,
  like every other trailing interrupt. The default answers and the
  harness answer it.

## PR 23D — The ladder on screen

- **A Milestones panel,** opened from the status bar's next-milestone line.
  It shows the four tiers, each milestone as reached (with the year),
  next (with progress) or ahead (with its condition), and what each opens.
- **The next-milestone line** sits in the ticker strip: the nearest unmet
  milestone and its progress.

## PR 23E — Balance and docs

- **The harness.** The regression suite, the scorecard and the guardrails
  are re-run. The Student Center and Recreation Center moving to the first
  commencement is the one expected shift. If the scorecard's bands move,
  they are re-recorded with a note.
- **`docs/design/progression.md`** gains "The ladder", and the architecture
  docs name the new system.

## What this plan does not do

- **It adds no new buildings.** Phase D brings v2's catalogue and assigns
  each type a milestone.
- **It does not gate speeds.** That is Phase G, with the seats.
- **It does not touch the opening walkthrough,** which is the charter's
  first steps and stays as it is.
