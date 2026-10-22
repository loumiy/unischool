# Plan 109 — A third full review of the game

*Planning document only — no gameplay code is changed by this file. Its job
is to repeat Plans 73 and 86's review on the game as it stands at 0.1.3, after
Plans 87–108, in the same seven areas and the same shape, so the three can be
read side by side.*

**Status: Landed.** One PR, with the review in
`docs/reviews/2026-10-game-review-iii/` and a status note on the second review
(`docs/reviews/2026-10-game-review-ii/STATUS.md`).

**As implemented:**
- The six areas ran side by side, one reviewer each, against the production
  build of `b1f2114` (`vite preview`), on a two-core container. The batch
  tools ran fewer seeds than review II's four-core run: 21 goal-player games
  (7 goals × 3 seeds × 1 name) against 70, and a 20-game sweep against 40.
  Each area says what it ran.
- **The play statistics were read for the first time**: PostHog's capture of
  the itch.io playtest, by one-off queries on 21 October
  (`data/play-statistics.md`). The playtest's written findings were read as
  evidence in every area.
- **The container restarted once** midway; areas 1–3 resumed from their saved
  work and lost no output.
- **Tool repairs** in every area that ran the browser tools: a chapter's
  briefing opens over the map on every harness save, which broke three of them
  (the review's README lists every repair). `review:goals` needed none.
- **One blocker was found and raised the day it was found** (I7-1: a 0.1.2
  save on a retired walkthrough step crashes 0.1.3). 0.1.3 was already live on
  itch.io by then.
- **Results:** 54 area findings (20 major) and 7 bugs (1 blocker, 1 major).
  Of the second review's 52 findings, 32 are fixed, 13 partly, 4 superseded,
  2 deferred by the owner, and 1 still holds.

---

## 0. The brief

The owner asked for another thorough review of the game's current state, after
reading the earlier ones. Since the second review read `4062bfb`, Plans 87–108
have landed (Plan 89 in full, though its status line still says otherwise), and
0.1.0–0.1.3 went public on itch.io. The changes that matter most to the review:

- **Plans 87, 90–94 and 99:** the catalogue redrawn, the polish pass, committee
  lamps, the build menu on Grounds with thumbnails drawn from the map's art,
  Lucide icons, a gazebo and entrance steps.
- **Plans 89 and 100–102:** the administration's offices and Walnut Hall, halls
  claimed by three, events that do what they say, the course catalog reshaped.
- **Plans 95–98 and 103–104:** the second review worked through; the owner's
  second playthrough; the itch.io playtest; 0.1.1 and 0.1.2.
- **Plans 106–108 (0.1.3):** the first five years as chapters of objectives,
  the founding faculty on the payroll, crowding retired, prestige that opens
  at 32 and climbs early, prestige at a glance, and admissions day.

## 1. Ground rules

Plan 86's §1, unchanged:
- the production build at 1440×900, and 1280×720 where layout matters;
  phones are out of scope by the owner's decision;
- findings only;
- every finding with a severity and an effort;
- evidence before opinion.

Two additions:
- **Ids move on a letter again**: `C1-1` … for the areas, `I7-1` … for the bugs.
- **Real players are evidence.** Each area says what became of the playtest's
  player findings in it, and the play statistics are read once for the whole
  review, so every area quotes the same numbers.

## 2. Where it lands

`docs/reviews/2026-10-game-review-iii/`, laid out as the second review: a
`README.md` (the summary, the ten improvements and a fix-first list), one file
per area, appendices for areas 2 and 4, the images in `img/` and the tables in
`data/`. The second review gains a `STATUS.md`, as the first did.

## 3. What this plan does not do

- Change the game, the balance or the targets.
- Stand in for the owner's playtest or for outside players on 0.1.3.
- Decide what comes next: the owner does, from area 5's ranked list.
