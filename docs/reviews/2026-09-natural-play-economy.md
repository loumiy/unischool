# The natural line of play — one fifty-year run

Blackmoor University, seed 12345, played by `sim/harness/natural.ts` (Plan 65). Written by `npm run natural` in 36 s.

## The line of play

Cash is spent to zero: anything a rule calls for is bought if the cash covers it. Each week, in this order:

1. **Satisfaction.** Any attribute under 100 that a building would raise gets the cheapest such building (a facility that serves it, the next residence hall, or another story on the library, a dining hall or a dorm). Nothing more is bought for it while one is going up. A building that only unlocks another counts for nothing here.
2. **Programs.** Every program on offer is founded where it belongs, hiring its first instructor off the market, never through a posted search. When no hall has a slot, the next academic hall goes up as soon as it is affordable. Otherwise, and once every program is founded, courses go deeper, the lowest rung first. A course that waits on a building gets the building. Dark courses are restaffed.
3. **Schools.** From 4 academic halls, Founders Hall included, programs move to their schools' halls as the game suggests, and a school spread over two halls is merged into one when another school's offer has nowhere to go (the game never suggests that move).
4. **Varsity.** Every petition is accepted, its venue built at once, and every coaching chair filled with the best candidate listed.
5. **Research.** Every idle lab funds the deepest initiative whose team would leave no course without an instructor.
6. **Everything else** on the build menu (labs, the landmark, amenities, chapter houses) as soon as it is affordable, and a graduate program wherever a host offers one.

**Capital projects come first:** one on the build menu is built before any rule spends, and while it waits on money the player saves for it, spending only on satisfaction (rule 1) and restaffing.

At admissions, tuition is the highest the slider allows short of the red tier (1.6× what prestige supports), the admit rate is left as the screen opens it, and every club and chapter petition is approved. Every other decision takes the game's default.

## The final score

**A · 75** — *Blackmoor University: a teaching college that never opened its doors very wide*. Rank 1 of 100 at the fiftieth summer.

| Standing | Grade | Mean over the run | First | Last |
|---|---|---|---|---|
| Academics | A | 73 | 43 | 97 |
| Research | A | 54 | 12 | 93 |
| Campus life | A | 60 | 24 | 91 |
| Athletic standing | C | 39 | 10 | 51 |
| Access | F | 29 | 29 | 28 |
| Financial strength | A | 44 | 6 | 100 |

The mark is 70% the six standings' mean, 20% the final rank and 10% the promises (state/finalReport.ts); promises: 0 kept, 0 missed, 22 declined.

## Every year

Read at each summer's close. *Net/wk* is the operating net (the toolbar's figure) averaged over the year's weeks; *programs* are majors standing in halls, graduate programs included; satisfaction is the overall score, then its five attributes. The overall score cannot pass 90: what a college does above 80 counts half (satisfactionSystem.ts's `diminished`), so five attributes at 100 read 90.

| Year | Enrolled | Applicants | Net/wk | Cash | Programs | Halls | Prestige | Rank | Satisfaction | Aca | Soc | Needs | Hlth | Hous |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 309 | 127 | $31k | $134k | 6 | 1 | 53.1 | 55 | 80 | 49 | 100 | 100 | 100 | 100 |
| 2 | 386 | 451 | $29k | $297k | 6 | 1 | 55.5 | 55 | 85 | 62 | 100 | 100 | 100 | 100 |
| 3 | 480 | 500 | $87k | $949k | 6 | 1 | 57.9 | 54 | 84 | 72 | 100 | 100 | 100 | 100 |
| 4 | 597 | 567 | $154k | $231k | 6 | 1 | 60.4 | 54 | 88 | 81 | 100 | 100 | 100 | 100 |
| 5 | 777 | 621 | $225k | $1.4M | 6 | 1 | 62.8 | 54 | 88 | 92 | 100 | 100 | 100 | 100 |
| 6 | 878 | 731 | $308k | $1.2M | 7 | 2 | 65.2 | 50 | 90 | 84 | 100 | 100 | 100 | 100 |
| 7 | 977 | 771 | $334k | $2.1M | 7 | 2 | 67.6 | 47 | 89 | 87 | 100 | 100 | 100 | 100 |
| 8 | 1,073 | 832 | $355k | $8.3M | 7 | 2 | 69.9 | 46 | 90 | 90 | 100 | 100 | 100 | 100 |
| 9 | 1,187 | 936 | $400k | $428k | 14 | 4 | 72.3 | 42 | 86 | 76 | 100 | 100 | 100 | 100 |
| 10 | 1,316 | 1,083 | $409k | $546k | 19 | 4 | 74.7 | 40 | 87 | 68 | 100 | 100 | 100 | 100 |
| 11 | 1,476 | 1,212 | $417k | $397k | 19 | 4 | 77.1 | 34 | 86 | 75 | 100 | 100 | 100 | 100 |
| 12 | 1,647 | 1,302 | $454k | $1.1M | 19 | 4 | 79.6 | 31 | 86 | 82 | 100 | 100 | 100 | 100 |
| 13 | 1,517 | 591 | $524k | $1.7M | 19 | 4 | 81.8 | 31 | 86 | 88 | 100 | 100 | 100 | 100 |
| 14 | 1,826 | 1,998 | $373k | $21.8M | 19 | 4 | 84.3 | 27 | 86 | 91 | 100 | 100 | 100 | 100 |
| 15 | 2,209 | 2,266 | $603k | $3.0M | 19 | 4 | 86.8 | 24 | 92 | 92 | 100 | 100 | 100 | 100 |
| 16 | 2,603 | 2,372 | $846k | $3.2M | 19 | 4 | 89.3 | 22 | 87 | 90 | 100 | 100 | 100 | 100 |
| 17 | 3,363 | 2,621 | $921k | $2.9M | 28 | 5 | 91.8 | 20 | 90 | 83 | 100 | 100 | 100 | 100 |
| 18 | 3,735 | 3,023 | $1.2M | $2.2M | 28 | 5 | 94.3 | 18 | 90 | 81 | 100 | 100 | 100 | 100 |
| 19 | 4,206 | 3,847 | $1.4M | $5.2M | 28 | 5 | 97.0 | 15 | 86 | 83 | 100 | 100 | 100 | 100 |
| 20 | 4,858 | 4,169 | $1.4M | $6.3M | 28 | 6 | 99.7 | 14 | 92 | 85 | 100 | 100 | 100 | 100 |
| 21 | 5,620 | 4,679 | $1.6M | $21.1M | 36 | 6 | 102.3 | 14 | 90 | 80 | 100 | 100 | 100 | 100 |
| 22 | 6,881 | 6,213 | $1.9M | $10.1M | 42 | 7 | 104.9 | 13 | 87 | 78 | 100 | 100 | 100 | 100 |
| 23 | 7,838 | 6,481 | $2.5M | $78.1M | 42 | 7 | 107.5 | 11 | 89 | 83 | 100 | 100 | 100 | 100 |
| 24 | 8,778 | 6,799 | $3.1M | $154.3M | 42 | 7 | 110.0 | 10 | 92 | 87 | 100 | 100 | 100 | 100 |
| 25 | 9,839 | 7,600 | $3.6M | $244.4M | 42 | 7 | 112.5 | 8 | 93 | 90 | 100 | 100 | 100 | 100 |
| 26 | 10,459 | 7,918 | $4.1M | $447.3M | 42 | 7 | 115.0 | 8 | 94 | 92 | 100 | 100 | 100 | 100 |
| 27 | 11,326 | 8,812 | $4.3M | $162.9M | 42 | 7 | 117.5 | 6 | 92 | 95 | 100 | 100 | 100 | 100 |
| 28 | 12,136 | 9,027 | $4.3M | $176.9M | 42 | 7 | 120.0 | 6 | 92 | 96 | 100 | 100 | 100 | 100 |
| 29 | 12,881 | 9,651 | $4.9M | $215.6M | 49 | 7 | 122.4 | 5 | 94 | 94 | 100 | 100 | 100 | 100 |
| 30 | 13,748 | 10,471 | $5.3M | $235.9M | 51 | 7 | 124.9 | 5 | 89 | 95 | 100 | 100 | 100 | 100 |
| 31 | 14,455 | 10,815 | $5.8M | $333.4M | 51 | 7 | 127.2 | 5 | 81 | 93 | 100 | 100 | 100 | 100 |
| 32 | 15,249 | 11,214 | $6.4M | $626.6M | 51 | 7 | 129.6 | 4 | 91 | 94 | 100 | 100 | 100 | 100 |
| 33 | 16,093 | 11,867 | $7.0M | $972.5M | 51 | 7 | 131.9 | 4 | 93 | 95 | 100 | 100 | 100 | 100 |
| 34 | 16,798 | 12,353 | $7.6M | $1.53B | 51 | 7 | 134.2 | 4 | 90 | 92 | 100 | 100 | 100 | 100 |
| 35 | 17,480 | 12,598 | $7.1M | $2.00B | 51 | 7 | 136.5 | 3 | 85 | 96 | 100 | 100 | 100 | 100 |
| 36 | 18,032 | 12,735 | $7.7M | $2.50B | 51 | 7 | 138.7 | 1 | 91 | 96 | 100 | 100 | 97 | 100 |
| 37 | 18,680 | 13,651 | $8.3M | $2.99B | 51 | 7 | 140.8 | 1 | 89 | 97 | 100 | 100 | 94 | 100 |
| 38 | 19,130 | 13,687 | $8.9M | $3.51B | 51 | 7 | 142.4 | 1 | 89 | 97 | 100 | 100 | 91 | 100 |
| 39 | 19,509 | 13,641 | $9.4M | $4.42B | 51 | 7 | 143.0 | 1 | 85 | 91 | 100 | 100 | 89 | 100 |
| 40 | 19,819 | 13,586 | $10.0M | $5.15B | 51 | 7 | 144.2 | 1 | 88 | 98 | 100 | 100 | 87 | 100 |
| 41 | 19,918 | 13,922 | $10.4M | $5.96B | 51 | 7 | 144.8 | 1 | 87 | 94 | 100 | 100 | 86 | 100 |
| 42 | 19,983 | 13,867 | $10.7M | $6.71B | 51 | 7 | 145.4 | 1 | 85 | 96 | 100 | 100 | 85 | 100 |
| 43 | 20,234 | 14,333 | $10.8M | $7.45B | 51 | 7 | 145.8 | 1 | 87 | 97 | 100 | 100 | 85 | 100 |
| 44 | 20,268 | 13,682 | $11.0M | $8.28B | 51 | 7 | 145.7 | 1 | 88 | 91 | 100 | 100 | 84 | 100 |
| 45 | 20,523 | 14,458 | $11.2M | $8.97B | 52 | 7 | 144.7 | 1 | 87 | 85 | 100 | 100 | 100 | 100 |
| 46 | 20,583 | 14,030 | $11.5M | $9.82B | 52 | 7 | 145.0 | 1 | 85 | 92 | 100 | 100 | 100 | 100 |
| 47 | 20,441 | 13,943 | $11.4M | $10.43B | 52 | 7 | 145.3 | 1 | 88 | 94 | 100 | 100 | 100 | 100 |
| 48 | 20,690 | 14,535 | $11.2M | $11.12B | 52 | 7 | 145.7 | 1 | 88 | 96 | 100 | 100 | 100 | 100 |
| 49 | 20,734 | 14,579 | $11.4M | $11.97B | 52 | 7 | 146.0 | 1 | 90 | 96 | 100 | 100 | 100 | 100 |
| 50 | 21,016 | 14,807 | $11.6M | $12.83B | 52 | 7 | 146.2 | 1 | 90 | 94 | 100 | 100 | 100 | 100 |

Weeks in the red: 2. The programs were sorted into their schools' halls from year 9.

## Campus assets never built

Satisfaction buildings go up only under rule 1 (an attribute under 100 that the building would raise), so the ones below were never needed to hold satisfaction where this run held it. Everything else on the build menu was built as soon as it could be paid for.

**Satisfaction buildings never built (14):**

| Building | Serves | Cost | Ever on the menu |
|---|---|---|---|
| Waterside Commons | basic needs | $16.0M | yes |
| Harborview Market | basic needs | $26.4M | no |
| Central Dining Pavilion | basic needs | $38.4M | no |
| Crestline House | housing | $20.0M | yes |
| Overlook Village | housing | $40.0M | no |
| Ridgeline Village | housing | $46.0M | no |
| Meridian Tower | housing | $200.0M | no |
| Beacon Tower | housing | $250.0M | no |
| Horizon Tower | housing | $300.0M | no |
| Aurora Tower | housing | $360.0M | no |
| Recreation Center | social | $450k | yes |
| Student Union Expansion | social | $1.1M | yes |
| Field House | social | $1.2M | yes |
| Athletics Complex | social | $1.9M | yes |

**Everything else never built (2):**

| Building | Kind | Cost | Ever on the menu |
|---|---|---|---|
| The Great Dome | grand landmark | $30.0M | yes |
| The Triumphal Gate | grand landmark | $30.0M | yes |

**Built (67), by year:**

| Year | Building | Kind | Why |
|---|---|---|---|
| 1 | Campus Quad | social facility | rule 1: social |
| 1 | Founders Hall | academic hall | stood at founding |
| 1 | Grand Quad & Gardens | social facility | rule 1: social |
| 1 | Library | academic facility | rule 1: academic |
| 1 | Meadow House | residence hall | rule 1: housing |
| 1 | Student Center | social facility | rule 1: social |
| 1 | The Founder's Statue | amenity | rule 6: on the menu |
| 1 | The Original Commons | basic needs facility | rule 1: basic needs |
| 2 | The Fountain | amenity | rule 6: on the menu |
| 5 | Sullivan School of Health Science | academic hall | rule 2: program slots |
| 5 | The Chapel | amenity | rule 6: on the menu |
| 5 | Union Square Eatery | basic needs facility | rule 1: basic needs |
| 7 | Wagner Field | varsity venue | rule 4: a varsity team |
| 8 | Sang School of Social Sciences & Humanities | academic hall | rule 2: program slots |
| 9 | Pemberton School of Science | academic hall | rule 2: program slots |
| 9 | The Bell Tower | amenity | rule 6: on the menu |
| 11 | Natatorium | varsity venue | rule 4: a varsity team |
| 12 | Arena | varsity venue | rule 4: a varsity team |
| 12 | Biology Labs | lab | rule 2: a course waited on it |
| 12 | Chemistry Labs | lab | rule 2: a course waited on it |
| 12 | Humanities Research Institute | lab | rule 2: a course waited on it |
| 12 | Physics Labs | lab | rule 2: a course waited on it |
| 13 | Health & Counseling Center | health facility | rule 1: health |
| 13 | Lakeside House | residence hall | rule 1: housing |
| 13 | The Formal Garden | amenity | rule 6: on the menu |
| 15 | The Research Park | capital project | capital project: first |
| 16 | Commons Cafeteria | basic needs facility | rule 1: basic needs |
| 16 | Gym & Fitness Center | health facility | rule 1: health |
| 16 | Hamilton School of Engineering | academic hall | rule 2: program slots |
| 17 | Civil Engineering Labs | lab | rule 6: on the menu |
| 17 | Electrical Engineering Labs | lab | rule 6: on the menu |
| 17 | Mechanical Engineering Labs | lab | rule 6: on the menu |
| 18 | Aerospace Engineering Labs | lab | rule 6: on the menu |
| 18 | Chemical Engineering Labs | lab | rule 6: on the menu |
| 19 | Reilly Stadium | varsity venue | rule 4: a varsity team |
| 19 | Riverside House | residence hall | rule 1: housing |
| 20 | Wallace School of Computer Science | academic hall | rule 2: program slots |
| 21 | Computing Research Center | lab | rule 2: a course waited on it |
| 21 | Hayes School of Business | academic hall | rule 2: program slots |
| 21 | Neuroscience Labs | lab | rule 6: on the menu |
| 21 | The Grand Table | basic needs facility | rule 1: basic needs |
| 22 | Experimental Economics Lab | lab | rule 2: a course waited on it |
| 22 | Hillcrest House | residence hall | rule 1: housing |
| 22 | Media Production Studio | lab | rule 2: a course waited on it |
| 22 | The Campanile | grand landmark | rule 6: on the menu |
| 23 | Art Gallery | social facility | rule 2: a course waited on it |
| 23 | Swimming Pool | health facility | rule 1: health |
| 23 | University Clinic | health facility | rule 2: a course waited on it |
| 24 | Cascade House | residence hall | rule 1: housing |
| 25 | Alpha Omicron Psi House | chapter house | rule 6: a chapter asked for it |
| 25 | Amin Park | varsity venue | rule 4: a varsity team |
| 26 | Old Well Commons | basic needs facility | rule 1: basic needs |
| 26 | Summit House | residence hall | rule 1: housing |
| 27 | The Arts Center | capital project | capital project: first |
| 27 | The Business School | capital project | capital project: first |
| 27 | The Graduate College | capital project | capital project: first |
| 27 | The Law School | capital project | capital project: first |
| 31 | Vanguard House | residence hall | rule 1: housing |
| 33 | Tennis Courts | health facility | rule 1: health |
| 34 | Eta Epsilon Kappa House | chapter house | rule 6: a chapter asked for it |
| 35 | Campus Grocery Store | basic needs facility | rule 1: basic needs |
| 35 | The University Museum | capital project | capital project: first |
| 37 | Sterling House | residence hall | rule 1: housing |
| 38 | Psi Nu Upsilon House | chapter house | rule 6: a chapter asked for it |
| 44 | Medical Center | health facility | rule 1: health |
| 44 | Phi Xi Phi House | chapter house | rule 6: a chapter asked for it |
| 47 | Sigma Phi Rho House | chapter house | rule 6: a chapter asked for it |

Stories added under rule 1: The Original Commons ×2, Meadow House ×2, Union Square Eatery ×2, Lakeside House ×2, Commons Cafeteria ×2, Riverside House ×2, Hillcrest House ×2, Library ×2, The Grand Table ×2, Cascade House ×2, Summit House ×2, Old Well Commons ×2, Vanguard House ×2, Sterling House ×1.

## Capital projects

Built as soon as each reached the build menu, saving for it when the cash fell short: 98 weeks spent saving.

| Project | Cost | On the menu | Put up | Built |
|---|---|---|---|---|
| The Research Park | $45.0M | year 13 | year 15 | yes |
| The Graduate College | $25.0M | year 27 | year 27 | yes |
| The Arts Center | $35.0M | year 27 | year 27 | yes |
| The Law School | $35.0M | year 27 | year 27 | yes |
| The Business School | $35.0M | year 27 | year 27 | yes |
| The University Museum | $60.0M | year 35 | year 35 | yes |

## Research: grants against investment

| | |
|---|---|
| Invested in initiatives (up-front funding) | $3.47B |
| Grant money received | $7.69B (1377 grants) |
| Return | 222% of what was invested |
| Initiatives funded | 60 pilot, 41 project, 25 program, 56 landmark |

## Varsity

20 petitions accepted, 5 declined for want of cash; 107 coaches hired. 20 varsity teams at the end.

