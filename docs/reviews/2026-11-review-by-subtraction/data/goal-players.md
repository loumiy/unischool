# The goal players (Pass D)

`npm run review:goals -- --goals <all seven> --seeds 12345,4242 --names Halifax --years 40 --dir node_modules/.tmp/goals-web`, at commit `5d06ae4`, `GOALS_JOBS=2` on a shared 4-core machine (14 runs, 20 min wall). **The tool labels its last column "Y50"; with `--years 40` it is the last row, Year 41.** Raw report: `unischool/node_modules/.tmp/goals-web/goals.md` (575 lines); the tables the web reads are copied below unchanged except that heading. The ablation runs that answer "can a strategy ignore a system?" are at the end.

## The seven compared, at Year 41 (last row)

| Goal | Rank | Prestige | Students | Satisfaction | Net/wk | Cash | Endowment | Courses | Schools | Placeables | Teams | Titles | Grade A share | Title (most common) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | 54 | 61 | 4160 | 62 | $2.1M | $2.8B | $380.8M | 52 | 5 | 29 | 0 | 0 | 4% | — |
| prestige | 8 | 104 | 35334 | 85 | $4.7M | $501.4M | $2.3B | 415 | 7 | 57 | 20 | 0 | 97% | — |
| satisfaction | 54 | 60 | 2085 | 83 | $159k | $3.3M | $7.9M | 129 | 2 | 17 | 0 | 0 | 81% | — |
| assets | 10 | 103 | 34960 | 85 | $1.7M | $42.2M | $34.9M | 420 | 7 | 79 | 19 | 4 | 76% | — |
| championships | 14 | 98 | 37840 | 84 | $3.3M | $347.5M | $15.7M | 420 | 7 | 66 | 19 | 32 | 84% | — |
| good-then-big | 15 | 97 | 30880 | 83 | $2.9M | $35.3M | $59.2M | 386 | 7 | 59 | 19 | 7 | 96% | — |
| big-then-good | 1 | 107 | 31634 | 87 | $4.0M | $222.8M | $402.1M | 415 | 7 | 57 | 20 | 8 | 88% | — |

## The specializations

The summer each goal was offered the choice (the top 30, or from Year 20 a pillar's top 10: Plan 95R), the pillar it chose and when; the four pillars' values at Year 50 (academics / research / student life / athletics, median), and the college's place in the research, campus-life and athletic standings.

| Goal | Offered (median, range) | Chose (runs) | Year (median, range) | Never offered | Pillars Y50 | Research / life / athletic rank Y50 | Trained professors Y50 |
|---|---|---|---|---|---|---|---|
| revenue | 20 (20–26) | research ×2 | 20 (20–26) | 0/2 | 57 / 122 / 37 / 32 | 7 / 64 / 100 | 0 |
| prestige | 20 (20–20) | academics ×2 | 20 (20–20) | 0/2 | 147 / 122 / 86 / 22 | 6 / 17 / 100 | 53 |
| satisfaction | 20 (20–20) | studentLife ×2 | 20 (20–20) | 0/2 | 68 / 32 / 93 / 22 | 74 / 7 / 100 | 0 |
| assets | 20 (20–20) | research ×2 | 20 (20–20) | 0/2 | 105 / 150 / 93 / 89 | 1 / 9 / 13 | 0 |
| championships | 20 (20–20) | athletics ×2 | 20 (20–20) | 0/2 | 97 / 79 / 102 / 147 | 31 / 4 / 1 | 24 |
| good-then-big | 20 (20–20) | academics ×2 | 20 (20–20) | 0/2 | 128 / 86 / 77 / 93 | 23 / 25 / 10 | 52 |
| big-then-good | 20 (20–24) | studentLife ×2 | 20 (20–24) | 0/2 | 120 / 122 / 135 / 89 | 6 / 2 / 12 | 0 |

**Rank**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 59 | 56 | 54 | 52 | 54 | 54 |
| prestige | 56 | 56 | 48 | 26 | 8 | 8 |
| satisfaction | 56 | 55 | 56 | 55 | 55 | 54 |
| assets | 57 | 54 | 37 | 20 | 10 | 10 |
| championships | 57 | 55 | 46 | 22 | 14 | 14 |
| good-then-big | 56 | 56 | 56 | 36 | 16 | 15 |
| big-then-good | 57 | 56 | 44 | 18 | 1 | 1 |

**Prestige**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 43 | 47 | 57 | 63 | 62 | 61 |
| prestige | 47 | 50 | 64 | 87 | 103 | 104 |
| satisfaction | 48 | 49 | 49 | 52 | 59 | 60 |
| assets | 48 | 56 | 73 | 86 | 101 | 103 |
| championships | 47 | 56 | 69 | 87 | 97 | 98 |
| good-then-big | 47 | 50 | 53 | 75 | 96 | 97 |
| big-then-good | 46 | 54 | 69 | 86 | 105 | 107 |

**Students**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 1085 | 2287 | 3576 | 4160 | 4160 | 4160 |
| prestige | 597 | 1364 | 14000 | 22647 | 34012 | 35334 |
| satisfaction | 426 | 513 | 1343 | 1928 | 2013 | 2085 |
| assets | 960 | 4480 | 15840 | 25760 | 34000 | 34960 |
| championships | 1920 | 7680 | 16880 | 25920 | 37520 | 37840 |
| good-then-big | 597 | 1364 | 2072 | 17680 | 29840 | 30880 |
| big-then-good | 1760 | 6160 | 16320 | 17313 | 28448 | 31634 |

## When each got there

The median year a marker was first reached, and in how many runs.

| Goal | 10,000 students | every need 90 | every school | final four | first | first team | first title | gave up selectivity | net $1M/wk | satisfaction 90 | top 10 | top 20 | top 25 | top 50 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | — | — | 12 (1/2) | — | — | — | — | — | 10 (2/2) | — | — | — | — | 25 (1/2) |
| prestige | 15 (2/2) | — | 15 (2/2) | — | — | 5 (2/2) | — | 9 (2/2) | 12 (2/2) | 6 (2/2) | 40 (2/2) | 33 (2/2) | 31 (2/2) | 19 (2/2) |
| satisfaction | — | 3 (2/2) | — | — | — | — | — | — | — | 4 (2/2) | — | — | — | — |
| assets | 14 (2/2) | — | 15 (2/2) | 11 (2/2) | — | 4 (2/2) | 15 (2/2) | — | 10 (2/2) | 3 (2/2) | 40 (2/2) | 30 (2/2) | 27 (2/2) | 14 (2/2) |
| championships | 12 (2/2) | — | 12 (2/2) | 8 (2/2) | — | 4 (2/2) | 12 (2/2) | — | 8 (2/2) | 3 (2/2) | — | 33 (2/2) | 30 (2/2) | 17 (2/2) |
| good-then-big | 24 (2/2) | — | 25 (2/2) | 21 (2/2) | — | 5 (2/2) | 22 (2/2) | — | 21 (2/2) | 6 (2/2) | — | 38 (1/2) | 36 (2/2) | 25 (2/2) |
| big-then-good | 13 (2/2) | — | 14 (2/2) | 11 (2/2) | 39 (1/2) | 4 (2/2) | 22 (2/2) | — | 11 (2/2) | 4 (2/2) | 34 (2/2) | 29 (2/2) | 26 (2/2) | 17 (2/2) |

## Ablations: can a strategy ignore a system?

A scratch copy of `goalPlayers.ts` (`unischool/node_modules/.tmp/ablate/goalAblate.ts`, not in the repo; game code untouched) wraps the harness's `act` to drop the named actions, to answer varsity petitions *decline*, or to refuse every club and chapter petition. 33 runs: two goals, three goal-seeds, 40 years, name Halifax. Year 41's prestige **target** (what the summers climb toward; the stock lags it by 3–14 points) and rank. One changed decision can move a single run by ~8 target points and ~6 places (the alumni row on seed 12345 blocked one campaign), so read only effects that repeat across the three columns. Raw: `unischool/node_modules/.tmp/ablate/runs/`.

| Ablation (blocked from Year 1) | big-then-good-12345: Δ target, rank | big-then-good-4242: Δ target, rank | prestige-12345: Δ target, rank |
|---|---|---|---|
| *Base (no block)* | target 121.3, #4 | target 120.7, #1 | target 108.5, #8 |
| Research: no initiatives, no landmarks | −17.6, #4→#17 | −25.7, #1→#28 | −18.6, #8→#27 |
| Varsity teams: none ever (petitions declined), department unmanaged | −15.7, #4→#12 | −9.9, #1→#9 | −3.9, #8→#13 |
| Student organizations: no clubs, chapters or teams (every petition refused), no downtown | −15.8, #4→#12 | −19.3, #1→#13 | −3.5, #8→#13 |
| Athletics department unmanaged (no coaches, venues, budget, scholarships); teams still form | −6.5, #4→#5 | −6.2, #1→#3 | −0.2, #8→#10 |
| Alumni levers: no campaign, no reunion | −8.1, #4→#10 | −0.0, #1→#1 | −4.0, #8→#11 |
| Offices: none opened | +0.0, #4→#4 | +0.0, #1→#1 | +0.0, #8→#8 |
| Seats: no Provost, no VP of Advancement | −0.3, #4→#1 | −5.1, #1→#5 | −1.5, #8→#9 |
| Treasury levers: no endowment moves, draw rate or sweep | +0.0, #4→#4 | −1.5, #1→#1 | −5.1, #8→#9 |
| Faculty training: none | −0.4, #4→#4 | −1.7, #1→#1 | −13.6, #8→#19 |

Not ablated, read from the baseline: no goal player ever plants a tree, paints a path, places a dressing or holds a reunion, and big-then-good still finishes #1. The championships player takes no promise and finishes #14.
