# The natural line of play — one fifty-year run

Blackmoor University, seed 12345, played by `sim/harness/natural.ts` (Plan 65). Written by `npm run natural` in 24 s.

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

**A · 78** — *Blackmoor University: a country club that never opened its doors very wide*. Rank 1 of 100 at the fiftieth summer.

| Standing | Grade | Mean over the run | First | Last |
|---|---|---|---|---|
| Academics | A | 75 | 43 | 99 |
| Research | A | 66 | 15 | 95 |
| Campus life | A | 67 | 28 | 92 |
| Athletic standing | C | 44 | 23 | 50 |
| Access | F | 29 | 29 | 28 |
| Financial strength | A | 85 | 39 | 100 |

The mark is 70% the six standings' mean, 20% the final rank and 10% the promises (state/finalReport.ts); promises: 0 kept, 0 missed, 18 declined.

## Every year

Read at each summer's close. *Net/wk* is the operating net (the toolbar's figure) averaged over the year's weeks; *programs* are majors standing in halls, graduate programs included; satisfaction is the overall score, then its five attributes. The overall score cannot pass 90: what a college does above 80 counts half (satisfactionSystem.ts's `diminished`), so five attributes at 100 read 90.

| Year | Enrolled | Applicants | Net/wk | Cash | Programs | Halls | Prestige | Rank | Satisfaction | Aca | Soc | Needs | Hlth | Hous |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 619 | 979 | $22k | $182k | 8 | 2 | 53.4 | 55 | 86 | 100 | 100 | 100 | 100 | 100 |
| 2 | 1,022 | 1,349 | $171k | $1.2M | 11 | 3 | 55.7 | 54 | 89 | 100 | 100 | 100 | 100 | 100 |
| 3 | 1,553 | 1,705 | $370k | $15.7M | 14 | 4 | 58.0 | 54 | 92 | 100 | 100 | 100 | 100 | 100 |
| 4 | 2,408 | 2,597 | $626k | $36.7M | 15 | 4 | 60.3 | 54 | 95 | 100 | 100 | 100 | 100 | 100 |
| 5 | 2,984 | 2,576 | $1.1M | $16.3M | 16 | 4 | 62.8 | 50 | 91 | 100 | 100 | 100 | 100 | 100 |
| 6 | 3,614 | 3,082 | $1.4M | $22.2M | 17 | 4 | 65.4 | 50 | 92 | 100 | 100 | 100 | 100 | 100 |
| 7 | 4,288 | 3,561 | $1.7M | $27.0M | 18 | 4 | 68.0 | 44 | 94 | 100 | 100 | 100 | 100 | 100 |
| 8 | 4,970 | 4,462 | $2.1M | $32.8M | 19 | 4 | 70.7 | 40 | 94 | 100 | 100 | 100 | 100 | 100 |
| 9 | 5,734 | 4,888 | $2.5M | $71.6M | 20 | 4 | 73.5 | 38 | 90 | 100 | 100 | 100 | 100 | 100 |
| 10 | 6,925 | 6,363 | $2.9M | $142.8M | 21 | 4 | 76.4 | 34 | 93 | 100 | 100 | 100 | 100 | 100 |
| 11 | 8,184 | 7,027 | $3.6M | $221.3M | 22 | 4 | 79.2 | 27 | 90 | 100 | 100 | 100 | 100 | 100 |
| 12 | 9,581 | 8,104 | $4.2M | $308.6M | 23 | 4 | 82.1 | 26 | 89 | 100 | 100 | 100 | 100 | 100 |
| 13 | 11,097 | 9,061 | $5.1M | $419.3M | 24 | 4 | 84.9 | 23 | 95 | 100 | 100 | 100 | 100 | 100 |
| 14 | 11,600 | 9,951 | $5.8M | $543.1M | 25 | 5 | 87.7 | 22 | 95 | 100 | 100 | 100 | 100 | 100 |
| 15 | 12,776 | 10,264 | $6.0M | $833.8M | 26 | 5 | 90.5 | 21 | 92 | 100 | 100 | 100 | 100 | 100 |
| 16 | 13,651 | 10,512 | $6.7M | $1.15B | 27 | 5 | 93.2 | 18 | 89 | 100 | 100 | 100 | 100 | 100 |
| 17 | 14,353 | 10,993 | $7.2M | $1.41B | 28 | 5 | 95.9 | 16 | 94 | 100 | 100 | 100 | 100 | 100 |
| 18 | 16,072 | 12,481 | $7.6M | $1.74B | 29 | 5 | 98.7 | 16 | 92 | 100 | 100 | 100 | 100 | 100 |
| 19 | 16,954 | 12,914 | $8.7M | $2.11B | 30 | 5 | 101.4 | 12 | 90 | 100 | 100 | 100 | 100 | 100 |
| 20 | 17,981 | 13,479 | $9.2M | $2.40B | 32 | 5 | 104.2 | 12 | 90 | 100 | 100 | 100 | 100 | 100 |
| 21 | 19,116 | 14,120 | $9.6M | $2.89B | 35 | 6 | 106.8 | 10 | 91 | 100 | 100 | 100 | 95 | 100 |
| 22 | 20,281 | 15,467 | $10.4M | $3.41B | 37 | 6 | 109.5 | 9 | 91 | 100 | 100 | 100 | 89 | 100 |
| 23 | 21,536 | 16,228 | $11.0M | $4.04B | 39 | 6 | 112.1 | 5 | 90 | 100 | 100 | 100 | 100 | 100 |
| 24 | 22,848 | 16,974 | $11.6M | $4.45B | 41 | 6 | 114.7 | 5 | 93 | 100 | 100 | 100 | 100 | 100 |
| 25 | 24,189 | 17,811 | $11.7M | $5.02B | 42 | 6 | 117.3 | 5 | 88 | 100 | 100 | 100 | 100 | 100 |
| 26 | 25,188 | 18,219 | $12.3M | $5.71B | 42 | 6 | 119.8 | 5 | 89 | 100 | 100 | 100 | 100 | 100 |
| 27 | 25,909 | 18,540 | $12.8M | $6.29B | 43 | 7 | 122.3 | 5 | 90 | 100 | 100 | 100 | 100 | 100 |
| 28 | 26,711 | 19,181 | $13.2M | $7.27B | 44 | 7 | 124.7 | 5 | 89 | 100 | 100 | 100 | 100 | 100 |
| 29 | 27,289 | 19,401 | $13.7M | $8.21B | 45 | 7 | 127.2 | 3 | 88 | 100 | 100 | 100 | 100 | 100 |
| 30 | 27,943 | 19,810 | $14.1M | $8.84B | 47 | 7 | 129.6 | 3 | 89 | 100 | 100 | 100 | 100 | 100 |
| 31 | 28,676 | 20,557 | $14.5M | $9.80B | 48 | 7 | 131.9 | 3 | 89 | 100 | 100 | 100 | 100 | 100 |
| 32 | 29,294 | 20,884 | $15.0M | $10.78B | 50 | 7 | 134.3 | 2 | 89 | 100 | 100 | 100 | 100 | 100 |
| 33 | 29,588 | 20,453 | $15.5M | $11.65B | 52 | 7 | 136.6 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 34 | 30,207 | 21,513 | $15.9M | $12.71B | 52 | 7 | 138.8 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 35 | 30,967 | 22,651 | $16.2M | $13.58B | 52 | 7 | 141.1 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 36 | 31,630 | 22,468 | $16.6M | $14.74B | 52 | 7 | 143.0 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 37 | 32,505 | 22,864 | $17.0M | $16.08B | 52 | 7 | 144.4 | 1 | 85 | 100 | 100 | 100 | 100 | 100 |
| 38 | 33,094 | 23,136 | $17.5M | $17.23B | 52 | 7 | 145.6 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 39 | 33,360 | 23,426 | $18.0M | $18.59B | 52 | 7 | 146.5 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 40 | 33,974 | 24,157 | $18.2M | $20.12B | 52 | 7 | 147.3 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 41 | 34,480 | 24,483 | $18.6M | $21.47B | 52 | 7 | 147.8 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 42 | 34,480 | 24,046 | $18.9M | $23.16B | 52 | 7 | 148.3 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 43 | 34,480 | 24,298 | $19.0M | $24.55B | 52 | 7 | 148.7 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 44 | 34,336 | 24,043 | $19.1M | $26.08B | 52 | 7 | 148.9 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 45 | 34,480 | 24,674 | $19.2M | $27.37B | 52 | 7 | 149.2 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 46 | 33,040 | 24,048 | $19.5M | $28.63B | 52 | 7 | 149.3 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 47 | 33,508 | 24,387 | $19.1M | $29.96B | 52 | 7 | 149.5 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 48 | 33,582 | 24,249 | $19.4M | $31.22B | 52 | 7 | 149.6 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 49 | 33,268 | 23,789 | $19.6M | $32.91B | 52 | 7 | 149.7 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 50 | 34,480 | 23,945 | $19.7M | $34.10B | 52 | 7 | 149.7 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |

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

**Built (73), by year:**

| Year | Building | Kind | Why |
|---|---|---|---|
| 1 | Campus Quad | social facility | rule 1: social |
| 1 | Fitzgerald School of Arts & Media | academic hall | stood at founding |
| 1 | Library | academic facility | rule 1: academic |
| 1 | Meadow House | residence hall | rule 1: housing |
| 1 | Student Center | social facility | rule 1: social |
| 1 | The Founder's Statue | amenity | rule 6: on the menu |
| 1 | The Original Commons | basic needs facility | rule 1: basic needs |
| 1 | Winslow School of Science | academic hall | rule 2: program slots |
| 2 | Brooks School of Social Sciences & Humanities | academic hall | rule 2: program slots |
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
| 14 | Maple Hall | academic hall | rule 2: program slots |
| 14 | University Clinic | health facility | rule 1: health |
| 16 | The Campanile | grand landmark | rule 6: on the menu |
| 18 | The Graduate College | capital project | capital project: first |
| 18 | Vanguard House | residence hall | rule 1: housing |
| 19 | Computing Research Center | lab | rule 2: a course waited on it |
| 20 | Campus Grocery Store | basic needs facility | rule 1: basic needs |
| 20 | Chestnut Hall | academic hall | rule 2: program slots |
| 20 | Nu Zeta Gamma House | chapter house | rule 6: a chapter asked for it |
| 20 | The Business School | capital project | capital project: first |
| 21 | Sterling House | residence hall | rule 1: housing |
| 21 | The Law School | capital project | capital project: first |
| 22 | Grand Quad & Gardens | social facility | rule 1: social |
| 23 | Medical Center | health facility | rule 1: health |
| 24 | Crestline House | residence hall | rule 1: housing |
| 24 | Jelinek Stadium | varsity venue | rule 4: a varsity team |
| 25 | Art Gallery | social facility | rule 2: a course waited on it |
| 25 | Media Production Studio | lab | rule 2: a course waited on it |
| 25 | Recreation Center | social facility | rule 1: social |
| 26 | Sycamore Hall | academic hall | rule 2: program slots |
| 27 | Overlook Village | residence hall | rule 1: housing |
| 27 | The Arts Center | capital project | capital project: first |
| 30 | Delta Omega Rho House | chapter house | rule 6: a chapter asked for it |
| 32 | Neuroscience Labs | lab | rule 2: a course waited on it |
| 35 | The University Museum | capital project | capital project: first |
| 37 | Ridgeline Village | residence hall | rule 1: housing |
| 40 | Alpha Iota Rho House | chapter house | rule 6: a chapter asked for it |
| 42 | Waterside Commons | basic needs facility | rule 1: basic needs |
| 43 | Kappa Xi Alpha House | chapter house | rule 6: a chapter asked for it |
| 47 | Chi Mu Nu House | chapter house | rule 6: a chapter asked for it |

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
| Invested in initiatives (up-front funding) | $6.18B |
| Grant money received | $14.76B (1284 grants) |
| Return | 239% of what was invested |
| Initiatives funded | 68 pilot, 78 project, 31 program, 48 landmark |

## Varsity

20 petitions accepted, 0 declined for want of cash; 119 coaches hired. 20 varsity teams at the end.

