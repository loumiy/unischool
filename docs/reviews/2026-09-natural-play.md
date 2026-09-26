# The natural line of play — one fifty-year run

Blackmoor University, seed 12345, played by `sim/harness/natural.ts` (Plan 65). Written by `npm run natural` in 28 s.

## The line of play

Cash is spent to zero: anything a rule calls for is bought if the cash covers it. Each week, in this order:

1. **Satisfaction.** Any attribute under 100 that a building would raise gets the cheapest such building (a facility that serves it, the next residence hall, or another story on the library, a dining hall or a dorm). Nothing more is bought for it while one is going up. A building that only unlocks another counts for nothing here.
2. **Programs.** Every program on offer is founded where it belongs, hiring its first instructor off the market, never through a posted search. When no hall has a slot, the next academic hall goes up as soon as it is affordable. Otherwise, and once every program is founded, courses go deeper, the lowest rung first. A course that waits on a building gets the building. Dark courses are restaffed.
3. **Schools.** From 7 academic halls, Founders Hall included, programs move to their schools' halls as the game suggests, and a school spread over two halls is merged into one when another school's offer has nowhere to go (the game never suggests that move).
4. **Varsity.** Every petition is accepted, its venue built at once, and every coaching chair filled with the best candidate listed.
5. **Research.** Every idle lab funds the deepest initiative whose team would leave no course without an instructor.
6. **Everything else** on the build menu (labs, capital projects, the landmark, amenities, chapter houses) as soon as it is affordable, and a graduate program wherever a host offers one.

At admissions, tuition is the highest the slider allows short of the red tier (1.6× what prestige supports), the admit rate is left as the screen opens it, and every club and chapter petition is approved. Every other decision takes the game's default.

## The final score

**B · 68** — *Blackmoor University: a jock school that never balanced its books*. Rank 1 of 100 at the fiftieth summer.

| Standing | Grade | Mean over the run | First | Last |
|---|---|---|---|---|
| Academics | A | 87 | 47 | 100 |
| Research | A | 68 | 14 | 96 |
| Campus life | A | 66 | 25 | 90 |
| Athletic standing | C | 42 | 15 | 51 |
| Access | F | 29 | 30 | 28 |
| Financial strength | F | 2 | 4 | 2 |

The mark is 70% the six standings' mean, 20% the final rank and 10% the promises (state/finalReport.ts); promises: 0 kept, 0 missed, 16 declined.

## Every year

Read at each summer's close. *Net/wk* is the operating net (the toolbar's figure) averaged over the year's weeks; *programs* are majors standing in halls, graduate programs included; satisfaction is the overall score, then its five attributes. The overall score cannot pass 90: what a college does above 80 counts half (satisfactionSystem.ts's `diminished`), so five attributes at 100 read 90.

| Year | Enrolled | Applicants | Net/wk | Cash | Programs | Halls | Prestige | Rank | Satisfaction | Aca | Soc | Needs | Hlth | Hous |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 419 | 430 | $5k | $38k | 6 | 1 | 53.1 | 55 | 86 | 100 | 100 | 100 | 100 | 100 |
| 2 | 572 | 660 | $49k | $73k | 6 | 1 | 56.7 | 55 | 90 | 100 | 100 | 100 | 100 | 100 |
| 3 | 784 | 827 | $113k | $266k | 6 | 1 | 59.4 | 54 | 88 | 100 | 100 | 83 | 100 | 100 |
| 4 | 1,073 | 1,038 | $200k | $686k | 9 | 3 | 62.1 | 49 | 88 | 100 | 100 | 100 | 100 | 100 |
| 5 | 1,407 | 1,348 | $316k | $5.4M | 11 | 5 | 65.1 | 46 | 89 | 100 | 100 | 100 | 100 | 100 |
| 6 | 1,795 | 1,729 | $382k | $6.2M | 20 | 7 | 67.5 | 42 | 92 | 100 | 100 | 100 | 100 | 100 |
| 7 | 2,403 | 2,508 | $420k | $556k | 41 | 7 | 71.8 | 37 | 91 | 100 | 100 | 100 | 100 | 100 |
| 8 | 3,323 | 3,572 | $492k | $950k | 42 | 7 | 78.8 | 23 | 91 | 100 | 100 | 100 | 83 | 100 |
| 9 | 4,847 | 5,544 | $550k | $943k | 42 | 7 | 88.3 | 17 | 89 | 100 | 100 | 100 | 60 | 88 |
| 10 | 8,022 | 10,462 | $925k | $5.2M | 42 | 7 | 100.9 | 3 | 84 | 100 | 100 | 88 | 41 | 100 |
| 11 | 15,796 | 23,912 | $1.9M | $23.1M | 42 | 7 | 111.2 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 12 | 29,920 | 42,458 | $5.4M | $88.2M | 42 | 7 | 119.3 | 1 | 83 | 100 | 100 | 100 | 51 | 100 |
| 13 | 30,240 | 57,338 | $11.0M | $635.1M | 42 | 7 | 125.8 | 1 | 77 | 100 | 100 | 100 | 40 | 82 |
| 14 | 30,240 | 63,907 | $10.5M | $1.55B | 42 | 7 | 130.9 | 1 | 84 | 100 | 100 | 100 | 56 | 100 |
| 15 | 30,320 | 71,549 | $10.5M | $2.03B | 44 | 7 | 134.9 | 1 | 92 | 100 | 100 | 100 | 100 | 100 |
| 16 | 30,640 | 85,731 | $11.6M | $3.20B | 44 | 7 | 138.1 | 1 | 93 | 100 | 100 | 100 | 100 | 100 |
| 17 | 31,920 | 94,766 | $13.7M | $4.38B | 52 | 7 | 140.6 | 1 | 96 | 100 | 100 | 100 | 100 | 100 |
| 18 | 33,600 | 98,812 | $13.7M | $5.90B | 52 | 7 | 142.6 | 1 | 93 | 100 | 100 | 100 | 100 | 100 |
| 19 | 34,400 | 96,735 | $14.3M | $8.14B | 52 | 7 | 144.1 | 1 | 93 | 100 | 100 | 100 | 100 | 100 |
| 20 | 34,480 | 100,044 | $14.8M | $10.14B | 52 | 7 | 145.4 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 21 | 34,480 | 97,891 | $15.7M | $11.69B | 52 | 7 | 146.3 | 1 | 91 | 100 | 100 | 100 | 100 | 100 |
| 22 | 34,480 | 99,575 | $15.7M | $13.71B | 52 | 7 | 147.1 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 23 | 34,480 | 100,937 | $15.7M | $15.46B | 52 | 7 | 147.7 | 1 | 93 | 100 | 100 | 100 | 100 | 100 |
| 24 | 34,480 | 103,793 | $15.8M | $17.46B | 52 | 7 | 148.2 | 1 | 91 | 100 | 100 | 100 | 100 | 100 |
| 25 | 34,480 | 105,369 | $16.2M | $19.90B | 52 | 7 | 148.6 | 1 | 91 | 100 | 100 | 100 | 100 | 100 |
| 26 | 34,480 | 101,749 | $16.1M | $22.04B | 52 | 7 | 148.9 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 27 | 34,480 | 103,373 | $16.1M | $23.55B | 52 | 7 | 149.1 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 28 | 33,040 | 102,445 | $16.1M | $25.35B | 52 | 7 | 149.3 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 29 | 33,040 | 101,049 | $15.7M | $27.52B | 52 | 7 | 149.4 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 30 | 34,480 | 102,677 | $15.8M | $30.02B | 52 | 7 | 149.6 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 31 | 34,480 | 101,662 | $16.2M | $32.00B | 52 | 7 | 149.7 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 32 | 33,440 | 102,010 | $16.3M | $33.45B | 52 | 7 | 149.7 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 33 | 34,480 | 102,188 | $16.1M | $35.44B | 52 | 7 | 149.8 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 34 | 34,480 | 97,491 | $16.5M | $37.84B | 52 | 7 | 149.8 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 35 | 34,480 | 100,981 | $16.6M | $39.64B | 52 | 7 | 149.9 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 36 | 34,480 | 102,124 | $16.7M | $41.87B | 52 | 7 | 149.9 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 37 | 33,760 | 100,102 | $16.8M | $43.69B | 52 | 7 | 149.9 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 38 | 34,480 | 99,187 | $16.7M | $45.22B | 52 | 7 | 149.9 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 39 | 34,480 | 100,570 | $16.9M | $46.91B | 52 | 7 | 149.9 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 40 | 34,480 | 100,861 | $17.0M | $48.22B | 52 | 7 | 150.0 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 41 | 34,480 | 98,567 | $17.0M | $50.29B | 52 | 7 | 150.0 | 1 | 88 | 100 | 100 | 100 | 100 | 100 |
| 42 | 34,480 | 98,398 | $16.9M | $52.21B | 52 | 7 | 150.0 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 43 | 34,480 | 99,677 | $17.3M | $54.09B | 52 | 7 | 150.0 | 1 | 87 | 100 | 100 | 100 | 100 | 100 |
| 44 | 34,480 | 97,086 | $17.4M | $55.58B | 52 | 7 | 150.0 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 45 | 34,480 | 94,956 | $17.4M | $57.28B | 52 | 7 | 150.0 | 1 | 85 | 100 | 100 | 100 | 100 | 100 |
| 46 | 34,480 | 99,504 | $17.2M | $58.93B | 52 | 7 | 150.0 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 47 | 34,480 | 100,982 | $17.3M | $60.65B | 52 | 7 | 150.0 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 48 | 34,480 | 99,389 | $17.3M | $62.30B | 52 | 7 | 150.0 | 1 | 89 | 100 | 100 | 100 | 100 | 100 |
| 49 | 34,480 | 98,986 | $17.4M | $64.18B | 52 | 7 | 150.0 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |
| 50 | 34,480 | 101,417 | $17.5M | $65.66B | 52 | 7 | 150.0 | 1 | 90 | 100 | 100 | 100 | 100 | 100 |

Weeks in the red: 0. The programs were sorted into their schools' halls from year 6.

## Campus assets never built

Satisfaction buildings go up only under rule 1 (an attribute under 100 that the building would raise), so the ones below were never needed to hold satisfaction where this run held it. Everything else on the build menu was built as soon as it could be paid for.

**Satisfaction buildings never built (8):**

| Building | Serves | Cost | Ever on the menu |
|---|---|---|---|
| Harborview Market | basic needs | $26.4M | yes |
| Central Dining Pavilion | basic needs | $38.4M | no |
| Meridian Tower | housing | $200.0M | yes |
| Beacon Tower | housing | $250.0M | no |
| Horizon Tower | housing | $300.0M | no |
| Aurora Tower | housing | $360.0M | no |
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
| 1 | Library | academic facility | rule 1: academic |
| 1 | Meadow House | residence hall | rule 1: housing |
| 1 | Student Center | social facility | rule 1: social |
| 1 | The Founder's Statue | amenity | rule 6: on the menu |
| 1 | The Original Commons | basic needs facility | rule 1: basic needs |
| 1 | Wagner School of Computer Science | academic hall | stood at founding |
| 4 | Brennan School of Engineering | academic hall | rule 2: program slots |
| 4 | Oak Hall | academic hall | rule 2: program slots |
| 4 | Pan School of Science | academic hall | rule 2: program slots |
| 4 | The Chapel | amenity | rule 6: on the menu |
| 4 | The Fountain | amenity | rule 6: on the menu |
| 4 | Union Square Eatery | basic needs facility | rule 1: basic needs |
| 5 | Baker Stadium | varsity venue | rule 4: a varsity team |
| 5 | Fraser School of Arts & Media | academic hall | rule 2: program slots |
| 5 | Laurent School of Social Sciences & Humanities | academic hall | rule 2: program slots |
| 6 | Richardson School of Business | academic hall | rule 2: program slots |
| 7 | Chemistry Labs | lab | rule 2: a course waited on it |
| 7 | Commons Cafeteria | basic needs facility | rule 1: basic needs |
| 7 | Experimental Economics Lab | lab | rule 2: a course waited on it |
| 7 | Health & Counseling Center | health facility | rule 1: health |
| 7 | Humanities Research Institute | lab | rule 6: on the menu |
| 7 | Lakeside House | residence hall | rule 1: housing |
| 7 | Physics Labs | lab | rule 2: a course waited on it |
| 7 | The Formal Garden | amenity | rule 6: on the menu |
| 8 | Aerospace Engineering Labs | lab | rule 2: a course waited on it |
| 8 | Art Gallery | social facility | rule 2: a course waited on it |
| 8 | Biology Labs | lab | rule 2: a course waited on it |
| 8 | Chemical Engineering Labs | lab | rule 2: a course waited on it |
| 8 | Civil Engineering Labs | lab | rule 2: a course waited on it |
| 8 | Computing Research Center | lab | rule 2: a course waited on it |
| 8 | Electrical Engineering Labs | lab | rule 2: a course waited on it |
| 8 | Mechanical Engineering Labs | lab | rule 2: a course waited on it |
| 8 | Media Production Studio | lab | rule 2: a course waited on it |
| 8 | Neuroscience Labs | lab | rule 2: a course waited on it |
| 10 | Riverside House | residence hall | rule 1: housing |
| 10 | The Bell Tower | amenity | rule 6: on the menu |
| 10 | The Grand Table | basic needs facility | rule 1: basic needs |
| 11 | Cascade House | residence hall | rule 1: housing |
| 11 | Hillcrest House | residence hall | rule 1: housing |
| 11 | The Campanile | grand landmark | rule 6: on the menu |
| 11 | University Clinic | health facility | rule 1: health |
| 12 | Campus Grocery Store | basic needs facility | rule 1: basic needs |
| 12 | Cao Field | varsity venue | rule 4: a varsity team |
| 12 | Moreau Arena | varsity venue | rule 4: a varsity team |
| 12 | Old Well Commons | basic needs facility | rule 1: basic needs |
| 12 | Summit House | residence hall | rule 1: housing |
| 12 | The Arts Center | capital project | rule 6: on the menu |
| 12 | The Research Park | capital project | rule 6: on the menu |
| 12 | Vanguard House | residence hall | rule 1: housing |
| 13 | Crestline House | residence hall | rule 1: housing |
| 13 | Grand Quad & Gardens | social facility | rule 1: social |
| 13 | Gym & Fitness Center | health facility | rule 1: health |
| 13 | Overlook Village | residence hall | rule 1: housing |
| 13 | Recreation Center | social facility | rule 1: social |
| 13 | Sterling House | residence hall | rule 1: housing |
| 13 | Student Union Expansion | social facility | rule 1: social |
| 13 | Swimming Pool | health facility | rule 1: health |
| 14 | Crawford Aquatic Center | varsity venue | rule 4: a varsity team |
| 14 | Tennis Courts | health facility | rule 1: health |
| 15 | Medical Center | health facility | rule 1: health |
| 15 | The Business School | capital project | rule 6: on the menu |
| 15 | The Graduate College | capital project | rule 6: on the menu |
| 15 | The Law School | capital project | rule 6: on the menu |
| 17 | Pi Eta Omega House | chapter house | rule 6: a chapter asked for it |
| 18 | Ridgeline Village | residence hall | rule 1: housing |
| 19 | Baseball & Softball Diamond | varsity venue | rule 4: a varsity team |
| 20 | Waterside Commons | basic needs facility | rule 1: basic needs |
| 23 | Epsilon Alpha Rho House | chapter house | rule 6: a chapter asked for it |
| 32 | Rho Nu Mu House | chapter house | rule 6: a chapter asked for it |
| 35 | The University Museum | capital project | rule 6: on the menu |
| 41 | Psi Theta Upsilon House | chapter house | rule 6: a chapter asked for it |
| 44 | Zeta Beta Gamma House | chapter house | rule 6: a chapter asked for it |

Stories added under rule 1: The Original Commons ×2, Meadow House ×2, Union Square Eatery ×2, Commons Cafeteria ×2, Lakeside House ×2, Riverside House ×2, The Grand Table ×2, Hillcrest House ×2, Library ×2, Cascade House ×2, Summit House ×2, Vanguard House ×2, Sterling House ×2, Crestline House ×2, Overlook Village ×2, Old Well Commons ×2.

## Research: grants against investment

| | |
|---|---|
| Invested in initiatives (up-front funding) | $10.41B |
| Grant money received | $45.74B (1439 grants) |
| Return | 439% of what was invested |
| Initiatives funded | 89 pilot, 63 project, 47 program, 55 landmark |

## Varsity

20 petitions accepted, 3 declined for want of cash; 111 coaches hired. 20 varsity teams at the end.

