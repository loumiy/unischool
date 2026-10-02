# Appendix to area 4: the goal players' tables

Plan 86, area 4. The tables below are `goals.md` as `npm run review:goals` wrote it at commit `4062bfb` (with this area's changes to `tools/review/goalPlayers.ts`, listed in `4-strategy.md`'s *As run*): 70 games (seven goals, five seeds, two names), fifty years each. `4-strategy.md` reads them. The run took 27 minutes on a shared four-core machine, three games at a time (`GOALS_JOBS=3`). Rerun the command to regenerate this file after a change.

Two notes on reading it:
- **`{sum}` in the promise titles** is the promise's own title template (`promiseData.ts`), which the game fills when it offers the promise; the report prints the raw title.
- **A decision in capitals** (`TRAIN_FACULTY`, `HIRE_COACH`, `SET_TEAM_ORDER` …) is an action the harness sent for the player (`sim/harness/training.ts`, `athletics.ts`), not one of the goal's own rules, so it has no reason beside it.

Written by `npm run review:goals` (`tools/review/goalPlayers.ts`): 7 goals × 5 seeds (12345, 4242, 777, 31337, 2026) × 2 names (Blackmoor, Saint Aldric), 70 runs, 79 run-minutes. Medians across every run of a goal unless said.

## The seven compared, at year 50

| Goal | Rank | Prestige | Students | Satisfaction | Net/wk | Cash | Endowment | Courses | Schools | Placeables | Teams | Titles | Grade A share | Title (most common) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | 56 | 61 | 4800 | 63 | $2.7M | $4.0B | $383.9M | 60 | 7 | 34 | 0 | 0 | 2% | Blackmoor University: a research powerhouse that never fielded a team anyone feared (5/10) |
| prestige | 11 | 104 | 33840 | 88 | $6.0M | $5.7B | $3.2B | 374 | 7 | 57 | 20 | 0 | 88% | Blackmoor University: a college known first for its teaching that never fielded a team anyone feared (5/10) |
| satisfaction | 62 | 51 | 3330 | 86 | $298k | $3.3M | $12.3M | 141 | 2 | 19 | 0 | 0 | 31% | Saint Aldric College: a college with a campus life to envy that never fielded a team anyone feared (3/10) |
| assets | 3 | 110 | 34480 | 86 | $2.1M | $1.7B | $78.7M | 378 | 7 | 82 | 20 | 1 | 72% | Blackmoor University: a college known first for what its laboratories find that never built an endowment to match its size (5/10) |
| championships | 50 | 72 | 25760 | 89 | $4.0M | $4.5B | $63.5M | 322 | 7 | 45 | 20 | 0 | 61% | Blackmoor College: a party school that never built an endowment to match its size (5/10) |
| good-then-big | 17 | 98 | 33840 | 87 | $3.0M | $94.4M | $52.6M | 374 | 7 | 61 | 20 | 0 | 54% | Blackmoor University: an athletics school that never built an endowment to match its size (3/10) |
| big-then-good | 5 | 110 | 33840 | 91 | $4.8M | $1.2B | $2.8B | 374 | 7 | 60 | 20 | 0 | 74% | Blackmoor University: a college known first as the place to be a student that never opened its doors very wide (5/10) |

## The specializations

The pillar each goal chose at the milestone (the top 20) and when; the four pillars' values at Year 50 (academics / research / student life / athletics, median), and the college's place in the research, campus-life and athletic standings.

| Goal | Chose (runs) | Year (median, range) | Never offered | Pillars Y50 | Research / life / athletic rank Y50 | Trained professors Y50 |
|---|---|---|---|---|---|---|
| revenue | — | — | 10/10 | 51 / 116 / 48 / 32 | 9 / 52 / 100 | 0 |
| prestige | academics ×10 | 41 (34–47) | 0/10 | 138 / 122 / 95 / 32 | 8 / 12 / 100 | 25 |
| satisfaction | — | — | 10/10 | 61 / 32 / 77 / 32 | 78 / 23 / 100 | 0 |
| assets | research ×10 | 39 (30–41) | 0/10 | 101 / 150 / 115 / 83 | 1 / 4 / 35 | 0 |
| championships | — | — | 10/10 | 79 / 38 / 89 / 84 | 73 / 15 / 31 | 0 |
| good-then-big | academics ×6 | 47 (45–50) | 4/10 | 113 / 122 / 100 / 80 | 8 / 8 / 40 | 0 |
| big-then-good | studentLife ×10 | 43 (38–47) | 0/10 | 117 / 122 / 127 / 83 | 8 / 3 / 39 | 0 |

## The curves

Median across runs, at years 5, 10, 20, 30, 40 and 50.

**Rank**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 64 | 62 | 54 | 53 | 55 | 56 |
| prestige | 58 | 61 | 53 | 29 | 21 | 12 |
| satisfaction | 57 | 57 | 60 | 62 | 61 | 62 |
| assets | 57 | 56 | 43 | 26 | 18 | 4 |
| championships | 58 | 56 | 52 | 50 | 48 | 50 |
| good-then-big | 58 | 58 | 58 | 53 | 35 | 18 |
| big-then-good | 61 | 59 | 51 | 31 | 22 | 6 |

**Prestige**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 40 | 42 | 58 | 62 | 61 | 61 |
| prestige | 45 | 43 | 61 | 82 | 92 | 103 |
| satisfaction | 46 | 47 | 48 | 48 | 48 | 50 |
| assets | 46 | 50 | 70 | 86 | 96 | 109 |
| championships | 44 | 50 | 62 | 68 | 72 | 72 |
| good-then-big | 45 | 46 | 48 | 62 | 82 | 97 |
| big-then-good | 42 | 45 | 64 | 82 | 92 | 108 |

**Students**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 1458 | 3360 | 4480 | 4800 | 4694 | 4800 |
| prestige | 511 | 3486 | 15280 | 25120 | 33840 | 33840 |
| satisfaction | 557 | 548 | 1107 | 1580 | 1754 | 3336 |
| assets | 1440 | 6400 | 16560 | 27280 | 34480 | 34480 |
| championships | 1920 | 7120 | 17600 | 25760 | 25760 | 25760 |
| good-then-big | 511 | 834 | 948 | 14240 | 23920 | 33600 |
| big-then-good | 1840 | 5021 | 16160 | 10947 | 21317 | 33840 |

**Satisfaction**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 60 | 60 | 63 | 62 | 62 | 62 |
| prestige | 86 | 85 | 83 | 85 | 86 | 88 |
| satisfaction | 86 | 88 | 87 | 87 | 87 | 86 |
| assets | 88 | 88 | 87 | 84 | 86 | 87 |
| championships | 90 | 86 | 91 | 88 | 90 | 89 |
| good-then-big | 86 | 88 | 87 | 82 | 87 | 88 |
| big-then-good | 85 | 83 | 86 | 85 | 86 | 90 |

**Net a week**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | $368k | $641k | $2.1M | $2.6M | $2.5M | $2.6M |
| prestige | $63k | $634k | $2.6M | $4.0M | $5.9M | $5.9M |
| satisfaction | $57k | $36k | $97k | $144k | $167k | $342k |
| assets | $283k | $1.2M | $1.6M | $2.8M | $2.7M | $2.1M |
| championships | $395k | $1.2M | $2.6M | $3.2M | $3.5M | $4.0M |
| good-then-big | $63k | $111k | $89k | $2.2M | $2.8M | $3.1M |
| big-then-good | $303k | $689k | $1.6M | $1.3M | $3.4M | $4.7M |

**Courses**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 22 | 44 | 60 | 60 | 60 | 60 |
| prestige | 10 | 56 | 191 | 314 | 374 | 374 |
| satisfaction | 15 | 26 | 49 | 76 | 109 | 137 |
| assets | 18 | 80 | 207 | 341 | 378 | 378 |
| championships | 24 | 89 | 220 | 322 | 322 | 322 |
| good-then-big | 10 | 30 | 65 | 178 | 299 | 374 |
| big-then-good | 23 | 68 | 202 | 303 | 374 | 374 |

## When each got there

The median year a marker was first reached, and in how many runs.

| Goal | 10,000 students | every asset open to it | every need 90 | every school | final four | first team | first title | gave up selectivity | net $1M/wk | satisfaction 90 | top 10 | top 20 | top 25 | top 50 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | — | — | — | 13 (10/10) | — | — | — | — | 13 (10/10) | — | — | — | — | 24 (2/10) |
| prestige | 15 (10/10) | — | — | 16 (10/10) | — | 5 (10/10) | — | 5 (10/10) | 12 (10/10) | 7 (9/10) | 49 (3/10) | 41 (10/10) | 33 (10/10) | 22 (10/10) |
| satisfaction | — | — | 12 (9/10) | — | — | — | — | — | — | 6 (10/10) | — | — | — | — |
| assets | 13 (10/10) | 43 (10/10) | — | 15 (10/10) | 11 (10/10) | 4 (10/10) | 28 (6/10) | — | 10 (10/10) | 14 (9/10) | 45 (10/10) | 39 (10/10) | 32 (10/10) | 17 (10/10) |
| championships | 12 (10/10) | — | — | 13 (10/10) | 8 (10/10) | 4 (10/10) | 24 (5/10) | — | 10 (10/10) | 8 (10/10) | — | — | — | 23 (10/10) |
| good-then-big | 27 (10/10) | — | — | 29 (10/10) | 22 (10/10) | 5 (10/10) | 27 (4/10) | — | 25 (10/10) | 15 (10/10) | — | 50 (9/10) | 45 (10/10) | 31 (10/10) |
| big-then-good | 14 (10/10) | — | — | 17 (10/10) | 11 (10/10) | 5 (10/10) | 27 (3/10) | 34 (2/10) | 12 (10/10) | 38 (10/10) | 49 (9/10) | 42 (10/10) | 35 (10/10) | 21 (10/10) |

## Flagships on full scholarships

Years from putting a chosen flagship on full scholarships to its first final four (the fastest of its flagships; a run whose flagships never got there counts as never). Plan 80G's target is eight to twelve, median across runs.

| Run | Flagships (year chosen → first final four) | Years |
|---|---|---|
| championships 12345 Blackmoor | iceHockey-w Y6 → Y9; soccer-m Y8 → Y8 | 0 |
| championships 12345 Saint Aldric | waterPolo-m Y5 → Y8; football Y9 → Y9 | 0 |
| championships 4242 Blackmoor | iceHockey-m Y5 → Y6; iceHockey-w Y7 → Y10 | 1 |
| championships 4242 Saint Aldric | swimming-m Y6 → Y9; baseball Y8 → Y10 | 2 |
| championships 777 Blackmoor | football Y8 → Y9; iceHockey-m Y9 → Y13 | 1 |
| championships 777 Saint Aldric | swimming-w Y6 → Y8; waterPolo-m Y8 → Y13 | 2 |
| championships 31337 Blackmoor | waterPolo-w Y5 → Y5; lacrosse-m Y11 → Y11 | 0 |
| championships 31337 Saint Aldric | track-m Y5 → Y8; swimming-m Y8 → Y10 | 2 |
| championships 2026 Blackmoor | track-m Y5 → Y5; lacrosse-w Y7 → Y8 | 0 |
| championships 2026 Saint Aldric | volleyball-m Y5 → Y5; softball Y11 → Y12 | 0 |

Median: 0 years (10/10 runs reached a final four).

## revenue

**The Final Report.** Marks: D ×10. Titles: *Blackmoor University: a research powerhouse that never fielded a team anyone feared*; *Saint Aldric University: a research powerhouse that never fielded a team anyone feared*.

Axis grades (median mean score): Academics 34, Research 64, Student life 34, Athletics 0, Access 58, Financial strength 75.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| research-deep | 558 | 20 | The deepest initiative carries the largest grant. |
| hire-for-offer | 48 | 13 | An offered program needs its first instructor. |
| restaff | 36 | 5 | A course went dark when its teacher left; restaffing it keeps its seats. |
| found-program | 30 | 6 | A new program adds seats, and the next student pays more than they cost. |
| develop-course | 18 | 6 | The class filled the room: seats are revenue. |
| move-home | 17 | 4 | A program away from its school earns nothing extra; home is where the game suggests. |
| lab | 13 | 5 | A lab's grants return about twice what its initiatives cost. |
| decline-offer | 8 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| crowding | 7 | 2 | Crowding shrinks next year's pool steeply. |
| dorm | 7 | 1 | Beds keep the pool full and the crowding penalty away. |
| hire-for-course | 6 | 3 | A course waits on a field nobody on the roster can take. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| campaign | 3 | 1 | A campaign the alumni would answer: money raised rather than earned. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x and answers the academic routine. |
| appoint-advancement | 1 | 1 | A VP of Advancement runs the campaigns that bring money in. |
| trim-maintenance | 1 | 1 | Maintenance at 90% trims a cost line; the backlog grows slowly. |
| draw-max | 1 | 1 | The endowment pays out more at the top of the draw range: income now. |
| sweep | 1 | 1 | Idle cash earns nothing; swept into the endowment it pays out. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 414 | 16 | 520 |
| 11–20 | 405 | 15 | 520 |
| 21–30 | 444 | 16 | 520 |
| 31–40 | 440 | 8 | 520 |
| 41–50 | 438 | 13 | 520 |

**Repeated more than ten times in a year:** research-deep (33 years), hire-for-offer (1 years).

Modals answered over the run (median): 148. By type (median over runs): letter 8, summer 50, milestone 9, catalogue-letter 14, research-complete 59, decision-event 7, rankings-entry 0.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| see demand before pricing | 10/10 | 2 | 14 | Last year's price change lost income; the price is set blind, so the only test is a year. |

Promises taken (all runs): {sum} in the fund ×10, Not one building on the list ×10, {sum} in the fund, and more to come ×10, {sum} in reserve ×1.

## prestige

**The Final Report.** Marks: C ×10. Titles: *Blackmoor University: a college known first for its teaching that never fielded a team anyone feared*; *Saint Aldric University: a college known first for its teaching that never fielded a team anyone feared*.

Axis grades (median mean score): Academics 56, Research 62, Student life 54, Athletics 0, Access 50, Financial strength 49.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 839 | 39 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| develop-course | 372 | 19 | Every course a finished major needs raises breadth, once it can be taught. |
| research-deep | 293 | 13 | Depth: a landmark program is worth more to research standing than two small ones. |
| hire-for-course | 48 | 4 | A course waits on a field nobody on the roster can take. |
| found-program | 38 | 8 | Breadth is the heaviest input (50). |
| TRAIN_FACULTY | 34 | 5 |  |
| hire-for-offer | 31 | 11 | An offered program needs its first instructor. |
| restaff | 30 | 4 | A course went dark when its teacher left; restaffing it keeps its seats. |
| crowding | 23 | 2 | Crowding is subtracted from the academic target. |
| lab | 18 | 6 | Research standing and the academic research input need labs. |
| move-home | 16 | 4 | A school gathered in its hall is what concentration counts. |
| found-graduate | 13 | 4 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| post-search | 11 | 2 | Nobody in the field is listed; a paid search finds someone. |
| extend-basicNeeds | 9 | 2 | Another floor on a standing building is the cheapest way to raise basicNeeds. |
| decline-offer | 6 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| build-social | 4 | 4 | Welfare is graded on the year's average satisfaction. |
| build-academic | 3 | 1 | Welfare is graded on the year's average satisfaction. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 384 | 25 | 520 |
| 11–20 | 246 | 20 | 520 |
| 21–30 | 251 | 23 | 520 |
| 31–40 | 262 | 20 | 520 |
| 41–50 | 357 | 18 | 520 |

**Repeated more than ten times in a year:** tend-teaching (35 years), develop-course (17 years), research-deep (5 years), hire-for-offer (1 years).

Modals answered over the run (median): 298. By type (median over runs): letter 8, summer 50, first-sport-club 1, decision-event 49, milestone 87, athletic-director 1, catalogue-letter 12, research-complete 83, rankings-entry 1, specialization 1.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| a way up for a small college | 10/10 | 5 | 1 | Prestige moved -5.9 in 4 summers of selective admissions; the standing says why in pillars, but a small college has no pillar it can raise without growing. |

Promises taken (all runs): Turning people away ×10, A name people know ×10.

## satisfaction

**The Final Report.** Marks: F ×10. Titles: *Blackmoor College: a college with a campus life to envy that never fielded a team anyone feared*; *Saint Aldric College: a teaching college that never fielded a team anyone feared*; *Saint Aldric College: a college with a campus life to envy that never fielded a team anyone feared*; *Blackmoor College: a teaching college that never fielded a team anyone feared*.

Axis grades (median mean score): Academics 36, Research 21, Student life 49, Athletics 0, Access 39, Financial strength 6.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 164 | 14 | Academic satisfaction reads every course's grade against what the students expect. |
| develop-course | 121 | 11 | Courses add seats; a crowded class is a crowded campus. |
| hire-for-course | 33 | 4 | A course waits on a field nobody on the roster can take. |
| hire-for-offer | 18 | 11 | An offered program needs its first instructor. |
| found-program | 18 | 6 | Programs add seats and study places; the college grows at the pace it can house. |
| move-home | 9 | 3 | Programs at home. |
| restaff | 9 | 3 | A course went dark when its teacher left; restaffing it keeps its seats. |
| decline-offer | 8 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| build-academic | 4 | 1 | The lowest need this term is academic. |
| crowding | 4 | 2 | Crowding is the one thing this college never allows. |
| extend-basicNeeds | 4 | 1 | Another floor on a standing building is the cheapest way to raise basicNeeds. |
| build-social | 3 | 3 | Social space is a need too. |
| amenity | 3 | 1 | A campus that looks cared for is one students like. |
| site-hall | 3 | 1 | A program is on offer and no hall has a slot for it. |
| build-basicNeeds | 2 | 1 | The lowest need this term is basicNeeds. |
| extend-housing | 2 | 1 | Another floor on a standing building is the cheapest way to raise housing. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x. |
| appoint-dean-of-students | 1 | 1 | A Dean of Students answers the student routine by what lands best. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 457 | 19 | 520 |
| 11–20 | 445 | 19 | 520 |
| 21–30 | 434 | 23 | 520 |
| 31–40 | 420 | 24 | 520 |
| 41–50 | 370 | 27 | 520 |

**Repeated more than ten times in a year:** tend-teaching (3 years), develop-course (1 years), hire-for-offer (1 years).

Modals answered over the run (median): 129. By type (median over runs): letter 7, summer 50, first-sport-club 1, milestone 29, decision-event 31, catalogue-letter 13.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| raise academic | 10/10 | 13 | 52 | academic is 79 and nothing on the build menu serves it — the chain is built out or gated. |
| shrink the student body | 4/10 | 25 | 1 | Even the smallest class leaves a need short: the body on the books is already too big for the campus, and nothing but attrition can shrink it. |

Promises taken (all runs): A campus worth the photograph ×10.

## assets

**The Final Report.** Marks: B ×10. Titles: *Blackmoor University: a college known first for what its laboratories find that never built an endowment to match its size*; *Saint Aldric University: a college known first for what its laboratories find that never built an endowment to match its size*.

Axis grades (median mean score): Academics 51, Research 57, Student life 64, Athletics 35, Access 46, Financial strength 2.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 826 | 40 | Keep the teaching up. |
| research-cheap | 496 | 23 | The Research Park waits on every standing lab having seen an initiative through (and, since Plan 85F, on a specialization in research). |
| develop-course | 379 | 18 | A distinguished school opens its graduate project. |
| hire-coach | 72 | 7 | An empty coaching chair scores at the floor. |
| build-next-asset | 71 | 8 | The cheapest asset on the menu; borrow for it if cash is short. |
| hire-for-course | 47 | 5 | A course waits on a field nobody on the roster can take. |
| found-program | 37 | 7 | Schools founded open their labs and, distinguished, the graduate projects. |
| HIRE_COACH | 34 | 6 |  |
| restaff | 31 | 4 | A course went dark when its teacher left; restaffing it keeps its seats. |
| hire-for-offer | 30 | 12 | An offered program needs its first instructor. |
| SET_TEAM_ORDER | 27 | 4 |  |
| move-home | 17 | 4 | Schools founded open labs and graduate projects. |
| found-graduate | 14 | 5 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| FIRE_COACH | 11 | 3 |  |
| post-search | 9 | 2 | Nobody in the field is listed; a paid search finds someone. |
| crowding | 7 | 2 | Crowding first: it shrinks the pool that pays for everything. |
| decline-offer | 6 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| SET_SCHOLARSHIPS | 6 | 6 |  |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 336 | 21 | 520 |
| 11–20 | 204 | 17 | 520 |
| 21–30 | 228 | 26 | 520 |
| 31–40 | 262 | 18 | 520 |
| 41–50 | 275 | 15 | 520 |

**Repeated more than ten times in a year:** tend-teaching (36 years), research-cheap (24 years), develop-course (19 years), hire-for-offer (1 years).

Modals answered over the run (median): 273. By type (median over runs): letter 9, summer 50, first-sport-club 1, decision-event 69, milestone 92, athletic-director 1, catalogue-letter 12, research-complete 35, rankings-entry 1, specialization 1, championship 1.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| build every specialization's building | 10/10 | 40 | 12 | The choice is for good: The Faculty Training Institute, The Athletic Performance Complex can never stand on this campus. |
| build what is locked | 10/10 | 21 | 11 | Everything on the menu stands; 17 assets are still gated (Ridgeline Village, Meridian Tower, Beacon Tower…) by enrolment, prestige or a school. |

Promises taken (all runs): A campus worth the photograph ×10, Twelve structures, and still a beautiful campus ×10, A great project raised ×11, Four schools ×4.

## championships

**The Final Report.** Marks: D ×10. Titles: *Blackmoor College: a party school that never built an endowment to match its size*; *Saint Aldric College: a party school that never built an endowment to match its size*.

Axis grades (median mean score): Academics 45, Research 23, Student life 57, Athletics 38, Access 54, Financial strength 2.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 495 | 25 | Keep the teaching up. |
| develop-course | 280 | 17 | Seats are students, and students fill stands. |
| replace-coach | 118 | 12 | A listed coach would outgrow the incumbent by fifteen points or more. |
| hire-coach | 98 | 9 | An empty coaching chair scores at the floor. |
| team-order | 71 | 4 | The chosen flagships first on the list, the strongest of the rest below them. |
| found-program | 37 | 9 | Programs grow the college that pays for the department. |
| hire-for-course | 34 | 4 | A course waits on a field nobody on the roster can take. |
| hire-for-offer | 31 | 12 | An offered program needs its first instructor. |
| restaff | 31 | 5 | A course went dark when its teacher left; restaffing it keeps its seats. |
| move-home | 17 | 5 | Programs at home. |
| crowding | 14 | 2 | Crowding shrinks the pool that pays for athletics. |
| dorm | 11 | 2 | Beds keep the pool full. |
| expand-venue | 10 | 2 | A bigger venue is a bigger gate, and the gate is the department's pot. |
| decline-offer | 6 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| rec | 5 | 1 | Recreation facilities are where a sporting culture starts. |
| venue-for-team | 5 | 1 | A varsity team waits on its venue; it cannot compete until it stands. |
| build-academic | 4 | 1 | Keep the campus livable. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 340 | 24 | 520 |
| 11–20 | 291 | 21 | 520 |
| 21–30 | 309 | 23 | 520 |
| 31–40 | 385 | 19 | 520 |
| 41–50 | 395 | 15 | 520 |

**Repeated more than ten times in a year:** tend-teaching (22 years), develop-course (14 years), replace-coach (1 years), hire-for-offer (1 years).

Modals answered over the run (median): 203. By type (median over runs): letter 7, summer 50, first-sport-club 1, milestone 70, decision-event 60, athletic-director 1, catalogue-letter 12, rankings-entry 1, championship 0.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| found a team | 10/10 | 4 | 39 | No varsity program yet: a team can only come from a student sport club, three years old, petitioning in the summer — there is no way to start one. |
| recruit athletes | 10/10 | 18 | 12 | Every chair is filled and the budget is at its top; Women's Soccer Team still scores 63, and only a flagship can recruit. |
| disband a program | 6/10 | 33 | 1 | Women's Track & Field Team has missed the postseason 5 times; a program cannot be disbanded. |

## good-then-big

**The Final Report.** Marks: C ×10. Titles: *Blackmoor University: an athletics school that never built an endowment to match its size*; *Saint Aldric University: a college known first for its teaching that never built an endowment to match its size*; *Blackmoor University: a college known first for its teaching that never built an endowment to match its size*; *Saint Aldric University: an athletics school that never built an endowment to match its size*.

Axis grades (median mean score): Academics 46, Research 40, Student life 54, Athletics 23, Access 44, Financial strength 7.

Switched strategy in year 21.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 656 | 43 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| research-cheap | 399 | 25 | Keep the labs busy, cheaply. |
| develop-course | 372 | 19 | Every course a finished major needs raises breadth, once it can be taught. |
| hire-coach | 77 | 18 | An empty coaching chair scores at the floor. |
| hire-for-course | 53 | 5 | A course waits on a field nobody on the roster can take. |
| found-program | 37 | 7 | Breadth is the heaviest input (50). |
| hire-for-offer | 27 | 11 | An offered program needs its first instructor. |
| lab | 18 | 6 | Labs and projects as they open. |
| move-home | 17 | 4 | A school gathered in its hall is what concentration counts. |
| crowding | 15 | 3 | Crowding is subtracted from the academic target. |
| found-graduate | 13 | 5 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| restaff | 12 | 3 | A course went dark when its teacher left; restaffing it keeps its seats. |
| post-search | 10 | 2 | Nobody in the field is listed; a paid search finds someone. |
| dorm | 9 | 2 | Beds keep the pool full. |
| decline-offer | 8 | 1 | An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| SET_SCHOLARSHIPS | 6 | 6 |  |
| venue-for-team | 5 | 3 | A varsity team waits on its venue; it cannot compete until it stands. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 440 | 22 | 520 |
| 11–20 | 435 | 23 | 520 |
| 21–30 | 260 | 21 | 520 |
| 31–40 | 188 | 17 | 520 |
| 41–50 | 227 | 20 | 520 |

**Repeated more than ten times in a year:** tend-teaching (23 years), research-cheap (19 years), develop-course (15 years), hire-coach (1 years), hire-for-offer (1 years).

Modals answered over the run (median): 233. By type (median over runs): letter 8, summer 50, first-sport-club 1, decision-event 49, milestone 88, athletic-director 1, catalogue-letter 13, research-complete 20, rankings-entry 1, specialization 1, championship 0.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| stay small on purpose | 7/10 | 12 | 9 | Twelve programs and the offers keep coming; the only way to stay small is to ignore them. |
| more seats now | 1/10 | 25 | 2 | The class fills every seat and no course can be started this week: the committee's seats, the faculty market or the hall slots are the ceiling on growth, not money. |

Promises taken (all runs): A name people know ×11, Twenty programs in the catalog ×7, A thousand students on the lawn ×6, Turning people away ×8, A fuller catalog ×2, Four schools ×5, Two thousand students ×6.

## big-then-good

**The Final Report.** Marks: B ×9, C ×1. Titles: *Blackmoor University: a college known first as the place to be a student that never opened its doors very wide*; *Saint Aldric University: a college known first as the place to be a student that never opened its doors very wide*.

Axis grades (median mean score): Academics 50, Research 54, Student life 57, Athletics 30, Access 47, Financial strength 19.

Switched strategy in year 21.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 816 | 56 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| develop-course | 372 | 15 | Seats are the ceiling on enrolment. |
| research-deep | 214 | 22 | Depth: a landmark program is worth more to research standing than two small ones. |
| research-cheap | 98 | 21 | Keep the labs busy, cheaply. |
| HIRE_COACH | 60 | 45 |  |
| hire-for-course | 50 | 5 | A course waits on a field nobody on the roster can take. |
| found-program | 37 | 7 | Every program adds seats: grow. |
| hire-coach | 30 | 6 | An empty coaching chair scores at the floor. |
| hire-for-offer | 28 | 12 | An offered program needs its first instructor. |
| crowding | 20 | 2 | Growth stalls if the pool shrinks from crowding. |
| lab | 18 | 6 | Labs and projects as they open. |
| move-home | 17 | 4 | Programs at home. |
| restaff | 17 | 3 | A course went dark when its teacher left; restaffing it keeps its seats. |
| SET_TEAM_ORDER | 17 | 4 |  |
| found-graduate | 11 | 4 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| FIRE_COACH | 10 | 3 |  |
| RESOLVE_CATALOGUE_EVENT | 9 | 2 |  |
| post-search | 7 | 2 | Nobody in the field is listed; a paid search finds someone. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 381 | 25 | 520 |
| 11–20 | 249 | 20 | 520 |
| 21–30 | 239 | 32 | 520 |
| 31–40 | 222 | 18 | 520 |
| 41–50 | 304 | 16 | 520 |

**Repeated more than ten times in a year:** tend-teaching (29 years), develop-course (13 years), research-deep (7 years), research-cheap (5 years), HIRE_COACH (1 years), hire-for-offer (1 years).

Modals answered over the run (median): 277. By type (median over runs): letter 8, summer 50, milestone 93, first-sport-club 1, decision-event 63, athletic-director 1, catalogue-letter 11, research-complete 46, rankings-entry 1, specialization 1, championship 0.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| more seats now | 10/10 | 1 | 33 | The class fills every seat and no course can be started this week: the committee's seats, the faculty market or the hall slots are the ceiling on growth, not money. |
| raise academic | 3/10 | 21 | 2 | academic is 40 and nothing on the menu serves it. |
| a way up for a small college | 2/10 | 34 | 1 | Prestige moved 1.9 in 4 summers of selective admissions; the standing says why in pillars, but a small college has no pillar it can raise without growing. |
| shrink the student body | 1/10 | 48 | 1 | The body is bigger than the catalogue seats; only graduation shrinks it. |

Promises taken (all runs): A name people know ×10, Teaching the college can stand behind ×7, Turning people away ×10, Four schools ×4.

## Do the goals make different colleges?

Each college at year 50 as 8 features scaled to 0–1 (students, prestige, satisfaction, courses, teams, placeables, price ratio, research); the distance between two goals' medians (0 = the same college; 1 = very different).

| | revenue | prestige | satisfaction | assets | championships | good-then-big | big-then-good |
|---|---|---|---|---|---|---|---|
| revenue | 0.00 | 0.61 | 0.33 | 0.63 | 0.58 | 0.61 | 0.61 |
| prestige | 0.61 | 0.00 | 0.66 | 0.09 | 0.34 | 0.10 | 0.04 |
| satisfaction | 0.33 | 0.66 | 0.00 | 0.66 | 0.48 | 0.62 | 0.65 |
| assets | 0.63 | 0.09 | 0.66 | 0.00 | 0.33 | 0.09 | 0.07 |
| championships | 0.58 | 0.34 | 0.48 | 0.33 | 0.00 | 0.26 | 0.32 |
| good-then-big | 0.61 | 0.10 | 0.62 | 0.09 | 0.26 | 0.00 | 0.07 |
| big-then-good | 0.61 | 0.04 | 0.65 | 0.07 | 0.32 | 0.07 | 0.00 |

The same, on the four pillars alone (academics, research, student life, athletics, each over 150): the shape of the college's standing (Plan 85).

| | revenue | prestige | satisfaction | assets | championships | good-then-big | big-then-good |
|---|---|---|---|---|---|---|---|
| revenue | 0.00 | 0.33 | 0.30 | 0.34 | 0.36 | 0.31 | 0.38 |
| prestige | 0.33 | 0.00 | 0.40 | 0.24 | 0.39 | 0.18 | 0.21 |
| satisfaction | 0.30 | 0.40 | 0.00 | 0.47 | 0.19 | 0.39 | 0.43 |
| assets | 0.34 | 0.24 | 0.47 | 0.00 | 0.39 | 0.11 | 0.11 |
| championships | 0.36 | 0.39 | 0.19 | 0.39 | 0.00 | 0.30 | 0.33 |
| good-then-big | 0.31 | 0.18 | 0.39 | 0.11 | 0.30 | 0.00 | 0.09 |
| big-then-good | 0.38 | 0.21 | 0.43 | 0.11 | 0.33 | 0.09 | 0.00 |
