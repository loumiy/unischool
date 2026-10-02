# UniSchool — a second full review of the game, October 2026

Plan 86. Commit read: `4062bfb` (main, with Plans 74–85 landed). This file is area 5 of the plan: the executive summary and the ten improvements that matter most, ranked. The area files hold the evidence. Every finding in them carries its source (a screenshot, a save or scenario, a file and line), a severity and an effort. Each area also says what became of the [October review](../2026-10-game-review/README.md)'s findings in it; the full table of those is [`STATUS.md`](../2026-10-game-review/STATUS.md).

| Area | File | Findings |
|---|---|---|
| 1. Campus and asset aesthetics | [`1-aesthetics.md`](1-aesthetics.md) | 9 (1 major): the specialization buildings, seasons, the canvas against the SVG, doors |
| 2. UI and text | [`2-ui-and-text.md`](2-ui-and-text.md) + appendices [`2a`](2a-course-descriptions.md) [`2b`](2b-flavor-and-mechanics.md) [`2c`](2c-consistency.md) [`2d`](2d-voice.md) | 7 (2 major): 904 captures, the October claims re-judged, 83 new ones |
| 3. Intuitive gameplay | [`3-intuitive-gameplay.md`](3-intuitive-gameplay.md) | 10 (4 major): a new player to Year 5 by hand, twelve problems traced |
| 4. Strategy | [`4-strategy.md`](4-strategy.md) + [`4a`](4a-goal-players.md) | 11 (7 major): seven goal players over 70 games, now able to specialize |
| 6. Marketability | [`6-marketability.md`](6-marketability.md) | 6 (4 major): the October memo re-read a week on |
| 7. Bugs | [`7-bugs.md`](7-bugs.md) | 9 entries (no blocker, no major) |

Finding ids move on a letter from October's, so the two reviews never share one: `B1-1` … for the areas, `H7-1` … for the bugs.

**How to read the judgments.** As in October, the reviewer is a model, not a human player. Judgments of feel are labelled as the reviewer's in the area files. They rest on what a run asks of a player, on renders and screenshots, and on hands-on sessions through the real production build. The owner's own playtest (70L) is still the test of feel.

## The summary

**The October review's problems are mostly fixed.** Of its 53 findings, 43 no longer hold on `HEAD`, 6 are partly fixed, and 4 still hold, two of them deferred by the owner. The six fix-first bugs are all gone. The first year now explains itself, the second-hall deadlock is gone, and no matter passed unseen in the hands-on session. The Curriculum fell from 2,244 words to 762 at year 8. None of October's 109 false claims is still false. The late campus no longer goes derelict (0 derelict buildings at year 51, against about 50). Seasons, the ring of land and the canvas map work; the canvas matches the SVG fallback to anti-aliasing.

**The game is still robust.** No crash, no failed load and no page error turned up in:
- 40 fifty-year sweep games, 12 odd-name games, and every committed save fixture played on;
- 70 goal-player games;
- 904 screen captures and 34 map sessions on both renderers;
- `npm run check` (143 suites) and `npm run test:slow`.

**What is new is Plan 85, and it has not yet done what it was for.** Specializations were the answer to October's biggest finding: every ambitious run ended as the same college. Three things stand in the way:

1. **The strategies that differ never reach the choice.** It is offered only in the overall top 20. Revenue, satisfaction and championships never got there in 30 runs, and four of ten good-then-big runs didn't either (B4-2).
2. **The players who do reach it choose too late.** The median is year 39–47, too late for the choice to play out by year 50 (B4-3).
3. **Two of the four specializations don't lead their own pillar.** Research finishes 5th–6th in research and student life 3rd in student life, because those rankings still read slow stocks (B6-2).

So the four ambitious paths still build one body: about 33,800 students, all 374 courses and 20 teams. Only the lead pillar and the Final Report's title differ (B4-1). Money still stops mattering, with $4–6B in cash at year 50 for most goal players and $20.9B for the natural line (B4-10).

**Prestige is the game's central question, and it got harder to read.** Plan 85 made prestige a blend of four pillars, but the screens show it on three unnamed scales (B3-2). The summer Review lost its "what moves it" line (B3-2). The specialization cards quote shares in pillar points, so athletics' "34" looks biggest when it is worth least: 5.1 prestige against academics' 9.8 (B2-3, B3-6). Four sentences written before Plans 80 and 85 now say what is no longer true (B2-2).

**A new player's first verdict is a fall.** Every college opens at 51.5 prestige and is graded 29 in its first summer, so it drops to about 44 and its rank slips. The guided player does not regain 51 until year 10 (B3-1). The default admit rate brings in 982 students for 350 dining seats, and the summer shows no prestige cost for it (B3-5). The NEXT line asks for a residence hall while one is going up (B3-3).

**Small is a trap.** Selective admissions lost 5.9 prestige over four summers. The guide gives full credit for student quality only from 6,000 students (B4-4). The satisfaction goal is graded F in all ten runs (B4-7).

**The late game is more clicking, not less.** The teaching ceiling no longer binds, but instructor swaps doubled, to over 800 a run for the prestige and every-asset players (B4-5). Weeks with nothing to ask are still 51–83% of a run, and stops grew to 129–298 a run (B4-6). The screens' load moved from the Curriculum to the Faculty grid (2,000+ words and 300 controls from year 30) and History (3,296 words at year 40) (B2-1).

**Nothing a buyer would see shows the October game.** The README's screenshots, the share image and the time-lapse all predate Plans 80–85, and the title screen still shows no campus (B6-1). The AI disclosure is one Credits line (B6-3). The February 2027 Next Fest is no longer realistic; June is (B6-4).

**No bug is serious.** The worst one changes data: a save from before Plan 85F counts more Landmark Programs than the limit allows when migrated (H7-1).

## The ten improvements that matter most

Every finding from areas 2, 3 and 4 was grouped by the player problem underneath it. Related findings from areas 1, 6 and 7 join a group when they share the problem. Each group is ranked by:
- how many players it hits;
- how early in a run;
- how badly;
- the effort.

Effort: S an hour, M a PR, L a plan.

### 1. Let every strategy reach a specialization, sooner — every player who plays twice, M

- **Findings:**
  - B4-2: the choice is offered only in the overall top 20, so revenue, satisfaction and championships never see it;
  - B4-3: the median choice is year 39–47;
  - B6-2: research and student life don't top their own pillar;
  - B4-1: the ambitious paths still build one body.
- **Fix:**
  - Offer the choice by pillar as well as overall (a top-20 rank in any one pillar), and earlier: a window that opens in the 20s.
  - Rank the research and student-life pillars on pillar values, as Plan 85I proposed and did not build.
  - Then re-run `npm run review:goals` and ask whether the bodies diverge, not only the titles.

  This is still the change that decides replay value and the pitch (area 6).

### 2. Make prestige readable — every player, from the first summer, S–M

- **Findings:**
  - B3-2: three unnamed scales on one panel; the Review's "what moves it" line is gone; 12 of 19 rows can't be moved in the first years;
  - B2-3 and B3-6: the run's one permanent choice is 681 words long, and its one shared figure misleads;
  - B2-4: Plan 85's rule is restated in six places, and "term" means two things.
- **Fix:**
  - One scale on the Prestige panel: every row in prestige points, with each pillar's weight beside it.
  - A "what moves it" line per pillar in the summer Review.
  - Specialization cards that quote each share in prestige points and say which pillar the college ranks best in. A few lines each.

### 3. Don't mark a new college down without saying why — every player, the first ten years, M

- **Findings:**
  - B3-1: prestige opens at 51.5, the first summer grades 29, and a decade of flat rank follows;
  - B3-5: the default admit rate overfills dining, and crowding costs 14.5 of the grade's 25 penalty points with no warning at the price;
  - B3-7: the first lab doesn't say it starts research, which is 25% of prestige.
- **Fix:**
  - Open prestige at what the first summer will grade, or let the first summer's grade only rise.
  - Show the prestige cost of crowding in the admissions beat's projections, and start the NEXT line's crowding warning where the penalty starts.
  - Say on the lab's tile that it opens the research pillar.

### 4. Guidance that sees what is coming — every player, years 1–5, S

- **Findings:**
  - B3-3: NEXT asks for a building that is already going up;
  - B3-9: an idle committee with $1M in hand gets no NEXT line for 25 weeks;
  - B3-4: "Establish a school" names the goal, not the step;
  - B3-8: the Curriculum won't name a school the letters name;
  - B3-10: smaller doubts, such as a greyed tile that explains itself only on hover.
- **Fix:**
  - Count construction in the needs reading.
  - Point at an idle committee.
  - Name the next move, not the goal.
  - Name the school.

### 5. Make small a real strategy, and grade it fairly — every player who doesn't grow, M

- **Findings:**
  - B4-4: full credit for student quality only from 6,000 students; selective admissions loses prestige; Plan 84's market keeps a small college's teachers weak;
  - B4-7: the satisfaction goal is graded F in all ten runs; the largest college still "never opened its doors very wide"; championships is titled "a party school";
  - B4-8: no stay-small, found-a-team or disband lever;
  - B4-9: the price is still set blind.
- **Fix:**
  - Scale student quality's full credit to the college's size, or to its admit rate.
  - Grade the happiest college on what it chose.
  - Fix the access phrase.
  - A target enrollment in the admissions beat.
  - Last year's price response beside the slider.

### 6. Stop the clock only for choices, and take the late game's clicks away — every player past year 15, M

- **Findings:**
  - B4-6: 51–83% of weeks idle; 129–298 stops a run, 87–93 of them milestone notes;
  - B4-5: over 800 instructor swaps a run, with no Provost policy and no link from Prestige to the *Below A* filter;
  - B2-1: the Faculty grid and History are now the heaviest screens.
- **Fix:**
  - Milestone notes and research reports as inbox letters that don't stop the clock, with the year's review naming what took its default (the rest of Plan 77B).
  - An instructor policy, or a one-click "seat the best free instructor" per program.
  - A link from the Prestige panel's teaching line to *Below A*.
  - Dismiss and Train off the tiles' faces; History in views.

### 7. Give late money somewhere to go — every player past year 30, M to L

- **Findings:**
  - B4-10: $4–6B in cash at year 50 for most goal players, $20.9B for the natural line. The sweep stops once the endowment is fully funded, so the surplus piles up (area 7 confirmed it is balance, not an accounting bug).
  - B4-11: the pacing scorecard still measures October's prestige (63 of 114 targets met).
- **Fix:** a plan for the owner. The options:
  - a sink that buys standing: named chairs and endowed programs (see the backlog's *Events that do what they say*);
  - a budget whose generous levels cost real money (the backlog's school-wide budget);
  - or costs that grow with wealth.

  Re-target the scorecard's prestige rows to Plan 85's scale in the same change.

### 8. Make the text true again, and keep it true — every player, S

- **Findings:**
  - B2-2: four new false claims: the rank chart's "academic ranking", the prestige note without athletics, "breadth lifts the prestige limit", and "the board starts to worry" after board confidence was removed;
  - B2-5: glossary slips on the new screens;
  - H7-5: a board letter always dated this week;
  - H7-6: money that rounds past its unit ("$1,000k");
  - H7-7: "University of Ashford College".
- **Fix:**
  - The rewrites in area 2's tables.
  - A habit: a plan that changes a rule searches `src/` for that rule's words.

### 9. Draw the specializations as well as the rest of the campus — every player who specializes, S–M

- **Findings:**
  - B1-1: the Research Park, the specialization both harness players choose, is a render shed that reads as a warehouse;
  - B1-7: the downtown's lights burn at noon, off the opening view;
  - B1-9: slips on Plan 85's buildings;
  - B1-2: seasons stop at the open ground;
  - B1-3: the vernacular still stops at the walls of the invariant half;
  - B1-5: doors onto lawn, 814 on three grown campuses.
- **Fix, in order:**
  - The Research Park as a court of pavilions (S–M).
  - Seasons on the fields and the garden (S).
  - The downtown's lights by season or time of day (M).
  - Doors joined to walks (backlog, M).

### 10. Show the October game to the people who might buy it — every store visitor, S–M

- **Findings:**
  - B6-1: the README, the share image and the time-lapse predate Plans 80–85, and the title screen shows no campus;
  - B6-3: the AI disclosure is one Credits line, while the AI-written text has grown;
  - B6-4: the February Next Fest is no longer realistic;
  - B6-5: a first run ends near the two-hour refund line;
  - B1-6: the committed asset gallery is stale.
- **Fix:**
  - Re-shoot the README and share image, and re-cut the time-lapse over one seasonal year.
  - A campus behind the title screen.
  - Write the disclosure now (area 6 §7 has a draft).
  - A Steam page in January and Next Fest in June 2027.
  - Regenerate `docs/assets`.

### Fix first, whatever the ranking

Small and certain. Each one either changes saved data, misleads every player, or breaks a tool the next review needs:
- **H7-1: the migrated Landmark count.** A save from before Plan 85F counts more than the limit allows (`persistence.ts`, `researchParkGate`). Add `npm run review:sweep -- --fixtures` to CI so a migration can't drift again.
- **H7-2: the map's wheel listener is passive.** It can't stop the page scrolling or zooming, so a trackpad pinch zooms the whole page. Register it non-passive.
- **H7-3: a tab that loses the claim stops without saving.** Up to half a year of play is lost when a second tab continues. Save first, then stop.
- **B2-2: the four false sentences** in History, the charts and the board's letters.
- **H7-8: the `demand` scenario doesn't reach its stop,** and the harness's default name reads "Test University University". (`training` didn't either; area 2's change to `tools/scenarios.ts` in this review fixes it, and it now stops at year 38 week 6.)

## The tools

The review reran Plan 73's tools; `tools/README.md`, *Reviewing the whole game*, has their usage. Changes made on the way:

| Tool | Change |
|---|---|
| `review:goals` | It answered the specialization with the game's default ("Not this year"), so no goal player ever specialized. Each goal now picks the pillar it implies and builds its building. Also: Plan 78D's decline, the training program, a cash column, a pillars distance table and `GOALS_JOBS`. |
| `review:arrangements` | A `specialized` arrangement with Plan 85's three buildings |
| `review:gallery` | Opens the inbox, the Faculty market and a person page; finds Founders Hall on the canvas |
| `review:strings` | Plan 85's files get screens of their own; four words join the jargon list |
| `review:sweep` | Round trips through `exportSave`, a play-on check after reload, a stopped clock reported as a failure, and `--fixtures` |
| `tools/review/twoTabs.mjs` | Four cases with the week each expects, now that Plan 79B fixed the October case |
| `tools/scenarios.ts` | The `training` scenario names its specialization, since the Guided player no longer picks academics |
