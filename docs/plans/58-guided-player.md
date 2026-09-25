# Plan 58 — The guided player

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The rebuild's second layer (Plan 56 §2): a player that does only what the
game tells it, measuring the line of play so the owner can set numbers
from it ("build to measure, then recommend"). The owner also asked, from a
playthrough, that **the Graduate College open from Year 15**, not 20.

## 1. The PR

- **The Graduate College from Year 15** (`projectData.ts`). A capital
  project's terms now load from the catalog like its description
  (`persistence.ts`'s refreshAuthoredText), so a saved run opens it from
  Year 15 too; no save bump.
- **The line says what it asks for, as data.** `systems/guidance/intent.ts`'s
  `StepIntent` (found, move, site, develop, build-for, research, wait) rides
  on every next-step line and letter ask; the UI reads only the words.
- **Two guidance gaps the guided player found, fixed** (`nextStep.ts`):
  - *A deadlock.* With Founders Hall full, a school's hall taking only its
    own school, and three offers of other schools standing (offers never
    change until one is founded), the letter "Grow Science to three
    programs" waited for years. A letter whose ask has nothing to do this
    week now gives way to a line that does: "Nothing on offer has a hall to
    go to — site Oak Hall".
  - *A school left behind.* With every major housed and a school still in
    Founders Hall, nothing said to build the next hall. Now: "Engineering
    has no hall of its own — site Cedar Hall".
- **The guided player** (`sim/harness/guided.ts`): the line's intent first;
  then plain sense — save for what the line asks when the cash does not
  cover it, fix any attribute under 25 even while saving, keep eight
  weeks' expenses for its own spending, nothing recurring at a loss, the
  summer priced at the admissions screen's "fair".
- **Checks** (`test/guided.test.ts`, slow, ~80 s): three fifty-year runs keep
  the rules, never leave an interrupt standing, and deliver every letter
  with its ask done.
- **The report** (`npm run guided`): five runs measured.

## 2. What it measured

| | 12345 | 4242 | 777 | "Harrow College" | "Test" |
|---|---|---|---|---|---|
| Every letter's ask done | Y3 | Y3 | Y3 | Y3 | Y2 |
| All seven schools founded | Y6 | Y6 | Y6 | Y6 | Y6 |
| Founders Hall empty | Y6 | Y6 | Y6 | Y6 | Y6 |
| First #1 | Y17 | Y17 | Y17 | Y17 | Y17 |
| Rank at Y50 | 7 | 2 | 1 | 6 | 1 |

**Recommended numbers**, each the worst run plus about half again, for the
owner to set as checks or not: every letter's ask done by **Year 5**; all
seven schools founded by **Year 10**; first #1 **no earlier than Year 12**
(a floor, if the owner wants pacing held).

**For the owner:**

- *Pace.* The whole line of play — seven schools, Founders Hall empty —
  finishes by Year 6, and #1 comes at Year 17 on every run. The design's
  eras put founding at Years 1–12 and the build-out at 12–35; the old
  harness's pacing guard held first place to Year 25 or later.
- *Research.* From mid-game the line is most often "X Labs is idle —
  commission research", and the player can start one only about a third of
  the weeks it is asked (the lab's staff are busy, or nothing is open).
- *Emergencies rank low.* Before the player's plain sense fixed it, one run
  sat at basic needs 13 for decades while the line asked for halls: a
  shortfall ranks below founding and siting.

**As implemented:** the first versions of the guided player collapsed —
its reserve was too strict to buy the dining hall a letter asked for, then
too loose to save for the halls. Saving for the line's ask was the rule
that held on every run. The owner has since decided Founders Hall may be a
school's hall with six purchased halls; that lands with the playthrough
plan, and the report's "Founders Hall empty" goes with it.
