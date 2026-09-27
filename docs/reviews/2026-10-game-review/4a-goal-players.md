# Appendix to area 4: the goal players' tables

Plan 73, area 4. The tables below are `node_modules/.tmp/goals/goals.md` as `npm run review:goals` wrote it at commit `58fa3fd`: 70 games (seven goals, five seeds, two names), fifty years each. `4-strategy.md` reads them. Rerun the command to regenerate this file after a change.

Written by `npm run review:goals` (`tools/review/goalPlayers.ts`): 7 goals × 5 seeds (12345, 4242, 777, 31337, 2026) × 2 names (Blackmoor, Saint Aldric), 70 runs, 59 run-minutes. Medians across every run of a goal unless said.

## The seven compared, at year 50

| Goal | Rank | Prestige | Students | Satisfaction | Net/wk | Endowment | Courses | Schools | Placeables | Teams | Titles | Grade A share | Title (most common) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | 25 | 108 | 6480 | 65 | $3.9M | $518.4M | 81 | 7 | 33 | 0 | 0 | 33% | Blackmoor University: an old-money college that never won a game that mattered (5/10) |
| prestige | 1 | 144 | 33040 | 86 | $1.7M | $115.5M | 374 | 7 | 52 | 20 | 0 | 83% | Blackmoor University: a teaching college that never won a game that mattered (5/10) |
| satisfaction | 26 | 103 | 2681 | 88 | $71k | $17.7M | 98 | 2 | 16 | 0 | 0 | 81% | Blackmoor College: a teaching college that never won a game that mattered (5/10) |
| assets | 1 | 143 | 34480 | 86 | $1.3M | $62.8M | 378 | 7 | 78 | 20 | 4 | 85% | Blackmoor University: a teaching college that never balanced its books (5/10) |
| championships | 8 | 133 | 25760 | 86 | $1.7M | $67.8M | 322 | 7 | 44 | 20 | 27 | 86% | Blackmoor College: a teaching college that never balanced its books (5/10) |
| good-then-big | 1 | 144 | 32320 | 85 | $1.7M | $106.6M | 374 | 7 | 58 | 19 | 1 | 86% | Blackmoor University: a teaching college that never balanced its books (5/10) |
| big-then-good | 1 | 147 | 33840 | 84 | $4.0M | $3.0B | 374 | 7 | 56 | 20 | 2 | 90% | Blackmoor University: a jock school that never opened its doors very wide (4/10) |

## The curves

Median across runs, at years 5, 10, 20, 30, 40 and 50.

**Rank**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 55 | 48 | 20 | 13 | 23 | 27 |
| prestige | 55 | 45 | 20 | 9 | 1 | 1 |
| satisfaction | 55 | 45 | 25 | 22 | 26 | 28 |
| assets | 53 | 39 | 14 | 5 | 1 | 1 |
| championships | 54 | 42 | 18 | 7 | 4 | 7 |
| good-then-big | 55 | 44 | 19 | 8 | 1 | 1 |
| big-then-good | 55 | 45 | 19 | 9 | 1 | 1 |

**Prestige**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 57 | 69 | 94 | 111 | 106 | 107 |
| prestige | 58 | 70 | 94 | 119 | 142 | 145 |
| satisfaction | 57 | 69 | 89 | 97 | 99 | 102 |
| assets | 60 | 73 | 100 | 125 | 141 | 142 |
| championships | 59 | 71 | 97 | 121 | 133 | 133 |
| good-then-big | 58 | 70 | 95 | 120 | 141 | 145 |
| big-then-good | 57 | 69 | 94 | 118 | 141 | 147 |

**Students**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 1680 | 4320 | 4320 | 4160 | 5040 | 6480 |
| prestige | 679 | 1765 | 9962 | 26560 | 30320 | 32640 |
| satisfaction | 491 | 619 | 1497 | 1682 | 1930 | 2643 |
| assets | 1920 | 7360 | 21760 | 30960 | 32240 | 34480 |
| championships | 1920 | 7120 | 22240 | 25760 | 25760 | 25760 |
| good-then-big | 679 | 1765 | 7280 | 20720 | 28400 | 31520 |
| big-then-good | 1680 | 6560 | 20640 | 30640 | 33760 | 33840 |

**Satisfaction**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 65 | 65 | 72 | 70 | 66 | 67 |
| prestige | 88 | 85 | 84 | 84 | 86 | 87 |
| satisfaction | 88 | 86 | 88 | 87 | 88 | 87 |
| assets | 88 | 90 | 87 | 85 | 84 | 86 |
| championships | 91 | 87 | 88 | 87 | 86 | 87 |
| good-then-big | 88 | 86 | 88 | 84 | 85 | 85 |
| big-then-good | 87 | 85 | 84 | 83 | 85 | 83 |

**Net a week**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | $554k | $1.8M | $2.4M | $2.4M | $2.9M | $3.9M |
| prestige | $104k | $278k | $1.5M | $1.4M | $703k | $1.6M |
| satisfaction | $24k | $43k | $60k | $64k | $41k | $78k |
| assets | $347k | $1.1M | $1.9M | $1.1M | $1.0M | $1.2M |
| championships | $344k | $1.1M | $2.1M | $678k | $866k | $1.7M |
| good-then-big | $104k | $270k | $795k | $1.1M | $1.0M | $1.6M |
| big-then-good | $253k | $812k | $1.2M | $2.1M | $1.3M | $3.8M |

**Courses**

| Goal | Y5 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|---|
| revenue | 22 | 54 | 54 | 54 | 67 | 81 |
| prestige | 12 | 49 | 162 | 339 | 365 | 374 |
| satisfaction | 12 | 17 | 48 | 65 | 82 | 96 |
| assets | 24 | 92 | 271 | 372 | 378 | 378 |
| championships | 24 | 89 | 278 | 322 | 322 | 322 |
| good-then-big | 12 | 49 | 88 | 247 | 347 | 371 |
| big-then-good | 21 | 82 | 258 | 374 | 374 | 374 |

## When each got there

The median year a marker was first reached, and in how many runs.

| Goal | 10,000 students | every asset | every need 90 | every school | first | first team | first title | net $1M/wk | satisfaction 90 | top 10 | top 25 | top 50 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| revenue | — | — | — | 8 (10/10) | — | — | — | 8 (10/10) | — | 26 (3/10) | 18 (10/10) | 9 (10/10) |
| prestige | 20 (10/10) | — | — | 22 (10/10) | 38 (10/10) | 7 (10/10) | — | 18 (10/10) | 6 (10/10) | 27 (10/10) | 17 (10/10) | 8 (10/10) |
| satisfaction | — | — | 10 (10/10) | — | — | — | — | — | 4 (10/10) | — | 19 (10/10) | 8 (10/10) |
| assets | 12 (10/10) | 45 (8/10) | — | 14 (10/10) | 36 (10/10) | 4 (10/10) | 14 (10/10) | 9 (10/10) | 7 (10/10) | 23 (10/10) | 15 (10/10) | 7 (10/10) |
| championships | 12 (10/10) | — | — | 12 (10/10) | 39 (4/10) | 4 (10/10) | 12 (10/10) | 9 (10/10) | 5 (10/10) | 26 (10/10) | 16 (10/10) | 8 (10/10) |
| good-then-big | 23 (10/10) | — | — | 31 (10/10) | 38 (10/10) | 7 (10/10) | 27 (8/10) | 18 (10/10) | 6 (10/10) | 27 (10/10) | 17 (10/10) | 8 (10/10) |
| big-then-good | 13 (10/10) | — | — | 16 (10/10) | 39 (10/10) | 5 (10/10) | 11 (9/10) | 11 (10/10) | 26 (5/10) | 28 (10/10) | 18 (10/10) | 8 (10/10) |

## revenue

**The Final Report.** Marks: C ×10. Titles: *Blackmoor University: an old-money college that never won a game that mattered*; *Saint Aldric University: a research powerhouse that never won a game that mattered*; *Saint Aldric University: an old-money college that never won a game that mattered*.

Axis grades (median mean score): Academics 62, Research 59, Campus life 18, Athletic standing 0, Access 35, Financial strength 80.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| research-deep | 328 | 13 | The deepest initiative carries the largest grant. |
| develop-course | 51 | 12 | The class filled the room: seats are revenue. |
| hire-for-offer | 31 | 12 | An offered program needs its first instructor. |
| restaff | 31 | 5 | A course went dark when its teacher left; restaffing it keeps its seats. |
| found-program | 26 | 8 | A new program adds seats, and the next student pays more than they cost. |
| hire-for-course | 22 | 5 | A course waits on a field nobody on the roster can take. |
| move-home | 17 | 5 | A program away from its school earns nothing extra; home is where the game suggests. |
| lab | 10 | 4 | A lab's grants return about twice what its initiatives cost. |
| dorm | 9 | 2 | Beds keep the pool full and the crowding penalty away. |
| crowding | 7 | 2 | Crowding shrinks next year's pool steeply. |
| site-hall | 6 | 2 | A program is on offer and no hall has a slot for it. |
| campaign | 3 | 1 | A campaign the alumni would answer: money raised rather than earned. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x and answers the academic routine. |
| appoint-advancement | 1 | 1 | A VP of Advancement runs the campaigns that bring money in. |
| trim-maintenance | 1 | 1 | Maintenance at 90% trims a cost line; the backlog grows slowly. |
| draw-max | 1 | 1 | The endowment pays out more at the top of the draw range: income now. |
| sweep | 1 | 1 | Idle cash earns nothing; swept into the endowment it pays out. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 412 | 18 | 520 |
| 11–20 | 449 | 18 | 520 |
| 21–30 | 458 | 18 | 520 |
| 31–40 | 443 | 12 | 520 |
| 41–50 | 438 | 14 | 520 |

**Repeated more than ten times in a year:** research-deep (4 years), develop-course (1 years), hire-for-offer (1 years).

Modals answered over the run (median): 154. By type (median over runs): letter 8, summer 50, milestone 12, decision-event 15, catalogue-letter 14, rankings-entry 1, research-complete 52.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| see demand before pricing | 10/10 | 26 | 10 | Last year's price change lost income; the price is set blind, so the only test is a year. |

Promises taken (all runs): Not one building on the register ×10, Ten million in reserve ×1, A hundred million in the fund ×1.

## prestige

**The Final Report.** Marks: B ×6, C ×4. Titles: *Blackmoor University: a teaching college that never won a game that mattered*; *Saint Aldric University: a teaching college that never won a game that mattered*.

Axis grades (median mean score): Academics 71, Research 44, Campus life 41, Athletic standing 0, Access 35, Financial strength 4.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 405 | 24 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| develop-course | 381 | 26 | Every course a finished major needs raises breadth, once it can be taught. |
| research-deep | 58 | 13 | Depth: a landmark program is worth more to research standing than two small ones. |
| hire-for-course | 39 | 6 | A course waits on a field nobody on the roster can take. |
| restaff | 38 | 6 | A course went dark when its teacher left; restaffing it keeps its seats. |
| found-program | 31 | 7 | Breadth is the heaviest input (50). |
| crowding | 23 | 2 | Crowding is subtracted from the academic target. |
| hire-for-offer | 17 | 7 | An offered program needs its first instructor. |
| move-home | 17 | 4 | A school gathered in its hall is what concentration counts. |
| lab | 17 | 4 | Research standing and the academic research input need labs. |
| found-graduate | 10 | 4 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| extend-basicNeeds | 9 | 2 | Another floor on a standing building is the cheapest way to raise basicNeeds. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| post-search | 3 | 1 | Nobody in the field is listed; a paid search finds someone. |
| build-social | 3 | 2 | Welfare is graded on the year's average satisfaction. |
| library | 3 | 1 | Library adequacy multiplies curriculum breadth. |
| campaign | 2 | 1 | A campaign the alumni would answer: money raised rather than earned. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x and answers the academic routine. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 409 | 26 | 520 |
| 11–20 | 289 | 30 | 520 |
| 21–30 | 246 | 40 | 520 |
| 31–40 | 388 | 31 | 520 |
| 41–50 | 391 | 20 | 520 |

**Repeated more than ten times in a year:** tend-teaching (14 years), develop-course (15 years), research-deep (1 years).

Modals answered over the run (median): 226. By type (median over runs): letter 8, summer 50, first-sport-club 1, decision-event 57, milestone 78, catalogue-letter 13, athletic-director 1, rankings-entry 1, research-complete 9.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| train the faculty | 10/10 | 21 | 890 | The teaching standard caps the target at 141; the only way up is to hire better teachers and fire weaker ones — no training, sabbatical or mentoring for the ones on the roster. |

Promises taken (all runs): A college people recommend ×6.

## satisfaction

**The Final Report.** Marks: D ×10. Titles: *Blackmoor College: a teaching college that never won a game that mattered*; *Saint Aldric College: a teaching college that never won a game that mattered*.

Axis grades (median mean score): Academics 58, Research 12, Campus life 33, Athletic standing 0, Access 33, Financial strength 6.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 110 | 14 | Academic satisfaction reads every course's grade against what the students expect. |
| develop-course | 81 | 6 | Courses add seats; a crowded class is a crowded campus. |
| hire-for-course | 28 | 6 | A course waits on a field nobody on the roster can take. |
| found-program | 16 | 6 | Programs add seats and study places; the college grows at the pace it can house. |
| restaff | 15 | 3 | A course went dark when its teacher left; restaffing it keeps its seats. |
| hire-for-offer | 7 | 5 | An offered program needs its first instructor. |
| move-home | 7 | 3 | Programs at home. |
| crowding | 5 | 2 | Crowding is the one thing this college never allows. |
| extend-basicNeeds | 4 | 1 | Another floor on a standing building is the cheapest way to raise basicNeeds. |
| build-academic | 3 | 1 | The lowest need this term is academic. |
| build-social | 3 | 2 | Social space is a need too. |
| site-hall | 3 | 1 | A program is on offer and no hall has a slot for it. |
| extend-housing | 2 | 1 | Another floor on a standing building is the cheapest way to raise housing. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x. |
| appoint-dean-of-students | 1 | 1 | A Dean of Students answers the student routine by what lands best. |
| post-search | 1 | 1 | Nobody in the field is listed; a paid search finds someone. |
| amenity | 1 | 1 | A campus that looks cared for is one students like. |
| build-health | 0 | 0 | The lowest need this term is health. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 469 | 19 | 520 |
| 11–20 | 444 | 23 | 520 |
| 21–30 | 463 | 23 | 520 |
| 31–40 | 457 | 19 | 520 |
| 41–50 | 437 | 26 | 520 |

**Repeated more than ten times in a year:** tend-teaching (1 years).

Modals answered over the run (median): 129. By type (median over runs): letter 6, summer 50, first-sport-club 1, decision-event 36, catalogue-letter 14, rankings-entry 1, milestone 18.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| shrink the student body | 10/10 | 8 | 17 | Even the smallest class leaves a need short: the body on the books is already too big for the campus, and nothing but attrition can shrink it. |
| raise academic | 10/10 | 15 | 6 | academic is 88 and nothing on the build menu serves it — the chain is built out or gated. |

Promises taken (all runs): A campus worth the photograph ×10.

## assets

**The Final Report.** Marks: B ×10. Titles: *Blackmoor University: a teaching college that never balanced its books*; *Saint Aldric University: a teaching college that never balanced its books*.

Axis grades (median mean score): Academics 73, Research 45, Campus life 68, Athletic standing 43, Access 38, Financial strength 2.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 511 | 39 | Keep the teaching up. |
| develop-course | 401 | 25 | A distinguished school opens its graduate project. |
| research-cheap | 194 | 24 | The Research Park waits on every standing lab having seen an initiative through. |
| hire-coach | 92 | 10 | An empty coaching chair scores at the floor. |
| build-next-asset | 65 | 7 | The cheapest asset on the menu; borrow for it if cash is short. |
| restaff | 64 | 8 | A course went dark when its teacher left; restaffing it keeps its seats. |
| hire-for-course | 34 | 5 | A course waits on a field nobody on the roster can take. |
| found-program | 29 | 6 | Schools founded open their labs and, distinguished, the graduate projects. |
| hire-for-offer | 23 | 7 | An offered program needs its first instructor. |
| move-home | 16 | 4 | Schools founded open labs and graduate projects. |
| crowding | 12 | 2 | Crowding first: it shrinks the pool that pays for everything. |
| found-graduate | 11 | 5 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| post-search | 3 | 1 | Nobody in the field is listed; a paid search finds someone. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x. |
| site-hall | 0 | 0 | A program is on offer and no hall has a slot for it. |
| venue-for-team | 0 | 0 | A varsity team waits on its venue; it cannot compete until it stands. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 317 | 24 | 520 |
| 11–20 | 224 | 26 | 520 |
| 21–30 | 356 | 44 | 520 |
| 31–40 | 387 | 31 | 520 |
| 41–50 | 316 | 21 | 520 |

**Repeated more than ten times in a year:** tend-teaching (21 years), develop-course (19 years), research-cheap (7 years).

Modals answered over the run (median): 272. By type (median over runs): letter 8, summer 50, first-sport-club 1, milestone 85, decision-event 93, athletic-director 1, catalogue-letter 12, rankings-entry 1, championship 4, research-complete 11.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| build what is locked | 10/10 | 25 | 3 | Everything on the menu stands; 7 assets are still gated (Meridian Tower, Beacon Tower, Horizon Tower…) by enrolment, prestige or a school. |

Promises taken (all runs): Twelve buildings, and still a beautiful campus ×10, A great project raised ×8, Four schools ×6, A campus worth the photograph ×4.

## championships

**The Final Report.** Marks: C ×10. Titles: *Blackmoor College: a teaching college that never balanced its books*; *Saint Aldric College: a teaching college that never balanced its books*.

Axis grades (median mean score): Academics 70, Research 14, Campus life 71, Athletic standing 49, Access 40, Financial strength 2.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 447 | 24 | Keep the teaching up. |
| develop-course | 308 | 26 | Seats are students, and students fill stands. |
| replace-coach | 152 | 12 | A listed coach would outgrow the incumbent by fifteen points or more. |
| team-order | 102 | 4 | The strongest program first on the list: the main sport gets funded in full. |
| hire-coach | 97 | 10 | An empty coaching chair scores at the floor. |
| restaff | 60 | 7 | A course went dark when its teacher left; restaffing it keeps its seats. |
| hire-for-course | 33 | 5 | A course waits on a field nobody on the roster can take. |
| found-program | 30 | 9 | Programs grow the college that pays for the department. |
| hire-for-offer | 22 | 7 | An offered program needs its first instructor. |
| move-home | 16 | 4 | Programs at home. |
| crowding | 13 | 2 | Crowding shrinks the pool that pays for athletics. |
| dorm | 11 | 2 | Beds keep the pool full. |
| expand-venue | 10 | 2 | A bigger venue is a bigger gate, and the gate is the department's pot. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| rec | 5 | 1 | Recreation facilities are where a sporting culture starts. |
| venue-for-team | 5 | 1 | A varsity team waits on its venue; it cannot compete until it stands. |
| appoint-provost | 1 | 1 | A Provost lets the year run at 4x. |
| student-center | 1 | 1 | Sport clubs form only once a student center stands. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 329 | 22 | 520 |
| 11–20 | 257 | 21 | 520 |
| 21–30 | 370 | 26 | 520 |
| 31–40 | 390 | 22 | 520 |
| 41–50 | 355 | 20 | 520 |

**Repeated more than ten times in a year:** tend-teaching (19 years), develop-course (16 years), replace-coach (1 years).

Modals answered over the run (median): 223. By type (median over runs): letter 6, summer 50, first-sport-club 1, decision-event 65, milestone 59, athletic-director 1, rankings-entry 1, championship 27, catalogue-letter 10.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| found a team | 10/10 | 4 | 39 | No varsity program yet: a team can only come from a student sport club, three years old, petitioning in the summer — there is no way to start one. |
| recruit athletes | 10/10 | 5 | 25 | Every chair is filled and the budget is at its top; Women's Soccer Team still scores 61. There is no recruiting, scholarship or scheduling lever. |
| disband a program | 10/10 | 33 | 6 | Women's Ice Hockey Team has missed the postseason 5 times; a program cannot be disbanded. |

## good-then-big

**The Final Report.** Marks: B ×10. Titles: *Blackmoor University: a teaching college that never balanced its books*; *Saint Aldric University: a teaching college that never balanced its books*.

Axis grades (median mean score): Academics 71, Research 33, Campus life 52, Athletic standing 28, Access 34, Financial strength 5.

Switched strategy in year 21.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| develop-course | 363 | 30 | Every course a finished major needs raises breadth, once it can be taught. |
| tend-teaching | 334 | 30 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| hire-coach | 70 | 21 | An empty coaching chair scores at the floor. |
| hire-for-course | 35 | 6 | A course waits on a field nobody on the roster can take. |
| found-program | 31 | 7 | Breadth is the heaviest input (50). |
| restaff | 30 | 5 | A course went dark when its teacher left; restaffing it keeps its seats. |
| crowding | 21 | 2 | Crowding is subtracted from the academic target. |
| hire-for-offer | 19 | 6 | An offered program needs its first instructor. |
| lab | 18 | 3 | Research standing and the academic research input need labs. |
| move-home | 17 | 5 | A school gathered in its hall is what concentration counts. |
| research-cheap | 15 | 6 | Keep the labs busy, cheaply. |
| found-graduate | 8 | 2 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| site-hall | 6 | 2 | A program is on offer and no hall has a slot for it. |
| research-deep | 6 | 2 | Depth: a landmark program is worth more to research standing than two small ones. |
| extend-basicNeeds | 5 | 2 | Another floor on a standing building is the cheapest way to raise basicNeeds. |
| venue-for-team | 5 | 4 | A varsity team waits on its venue; it cannot compete until it stands. |
| post-search | 3 | 1 | Nobody in the field is listed; a paid search finds someone. |
| build-social | 3 | 2 | Welfare is graded on the year's average satisfaction. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 409 | 27 | 520 |
| 11–20 | 417 | 27 | 520 |
| 21–30 | 266 | 31 | 520 |
| 31–40 | 353 | 40 | 520 |
| 41–50 | 407 | 27 | 520 |

**Repeated more than ten times in a year:** develop-course (13 years), tend-teaching (11 years), hire-coach (1 years).

Modals answered over the run (median): 240. By type (median over runs): letter 8, summer 50, first-sport-club 1, decision-event 85, milestone 77, catalogue-letter 12, athletic-director 1, rankings-entry 1, research-complete 2, championship 1.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| stay small on purpose | 10/10 | 9 | 12 | Twelve programs and the offers keep coming; the only way to stay small is to ignore them. |
| train the faculty | 8/10 | 18 | 122 | The teaching standard caps the target at 143; the only way up is to hire better teachers and fire weaker ones — no training, sabbatical or mentoring for the ones on the roster. |

Promises taken (all runs): A college people recommend ×6, Twenty programs in the prospectus ×8, Four schools ×10, Two thousand students ×3.

## big-then-good

**The Final Report.** Marks: B ×8, A ×2. Titles: *Blackmoor University: a jock school that never opened its doors very wide*; *Saint Aldric University: a teaching college that never opened its doors very wide*; *Saint Aldric University: a jock school that never opened its doors very wide*; *Blackmoor University: a teaching college that never opened its doors very wide*.

Axis grades (median mean score): Academics 71, Research 44, Campus life 58, Athletic standing 32, Access 41, Financial strength 27.

Switched strategy in year 21.

**What it did** (median actions over the run, most first):

| Decision | Actions | Busiest year (median of runs' max) | Why |
|---|---|---|---|
| tend-teaching | 557 | 99 | The teaching standard caps the target: every course a B or better, as many A's as can be found. |
| develop-course | 397 | 25 | Seats are the ceiling on enrolment. |
| research-deep | 132 | 16 | Depth: a landmark program is worth more to research standing than two small ones. |
| hire-for-course | 46 | 6 | A course waits on a field nobody on the roster can take. |
| restaff | 32 | 5 | A course went dark when its teacher left; restaffing it keeps its seats. |
| found-program | 31 | 6 | Every program adds seats: grow. |
| crowding | 23 | 2 | Growth stalls if the pool shrinks from crowding. |
| hire-for-offer | 18 | 7 | An offered program needs its first instructor. |
| hire-coach | 18 | 3 | An empty coaching chair scores at the floor. |
| lab | 18 | 5 | Labs and projects as they open. |
| move-home | 17 | 4 | Programs at home. |
| found-graduate | 10 | 4 | A graduate program its host offers: breadth and the grad-school bound applicants. |
| research-cheap | 7 | 3 | Keep the labs busy, cheaply. |
| site-hall | 6 | 1 | A program is on offer and no hall has a slot for it. |
| build-academic | 4 | 1 | Keep the campus livable while it grows. |
| post-search | 3 | 1 | Nobody in the field is listed; a paid search finds someone. |
| venue-for-team | 3 | 1 | A varsity team waits on its venue; it cannot compete until it stands. |
| build-social | 2 | 2 | Keep the campus livable while it grows. |

**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):

| Years | Idle weeks | Answer-only weeks | Of |
|---|---|---|---|
| 1–10 | 364 | 28 | 520 |
| 11–20 | 282 | 30 | 520 |
| 21–30 | 231 | 36 | 520 |
| 31–40 | 361 | 28 | 520 |
| 41–50 | 401 | 21 | 520 |

**Repeated more than ten times in a year:** tend-teaching (14 years), develop-course (20 years), research-deep (2 years).

Modals answered over the run (median): 274. By type (median over runs): letter 8, summer 50, first-sport-club 1, milestone 83, decision-event 70, athletic-director 1, rankings-entry 1, catalogue-letter 12, championship 2, research-complete 41.

**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):

| Wanted | Runs | First year | Weeks | Why |
|---|---|---|---|---|
| train the faculty | 10/10 | 21 | 1385 | The teaching standard caps the target at 115; the only way up is to hire better teachers and fire weaker ones — no training, sabbatical or mentoring for the ones on the roster. |
| more seats now | 10/10 | 3 | 23 | The class fills every seat and no course can be started this week: the committee's seats, the faculty market or the hall slots are the ceiling on growth, not money. |
| shrink the student body | 5/10 | 36 | 1 | The body is bigger than the catalogue seats; only graduation shrinks it. |
| raise academic | 3/10 | 21 | 1 | academic is 38 and nothing on the menu serves it. |

Promises taken (all runs): Turning people away ×4, A college people recommend ×9, Four schools ×8.

## Do the goals make different colleges?

Each college at year 50 as 8 features scaled to 0–1 (students, prestige, satisfaction, courses, teams, placeables, price ratio, research); the distance between two goals' medians (0 = the same college; 1 = very different).

| | revenue | prestige | satisfaction | assets | championships | good-then-big | big-then-good |
|---|---|---|---|---|---|---|---|
| revenue | 0.00 | 0.58 | 0.33 | 0.61 | 0.56 | 0.57 | 0.59 |
| prestige | 0.58 | 0.00 | 0.62 | 0.08 | 0.25 | 0.07 | 0.10 |
| satisfaction | 0.33 | 0.62 | 0.00 | 0.65 | 0.50 | 0.59 | 0.67 |
| assets | 0.61 | 0.08 | 0.65 | 0.00 | 0.27 | 0.09 | 0.12 |
| championships | 0.56 | 0.25 | 0.50 | 0.27 | 0.00 | 0.19 | 0.34 |
| good-then-big | 0.57 | 0.07 | 0.59 | 0.09 | 0.19 | 0.00 | 0.16 |
| big-then-good | 0.59 | 0.10 | 0.67 | 0.12 | 0.34 | 0.16 | 0.00 |
