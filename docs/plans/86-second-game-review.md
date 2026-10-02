# Plan 86 — A second full review of the game

*Planning document only — no gameplay code is changed by this file. Its job
is to repeat Plan 73's review on the game as it stands after Plans 74–85, in
the same seven areas and the same shape, so the two can be read side by
side.*

**Status: Landed.** One PR, with the review in `docs/reviews/2026-10-game-review-ii/`.

**As implemented:**
- The areas ran side by side, one reviewer each, against the production build
  (`vite preview`) and the dev server, on a four-core container.
- **Tool repairs** were needed in every area's tools (the review's README lists them). The
  one that changed results: `review:goals` answered the specialization with
  the game's default, *Not this year*, so no goal player had specialized.
  The first 20 runs were made before the fix and thrown away.
- **`tools/scenarios.ts`** gained one line: the `training` scenario names its
  specialization, because the Guided player stopped picking academics after
  Plan 85I.
- **Area 6** could fetch no page at all (October could fetch some), so every
  figure in it comes from a search extract, as flagged at its top.
- **Results:** 52 findings and 9 bugs; none is a blocker, and no bug is
  major.

---

## 0. The brief

The owner asked for a full game review in the same format as the last one
(Plan 73, `docs/reviews/2026-10-game-review/`). Since that review read
`58fa3fd`, twelve plans have landed, and several of them change what the
review looks at:

- **Plans 74, 75, 81, 82 and 83:** the campus. Backlog that full funding
  pays down, landmarks and venue stages redrawn, the vernacular's surface
  on the invariant buildings, seasons, the ring of land around the parcel,
  and a canvas renderer with the SVG map kept as the fallback.
- **Plans 76 and 80:** the screens and the words. The collapsible
  Curriculum, the text made true, one way to write a number, one button
  base, the phone layout, and board confidence removed.
- **Plans 77 and 78:** the inbox in place of the event panel and the note
  stack, and a game that teaches itself.
- **Plan 79:** the bugs.
- **Plan 84:** the Faculty tab as a grid of people, and a market that
  follows standing.
- **Plan 85:** prestige as a blend of four pillars, each with a
  specialization chosen once at a rank milestone.

## 1. Ground rules

Plan 73's §1 holds unchanged:
- the production build, at desktop (1440×900) and phone (390×844);
- findings only, with a data-losing or crashing bug raised the day it is
  found;
- every finding with what, where, why it matters, a proposed fix, a
  severity (*blocker*, *major*, *minor*, *polish*) and an effort
  (*S*, *M*, *L*);
- evidence before opinion, and the reviewer's limits stated.

Two additions:

- **Finding ids move on a letter**, so the two reviews never share an id.
  This review's area findings are `B1-1`, `B2-1` … and its bugs `H7-1` …
  (the October review's were `A1-1` … and `G7-1` …).
- **Every area says what became of the October review's findings in its
  area.** Each October finding still true on `HEAD` is carried as a new
  finding that names its predecessor ("was A1-7"), so the new list stands
  on its own. The full status table of the October review is
  `docs/reviews/2026-10-game-review/STATUS.md`.

## 2. The tools

The review reruns Plan 73's tools (`tools/README.md`, *Reviewing the whole
game*). Each was written against `58fa3fd` and is brought up to date
where Plans 74–85 broke it, in the PR of the area that owns it:

| Tool | Area |
|---|---|
| `review:arrangements`, `review:views`, `review:doors`, `review:probe`, `sheet --every`, `gallery:assets` | 1 |
| `review:strings`, `review:gallery` | 2 |
| `tools/review/drive.mjs`, `npm run newplayer` | 3 |
| `review:goals` (the goal players learn to choose a specialization) | 4 |
| `review:sweep`, `tools/review/twoTabs.mjs` | 7 |

## 3. The areas

As Plan 73's §3, with these changes of emphasis:

1. **Campus and asset aesthetics.** The canvas renderer against the SVG
   fallback; the ring of land, the hills and the haze; seasons; the
   specialization buildings of Plan 85 (the training program, the research
   park, the downtown and its festival, the athletic performance complex);
   and the October list of decorative assets.
2. **UI and text.** The inbox, the Faculty grid and person page, the
   specialization choice and the four pillars on the prestige screens, and
   Plan 85's new text read against the code for false claims.
3. **Intuitive gameplay.** A new player's first years by hand again, the
   nine problems traced again, and three more: how prestige is now made
   (the pillars), when and why to specialize, and what the inbox asks of
   a player.
4. **Strategy.** The seven goal players again, now able to specialize,
   read for whether Plan 85 made the ambitious runs end in different
   colleges (the October review's A4-1).
5. **The critical improvements.** Ranked as before.
6. **Marketability.** The October memo re-read a week on: what changed in
   the game, and in the sources, since 27 September.
7. **Bugs.** The sweeps and the exploratory list again, with the canvas
   map, the inbox and the faculty grid added.

## 4. Where it lands

`docs/reviews/2026-10-game-review-ii/`, laid out as the October review:
a `README.md` (the summary, the ten improvements and a fix-first list), one
file per area, appendices for area 2 and 4, the images in `img/` and the
tables in `data/`.

## 5. The map

The October review took nine PRs. This one has its tools already, so it is
one PR, one commit per area.

| Commit | Subject |
|---|---|
| A | This plan |
| B | Area 1: aesthetics |
| C | Area 2: UI and text |
| D | Area 3: intuitive gameplay |
| E | Area 4: strategy |
| F | Area 6: marketability |
| G | Area 7: bugs |
| H | Area 5: the critical improvements, and the README |

## 6. What this plan does not do

- Change the game, the balance or the targets.
- Stand in for the owner's playtest (70L) or real market testing.
- Decide what comes next: the owner does, from area 5's ranked list.
