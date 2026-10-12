# Plan 098 — Version 0.1.1

*Planning document only — no gameplay code is changed by this file. Its job
is to sequence the small fixes the owner picked for 0.1.1 when they sorted
the backlog on 12 October 2026, and to cut the 0.1.1 release once this plan
and Plans 99–102 have landed.*

**Status: Proposed (12 October 2026).**

---

## 0. Why this plan exists

0.1.0 has been public on itch.io since 8 October (Plan 97). The owner sorted
every open backlog entry into *fix for 0.1.1*, *defer* or *discard*
(`BACKLOG.md`, `docs/backlog-archive.md`). Thirteen entries were picked. Four
are large enough for plans of their own (99 the gazebo and door signs, 100
the claimed halls, 101 the events, 102 the course catalog). This plan takes
the other nine, all small, and the release itself:

- **Targets against actuals.** The owner's answer: keep the target hidden
  and show the actual with a direction arrow.
- **No notice when a bonus style unlocks.**
- **Three Final Report tags** whose test doesn't read the standing they
  claim (commuter, country club, pressure cooker).
- **The share card's leftovers** from Plan 76H.
- **More than one save slot.** The owner asked "what key rebinding?";
  §1 answers it.
- **Three readings of the old stocks** that Plan 85 left.
- **Three harness players** that can't measure what they're for.

What stands today, read against `main` at `9cec56b` plus PR #341:

- **Targets are shown in eight places** a player sees:
  - `tabs/StandingBreakdown.tsx`: `StandingFigure` "current → target" (:125–132, used in the Standing head and in History › Prestige, `HistoryTab.tsx:69`); `summerNote` "This year is grading {target}" (:139); "Sitting at its target" / "Drifting up/down toward {target}, by X a week" (:174–178); "holding the target down" (:189).
  - `tabs/StudentLifeTab.tsx:270–273`: *Satisfaction target* beside *Satisfaction today*. Also :193 ("% of the satisfaction target") and the HelpHints at :83 and :265.
  - `components/InterruptModal.tsx`:
    - the milestone letter's "Prestige target (what this changed) X → Y" (:845–855);
    - the admissions preview's projected satisfaction target (:430–437);
    - the crowding line "prestige target −N" (:1316).
  - `data/figureHints.ts:44–48, 57`, and History's help text (`HistoryTab.tsx:73`).

  No test asserts these strings. The toolbar shows actuals only.
- **`recordUnlocks`** (`state/unlocks.ts:75`) returns what was newly earned.
  Both callers ignore it: `writeSave` (`persistence.ts:671`, every save)
  and `hangInHall` (`hall.ts:74`, the end of a run). The only place an
  unlock shows is the startup screen's locked buttons
  (`StartupScreen.tsx:295–359`).
- **The tags** (`systems/identity/tags.ts:78–80`). `finalReport.ts:169,
  184` uses `TAG_AXIS` (`reportData.ts:54`) to pick the title phrase and to
  exclude that axis from the weakness, so a tag that claims one axis while
  reading another can hide a real weakness:

  | Tag | Its test reads | It claims (`TAG_AXIS`) |
  |---|---|---|
  | commuter | beds under 35% of enrolled | access (admit rate and price) |
  | country club | price ratio and campus beauty | experience |
  | pressure cooker | low admit rate, low satisfaction, many high achievers | academics |
- **The share card** (`state/reportCard.ts:11–22`) uses system fonts.
  Plan 76H (`076-ui-and-text.md:840–847`) skipped three things:
  - F2, embedding the woff2 fonts in the SVG;
  - I3, glyphs of its own for fell, lamps and benches (Unicode today in `BuildPopup.tsx:375`);
  - I5, one set of rank arrows. Today it's ▲▼ in `RankingsTable.tsx:90` and `InterruptModal.tsx:199, 687`, but ↑↓ in `AthleticsTab.tsx:367–368`.
- **One save slot**: `localStorage['unischool.save']`
  (`persistence.ts:58`), with *set aside* (`:803`), export (`:1555`) and
  import.
- **The old stocks.** Plan 85I's decision 2 ranked research and student
  life on their pillars and left three slow readings alone, because "moving
  those would change play, not a table":
  - `marketStandingOf` (`data/facultyData.ts:595`) reads `researchStanding`;
  - `collegePull` (`data/studentLifeData.ts:755`) reads `socialStanding`;
  - the research-powerhouse tag (`tags.ts:59–60, 70`) reads `researchStanding`, and `reputation` as academics.

  The pillars are `pillarValue(s, …)` (`prestigeSystem.ts:608`).
- **The harness.**
  - The `SELECTIVE` policy (`sim/harness/archetypes.ts:161–181`) never calls `tendTeaching` (`moves.ts:250`).
  - The `championships` goal player (`tools/review/goalPlayers.ts:954`) peaks at 41st and never reaches the top-20 specialization milestone (Plan 85G, `085-specializations.md:1624–1645`).
  - The next-step line's `idleLab` (`systems/guidance/nextStep.ts:310–324`) says "X is idle — commission research" whenever a lab is idle, whether or not any project can start. The guided harness (`sim/harness/guided.ts:224–233`) then fails about two weeks in three.

## 1. The owner's question: what key rebinding?

The game has keyboard shortcuts, all hard-coded in `components/hotkeys.ts`
and its callers:

| Keys | Do |
|---|---|
| Space · 1–4 · 5 (sandbox) | pause · set the speed · sandbox speed |
| M | mute |
| C · F · L · I | open Curriculum · Faculty · Students · Inbox |
| W A S D or the arrows | pan the map |
| Q · E | turn the view |
| Z · X | tilt |
| Home | reset the camera |
| R · P | rotate a building being placed · the path tool |
| Escape | back out one layer |

*Key rebinding* in Plan 70's "does not do" meant letting the player change
these. **Proposed:** don't build rebinding. Instead, list the shortcuts in
Settings, which nothing does today (PR F). It's the owner's call (decision 1).

## 2. Decisions for the owner

Each has a proposed answer. The PR follows it unless the owner says
otherwise.

| # | Question | Proposed |
|---|---|---|
| 1 | Key rebinding, or a list of the shortcuts? | A list in Settings; no rebinding. |
| 2 | How many save slots? | Three named slots, plus the autosave. *Set aside* becomes "save to a slot". |
| 3 | What does the direction arrow mean? | The direction the figure is moving this week: ▲ rising, ▼ falling, nothing when it holds. A larger arrow for a fast move (more than a point a week for prestige, more than 1% for satisfaction). |
| 4 | Where does a bonus-style unlock show? | A letter in the inbox the week it is earned, and a toast. The startup screen marks the style *New* until it is first picked. |
| 5 | The three tags: change the test or the claim? | The claim, where the test is the truer reading: commuter claims **experience**, and country club claims **access** (price). Pressure cooker keeps **academics** and its test is changed to read the academics pillar. |

## Rules for every PR in this plan

- **Balance moves only in E.** Every other PR leaves `npm run sim` and
  `sim/baseline.json` unchanged. E re-baselines and records the before and
  after.
- **A state-shape change ships a migration** (Plan 70B). Save slots (D) add
  storage keys, not `GameState` fields, so they need no `SAVE_VERSION`
  bump. A slot holds a save file exactly as export writes it.
- **A plan that changes a rule rewrites the rule's words** (Plan 95E). B
  greps `src/` for "target" and "drift" in player text.
- **Each PR runs `npm run check` and `npm run test:slow`.**

## The map

| PR | Subject | Depends on | Balance |
|---|---|---|---|
| A | This plan | — | no |
| B | Actuals with an arrow | — | no |
| C | A notice when a style unlocks | — | no |
| D | Save slots | — | no |
| E | The old stocks read the pillars | — | **yes** |
| F | The report tags, the share card and the shortcut list | E (the powerhouse tag) | no |
| G | The harness's three players | E | no (harness only) |
| H | 0.1.1 | this plan's PRs, and Plans 99–102 | — |

Each PR has its own branch (`plan-98x-subject`).

### PR 98B — Actuals with an arrow

- **One component**, `TrendFigure` (`components/TrendFigure.tsx`): a value
  and its arrow, from the figure's weekly change (decision 3). The arrow
  has an `aria-label` ("rising", "falling") and a tooltip in words ("Up
  0.4 this week").
- **The prestige head** (Standing and History › Prestige): `StandingFigure`
  shows today's prestige with its arrow. The target number goes.
  - "Drifting up toward 78.2, by 0.3 a week" becomes "Rising about 0.3 a week".
  - "Sitting at its target" becomes "Holding steady".
  - The summer note keeps the grade the year is taking, in words ("this year's grade is lifting it"), not the target number.
- **Pillars** keep "N of max → worth M points". Since 85I that value is the
  pillar itself, not a drift target.
- **Student Life:** *Satisfaction target* and *Satisfaction today* become
  one *Satisfaction* figure with its arrow. The card title "% of the
  satisfaction target" becomes "% of satisfaction".
- **The milestone letter:** "Prestige target (what this changed) X → Y"
  becomes the change it makes, signed ("+1.2 to where prestige is
  heading"). *Prestige today* stays.
- **The admissions preview:** the projected satisfaction is shown as a
  change with an arrow ("▲ 3 points next year"), not a target.
- **The crowding line:** "prestige target −N" becomes "holds prestige back
  by N".
- **The rule's words.** `figureHints.ts:44–48, 57` and the HelpHints say
  prestige and satisfaction move a little each week toward where the
  college's choices point, without naming a target. The DebugPanel keeps
  the target.
- **Checks:** a test for `TrendFigure`'s three states, and a grep that no
  player-facing string under `src/` (outside `DebugPanel`) contains
  "target" for these two figures.

**As implemented.**

- **`TrendFigure.tsx`:** `trendOf`, `trendWords`, `TrendArrow` and
  `TrendFigure`.
- **The weekly change** is the tick's own step, so the arrow and the next
  week agree: `prestigeWeeklyChange` (`prestigeSystem.ts`, the tremor
  rate), `satisfactionWeeklyChange` (`satisfactionSystem.ts`) and
  `weeklyChange(breakdown)` for a standing.
- **The arrow is on the dock's prestige and satisfaction chips too.** They
  are the figures a player reads most, and the owner's answer was to show
  the actual with an arrow.
- **Prestige's floor is 0.005 a week, not 0.05.** Between summers prestige
  only trembles toward the year's grade, a few hundredths a week, and at
  0.05 its arrow almost never showed.
- **Wording:**
  - the research letter's "(feeds the prestige target)" became "(adds to prestige)";
  - the championship letter's "to the target" became "to where it is heading";
  - a held ceiling reads "It is holding this standing back now".
- **Kept:** the Institutional Research office's rank forecast, an earned
  reading of the year's grade, not the target shown by default.
- **Docs rewritten:** `design/progression.md`, `design/admissions.md` and
  `architecture/playtesting.md`.
- **Checks:**
  - `test/actuals-arrow.test.ts`: the three states, the words, and a sweep of `src/` (outside the DebugPanel) for player strings that name either target;
  - `plan96-fixes`' crowding line updated;
  - `npm run check` and `test:slow` pass, and `sim/baseline.json` is unchanged.

### PR 98C — A notice when a style unlocks

- **The earned list is returned.** `writeSave` and `hangInHall` pass
  `recordUnlocks`' list to the game.
  - **During a run:** each newly earned style files a letter (`fileNews`, type `unlock`, a short card: the style, its condition, "Pick it when you found your next college") and its toast.
  - **At the end of a run** (`hangInHall`): the Final Report's closing page names it ("New for your next college: Gothic").
- **The startup screen** marks a style *New* until it is first chosen
  (`unischool.unlocks` gains a `seen` list; an old value without it reads
  as all seen).
- Sandbox runs still earn nothing.
- **Checks:** tests for the letter, the report line and the *New* mark.

**As implemented.**

- **The check runs after each week, not at the save.** The autosave is
  yearly, so a set earned in the spring would have waited until the next
  year to be said. `useGame.ts` calls `bankUnlocks` whenever the week
  changes, in the tab that holds the save, and dispatches `UNLOCK_EARNED`
  with whatever was newly banked.
- **The sim never reads the browser's storage.** The reducer files the
  letter (`NewsLetter` type `unlock`) and the run's
  `events.unlocksEarned`. Headless runs never dispatch the action, so the
  sim baseline is untouched. No migration: both are optional.
- **The letter:**
  - from "For your next college";
  - subject "Tudor architecture, unlocked";
  - its reading pane gives the set's blurb, what earned it, and where to pick it.

  Its toast comes from the inbox's arrival rule, like every letter's.
- **The Final Report** says "New for your next college: Tudor architecture"
  above the share buttons.
- **The founding screen's *New*** reads a separate key,
  `unischool.unlocks.seen`, so `unischool.unlocks` keeps its format. A
  browser with no seen list marks nothing, so sets unlocked before this
  PR aren't flagged. The first set banked after it starts the list.
  Founding a college in a set marks it seen.
- **Each set's label** now lives on its `Unlock` (`unlocks.ts`), so state
  and inbox code name it without importing the founding screen.
- **Checks:** `test/unlock-notice.test.ts` covers:
  - one letter, filed once, kept for the report;
  - a sandbox told nothing and banking nothing;
  - banking only the newly earned;
  - *New* until founded, and never for a set unlocked before.

### PR 98D — Save slots

- **Three named slots** (decision 2): `unischool.slots`, an index of
  `{id, collegeName, year, savedAt, version}`. Each slot is stored as
  `unischool.slot.<id>`, in the export format, so a slot is readable by
  import and by every later build.
- **The main menu:**
  - *Save to a slot…* chooses a slot, overwriting one asks first;
  - *Load…* lists the slots and the autosave, newest first, each with its college, year and date;
  - *Delete* asks first.
- **The autosave** stays `unischool.save`, unchanged.
- *Set aside* (`:803`) becomes *Save to a slot*. An existing set-aside save
  is moved into slot 1 on first load.
- **Storage limits.** A late save is large, and three slots plus the
  autosave may not fit. A write that fails says so ("Not saved: this
  browser's storage is full. Delete a slot or download the save") and
  never touches the autosave. Size measured on a year-50 scenario save
  and recorded in the PR.
- **Checks:**
  - slot round-trips, including an old save version;
  - the set-aside move;
  - the storage-full path, with a stubbed `localStorage`;
  - the two-tab claim (`unischool.save.claim`) still guards the autosave.

**As implemented.**

- **Set aside stays as it is.** The plan read it as a feature to fold into
  the slots, but it isn't one: it is where a save this version cannot read
  is kept so the next save doesn't destroy it (`persistence.ts`). It is
  untouched, and there is nothing to move into slot 1.
- **Where the slots are:**
  - *Save slots…* in the game's menu opens three rows, each saved into, loaded and deleted. Every loss asks first.
  - The title screen offers the same rows, load only.
- **Loading a slot** adopts its run and reloads onto the title screen, the
  same as *Load a save file*.
- **Size measured:** a year-50 save (the README's laid-out campus) is about
  0.59 MB. The autosave and three full slots come to about 2.4 MB.
- **No `GameState` change and no migration:** slots are storage keys, and
  each holds the export format.
- **Docs:** `architecture/game-state.md`.
- **Checks:** `test/save-slots.test.ts` covers:
  - three empty slots to start;
  - a round trip;
  - an older version migrated on load;
  - a full browser refusing a new slot and an overwrite, keeping what the slot held and never touching the autosave;
  - a delete;
  - a slot missing its save, and a broken index, reading empty.

  The menu flow (save to a slot, arm and confirm a load) was checked in the
  running game.

### PR 98E — The old stocks read the pillars

- `marketStandingOf`: `research` reads `pillarValue(s, 'research')`.
  Prestige stays `reputation`, which is overall prestige, not a stock.
- `collegePull`: the standing term reads `pillarValue(s, 'studentLife')`.
  Its `PULL_STANDING_FROM` / `FULL` are re-fitted so a college at today's
  typical `socialStanding` pulls the same.
- The research-powerhouse tag reads the research and academics pillars.
- `researchStanding` and `socialStanding` stay in the save. If nothing else
  reads them after this PR, they stay as save fields and stop being
  computed. Whether to delete them is a note for the next migration, not
  this PR.
- **Balance:** `npm run sim` before and after, on the standard seeds and
  seeds 1–5, in the PR. The scorecard's targets must still pass. The
  baseline is re-recorded.

**As implemented.**

- **The stocks are set, not drifted.** `tickPrestige` sets
  `researchStanding` and `socialStanding` to their pillar targets each
  week, so every reader (`marketStandingOf`, `collegePull`, the debug
  panel) reads the pillar without a change of its own. The research-
  powerhouse and pressure-cooker tags read `pillarValue` directly. The data
  files can't import `prestigeSystem` (a cycle broke module start-up), which
  is why the readers stay on the fields.
- **The lag was not small.** Measured on `main` over six fifty-year runs
  (Natural and Guided, the standard seeds), the social stock sat about 30
  points under its target at year 5 and 5 to 15 under late; research trailed
  by 10 to 50 points through years 10 to 30.
- **The re-fit:**
  - **The faculty market's research scale** reads 26 to 160, where it read
    18 to 150. That's half-way to a least-squares fit of the old stock on
    the pillar (34 to 171). With no re-fit, research grants ran to 2.49×
    their funding (the guardrail is 1.70–2.30×). With the full fit, the
    Guided player never reached first place.
  - **`collegePull`** is unchanged. Its re-fit to the same fit (47 to 111)
    changed no target for the better.
- **Balance**, `npm run sim` on the standard seeds against `main`:
  - Year-50 ranks within 3 places, prestige within 3.1 points.
  - Year-50 cash moves a lot for the Guided players (Guided $690M to
    $2.0B). Seeds that stop spending in their 30s bank the rest, and more
    of them stop sooner. `main` does the same on other seeds (Guided, research,
    on 4242: $10.7B), so it's the harness hoarding sooner, not an economy
    change.
  - On seeds 1–5 (measured before the re-fit) the year-50 ranks move by at
    most 4 places.
- **The pacing scorecard** (`npm run natural -- --pacing`): 79 of 115
  targets met, where `main` meets 84. **The plan's bar, that the targets
  still pass, is not met.** The misses are mostly a step past a window
  `main` met at its edge:
  - the natural college's net reaching 90% of its growth in Y42, where the window is Y37–Y41;
  - the Guided player first in the top ten in Y36 (window Y37–Y45);
  - the Completionist's graduate courses all developed in Y44 (window Y36–Y42);
  - the natural college's Y40 enrollment at 94% of Y50's, rounding just under the target's ≥ 94%;
  - its enrollment growing 7% after Y40 (target ≤ 5%);
  - the teaching-blind guided player 8th at Y50, where the target is 11–25.
  
  One target `main` missed now passes: the Completionist's programs 90%
  founded by Y32. Merged on the owner's "merge and continue", with the
  shortfall flagged to them; the targets are theirs to move or hold.
- The baseline is re-recorded.

### PR 98F — The report tags, the share card and the shortcut list

- **The tags** (decision 5):
  - commuter's claim moves to **experience**, and country club's to **access**, in `TAG_AXIS` and the title phrases;
  - pressure cooker's test reads the academics pillar in place of the high-achievers cohort, keeping the admit-rate and satisfaction terms.

  A test runs each tag's indicator against `finalReport`'s choice of
  weakness, and checks that a tag never hides the axis it doesn't read.
- **The share card:**
  - **F2:** the two faces it uses (the display face and the sans) are subset to the card's glyphs and embedded as woff2 data URIs in the SVG's `<style>`, so the PNG renders the same on every machine. Size before and after in the PR.
  - **I3:** three small icons in `icons.tsx` (a felled stump, a lamp, a bench) replace the Unicode glyphs in `BuildPopup.tsx:375`.
  - **I5:** one set of rank arrows, ▲▼, in `RankingsTable`, `InterruptModal` and `AthleticsTab`, and the same arrow PR B uses.
- **The shortcut list** (decision 1): a *Keyboard* section in Settings,
  from one table that `hotkeys.ts` and its callers also read, so the list
  can't drift from the keys.

**As implemented.**

- **The tags.** `TAG_AXIS` moves commuter to experience and country club to
  access. Pressure cooker's third term is the academics pillar, at half
  weight from 60 and full at 100, where it was the high achievers' share.
  The title phrases already named what the tags claim, so they're unchanged.
- **The tag test** lists, for each tag, the standings its test in `tags.ts`
  reads. It checks that each tag claims one of them. It also checks that,
  with the claimed standing the weakest and an unread one weak too, the
  title names the unread one (`final-report.test.ts`).
- **The share card's fonts:**
  - The display face (Bricolage Grotesque, pinned at weight 800) and the
    sans (Archivo 400, 700 and 400 italic), subset to printable ASCII,
    Latin-1, and the dashes, quotes, bullet, ellipsis and arrow, in
    `src/assets/card-fonts/`. `tools/subsetCardFonts.sh` writes them.
  - **Size:** 48 KB for the four files, where the fontsource files they come
    from are 86 KB. The SVG goes from 4 KB to 69 KB. The PNG is about the
    same size (92 KB before, 95 KB after).
  - The fonts are fetched with the first card download rather than with the
    game, and inlined. The card falls back to the system's faces if the
    fetch fails.
  - The card's serif italic lines (the title, the chronicle) are now the
    sans italic, since the game has no serif.
  - The share-card test checks that the subset still holds every character
    in `reportData.ts`.
- **The icons:** `FellIcon`, `LampIcon` and `BenchIcon` in `icons.tsx`.
  The build menu's tool tiles had borrowed the eraser and pencil icons, not
  glyphs.
- **The arrows:** `RankingsTable` and `InterruptModal` already drew ▲▼.
  `AthleticsTab`'s neighbour tooltip moves from ↑↓ to them.
- **The shortcut list:**
  - `SHORTCUTS` in `hotkeys.ts` holds every key the game answers.
  - Every `useHotkeys` handler checks keys through `isKey(e, id)`; the tab
    letters and `CampusMap`'s pan keys are built from the table.
  - Settings' *Keyboard* section lists the table by place, one line per
    meaning.
  - `shortcuts.test.ts` fails if a key is bound twice, or if a
    `useHotkeys` handler compares `e.key` with a literal.
- **Balance:** `npm run sim` matches 98E's baseline on every row, so the
  pressure cooker's new test changed nothing the harness reaches.

### PR 98G — The harness's three players

- **Selective** calls `tendTeaching` on the Completionist's cadence. Its
  year-50 place before and after goes in the PR (61st in Plan 85I's
  table).
- **The championships goal player** reaches the top-20 milestone, so the
  athletics specialization can be measured. Try first: from year 15 it
  also funds academics through the same moves the Guided player uses,
  keeping athletics first. If it still misses the top 20, the review tool
  hands it the athletics specialization at the milestone's year (the
  85G experiment) and labels the row as forced. The PR records which.
- **The lab step** (`idleLab`) is shown only when a project can start: an
  unblocked offer the college can afford above the reserve. Otherwise the
  line moves on to the next step. The guided harness's step then passes,
  and the stall count before and after goes in the PR. This is a player-
  facing fix too: the line no longer asks for something the player can't do.

### PR 98H — 0.1.1

After this plan's B–G and Plans 99–102 have landed:

- `package.json` to `0.1.1`.
- The README:
  - its course count is corrected (it says 427; the catalog has 473 since Plan 95M);
  - and whatever Plans 99–102 changed is described.
- **A changelog** for the itch.io page, `docs/store/changelog.md`, with
  0.1.0 and 0.1.1, written for players.
- **The owner's pass:** a fresh run to year 10 on the web build, plus an old
  0.1.0 save opened and played a year. Findings are fixed in the PR or go
  to the backlog.
- **Tag `v0.1.1`.** The release workflow builds the web zip, and it's
  uploaded as `docs/store/itch-release.md` describes.
- `BACKLOG.md` and this plan's status are updated.
