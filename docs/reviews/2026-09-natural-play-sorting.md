# The natural line of play — one fifty-year run

Blackmoor University, seed 12345, played by `sim/harness/natural.ts` (Plan 65). Written by `npm run natural` in 23 s.

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

**B · 68** — *Blackmoor University: a jock school that never balanced its books*. Rank 1 of 100 at the fiftieth summer.

| Standing | Grade | Mean over the run | First | Last |
|---|---|---|---|---|
| Academics | A | 75 | 43 | 99 |
| Research | A | 67 | 15 | 97 |
| Campus life | A | 67 | 28 | 93 |
| Athletic standing | C | 44 | 23 | 50 |
| Access | F | 29 | 29 | 28 |
| Financial strength | F | 1 | 2 | 2 |

The mark is 70% the six standings' mean, 20% the final rank and 10% the promises (state/finalReport.ts); promises: 0 kept, 0 missed, 15 declined.

## Every year

Read at each summer's close. *Net/wk* is the operating net (the toolbar's figure) averaged over the year's weeks; *programs* are majors standing in halls, graduate programs included; satisfaction is the overall score, then its five attributes. The overall score cannot pass 90: what a college does above 80 counts half (satisfactionSystem.ts's `diminished`), so five attributes at 100 read 90.

| Year | Enrolled | Applicants | Net/wk | Cash | Programs | Halls | Prestige | Rank | Satisfaction | Aca | Soc | Needs | Hlth | Hous |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 619 | 979 | $22k | $182k | 8 | 2 | 53.4 | 55 | 86 | 100 | 100 | 100 | 100 | 100 |
| 2 | 1,022 | 1,349 | $171k | $1.2M | 11 | 3 | 55.7 | 54 | 89 | 100 | 100 | 100 | 100 | 100 |
| 3 | 1,553 | 1,705 | $370k | $15.7M | 14 | 4 | 58.0 | 54 | 92 | 100 | 100 | 100 | 100 | 100 |
| 4 | 2,408 | 2,597 | $626k | $36.7M | 15 | 4 | 60.3 | 54 | 95 | 100 | 100 | 100 | 100 | 100 |
| 5 | 2,984 | 2,576 | $1.0M | $82.4M | 16 | 4 | 62.8 | 50 | 91 | 100 | 100 | 100 | 100 | 100 |
| 6 | 3,613 | 3,081 | $1.3M | $140.3M | 17 | 4 | 65.4 | 50 | 92 | 100 | 100 | 100 | 100 | 100 |
| 7 | 4,286 | 3,558 | $1.6M | $218.4M | 18 | 4 | 68.0 | 44 | 94 | 100 | 100 | 100 | 100 | 100 |
| 8 | 4,980 | 4,497 | $1.9M | $302.4M | 19 | 4 | 70.7 | 40 | 94 | 100 | 100 | 100 | 100 | 100 |
| 9 | 5,731 | 4,852 | $2.2M | $420.4M | 20 | 4 | 73.4 | 38 | 89 | 100 | 100 | 100 | 100 | 100 |
| 10 | 6,908 | 6,323 | $2.5M | $537.8M | 21 | 4 | 76.3 | 34 | 93 | 100 | 100 | 100 | 100 | 100 |
| 11 | 8,196 | 7,103 | $3.2M | $687.1M | 22 | 4 | 79.2 | 27 | 91 | 100 | 100 | 100 | 100 | 100 |
| 12 | 9,659 | 8,318 | $3.8M | $837.4M | 23 | 4 | 82.0 | 26 | 89 | 100 | 100 | 100 | 100 | 100 |
| 13 | 11,182 | 9,045 | $4.6M | $1.02B | 24 | 4 | 84.8 | 23 | 95 | 100 | 100 | 100 | 100 | 100 |
| 14 | 11,600 | 10,028 | $5.1M | $1.21B | 25 | 5 | 87.6 | 22 | 97 | 100 | 100 | 100 | 100 | 100 |
| 15 | 12,893 | 10,664 | $5.2M | $1.50B | 26 | 5 | 90.3 | 21 | 93 | 100 | 100 | 100 | 100 | 100 |
| 16 | 13,858 | 10,974 | $6.0M | $1.85B | 27 | 5 | 93.1 | 18 | 91 | 100 | 100 | 100 | 100 | 100 |
| 17 | 14,847 | 11,459 | $6.5M | $2.20B | 28 | 5 | 95.8 | 16 | 94 | 100 | 100 | 100 | 100 | 100 |
| 18 | 16,687 | 12,847 | $7.1M | $2.61B | 29 | 5 | 98.6 | 16 | 91 | 100 | 100 | 100 | 100 | 100 |
| 19 | 17,463 | 13,029 | $7.8M | $3.12B | 30 | 5 | 101.3 | 12 | 90 | 100 | 100 | 100 | 100 | 100 |
| 20 | 18,364 | 13,599 | $8.1M | $3.54B | 32 | 5 | 104.1 | 12 | 90 | 100 | 100 | 100 | 98 | 100 |
| 21 | 19,371 | 14,231 | $8.6M | $4.21B | 35 | 6 | 106.8 | 10 | 91 | 100 | 100 | 100 | 93 | 100 |
| 22 | 20,482 | 15,677 | $9.3M | $4.84B | 37 | 6 | 109.4 | 9 | 91 | 100 | 100 | 100 | 88 | 100 |
| 23 | 21,726 | 16,311 | $9.8M | $5.42B | 39 | 6 | 112.0 | 5 | 89 | 100 | 100 | 100 | 100 | 100 |
| 24 | 23,045 | 17,110 | $10.2M | $5.97B | 41 | 6 | 114.6 | 6 | 93 | 100 | 100 | 100 | 100 | 100 |
| 25 | 24,421 | 18,211 | $10.4M | $6.83B | 42 | 6 | 117.2 | 5 | 90 | 100 | 100 | 100 | 100 | 100 |
| 26 | 25,545 | 18,772 | $10.9M | $7.81B | 42 | 6 | 119.7 | 4 | 90 | 100 | 100 | 100 | 100 | 100 |
| 27 | 26,367 | 18,692 | $11.4M | $8.77B | 43 | 7 | 122.2 | 4 | 90 | 100 | 100 | 100 | 100 | 100 |
| 28 | 27,360 | 19,654 | $11.8M | $10.27B | 44 | 7 | 124.7 | 4 | 88 | 100 | 100 | 100 | 100 | 100 |
| 29 | 27,900 | 19,696 | $12.3M | $11.50B | 45 | 7 | 127.1 | 4 | 87 | 100 | 100 | 100 | 100 | 100 |
| 30 | 28,365 | 20,436 | $12.6M | $12.82B | 47 | 7 | 129.5 | 4 | 90 | 100 | 100 | 100 | 100 | 100 |
| 31 | 29,026 | 20,511 | $12.9M | $14.00B | 48 | 7 | 131.8 | 4 | 88 | 100 | 100 | 100 | 100 | 100 |
| 32 | 29,633 | 21,166 | $13.4M | $15.14B | 50 | 7 | 134.2 | 4 | 88 | 100 | 100 | 100 | 100 | 100 |
| 33 | 30,117 | 20,647 | $13.8M | $16.75B | 52 | 7 | 136.5 | 2 | 88 | 100 | 100 | 100 | 100 | 100 |
| 34 | 30,847 | 22,446 | $14.1M | $18.28B | 52 | 7 | 138.8 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 35 | 30,719 | 22,654 | $15.0M | $19.84B | 52 | 7 | 141.0 | 1 | 86 | 100 | 100 | 100 | 100 | 100 |
| 36 | 31,123 | 22,278 | $14.5M | $21.99B | 52 | 7 | 142.9 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 37 | 32,130 | 23,418 | $14.9M | $24.08B | 52 | 7 | 144.4 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 38 | 33,478 | 23,822 | $15.3M | $25.95B | 52 | 7 | 145.6 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 39 | 33,360 | 24,151 | $15.9M | $27.85B | 52 | 7 | 146.5 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 40 | 33,517 | 22,988 | $16.0M | $29.56B | 52 | 7 | 147.2 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 41 | 33,698 | 23,640 | $16.3M | $31.42B | 52 | 7 | 147.8 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 42 | 33,795 | 24,088 | $16.4M | $33.53B | 52 | 7 | 148.3 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 43 | 34,480 | 24,106 | $16.6M | $35.77B | 52 | 7 | 148.6 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 44 | 34,480 | 23,708 | $17.0M | $38.12B | 52 | 7 | 148.9 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 45 | 34,480 | 24,313 | $16.9M | $39.73B | 52 | 7 | 149.2 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 46 | 33,040 | 23,935 | $17.1M | $41.62B | 52 | 7 | 149.3 | 1 | 85 | 100 | 100 | 100 | 100 | 100 |
| 47 | 32,768 | 23,190 | $16.8M | $43.09B | 52 | 7 | 149.5 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 48 | 33,010 | 23,647 | $16.8M | $44.87B | 52 | 7 | 149.6 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 49 | 32,802 | 23,350 | $17.1M | $47.23B | 52 | 7 | 149.7 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 50 | 34,476 | 24,731 | $17.0M | $49.22B | 52 | 7 | 149.7 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |

Weeks in the red: 0. The programs were sorted into their schools' halls from year 3.

## Campus assets never built

Satisfaction buildings go up only under rule 1 (an attribute under 100 that the building would raise), so the ones below were never needed to hold satisfaction where this run held it. Everything else on the build menu was built as soon as it could be paid for.

**Satisfaction buildings never built (9):**

| Building | Serves | Cost | Ever on the menu |
|---|---|---|---|
| Harborview Market | basic needs | $26.4M | yes |
| Central Dining Pavilion | basic needs | $38.4M | no |
| Meridian Tower | housing | $200.0M | yes |
| Beacon Tower | housing | $250.0M | no |
| Horizon Tower | housing | $300.0M | no |
| Aurora Tower | housing | $360.0M | no |
| Student Union Expansion | social | $1.1M | yes |
| Field House | social | $1.2M | yes |
| Athletics Complex | social | $1.9M | yes |

**Everything else never built (2):**

| Building | Kind | Cost | Ever on the menu |
|---|---|---|---|
| The Great Dome | grand landmark | $30.0M | yes |
| The Triumphal Gate | grand landmark | $30.0M | yes |

**Built (74), by year:**

| Year | Building | Kind | Why |
|---|---|---|---|
| 1 | Campus Quad | social facility | rule 1: social |
| 1 | Founders Hall | academic hall | stood at founding |
| 1 | Library | academic facility | rule 1: academic |
| 1 | Meadow House | residence hall | rule 1: housing |
| 1 | Medina School of Science | academic hall | rule 2: program slots |
| 1 | Student Center | social facility | rule 1: social |
| 1 | The Founder's Statue | amenity | rule 6: on the menu |
| 1 | The Original Commons | basic needs facility | rule 1: basic needs |
| 2 | Campbell School of Social Sciences & Humanities | academic hall | rule 2: program slots |
| 2 | Kavanagh School of Business | academic hall | rule 2: program slots |
| 2 | The Fountain | amenity | rule 6: on the menu |
| 2 | Union Square Eatery | basic needs facility | rule 1: basic needs |
| 3 | The Chapel | amenity | rule 6: on the menu |
| 4 | Health & Counseling Center | health facility | rule 1: health |
| 4 | Humanities Research Institute | lab | rule 6: on the menu |
| 4 | Lakeside House | residence hall | rule 1: housing |
| 4 | Sen Park | varsity venue | rule 4: a varsity team |
| 4 | The Formal Garden | amenity | rule 6: on the menu |
| 5 | Commons Cafeteria | basic needs facility | rule 1: basic needs |
| 5 | Gym & Fitness Center | health facility | rule 1: health |
| 6 | Biology Labs | lab | rule 2: a course waited on it |
| 6 | Chemistry Labs | lab | rule 6: on the menu |
| 6 | Moreau Aquatic Center | varsity venue | rule 4: a varsity team |
| 6 | Physics Labs | lab | rule 2: a course waited on it |
| 7 | Experimental Economics Lab | lab | rule 2: a course waited on it |
| 8 | Riverside House | residence hall | rule 1: housing |
| 8 | The Grand Table | basic needs facility | rule 1: basic needs |
| 9 | Coleman Arena | varsity venue | rule 4: a varsity team |
| 9 | Santos Field | varsity venue | rule 4: a varsity team |
| 9 | The Bell Tower | amenity | rule 6: on the menu |
| 10 | Hillcrest House | residence hall | rule 1: housing |
| 11 | Swimming Pool | health facility | rule 1: health |
| 12 | Cascade House | residence hall | rule 1: housing |
| 12 | Psi Psi Tau House | chapter house | rule 6: a chapter asked for it |
| 12 | The Research Park | capital project | capital project: first |
| 13 | Aerospace Engineering Labs | lab | rule 2: a course waited on it |
| 13 | Chemical Engineering Labs | lab | rule 2: a course waited on it |
| 13 | Civil Engineering Labs | lab | rule 2: a course waited on it |
| 13 | Electrical Engineering Labs | lab | rule 2: a course waited on it |
| 13 | Mechanical Engineering Labs | lab | rule 6: on the menu |
| 13 | Old Well Commons | basic needs facility | rule 1: basic needs |
| 13 | Summit House | residence hall | rule 1: housing |
| 13 | Tennis Courts | health facility | rule 1: health |
| 14 | Laurent School of Engineering | academic hall | rule 2: program slots |
| 14 | University Clinic | health facility | rule 1: health |
| 16 | The Campanile | grand landmark | rule 6: on the menu |
| 18 | The Graduate College | capital project | capital project: first |
| 18 | Vanguard House | residence hall | rule 1: housing |
| 19 | Campus Grocery Store | basic needs facility | rule 1: basic needs |
| 19 | Computing Research Center | lab | rule 2: a course waited on it |
| 20 | Nu Zeta Gamma House | chapter house | rule 6: a chapter asked for it |
| 20 | Raman School of Computer Science | academic hall | rule 2: program slots |
| 20 | The Business School | capital project | capital project: first |
| 21 | Sterling House | residence hall | rule 1: housing |
| 21 | The Law School | capital project | capital project: first |
| 22 | Grand Quad & Gardens | social facility | rule 1: social |
| 23 | Medical Center | health facility | rule 1: health |
| 24 | Crestline House | residence hall | rule 1: housing |
| 24 | Mbwana Stadium | varsity venue | rule 4: a varsity team |
| 25 | Art Gallery | social facility | rule 2: a course waited on it |
| 25 | Media Production Studio | lab | rule 2: a course waited on it |
| 25 | Recreation Center | social facility | rule 1: social |
| 26 | Brennan School of Health Science | academic hall | rule 2: program slots |
| 27 | Overlook Village | residence hall | rule 1: housing |
| 27 | The Arts Center | capital project | capital project: first |
| 29 | Psi Beta Rho House | chapter house | rule 6: a chapter asked for it |
| 32 | Neuroscience Labs | lab | rule 2: a course waited on it |
| 33 | Chi Mu Nu House | chapter house | rule 6: a chapter asked for it |
| 35 | The University Museum | capital project | capital project: first |
| 38 | Delta Omega Rho House | chapter house | rule 6: a chapter asked for it |
| 38 | Ridgeline Village | residence hall | rule 1: housing |
| 41 | Mu Theta Chi House | chapter house | rule 6: a chapter asked for it |
| 44 | Waterside Commons | basic needs facility | rule 1: basic needs |
| 45 | Pi Iota Epsilon House | chapter house | rule 6: a chapter asked for it |

Stories added under rule 1: The Original Commons ×2, Meadow House ×2, Union Square Eatery ×2, Lakeside House ×2, Commons Cafeteria ×2, Riverside House ×2, Hillcrest House ×2, The Grand Table ×2, Library ×2, Cascade House ×2, Summit House ×2, Old Well Commons ×2, Vanguard House ×2, Sterling House ×2, Crestline House ×2, Overlook Village ×2.

## Capital projects

Built as soon as each reached the build menu, saving for it when the cash fell short: 0 weeks spent saving.

| Project | Cost | On the menu | Put up | Built |
|---|---|---|---|---|
| The Research Park | $45.0M | year 12 | year 12 | yes |
| The Graduate College | $25.0M | year 18 | year 18 | yes |
| The Business School | $35.0M | year 20 | year 20 | yes |
| The Law School | $35.0M | year 21 | year 21 | yes |
| The Arts Center | $35.0M | year 27 | year 27 | yes |
| The University Museum | $60.0M | year 35 | year 35 | yes |

## Research: grants against investment

| | |
|---|---|
| Invested in initiatives (up-front funding) | $6.15B |
| Grant money received | $31.30B (1289 grants) |
| Return | 509% of what was invested |
| Initiatives funded | 63 pilot, 75 project, 35 program, 47 landmark |

## Varsity

20 petitions accepted, 0 declined for want of cash; 114 coaches hired. 20 varsity teams at the end.

