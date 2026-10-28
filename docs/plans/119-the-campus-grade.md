# Plan 119 — The Campus grade

*The owner's decision (28 October 2026): replace the report card's Access
grade with Campus. "I want to make sure it's rewarding players who spend
time making the campus look good, not just buying every asset." Part of
0.2.0 (see [Plan 118](118-0-2-0-fixes-and-words.md)).*

**Status: Proposed (28 October 2026).**

---

## 0. Why Access goes

Access is half the admit rate and half how far the price sits below what
prestige could charge (`rivalsSystem.ts`'s `selfAccess`). A winning
college is selective and priced to its name, so it fails Access almost by
design. A rank-1 college admitting a fifth of its applicants at an
ordinary price scores about 35 of 100, an F. The game never asks the
player to care about Access, and explains it only in a help hint on
History › Standings. F13 got an F and "never heard of it during the
game". The owner fails it every run.

The other five grades cover academics, research, campus life, athletics
and money. Nothing grades the campus, which is what a player spends most
of a run building.

## 1. What Campus measures

Much of it exists. Campus beauty (`systems/estate/beauty.ts`) scores
trees, landmarks, upkeep and quads. Quad detection (`state/quads.ts`)
still finds the open ground the buildings enclose and the lawns ringed by
paths, though the map no longer shows them. Decoration is stored as
dressing (`state/dressing.ts`): lamps, benches, banner lamps, flower beds.

Campus is four parts, each a ratio so the size of a campus doesn't decide
it (F10: the game "really pushes creating simply massive university
instead of quality"):

| Part | Rewards | Measured as |
|---|---|---|
| Decoration | a campus dressed with care | dressing items and trees per building, to a target |
| Quads | buildings placed around green space | quads found, against the number the campus's size could hold |
| Paths to doors | a campus you can walk | the share of buildings with a path reaching a door |
| Assets placed | a full campus in repair | buildings and landmarks standing, at their condition |

"Assets placed" stays part of it, but at a weight that keeps buying
everything from scoring an A on its own. The test of the weights: a campus
laid out with care earns an A, and one that bought everything and placed
it anywhere earns a C.

## 2. The PRs

| PR | Change |
|---|---|
| A | **The measure.** `campusScore(s)` in `systems/estate/`, beside beauty: the four parts and their weights, on the 0–150 scale the standings use. It reads the map, so it lives in the one module `test/invariants.test.ts` allows to. Tests for each part, and for the careful campus beating the bought one. |
| B | **The standing.** Campus replaces Access in `rivalsSystem.ts`'s standings, in History › Standings and in its help. Rivals get a Campus value derived from prestige with their tilt, as their other standings are. The history row records it each year. An old save's report grades it from today's campus, as the report already does for a standing with no history. |
| C | **The report.** `finalReport.ts`'s axes and `reportData.ts`'s phrases: "a college with a campus worth walking", and a weakness line. The two titles that read Access (country club, the bargain) are re-pointed or retired. Every sentence that names Access is rewritten (grep `src/` for it, per the plans README). |
| D | **Tuning.** The sim's scenarios, including a careful campus and a bought one, set the targets and the weights. The grade spread across the scenario runs is recorded in this plan. |

## 3. Open questions

1. **Where the player sees it during a run.** Today Access shows only in
   Standings. Campus should show where the player builds, for example a
   line in the build menu or the campus beauty figure, so the grade
   is no surprise at Year 50. Proposed: the build menu's header shows the
   Campus standing and its weakest part.
2. **Old saves' standings tables** hold Access values. Proposed: drop them
   on load, and read Campus fresh.
