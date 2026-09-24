# Plan 34 — Presentation

*Planning document only. Its job is to turn Phase M of the v2 merge
(presentation, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a
sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

This game already has most of what Phase M names:
- a ticker with a NEXT slot, and the catalogue's event panel (Plan 32);
- a hall of fame (Plan 33);
- charts over the years;
- itemised breakdowns.

What it lacks:
- a title screen, a settings panel and credits;
- any sound;
- a text-size or colour-vision setting;
- a hover explanation for its figures.

Its notifications are two systems where v2 has one: toasts over the ticker,
and notes over the map. The owner's decisions (v2's
`docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V1-35 | This game's startup screen (name, vernacular, colours, facade), with v2's title screen and main menu, and the hall of fame. No unlockable palettes. |
| V1-34 | This game's toasts and expandable log give way to v2's ticker strip, NEXT slot and event panel. |
| V1-36 | This game's hall panel stays; v2's build menu, which folds to a strip while a building is held and puts it down on Escape. |
| V2 #51 | History charts: rank by year, endowment and net, each class's size and satisfaction, the six standings over the run. |
| V2 #52 | Every number explains itself on hover; itemised breakdowns; settings for text size, colour-blind-safe colours and reduced motion. |
| V2 #57 | Audio synthesised from a data file: four state-driven themes with B sections, ambience scaled by enrolment, a stadium roar, effects, a listening bench. Levels tuned by ear. |

## Rules for this plan

- **Presentation only.** Nothing here touches the simulation. The harness
  and its bands do not move, and the slow suites confirm it.
- **Port v2's components where they are callback-driven,** and rewrite
  only what reads v2's state: the audio director and the title screen's
  "continue".
- **Settings live outside the save,** in their own storage key, as v2's do.
- **The writing is data**, as the rest of the game's is.

## PR 34A — The plan

This document.

## PR 34B — The title screen and the main menu

- **A title screen,** v2's:
  - continue the run in the save (its name and year);
  - found a new college (asked twice while a run exists), which opens
    this game's startup screen;
  - settings, credits, and the hall of fame's three newest portraits with
    the rest a click away.
- **The hall of fame** moves from under the startup card to its own
  screen.
- **The main menu** gains the hall, settings and the title screen beside
  save and new game.

**As implemented:**
- **The settings came here** rather than in PR F, since the title screen
  needed somewhere to send them. Every type token scales with the text
  size. The counting numbers read reduced motion as well as the walkers
  and pulses do.
- **The clock is paused** while any front screen is up.

## PR 34C — One notification system

- **The toasts go.** What they announced is the ticker's.
- **NEXT learns what is holding the clock:**
  - a letter from the board;
  - a milestone's note;
  - a student demand;
  - an event waiting in the panel while a tab hides it.

  It pulses when the matter is urgent.
- **The event panel steps aside while a tab is open,** and NEXT points back
  to it.

**As implemented:**
- **NEXT names the first thing holding the clock,** in the order the list
  gives, with the board first. "Campus" closes the tab.
- **An event with a week or less to answer pulses,** and so does the
  board's letter.
- **The notes over the map step aside with the event panel.** v2 had no
  notes; here they are the milestone, the demand and the board's letter.

## PR 34D — The build menu that gets out of the way

- **While a building is held,** the build menu folds to a strip:
  - what is held;
  - its price and how it will be paid;
  - the keys;
  - a button to put it down.
- **Escape puts it down** before it closes the menu. This game's hall
  panel is unchanged.

**As implemented:**
- **The strip reads** "Placing: the building · its price · how it will be
  paid", from a data file (`data/buildWords.ts`), so the words match the
  full menu's.
- **The keys it lists are the map's:** click to break ground, R to turn it,
  Escape to put it down.

## PR 34E — History charts

- **v2's multi-series chart,** with ranks drawn the right way up, replaces
  this game's single-series one where a figure has company.
- **The charts v2 has and this game lacks:**
  - rank by year, in History;
  - endowment and net, in the Treasury;
  - each graduated class's size and satisfaction, in Students;
  - the six standings together, in the Final Report.

**As implemented:**
- **The chart is `components/MultiChart.tsx`,** beside the single-series
  one, which stays for the History tab's four figures. The standings panel
  keeps its six small rank charts.
- **Lines past the third are dashed,** so no series is told apart by
  colour alone. Its colours are the signal tokens, which the
  colour-vision setting remaps.
- **The Treasury's net is the year's change in cash,** as the history row
  records it. A year that built something big reads low beside an
  endowment in the billions. That is what the row holds, so the chart says
  so in its note.

## PR 34F — Every number explains itself

- **Settings:**
  - text size (three steps);
  - colour-vision-safe colours;
  - reduced motion, beside the operating system's.

  Kept in their own storage key.
- **v2's `Figure`:** a label, a value and a required explanation, shown on
  hover and on keyboard focus. It is rolled out to the headline figures:
  - the status bar;
  - the Treasury;
  - the Students tab;
  - the summer's outcomes.
- **A test holds the rule:** a `Figure` without an explanation does not
  typecheck, and the tabs' bare figures are counted so the count can only
  fall.

**As implemented:**
- **The settings had landed in PR B.**
- **A hint is typed as a sentence,** a string ending in a full stop. An
  empty or unpunctuated one does not typecheck, and nor does a Figure
  without one.
- **`Figure` is a label and value inside a `<dl>`.** In a panel's grid it
  sits as if unwrapped. `FigureBox` wraps anything else: the status bar's
  stats, which open their sentence upward.
- **The sentences are data** (`data/figureHints.ts`).
- **Rolled out to:**
  - the status bar's four stats and the funds;
  - the Treasury's balance;
  - the Students tab's effect on satisfaction;
  - the summer's outcomes, projections and decision.
- **`test/figures.test.ts` counts the `<dd>`s left in `src/tabs/`** (30)
  and fails when the count rises, or when it falls without the ceiling
  following.

## PR 34G — Sound

- **v2's synthesiser and its data file:**
  - four themes (founding, growth, distress, ceremonial) with B sections;
  - effects;
  - ambience: a crowd scaled by enrolment, wind with the winter, and a
    stadium roar on game weeks.
- **A director written for this game's state.** It picks the theme from
  the year, the distress ladder and the Final Report, and plays effects
  for new log lines by topic.
- **Controls:** volume and mute in settings, `M` to mute, and the
  listening bench in the debug panel.
- **The levels are v2's,** to be tuned by ear (Phase N's playtest).

**As implemented:**
- **The data file is `data/audioData.ts`** (this game's writing is
  TypeScript). The load-time checks v2 ran are `audioProblems()`, which
  the audio test calls.
- **The theme turns to distress at the freeze** (rung 3 here, as v2's
  rung 2 was). It turns ceremonial from Year 46 and for the Final Report.
- **The crowd is full at 6,000 students,** not v2's 1,500. This game's
  colleges reach thirty thousand.
- **The crowd thins while the summer is being decided,** as this game has
  no summer term.
- **The roar is on the season's three dated games and the postseason
  week,** once a team is active.
- **Cues are keyed on log topics.** A team's line cheers when the news is
  good.
- **New lines are found by their year, week and words,** since the reducer
  clones the state. A load or a new run is heard from where it stands.
- **The dev console handle is left out,** since the listening bench is in
  the debug panel.

## What this plan does not do

- **Bespoke art** for the capital projects, or a picture of the campus for
  the hall's portraits (Plan 33 left both open). These are Phase N's if
  the playtest asks for them.
- **Balance.** The harness does not move.

## Left for Phase N

- **At the largest text size the toolbar wraps** at a 1440-wide window.
- **The mix has not been heard by a person.** The listening bench is
  there for the playtest to set the levels.
