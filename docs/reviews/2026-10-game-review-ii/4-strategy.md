# 4. Strategy

Plan 86, area 4. Commit read: `4062bfb`.

**Method.** As October's: seven goal-directed players (`tools/review/goalPlayers.ts`, `npm run review:goals`) played the real reducer to year 50. Each goal was run on five seeds (12345, 4242, 777, 31337, 2026) with two college names (Blackmoor, Saint Aldric): 70 games in all. Each player:
- adapts by rules to what its college is doing;
- logs a reason for every decision;
- logs every time it wanted a lever the game doesn't have (a **want**);
- since Plan 85, chooses the specialization its goal implies at the rank milestone (below).

The full tables are in [`4a-goal-players.md`](4a-goal-players.md). For comparison with the committed baselines, `npm run sim` and `npm run natural -- --pacing` were run once each ([`data/b4-sim-report.txt`](data/b4-sim-report.txt), [`data/b4-pacing-scorecard.md`](data/b4-pacing-scorecard.md)). Two pain points were then checked by hand in the production build (`tools/review/drive.mjs`, scenario saves):
- a small, selective college at year 21 (the harness's Selective player), for the prestige goal's stall;
- the specialization choice at year 31 (the `specialization` scenario), for what each goal would read off the cards.

**The limits.** As October's: a goal player is a policy, not a person. It never gets bored, never misreads a screen, and does exactly what its rules say. "Tedious" is measured by what a run asks for: idle weeks, answer-only weeks, and the same action repeated more than ten times in a year. "Too easy" is measured by how early the goal is met and what pushes back afterwards. **The reviewer's judgment** (a model's) is labelled where it goes beyond the numbers. The goal players write no saves, so the hand checks use the harness's scenario saves at the same stretches, not the goal runs themselves.

## As run

`goalPlayers.ts` is this area's tool. Plans 80G, 85F and 85G had already taught it flagships and the two specialization buildings; these changes bring it up to `4062bfb`:

- **It never specialized (a bug in the tool).** Its `answerFor` answered every interrupt it did not handle with the game's default, and the default for the specialization choice is "Not this year". `game.ts`'s `answerAll` asks the player before the harness's rule, so every goal player on `HEAD` put the choice off for good, and `--specialization` had no effect either. Found when the first batch (20 runs) ended with no specialization at all; that batch is kept as an unspecialized comparison. Fixed: the choice is handed to the harness's rule.
- **Each goal chooses its own pillar** (`GOAL_SPECIALIZATION`), not the harness's strongest pillar:

  | Goal | Pillar | Why the goal would take it |
  |---|---|---|
  | Revenue | research | the research park lifts every lab's output "and the grants that ride on it": the only card that names money coming in |
  | Prestige | academics | the faculty training program is October's want (*train the faculty*) |
  | Satisfaction | student life | the downtown meets the students' social, dining and housing needs |
  | Every asset | research | the research park was the catalogue's last gate in October |
  | Championships | athletics | the athletic performance complex |
  | Good then big | academics | a college known first for its teaching |
  | Big then good | student life | a big college needs beds and a town |

  `--specialization` still overrides it for every run. Once specialized, each builds its pillar's building the moment it opens (`specialty-*`).
- **Plan 78D's decline.** When no offered program can be founded or staffed, a player declines one nobody can teach, once a year, as the Guided player does.
- **Plan 85E's training.** The prestige want *train the faculty* now fires only without the institute; with it, *train more of the faculty*. Neither fired in any run (B4-5).
- **The prestige goal gives up selectivity** when four summers of selective admissions have moved prestige by less than two points outside the top 20, and admits to fill from then on. Without this the October rule is a trap on `HEAD`: a 40-year test run stood 64th at 978 students (B4-4). The good-then-big goal keeps the October rule in its first twenty years, since staying small is its premise.
- **The report** gains a cash column, a section on the specializations (the pick, its year, the four pillars at year 50, trained professors), an "every asset open to it" marker (three of the four specialization buildings can never stand), and a second divergence table on the four pillars alone. `GOALS_JOBS` sets how many games run at once.

`npm run sim` matched `sim/baseline.json` with no deltas. No game code was changed.

## The seven at year 50

Medians over ten runs each. October's figure in brackets where it moved.

| Goal | Rank | Prestige | Students | Satisfaction | Net a week | Cash | Endowment | Courses | Placeables | Titles | Specialized | Final Report | Wants |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| Revenue | 56 (25) | 61 (108) | 4,800 | 63 | $2.7M | $4.0B | $384M | 60 | 34 | 0 | never offered | **D ×10** (C) | see demand before pricing |
| Prestige | 11 (**1**) | 104 (144) | 33,840 | 88 | $6.0M | $5.7B | $3.2B | 374 | 57 | 0 | academics, year 41 | C ×10 (B, C) | a way up for a small college |
| Satisfaction | 62 (26) | 51 (103) | 3,330 | 86 | $298k | $3.3M | $12M | 141 | 19 | 0 | never offered | **F ×10** (D) | raise academic |
| Every asset | 3 (**1**) | 110 (143) | 34,480 | 86 | $2.1M | $1.7B | $79M | 378 | 82 | 1 | research, year 39 | B ×10 | build what is locked; build every specialization's building |
| Championships | 50 (8) | 72 (133) | 25,760 | 89 | $4.0M | $4.5B | $64M | 322 | 45 | **0** (27) | never offered | **D ×10** (C) | found a team; recruit athletes; disband a program |
| Good then big | 17 (**1**) | 98 (144) | 33,840 | 87 | $3.0M | $94M | $53M | 374 | 61 | 0 | academics, year 47 (6 of 10) | C ×10 (B) | stay small on purpose |
| Big then good | 5 (**1**) | 110 (147) | 33,840 | 91 | $4.8M | $1.2B | $2.8B | 374 | 60 | 0 | student life, year 43 | B ×9, C ×1 | more seats now |

**No goal reaches first place in any of the 70 runs.** October: four goals reached it in every run, in years 36–39. Best ranks over the run: every asset 3–9, big-then-good 3–14, prestige 6–19, good-then-big 13–24, championships 43–48, revenue 50–53, satisfaction 55 in every run.

For comparison, the harness's own players on the same commit (`npm run sim`, three seeds): Guided is first at year 50 on every seed, at 117.5 to 121 whatever it chooses; Guided unspecialized ends 3rd to 6th at 111.7; Natural (pacing scorecard) is first from years 40–43 and ends at 118.1. Plan 85 put the top of the field at about 118–121. A goal player at 104–110 is a college a good player would beat, which is fair: the goals are narrow on purpose.

| Goal | Top 50 | Top 25 | Top 20 (the milestone) | Top 10 |
|---|---|---|---|---|
| Revenue | 24 (2 of 10) | — | — | — |
| Prestige | 22 | 33 | 41 | 49 (3 of 10) |
| Satisfaction | — | — | — | — |
| Every asset | 17 | 32 | 39 | 45 |
| Championships | 23 | — | — | — |
| Good then big | 31 | 45 | 50 (9 of 10) | — |
| Big then good | 21 | 35 | 42 | 49 (9 of 10) |

October: every goal reached the top 50 by years 7–9 and the top 25 by years 15–19.

## Goal by goal

### Revenue: the most money

- **Outcome.** Rank 56, prestige 61, 4,800 students, $2.7M a week, **$4.0B in cash** and a $384M endowment. Graded **D** in every run (October C), titled "a research powerhouse that never fielded a team anyone feared".
- **Curve.** Net income reaches $2.1M a week by year 20 and stays there. Enrolment plateaus at 4,500–4,800 from year 20. Prestige climbs to 62 by year 30 and holds. The college is never in the top 50 after year 24 (2 runs touched 50th).
- **Pain.** *See demand before pricing* in all ten runs, now from year 2 (October year 26, because the player's price search starts at once). The blind price stands (B4-9).
- **Easy.** Money. The college has $2.7B in cash at year 40 and nothing it wants to buy (B4-10).
- **Tedium.** 82% of weeks idle. `research-deep` 558 times, more than ten a year in 33 years (October 4): its grants are the one income lever that takes work.
- **Reviewer's judgment.** The same coherent, thin strategy as October, now ranked lower: in October a small, rich college could still stand 25th; on `HEAD` the pillars want breadth and size (B4-4), and it stands 56th.

### Prestige: the highest standing

- **Outcome.** Rank 11 (best 6–19), prestige 104, 33,840 students, all 374 courses, specialized in academics in year 41 (34–47). Graded C. October: first place by year 38 in every run.
- **Curve.** Flat for the first decade (prestige 43–45, rank 58–61), then the growth the player switched to: rank 53 at year 20, 29 at 30, 21 at 40, 12 at 50.
- **Pain.** *A way up for a small college*, in all ten runs at year 5: four summers of selective admissions moved prestige by −5.9 (B4-4). The want October's player felt for 890 weeks, *train the faculty*, never fired: the teaching standard no longer caps the target (ceiling 147 against a target of 108 at year 50; B4-5).
- **What the specialization did.** Plan 85E's training lifts academics late and steeply: on seed 12345, the choice in year 45 and academics from 113.5 to 134 in the last four years. The unspecialized first batch (the tool's bug, nine runs) ended at rank 15–19 and prestige 98.4–99.7; specialized, rank 11 and 104. The choice is worth about five points by year 50, and would be worth more if it came sooner (B4-3).
- **Athletics.** Like October's, this player builds no venues and hires no coaches; its athletics stands at the floor (32, last of 100) in every run. In October that cost nothing. Now athletics is 15% of prestige (Plan 85B), about 8 points at the championships player's level of 84: the prestige goal has to run a sports department to be first.
- **Tedium.** `tend-teaching` 839 times (October 405), more than ten a year in 35 years (October 14–15). 58% of weeks idle. 298 stops answered, 87 of them milestone notes (B4-6).

### Satisfaction: the happiest students

- **Outcome.** Satisfaction 86, every need at 90 by year 12 (9 of 10). Rank 62, prestige 51, 3,330 students, two schools. Graded **F in all ten runs** (October D ×10).
- **Pain.** *Raise academic* from year 13, felt 52 weeks: academic satisfaction stops at 79 and nothing on the menu serves it. *Shrink the student body* in 4 of 10 runs (October 10 of 10): Plan 74–85's growth is slower, so the body outgrows the campus less often.
- **Easy.** Satisfaction itself, from year 6.
- **Never offered the choice.** Student life is this goal's pillar, and the downtown is its lever (it meets "up to 15% of the students' social, dining and housing needs"). It never sees it: best rank 55 in every run (B4-2).
- **Tedium.** The idlest goal with revenue: 83% of weeks idle.
- **Reviewer's judgment.** October's sharpest point is sharper: the happiest college in the country is now graded F, and the specialization made for it is out of its reach.

### Every campus asset

- **Outcome.** Rank 3 (best 3–9), prestige 110, the best of the seven. 82 placeables, every asset open to it standing by year 43 in all ten runs. Specialized in research in year 39 (30–41); research 150, first in the research standing.
- **New want: *build every specialization's building*** (10 of 10, from year 40). The choice is for good, so the Faculty Training Institute and the Athletic Performance Complex can never stand beside the Research Park. *Every asset* in October's sense is no longer reachable by design, which is what Plan 85 meant: a college must give something up. This is the one place the goal players felt it.
- **Pain.** *Build what is locked* (10 of 10, year 21): 17 assets still gated by enrolment, prestige or a school.
- **Tedium.** `tend-teaching` 826 times (October 511), more than ten a year in 36 years. `research-cheap` 496 times. 51% of weeks idle, the busiest goal. 273 stops, 92 of them milestone notes, 69 decision events.
- **Doing everything still wins.** The goal that builds everything outranks the goal that wants prestige (3 against 11). October said the dominant strategy is "do everything"; Plan 85 has not changed that (B4-1).

### Championships

- **Outcome.** **No titles to speak of**: 0 median, 0–4 per run, 10 in all. October: 27 median. Rank 50, prestige 72, athletics standing 31st. Graded D, titled "a party school".
- **Curve.** The flagships work as Plan 80G meant: each run reached a final four within 0–2 years of putting a flagship on full scholarships (median 0), at years 5–13. Then the teams stall below a title. The athletics pillar stands at 84 at year 50.
- **Why.** Without the athletics specialization a program's quality slows above 80 and the established powers keep their full edge in the postseason (the choice's own card, checked on screen: "Athletics also lets a team's quality rise past 80 as easily as below it, and shrinks the established powers' edge in the postseason to a quarter"). The specialization is offered only to the guide's overall top 20. This player builds no labs and stands 45th–50th, so it is **never offered the choice in any run** (B4-2).
- **Pain.** As October's, in every run: *found a team* (from year 4), *recruit athletes* (year 18: only a flagship recruits, and the rest of the twenty teams stay at 60–70), and *disband a program* (6 of 10, year 33).
- **Tedium.** `replace-coach` 118 and `hire-coach` 98 times. `tend-teaching` 495.
- **Reviewer's judgment.** In October athletics was a real strategy with too few levers. On `HEAD` it is a strategy that cannot win without first becoming a top-20 university, which makes it a late-game specialization of the academic strategy rather than a strategy of its own.

### Good then big

- **Outcome.** Rank 17 (best 13–24), prestige 98, graded C. Specialized in academics in 6 of 10 runs, at a median of year 47; 4 runs were never offered it.
- **What happened to "good first".** At year 20 it had 948 students at prestige 48 and rank 58. Big-then-good had 16,160 students at prestige 64 and rank 51. Staying small bought nothing in October; now it costs twenty years. On screen (Selective, year 21, 1,547 students, prestige 46.5): History › Prestige reads student quality at "×0.35 scale — 1,547 enrolled; the guide gives full credit from 6,000", and teaching at "the campus average course grade, 53 of 100", "11% of courses graded A" ([image](img/b4-small-college-prestige.jpg)). A small college is told why, and the why is "be bigger".
- **Pain.** *Stay small on purpose* (7 of 10, year 12). The decline (Plan 78D) swaps an offer for another; it never shrinks the table.

### Big then good

- **Outcome.** Rank 5 (best 3–14), prestige 110, 33,840 students, satisfaction 91 (the highest), a $2.8B endowment. Specialized in student life in year 43. Graded B ×9, C ×1, titled "a college known first as the place to be a student that never opened its doors very wide", for the largest college in the game (B4-7, as October's A4-4).
- **Curve.** Fast to year 20 (16,160 students), then a dip: the "good" phase admits selectively and enrolment falls to 10,947 at year 30 before growing back to 33,840. Two runs gave up selectivity at year 34.
- **Pain.** *More seats now* (10 of 10, from year 1): the committee, the faculty market and the hall slots cap growth, not money.

## Do the goals make different colleges?

October's eight features (students, prestige, satisfaction, courses, teams, placeables, price ratio, research), each scaled 0–1; the distance between two goals' medians, 0 the same college and 1 very different. October's figure in brackets.

| | Revenue | Prestige | Satisfaction | Assets | Champ. | Good→big | Big→good |
|---|---:|---:|---:|---:|---:|---:|---:|
| Revenue | 0 | 0.61 | 0.33 | 0.63 | 0.58 | 0.61 | 0.61 |
| Prestige | | 0 | 0.66 | **0.09** (0.08) | 0.34 | **0.10** (0.07) | **0.04** (0.10) |
| Satisfaction | | | 0 | 0.66 | 0.48 | 0.62 | 0.65 |
| Assets | | | | 0 | 0.33 | **0.09** (0.09) | **0.07** (0.12) |
| Championships | | | | | 0 | 0.26 | 0.32 |
| Good then big | | | | | | 0 | **0.07** (0.16) |

The same four goals on the four pillars alone (academics, research, student life, athletics, each over 150), the shape Plan 85 was built to vary:

| | Prestige | Assets | Good→big | Big→good |
|---|---:|---:|---:|---:|
| Prestige (academics 138, research 122, life 95, athletics 32) | 0 | 0.24 | 0.18 | 0.21 |
| Assets (101 / **150** / 115 / 83) | | 0 | 0.11 | 0.11 |
| Good then big (113 / 122 / 100 / 80) | | | 0 | 0.09 |
| Big then good (117 / 122 / **127** / 83) | | | | 0 |

**Partly.** The four ambitious goals still build the same college underneath: about 33,800 students, all 374 courses, seven schools, twenty teams, 57–82 placeables. What differs is the top layer:
- **each leads a different pillar**: academics for prestige (138), research for assets (150, first in the field), student life for big-then-good (127, third);
- **the Final Report names that pillar first**: "a college known first for its teaching", "… for what its laboratories find", "… as the place to be a student";
- **no two end in the same place in the guide**, and none at the top.

The three goals that differ by stopping (revenue, satisfaction, championships) still stop, and now stop lower, because Plan 85 rewards breadth and size harder than before (B4-4), and none of them ever reaches the milestone that would give it a pillar of its own (B4-2).

**The reviewer's judgment.** Plan 85 answered October's A4-1 with identity, not scarcity. The choice is real and exclusive (the assets goal felt it), and the pillar it opens is worth about five points and a different title. But it comes at year 39–47 to the goals that reach it, to a college that is already the same size and breadth as every other ambitious college, and it never comes to the strategies that were different in the first place.

## The October findings

| October | Title | On `HEAD` | Carried as |
|---|---|---|---|
| A4-1 | One college at the end of every ambitious path | **Partly fixed.** The ambitious paths now lead different pillars and earn different titles (Plan 85), but the body is still identical (distances 0.04–0.10), money still piles up, and "do everything" still ranks best. | B4-1, B4-10 |
| A4-2 | The teaching standard is the late game, and its only lever is manual | **Partly fixed.** The cap no longer binds (ceiling 138–147 against targets 104–116; *train the faculty* fired in no run). A *Below A* filter exists (Plan 80B, `curriculumFilter.ts`), but nothing on Standing links to it, and there is no Provost policy that assigns instructors. Training exists only for the academics specialization. The swaps doubled. | B4-5 |
| A4-3 | Most weeks ask nothing | **Still open, and the stops grew.** Idle 51–83% of weeks; 129–298 stops a run (October 129–274), up to 93 milestone notes and 83 research reports. The inbox (Plan 77) moved them out of modals, but they still stop the clock; Plan 77B (pause on arrival, the year's defaults) is proposed, not built. | B4-6 |
| A4-4 | The Final Report misreads the strategies that differ | **Partly fixed.** The finance phrase now reads "never built an endowment to match its size" (`reportData.ts:74`); athletics is read at 1× (Plan 76C); satisfaction now counts in the student-life pillar behind the experience axis. "Never opened its doors very wide" still goes to the largest college; the satisfaction goal fell from D to F, revenue and championships from C to D. | B4-7 |
| A4-5 | Athletics and size have too few levers | **Partly fixed.** Flagships recruit on scholarships (Plan 80G); an offer can be declined, once a year, for another (Plan 78D). There is still no way to found or cut a team, to recruit for a non-flagship, to set a target enrolment, or to turn an offer down without a replacement. | B4-8 |
| A4-6 | Pricing is blind by design, and the revenue player wants to see | **Partly fixed.** After the price is set, the reveal splits the pool's change against last summer by factor, price among them (`yearOverYear.ts`). Before it, the price is still set blind. | B4-9 |

## Findings

| Id | Title | Severity | Effort | Was |
|---|---|---|---|---|
| B4-1 | The ambitious paths still build one college; Plan 85 changed its lead pillar, not its body | major | L | A4-1 |
| B4-2 | The specialization is out of reach for the strategies that differ, and athletics can't win without it | major | M | — |
| B4-3 | The choice comes at years 39–47, too late to play out | major | S–M | — |
| B4-4 | Small is a trap: quality first stalls, and the satisfied college is graded F | major | M | part of A4-4, A4-5 |
| B4-5 | The teaching cap is gone, and instructor swaps doubled | major | M | A4-2 |
| B4-6 | Most weeks still ask nothing, and the stops grew | major | M | A4-3 |
| B4-7 | The Final Report still misreads the strategies that differ | minor | S | A4-4 |
| B4-8 | Athletics and size still have too few levers | minor | M | A4-5 |
| B4-9 | The price is still set blind before the pool shows | polish | S | A4-6 |
| B4-10 | Money still stops mattering | major | M | A4-1 (its money half) |
| B4-11 | The pacing scorecard still measures October's prestige | minor | S | — |

### B4-1. The ambitious paths still build one college — major, L (was A4-1)

**What.** Prestige, every asset, good-then-big and big-then-good end 0.04–0.10 apart on October's features: 33,840–34,480 students, all 374 courses, seven schools, twenty teams. Plan 85's pillar differs (the second table above), and the title says so, but:
- the specialization comes after the college is built (B4-3);
- the goal that builds everything outranks the goal that wants prestige (rank 3 against 11);
- breadth (curriculum breadth, at 29.4 points the largest of academics' terms on screen) and size (student quality at full credit from 6,000 students) still need every program and a big body (B4-4);
- nothing forces a choice between them, because money doesn't run out (B4-10).

**Why it matters.** As October: replay value is the choices that exclude each other. Plan 85 added one exclusive choice; everything before it is still "do everything".

**Fix.** October's three directions stand (scarcity that lasts, identity that pays, an ending that reads the path). Plan 85 built the second's frame, so the cheapest next step is to let the choice shape the build, not just the score:
- offer the choice earlier (B4-3), so twenty years of play follow from it;
- make each specialization's pillar want a different body, for instance student life rewarding a smaller, residential college, research a graduate-heavy one, with the other pillars' terms easing where the chosen one pushes;
- let the specialized college skip what it does not need (a school it never founds, a program it declines for good) without losing breadth it cannot make up.

### B4-2. The specialization is out of reach for the strategies that differ — major, M

**What.**
- Revenue, satisfaction and championships are **never offered the choice in any of their 30 runs**: best ranks 50–53, 55 and 43–48. The milestone is the guide's overall top 20 (`SPECIALIZATION_MILESTONE_RANK = 20`, `prestigeSystem.ts:117`).
- Each of those goals has a pillar made for it: research's grants, the downtown's beds and festival, the athletics complex.
- **Championships can't win without it.** Ten titles over ten runs (October: a median of 27 a run). Its flagships reach a final four within two years, as Plan 80G meant, and stop there: without the athletics specialization a team's quality slows above 80 and the powers keep their full postseason edge (checked on the choice's card, [image](img/b4-specialization-choice.jpg)). The athletics pillar stands at 84 against 144 for the harness's athletics specialist.
- 4 of 10 good-then-big runs were never offered it either.

**Why it matters.** Plan 85 is the game's answer to "every path ends in the same college", and the paths that end somewhere else never get it. Athletics, in October a strategy with too few levers, is now a strategy that has to become a top-20 academic college before it can win a title.

**Fix.**
- Offer the choice by a pillar as well as overall: a college in the top 10 of a pillar, or the top 20 overall, whichever first. M.
- Or tie the athletics ceiling to the pillar, not to the specialization: a college whose athletics stands in the top 10 plays past 80 without the complex, and the complex is what lifts it further. S–M.

### B4-3. The choice comes at years 39–47, too late to play out — major, S–M

**What.** The goals that reach the milestone choose at a median year 41 (prestige; range 34–47), 39 (assets), 43 (big-then-good) and 47 (good-then-big). The harness's Guided player chooses at 30–35 (Plan 85I). The pillars fill slowly: training is full at 40% of the faculty trained (about six years at the least, Plan 85I), the downtown about ten years, the festival term ten years of festivals. So the goal players end their fifty years with the term part full: academics from 113 to 134 in the last four years of seed 12345, 25 professors trained at year 50.

**Why it matters.** The one choice Plan 85 adds is made in the last decade and pays after the Final Report. A player who reaches it late learns what it does in the epilogue.

**Fix.** Move the milestone to the top 30 (or a pillar's top 10, B4-2), so a strong player chooses around year 25–30 and a goal player around 30–35; or shorten each term's fill (Plan 85I already noted research filling in four years against academics' six and student life's nine). S for the constant; M if the rivals' table and the targets are re-run.

### B4-4. Small is a trap: quality first stalls, and the satisfied college is graded F — major, M (part of A4-4 and A4-5)

**What.**
- **The prestige goal's October rule stalls.** Admitting the top band and a little more, a test run stood 64th at year 40 with 978 students and prestige 46. With the give-up rule every run gave up selectivity at year 5, after prestige moved −5.9 in four summers.
- **Good then big:** 948 students, prestige 48, rank 58 at year 20; it reaches the top 20 at year 50 in 9 of 10 runs.
- **Satisfaction:** best rank 55 in every run, prestige 51, graded F ×10.
- **On screen** (Selective, year 21, [image](img/b4-small-college-prestige.jpg)): student quality is scaled "×0.35 — 1,547 enrolled; the guide gives full credit from 6,000"; teaching is "the campus average course grade, 53 of 100", with 11% of courses graded A. Plan 84's market follows standing, so a small college at prestige 46 hires from a pool whose mean teaching potential is about 51 (Plan 84B), and its teaching stays weak, which keeps its standing low.
- The harness agrees: Selective is 61st at year 50 at prestige 51 (`npm run sim`).

**Why it matters.** "Small and excellent" is the strategy the owner's own players reach for first (the good-then-big premise, Selective), and the game now closes it twice: size is a term of academics, and a low standing hires weaker teachers. The screen explains the cause honestly, and the explanation is "grow".

**Fix.**
- Scale student quality by the share of the class above a bar, not by headcount; or lower the full-credit size (6,000) to what a small college can reach (1,500–2,000). S.
- Let a selective college's market draw a little above its standing (a "selective" bonus on teaching potential for a high-yield, low-admit-rate college). S–M.
- Give satisfaction a place in the Final Report a small college can earn (B4-7).

### B4-5. The teaching cap is gone, and instructor swaps doubled — major, M (was A4-2)

**What.**
- The teaching standard no longer caps the target for any goal: at year 50 the ceiling is 138–147 against targets of 104–116. *Train the faculty* fired in no run (October 28 of 30).
- But the swaps grew. `tend-teaching` (an instructor swap or a better hire):

  | Goal | Swaps a run | Years with more than ten | October |
  |---|---:|---:|---|
  | Prestige | 839 | 35 | 405, 14–15 years |
  | Every asset | 826 | 36 | 511, 21 years |
  | Big then good | 816 | 29 | 99 in its busiest year |
  | Good then big | 656 | 23 | |
  | Championships | 495 | 22 | |

  October's three cap-bound goals swapped 334–557 times a run.

- Why: Plan 84B's market draws weaker candidates at low standing, so a college's early hires teach worse and are swapped out as better ones are listed. The institute's training (Plan 85E) reached two goals in years 41 and 47 and trained 34 professors in the prestige runs, against 839 swaps.
- The *Below A* filter exists (Plan 80B), but History › Standing's teaching line ("11% of courses graded A: standing can reach 110") links nowhere, and no seat assigns instructors.

**Why it matters.** The worst tedium of October's late game is now spread over 35 of 50 years.

**Fix.** October's fixes, now that the filter exists:
- link Standing's teaching line to the Curriculum with *Below A* on ("Show the 71 courses below A"). S;
- a Provost (or Dean) policy that puts the best free instructor on each course below A, the seat system's own routine. M.

### B4-6. Most weeks still ask nothing, and the stops grew — major, M (was A4-3)

**What.** Idle weeks (nothing done, nothing asked), whole run: revenue 82%, satisfaction 83%, championships 66%, good-then-big 60%, prestige 58%, big-then-good 54%, every asset 51%. Stops answered per run: 129 (satisfaction) to 298 (prestige), October 129–274. Of these:
- milestone notes: 87–93 for the four ambitious goals (October 12–85);
- research reports: up to 83 (prestige; October 52);
- decision events: up to 69 (assets).

The inbox (Plan 77C) shows every stop in its reading pane rather than a modal, which reads better (area 3), but each still stops the clock and must be answered before the week runs.

**Why it matters.** As October: the decisions are in the wrong places. A milestone note is news, and 90 of them a run are 90 stops that ask nothing.

**Fix.** Plan 77B as proposed: milestone notes and research reports arrive as letters that never stop the clock (a pause-on-arrival setting for players who want them), and the year's defaults are listed in the summer review. M.

### B4-7. The Final Report still misreads the strategies that differ — minor, S (was A4-4)

**What.**
- The satisfaction goal (every need at 90 by year 12) is graded **F ×10**; its experience axis averages 49.
- Big-then-good, the largest college in the game, is titled "… that never opened its doors very wide" (`reportData.ts:73`) in every run, as October. The access axis is half admit rate, half price.
- The championships goal, with ten final fours and twenty teams, is "a party school".
- Fixed since October: the finance phrase, athletics at 1×.

**Why it matters.** The verdict still reads as wrong for the two goals a player would be proudest of here.

**Fix.** "Stayed hard to get into" for the access weakness; weigh the experience axis toward satisfaction for a college whose satisfaction leads the field; let the title name a tag a college earned over a tag its standing implies ("a party school" for a team-first college reads as a joke at its expense). S.

### B4-8. Athletics and size still have too few levers — minor, M (was A4-5)

| Want | Runs | October |
|---|---|---|
| Found a team | 10 of 10, from year 4 | 10 of 10 |
| Recruit athletes (a non-flagship) | 10 of 10, from year 18 | 10 of 10 |
| Disband a program | 6 of 10, from year 33 | 10 of 10 |
| Stay small on purpose / shrink the student body | 7 of 10 good-then-big, 4 of 10 satisfaction, 1 of 10 big-then-good | 25 of 30 |
| More seats now | 10 of 10 big-then-good, from year 1 | 10 of 10 |

**Fix.** October's list, less what landed: found a varsity program directly at a price; cut one at the alumni's displeasure; a target enrolment in Admissions that the admit rate works toward; and a decline that leaves the place empty for a year instead of drawing a replacement (Plan 78D's decline swaps). M.

### B4-9. The price is still set blind before the pool shows — polish, S (was A4-6)

All ten revenue runs wanted to see demand before pricing. Since October the reveal splits the pool's change against last summer by factor, price included, so a player learns afterwards what the price did. **The reviewer's judgment:** that answers most of October's point. The remaining step is to show last summer's price line on the slider before it is set ("at $21,000 last summer, price cost 4% of the pool"), from the same `yearOverYear.ts` figures. S.

### B4-10. Money still stops mattering — major, M (was A4-1's money half)

**What.** At year 50:

| Player | Cash | Endowment | Net a week |
|---|---:|---:|---:|
| Prestige goal | $5.7B | $3.2B | $6.0M |
| Championships goal | $4.5B | $64M | $4.0M |
| Revenue goal | $4.0B | $384M | $2.7M |
| Every asset goal | $1.7B | $79M | $2.1M |
| Big-then-good goal | $1.2B | $2.8B | $4.8M |
| Natural (seed 12345, `npm run natural`) | **$20.9B** | | $17.9M |
| Guided (`npm run sim`, median) | $645M | | |

The Natural run's cash passes $2.6B at year 30 and $9.7B at year 40, matching the area 1 lead's measurement ($19.57B at the start of year 51 from the scenario tool) and Plan 85I's $20.6B. The pacing scorecard watches it as "natural Y40 cash, in decades of opex: 0.8", under its bound of 1.0, so the bound does not catch it. The endowment is capped at 4 points of prestige (Plan 85I's halving).

**Why it matters.** Every goal that grows runs out of things to buy by year 30, so money never forces the choice between pillars that B4-1 asks for. The good-then-big goal is the only one that ends under $100M, and that is the cost of twenty small years, not a choice.

**Fix.** Something the late college can buy that competes with everything else: the specialization terms bought faster with money (a larger festival, a second institute class, a second landmark), or rivals that raise their offers for the college's stars so payroll grows with standing. M. Or a ceiling on what a weekly surplus becomes: tuition revenue that the board requires reinvested above a reserve. S, but a blunt rule.

### B4-11. The pacing scorecard still measures October's prestige — minor, S

**What.** `npm run natural -- --pacing` meets 63 of 114 targets (the committed scorecards with 114 rows read 76 and 86, `docs/reviews/2026-09-pacing-economy.md` and `-high-price.md`). The misses are almost all prestige and rank timing: prestige at year 50 ≥ 149.5 (`sim/pacing.ts:182`) against 118.1 now; first place at years 34–40 against 42; the top 25 at 12–16 against 27. Plan 85 moved the top of the field to about 118–121 on purpose and did not re-base these targets. `npm run sim` itself matches `sim/baseline.json` exactly.

**Why it matters.** A scorecard that fails half its rows by design stops being read, and the money row (B4-10) passes only because its unit is relative.

**Fix.** Re-base the prestige and rank targets on Plan 85's scale, and add an absolute late-cash row. S.

## For the README's ten

The three this area would rank highest:

1. **Give the strategies that differ a specialization they can reach** (B4-2, with B4-3): offer the choice by pillar as well as overall, and earlier. It is the cheapest way to turn Plan 85 into the divergence October asked for, and it fixes championships.
2. **Make small a real strategy** (B4-4, with B4-7): full credit for student quality at a size a small college reaches, and a Final Report that rewards the happiest college.
3. **Stop the clock only for choices** (B4-6, with B4-5): milestone notes and research reports as letters, and a Provost policy for instructors, so the late game is not 800 swaps and 90 stops.
