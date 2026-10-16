# Plan 104 — Version 0.1.2

*Planning document only — no gameplay code is changed by this file. Its job
is to sequence the fixes the playtest has asked for since 0.1.1 (13 October
2026), and to cut 0.1.2 once they land. Every item comes from a player or
from the owner's reading of one, filed in
[`docs/reviews/playtest-1/findings.md`](../reviews/playtest-1/findings.md).*

**Status: In progress (14 October 2026; G–M added and decisions settled 16
October). Landed: A, C, D.**

---

## 0. Why this plan exists

Plan 103 taught the opening four more steps: develop the next course, read
the needs, site a residence hall and a dining hall. It shipped in 0.1.1.
Three players since then, or just before, found the start hard to read:

- **R2** lost the thread when the walkthrough ended.
- **T1**, a Twitch streamer the owner watched for an hour, skimmed the
  walkthrough, didn't notice when the clock stopped for a decision, and
  found the step from placing a program to developing its courses the most
  confusing part. He was still hooked, and kept playing after the owner
  left.
- **R9**, a composer who played with their partner, loved the detail but
  found it "a little hard to figure things out (maybe there was a tutorial
  I skipped accidentally)".
- **R10–R11**, on r/WebGames: the clock held at the start is "a good
  call", but "all the stats and menus are competing" with the walkthrough.

- **F2**, on the feedback form after 1–2 hours: past the walkthrough,
  athletics, research and the faculty's grades and ranks were never
  explained; asked for the systems to be introduced gradually.
- **S1**, a playtesting service's session (16 October; 9/10, "one of a
  kind"): couldn't place buildings and never learned why, read a need's
  "12" as a time of day, couldn't tell what pulled satisfaction down in
  year two, wondered why Mathematics showed a C with a good professor,
  and spent much of the session on searches that returned only C, D and
  F candidates.

T1 and R9 may have played 0.1.0, before Plan 103; the version their runs
were on is not known. What follows is what Plan 103 doesn't cover.

**Decided by the owner, so not in this plan:**
- **Admissions set to 1% three years running put T1 in debt.** No warning
  is added: a strategy game should punish a careless decision, and T1
  found the cause, climbed back above zero and made progress (14 October).
- **Phones are not supported** (9 October). Nothing here is for them.
- **The early stops on itch.io** are read as mostly browsing (13
  October). The opening events (D) are there to tell browsing from a stuck
  step, not because the number is alarming.

## 1. What stands today

Read against `main` at `9ec5b8c` (0.1.1).

- **The hall can't develop a course.** A program tile in a hall
  (`components/BuildingInfoPanel.tsx`, `ProgramTile`) opens a summary
  with a text line, "Next: ENGL110 … · $900k · 12 wk", and one door,
  **Open in Curriculum →**. The comment above the file says so on purpose:
  "It does not develop courses: the Curriculum tab is where a program is
  filled in."
- **The Curriculum already has the one-click start.** `RowAction` in
  `tabs/CurriculumTab.tsx` proposes the next available course and the
  strongest eligible teacher, with the projected grade and the cost, and
  dispatches `START_DEVELOPMENT`. It already handles the refusals: money
  short, committee full, no one in the field (with *Appoint…* when a
  candidate is listed). It has a `compact` form, the program's one line,
  without *Choose…* and the batch.
- **A matter pauses the clock, quietly.** With Settings' *Pause when a
  matter arrives* on (the default, Plan 78E, `systems/inbox/unseen.ts`),
  a new matter pauses the clock and its slip in `Toasts.tsx` is held until
  the matter is opened. The pause itself shows only as the speed control's
  paused state. T1 saw neither: he thought the game had stopped by itself
  and didn't know something was waiting for him.
- **Skipping the walkthrough is one click from the start.** The welcome
  card (`components/OpeningCoach.tsx`) puts **Skip the walkthrough and the
  letters** directly beside the button that begins it. Every later card
  has **Skip the rest of the walkthrough** (letters kept). Neither asks
  again.
- **Nothing records the opening.** `analytics/events.ts` has no event for
  a walkthrough step or a skip. PostHog can tell how far a run got in
  years, but not where in the first five minutes a player left, or whether
  they skipped.

## 2. The PRs

### A — Develop the next course from the hall

The owner's suggestion (14 October): the shortcut belongs in the hall
itself, where the program was placed.

- **Export `RowAction`** from `CurriculumTab.tsx` (or move it to a shared
  file beside `GradeChip`), and render its `compact` form in
  `ProgramTile`'s summary in place of the "Next:" line.
- **The tile already computes what it needs:** the faculty loads
  (`facultyLoads`) and `programProgress`. The lookup map is built the same
  way the Curriculum builds it.
- **`onSelect`** (used by *Appoint…* / *Open…* when no one can teach)
  opens the Curriculum on that course, through the existing
  `onOpenCurriculum`.
- **Open in Curriculum →** stays underneath, for choosing a different
  teacher or the batch.
- **In transit, waiting on prerequisites, or every course in hand:**
  `RowAction` already says so in words; nothing new.
- **The file's header comment** is rewritten to say the hall now offers
  the next start (the plans' rule on words that state a rule, Plan 95E).
- **Tests:** a hall-panel test that the button appears for a program with
  an available course and a free teacher, dispatches the same
  `START_DEVELOPMENT` as the Curriculum row, and is disabled with the
  Curriculum's reasons.

**As implemented.**

- **The Curriculum gained a `course:` target.** `onOpenCurriculum` only
  knew programs, schools, filters and the committee, so *Appoint…* and
  *Open…* open the tab with `course:<id>`, which selects the course (its
  drawer opens) and scrolls to its cell, or to its program's row when the
  row is folded and the cell isn't drawn.
- **`RowAction` takes `showWorth`.** The hall passes `false`: the
  summary's *Stage* already states the milestone, and the row's "4 to
  Established · +80 places" beside it said it twice.
- **The ring comes with it.** On the walkthrough's step four the
  Curriculum's button is ringed (`opening-target`); being the same
  component, the hall's is too, so "the ringed button" in the card is true
  in either place. Pressing it ends the step as the Curriculum's does
  (checked in the browser).
- **Tests:** `test/hall-develop.test.ts` calls the tile and the row as
  functions (neither uses a hook) to press their buttons without a DOM.

### B — A clock that says why it stopped

*Held out of 0.1.2 (decision 4): it goes in when a second player misses a
paused clock.*

- **While the clock is paused for a matter** (the `arrival` and
  `final-week` reasons in `unseen.ts`), a band beside the speed control
  reads **"Paused · a decision is waiting"** with an **Open** button that
  opens the inbox on that matter. With more than one: "Paused · 3
  decisions are waiting".
- **The Inbox tab's button pulses** in the school colour while a matter
  waits unopened (off under *Reduce motion*, where it is a steady dot).
- **The band goes** when the matter is opened, when it leaves the inbox,
  or when the player presses play.
- **A pause the player chose** (the speed control, the space bar) shows no
  band: only the shell's own pauses are explained.
- **The pause rule itself doesn't change.** This is what the player sees,
  not when the clock stops.
- **Tests:** `unseen.test.ts` gains the band's text for one and several
  matters; a shell test that a player's own pause shows no band.

### C — A skip that's hard to hit by accident

- **The welcome card's skip** moves below the card's actions, as a plain
  text link, and asks once: **"Skip the walkthrough? It doesn't come back
  this run."** with *Skip* and *Keep the walkthrough*. The house's
  arm-then-act confirmation (Plan 47, `ConfirmButton`) is the pattern.
- **The later cards' "Skip the rest"** gets the same confirmation.
- **Copy:** the welcome card says in one line that the walkthrough is
  about five minutes, so a player knows what they're skipping.
- **Tests:** `opening.test.ts`: one click no longer skips; the
  confirmation does, from the welcome and from each later card.

**As implemented.**

- **`ConfirmButton` gained a question form** (`cancelLabel`): armed, the
  warning reads first as the question, over the armed button (*Skip*) and
  a second one, *Keep the walkthrough*, that disarms it. Without
  `cancelLabel` it is unchanged. The button keeps its place in the DOM
  when armed (the question is moved up by CSS `order`), so arming from the
  keyboard keeps focus, and Tab between the two buttons doesn't disarm.
- **The words live in `openingData.ts`** (`SKIP_WORDS`,
  `WALKTHROUGH_LENGTH`), with the rest of the walk's copy. The length line
  sits above the welcome's Next.
- **The later cards keep their quiet pill** for the skip; only the
  welcome's became a text link, as the plan says.
- **Tests:** the coach is rendered inside a probe component that keeps the
  tree it returns, so every button's handler is pressed once: none skips,
  and the one confirmation on each of the eight cards does. Checked in the
  browser: a click, Enter from the keyboard, Tab to *Keep*, and Escape.

### D — The opening, measured

- **`opening_step`**, fired each time the stage moves on
  (`state/opening.ts`'s `settleOpening` and `ADVANCE_OPENING`), with
  `stage`: the stage reached (`site-hall`, `appoint`, `found`,
  `await-course`, `second-course`, `needs`, `site-housing`,
  `site-dining`, `play`).
- **`opening_skipped`**, with `stage` (where the player was) and
  `letters` (whether the board's letters were kept).
- **Both** carry the common fields (version, played minutes, run id), are
  added to `events.ts` and to `docs/architecture/analytics.md`'s table,
  and are checked by `test/analytics.test.ts` like every other event.
- **What it answers:** players who leave at scattered stages are browsing;
  players who pile up at one stage are stuck there; players who skip and
  then stop early tell whether the skip (C) mattered.

**As implemented.**

- **`opening_step` is read off the state, `opening_skipped` is sent by the
  confirmation.** `stateEvents` sends a step whenever the stage changes
  (so it covers `settleOpening` and `ADVANCE_OPENING` without touching
  either). A skip can't be read that way: from the needs cards, a skip
  with the letters kept and a walk finished by the same action leave the
  same state. So C's confirmation calls `analytics.ts`'s
  `openingSkipped(stage, letters)` just before it acts, and that marks the
  next stage change as the skip's, so the `play` it lands on isn't sent as
  a step. `play` as a step means the walkthrough was finished.
- **`opening_skipped`'s `stage` lists `welcome` too**, the one card that
  isn't a stage reached. Both lists are built from a `Record<OpeningStage,
  true>`, so a stage added to the walk fails to compile until it is
  listed, as the tabs do.
- **Tests:** `analytics.test.ts` walks a guided founding through the
  reducer, observed as `useGame` does: finished (every stage, `play`
  last), skipped on a later card (the steps before it, the skip with the
  letters kept, no `play`), skipped on the welcome, and a later run's
  first step still sent.

### F — A quieter screen for the first three steps

From r/WebGames (R10–R11, 14 October): "the next action is clear in the
walkthrough, but all the stats and menus are competing with it … keep the
opening focused on just the hall > professor > first course, with the
other tabs dimmed until those are done."

- **Today** the walkthrough holds the clock (`openingHoldsClock`) but the
  toolbar stays live: `App.tsx` passes the Toolbar `held={holding}`, which
  is set only by a board letter (`pendingInterrupt`), not by the walk.
- **The change:** while the stage is `site-hall`, `appoint` or `found`,
  every toolbar tab but the one the step needs is dimmed and disabled (the
  same `disabled` look the toolbar already has for a letter). The top
  bar's figures (cash, prestige, enrollment, satisfaction) are dimmed too,
  still readable. The step's own door (the build menu, Founders Hall) is
  untouched.
- **From `await-course` on**, everything is live again, as now: Plan
  103's later steps send the player into the Curriculum, Students and the
  build menu on purpose.
- **Skipping the walkthrough** lifts the dimming at once.
- **Tests:** a shell test that the tabs are disabled at `site-hall` and
  live at `await-course` and after a skip.

### G — Teaching as a number, not a letter

The owner's decision (16 October): **the hiring mechanics stay; the
presentation changes.** A young college can't hire the country's best
teachers, so the early market is weak by design and the faculty improve
over fifty years. Shown as letters, that reads as failure: a search of
C, D and F candidates looks broken (S1), and a good professor's course
reads C (S1, F2). Shown as numbers, a 50 among 40s is plainly a good
hire, even though the same 50 would be the weakest professor on a late
campus.

- **Teaching and research show as numbers out of 100** wherever a
  professor or candidate is shown: the faculty tiles, the search results
  (`FacultyTab.tsx`'s listing chips), the appointment cards, the
  instructor picker, the career lines and the training notes ("trained,
  teaching 58 → 64"). Growth shows as now and where it's heading:
  **"58 → 80"**.
- **Course and program quality show as the same number** the professor
  makes them, with any difference said: Iyer **63**; an upper-level
  course **61**, "−2, upper-level". With the load penalty gone (J), that
  is the only gap left on most courses, so a professor and their courses
  can never seem to disagree. The course drawer's factor list stays as the full account.
- **Measured against the college, not the country.** Beside a
  candidate's teaching, the college's own median: "**52** · your faculty's
  median is 44". That is what makes a 50 read as good in year 3 and weak
  in year 40, without the player knowing the market's shape. Whether the
  number is coloured by that comparison or left plain is decision 6.
- **The bands stay underneath.** Grade points still feed prestige's
  teaching ceiling and academic satisfaction (`courseQuality.ts`), and
  training still moves a professor one band up (`oneGradeUp`). Only the
  words and chips change; balance doesn't move. *Staff for the A*, the
  seats' staffing policy, is renamed in words that don't name a letter
  ("Staff the weakest courses first").
- **`GradeChip`** becomes a number chip with the same colour steps, so
  every screen changes in one place; `letterOf` in `facultySort.ts` and
  the Faculty tab's help line ("teaching and research as letters") are
  rewritten (Plan 95E).
- **Tests:** every faculty and course surface shows a number and no
  letter; a candidate's tile shows the faculty's median; the sim baseline
  is unchanged.

### H — Every refused placement says why

- **Today** the map says why only for ground ("not enough clear ground"),
  road access and walling off a building (`state/reach.ts`'s
  `siteRefusal`). Not enough money, a board freeze, or a building not
  yet available turn the ghost red with no words, though the map's own
  hint promises "the ghost says why". S1 hit it three times: more housing
  in year two, beside Elm Hall, and benches in the park.
- **The change:** the pointer's red note names every refusal: "Costs
  $2.1M · you have $1.4M", "The board has frozen construction", and the
  building's own reason when it isn't available yet.
- **The ghost and the click agree.** The ghost checks cash only
  (`canStartDevelopment` with its default financing) while the click
  (`placeById`) also tries a gift, a loan and the endowment, so a spot can
  show red and still take the building. The ghost uses the click's
  `financingFor`, and says how it would be paid when it isn't cash ("on a
  loan").
- **Tests:** a placement test for each refusal's words, and that the
  ghost is green wherever a click would place.

### I — Needs out of 100, and what pulls satisfaction down

- **A need's score shows "/100".** Today the Students tab's dial holds a
  bare number in a round, ticked face, beside a bed count, and S1 read
  "12" as a time of day; the walkthrough's needs step says "Housing is at
  12" the same way. The dial gains "/100" and the walkthrough's line says
  "12 out of 100".
- **One line names the drag.** When satisfaction is falling, the Students
  tab and the header's hover say which need pulls it down most and why,
  in words: "Housing is the drag: 320 beds for 480 students." The causes
  are already computed (`satisfactionSystem.ts`); the target stays
  hidden (Plan 98B), only the largest pull is named.
- **Tests:** the line names the lowest weighted need, and says nothing
  while satisfaction is steady or rising.

### J — No teaching overload

The owner's decision (16 October, from S1's video): S1 appointed Dr. Iyer
as a B, and her courses sank to C as she took on more, which read as the
game contradicting itself.

- **The load penalty goes** (`courseQuality.ts`'s `loadPenalty`, up to −7
  at a full load). A professor teaches every course in their slots at
  their own teaching, less the tier penalty only.
- **The slots stay.** A professor still holds a fixed number of courses
  (`courseSlots`: four to six for a hire, two or three for a founder), so "teach more or hire better" is still a choice: a
  full department still needs a hire to grow, it just doesn't grade
  worse for being full.
- **This PR moves balance**, unlike the rest of the plan: courses grade
  higher, so prestige's teaching ceiling and academic satisfaction rise.
  It runs `npm run sim` before and after, records the change, and
  rebases `sim/baseline.json`; if academic satisfaction or prestige rise
  past their bands, the grade bands or the tier penalties take up the
  slack, not the load.
- **Words:** the course drawer's "Teaching load (2 of 2) −7" factor goes,
  and `courseQuality.ts`'s comment on why 7 is rewritten (Plan 95E).
- **Tests:** a course's quality no longer depends on its instructor's
  load; the save fixtures still load.

### K — A name on the pennant never splits a word

S1 named the college "Baltimoore", and the map's pennant broke it as
"Baltimoor / e College".

- **The cause:** `Pennant.tsx` picks the type size by the whole name's
  length (12, 24 or 40 characters), and the CSS lets a word break
  (`overflow-wrap: break-word`). "Baltimoore College" is 18 characters,
  so it gets the second size, at which the ten-letter word is wider than
  the banner's 126 px.
- **The fix:** the size is the smaller of the one the whole name asks for
  and the one its longest word asks for, so the longest word always fits
  on a line; a word breaks only past the smallest size (a single word
  longer than the banner can hold).
- **Tests:** a pennant test over a list of names (short, long, one long
  word, "Baltimoore College") that the chosen size fits the longest word.

### L — A welcome that welcomes, and the opening in the order it's played

From S1 (16 October): the board's first letter took two reads. It ends
"All three are yours to fix, in that order … the hall, then its first
professor, then its first program", which tells a player to remember
three tasks and an order, and the order isn't the one the walkthrough
then plays.

- **The welcome introduces the college,** and asks for one thing: "The
  {name} board wishes you well. Three hundred and fifty students have
  enrolled, and the college is yours to build. It begins with one
  building, Founders Hall, where the first classes will meet." No list,
  no order to remember.
- **Each later step introduces the next thing when it arrives:** a
  program, which needs a professor to teach it, then its courses.
- **The appointment reads as choosing a program** (decision 8): the
  three founding candidates are shown as three programs, each with the
  professor who would teach it ("English, with Dr. Grace Bennett"),
  so the order the player meets is program, then professor, then course.
  S1 found the three candidates "all look the same" and chose by
  subject; this puts the subject first.
- **Tests:** `opening.test.ts` holds the welcome's new words and that no
  card names a step it doesn't lead to.

### M — The Students tab after the first summer, and needs that can read full

From S1 (16 October): the walkthrough's "Somewhere to sleep, somewhere
to eat" opens the Students tab in week one, where every need reads low
because nothing is built yet, and health's dormant dial ("–", "Not yet a
need") reads as one more failure.

- **The Students tab opens at the first commencement.** The ladder's
  `commencement` milestone (the first summer closes) already opens
  Students' guidebook, clubs and funnel; it opens the tab itself. Plans
  78B and 78C opened it from the first week on purpose; their words are
  rewritten (Plan 95E). **The header's satisfaction figure waits with it**
  (decision 9): in year one the top bar shows no satisfaction, and the
  first summer's review introduces it as the year's average, the moment
  the header figure and the tab appear.
- **The walkthrough builds the needs instead of showing them.** The
  `needs` step stops opening the Students tab: it says in a line that
  students need somewhere to sleep and somewhere to eat, and goes
  straight to siting one residence hall and one dining hall (Plan 103's
  `site-housing` and `site-dining`). A college that builds those and the
  library should see good marks when the tab opens.
- **Health doesn't show until it's read.** Below its population gate
  health scores full and isn't counted against the college; its card is
  hidden until the gate is crossed, then appears with a line saying it
  is now a need. A college meeting every need it has reads full marks.
- **Tests:** the tab and the header's satisfaction figure are gated
  until the first summer closes and open after it; the walkthrough never opens a gated tab; health's card is
  absent below the gate.

### E — 0.1.2

- `package.json` to 0.1.2, the Release workflow, the itch.io upload, a
  short devlog, and the playtest README's patch table.

## 3. Decisions, settled by the owner (16 October)

| # | Question | Decided |
|---|---|---|
| 1 | Where does the hall's Develop button sit? | **In the program's summary** (click the tile), above *Open in Curriculum*. On the tile itself it would make a full hall of six programs busy. |
| 2 | The band's place | **Beside the speed control**, where the eye goes when the clock stops. |
| 3 | Does the welcome card keep a skip at all? | **Yes, behind the confirmation.** A returning player on a second run wants it. |
| 4 | Is B worth doing before more players say it? | **Not yet: wait for a second player.** B stays written here but is out of 0.1.2; it goes in when another player misses a paused clock. |
| 5 | How far does F dim? | **Tabs disabled, top-bar figures dimmed but readable**, for the first three steps only. |
| 6 | Is a candidate's number coloured against the college's median? | **Yes, lightly:** above the median warm, below it plain. Colour by the absolute bands would bring back the letters' verdict. |
| 7 | Do course and program quality become numbers too, or keep letters? | **Numbers everywhere,** so a professor and their courses never seem to disagree. |
| 8 | Does the appointment step become "choose a program", or only its words? | **Only its words**, in L: the three candidates shown as programs with their professors. No new step. |
| 9 | With the Students tab closed, does the header still show satisfaction in year one? | **No: hidden until the first summer,** with the Students tab. The first summer's review is where satisfaction first appears, as the year's average, and the header and tab open with it. |

## Rules for every PR in this plan

- **Balance never moves,** except in J, which removes the load penalty
  on purpose and rebases `sim/baseline.json`. Every other PR leaves
  `npm run sim` reading the same as the baseline.
- **Old saves are untouched.** No save version change.
- **Each PR runs `npm run check` and `npm run test:slow`,** and is checked
  in the browser at 1440 wide.

## The map

| PR | Subject | Depends on |
|---|---|---|
| A | Develop the next course from the hall | — |
| B | A clock that says why it stopped | — (held: decision 4) |
| C | A skip that's hard to hit by accident | — |
| D | The opening, measured | — (C's confirmation fires D's `opening_skipped` once both are in) |
| F | A quieter screen for the first three steps | — |
| G | Teaching as a number, not a letter | — |
| H | Every refused placement says why | — |
| I | Needs out of 100, and what pulls satisfaction down | — |
| J | No teaching overload | — (G's course numbers assume it) |
| K | A name on the pennant never splits a word | — |
| L | A welcome that welcomes, and the opening in the order it's played | — |
| M | The Students tab after the first summer, and needs that can read full | — (I's "/100" lands in the same tab) |
| E | 0.1.2 | A, C, D, F–M |
