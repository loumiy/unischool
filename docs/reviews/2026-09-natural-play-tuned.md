# The natural line of play — one fifty-year run

Blackmoor University, seed 12345, played by `sim/harness/natural.ts` (Plan 65). Written by `npm run natural` in 29 s.

## The line of play

Cash is spent to zero: anything a rule calls for is bought if the cash covers it. Each week, in this order:

1. **Satisfaction.** Any attribute under 100 that a building would raise gets the cheapest such building (a facility that serves it, the next residence hall, or another story on the library, a dining hall or a dorm). Nothing more is bought for it while one is going up. A building that only unlocks another counts for nothing here.
2. **Programs.** Every program on offer is founded where it belongs, hiring its first instructor off the market, never through a posted search. When no hall has a slot, the next academic hall goes up as soon as it is affordable. Otherwise, and once every program is founded, courses go deeper, the lowest rung first. A course that waits on a building gets the building. Dark courses are restaffed.
3. **Schools.** From 7 academic halls, Founders Hall included, programs move to their schools' halls as the game suggests, and a school spread over two halls is merged into one when another school's offer has nowhere to go (the game never suggests that move).
4. **Varsity.** Every petition is accepted, its venue built at once, and every coaching chair filled with the best candidate listed.
5. **Research.** Every idle lab funds the deepest initiative whose team would leave no course without an instructor.
6. **Everything else** on the build menu (labs, the landmark, amenities, chapter houses) as soon as it is affordable, and a graduate program wherever a host offers one.

**Capital projects come first:** one on the build menu is built before any rule spends, and while it waits on money the player saves for it, spending only on satisfaction (rule 1) and restaffing.

At admissions, tuition is the highest the slider allows short of the red tier (1.6× what prestige supports), the admit rate is left as the screen opens it, and every club and chapter petition is approved. Every other decision takes the game's default.

## The final score

**B · 68** — *Blackmoor University: a country club that never balanced its books*. Rank 1 of 100 at the fiftieth summer.

| Standing | Grade | Mean over the run | First | Last |
|---|---|---|---|---|
| Academics | A | 74 | 42 | 99 |
| Research | A | 73 | 18 | 99 |
| Campus life | A | 67 | 26 | 92 |
| Athletic standing | C | 42 | 17 | 50 |
| Access | F | 29 | 29 | 28 |
| Financial strength | F | 2 | 2 | 2 |

The mark is 70% the six standings' mean, 20% the final rank and 10% the promises (state/finalReport.ts); promises: 0 kept, 0 missed, 8 declined.

## Every year

Read at each summer's close. *Net/wk* is the operating net (the toolbar's figure) averaged over the year's weeks; *programs* are majors standing in halls, graduate programs included; satisfaction is the overall score, then its five attributes. The overall score cannot pass 90: what a college does above 80 counts half (satisfactionSystem.ts's `diminished`), so five attributes at 100 read 90.

| Year | Enrolled | Applicants | Net/wk | Cash | Programs | Halls | Prestige | Rank | Satisfaction | Aca | Soc | Needs | Hlth | Hous |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 545 | 777 | $28k | $148k | 6 | 1 | 52.7 | 55 | 86 | 100 | 100 | 100 | 100 | 100 |
| 2 | 842 | 1,057 | $142k | $437k | 6 | 1 | 54.9 | 54 | 90 | 100 | 100 | 92 | 100 | 100 |
| 3 | 1,216 | 1,273 | $296k | $8.7M | 9 | 3 | 57.0 | 54 | 91 | 100 | 100 | 100 | 100 | 100 |
| 4 | 1,687 | 1,538 | $487k | $24.4M | 11 | 5 | 59.2 | 53 | 92 | 100 | 100 | 100 | 100 | 100 |
| 5 | 2,234 | 2,284 | $687k | $17.3M | 41 | 7 | 61.2 | 53 | 91 | 100 | 100 | 100 | 100 | 100 |
| 6 | 2,936 | 2,990 | $700k | $633k | 42 | 7 | 63.7 | 50 | 94 | 100 | 100 | 100 | 90 | 100 |
| 7 | 3,671 | 3,295 | $953k | $31.6M | 42 | 7 | 66.6 | 45 | 91 | 100 | 100 | 100 | 68 | 100 |
| 8 | 4,679 | 4,314 | $1.3M | $91.8M | 42 | 7 | 69.6 | 43 | 89 | 100 | 100 | 100 | 54 | 100 |
| 9 | 5,475 | 4,474 | $1.4M | $183.4M | 42 | 7 | 72.7 | 35 | 90 | 100 | 100 | 100 | 43 | 100 |
| 10 | 6,753 | 6,510 | $1.9M | $267.8M | 42 | 7 | 75.7 | 32 | 91 | 100 | 100 | 100 | 37 | 100 |
| 11 | 7,994 | 6,991 | $2.7M | $417.4M | 42 | 7 | 78.6 | 28 | 90 | 100 | 100 | 100 | 100 | 100 |
| 12 | 9,116 | 7,469 | $2.9M | $586.6M | 43 | 7 | 81.6 | 27 | 88 | 100 | 100 | 100 | 100 | 100 |
| 13 | 10,576 | 8,494 | $3.6M | $824.9M | 43 | 7 | 84.4 | 25 | 92 | 100 | 100 | 100 | 88 | 100 |
| 14 | 11,670 | 9,242 | $4.4M | $1.15B | 43 | 7 | 87.3 | 25 | 91 | 100 | 100 | 100 | 76 | 100 |
| 15 | 13,099 | 10,859 | $4.5M | $1.40B | 43 | 7 | 90.1 | 23 | 92 | 100 | 100 | 100 | 69 | 100 |
| 16 | 14,449 | 11,188 | $5.4M | $1.80B | 43 | 7 | 92.9 | 18 | 91 | 100 | 100 | 100 | 61 | 100 |
| 17 | 15,608 | 11,686 | $6.3M | $2.17B | 51 | 7 | 95.6 | 17 | 89 | 100 | 100 | 100 | 55 | 100 |
| 18 | 17,030 | 13,158 | $6.7M | $2.94B | 51 | 7 | 98.3 | 16 | 89 | 100 | 100 | 100 | 51 | 100 |
| 19 | 18,017 | 13,577 | $6.7M | $3.99B | 51 | 7 | 101.0 | 15 | 86 | 100 | 100 | 100 | 47 | 100 |
| 20 | 18,946 | 13,819 | $7.4M | $4.99B | 51 | 7 | 103.6 | 12 | 87 | 100 | 100 | 100 | 44 | 100 |
| 21 | 19,889 | 14,282 | $8.1M | $6.00B | 51 | 7 | 106.2 | 12 | 88 | 100 | 100 | 100 | 42 | 100 |
| 22 | 20,415 | 14,605 | $8.7M | $6.91B | 51 | 7 | 108.8 | 12 | 88 | 100 | 100 | 100 | 40 | 100 |
| 23 | 21,039 | 15,781 | $9.0M | $7.72B | 52 | 7 | 111.3 | 9 | 88 | 100 | 100 | 100 | 100 | 100 |
| 24 | 22,080 | 16,512 | $8.6M | $8.70B | 52 | 7 | 113.8 | 8 | 90 | 100 | 100 | 100 | 100 | 100 |
| 25 | 23,246 | 17,492 | $9.3M | $9.99B | 52 | 7 | 116.3 | 7 | 92 | 100 | 100 | 100 | 100 | 100 |
| 26 | 24,550 | 17,954 | $10.1M | $11.56B | 52 | 7 | 118.7 | 6 | 90 | 100 | 100 | 100 | 100 | 100 |
| 27 | 25,499 | 18,567 | $11.2M | $12.78B | 52 | 7 | 121.1 | 5 | 89 | 100 | 100 | 100 | 100 | 100 |
| 28 | 26,321 | 18,775 | $12.0M | $14.60B | 52 | 7 | 123.5 | 5 | 90 | 100 | 100 | 100 | 100 | 100 |
| 29 | 27,167 | 19,502 | $11.7M | $16.19B | 52 | 7 | 125.8 | 5 | 90 | 100 | 100 | 100 | 100 | 100 |
| 30 | 27,564 | 19,047 | $12.5M | $17.80B | 52 | 7 | 128.1 | 4 | 88 | 100 | 100 | 100 | 100 | 100 |
| 31 | 27,978 | 19,937 | $13.0M | $19.31B | 52 | 7 | 130.4 | 4 | 89 | 100 | 100 | 100 | 100 | 100 |
| 32 | 28,165 | 20,445 | $13.5M | $20.41B | 52 | 7 | 132.7 | 4 | 88 | 100 | 100 | 100 | 100 | 100 |
| 33 | 28,661 | 20,867 | $13.8M | $22.11B | 52 | 7 | 134.9 | 3 | 86 | 100 | 100 | 100 | 100 | 100 |
| 34 | 29,482 | 21,080 | $14.4M | $23.61B | 52 | 7 | 137.1 | 3 | 88 | 100 | 100 | 100 | 100 | 100 |
| 35 | 30,614 | 22,018 | $15.0M | $25.21B | 52 | 7 | 139.3 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 36 | 31,380 | 22,554 | $14.4M | $27.09B | 52 | 7 | 141.4 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 37 | 32,117 | 23,069 | $14.9M | $28.77B | 52 | 7 | 143.2 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 38 | 32,781 | 22,785 | $15.2M | $30.59B | 52 | 7 | 144.6 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 39 | 33,339 | 23,553 | $15.5M | $32.44B | 52 | 7 | 145.8 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 40 | 33,770 | 23,567 | $15.9M | $33.74B | 52 | 7 | 146.7 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 41 | 33,760 | 23,538 | $16.3M | $35.24B | 52 | 7 | 147.4 | 1 | 86 | 100 | 100 | 100 | 100 | 100 |
| 42 | 34,094 | 23,705 | $16.5M | $36.88B | 52 | 7 | 147.9 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 43 | 34,160 | 24,091 | $16.6M | $38.30B | 52 | 7 | 148.4 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 44 | 34,480 | 24,491 | $16.9M | $39.75B | 52 | 7 | 148.7 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 45 | 32,320 | 24,578 | $17.1M | $41.97B | 52 | 7 | 149.0 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 46 | 32,698 | 24,747 | $16.5M | $43.55B | 52 | 7 | 149.2 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 47 | 32,657 | 23,810 | $16.6M | $45.43B | 52 | 7 | 149.4 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 48 | 32,347 | 24,307 | $16.6M | $47.47B | 52 | 7 | 149.5 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 49 | 34,480 | 24,058 | $16.7M | $50.21B | 52 | 7 | 149.6 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 50 | 34,368 | 24,437 | $17.5M | $52.55B | 52 | 7 | 149.7 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |

Weeks in the red: 0. The programs were sorted into their schools' halls from year 5.

## Campus assets never built

Satisfaction buildings go up only under rule 1 (an attribute under 100 that the building would raise), so the ones below were never needed to hold satisfaction where this run held it. Everything else on the build menu was built as soon as it could be paid for.

**Satisfaction buildings never built (13):**

| Building | Serves | Cost | Ever on the menu |
|---|---|---|---|
| Harborview Market | basic needs | $26.4M | yes |
| Central Dining Pavilion | basic needs | $38.4M | no |
| Tennis Courts | health | $700k | no |
| Swimming Pool | health | $1.4M | no |
| Gym & Fitness Center | health | $1.4M | no |
| Meridian Tower | housing | $200.0M | yes |
| Beacon Tower | housing | $250.0M | no |
| Horizon Tower | housing | $300.0M | no |
| Aurora Tower | housing | $360.0M | no |
| Recreation Center | social | $450k | yes |
| Student Union Expansion | social | $1.1M | yes |
| Field House | social | $1.2M | yes |
| Athletics Complex | social | $1.9M | no |

**Everything else never built (2):**

| Building | Kind | Cost | Ever on the menu |
|---|---|---|---|
| The Great Dome | grand landmark | $30.0M | yes |
| The Triumphal Gate | grand landmark | $30.0M | yes |

**Built (70), by year:**

| Year | Building | Kind | Why |
|---|---|---|---|
| 1 | Campus Quad | social facility | rule 1: social |
| 1 | Jimenez School of Computer Science | academic hall | stood at founding |
| 1 | Library | academic facility | rule 1: academic |
| 1 | Meadow House | residence hall | rule 1: housing |
| 1 | Student Center | social facility | rule 1: social |
| 1 | The Founder's Statue | amenity | rule 6: on the menu |
| 1 | The Original Commons | basic needs facility | rule 1: basic needs |
| 3 | Chatterjee School of Engineering | academic hall | rule 2: program slots |
| 3 | Gomez School of Science | academic hall | rule 2: program slots |
| 3 | Morozov School of Arts & Media | academic hall | rule 2: program slots |
| 3 | The Fountain | amenity | rule 6: on the menu |
| 3 | Union Square Eatery | basic needs facility | rule 1: basic needs |
| 4 | Carter School of Health Science | academic hall | rule 2: program slots |
| 4 | Jang School of Business | academic hall | rule 2: program slots |
| 4 | The Chapel | amenity | rule 6: on the menu |
| 5 | Aerospace Engineering Labs | lab | rule 6: on the menu |
| 5 | Arena | varsity venue | rule 4: a varsity team |
| 5 | Biology Labs | lab | rule 2: a course waited on it |
| 5 | Chemical Engineering Labs | lab | rule 6: on the menu |
| 5 | Chemistry Labs | lab | rule 6: on the menu |
| 5 | Civil Engineering Labs | lab | rule 2: a course waited on it |
| 5 | Commons Cafeteria | basic needs facility | rule 1: basic needs |
| 5 | Electrical Engineering Labs | lab | rule 6: on the menu |
| 5 | Experimental Economics Lab | lab | rule 6: on the menu |
| 5 | Health & Counseling Center | health facility | rule 1: health |
| 5 | Humanities Research Institute | lab | rule 6: on the menu |
| 5 | Lakeside House | residence hall | rule 1: housing |
| 5 | Mechanical Engineering Labs | lab | rule 2: a course waited on it |
| 5 | Media Production Studio | lab | rule 6: on the menu |
| 5 | Neuroscience Labs | lab | rule 6: on the menu |
| 5 | Physics Labs | lab | rule 6: on the menu |
| 5 | The Formal Garden | amenity | rule 6: on the menu |
| 5 | Wright School of Social Sciences & Humanities | academic hall | rule 2: program slots |
| 6 | Art Gallery | social facility | rule 2: a course waited on it |
| 6 | Computing Research Center | lab | rule 2: a course waited on it |
| 8 | Riverside House | residence hall | rule 1: housing |
| 9 | Krishnan Park | varsity venue | rule 4: a varsity team |
| 9 | The Bell Tower | amenity | rule 6: on the menu |
| 9 | The Grand Table | basic needs facility | rule 1: basic needs |
| 10 | Hillcrest House | residence hall | rule 1: housing |
| 10 | Phi Psi Xi House | chapter house | rule 6: a chapter asked for it |
| 10 | Reyes Field | varsity venue | rule 4: a varsity team |
| 10 | The Arts Center | capital project | capital project: first |
| 11 | University Clinic | health facility | rule 1: health |
| 12 | Cascade House | residence hall | rule 1: housing |
| 12 | The Research Park | capital project | capital project: first |
| 13 | Old Well Commons | basic needs facility | rule 1: basic needs |
| 13 | Omega Gamma Pi House | chapter house | rule 6: a chapter asked for it |
| 14 | Summit House | residence hall | rule 1: housing |
| 15 | The Business School | capital project | capital project: first |
| 15 | The Graduate College | capital project | capital project: first |
| 15 | The Law School | capital project | capital project: first |
| 16 | Natatorium | varsity venue | rule 4: a varsity team |
| 16 | Nunez Stadium | varsity venue | rule 4: a varsity team |
| 16 | The Campanile | grand landmark | rule 6: on the menu |
| 17 | Vanguard House | residence hall | rule 1: housing |
| 19 | Campus Grocery Store | basic needs facility | rule 1: basic needs |
| 21 | Eta Sigma Kappa House | chapter house | rule 6: a chapter asked for it |
| 21 | Sterling House | residence hall | rule 1: housing |
| 23 | Medical Center | health facility | rule 1: health |
| 26 | Crestline House | residence hall | rule 1: housing |
| 28 | Alpha Alpha Zeta House | chapter house | rule 6: a chapter asked for it |
| 28 | Overlook Village | residence hall | rule 1: housing |
| 35 | The University Museum | capital project | capital project: first |
| 36 | Ridgeline Village | residence hall | rule 1: housing |
| 38 | Psi Beta Rho House | chapter house | rule 6: a chapter asked for it |
| 39 | Grand Quad & Gardens | social facility | rule 1: social |
| 43 | Iota Zeta Mu House | chapter house | rule 6: a chapter asked for it |
| 43 | Waterside Commons | basic needs facility | rule 1: basic needs |
| 46 | Omicron Mu Mu House | chapter house | rule 6: a chapter asked for it |

Stories added under rule 1: The Original Commons ×2, Meadow House ×2, Union Square Eatery ×2, Lakeside House ×2, Commons Cafeteria ×2, Riverside House ×2, The Grand Table ×2, Hillcrest House ×2, Library ×2, Cascade House ×2, Summit House ×2, Old Well Commons ×2, Vanguard House ×2, Sterling House ×2, Crestline House ×2, Overlook Village ×1.

## Capital projects

Built as soon as each reached the build menu, saving for it when the cash fell short: 0 weeks spent saving.

| Project | Cost | On the menu | Put up | Built |
|---|---|---|---|---|
| The Arts Center | $35.0M | year 10 | year 10 | yes |
| The Research Park | $45.0M | year 12 | year 12 | yes |
| The Graduate College | $25.0M | year 15 | year 15 | yes |
| The Law School | $35.0M | year 15 | year 15 | yes |
| The Business School | $35.0M | year 15 | year 15 | yes |
| The University Museum | $60.0M | year 35 | year 35 | yes |

## Research: grants against investment

| | |
|---|---|
| Invested in initiatives (up-front funding) | $6.49B |
| Grant money received | $35.61B (1851 grants) |
| Return | 549% of what was invested |
| Initiatives funded | 56 project, 69 pilot, 58 program, 59 landmark |

## Varsity

20 petitions accepted, 0 declined for want of cash; 110 coaches hired. 20 varsity teams at the end.

