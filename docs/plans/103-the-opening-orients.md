# Plan 103 — The opening orients

*Planning document only — no gameplay code is changed by this file. The
owner's brief (13 October 2026): "We don't need to add letters for the
sake of it, but we do need to expand the opening to make sure that a
player is properly oriented before releasing them to do whatever they
want." After the three opening steps, a player may ask "now what?" Some
will find their own way through the tabs; some want more direction.*

**Status: Approved (13 October 2026): every decision as proposed. B built.**

---

## 0. What the opening teaches today, and what it should

The walkthrough (`state/opening.ts`, `data/openingData.ts`,
`components/OpeningCoach.tsx`) is three steps: site Founders Hall, appoint
Dr. Grace Bennett, found English. Then the stage becomes `play`, the clock
runs, and the board's letters take over. The next letter, "Somewhere to
sleep, somewhere to eat", is a plain modal at week 9.

The owner's list of what a player should know before being let go:

| # | Skill | Taught today? | Taught by |
|---|---|---|---|
| 1 | Place a building on the map | Yes | Step 1 (Founders Hall) |
| 2 | Start a program | Yes | Step 3 |
| 3 | Hire a professor | Yes | Step 2 |
| 4 | Develop another course in a program | **No** | New step 4 |
| 5 | Check the satisfaction levels | **No** (a letter mentions them) | New step 5 |
| 6 | Fix them | **No** (the letter says "site a residence hall and a dining hall") | New steps 6–7 |

After step 7 the player is released. Summer admissions, clubs, athletics
and the rest are left to discover. **No new letters.**

## 1. What a walkthrough-only player sees (measured)

Measured headless on seed 12345: a player who does the three steps and
nothing else.

- **ENGL101 is taught at the start of week 5** (four weeks).
- **Then ENGL110, 120, 130 and 140 open:** $900k each, 10–15 weeks.
  `canStartDevelopment` passes for each with Bennett (three course slots),
  and cash is about $3.0M. Step 4 can't dead-end on money or staff.
- **Housing and Dining fall from 70 to 12 in week 2.** Social is 16,
  Academic 43, Health 100. The low ratings are plain from week 2, long
  before the letter's week 9.
- **A residence hall is $350k and a dining hall $250k.** Both are
  affordable after the second course.
- **Both sim players (Guided and Natural) site a dorm and a dining hall in
  week 1,** before the letter. So steps 6–7 must handle a player who got
  there first.

## 2. The new steps

All of them reuse what the walkthrough already has:
- the coach card;
- the ring (`opening-target`);
- "the clock is held until this is done";
- a door button to reopen what the step needs;
- "Skip the rest of the walkthrough", keeping the letters;
- `settleOpening`, which moves on through any step already done.

### Step 4 — Develop the next course

- **Stage `await-course`** (new): `found` now leads here, not to `play`.
  - The clock runs, and no card shows.
  - The next-step strip reads as in `play`, so the seating line speaks.
- **Trigger:** the first program's entry course is taught (about week 5).
  The weekly tick moves the stage to `second-course`.
- **Stage `second-course`** holds the clock:
  - **The Curriculum opens** on that program's row, and the row is
    **expanded**, so its ten courses show as cells.
  - **The row's "Develop … with Bennett" button is ringed.** The step
    rings whatever course the button already proposes, so the card and the
    tab never disagree.
  - **Card copy** (draft): "ENGL101 is taught. A program is ten courses,
    and the next four open now. Each is written by the curriculum
    committee with a professor who has room to teach it. Develop one."
  - **Door:** "Open the Curriculum".
- **Done when:** any course other than a program's entry course is
  developing or taught.
- **The program is gone before its course is taught** (closed, or moved
  out of Founders Hall): `await-course` falls through to steps 5–7
  (decision 1) without step 4.

### Steps 5–7 — Somewhere to sleep, somewhere to eat

- **Step 5, `needs`:**
  - The Students tab opens on the satisfaction breakdown
    (`students.breakdown`).
  - **The Housing and Dining cards are ringed** (`StudentLifeTab.tsx`'s
    `AttributeCard`).
  - **The card carries the letter's live figures:** satisfaction, students,
    beds and dining seats.
  - It ends on **Next**: this step is for looking.
- **Step 6, `site-housing`:**
  - The build menu opens on its **Housing** tab, with the next residence
    hall ringed.
  - **Done when** a dorm is sited (the letter's own `sited` reading).
  - **Door:** "Open the build menu".
- **Step 7, `site-dining`:**
  - The same, on the **Dining** tab.
  - **Done when** a dining hall is sited. The stage then becomes `play`.
- **Already done:**
  - `settleOpening` skips step 6 or 7 if its building is already sited.
  - If both are, step 5 still shows, ending "Both are going up; the
    ratings rise when they open." Then the walk ends.
- **The letter, when the walk was walked:** `somewhere-to-sleep` is
  recorded read and never sent, since steps 5–7 are the letter.
- **The letter, when the walk was skipped** ("Skip the rest of the
  walkthrough", letters kept): it fires at week 9 as now.

## 3. Decisions for the owner

| # | Question | Proposed |
|---|---|---|
| 1 | When do steps 5–7 start? | **Straight after step 4** (about week 5). Housing and Dining are at 12 from week 2, and a player released at week 5 and pulled back at week 9 gets the "now what?" gap this plan is closing. The alternative keeps week 9, with four weeks of free play inside the walk. |
| 2 | The letter in a walked run | **Replaced by steps 5–7.** Its figures move into step 5's card. Keeping it as a modal in front of the steps says the same thing twice. |
| 3 | Do steps 5–7 hold the clock? | **Yes**, like every other step. The player can skip at any card. |
| 4 | Which course does step 4 ring? | **The one the row's button proposes** (the first available, ENGL110). The player may develop any; any counts. |

## Rules for every PR in this plan

- **Old saves are untouched.** A save at `play` stays at `play`: no
  migration, no new steps. The new stages are only reached from `found`.
- **Headless runs are untouched.** A headless founding opens at `play`,
  so `sim/baseline.json` should not move. Each PR runs `npm run sim` to
  show it.
- **Skip works from every new card**, keeping the letters.
- **The copy follows the house rule:** a rule the step states is checked
  against the code (Plan 95E). The card reads its figures live, never as
  typed numbers (Plan 76C).
- **Each PR runs `npm run check` and `npm run test:slow`,** and is checked
  at phone width (the coach card over a tab).

## The map

| PR | Subject | Depends on |
|---|---|---|
| A | This plan | — |
| B | Step 4: the next course | A |
| C | Steps 5–7: the needs, and fixing them | B, decisions 1–2 |

### PR 103B — Step 4: the next course

- **State:** `OpeningStage` (`state/types.ts:679`) gains `await-course`
  and `second-course`. In `state/opening.ts`:
  - `NEXT_STAGE`: `found` → `await-course` → `second-course` → `play`
    (until PR C).
  - `stepDone` gains both readings.
  - `openingHoldsClock` lets `await-course` run.
  - A check on the weekly tick moves `await-course` on once an entry
    course is taught, or the program is gone.
- **`nextStep`:** treat `await-course` like `play`.
- **Copy:** the card in `data/openingData.ts`. `OpeningStep.door` gains
  `'curriculum'`.
- **Opening the tab:** `App.tsx` opens the Curriculum with
  `program:<id>` when the stage begins, and again from the door.
- **Expanding the row:** `CurriculumTab.tsx` gains a way to open a row on
  arrival. Either:
  - a target `program-open:<id>`; or
  - setting the row's `useCollapse` override to open.
- **The ring:** `RowAction`'s develop button (`CurriculumTab.tsx` ~l.861)
  takes `opening-target` while the stage is `second-course` and the row
  is the walk's program.
- **The coach card over a tab:** it must sit above `.tab-overlay`
  (`z-index: 3`) without covering the ringed row. On a phone it drops to
  the foot, as it does under the hall's panel.
- **Docs:** `docs/architecture/interrupts.md` and `ui-shell.md` where they
  list the stages; `docs/design/progression.md`'s opening.
- **Tests** (`opening.test.ts`):
  - `found` → `await-course` → `second-course` on the entry course's last
    week;
  - done on a second course started;
  - skip from `second-course`;
  - the program closed during `await-course`;
  - an old save at `play` gets no step.

**As implemented.**

- **One more way the step ends:** when none of the program's open courses
  can be started (no professor with room, a full committee, or no cash),
  `'second-course'` is done at once. The step holds the clock, so without
  this a player who had spent the money could only skip. It follows the
  next-step line's rule: never ask for what the player can't do (Plan 98G).
- **The walk moves on at the top of `TICK`,** not after the systems run:
  the course is taught by one tick, and the card opens at the next, on a
  week with no stop standing, so it never opens under a letter. The clock
  doesn't move in between.
- **`walkProgram` lives in `data/openingData.ts`,** not `state/opening.ts`:
  a data file imports nothing from `state/` but types, and the card's copy
  needs it.
- **The card over a tab:** on a wide screen it sits below the tab's header
  (`.over-tab`): pinned top-right, it covered the Curriculum's Close. On a
  phone it drops to the foot, as under the hall's panel, so the ringed
  button stays in view.
- **The clock:** `'await-course'` starts it, as `'play'` did. A walk that
  ends after the course step leaves the speed the player chose.
- **Copy:** "Introduction to Literary Studies is taught. English is ten
  courses, and the next four are open now: each is developed the way the
  first was, by the curriculum committee, with a professor to teach it.
  Each takes 10 to 15 weeks to write. Develop one: the ringed button
  starts the course it names." Every figure is read live.
- **Docs:** `interrupts.md` and `ui-shell.md`. `progression.md` names no
  stages, so nothing changes there.
- **Tests** (`opening.test.ts`, 98 checks): the walk through the new
  stages; skip from the step; no program left; no cash; a run at `'play'`
  never gets the step; a save on the step resumes on it.
- **Checked in the browser,** at 1440 and 390 wide: the row open, the
  button ringed, the card clear of both; Close, then the card's door, then
  the ringed button starts ENGL110 and ends the walk.

### PR 103C — Steps 5–7: the needs, and fixing them

- **State:** `OpeningStage` gains `needs`, `site-housing` and
  `site-dining`.
  - `second-course` → `needs` → `site-housing` → `site-dining` → `play`
    (or from week 9, per decision 1).
  - `site-housing` and `site-dining` are readings, settled after
    `PLACE_BUILDABLE`. `needs` ends on Next (`advanceOpening`).
- **Copy:** three cards. Step 5's body takes the letter's figures
  (`eventData.ts`'s `somewhere-to-sleep` body), moved to a shared helper
  so the letter and the card read the same numbers.
  `OpeningStep.door` gains `'students'` and a build tab.
- **Opening the build menu on a tab:** `BuildPopup` opens on a given
  section. `initialBuildTab` (`BuildPopup.tsx:250`) reads the stage, and
  `buildTabOf` finds the tab.
- **The rings:**
  - the Housing and Dining `AttributeCard`s in `StudentLifeTab.tsx`;
  - the next dorm and dining hall tiles in `BuildPopup.tsx`, extending
    the Founders Hall ring at l.474.
- **The letter:** `fireOpeningLetter` (`eventSystem.ts`) records
  `somewhere-to-sleep` read and unsent when the walk was walked
  (`skipped` false and the stage past `second-course`).
- **Tests** (`opening.test.ts`, `build-tab.test.ts`):
  - each transition;
  - both buildings already sited (step 5 only);
  - one already sited (the other's step only);
  - skip from each card;
  - the letter not sent in a walked run, and sent at week 9 in a skipped
    one;
  - the build menu opens on Housing, then Dining.
