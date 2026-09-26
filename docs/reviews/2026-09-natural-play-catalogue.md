# The natural line of play — one fifty-year run

Blackmoor University, seed 12345, played by `sim/harness/natural.ts` (Plan 65). Written by `npm run natural` in 25 s.

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

**B · 68** — *Blackmoor University: a jock school that never balanced its books*. Rank 1 of 100 at the fiftieth summer.

| Standing | Grade | Mean over the run | First | Last |
|---|---|---|---|---|
| Academics | A | 74 | 43 | 99 |
| Research | A | 54 | 12 | 96 |
| Campus life | A | 70 | 28 | 97 |
| Athletic standing | C | 45 | 27 | 51 |
| Access | F | 29 | 29 | 28 |
| Financial strength | F | 2 | 2 | 2 |

The mark is 70% the six standings' mean, 20% the final rank and 10% the promises (state/finalReport.ts); promises: 0 kept, 0 missed, 20 declined.

## Every year

Read at each summer's close. *Net/wk* is the operating net (the toolbar's figure) averaged over the year's weeks; *programs* are majors standing in halls, graduate programs included; satisfaction is the overall score, then its five attributes. The overall score cannot pass 90: what a college does above 80 counts half (satisfactionSystem.ts's `diminished`), so five attributes at 100 read 90.

| Year | Enrolled | Applicants | Net/wk | Cash | Programs | Halls | Prestige | Rank | Satisfaction | Aca | Soc | Needs | Hlth | Hous |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 619 | 979 | $22k | $182k | 8 | 2 | 53.4 | 55 | 86 | 100 | 100 | 100 | 100 | 100 |
| 2 | 1,028 | 1,366 | $171k | $1.6M | 10 | 3 | 55.7 | 55 | 89 | 100 | 100 | 100 | 100 | 100 |
| 3 | 1,549 | 1,676 | $373k | $16.2M | 14 | 4 | 58.0 | 55 | 91 | 100 | 100 | 100 | 100 | 100 |
| 4 | 2,363 | 2,484 | $625k | $37.7M | 15 | 4 | 60.1 | 53 | 93 | 100 | 100 | 100 | 100 | 100 |
| 5 | 2,892 | 2,438 | $1.0M | $87.5M | 16 | 4 | 62.4 | 51 | 88 | 100 | 100 | 100 | 100 | 100 |
| 6 | 3,384 | 2,719 | $1.3M | $141.8M | 17 | 4 | 64.8 | 49 | 91 | 100 | 100 | 100 | 100 | 100 |
| 7 | 3,932 | 3,185 | $1.5M | $209.9M | 18 | 4 | 67.2 | 47 | 92 | 100 | 100 | 100 | 100 | 100 |
| 8 | 4,523 | 4,110 | $1.7M | $294.8M | 19 | 5 | 69.6 | 45 | 90 | 100 | 100 | 100 | 100 | 100 |
| 9 | 5,293 | 4,557 | $2.1M | $397.0M | 20 | 5 | 72.0 | 38 | 94 | 100 | 100 | 100 | 100 | 100 |
| 10 | 6,105 | 5,357 | $2.4M | $508.0M | 21 | 5 | 74.5 | 33 | 94 | 100 | 100 | 100 | 100 | 100 |
| 11 | 7,516 | 7,071 | $2.7M | $619.8M | 22 | 5 | 76.9 | 29 | 90 | 100 | 100 | 100 | 100 | 100 |
| 12 | 8,617 | 7,143 | $3.5M | $793.0M | 23 | 5 | 79.4 | 27 | 87 | 100 | 100 | 100 | 100 | 100 |
| 13 | 10,275 | 8,718 | $4.0M | $946.1M | 24 | 5 | 81.9 | 26 | 94 | 100 | 100 | 100 | 100 | 100 |
| 14 | 11,717 | 9,328 | $4.8M | $1.18B | 24 | 6 | 84.4 | 22 | 92 | 100 | 100 | 100 | 100 | 100 |
| 15 | 12,525 | 9,780 | $5.5M | $1.45B | 26 | 6 | 87.1 | 21 | 92 | 100 | 100 | 100 | 100 | 100 |
| 16 | 13,732 | 10,466 | $5.9M | $1.69B | 27 | 6 | 89.8 | 18 | 91 | 100 | 100 | 100 | 100 | 100 |
| 17 | 14,416 | 10,716 | $6.5M | $1.93B | 28 | 6 | 92.6 | 17 | 93 | 100 | 100 | 100 | 100 | 100 |
| 18 | 15,307 | 11,295 | $6.8M | $2.26B | 30 | 6 | 95.5 | 16 | 93 | 100 | 100 | 100 | 100 | 100 |
| 19 | 16,046 | 11,815 | $7.2M | $2.64B | 31 | 6 | 98.3 | 15 | 85 | 100 | 100 | 100 | 100 | 100 |
| 20 | 16,727 | 12,227 | $7.5M | $2.99B | 31 | 6 | 101.1 | 13 | 92 | 100 | 100 | 100 | 100 | 100 |
| 21 | 17,546 | 12,971 | $7.7M | $3.33B | 33 | 7 | 103.8 | 11 | 91 | 100 | 100 | 100 | 100 | 100 |
| 22 | 18,322 | 13,578 | $8.2M | $3.95B | 35 | 7 | 106.5 | 10 | 88 | 100 | 100 | 100 | 97 | 100 |
| 23 | 19,048 | 13,812 | $8.6M | $4.48B | 35 | 7 | 109.1 | 8 | 91 | 100 | 100 | 100 | 93 | 100 |
| 24 | 19,675 | 13,953 | $9.0M | $5.13B | 36 | 7 | 111.8 | 7 | 90 | 100 | 100 | 100 | 89 | 100 |
| 25 | 20,301 | 14,818 | $9.3M | $5.60B | 40 | 7 | 114.4 | 6 | 89 | 100 | 100 | 100 | 87 | 100 |
| 26 | 20,882 | 15,178 | $9.5M | $6.28B | 41 | 7 | 116.9 | 5 | 89 | 100 | 100 | 100 | 100 | 100 |
| 27 | 21,686 | 16,028 | $9.7M | $6.92B | 44 | 7 | 119.5 | 3 | 89 | 100 | 100 | 100 | 100 | 100 |
| 28 | 23,118 | 17,625 | $10.1M | $7.68B | 47 | 7 | 122.0 | 4 | 90 | 100 | 100 | 100 | 100 | 100 |
| 29 | 24,376 | 18,155 | $10.8M | $8.42B | 48 | 7 | 124.4 | 3 | 85 | 100 | 100 | 100 | 100 | 100 |
| 30 | 25,476 | 18,207 | $11.3M | $9.35B | 49 | 7 | 126.8 | 3 | 88 | 100 | 100 | 100 | 100 | 100 |
| 31 | 26,782 | 19,623 | $12.0M | $10.44B | 50 | 7 | 129.2 | 2 | 89 | 100 | 100 | 100 | 100 | 100 |
| 32 | 27,555 | 20,618 | $12.8M | $11.48B | 51 | 7 | 131.6 | 2 | 90 | 100 | 100 | 100 | 100 | 100 |
| 33 | 28,846 | 21,710 | $13.5M | $12.74B | 51 | 7 | 134.0 | 2 | 91 | 100 | 100 | 100 | 100 | 100 |
| 34 | 30,260 | 21,862 | $14.7M | $13.67B | 51 | 7 | 136.3 | 2 | 89 | 100 | 100 | 100 | 100 | 100 |
| 35 | 31,314 | 21,786 | $14.1M | $15.06B | 51 | 7 | 138.5 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 36 | 31,915 | 22,531 | $14.5M | $17.03B | 52 | 7 | 140.8 | 1 | 86 | 100 | 100 | 100 | 100 | 100 |
| 37 | 32,374 | 23,653 | $14.6M | $18.81B | 52 | 7 | 142.7 | 1 | 91 | 100 | 100 | 100 | 100 | 100 |
| 38 | 32,840 | 23,144 | $15.1M | $20.65B | 52 | 7 | 144.3 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 39 | 33,275 | 22,724 | $15.5M | $22.39B | 52 | 7 | 145.5 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 40 | 33,889 | 23,783 | $15.8M | $23.62B | 52 | 7 | 146.4 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 41 | 34,007 | 23,979 | $16.2M | $25.41B | 52 | 7 | 147.2 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 42 | 34,391 | 24,201 | $16.4M | $27.06B | 52 | 7 | 147.8 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 43 | 34,480 | 23,919 | $16.5M | $28.98B | 52 | 7 | 148.2 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 44 | 34,477 | 23,773 | $16.7M | $31.69B | 52 | 7 | 148.6 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 45 | 34,480 | 24,487 | $16.9M | $33.63B | 52 | 7 | 148.9 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 46 | 34,480 | 24,310 | $16.9M | $36.17B | 52 | 7 | 149.1 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 47 | 34,480 | 23,858 | $17.0M | $38.42B | 52 | 7 | 149.3 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 48 | 32,720 | 23,811 | $17.1M | $40.99B | 52 | 7 | 149.5 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 49 | 32,679 | 23,872 | $16.7M | $43.62B | 52 | 7 | 149.6 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 50 | 32,845 | 24,657 | $16.7M | $46.16B | 52 | 7 | 149.7 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |

Weeks in the red: 0. The programs were sorted into their schools' halls from year 21.

## Campus assets never built

Satisfaction buildings go up only under rule 1 (an attribute under 100 that the building would raise), so the ones below were never needed to hold satisfaction where this run held it. Everything else on the build menu was built as soon as it could be paid for.

**Satisfaction buildings never built (10):**

| Building | Serves | Cost | Ever on the menu |
|---|---|---|---|
| Harborview Market | basic needs | $26.4M | yes |
| Central Dining Pavilion | basic needs | $38.4M | no |
| Meridian Tower | housing | $200.0M | yes |
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

**Built (75), by year:**

| Year | Building | Kind | Why |
|---|---|---|---|
| 1 | Berg School of Science | academic hall | rule 2: program slots |
| 1 | Campus Quad | social facility | rule 1: social |
| 1 | Founders Hall | academic hall | stood at founding |
| 1 | Library | academic facility | rule 1: academic |
| 1 | Meadow House | residence hall | rule 1: housing |
| 1 | Student Center | social facility | rule 1: social |
| 1 | The Founder's Statue | amenity | rule 6: on the menu |
| 1 | The Original Commons | basic needs facility | rule 1: basic needs |
| 2 | Awad School of Social Sciences & Humanities | academic hall | rule 2: program slots |
| 2 | Dutta School of Business | academic hall | rule 2: program slots |
| 2 | The Fountain | amenity | rule 6: on the menu |
| 2 | Union Square Eatery | basic needs facility | rule 1: basic needs |
| 3 | The Chapel | amenity | rule 6: on the menu |
| 4 | Health & Counseling Center | health facility | rule 1: health |
| 4 | Lakeside House | residence hall | rule 1: housing |
| 4 | The Formal Garden | amenity | rule 6: on the menu |
| 4 | Van der Berg Park | varsity venue | rule 4: a varsity team |
| 5 | Commons Cafeteria | basic needs facility | rule 1: basic needs |
| 5 | Gym & Fitness Center | health facility | rule 1: health |
| 6 | Martinez Aquatic Center | varsity venue | rule 4: a varsity team |
| 6 | Mu Chi Kappa House | chapter house | rule 6: a chapter asked for it |
| 7 | Rahman Arena | varsity venue | rule 4: a varsity team |
| 8 | Crawford School of Engineering | academic hall | rule 2: program slots |
| 8 | Riverside House | residence hall | rule 1: housing |
| 10 | The Bell Tower | amenity | rule 6: on the menu |
| 10 | The Grand Table | basic needs facility | rule 1: basic needs |
| 11 | Gyasi Field | varsity venue | rule 4: a varsity team |
| 11 | Hillcrest House | residence hall | rule 1: housing |
| 11 | Lambda Gamma Phi House | chapter house | rule 6: a chapter asked for it |
| 11 | Swimming Pool | health facility | rule 1: health |
| 13 | Aerospace Engineering Labs | lab | rule 2: a course waited on it |
| 13 | Cascade House | residence hall | rule 1: housing |
| 13 | Chemical Engineering Labs | lab | rule 2: a course waited on it |
| 13 | Civil Engineering Labs | lab | rule 2: a course waited on it |
| 13 | Electrical Engineering Labs | lab | rule 2: a course waited on it |
| 13 | Mechanical Engineering Labs | lab | rule 6: on the menu |
| 13 | Old Well Commons | basic needs facility | rule 1: basic needs |
| 14 | Radwan School of Computer Science | academic hall | rule 2: program slots |
| 14 | Summit House | residence hall | rule 1: housing |
| 14 | Tennis Courts | health facility | rule 1: health |
| 15 | University Clinic | health facility | rule 1: health |
| 16 | The Graduate College | capital project | capital project: first |
| 16 | The Research Park | capital project | capital project: first |
| 17 | Chi Theta Beta House | chapter house | rule 6: a chapter asked for it |
| 17 | The Campanile | grand landmark | rule 6: on the menu |
| 17 | Vanguard House | residence hall | rule 1: housing |
| 19 | Computing Research Center | lab | rule 2: a course waited on it |
| 20 | Sycamore Hall | academic hall | rule 2: program slots |
| 20 | Xi Alpha Zeta House | chapter house | rule 6: a chapter asked for it |
| 21 | Biology Labs | lab | rule 2: a course waited on it |
| 21 | Campus Grocery Store | basic needs facility | rule 1: basic needs |
| 21 | Chemistry Labs | lab | rule 2: a course waited on it |
| 21 | Experimental Economics Lab | lab | rule 2: a course waited on it |
| 21 | Humanities Research Institute | lab | rule 2: a course waited on it |
| 21 | Khan Stadium | varsity venue | rule 4: a varsity team |
| 21 | Physics Labs | lab | rule 2: a course waited on it |
| 24 | Sterling House | residence hall | rule 1: housing |
| 25 | Neuroscience Labs | lab | rule 6: on the menu |
| 25 | Nu Sigma Phi House | chapter house | rule 6: a chapter asked for it |
| 25 | The Business School | capital project | capital project: first |
| 25 | The Law School | capital project | capital project: first |
| 26 | Medical Center | health facility | rule 1: health |
| 28 | Crestline House | residence hall | rule 1: housing |
| 30 | Omicron Epsilon Epsilon House | chapter house | rule 6: a chapter asked for it |
| 31 | Art Gallery | social facility | rule 2: a course waited on it |
| 32 | Media Production Studio | lab | rule 2: a course waited on it |
| 32 | Overlook Village | residence hall | rule 1: housing |
| 33 | The Arts Center | capital project | capital project: first |
| 35 | Pi Pi Rho House | chapter house | rule 6: a chapter asked for it |
| 35 | The University Museum | capital project | capital project: first |
| 37 | Ridgeline Village | residence hall | rule 1: housing |
| 39 | Grand Quad & Gardens | social facility | rule 1: social |
| 42 | Xi Omicron Delta House | chapter house | rule 6: a chapter asked for it |
| 43 | Waterside Commons | basic needs facility | rule 1: basic needs |
| 45 | Nu Psi Psi House | chapter house | rule 6: a chapter asked for it |

Stories added under rule 1: The Original Commons ×2, Meadow House ×2, Union Square Eatery ×2, Lakeside House ×2, Commons Cafeteria ×2, Riverside House ×2, Hillcrest House ×2, The Grand Table ×2, Library ×2, Cascade House ×2, Summit House ×2, Old Well Commons ×2, Vanguard House ×2, Sterling House ×2, Crestline House ×2, Overlook Village ×2.

## Capital projects

Built as soon as each reached the build menu, saving for it when the cash fell short: 0 weeks spent saving.

| Project | Cost | On the menu | Put up | Built |
|---|---|---|---|---|
| The Graduate College | $25.0M | year 16 | year 16 | yes |
| The Research Park | $45.0M | year 16 | year 16 | yes |
| The Law School | $35.0M | year 25 | year 25 | yes |
| The Business School | $35.0M | year 25 | year 25 | yes |
| The Arts Center | $35.0M | year 33 | year 33 | yes |
| The University Museum | $60.0M | year 35 | year 35 | yes |

## Research: grants against investment

| | |
|---|---|
| Invested in initiatives (up-front funding) | $5.71B |
| Grant money received | $28.84B (1110 grants) |
| Return | 505% of what was invested |
| Initiatives funded | 40 program, 55 project, 43 pilot, 39 landmark |

## Varsity

20 petitions accepted, 0 declined for want of cash; 125 coaches hired. 20 varsity teams at the end.

