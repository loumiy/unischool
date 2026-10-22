# Appendix to area 4: the goal players' tables

Review III, area 4. Everything below the first rule is `goals.md` as `npm run review:goals` wrote it at `b1f2114`, unchanged: 21 games (seven goals, seeds 12345, 4242 and 777, one name, Blackmoor), fifty years each, two at a time (`GOALS_JOBS=2`) under `nice -n 10` on a two-core machine shared by six reviewers. The batch took 79 minutes of wall time. The tool was not changed for this review. [`4-strategy.md`](4-strategy.md) reads these tables.

Then, under *Area 4's own tables*, four tables the tool does not print, read from the same 21 saved runs by a script in the area's scratch directory: the body at year 50, each run's offer and Final Report, the late load, and the phased goals at year 20.

Notes on reading it:
- **`{sum}` in the promise titles** is the promise's own title template (`promiseData.ts`), as review II noted.
- **A decision in capitals** (`TRAIN_FACULTY`, `BUY_SPEED_UP` …) was sent by the harness for the player (`sim/harness/training.ts`, `speedUps.ts`), not by the goal's own rules.
- **"Modals answered"** counts the game's stops (`pendingInterrupt`), the summer once a year. It is not what a real player's "stops a year" counts (every pause of the clock); see C4-4.
- **"Rules broken"**: the championships runs' 19 lines each are an invariant that reads the complex's record without its window (C4-12), not a fault in the run.

---

Written by `npm run review:goals` (`tools/review/goalPlayers.ts`): 7 goals × 3 seeds (12345, 4242, 777) × 1 names (Blackmoor), 21 runs, 157 run-minutes. Medians across every run of a goal unless said.

## Rules broken (sim/harness/invariants.ts)

- championships seed 12345 Blackmoor: a deep run in Year 23, outside the window; a deep run in Year 24, outside the window; a deep run in Year 25, outside the window; a deep run in Year 26, outside the window; a deep run in Year 27, outside the window
- championships seed 4242 Blackmoor: a deep run in Year 23, outside the window; a deep run in Year 24, outside the window; a deep run in Year 25, outside the window; a deep run in Year 26, outside the window; a deep run in Year 27, outside the window
- championships seed 777 Blackmoor: a deep run in Year 23, outside the window; a deep run in Year 24, outside the window; a deep run in Year 25, outside the window; a deep run in Year 26, outside the window; a deep run in Year 27, outside the window

## The seven compared, at year 50

| Goal | Rank | Prestige | Students | Satisfaction | Net/wk | Cash | Endowment | Courses | Schools | Placeables | Teams | Titles | Grade A share | Title (most common) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | 57 | 61 | 4480 | 65 | $2.6M | $4.0B | $384.0M | 56 | 5 | 33 | 0 | 0 | 11% | Blackmoor University: a college known first for what its laboratories find that never fielded a team anyone feared (3/3) |
| prestige | 9 | 107 | 37120 | 85 | $6.3M | $4.6B | $3.4B | 415 | 7 | 57 | 20 | 0 | 98% | Blackmoor University: a college known first for its teaching that never fielded a team anyone feared (3/3) |
| satisfaction | 59 | 54 | 3730 | 88 | $405k | $4.7M | $12.2M | 204 | 4 | 20 | 0 | 0 | 80% | Blackmoor College: a teaching college that never fielded a team anyone feared (3/3) |
| assets | 3 | 114 | 37840 | 86 | $2.6M | $3.0B | $43.7M | 420 | 7 | 83 | 20 | 0 | 88% | Blackmoor University: a college known first for what its laboratories find that never built an endowment to match its size (3/3) |
| championships | 11 | 105 | 37840 | 81 | $4.0M | $2.5B | $46.7M | 420 | 7 | 65 | 20 | 53 | 88% | Blackmoor University: a college known first for its teams that never built an endowment to match its size (3/3) |
| good-then-big | 7 | 109 | 37120 | 84 | $2.7M | $330.0M | $162.9M | 415 | 7 | 65 | 20 | 0 | 99% | Blackmoor University: a college known first for its teaching that never built an endowment to match its size (3/3) |
| big-then-good | 1 | 118 | 37120 | 89 | $6.2M | $5.1B | $3.4B | 415 | 7 | 60 | 20 | 0 | 95% | Blackmoor University: a college known first as the place to be a student that stayed hard to get into (3/3) |

## The specializations

The summer each goal was offered the choice (the top 30, or from Year 20 a pillar's top 10: Plan 95R), the pillar it chose and when; the four pillars' values at Year 50 (academics / research / student life / athletics, median), and the college's place in the research, campus-life and athletic standings.

| Goal | Offered (median, range) | Chose (runs) | Year (median, range) | Never offered | Pillars Y50 | Research / life / athletic rank Y50 | Trained professors Y50 |
|---|---|---|---|---|---|---|---|
| revenue | 20 (20–22) | research ×3 | 20 (20–22) | 0/3 | 54 / 110 / 51 / 32 | 11 / 55 / 100 | 0 |
| prestige | 20 (20–20) | academics ×3 | 20 (20–20) | 0/3 | 134 / 122 / 98 / 32 | 8 / 11 / 100 | 66 |
| satisfaction | — | — | — | 3/3 | 70 / 32 / 79 / 32 | 79 / 23 / 100 | 0 |
| assets | 20 (20–20) | research ×3 | 20 (20–20) | 0/3 | 103 / 150 / 115 / 83 | 1 / 4 / 38 | 0 |
| championships | 20 (20–20) | athletics ×3 | 20 (20–20) | 0/3 | 101 / 79 / 115 / 147 | 34 / 4 / 1 | 0 |
| good-then-big | 36 (36–38) | academics ×3 | 36 (36–38) | 0/3 | 129 / 122 / 102 / 82 | 8 / 8 / 34 | 36 |
| big-then-good | 20 (20–24) | studentLife ×3 | 20 (20–24) | 0/3 | 120 / 122 / 135 / 84 | 8 / 3 / 34 | 0 |

## The curves

Median across runs, at years 5, 10, 20, 30, 40 and 50.

**Rank**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 60 | 57 | 55 | 52 | 54 | 56 |
| prestige | 56 | 56 | 48 | 20 | 15 | 9 |
| satisfaction | 56 | 57 | 58 | 60 | 60 | 59 |
| assets | 56 | 53 | 36 | 22 | 9 | 3 |
| championships | 56 | 55 | 44 | 23 | 17 | 12 |
| good-then-big | 56 | 56 | 58 | 42 | 27 | 8 |
| big-then-good | 57 | 55 | 43 | 18 | 2 | 1 |

**Prestige**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 43 | 48 | 58 | 62 | 62 | 61 |
| prestige | 47 | 50 | 66 | 89 | 101 | 107 |
| satisfaction | 48 | 50 | 49 | 50 | 53 | 54 |
| assets | 48 | 56 | 73 | 88 | 107 | 113 |
| championships | 47 | 57 | 68 | 86 | 97 | 104 |
| good-then-big | 47 | 50 | 53 | 74 | 89 | 108 |
| big-then-good | 46 | 54 | 70 | 91 | 112 | 118 |

**Students**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 1095 | 2143 | 3617 | 4160 | 4480 | 4480 |
| prestige | 602 | 2976 | 14480 | 24480 | 36240 | 37120 |
| satisfaction | 558 | 546 | 1027 | 1478 | 3217 | 3644 |
| assets | 1040 | 5360 | 15760 | 26880 | 36800 | 37840 |
| championships | 1840 | 7600 | 16880 | 26960 | 37440 | 37840 |
| good-then-big | 602 | 1322 | 2011 | 16880 | 28800 | 37120 |
| big-then-good | 1840 | 6720 | 16560 | 21803 | 37120 | 37120 |

**Satisfaction**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 68 | 66 | 62 | 67 | 63 | 64 |
| prestige | 89 | 89 | 92 | 90 | 85 | 86 |
| satisfaction | 87 | 90 | 89 | 88 | 90 | 91 |
| assets | 91 | 90 | 91 | 86 | 86 | 86 |
| championships | 91 | 88 | 93 | 86 | 84 | 84 |
| good-then-big | 89 | 90 | 91 | 92 | 89 | 84 |
| big-then-good | 88 | 88 | 88 | 90 | 85 | 91 |

**Net a week**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | $328k | $931k | $2.0M | $2.2M | $2.3M | $2.5M |
| prestige | $84k | $691k | $2.4M | $3.3M | $5.4M | $6.3M |
| satisfaction | $43k | $41k | $105k | $166k | $328k | $400k |
| assets | $165k | $1.0M | $1.5M | $2.2M | $2.1M | $2.6M |
| championships | $334k | $1.4M | $2.3M | $2.5M | $3.5M | $3.8M |
| good-then-big | $84k | $248k | $288k | $2.3M | $3.0M | $2.6M |
| big-then-good | $292k | $978k | $1.6M | $2.9M | $3.8M | $6.1M |

**Courses**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 22 | 45 | 52 | 52 | 56 | 56 |
| prestige | 11 | 48 | 181 | 306 | 415 | 415 |
| satisfaction | 13 | 24 | 54 | 82 | 141 | 202 |
| assets | 13 | 67 | 197 | 336 | 420 | 420 |
| championships | 23 | 95 | 211 | 337 | 420 | 420 |
| good-then-big | 11 | 47 | 92 | 211 | 360 | 415 |
| big-then-good | 23 | 84 | 207 | 339 | 415 | 415 |

## When each got there

The median year a marker was first reached, and in how many runs.

| Goal | 10,000 students | every asset open to it | every need 90 | every school | final four | first | first team | first title | gave up selectivity | net $1M/wk | satisfaction 90 | top 10 | top 20 | top 25 | top 50 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | — | — | — | 12 (1/3) | — | — | — | — | — | 11 (3/3) | — | — | — | — | 22 (1/3) |
| prestige | 15 (3/3) | — | — | 16 (3/3) | — | — | 5 (3/3) | — | 9 (3/3) | 11 (3/3) | 3 (3/3) | 43 (2/3) | 30 (3/3) | 28 (3/3) | 20 (3/3) |
| satisfaction | — | — | 2 (3/3) | — | — | — | — | — | — | — | 4 (3/3) | — | — | — | — |
| assets | 14 (3/3) | 43 (3/3) | — | 17 (3/3) | 10 (3/3) | 46 (1/3) | 4 (3/3) | 13 (1/3) | — | 10 (3/3) | 5 (3/3) | 40 (3/3) | 32 (3/3) | 28 (3/3) | 14 (3/3) |
| championships | 12 (3/3) | — | — | 12 (3/3) | 9 (3/3) | — | 5 (3/3) | 21 (3/3) | — | 9 (3/3) | 4 (3/3) | 46 (2/3) | 32 (3/3) | 30 (3/3) | 16 (3/3) |
| good-then-big | 24 (3/3) | — | — | 26 (3/3) | 21 (3/3) | — | 5 (3/3) | — | — | 21 (3/3) | 3 (3/3) | 48 (3/3) | 44 (3/3) | 41 (3/3) | 28 (3/3) |
| big-then-good | 13 (3/3) | — | — | 14 (3/3) | 13 (3/3) | 45 (3/3) | 5 (3/3) | 17 (1/3) | — | 10 (3/3) | 21 (3/3) | 36 (3/3) | 30 (3/3) | 27 (3/3) | 16 (3/3) |

## Flagships on full scholarships

Years from putting a chosen flagship on full scholarships to its first final four (the fastest of its flagships; a run whose flagships never got there counts as never). Plan 80G's target is eight to twelve, median across runs.

| Run | Flagships (year chosen → first final four) | Years |
|---|---|---|
| championships 12345 Blackmoor | waterPolo-m Y5 → Y11; fieldHockey Y8 → Y9; basketball-w Y23 → Y23; soccer-m Y23 → Y23 | 0 |
| championships 4242 Blackmoor | soccer-w Y6 → Y8; lacrosse-m Y10 → Y11; swimming-w Y23 → Y23; volleyball-m Y23 → Y24 | 0 |
| championships 777 Blackmoor | iceHockey-w Y8 → Y9; volleyball-m Y8 → Y9; waterPolo-m Y23 → Y23; basketball-m Y23 → Y23 | 0 |

Median: 0 years (3/3 runs reached a final four).

## Programs cut

The championships player cuts a program that has missed the postseason five times (Plan 95V).

| Run | Programs cut |
|---|---|
| championships 12345 Blackmoor | none |
| championships 4242 Blackmoor | track-w Y40 |
| championships 777 Blackmoor | track-m Y34 |

2 of 3 runs cut a program.

## revenue

**The Final Report.** Marks: D ×3. Titles: *Blackmoor University: a college known first for what its laboratories find that never fielded a team anyone feared*.

Axis grades (median mean score): Academics 35, Research 63, Student life 35, Athletics 0, Access 56, Financial strength 81.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| research-deep | 463 | 16 | The deepest initiative carries the largest grant. |
| restaff | 43 | 4 | A course went dark when its teacher left; restaffing it keeps its seats. |
| hire-for-offer | 40 | 9 | An offered program needs its first instructor. |
| found-program | 29 | 6 | A new program adds seats, and the next student pays more than they cost. |
| move-home | 16 | 3 | A program away from its school earns nothing extra; home is where the game suggests. |
| develop-course | 14 | 4 | The class filled the room: seats are revenue. |
| lab | 11 | 5 | A lab's grants return about twice what its initiatives cost. |
| decline-offer | 8 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| crowding | 7 | 2 | Crowding shrinks next year's pool steeply. |
| dorm | 7 | 1 | Beds keep the pool full and the crowding penalty away. |
| hire-for-course | 6 | 4 | A course waits on a field nobody on the roster can take. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| campaign | 3 | 1 | A campaign the alumni would answer: money raised rather than earned. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x and answers the academic routine. |
| appoint-advancement | 1 | 1 | A VP of Advancement runs the campaigns that bring money in. |
| trim-maintenance | 1 | 1 | Maintenance at 90% trims a cost line; the backlog grows slowly. |
| draw-max | 1 | 1 | The endowment pays out more at the top of the draw range: income now. |
| sweep | 1 | 1 | Idle cash earns nothing; swept into the endowment it pays out. |

**Instructor swaps over the run** (median): the player's own 0, the Provost's on Staff for the A 7.

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 408 | 13 | 520 |
| 11–20 | 430 | 9 | 520 |
| 21–30 | 460 | 11 | 520 |
| 31–40 | 446 | 11 | 520 |
| 41–50 | 438 | 12 | 520 |

**Repeated more than ten times in a year:** research-deep (24 years).

Modals answered over the run (median): 81. By type (median over runs): letter 9, summer 50, decision-event 5, catalogue-letter 16, specialization 1, rankings-entry 0.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| see demand before pricing | 3/3 | 27 | 12 | Last year's price change lost income; the price is set blind, so the only test is a year. |

Promises taken (all runs): {sum} in the fund ×3, Not one building on the list ×3, {sum} in the fund, and more to come ×3.

## prestige

**The Final Report.** Marks: C ×3. Titles: *Blackmoor University: a college known first for its teaching that never fielded a team anyone feared*.

Axis grades (median mean score): Academics 64, Research 63, Student life 71, Athletics 0, Access 44, Financial strength 44.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| develop-course | 413 | 20 | Every course a finished major needs raises breadth, once it can be taught. |
| research-deep | 284 | 13 | Depth: a landmark program is worth more to research standing than two small ones. |
| TRAIN_FACULTY | 141 | 8 |  |
| tend-teaching | 120 | 10 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| hire-for-course | 51 | 5 | A course waits on a field nobody on the roster can take. |
| restaff | 44 | 7 | A course went dark when its teacher left; restaffing it keeps its seats. |
| found-program | 41 | 8 | Breadth is the heaviest input (50). |
| crowding | 21 | 3 | Crowding is subtracted from the academic target. |
| hire-for-offer | 21 | 7 | An offered program needs its first instructor. |
| lab | 18 | 6 | Research standing and the academic research input need labs. |
| move-home | 17 | 5 | A school gathered in its hall is what concentration counts. |
| post-search | 15 | 2 | Nobody in the field is listed; a paid search finds someone. |
| found-graduate | 12 | 5 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| extend-basicNeeds | 9 | 3 | Another floor on a standing building is the cheapest way to raise basicNeeds. |
| decline-offer | 7 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| BUY_SPEED_UP | 5 | 1 |  |
| build-basicNeeds | 4 | 2 | Welfare is graded on the year's average satisfaction. |

**Instructor swaps over the run** (median): the player's own 0, the Provost's on Staff for the A 354.

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 410 | 20 | 520 |
| 11–20 | 288 | 13 | 520 |
| 21–30 | 288 | 13 | 520 |
| 31–40 | 314 | 14 | 520 |
| 41–50 | 404 | 17 | 520 |

**Repeated more than ten times in a year:** develop-course (19 years), research-deep (6 years).

Modals answered over the run (median): 123. By type (median over runs): letter 8, summer 50, first-sport-club 1, decision-event 49, catalogue-letter 12, athletic-director 1, specialization 1, rankings-entry 1.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| a way up for a small college | 3/3 | 9 | 1 | Prestige moved 1.6 in 4 summers of selective admissions; the standing says why in pillars, but a small college has no pillar it can raise without growing. |

Promises taken (all runs): A name people know ×3, Turning people away ×3.

## satisfaction

**The Final Report.** Marks: F ×3. Titles: *Blackmoor College: a teaching college that never fielded a team anyone feared*.

Axis grades (median mean score): Academics 39, Research 21, Student life 69, Athletics 0, Access 38, Financial strength 6.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| develop-course | 182 | 13 | Courses add seats; a crowded class is a crowded campus. |
| tend-teaching | 75 | 8 | Academic satisfaction reads every course's grade against what the students expect. |
| hire-for-course | 37 | 6 | A course waits on a field nobody on the roster can take. |
| found-program | 25 | 6 | Programs add seats and study places; the college grows at the pace it can house. |
| restaff | 11 | 4 | A course went dark when its teacher left; restaffing it keeps its seats. |
| hire-for-offer | 9 | 5 | An offered program needs its first instructor. |
| move-home | 9 | 4 | Programs at home. |
| decline-offer | 7 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| crowding | 5 | 2 | Crowding is the one thing this college never allows. |
| build-social | 4 | 4 | Social space is a need too. |
| extend-basicNeeds | 4 | 1 | Another floor on a standing building is the cheapest way to raise basicNeeds. |
| site-hall | 4 | 1 | A program is on offer and no hall has a slot for it. |
| amenity | 3 | 1 | A campus that looks cared for is one students like. |
| post-search | 3 | 1 | Nobody in the field is listed; a paid search finds someone. |
| extend-housing | 3 | 1 | Another floor on a standing building is the cheapest way to raise housing. |
| build-basicNeeds | 2 | 1 | The lowest need this term is basicNeeds. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x. |
| appoint-dean-of-students | 1 | 1 | A Dean of Students answers the student routine by what lands best. |

**Instructor swaps over the run** (median): the player's own 0, the Provost's on Staff for the A 157.

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 464 | 18 | 520 |
| 11–20 | 460 | 18 | 520 |
| 21–30 | 452 | 15 | 520 |
| 31–40 | 413 | 18 | 520 |
| 41–50 | 409 | 19 | 520 |

**Repeated more than ten times in a year:** develop-course (2 years).

Modals answered over the run (median): 110. By type (median over runs): letter 7, summer 50, first-sport-club 1, decision-event 39, catalogue-letter 13.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| raise academic | 1/3 | 32 | 3 | academic is 88 and nothing on the build menu serves it — the chain is built out or gated. |
| shrink the student body | 1/3 | 48 | 1 | Even the smallest class leaves a need short: the body on the books is already too big for the campus, and nothing but attrition can shrink it. |

Promises taken (all runs): A campus worth the photograph ×3.

## assets

**The Final Report.** Marks: B ×3. Titles: *Blackmoor University: a college known first for what its laboratories find that never built an endowment to match its size*.

Axis grades (median mean score): Academics 54, Research 64, Student life 75, Athletics 37, Access 42, Financial strength 2.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| develop-course | 421 | 18 | A distinguished school opens its graduate project. |
| research-cheap | 420 | 23 | The Research Park waits on every standing lab having seen an initiative through (and, since Plan 85F, on a specialization in research). |
| tend-teaching | 188 | 9 | Keep the teaching up. |
| HIRE_COACH | 84 | 9 |  |
| build-next-asset | 76 | 10 | The cheapest asset on the menu; borrow for it if cash is short. |
| SET_TEAM_ORDER | 48 | 4 |  |
| restaff | 48 | 6 | A course went dark when its teacher left; restaffing it keeps its seats. |
| hire-for-course | 45 | 3 | A course waits on a field nobody on the roster can take. |
| found-program | 40 | 10 | Schools founded open their labs and, distinguished, the graduate projects. |
| hire-coach | 28 | 6 | An empty coaching chair scores at the floor. |
| move-home | 24 | 6 | Schools founded open labs and graduate projects. |
| hire-for-offer | 23 | 6 | An offered program needs its first instructor. |
| FIRE_COACH | 21 | 6 |  |
| found-graduate | 14 | 5 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| START_INITIATIVE | 12 | 2 |  |
| decline-offer | 7 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| post-search | 7 | 2 | Nobody in the field is listed; a paid search finds someone. |
| SET_SCHOLARSHIPS | 6 | 6 |  |

**Instructor swaps over the run** (median): the player's own 0, the Provost's on Staff for the A 602.

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 362 | 16 | 520 |
| 11–20 | 223 | 12 | 520 |
| 21–30 | 274 | 10 | 520 |
| 31–40 | 301 | 14 | 520 |
| 41–50 | 330 | 14 | 520 |

**Repeated more than ten times in a year:** develop-course (22 years), research-cheap (23 years).

Modals answered over the run (median): 147. By type (median over runs): letter 9, summer 50, first-sport-club 1, decision-event 70, athletic-director 1, catalogue-letter 14, championship 0, rankings-entry 1, specialization 1.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| build every specialization's building | 3/3 | 21 | 31 | The choice is for good: The Faculty Training Institute, The Athletic Performance Complex can never stand on this campus. |
| build what is locked | 3/3 | 26 | 12 | Everything on the menu stands; 8 assets are still gated (Beacon Tower, Horizon Tower, Aurora Tower…) by enrolment, prestige or a school. |

Promises taken (all runs): A campus worth the photograph ×3, Twelve structures, and still a beautiful campus ×3, A great project raised ×3, Four schools ×1.

## championships

**The Final Report.** Marks: B ×3. Titles: *Blackmoor University: a college known first for its teams that never built an endowment to match its size*.

Axis grades (median mean score): Academics 53, Research 39, Student life 74, Athletics 64, Access 46, Financial strength 1.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| develop-course | 421 | 19 | Seats are students, and students fill stands. |
| tend-teaching | 189 | 10 | Keep the teaching up. |
| replace-coach | 140 | 12 | A listed coach would outgrow the incumbent by fifteen points or more. |
| hire-coach | 93 | 9 | An empty coaching chair scores at the floor. |
| team-order | 69 | 4 | The chosen flagships first on the list, the strongest of the rest below them. |
| restaff | 46 | 5 | A course went dark when its teacher left; restaffing it keeps its seats. |
| found-program | 41 | 7 | Programs grow the college that pays for the department. |
| hire-for-course | 39 | 4 | A course waits on a field nobody on the roster can take. |
| academics | 37 | 14 | A college in the top twenty can specialize in athletics: the academic core gets it there. |
| hire-for-offer | 27 | 6 | An offered program needs its first instructor. |
| move-home | 16 | 3 | Programs at home. |
| dorm | 12 | 2 | Beds keep the pool full. |
| crowding | 10 | 2 | Crowding shrinks the pool that pays for athletics. |
| expand-venue | 10 | 2 | A bigger venue is a bigger gate, and the gate is the department's pot. |
| decline-offer | 7 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| rec | 5 | 1 | Recreation facilities are where a sporting culture starts. |
| venue-for-team | 5 | 1 | A varsity team waits on its venue; it cannot compete until it stands. |

**Instructor swaps over the run** (median): the player's own 0, the Provost's on Staff for the A 490.

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 340 | 17 | 520 |
| 11–20 | 334 | 17 | 520 |
| 21–30 | 314 | 21 | 520 |
| 31–40 | 306 | 26 | 520 |
| 41–50 | 385 | 32 | 520 |

**Repeated more than ten times in a year:** develop-course (18 years), replace-coach (2 years), academics (1 years).

Modals answered over the run (median): 185. By type (median over runs): letter 8, summer 50, first-sport-club 1, decision-event 61, athletic-director 1, catalogue-letter 13, championship 53, rankings-entry 1, specialization 1.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| found a team | 3/3 | 4 | 91 | No varsity program yet: a team can only come from a student sport club, three years old, petitioning in the summer — there is no way to start one. |
| recruit athletes | 3/3 | 20 | 9 | Every chair is filled and the budget is at its top; Women's Swim & Dive Team still scores 69, and only a flagship can recruit. |

## good-then-big

**The Final Report.** Marks: B ×2, C ×1. Titles: *Blackmoor University: a college known first for its teaching that never built an endowment to match its size*.

Axis grades (median mean score): Academics 53, Research 47, Student life 71, Athletics 23, Access 42, Financial strength 7.

Switched strategy in year 21.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| research-cheap | 518 | 27 | Keep the labs busy, cheaply. |
| develop-course | 413 | 21 | Every course a finished major needs raises breadth, once it can be taught. |
| tend-teaching | 138 | 9 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| hire-coach | 56 | 24 | An empty coaching chair scores at the floor. |
| TRAIN_FACULTY | 55 | 6 |  |
| hire-for-course | 45 | 5 | A course waits on a field nobody on the roster can take. |
| HIRE_COACH | 39 | 9 |  |
| found-program | 38 | 9 | Breadth is the heaviest input (50). |
| SET_TEAM_ORDER | 31 | 4 |  |
| hire-for-offer | 25 | 5 | An offered program needs its first instructor. |
| restaff | 25 | 5 | A course went dark when its teacher left; restaffing it keeps its seats. |
| move-home | 18 | 5 | A school gathered in its hall is what concentration counts. |
| lab | 18 | 7 | Research standing and the academic research input need labs. |
| found-graduate | 15 | 5 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| crowding | 13 | 2 | Crowding is subtracted from the academic target. |
| dorm | 12 | 2 | Beds keep the pool full. |
| post-search | 10 | 1 | Nobody in the field is listed; a paid search finds someone. |
| FIRE_COACH | 10 | 3 |  |

**Instructor swaps over the run** (median): the player's own 0, the Provost's on Staff for the A 451.

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 426 | 19 | 520 |
| 11–20 | 439 | 20 | 520 |
| 21–30 | 234 | 10 | 520 |
| 31–40 | 228 | 9 | 520 |
| 41–50 | 282 | 11 | 520 |

**Repeated more than ten times in a year:** research-cheap (24 years), develop-course (17 years), hire-coach (1 years).

Modals answered over the run (median): 129. By type (median over runs): letter 8, summer 50, first-sport-club 1, decision-event 53, catalogue-letter 12, athletic-director 1, rankings-entry 1, specialization 1.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| stay small on purpose | 3/3 | 9 | 12 | Twelve programs and the offers keep coming; the only way to stay small is to ignore them. |

Promises taken (all runs): Two thousand students ×3, A name people know ×3, Four schools ×2, Turning people away ×3, Twenty programs in the catalog ×1.

## big-then-good

**The Final Report.** Marks: B ×3. Titles: *Blackmoor University: a college known first as the place to be a student that stayed hard to get into*.

Axis grades (median mean score): Academics 56, Research 60, Student life 78, Athletics 36, Access 44, Financial strength 29.

Switched strategy in year 21.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| develop-course | 413 | 21 | Seats are the ceiling on enrolment. |
| research-deep | 219 | 17 | Depth: a landmark program is worth more to research standing than two small ones. |
| tend-teaching | 181 | 30 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| research-cheap | 124 | 24 | Keep the labs busy, cheaply. |
| HIRE_COACH | 62 | 13 |  |
| hire-for-course | 56 | 4 | A course waits on a field nobody on the roster can take. |
| SET_TEAM_ORDER | 53 | 4 |  |
| found-program | 39 | 6 | Every program adds seats: grow. |
| RESOLVE_CATALOGUE_EVENT | 34 | 2 |  |
| hire-coach | 31 | 6 | An empty coaching chair scores at the floor. |
| hire-for-offer | 24 | 6 | An offered program needs its first instructor. |
| crowding | 19 | 2 | Growth stalls if the pool shrinks from crowding. |
| move-home | 18 | 4 | Programs at home. |
| lab | 18 | 6 | Labs and projects as they open. |
| restaff | 18 | 4 | A course went dark when its teacher left; restaffing it keeps its seats. |
| FIRE_COACH | 17 | 4 |  |
| post-search | 14 | 2 | Nobody in the field is listed; a paid search finds someone. |
| found-graduate | 11 | 4 | A graduate program its host offers: breadth and the grad-school bound applicants. |

**Instructor swaps over the run** (median): the player's own 0, the Provost's on Staff for the A 683.

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 356 | 17 | 520 |
| 11–20 | 254 | 12 | 520 |
| 21–30 | 242 | 16 | 520 |
| 31–40 | 300 | 14 | 520 |
| 41–50 | 393 | 21 | 520 |

**Repeated more than ten times in a year:** develop-course (17 years), research-deep (3 years), tend-teaching (4 years), research-cheap (4 years), HIRE_COACH (1 years).

Modals answered over the run (median): 137. By type (median over runs): letter 8, summer 50, decision-event 59, first-sport-club 1, catalogue-letter 15, athletic-director 1, rankings-entry 1, championship 0, specialization 1.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| more seats now | 3/3 | 1 | 36 | The class fills every seat and no course can be started this week: the committee's seats, the faculty market or the hall slots are the ceiling on growth, not money. |
| shrink the student body | 2/3 | 42 | 1 | The body is bigger than the catalogue seats; only graduation shrinks it. |

Promises taken (all runs): Turning people away ×2, A name people know ×3, Four schools ×1.

## Do the goals make different colleges?

Each college at year 50 as 8 features scaled to 0–1 (students, prestige, satisfaction, courses, teams, placeables, price ratio, research); the distance between two goals' medians (0 = the same college; 1 = very different).

| | revenue | prestige | satisfaction | assets | championships | good-then-big | big-then-good |
|---|---|---|---|---|---|---|---|
| revenue | 0.00 | 0.63 | 0.35 | 0.66 | 0.70 | 0.64 | 0.64 |
| prestige | 0.63 | 0.00 | 0.67 | 0.08 | 0.32 | 0.09 | 0.03 |
| satisfaction | 0.35 | 0.67 | 0.00 | 0.68 | 0.60 | 0.64 | 0.67 |
| assets | 0.66 | 0.08 | 0.68 | 0.00 | 0.29 | 0.08 | 0.07 |
| championships | 0.70 | 0.32 | 0.60 | 0.29 | 0.00 | 0.23 | 0.31 |
| good-then-big | 0.64 | 0.09 | 0.64 | 0.08 | 0.23 | 0.00 | 0.09 |
| big-then-good | 0.64 | 0.03 | 0.67 | 0.07 | 0.31 | 0.09 | 0.00 |

The same, on the four pillars alone (academics, research, student life, athletics, each over 150): the shape of the college's standing (Plan 85).

| | revenue | prestige | satisfaction | assets | championships | good-then-big | big-then-good |
|---|---|---|---|---|---|---|---|
| revenue | 0.00 | 0.31 | 0.28 | 0.34 | 0.48 | 0.35 | 0.40 |
| prestige | 0.31 | 0.00 | 0.37 | 0.23 | 0.43 | 0.17 | 0.22 |
| satisfaction | 0.28 | 0.37 | 0.00 | 0.46 | 0.44 | 0.40 | 0.43 |
| assets | 0.34 | 0.23 | 0.46 | 0.00 | 0.32 | 0.14 | 0.13 |
| championships | 0.48 | 0.43 | 0.44 | 0.32 | 0.00 | 0.28 | 0.27 |
| good-then-big | 0.35 | 0.17 | 0.40 | 0.14 | 0.28 | 0.00 | 0.11 |
| big-then-good | 0.40 | 0.22 | 0.43 | 0.13 | 0.27 | 0.11 | 0.00 |

---

## Area 4's own tables

### The body at year 50 (median of the runs)

| Goal | Runs | Students | Courses (grad) | Programs | Schools | Placeables | Teams | Titles | Faculty | Pillars (acad / res / life / ath) | Lead pillar | Cash | Endowment |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | 3 | 4,480 | 56 (0) | 42 | 5 | 33 | 0 | 0 | 31 | 54 / 110 / 51 / 32 | research | $4.0B | $384M |
| prestige | 3 | 37,120 | 415 (49) | 51 | 7 | 57 | 20 | 0 | 88 | 134 / 122 / 98 / 32 | academics | $4.6B | $3.4B |
| satisfaction | 3 | 3,730 | 204 (0) | 30 | 4 | 20 | 0 | 0 | 49 | 70 / 32 / 79 / 32 | student life | $5M | $12M |
| assets | 3 | 37,840 | 420 (53) | 52 | 7 | 83 | 20 | 0 | 94 | 103 / 150 / 115 / 83 | research | $3.0B | $44M |
| championships | 3 | 37,840 | 420 (53) | 52 | 7 | 65 | 20 | 53 | 86 | 101 / 79 / 115 / 147 | athletics | $2.6B | $47M |
| good-then-big | 3 | 37,120 | 415 (49) | 51 | 7 | 65 | 20 | 0 | 81 | 129 / 122 / 102 / 82 | academics | $333M | $163M |
| big-then-good | 3 | 37,120 | 415 (49) | 51 | 7 | 60 | 20 | 0 | 90 | 120 / 122 / 135 / 84 | student life | $5.1B | $3.4B |

### Each run: the offer, the pick, the Final Report

| Goal | Seed | Offered | Chose (year) | Y50 rank | Prestige | Mark | Title |
|---|---|---|---|---|---|---|---|
| revenue | 777 | 20 | research (20) | 57 | 61.6 | D | a college known first for what its laboratories find that never fielded a team anyone feared |
| revenue | 4242 | 20 | research (20) | 58 | 60.4 | D | a college known first for what its laboratories find that never fielded a team anyone feared |
| revenue | 12345 | 22 | research (22) | 57 | 60.6 | D | a college known first for what its laboratories find that never fielded a team anyone feared |
| prestige | 777 | 20 | academics (20) | 12 | 107.1 | C | a college known first for its teaching that never fielded a team anyone feared |
| prestige | 4242 | 20 | academics (20) | 9 | 106.1 | C | a college known first for its teaching that never fielded a team anyone feared |
| prestige | 12345 | 20 | academics (20) | 6 | 106.7 | C | a college known first for its teaching that never fielded a team anyone feared |
| satisfaction | 777 | never | — | 59 | 53.9 | F | a teaching college that never fielded a team anyone feared |
| satisfaction | 4242 | never | — | 61 | 53.8 | F | a teaching college that never fielded a team anyone feared |
| satisfaction | 12345 | never | — | 56 | 56.3 | F | a teaching college that never fielded a team anyone feared |
| assets | 777 | 20 | research (20) | 4 | 112.4 | B | a college known first for what its laboratories find that never built an endowment to match its size |
| assets | 4242 | 20 | research (20) | 3 | 113.5 | B | a college known first for what its laboratories find that never built an endowment to match its size |
| assets | 12345 | 20 | research (20) | 1 | 116.4 | B | a college known first for what its laboratories find that never built an endowment to match its size |
| championships | 777 | 20 | athletics (20) | 11 | 104.7 | B | a college known first for its teams that never built an endowment to match its size |
| championships | 4242 | 20 | athletics (20) | 12 | 104.5 | B | a college known first for its teams that never built an endowment to match its size |
| championships | 12345 | 20 | athletics (20) | 9 | 104.8 | B | a college known first for its teams that never built an endowment to match its size |
| good-then-big | 777 | 36 | academics (36) | 4 | 108.8 | B | a college known first for its teaching that never built an endowment to match its size |
| good-then-big | 4242 | 36 | academics (36) | 7 | 109.8 | B | a college known first for its teaching that never built an endowment to match its size |
| good-then-big | 12345 | 38 | academics (38) | 8 | 109.2 | C | a college known first for its teaching that never built an endowment to match its size |
| big-then-good | 777 | 24 | studentLife (24) | 1 | 118.3 | B | a college known first as the place to be a student that stayed hard to get into |
| big-then-good | 4242 | 20 | studentLife (20) | 1 | 118.5 | B | a college known first as the place to be a student that stayed hard to get into |
| big-then-good | 12345 | 20 | studentLife (20) | 1 | 119.8 | B | a college known first as the place to be a student that stayed hard to get into |

### The late load (years 30–50, medians per year)

| Goal | Stops a year | Of which summer beats | Decision events | Player decisions a year | Idle weeks a year | Player swaps (run) | Provost swaps (run) |
|---|---|---|---|---|---|---|---|
| revenue | 1.5 | 1.0 | 0.0 | 13 | 44 | 0 | 7 |
| prestige | 2.2 | 1.0 | 1.0 | 23 | 36 | 0 | 354 |
| satisfaction | 2.4 | 1.0 | 1.2 | 11 | 41 | 0 | 157 |
| assets | 2.7 | 1.0 | 1.4 | 30 | 31 | 0 | 602 |
| championships | 4.0 | 1.0 | 1.0 | 22 | 34 | 0 | 490 |
| good-then-big | 2.6 | 1.0 | 1.3 | 46 | 25 | 0 | 451 |
| big-then-good | 2.3 | 1.0 | 1.0 | 22 | 34 | 0 | 683 |

### The phased goals at year 20

| Goal | Seed | Students | Prestige | Rank | Courses | Programs |
|---|---|---|---|---|---|---|
| good-then-big | 777 | 2,011 | 53.1 | 56 | 92 | 12 |
| good-then-big | 4242 | 1,564 | 49.6 | 58 | 90 | 12 |
| good-then-big | 12345 | 2,064 | 52.8 | 58 | 96 | 12 |
| big-then-good | 777 | 16,560 | 70.0 | 43 | 207 | 42 |
| big-then-good | 4242 | 16,160 | 69.4 | 47 | 202 | 42 |
| big-then-good | 12345 | 17,040 | 71.0 | 41 | 213 | 42 |
| prestige | 777 | 14,480 | 66.3 | 47 | 181 | 42 |
| prestige | 4242 | 14,800 | 66.2 | 48 | 185 | 42 |
| prestige | 12345 | 13,920 | 64.1 | 52 | 174 | 42 |

### Wants (levers asked for), every run

| Goal | Want | Runs | First year (median) | Weeks (median) |
|---|---|---|---|---|
| revenue | see demand before pricing | 3/3 | 27 | 12 |
| prestige | a way up for a small college | 3/3 | 9 | 1 |
| satisfaction | raise academic | 1/3 | 32 | 3 |
| satisfaction | shrink the student body | 1/3 | 48 | 1 |
| assets | build every specialization's building | 3/3 | 21 | 31 |
| assets | build what is locked | 3/3 | 26 | 12 |
| championships | found a team | 3/3 | 4 | 91 |
| championships | recruit athletes | 3/3 | 20 | 9 |
| good-then-big | stay small on purpose | 3/3 | 9 | 12 |
| big-then-good | more seats now | 3/3 | 1 | 36 |
| big-then-good | shrink the student body | 2/3 | 42 | 1 |

