# Plan 104 — Version 0.1.2

*Planning document only — no gameplay code is changed by this file. Its job
is to sequence the fixes the playtest has asked for since 0.1.1 (13 October
2026), and to cut 0.1.2 once they land. Every item comes from a player or
from the owner's reading of one, filed in
[`docs/reviews/playtest-1/findings.md`](../reviews/playtest-1/findings.md).*

**Status: Proposed (14 October 2026).**

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

### B — A clock that says why it stopped

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

### E — 0.1.2

- `package.json` to 0.1.2, the Release workflow, the itch.io upload, a
  short devlog, and the playtest README's patch table.

## 3. Decisions for the owner

| # | Question | Proposed |
|---|---|---|
| 1 | Where does the hall's Develop button sit? | **In the program's summary** (click the tile), above *Open in Curriculum*. On the tile itself it is faster but makes a full hall of six programs busy. |
| 2 | The band's place | **Beside the speed control**, where the eye goes when the clock stops. The alternative is a strip across the top of the map. |
| 3 | Does the welcome card keep a skip at all? | **Yes, behind the confirmation.** A returning player on a second run wants it. |
| 4 | Is B worth doing before more players say it? | **Yes.** It is one player (T1), but it isn't a decision being punished: a player who doesn't know a decision is waiting can't make it, however carefully they play. |
| 5 | How far does F dim? | **Tabs disabled, top-bar figures dimmed but readable**, for the first three steps only. Hiding the figures entirely would make the first summer's numbers arrive from nowhere. |

## Rules for every PR in this plan

- **Balance never moves.** Nothing here touches the simulation;
  `npm run sim` reads the same as `sim/baseline.json` after each PR.
- **Old saves are untouched.** No save version change.
- **Each PR runs `npm run check` and `npm run test:slow`,** and is checked
  in the browser at 1440 wide.

## The map

| PR | Subject | Depends on |
|---|---|---|
| A | Develop the next course from the hall | — |
| B | A clock that says why it stopped | — |
| C | A skip that's hard to hit by accident | — |
| D | The opening, measured | — (C's confirmation fires D's `opening_skipped` once both are in) |
| F | A quieter screen for the first three steps | — |
| E | 0.1.2 | A–D, F |
