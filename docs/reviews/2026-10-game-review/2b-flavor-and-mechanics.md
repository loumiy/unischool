# Appendix to area 2: flavor text against the code

Plan 73, area 2. Commit read: `58fa3fd`. Every line of flavor that could imply a mechanic was checked against the code that runs, and judged *true* (the game does it), *false* (the text promises what the game does not do) or *vague* (a player could fairly read a mechanic into it). The row-by-row verdicts, each with a file and line, are in `data/blurbs.tsv`, `data/letters-promises.tsv` and `data/events-catalogue.tsv`. The three reports follow unchanged except for heading levels and file references. `2-ui-and-text.md` summarizes them.

## Building blurbs, identity tags, quirks and the Final Report

A review of the player-facing text in the files the brief lists, at `58fa3fd`. No repository file was edited. Every claim in the text was checked against the code that implements it, and each got one of three verdicts:

- **true**: the text promises nothing the game does not do (or nothing mechanical at all).
- **false**: the text states or clearly promises an effect the game does not have, or gives a number the code contradicts.
- **vague**: a player could fairly read into it a mechanic the game does not have.

The line-by-line verdicts are in `data/blurbs.tsv`, one row per claim, with a `file:line` citation in every row. Paths below are under `src/`.

Some numbers in this report come from running the game's own functions (`initiativeOdds`, `selfAccess`) in a scratch bundle. They are marked "measured".

### Counts

A text with several claims that got different verdicts (a tag's blurb, why line and teeth line, or a project's host, gate and flavor) has one row per claim. That is why the claim count is higher than the entry count.

| File | Entries read | Claims judged | True | False | Vague |
|---|---:|---:|---:|---:|---:|
| `data/facilitiesData.ts` | 38 | 39 | 35 | 1 | 3 |
| `data/campusData.ts` | 15 | 15 | 11 | 1 | 3 |
| `data/projectData.ts` | 6 | 15 | 7 | 1 | 7 |
| `data/techData.ts` (halls, labs, graduate entry lines) | 31 | 31 | 31 | 0 | 0 |
| `components/BuildPopup.tsx` | 20 | 20 | 15 | 1 | 4 |
| `components/BuildingInfoPanel.tsx` (its facility lines) | 5 | 5 | 4 | 0 | 1 |
| `data/quirkData.ts` | 40 | 40 | 33 | 1 | 6 |
| `data/tagData.ts` (+ the tag log lines) | 11 | 31 | 22 | 3 | 6 |
| `data/researchData.ts` | 45 | 46 | 44 | 1 | 1 |
| `systems/research/researchSystem.ts` (report lines) | 8 | 8 | 8 | 0 | 0 |
| `data/researchTopics.ts` | 249 | 249 | 249 | 0 | 0 |
| `data/studentLifeData.ts` | 151 | 151 | 151 | 0 | 0 |
| `tabs/AthleticsTab.tsx` (budget tier and coaching lines) | 7 | 9 | 8 | 0 | 1 |
| `data/reportData.ts` | 43 | 43 | 34 | 4 | 5 |
| `state/finalReport.ts` | 2 | 2 | 1 | 1 | 0 |
| `data/chronicleData.ts` | 53 | 53 | 47 | 2 | 4 |
| `data/alumniData.ts` (+ the reunion line) | 16 | 16 | 12 | 1 | 3 |
| **Total** | **740** | **773** | **712** | **17** | **44** |

About two thirds of the entries are lists of names: 249 research topics, 85 club names, 50 mascot suggestions, 12 sports, 33 era names, and the grant funders and prize names. Names promise nothing, so all are true; each has its own row. The false and vague claims all come from the other 250 or so entries, the ones that describe what something does.

### FALSE claims (17)

| # | File | Id | Quote | What the game actually does | Proposed fix |
|---|---|---|---|---|---|
| 1 | `data/tagData.ts:22` | teaching-college teeth | "Students who are known by name stay: one point less attrition a year." | The summer applies `attritionRate()` with no tag teeth (`resolveAdmissions.ts:132`). Only the admissions preview and the year in review add them (`consequences.ts:74-76,111`; `yearInReview.ts:133-139`), so the preview and the real summer disagree. Attrition is also 0 whenever satisfaction is at least 50 (`admissionsSystem.ts:268-276`). | Code: commit with `summerAttrition(s)` at `resolveAdmissions.ts:132`. Text: "when students are unhappy, fewer of them leave". |
| 2 | `data/tagData.ts:28` | pressure-cooker teeth | "Not everyone lasts: one and a half points more attrition a year." | Never applied, for the same reason as #1. The preview shows the extra 1.5 points, but the summer does not take them. | The same code fix as #1. |
| 3 | `data/tagData.ts:24` | jock-school teeth | "Recruits want to play here: every team six points stronger." | The +6 goes only on the department total `athleticProgramStrength` (`studentLifeData.ts:808-817`), which campus-life standing and the athletics table read. No team is stronger. `teamQuality` (`:654-658`) decides games (`season.ts:83`), the sport tables and playoff seeds (`rivalsSystem.ts:339`), and the athletes cohort (`cohorts.ts:143-145`), and it has no tag term. | Add `tagTeeth(s, 'athletics')` to `teamQuality`, or say "the department ranks six points stronger". |
| 4 | `data/researchData.ts:248` | Pilot Study blurb | "One scholar, six months. Publications, and a grant now and then." | A paper needs 90 banked points (`:347`), and banking is deterministic (`researchSystem.ts:86-95`). A pilot has no guaranteed paper (`:106-107`), and grants come only with papers (`:58-59`). Measured: an ordinary scholar (research 60-85) banks 0.3-0.7 papers' worth with 1-6 labs, so the pilot publishes nothing and wins no grant. Only a star with 13 labs, or a prize-winner, gets a single paper. The offer card prints "~0.4 publications" right next to this blurb (`ResearchTab.tsx:196-199`). | "One scholar, six months. Rarely a paper, but a finished initiative for the lab." Or bank the leftover at the end. |
| 5 | `data/reportData.ts:63` | WEAKNESSES.finance | "never balanced its books" | The finance axis is endowment per student against $80,000 (`rivalsSystem.ts:239-243`), which the game itself explains (`EndowmentPanel.tsx:85`, `StandingsPanel.tsx:23`). Operating balance, deficits and debt are never read. `sweep.ts:9-12` says a college that never moves cash into the endowment "is graded F however rich it is", and that cash-rich college would then be told it never balanced its books. | "never built an endowment to match its size" |
| 6 | `data/reportData.ts:76` | VERDICTS.steady | "It kept its money: the endowment went from {from} to {to}, and the books mostly balanced." | Chosen on the endowment ratio alone (0.9 to 2 times the start, `finalReport.ts:130`). Nothing about operating balance is checked, and the line can print next to "It spent N years in distress, and had an interim CFO appointed twice" (`:131-137`). | Drop ", and the books mostly balanced", or make it depend on `weeksInTheRed` or on no distress years. |
| 7 | `data/reportData.ts:60` | WEAKNESSES.experience | "never learned to make its students happy" | The experience axis is campus-life standing. It never reads satisfaction, only the social attribute, at 25 of about 150 points. The rest is the rec chain, clubs, athletics and titles (`prestigeSystem.ts:643-670`). A college whose students averaged 80 or more can score under 45 here and get this line. | "never gave its students much of a campus life" |
| 8 | `data/reportData.ts:70` | REPORT_SHAPES.strength | "{college}: {phrase}, and a very good one" | Chosen whenever no unclaimed axis is under 45 (`finalReport.ts:121`), and 45 is a D (D runs 34-48). The mark is 70% axes, 20% rank and 10% promises (`:152-155`). Axes averaging 47, a rank of 60th of 100 and no promises make a mark of 46, which is a D, under a "very good" title. | Gate this shape at the B line (62), or reword it: "{phrase}, with no glaring weakness". |
| 9 | `state/finalReport.ts:83,96` | athletics axis numbers | The athletics row of "Averaged {mean} over the run..." and its grade | Athletic strength runs 0-100 (`studentLifeData.ts:816`; `rivalsSystem.ts:271`), but the report multiplies it by 100/150 as if it ran to 150. A department at strength 90 prints as 60 and can never grade above B (the ceiling is 66.7), and it trips the weakness line below strength 67.5. | Code: scale athletics by 1 (it is already on the report's 0-100 scale). |
| 10 | `data/chronicleData.ts:34` | CHRONICLE_LINES.money | "The books closed {in the red by $X} over the era, and the endowment went from..." | "net" is the change in cash (`history.ts:49`), so construction, loans and every endowment transfer count as losses, including the standing sweep the board asks for (`sweep.ts:68-75`). An era of surpluses spent on buildings or swept into the endowment "closed in the red". | "Cash on hand {rose/fell} by $X over the era". Or sum the operating net and leave out capital spending and transfers. |
| 11 | `data/chronicleData.ts:35` | CHRONICLE_LINES.moneyPlain | "The books closed {net} over the era." | Same cash-change reading (`chronicle.ts:237-246`). | Same as #10. |
| 12 | `data/alumniData.ts:33` | MEMORY_CLAUSES.deficits | "four years of bad news from the bursary" | Fires when cash fell in 2 of the class's 4 years (`ledger.ts:44,64`; `alumniData.ts:45`). Building or sweeping a surplus into the endowment counts as bad news. The clause also costs the class 3 warmth, which cuts its giving for good (`giving.ts:32-37`). So a prudent act lowers alumni giving. | Read operating deficits, for example the distress ladder's deficit terms, and say "two lean years at the bursar's office". |
| 13 | `data/campusData.ts:52` | DORM-07 Vanguard House | "...and the end of the dining hall's hold on the upper years." | The dorm adds beds only (`campusData.ts:100-111`). Dining is needed for every enrolled student whatever their housing (`satisfactionSystem.ts:43-49,201`). | Drop the clause, or give the rung real basicNeeds serves as the towers have. |
| 14 | `data/facilitiesData.ts:677` | ATH-FIELD Multi-Sport Field | "shared by every varsity team that plays on grass" | The field hosts soccer, lacrosse, field hockey, and track and field (`studentLifeData.ts:203-205,212`). Football plays in the stadium and baseball and softball on the diamond (`:208-211`), and track is not played on grass. | "shared by soccer, lacrosse, field hockey, and track and field" |
| 15 | `data/projectData.ts:58` | PROJ-RESEARCH-PARK | "where Landmark Programs are commissioned" | Landmark Programs run in a lab (`startInitiative.ts:16` refuses anything but a `lab`). The Park only opens that depth (`researchData.ts:265-275`). A player who looks for a Landmark slot at the Park finds none. | "...and once it stands, any lab can take on a Landmark Program." |
| 16 | `components/BuildPopup.tsx:721` | build HelpHint | "A facility serves a fixed share of the enrolled student body, so a bigger class raises the bar for campus life" | A facility serves a fixed number, `servesPopulation`, measured against enrolled students times a target ratio (`satisfactionSystem.ts:137-164`). A fixed share could never be diluted, yet the same sentence says it is. | "A facility serves a fixed number of students, so a bigger class..." |
| 17 | `data/quirkData.ts:26` | beloved-lecturer | "Students would follow them into a fire. Publishes nothing." | Research is -10 on the rolled potential (`facultyData.ts:768`), which leaves 35-90. The lecturer still produces output and publishes on initiatives (`researchData.ts:32-40`). | "Publishes little." |

### VAGUE claims (44)

| File | Id | Quote | What a player could read in / what the code does | Suggested fix |
|---|---|---|---|---|
| `facilitiesData.ts:572` | REC-T1 Recreation Center | "Fitness and intramural space...; a small draw on its own." | "Fitness" suggests health, but the center feeds social; the gym, pool and courts are the health buildings. "Draw" suggests applicants, but its only pull is prestige 0.05, which is 0.6 of a point on the academic target (`prestigeSystem.ts:58-60,170-177`). No cohort reads it. | "Recreation and intramural space...: social life, and a little prestige." |
| `facilitiesData.ts:640` | REC-T2 Athletics Complex | "a varsity-grade complex adding 3,500 more capacity" | The 3,500 is social (`:646-647`), while the three rungs before it add health. "Varsity-grade", yet it is no venue and lifts no team. | "adding 3,500 more social capacity"; drop "varsity-grade" or say "not a competition venue". |
| `facilitiesData.ts:466` | LANDMARK-DOME | "over a reading room" | Reads as study seats (academic capacity). The three landmarks are mechanically identical, and the Dome serves no one. | Accept, or "over a great hall". |
| `campusData.ts:46` | DORM-04 Hillcrest | "with a kitchen to each floor" | Suggests self-catering, which would ease dining. Dorms carry no basicNeeds. | "a kitchenette to each floor", or accept as color. |
| `campusData.ts:47` | DORM-05 Cascade | "housing for the upper years" | Beds are one pool, with no allocation by class year. | "the kind of housing upper years ask for" |
| `campusData.ts:54` | DORM-09 Crestline | "the residence the college shows visitors, and the one the seniors choose" | Suggests a tour or admissions effect and allocation by class year. Neither exists. | "the residence seniors ask for" |
| `projectData.ts:52` | PROJ-ARTS | "Opens once every Arts & Media course is taught." | It also waits for Year 10 (`projects.ts:30`). | Template the year in, as the Medical Center does. |
| `projectData.ts:58` | PROJ-RESEARCH-PARK | "Laboratories for rent... faculty who want to be near the money" | No rent or industry income. The Park costs $45k a week and adds research standing +18. | "Laboratories where faculty and industry work side by side" |
| `projectData.ts:58` | PROJ-RESEARCH-PARK | "Opens once every lab ... has seen an initiative through." | It also waits for Year 12. | Add "from Year 12". |
| `projectData.ts:64` | PROJ-GRADUATE | "Opens once any school's undergraduate courses are all taught." | It also waits for Year 15. | Add "from Year 15". |
| `projectData.ts:72` | PROJ-LAW | "Opens once every Social Sciences & Humanities course is taught." | It also waits for Year 15. | Add "from Year 15". |
| `projectData.ts:78` | PROJ-BUSINESS | "Opens once every Business course is taught." | It also waits for Year 15. | Add "from Year 15". |
| `projectData.ts:84` | PROJ-MUSEUM | "Fifty years of gifts, loans and bequests" | It opens from Year 40 (or Year 35 at prestige 100) and takes 144 weeks to build, so 38-45 years, not fifty. The line also never says when it opens. | "Decades of gifts..." |
| `BuildPopup.tsx:276-277` | tile "serves {n}" | "serves 4,000" | A bare number, with no need named. In the Social tab this is health capacity for the gym, pool and courts. | "serves 4,000 · health" |
| `BuildPopup.tsx:106-111` | Fitness group in the Social tab | Social > Fitness | The gym, pool and courts feed health (`facilitiesData.ts:381-389` files them under 'social'). The Health tab holds only the health-center chain. | File them under Health, or label the group "Fitness (health)". |
| `BuildPopup.tsx:333` | venue expansion tooltip | "Adds {seats} seats for the gate and {serves} of social capacity over {weeks} weeks" | Seats and prestige count from the first week (`reducer.ts:851-855`, `gate.ts:32-37`). Only the social capacity waits for completion. | "Seats and prestige at once; {serves} social capacity when the work is done." |
| `BuildPopup.tsx:721` | build HelpHint | "housing ... not an admissions requirement" | True, but beds scale the whole applicant pool from 0.35x with no beds to 1x at 2,500 beds (`admissionsSystem.ts:78-86`). | Add "though beds widen the pool up to 2,500". |
| `BuildingInfoPanel.tsx:46-56` | capacity labels | "Serves N recreation / fitness / court / pool / gallery capacity" | The labels hide the need: "recreation" (the Rec Center) is social, while "fitness/court/pool" are health. | Name the need, as for the quad ("social"). |
| `quirkData.ts:29` | harsh-grader | "The median is a C..." | The A-F chips on course cards (`FacultyTab.tsx:100`) grade the teaching. This quirk improves that grade (teaching +4). | Rename away from letter grades, or show quirk effects on the card. |
| `quirkData.ts:31` | a-name | "People have heard of them." | Suggests fame or prestige, but acclaim starts at 0 and faculty are no prestige input (`prestigeSystem.ts:49-51`). | Accept, or "A strong record, and the fee to match." |
| `quirkData.ts:33` | committee-creature | "Sits on every committee, chairs three..." | Suggests a good administrator. Seats pick by teaching plus research (`seats.ts:56`), and this quirk lowers both. | Accept, or give it a seat bonus. |
| `quirkData.ts:37` | the-easy-a | "The easy A ... The course is always full" | Teaching -5 lowers the A-F course grade, and seats per course are fixed at 80. | Rename (for example "The crowd-pleaser") and drop "always full". |
| `quirkData.ts:46` | grades-a-b-plus | "Every paper, every year, a B+." | Reads as a B course next to the course-grade chips. The effect is teaching -4. | As above. |
| `quirkData.ts:52` | always-being-courted | "Has an offer from somewhere else every spring" | The 'star-poached' event draws its professor uniformly from the roster (`eventCatalogue.ts:67-80`; `catalogue.ts` rollVars). This quirk is only a salary of 1.2x. | Weight this professor in the event, or "Negotiates a raise every spring". |
| `tagData.ts:21` | research-powerhouse why | "...stronger than the teaching." | Teaching is never read. The test compares research standing with 0.8 times academic standing (`tags.ts:70`). | "The research is strong, and close behind the college's name." |
| `tagData.ts:21` | research-powerhouse teeth | "Grants and gifts follow the papers: a tenth more giving" | The 1.1x applies to the alumni annual fund only (`giving.ts:42-45`). Research grants are untouched. | "Gifts follow the papers: a tenth more alumni giving each year." |
| `tagData.ts:22` | teaching-college why | "...stronger than the research." | Measured as research standing below 0.8 times academic standing (`tags.ts:71`). | "The teaching is strong, and the research lags the name." |
| `tagData.ts:23` | party-school why | "the classes they arrive in are not the most demanding" | Reads as easy courses. The code reads incoming student quality below 60, and needs Greek chapters, which the line omits (`tags.ts:72`). | "The students are happy, the intake is not the strongest, and Greek life is busy." |
| `tagData.ts:25` | artsy why | "their programs, their buildings, their share of the campus" | Buildings are not read (`tags.ts:74`). Arts clubs are read, but the name regex (`tags.ts:63`) matches only 5 of the 85 club names (Film, Photography, Dance, Anime, Comics) and misses Jazz Ensemble, Chamber Orchestra, Drama Society, A Cappella Society... | Name the clubs, and widen the regex (music, orchestra, drama, choir). |
| `tagData.ts:27` | country-club why | "A dear sticker, little aid, and a beautiful campus." | There is no financial-aid lever, so "little aid" names nothing. | "A steep price and a beautiful campus." |
| `researchData.ts:252` | Funded Project | "Regular grants" | Measured: an ordinary team publishes 3-5 papers, and 1 paper in 5 carries a grant, so about 0.6-0.9 grants a run and a 41-64% chance of none. | "A grant or two" |
| `AthleticsTab.tsx:274` | budget tier title | "{$}/yr into the department's pot" | The dial also scales every team's social lift (0.6x / 1x / 1.5x) and the department's upkeep and salaries (0.75x / 1x / 1.4x) (`studentLifeData.ts:284-288,1124-1145`). | List all three effects on the tier's title. |
| `reportData.ts:51` | AXIS_PHRASES.experience | "a college its students loved" | The axis is campus-life standing, not satisfaction (see false #7). | "a college with a campus life to envy" |
| `reportData.ts:58` | WEAKNESSES.academics | "never quite learned to teach" | The axis is overall academic standing, and teaching is about 30 of 220 input points plus a ceiling. Even all-D teaching caps standing at 91, which is 61 on the report scale, so teaching alone never makes this axis the weak one. | "never earned its academic name" |
| `reportData.ts:61` | WEAKNESSES.athletics | "never won a game that mattered" | The axis reads team strength, not results, and it is mis-scaled (false #9). A department that won titles can still get this line. | "never fielded a team anyone feared" |
| `reportData.ts:103` | REPORT_WORDS.notYet | "a college is not graded on its first decade" | The first decade is graded. It is 30% of every axis through the whole-run mean, and it is the baseline of the climb (`finalReport.ts:98-102`). | "...drafted from the tenth: the first decade is too early to judge." |
| `reportData.ts:104` | REPORT_WORDS.epilogue | "Nothing new unlocks." | Ladder milestones and gates still open buildings after Year 50 when they are reached (`techSystem.ts:342-381`). | "No new era of the game opens." |
| `chronicleData.ts:20` | ERA_NAMES campaign | "The {ordinal} Campaign" | Counts campaign eras, not campaigns (`chronicle.ts:278-282`). | Count campaigns, or use only "The Campaign Years". |
| `chronicleData.ts:33` | rankFlat | "...{to} throughout, give or take." | Compares only the first and last year of the era (`chronicle.ts:233-235`). | Check the range, or say "about where it started". |
| `chronicleData.ts:37` | troubles | "The board climbed to {rung}..." | Prints "rung 4", a number the player never sees; the Treasury names the rungs (`TreasuryTab.tsx:196`). The ladder also runs "down one rung a term" (`distress.ts:3-15`). | "The college fell as far as {Austerity}..." using RUNG_NAMES. |
| `chronicleData.ts:57-58` | sagaGames | "The teams have met {count} times" | Only the main sport's series, and the main sport changes when the priority list is reordered (`collegeRival.ts:12-16`). | "The {sport} teams have met..." |
| `alumniData.ts:23` | under-taught | "under-taught" | Reads the campus course average at commencement (`ledger.ts:40`), not across the class's four years. | Average the course quality over the four years. |
| `alumniData.ts:24` | well-taught | "properly taught" | Same snapshot at commencement. | Same fix. |
| `alumniData.ts:29` | first-of-program | "the first to read a subject that did not exist before them" | Fires when a program is established (its tier-2 courses are done, `techSystem.ts:589-596`), long after the subject was founded and taught. | Fire on a program's founding, or "there when {program} came into its own". |

### The Final Report's phrases

The report grades six axes, read from `rivalsSystem.ts`'s standings (`finalReport.ts:74-81`). Each axis score is 0.5 times the last decade, plus 0.3 times the whole run, plus 0.2 times a climb term, all on a 0-100 scale. The title uses the first tag's phrase, or else the phrase of the strongest axis. If the weakest axis the tag does not claim scores under 45, that axis's weakness phrase is appended.

| Axis | What it reads | Strength phrase | Fit | Weakness phrase | Fit |
|---|---|---|---|---|---|
| academics | Academic standing, from 13 inputs: breadth 50, concentration 30, teaching 30, student quality 24, research 22, welfare 20, and so on, plus the teaching ceiling (`prestigeSystem.ts:52-69,364-427`) | "a serious academic college" | fits | "never quite learned to teach" | vague: teaching is one input of many |
| research | Research standing: output credits (a paper 0.1, a breakthrough 1, a prize 3, a doctorate 2) and the share of fields with a lab (`prestigeSystem.ts:183-204,604-619`) | "a research college" | fits | "never wrote a paper anyone read" | fits: papers barely count, impact does |
| experience | Campus-life standing: rec chain and venues 30, clubs and chapters 35, athletics 30, the social attribute 25, titles 20, and project lifts (`prestigeSystem.ts:625-670`) | "a college its students loved" | vague | "never learned to make its students happy" | **false**: satisfaction is never read |
| athletics | Department program strength on a 0-100 scale (`studentLifeData.ts:808-817`), then wrongly multiplied by 2/3 (`finalReport.ts:83`) | "a sporting college" | fits | "never won a game that mattered" | vague: reads strength, not results, and is mis-scaled |
| access | Half the admit rate, half how far the price sits under twice the tolerance (`rivalsSystem.ts:234-238`) | "a college that opened its doors" | fits | "never opened its doors very wide" | fits |
| finance | Endowment per student against $80,000 (`rivalsSystem.ts:239-243`) | "a well-endowed college" | fits | "never balanced its books" | **false**: nothing about balance is read |

The shapes and verdicts:

- "and a very good one" is false (#8). It is gated at 45, a D, not at a good grade.
- "the books mostly balanced" is false (#6).
- rich, poorer, distress, CFO and debt all fit what they read.

Structural issues that decide which phrase a real run gets:

1. **Athletics is mis-scaled** (#9). The best possible department reads 66.7, a B. Any department under strength 67.5 is below the weakness line. A college with no teams reads 0 on this axis, so unless a Jock School tag claims athletics, most colleges without a big department get "never won a game that mattered".
2. **Access sits under the line by construction.** Measured: pricing at the tolerance (the revenue-maximizing price) with a 38% admit rate, the highest the slider ever opens at, reads 44.0. A 20% admit rate reads 35, and a 10% rate reads 30. "Never opened its doors very wide" fits the axis, but it will be the stock ending for any selective or full-price college.
3. **Finance is often the lowest axis.** Unless the college moves cash into its endowment (the sweep is off by default, `sweep.ts:16`), endowment per student stays far below $80,000. The report then says the college "never balanced its books", even when it holds more cash than it can spend. That makes it a likely false title in ordinary play.
4. **Some tags claim an axis their test does not read** (`TAG_AXIS`, `reportData.ts:35-46`). A tag's claimed axis is never named as the weakness, so these matter:
   - commuter maps to access, but the Commuter test reads beds, and the access axis never reads beds.
   - country-club maps to experience, but its test reads price and beauty. Price is half of access, and beauty is in no axis.
   - pressure-cooker maps to academics, but its test reads admit rate and unhappiness, which are access and experience. So "a pressure cooker that never opened its doors very wide" is a tautology, not a contrast.
   - The other seven mappings are sound.
5. **Grammar:** "the bargain of its region that never ..." attaches the weakness to "its region". Put the clause after the tag, or give The Bargain the phrase "a bargain college".

### Patterns

1. **Most building descriptions never reach the player.**
   - The build menu shows only a tile detail (`BuildPopup.tsx:266-279`: "serves N", "+N flat", "N beds", "gates capstone coursework").
   - The info panel prints a capacity line in place of the description for dorms, dining halls, the library, the student center, the rec and fitness buildings, the gallery, the whole health chain including the Medical Center, the venues, the quads, the labs and the halls (`BuildingInfoPanel.tsx:46-130,504-512,615-622`).
   - Only the grocery, the field house, the amenities, the landmarks and the capital projects show their description, and only once placed, after the money is spent.
   - So the 15 dorm blurbs, including the false Vanguard line, are dead text. So are the Medical Center's "lift to academics and research" and every project's "Opens once..." sentence. The ladder's "opens" lines (`ladderData.ts`, outside this scope) are the only place most of these promises reach a player.
   - The comment at `campusData.ts:35` ("shown on the build panel's tile") is out of date.
2. **Numbers generated from constants are right, and prose about systems is not.** Every capacity, gate and year that the descriptions template in from constants checks out: dining, health, venues, grocery, gates, loan terms. The false claims cluster where a hand-written sentence describes how a system judges the college: tags, the Final Report, the chronicle and alumni money lines, the research blurbs.
3. **"The books" means three different quantities, none of them the operating balance.**
   - The report's weakness and verdict read the endowment.
   - The chronicle and the alumni deficit clause read the change in cash, which counts capital spending and the sweep as losses.
   - The game already keeps an operating record that these lines could read: the weekly net, the distress deficit terms, and `weeksInTheRed`.
4. **Preview and commit disagree.** The attrition teeth are in `summerAttrition` (the admissions preview and the year in review) but not at the summer boundary. The comment at `yearInReview.ts:131-132` claims they match, and they do not.
5. **Aggregate versus individual.** The Jock School's "every team" lands on the department total, and the Field House's "every team" lands on every team. Same wording, different mechanics.
6. **Health and social are blurred in fitness.** The Rec Center says "Fitness" but serves social. The gym, pool and courts serve health but sit in the Social tab under "Fitness". The capacity labels ("fitness/court/pool/recreation capacity") never name the need. A college short of health has to know the gym is the answer.
7. **Letter-grade collisions.** Three quirk names ("Harsh grader", "The easy A", "Grades everyone a B+") speak of student grades, next to A-F chips that grade the course. Each quirk moves that chip the opposite way from what its name suggests.
8. **"Landmark" is overloaded.** It names a grand landmark (a building), the Landmark Program (a research depth), the humanities breakthrough "landmark work of scholarship", "a first landmark" (the statue, in the ladder) and "a landmark of the college's own past" (historic buildings).
9. **Cosmetic effects.** Two effects never reach the funnel:
   - The grand landmarks' `applicantPoolBonus` of 1,500, and the milestone applicant bonuses of 30-60 (`techSystem.ts:21-25,325,565`), are added to `s.students.applicantPool`, which the summer funnel overwrites (`resolveAdmissions.ts:152`). They only bump the Enrollment tab's figure until then. The landmark text does not promise this bonus, so no verdict changed, but the ladder's "a lasting lift to ... applications" relies only on beauty and prestige.
   - The research offer card prints "~0.4 publications" for a deterministic zero (`ResearchTab.tsx:199`).

### Voice

The intended voice is American. Most of the text is American: center, theater, color, checks, fall, catalog, "Swim & Dive". British spellings and idioms cluster in four places:

- **Dorm blurbs** (`campusData.ts`): "round one formal front door" (US "around"; also in the Japanese Garden, `facilitiesData.ts:482`), "a balcony to every other flat" (US "apartment"), "apartment block" (US "apartment building"). The Oxbridge college vocabulary also reads as British to an American player: "a house of staircases... a tutor on the ground floor", "first-years", "a common room nobody books". In US terms that is "entryways", "an RA", "first floor", "freshmen" and "a lounge".
- **Faculty quirks** (`quirkData.ts`): "Answers email by post" (US "by mail"), "every autumn" (US "fall"), "Marks overnight" and "marks undergraduate essays" (US "grades"), "the department's biscuits" (US "cookies").
- **Tags, alumni and research**:
  - "A dear sticker" (US "a steep sticker price", `tagData.ts:27`).
  - "the first to read a subject" (US "to study" or "to major in", `alumniData.ts:29`).
  - "bad news from the bursary" (US "the bursar's office"; in British English a bursary is also a scholarship, `alumniData.ts:33`).
  - "Neuroimmune Signalling" (US "Signaling", `researchTopics.ts:161`).
  - "a medical research charity" (US "foundation", `researchData.ts:205`).
- **Code-facing only, no change needed:** "storeys" and "centre" appear only in comments and identifiers. "organisations" is a breakdown key whose label is "Clubs and chapters".

Other voice notes:

- The chronicle prints tag names bare ("started calling it Commuter"). The tag log uses the phrases ("a commuter school"), and the chronicle should too.
- The concluding research log always says "publications", even for a studio whose word is "exhibited work".
- The economics doctorate's course code prints "PhD 701" while every other doctorate prints its id ("PHDE 701").

### Found outside the listed files

These were not graded in the TSV:

- `systems/techtree/techSystem.ts:631`: "{program} is now founded - the first {degree} class can be admitted." This is **false**. The game models no graduate students or graduate admissions (`techData.ts:421-423`, `projectData.ts:65-66`). The program was also "founded" when its entry course started, not when its last course finished.
- `data/ladderData.ts:217`: "a grocery store would pay its way". The grocery has upkeep and no income.

## Letters, promises, campaigns, seats, the ladder and hints

Scope: every player-facing text in `src/data/eventData.ts` (the nine decision events with their prompts, choices, `describe()` and `apply()`; the six milestone celebrations; the nine opening letters), `openingData.ts`, `foundingNotes.ts`, `boardData.ts`, `demandData.ts` (plus the three demand log lines in `systems/demands/demandSystem.ts`), `promiseData.ts`, `campaignData.ts`, `seatData.ts`, `ladderData.ts`, `figureHints.ts`, and all 28 `<HelpHint>` call sites. No repository file was edited.

Method: each text was split into its concrete claims (numbers, consequences, what opens, what is tracked). Each claim was traced to the code that does or does not implement it. Row-level evidence with file:line citations is in `data/letters-promises.tsv` next to this file. One row gives each entry's main verdict, and each further false or vague claim gets its own row.

### Counts

| File | Entries read | Claims judged | True | False | Vague |
|---|---:|---:|---:|---:|---:|
| data/eventData.ts (9 events: 9 prompts + 19 choices; 6 celebrations; 9 letters) | 43 | 52 | 34 | 7 | 11 |
| data/openingData.ts | 4 | 5 | 4 | 0 | 1 |
| data/foundingNotes.ts | 2 | 2 | 2 | 0 | 0 |
| data/boardData.ts | 9 | 12 | 9 | 0 | 3 |
| data/demandData.ts (+ 3 demandSystem.ts log lines) | 10 | 11 | 9 | 0 | 2 |
| data/promiseData.ts (26 promises + PROMISE_LINES) | 36 | 41 | 19 | 12 | 10 |
| data/campaignData.ts | 6 | 7 | 2 | 3 | 2 |
| data/seatData.ts (5 seats, 3 rule notes, policy labels) | 13 | 14 | 6 | 1 | 7 |
| data/ladderData.ts | 15 | 15 | 11 | 0 | 4 |
| data/figureHints.ts | 28 | 28 | 24 | 1 | 3 |
| HelpHint usages (28 call sites in 19 files) | 28 | 28 | 21 | 2 | 5 |
| **Total** | **194** | **215** | **141** | **26** | **48** |

### False claims (26)

| File | Id | Quote | What the game actually does | Proposed fix |
|---|---|---|---|---|
| eventData.ts | letter:a-hall-of-its-own | "six rooms, three quarters of a million, sixteen weeks to build" | Elm Hall costs $2,500,000 and takes 26 weeks (techData.ts:77-79). The letter predates the Plan 71 retune (commit a80c989 changed 750_000/16 to 2_500_000/26). | Read `cost` and `duration` from the Buildable. |
| eventData.ts | letter:doors-open | "Founders Hall is where every program begins" | Any academic hall with a free slot accepts a new program (techSystem.ts:399-405). The a-school-grows letter itself says to found straight into the school's hall (eventData.ts:1229). | "Programs begin in Founders Hall until their school has a hall of its own." |
| eventData.ts | letter:the-laboratories | "When each has finished one, the Research Park opens" | The park also waits for Year 12 (projectData.ts:60; projects.ts:30), and a school's labs can all finish years earlier. | Add "from Year 12", read from `PROJECTS`. |
| eventData.ts | letter:the-laboratories | "the Graduate College opens once any school teaches every one of its courses" | The Graduate College also waits for Year 15 (projectData.ts:68). | Add "from Year 15". |
| eventData.ts | greek-scandal.disband | "N points of social satisfaction and $Y a week of cost go with it" | A housed chapter also loses its 40 beds and its house (eventData.ts:579-581). | When housed, append "and the 40 beds of its house". |
| eventData.ts | rival-passed.chair | "$X up front, and $S/yr thereafter" | Payroll pays S × the market rate, which is 2.5–4× at the prestige over 100 this event requires (financeSystem.ts:235-237; facultyData.ts:619-625; eventSystem.ts:166). Every other hiring screen shows the rate actually paid. | Show `facultyPay(s, c.salary)` in the describe text and the log line. |
| eventData.ts | varsity-petition.establish | "$X up front for a program budget"; prompt: "Establishing the program costs $X" | apply() also sets a permanent weekly program upkeep of 0.003 weeks of opex, charged even while the team waits for its venue (eventData.ts:977; studentLifeData.ts:1121-1131). | Add "and $W a week to run it" to the prompt and to describe(). |
| promiseData.ts | endowment-centennial | "A hundred million in the fund" (and the kept line) | The goal is $100M × priceScale (annual opex / $15M, clamped to 0.2–12), read when the promise is judged (catalogue.ts:43-46,147,156-159). The real bar ranges from $20M to $1.2B. The panel shows only the title. | Judge promise goals on raw figures, or fill the scaled amount into the title. |
| promiseData.ts | a-years-reserve | "Ten million in reserve" | The goal is $10M × priceScale, somewhere from $2M to $120M. | Same fix. |
| promiseData.ts | one-fifty-million | "A hundred and twenty-five million in the fund" | The goal is $125M × priceScale, somewhere from $25M to $1.5B. | Same fix. |
| promiseData.ts | borrowing-halved | "Borrowing under eight million" | The goal is $8M × priceScale, somewhere from $1.6M to $96M. | Same fix. |
| promiseData.ts | weather-the-storm | "Out of the hole by the decade's end" | The promise falls due 8 years after it is made, whatever the decade (promiseData.ts:172; promises.ts:128). | "Out of the hole in eight years", or make it due at the next decade close. |
| promiseData.ts | weather-the-storm | missed: "The date came. The college was still in the hole." | The goal also needs board confidence of 70+ (promiseData.ts:171), and no text states it. A college back at Sound with confidence 69 is told it is still in the hole. | Drop the confidence condition, or name it and give it its own missed line. |
| promiseData.ts | content-at-eight-hundred | "as content as the few hundred are now" | The goal is a fixed satisfaction of 50+ (promiseData.ts:288). | Store the satisfaction at acceptance as the goal, or say "and still content". |
| promiseData.ts | beautiful-campus | kept: "fifteen years on" | The promise falls due 12 years after it is made (promiseData.ts:133). | Set `years: 15`, or write "twelve years on" (fill in `{years}`). |
| promiseData.ts | great-faculty | "thirty of them … in a decade" | The term is 12 years (promiseData.ts:185). | `years: 10`, or "in a dozen years". |
| promiseData.ts | loyal-alumni | "a decade of doing the unglamorous thing" | The term is 12 years (promiseData.ts:146). | Same fix. |
| promiseData.ts | reunions-that-fill-the-hall | "a decade of the slow work" | The term is 12 years (promiseData.ts:276). | Same fix. |
| promiseData.ts | selective-college | "admits most of those who apply" | The promise is offered at admit rates as low as 45% (`selectivityUnder: 0.55`, promiseData.ts:157). | Offer it at `selectivityUnder: 0.5`. |
| campaignData.ts | quad-restoration | "put the old buildings right"; kept: "the scaffolding is coming down" | A renovation can only be paid in cash (reducer.ts:346-354). The campaign's money pays for the next new building instead (techSystem.ts:260,298). | Allow building-fund money to pay `RENOVATE_BUILDING`. |
| campaignData.ts | library-wing | "A wing for the library, named for whoever gives most of it"; kept: "the wing has a name on it" | No wing is built or named. The money joins the general building fund, and library floors are cash only (reducer.ts:819-836). | Let the fund pay `RENOVATE_LIBRARY` and name the floor, or rewrite the text as a general building campaign. |
| campaignData.ts | new-residence | kept: "The beds it paid for are beds nobody had to share." | Building money pays first for any new building it covers, a stadium as readily as a dorm (techSystem.ts:260; treasury.ts:62-75). | Restrict each campaign's money to its purpose, or reword the kept line. |
| seatData.ts | facilities | "Roofs, boilers, kitchens and storms … answered before they reach the President's desk" | Storms, fire, flood, freeze and sinkhole are seismic letters, and seismic letters are never delegated (catalogueEngine.ts:86-97). No estate event concerns kitchens; the kitchen strike is a students-domain letter (eventCatalogue.ts:2039-2046). | "Roofs, boilers, pipes and snow"; add that storms and fires still reach the President. |
| figureHints.ts | funds | "only a deficit can push them below zero" | When an event runs out its clock, its default choice is charged whether or not the cash is there (catalogueEngine.ts:149-153). 51 default choices cost cash, among them the storm's $600k × scale. | Cap default costs at the cash on hand, or say "a deficit, or an event's default, can …". |
| components/BuildPopup.tsx | HelpHint@721 | "A facility serves a fixed share of the enrolled student body, so a bigger class raises the bar" | The model is the other way round: a facility serves a fixed number of students, and each need is a fixed share of enrollment (satisfactionSystem.ts:43-49,137-166). | "A facility serves a fixed number of students, and each need grows with enrollment, so a bigger class raises the bar…". |
| tabs/AlumniPanel.tsx | HelpHint@22 | "That sets its warmth for good … A reunion … can nudge it a little" | Running campaigns cool every class's warmth each week (campaigns.ts:77). Event and promise warmth effects also move every class (catalogue.ts:326; promiseData.ts:44,148). | "That sets its warmth. A reunion nudges it; campaigns, events and promises move every class's." |

### Vague claims (48)

| File | Id | Quote | What the game actually does | Proposed fix |
|---|---|---|---|---|
| eventData.ts | hellenic-council.charter | "Chapters begin forming from here on" | Each chapter needs 900 enrolled students (studentLifeData.ts:41,960-962). The council can be offered at about 440 students, so no chapter may form for years. | "Chapters form as the college grows, one for every 900 students." |
| eventData.ts | hellenic-council.charter | "A chapter is worth 2.5 points of social satisfaction" | These are raw points on the social attribute. Past 20 raw points the curve discounts them (studentLifeData.ts:1166-1170), the attribute caps at 100, and the headline figure gets about 24% of what remains. | "up to 2.5 points of social life". |
| eventData.ts | greek-scandal.disband | "N points of social satisfaction … go with it" | Same raw figure. The real loss can be near zero, as the Students tab itself warns (StudentLifeTab.tsx:89-95). | Quote the real change in the satisfaction target. |
| eventData.ts | greek-housing.build | "a further 1.5 points of social satisfaction" | Same raw figure and cap. | "up to 1.5 points". |
| eventData.ts | ad-shortage.appoint | "$S/yr thereafter" | Pay is multiplied by the athletics tier (0.75/1.0/1.4) and rises with tenure (studentLifeData.ts:284-288,1124-1131; athleticsSystem.ts:44-49). | Show S × the tier multiplier, "rising with tenure". |
| eventData.ts | rival-passed.chair | "Endow the chair" / "an endowed chair" | The sum is spent; nothing is endowed, and the salary is ordinary payroll (eventData.ts:896-902). | Rename to "Fund the chair", or put the sum into the endowment. |
| eventData.ts | varsity-petition.prompt | "real recruiting, a paid coach, and a conference schedule" | There is no recruiting lever and no conference, only the pot's funding band and a national 8-team bracket (studentLifeData.ts:648-658; playoffs.ts:7-17). | "a program budget, paid coaches and a place in the national season". |
| eventData.ts | celebration:school-founded | "the hall they share is S Hall. The name is permanent" | The school's name is permanent, but the "S Hall" label is live and reverts if a program moves out (schools.ts:56-65). | "The school's name is permanent; the hall carries it while the school fills it." |
| eventData.ts | letter:moving-in | "E is S's from then on" | The claim is a live reading: founding another school's program there, or emptying the hall, ends it (schools.ts:87-103). | "E is S's while only S programs are founded there." |
| eventData.ts | letter:the-research-park | "laboratories for rent to companies" | The park earns no rent: it has upkeep and a research lift only (projectData.ts:57-61). | Drop "for rent", or make the park pay rent. |
| eventData.ts | letter:the-research-park | "It is where Landmark research is commissioned" | The park unlocks the tier; the program itself runs in a lab (researchData.ts:268-276; startInitiative.ts:16). | "It opens Landmark research to every lab." |
| openingData.ts | teaching | "each is developed — paid for once" | Every course also costs weekly upkeep and instruction sections (financeSystem.ts:100-121,177-181). | "paid for once to develop, then carried each week". |
| boardData.ts | enter-2 | "would like to see a surplus before it sees another building" | Nothing blocks or scores building at the Deficit rung (distress.ts:73-76,181-189). | Drop the line, or make building at Deficit cost board confidence. |
| boardData.ts | enter-4 | "until the books are in surplus again" | Austerity lifts only after two surplus terms in a row with cash above zero (distress.ts:113-115,123). | "until it has run two surplus terms with money in the bank". |
| boardData.ts | exit-5 | "set where they were before the appointment" | The settings return to where they were before austerity, not to the austerity settings in force at the appointment (distress.ts:150-166). | "where the administration had them before the board's cuts". |
| demandSystem.ts | log:demand-met | "X is open, and the campus knows who asked for it" | The demand is met by any rise in the served figure: another building, a chapter house's 40 beds, or a dorm's added floors (demandSystem.ts:61-74). X may not be open. | Name the ask only if it stands. |
| demandSystem.ts | log:demand-failed | "has passed with nothing built" | The line is also logged when a partial build fell short (demandSystem.ts:278-281). | "without enough built". |
| promiseData.ts | teaching-college | "The best teaching in the state" | Nothing is compared with other colleges; the goal is a campus average course score of 44, a C (promiseData.ts:80; courseQuality.ts:20). | Retitle, or compare against the rivals. |
| promiseData.ts | teaching-college | kept: "what the college is known for" | "Known for" is the identity-tag mechanic, and keeping the promise grants no Teaching College tag. | Reword, or grant or advance the tag. |
| promiseData.ts | open-thirty-programs | "eleven programs, each taught properly" | The goal only counts housed programs; staffing and quality are not read (catalogue.ts:65-67,99). | Require the programs to be staffed, or drop "properly". |
| promiseData.ts | great-faculty | "Thirty scholars worth the name" / "properly paid" | The goal is a headcount of 30 (catalogue.ts:91). | Drop the qualifiers, or add a quality condition. |
| promiseData.ts | one-fifty-million | "would like the campaign to be judged by it" | No campaign is tied to this promise or read when it is judged. | "the college to be judged by it". |
| promiseData.ts | twelve-buildings-and-a-view | "Twelve buildings" | The count includes statues, fountains, gardens, quads and courts (catalogue.ts:64,94). | Count only buildings and dorms, or say "twelve structures". |
| promiseData.ts | teaching-worth-the-fee | kept: "The fee is still high" | Tuition is not read when the promise is judged. | Add a tuition condition, or drop the clause. |
| promiseData.ts | the-word-at-the-gate | "A college people recommend" | The title reads as word of mouth, but the goal is prestige of 87+ (catalogue.ts:81,124). | Judge it on word of mouth (trailing satisfaction), or retitle it "A name people know". |
| promiseData.ts | a-great-project | "raise one great building, the kind a campus is photographed by" | Only capital projects count (catalogue.ts:112). The grand landmarks carry no `project` field and never keep the promise (facilitiesData.ts:457-474), although the Campanile is "the college on every postcard". | Count landmarks, or say "one capital project". |
| promiseData.ts | PROMISE_LINES.offered | "The board has put something on the record" | This is only an offer; leaving the beat declines it at no cost (promises.ts:118-134). | "The board proposes to put on the record: {title}." |
| campaignData.ts | new-residence | "Everyone being asked lived three to a room" | Every class is asked. The classes that give more are those "thinned by the years" by attrition, not crowded ones (alumniData.ts:22; campaigns.ts:23-26). | Give the campaign a crowded-housing memory to resonate with, or reword. |
| campaignData.ts | teaching-chairs | "endowed chairs: money that pays a salary forever" | The money goes into the general endowment (campaigns.ts:75). | "money that pays out forever, as the endowment does". |
| seatData.ts | POLICY_RULE_NOTES.popular | "the choice the people it serves feel best about" | The rule reads only student satisfaction (mood), whichever seat applies it (seats.ts:162,169; catalogueEngine.ts:68,73). | "the choice the students feel best about". |
| seatData.ts | provost | "The first seat a college fills" | No order is enforced (seats.ts:59-63). | "Usually the first seat…". |
| seatData.ts | provost collegial | "Keep the faculty with you" | The rule reads student mood; there is no faculty sentiment. | Relabel, or add faculty mood to the rule. |
| seatData.ts | dean collegial | "Keep the department happy" | The rule reads student mood only. | Relabel. |
| seatData.ts | facilities worst-first | "Worst first, properly" | The rule takes each event's costliest choice; nothing ranks buildings by condition. | "Fix it properly". |
| seatData.ts | dean-of-students listen | "Meet them halfway" | In a scandal this policy dissolves the chapter, because the mood of disbanding (-2.5) beats that of the PR campaign (-3). It always charters the council and builds every house (eventData.ts:501,551,566,655). | Reweight the mood figures, and relabel. |
| seatData.ts | advancement policies | "Ask about them first" / "Ask properly, and often" | The popular rule reads student mood, not alumni warmth, and no policy changes how often anyone is asked. | Relabel, or read warmth for this seat. |
| ladderData.ts | regional | "varsity-grade" (Athletics Complex) | The Athletics Complex is a recreation building; no varsity sport plays there. | "the top of the recreation chain". |
| ladderData.ts | research | "A research reputation" | The milestone is reached at overall prestige 70, not on research (ladderData.ts:199-204). | Rename it, or gate it on research standing. |
| ladderData.ts | market | "a grocery store would pay its way" | The store has upkeep and no income (facilitiesData.ts:493-507). | "would be worth its keep". |
| ladderData.ts | distinguished | "Graduate programs open where their schools stand" | Each program also needs its host capital project standing, and each host has a year gate (techData.ts:649-655). | "once their host building stands". |
| figureHints.ts | prestige | "the grade reads curriculum, teaching, … and the estate" | The grade also reads endowment per student and subtracts up to 25 for crowding (prestigeSystem.ts:68-69). | Add "the endowment, less crowding". |
| figureHints.ts | applicants | "prestige, the price …, and word of mouth set it" | Beds, crowding (down to 0.1×), beauty, cohorts and titles also scale the pool (admissionsSystem.ts:67-86). | Add "beds, crowding and the campus". |
| figureHints.ts | tightestNeed | "The service that will be most stretched" | Only beds and dining are compared (consequences.ts:78-91). | "Beds or dining, whichever will be more stretched…". |
| tabs/TreasuryTab.tsx | HelpHint@68 | "exactly what the weekly tick charges or collects" | The student-life line (clubs, chapters, teams, coaches, the AD) is charged but never shown, so the lines do not add up to Total expenses (financeSystem.ts:288,294). | Add the missing line to the statement. |
| tabs/HistoryTab.tsx | HelpHint@318 | "when the record is sealed" | Only the Final Report is sealed. A history row is still filed every summer of the Epilogue (resolveAdmissions.ts:174). | "when the Final Report is written". |
| tabs/EndowmentPanel.tsx | HelpHint@34 | "Cash moved in stays in: it pays out only at the draw rate" | A capital project can take half its cost from the endowment (techSystem.ts:299-301). | Add "or to pay half a capital project". |
| tabs/AthleticsTab.tsx | HelpHint@221 | "the college's subsidy (the one dial here)" | The dial also scales staff pay (×0.75/1.0/1.4) and the athletics satisfaction bonus (×0.6/1.0/1.5). | Say so in the hint. |
| tabs/AdministrationPanel.tsx | HelpHint@32 | "would move more than four weeks of operating cost" | Only a choice's cost is checked; a large gift is still answered by the seat (seats.ts:177-181). | "would cost more than four weeks…". |

### Patterns

- **Numbers typed into prose drift; numbers filled in from constants hold.** Every figure built from a constant checks out: the board letters, move weeks, dents, bans, speed thresholds and committee seats. The false numbers are all typed literals:
  - Elm Hall's price, left behind by the Plan 71 retune.
  - Four promise terms written as "a decade" or "fifteen years".
  - "By the decade's end".
  - The fix is the same everywhere: fill these in from the code.
- **Promise goals are invisible.** The Promises panel and the summer offer show only the title, the years and the flavor text (PromisesPanel.tsx:57,108-111), so the title is the player's whole contract.
  - Four money titles are silently multiplied by 0.2–12.
  - Three goals test something other than the title: a hidden confidence bar, prestige instead of word of mouth, and capital projects that exclude the landmarks.
  - Three texts promise quality where only a count is read.
  - The promise ids have drifted from their titles (`found-six-schools` for four schools, `one-fifty-million` for $125M, `open-thirty-programs` for eleven), a sign of retuning without rewriting.
- **"Restricted" building money is one general fund for new construction.** Three of the five campaign texts promise a purpose the money cannot be spent on: beds, a named library wing, and restoration. Restoration fails outright, because renovations are cash only.
- **describe() texts leave out things apply() does,** although the file's own contract says "apply() does exactly what this says" (eventData.ts:215).
  - The varsity program's running cost.
  - A housed chapter's beds.
  - The chair's market-rate pay.
  - The coach tier multiplier.
  - Student-life "points" are raw figures that ignore the curve and cap, which the Students tab itself warns about.
- **Seat policy labels promise a feeling the rule never reads.** The rule reads only the student-mood figures. As a result:
  - The default Dean of Students policy dissolves a chapter in any scandal.
  - Any Dean of Students charters Greek life automatically, so a college with that seat never sees the permanent "no Greek life" choice.
  - The Facilities blurb claims storms, which as seismic letters bypass every seat.
- **Letters leave out year gates and treat live readings as permanent:** the Research Park (Year 12), the Graduate College (Year 15), hall claims, and hall names.
- **Adjacent findings outside the listed files:**
  - The Treasury statement has no student-life line.
  - The grand landmark's +1,500 `applicantPoolBonus` and the milestone applicant bonuses are overwritten at the next summer (techSystem.ts:325,565; resolveAdmissions.ts:152), so they are dead effects.
  - The log line "the first MD class can be admitted" appears although the game has no graduate students (techSystem.ts:631).
  - The Treasury's closing note repeats "Only an operating deficit can push cash negative".
  - `PROMISE_LINES.capReached`, `decadeTake` and every campaign `whenText` are never shown.

### Voice (dry American senior administrator)

- **On target:** the register is mostly right: declarative, minute-taking, with the jokes kept inside the institution ("The board regrets that, and has decided it is the cheaper regret").
- **British idioms and spellings:**
  - "has been on at you" (eventData.ts:714) and "this year's table" (884).
  - "The queue … round the building" (demandData.ts:71); "corridors"/"corridor" (78, 108).
  - "common room" and "a rota" (foundingNotes.ts:13, 17).
  - "prospectus" six times (promiseData.ts:121, 212, 215, 311, 316, 320).
  - "school-leaver" (316); "the fee" for tuition (324–333); "has been round" (134).
  - "The Clerk keeps a register" (95); "minuted" (82); "by telephone" (342).
  - "a fence round a ruin" (EstatePanel.tsx:35); "the colleges either side" (AthleticsTab.tsx:429).
  - The internal id `twenty-programmes` uses a British spelling (not shown to players).
- **Second person:**
  - The letters and the walkthrough use "you" by design: the chair is writing to the President.
  - It leaks into in-world choice texts: "you will not be asked again", "for you to place on campus", "on at you" (eventData.ts:516, 618, 714).
  - It also appears in a demand ("handed to your office", demandData.ts:71), a ladder note ("yours to site", ladderData.ts:125) and a figure hint ("the class you admit").
  - The BuildPopup hint is the only chatty text in scope. It uses contractions ("what's", "you've", "that's").
- **Frame breaks:**
  - UI vocabulary appears inside in-world letters: "Open Founders Hall on the map" (eventData.ts:1134), "At week 52 the clock stops … Three beats" (1188), "the Treasury's 'Being large'" (ladderData.ts:136), and "the summer's Students beat" (eventData.ts:504).
  - Some texts name officers who may not exist yet: "the Dean" in the first-program note, before any Dean seat can exist, and "the Provost" in promises when none has been seated.
  - No in-jokes that break the frame were found in scope.

## The event catalogue

Scope: every event in `src/data/eventCatalogue.ts`, every alternative telling in `src/data/eventVariants.ts`, and every choice label, checked against what `src/systems/events/catalogue.ts` and `catalogueEngine.ts` actually apply and against what `src/components/EventPanel.tsx` renders under each choice. No repository file was edited. The row-by-row verdicts are in `data/events-catalogue.tsv`.

References are `file:line`. `catalogue.ts` is `src/systems/events/catalogue.ts`; `eventCatalogue.ts` and `eventVariants.ts` are in `src/data/`. Money figures are the catalogue's own. At play, `catalogue.ts:37-60` scales any sum of 25,000 or more by budget, from 0.2x to 12x. In simulated runs the scale was about 0.4x in year 3 and 1.5x in year 10, and it reached the 12x cap by year 25.

### Counts

- **Events read:** 154 (134 inline, 20 seismic letters), plus 112 alternative tellings (for 56 events) and 373 choice labels.
- **Claims judged (rows in the TSV):** 273: 100 true, 66 false, 107 vague.
  - Main texts (154): 100 true, 21 false, 33 vague.
  - Tellings: 9 false, 30 vague.
  - Choices: 36 false, 44 vague.
- **Events:** 60 are clean, 41 have at least one false claim, and 70 have at least one vague claim.

**How I judged.** A claim is **true** when the game does what the words say, or when the words promise nothing mechanical: pure color about things the game does not model, such as the Faculty Senate, a summer school or a cat. A claim is **false** when it states or clearly promises a consequence the game does not implement, or when it contradicts the state the game shows the player. That includes people, programs, buildings, map objects, named funds, the calendar, and the game's own promise, campaign and historic-building systems. A claim is also false when a number disagrees with the effect. A claim is **vague** when a player could fairly read in a mechanic, a follow-up or a lasting consequence that nothing tracks.

In the TSV, the where column holds `text`, `telling N` or the choice's id. Each event has one row for its main text. Tellings and choices get their own row only when their verdict is false or vague. Every other telling and choice was read and judged true.

To check placeholders, timing and scale, I also ran the repo's own simulation harness from a working bundle (not committed): the natural player, seeds 12345, 4242 and 777, fifty years each .

### What each effect really does (the promise behind the rendered line)

| Effect | Rendered as (`EventPanel.tsx:28-51`) | What the code does |
|---|---|---|
| cash | "costs $X" / "brings $X" | `s.finance.cash += v` (`catalogue.ts:316`) |
| endowment | "endowment ±$X" | Added to the endowment, floored at 0 (`catalogue.ts:317`) |
| debt | "borrows $X" / "repays $X of debt" | A new 15-year loan (`catalogue.ts:295-299`). A repayment stops at the outstanding balance and the excess is discarded (`catalogue.ts:301-306`) |
| backlog | "$X of repairs deferred / done" | Spread over every standing building: new backlog by building cost, repairs by each building's share of backlog, clamped at zero (`catalogue.ts:260-270`). It is never aimed at the `{building}` the text names |
| mood | "satisfaction ±N" | Immediate, then drifts back toward the target at 5% of the gap per week (`satisfactionSystem.ts:22, 379`), so half is gone in about 13 weeks |
| confidence | "board confidence ±N" | A 0-100 number. Its only readers are six events' conditions, one promise goal and the Treasury tab (`distress.ts:181-189`, `TreasuryTab.tsx:196`). No rung, budget or dismissal depends on it |
| warmth | "alumni warmth ±N" | Applied to every existing alumni class, permanently (`catalogue.ts:326`, `ledger.ts:15`). It drives annual giving (`giving.ts:32-37`). Future classes are unaffected |
| quality | "incoming quality ±N" | The last intake's average preparation (`catalogue.ts:327`). It feeds prestige, raises the academic standard (`satisfactionSystem.ts:117-120`), and is overwritten at the next summer's admissions (`resolveAdmissions.ts:156`) |
| enrollment | "±N freshmen" | Adds to or removes from the current freshman class at once, scaled as v/2000 of the student body (`catalogue.ts:272-293`) |
| trees | "N trees planted / felled" | New trees go on random bare land. Felled trees are the first entries in the tree list, wherever they stand (`woodland.ts:14-38`) |
| departs | "{faculty} leaves" | The named professor leaves (`catalogue.ts:339-347`). Only `star-poached` uses it |

No effect key can hire, appoint or retire anyone, or open or close a program. None can close, damage or name a building, or declare one historic. None can put anything on the map: a path, a statue, a clock or a car park. None can set the mascot, change the draw rate, start a campaign, make a promise, or restrict money to a purpose. The game only remembers when an event last fired and which telling it used (`catalogueEngine.ts:111-119`), never which answer was chosen. Most false claims follow from these two facts.

### FALSE claims

| Event (where) | Quote | What the game actually does | Proposed fix |
|---|---|---|---|
| `anonymous-gift` (choice buildings) | "Put it into the buildings" | eventCatalogue.ts:61: Pays the gift twice: cash +1,200,000 AND backlog -1,200,000 of free repairs, rendered "brings $X · $X of repairs done" (EventPanel.tsx:33,36); the label says the money goes into the buildings, not the bank | effects: { backlog: -1200000, mood: 2 } (no cash) |
| `storm` (text) | "took ... a run of mature limes along the north walk" | eventCatalogue.ts:135: No answer fells a tree: none of the three choices has a trees effect; the roofs are only priced, and "Rebuild properly" even leaves backlog 1,500,000 lower than before the storm | Add trees: -12 to every choice (the wind took them whatever the answer) |
| `recession` (text) | "The endowment is worth materially less than it was at breakfast" | eventCatalogue.ts:152: The fall only happens if you ride it out (endowment -4,000,000); choosing "Cut" leaves the endowment untouched, so the crash the letter reports is optional | Apply the loss to both choices, or reword as a threat ("could be worth materially less") |
| `recession` (choice cut) | "Cut this year's spending to match" | eventCatalogue.ts:156: A spending cut that costs money: cash -1,500,000, rendered "costs $X" (EventPanel.tsx:33); no expense line changes | Model it as drawing less: e.g. endowment -2,500,000, mood -4, confidence +3, no cash; or relabel "Cover the loss from operating cash" |
| `derelict-notice` (text) | "The town has written about {building} ... 'eyesore'" | eventCatalogue.ts:212: The event fires because some building is derelict (condition < 0.1, catalogue.ts:96) but {building} is drawn from all roofed buildings (catalogue.ts:210): in simulated runs the town named buildings at condition 0.94 and 0.74 while the derelict one sat at 0.00; "Put it right" repairs by backlog share across the estate (catalogue.ts:260-270) | Set {building} to the derelict building (lowest conditionOf) |
| `derelict-notice` (telling 2) | "The town council has written about the state of {building}" | eventVariants.ts:35: Same as the text: the named building is usually not the derelict one; British spelling "grey" | As for the text; "gray" |
| `derelict-notice` (telling 3) | "A letter from the town about {building}: ... 'eyesore'" | eventVariants.ts:36: Same as the text: the named building is usually not the derelict one | As for the text |
| `elm-disease` (choice fell-replant) | "Fell and replant with limes" | eventCatalogue.ts:275: Nothing is planted: trees -25 only deletes (woodland.ts:15-17) and the rendered line reads "25 trees felled" (EventPanel.tsx:46); the replanting is not in the game | Fell 35 and plant 35 (two steps), or make the net loss small and relabel "Fell and replant a few young limes" |
| `desire-path` (choice pave) | "Pave the line they walk" | eventCatalogue.ts:291: No path is laid: cash -30,000 and satisfaction +2 only, though pathways are real map tiles the player places (reducer.ts:264-275) | Add path tiles across the quad, or relabel "Stop reseeding it" |
| `arboretum-gift` (text) | "would like to give it three hundred trees" | eventCatalogue.ts:303: "Accept" plants 60 (trees +60, rendered "60 trees planted", EventPanel.tsx:46), on random bare tiles (woodland.ts:19-38), not the class's planting plan | trees: 300, or write "sixty trees" |
| `bequest-conditions` (choice accept) | "Accept the terms" | eventCatalogue.ts:381: The building money arrives as unrestricted cash +4,000,000 (catalogue.ts:316); no building is required or named, though the game keeps a restricted building fund "spendable on nothing else" (types.ts:988, AdvancementPanel "Raised for buildings") | Credit advancement.restrictedBuilding (new effect key) instead of cash, and name the next building for the donor |
| `draw-questioned` (choice cut) | "Cut the draw and find the money elsewhere" | eventCatalogue.ts:397: The draw rate is a player setting (treasury.ts:15-17, reducer.ts:306) that no effect touches: the choice moves 600,000 from cash to endowment once and the over-draw carries on | Set s.finance.drawRate to 0.05 (new effect), or relabel "Put a year's excess draw back" |
| `frozen-post` (text) | "The hiring freeze has held for three years. The post that opened when {faculty} took leave" | eventCatalogue.ts:409: There is no hiring freeze: the Freeze rung stops construction and borrowing only (distress.ts:8, 73-80) and hiring is never blocked (reducer.ts:215-217); nothing requires three years at the rung; {faculty} is a random roster member who is teaching, not on leave (catalogue.ts:208) | Reword around the real construction freeze and an unnamed vacancy |
| `frozen-post` (telling 2) | "The post left open when {faculty} went on leave has now been frozen" | eventVariants.ts:51: Same as the text: no hiring freeze, no leave; {faculty} is on the roster teaching | As for the text |
| `frozen-post` (telling 3) | "Three years into the hiring freeze, the vacancy left by {faculty}'s leave" | eventVariants.ts:52: Same as the text | As for the text |
| `frozen-post` (choice fill) | "Fill the post" | eventCatalogue.ts:412: No one is hired: cash -60,000, satisfaction +2, confidence -1; the roster only grows through appointFaculty (facultySystem.ts:10-15), which no effect calls | Open a real hire (appointFaculty with a rolled candidate), or relabel "Fund temporary cover" |
| `tenure-case` (choice deny) | "Deny, with a year to find something" | eventCatalogue.ts:474: Nobody leaves, now or in a year: no departs effect (only satisfaction -3, incoming quality -1), and the candidate is not a named roster member | Name {faculty} and add departs: 1, or relabel "Defer the case a year" |
| `sabbatical-overrun` (text) | "{faculty} has not come back from sabbatical" | eventCatalogue.ts:485: The game has no sabbaticals: {faculty} is a random roster member (catalogue.ts:208) who is on the roster teaching their courses; "Extend the leave" extends nothing | Drop {faculty} ("A professor has not come back"), or add a leave state |
| `sabbatical-overrun` (telling 2) | "{faculty}'s sabbatical ended in September. {faculty} did not." | eventVariants.ts:63: Same as the text: the named professor was never away | As for the text |
| `sabbatical-overrun` (telling 3) | "The year's leave granted to {faculty} is now in its second year" | eventVariants.ts:64: Same as the text | As for the text |
| `sabbatical-overrun` (choice recall) | "Require a return or a resignation" | eventCatalogue.ts:489: Neither happens: no departs; the named professor stays (and was never away); effects are satisfaction -1, incoming quality -1 | Add departs: 1 (they resign), or relabel |
| `two-body` (choice line) | "Fund a teaching line for the spouse" | eventCatalogue.ts:503: No one joins the roster: cash -90,000, incoming quality +2, satisfaction +1 | Appoint a generated spouse to the faculty, or relabel "Pay for a one-year courtesy post" |
| `emeritus-office` (text) | "Four emeritus professors are using offices" | eventCatalogue.ts:516: Fires from year 18, but no one can retire before about year 26 (careers run 25-40 years, facultySystem.ts:105-116) and the founders retire in years 30-31, so four emeriti are impossible for most of the window (one simulated run fired it in year 23); retirees also leave the roster (facultySystem.ts:119-139) | yearAtLeast: 32 |
| `program-thin` (choice teach-out) | "Teach out the students in it and close it" | eventCatalogue.ts:580: Programs cannot be closed in this game: they only relocate (techSystem.ts:482-495) and a hall with programs cannot be demolished (demolition.ts:83); {program} stays in the catalog. This is the default answer | Add a program-closure effect, or relabel "Freeze its budget" |
| `nothing-to-study` (text) | "{school} has buildings, a seal, a bell and no programs" | eventCatalogue.ts:591: Never true and never fires: every college houses the three founding programs from day one (actions.ts:408-411, foundingData.ts:56), programs cannot be removed, and programsUnder: 1 would admit one anyway (catalogue.ts:100, 162) | Delete the event, or regate it on something that can happen |
| `nothing-to-study` (choice emergency) | "Open something, anything, this year" | eventCatalogue.ts:594: No program opens: cash -300,000, confidence +2, satisfaction +2 | Delete with the event |
| `newspaper` (choice fund) | "Fund it and give the undertaking" | eventCatalogue.ts:642: Funding costs nothing: satisfaction +3, confidence -1, no cash | Add cash: -30000 |
| `mascot` (text) | "The Athletic Director has produced a costume without being asked" | eventCatalogue.ts:687: No Athletic Director can exist yet: one is hired once the first team exists (types.ts:847-850), and by then the first-sport beat has named the mascot (eventSystem.ts:109-121), which this event's mascotAtMost: 0 excludes | Give the costume to a student or the Dean of Students |
| `mascot` (choice adopt) | "Adopt the heron" | eventCatalogue.ts:690: No mascot is set (s.self.mascot is untouched; effects are cash, satisfaction, warmth), so the first sport club still asks the player to name the teams and the event can recur after 15 years; rival Bellhaven College already plays as the Herons (rivalData.ts:149) | Set s.self.mascot = "Herons" (new effect), or relabel "Tolerate the heron" |
| `fire` (text) | "What is lost is the east end: three teaching rooms, the departmental office" | eventCatalogue.ts:840: Nothing is lost: {building} keeps its capacity, courses and condition; the choices move only cash, backlog (estate-wide), satisfaction, warmth and confidence | Put a large backlog on the named building (new targeted effect), or reword "smoke has closed the east end for the term" |
| `fire` (choice close) | "Close the east end and manage without it" | eventCatalogue.ts:845: Nothing closes: no capacity, course or served-population change; the default costs cash -300,000 and adds backlog +700,000 across the estate | Reduce the named building's capacity, or relabel "Make it safe and defer the rebuild" |
| `bequest` (choice debt) | "Clear the debt and steady the ship" | eventCatalogue.ts:879: Rendered "repays $X of debt" (EventPanel.tsx:35) whatever the college owes, but repayment stops at the balance and the rest vanishes (catalogue.ts:301-306); the event has no debt condition, so a debt-free college loses the 8,000,000 share | Pay any excess into cash, or show the choice only with debtOver |
| `thin-fund` (choice campaign) | "Run a capital campaign" | eventCatalogue.ts:941: No campaign runs: the game's campaigns (campaigns.ts:12-17; one at a time, needs a VP of Advancement) are untouched; endowment +3,000,000 lands at once | Start a real campaign (or require the VP seat), or relabel "Ask the major donors" |
| `thin-fund` (choice restraint) | "Stop drawing and let it recover" | eventCatalogue.ts:942: The draw setting is untouched (treasury.ts:15-17), so the fund keeps paying out; the choice moves cash -500,000 / endowment +900,000 once | Set the draw to 0 for a year (new effect), or relabel "Put a year's draw back" |
| `one-teacher` (choice hire) | "Hire, whatever it costs" | eventCatalogue.ts:1017: No one is hired: cash -120,000, incoming quality +2, satisfaction +2; the roster is unchanged | Appoint a rolled candidate (appointFaculty), or relabel "Pay the three for overload teaching" |
| `the-heating-bill` (text) | "The heating bill for December has arrived" | eventCatalogue.ts:1063: Fires only in weeks 50-51 and 1-2 (winterAtLeast 0.7, catalogue.ts:76-79): the last weeks of the Spring Term before the summer at week 52 (admissionsSystem.ts:421) and the first of the Fall Term (StatusHeader.tsx:72-74); never December | Fix winterDepth, or drop "December" |
| `the-heating-bill` (telling 2) | "December's heating bill has come in" | eventVariants.ts:131: Same as the text | As for the text |
| `the-dark-term` (text) | "The spring term has started in the dark" | eventCatalogue.ts:1093: Never fires: winterAtLeast 0.95 passes only in week 52, always the summer (catalogue.ts:76-79, admissionsSystem.ts:421); and week 52 is the end of the Spring Term, not its start (StatusHeader.tsx:72-74) | Gate on the first weeks of the Spring Term (week 27+) or rewrite as the Fall Term's dark weeks |
| `the-championship-run` (choice boosters) | "Let the boosters pay for the scoreboard" | eventCatalogue.ts:1144: The college is paid instead: cash +400,000, rendered "brings $X", and no scoreboard exists | No cash (the boosters pay the supplier): { warmth: 2, confidence: -1 } |
| `the-rankings-slip` (choice promise) | "Promise a rise within five years" | eventCatalogue.ts:1177: No promise is made, though the game has public promises with deadlines, rewards and penalties (promises.ts:11-17, promiseData.ts): this is confidence +2, satisfaction -1 now and nothing in five years | Add a PromiseDef (goal reputationOver or a rank goal, years: 5) and create it on this answer |
| `the-listing` (choice support) | "Support the listing" | eventCatalogue.ts:1350: Nothing is listed: the building is not declared historic (no ivy, no prestige, no quarter-higher upkeep, still demolishable, estate.ts:112-123, demolition.ts:81); only warmth +3 and backlog +250,000 spread over the estate | Set the building historic (new effect), which already carries the game's listing rules |
| `the-lab-inspection` (choice close) | "Close the laboratories until it is done" | eventCatalogue.ts:1450: No lab closes: research initiatives keep running in them and nothing reopens later; the effect is incoming quality -2, satisfaction -2 now | Pause lab initiatives for a few weeks, or relabel "Suspend lab classes for a week" |
| `the-last-lecture` (text) | "The longest-serving teacher in {program} retires in June" | eventCatalogue.ts:1461: Nobody retires (no departs; the roster is unchanged), and from year 15 to about year 26 nobody can have served long enough to retire (careers 25-40 years, facultySystem.ts:105-116) | Fire it from the real retirement notice (facultySystem.ts:123-127) and name that person |
| `the-last-lecture` (choice prize) | "Endow a prize in her name" | eventCatalogue.ts:1465: No prize exists afterward; the money just moves from cash to the general endowment (cash -150,000, endowment +150,000) | Relabel "Give to the endowment in her name", or add named funds |
| `the-statue-donor` (text) | "a gift toward the scholarship fund" | eventCatalogue.ts:1608: There is no scholarship fund: the gift is general endowment (catalogue.ts:317) | "a gift to the endowment" |
| `the-statue-donor` (choice accept) | "Accept the gift and the statue" | eventCatalogue.ts:1611: No statue is placed, though the game has one (AMENITY-STATUE, facilitiesData.ts:480): endowment +1,500,000, satisfaction -2, confidence +1 | Place a statue amenity, or relabel "Accept the gift, and promise a statue" |
| `the-statue-donor` (choice plaque) | "Offer a named scholarship instead" | eventCatalogue.ts:1612: No scholarship is created; endowment +600,000 | Relabel "Offer to name an endowed fund" or add named funds |
| `the-reunion-gift` (text) | "The {class} has raised a reunion gift" | eventCatalogue.ts:1624: {class} is the class that graduated last summer (catalogue.ts:207), but the game's reunions come only every fifth year out (giving.ts:55-59) | Draw a class whose years out are a multiple of five |
| `the-reunion-gift` (telling 2) | "The {class} would like its reunion gift spent on a clock" | eventVariants.ts:207: Same as the text | As for the text |
| `the-reunion-gift` (telling 3) | "A reunion gift from the {class}" | eventVariants.ts:208: Same as the text | As for the text |
| `the-reunion-gift` (choice clock) | "Install the clock as given" | eventCatalogue.ts:1627: No clock is installed (there is no clock amenity), and the gift arrives as free cash +250,000, rendered "brings $X" | No cash (the class pays the clockmaker): { warmth: 3 } |
| `the-reunion-gift` (choice redirect) | "Ask them to fund bursaries instead" | eventCatalogue.ts:1628: No bursaries exist: the money is general endowment +250,000 | "Ask them to give it to the endowment instead" |
| `the-matching-challenge` (text) | "match every alumni gift dollar for dollar up to $1M" | eventCatalogue.ts:1688: The $1M is fixed but the effect scales with the budget, up to 12x (catalogue.ts:37-60): in three simulated runs it fired only at the 12x cap (years 25-49), where "Announce" shows endowment +19,000,000 for a match capped at $1M, and "a smaller gift" (outright) shows +4,800,000 | Write the cap relative to the college ("up to a year of alumni giving"), or exempt this event from scaling |
| `the-pension-valuation` (choice spread) | "Raise contributions over time" | eventCatalogue.ts:1755: Costs nothing, now or later: the only effect is confidence +1 | Add a one-off cost (e.g. cash: -300000) |
| `the-land-offer` (choice sell) | "Sell the strip" | eventCatalogue.ts:1786: No land leaves the map (the campus grid is fixed); the 35 trees removed are the first in the tree list, not the northern edge (woodland.ts:15-17); and the offer can recur in 8 years for the strip "owned since its founding" | Remove the strip's tiles from buildable land and suppress the event after a sale |
| `the-board-secretary` (text) | "is retiring after thirty-one years. The minutes of every meeting since the founding" | eventCatalogue.ts:1862: Fires from year 20 (yearAtLeast 20), when the college is younger than her thirty-one years; and on an 8-year cooldown she retires again (one simulated run: years 26 and 42) | yearAtLeast: 31 and cooldownYears: 99 |
| `the-board-secretary` (choice hire) | "Appoint a full-time successor" | eventCatalogue.ts:1865: Free: confidence +2 and no cost, while paying the retiree to transcribe costs 45,000 | Add cash: -60000 |
| `the-term-limits` (text) | "has been on the board for twenty-six years" | eventCatalogue.ts:1878: Fires from year 14 (yearAtLeast 14): the board is younger than twenty-six years until year 26 | yearAtLeast: 26, or "since the founding" |
| `the-harrowgate-pledge` (text) | "It is in the foundations of a building that already has his name cut into the lintel" | eventCatalogue.ts:2012: No such building or unfinished project exists (only buildingsOver 4 is checked) and no pledge money was ever received; also shares a name with the top rival, Harrowgate University (rivalData.ts:153) | Gate on a building under construction and name it; rename the family |
| `the-harrowgate-pledge` (choice finish) | "Finish the building from the endowment" | eventCatalogue.ts:2015: Nothing is finished or built: endowment -3,000,000 buys nothing on the map | Tie it to a real project (pay its remaining cost) |
| `the-harrowgate-pledge` (choice mothball) | "Mothball the unfinished wing" | eventCatalogue.ts:2017: There is no wing to mothball: backlog +600,000 lands across the estate (the default) | Tie it to a real project |
| `the-name-on-the-prize` (text) | "The most famous graduate of the {class}, and of the college's publicity for a generation" | eventCatalogue.ts:2098: {class} is the class that graduated last summer (catalogue.ts:207) | Draw a class twenty or more years out |
| `founding-faculty-last` (text) | "The last of the founding faculty retires this year" | eventCatalogue.ts:2300: Nobody retires (no departs), and by year 38 every founder (f1-f5, actions.ts:370-398) is already gone: their careers, hashed from fixed ids, end in years 30-31 (facultySystem.ts:105-116), and in simulated runs some left earlier for administrative seats | Fire it from the last founder's real retirement notice (facultySystem.ts:123-127) |
| `founding-faculty-last` (choice chair) | "Endow a chair in their name" | eventCatalogue.ts:2303: No chair exists, and the money does not reach the endowment: cash -300,000 simply vanishes (compare the-last-lecture's prize, which moves cash to endowment) | cash: -300000, endowment: 300000, and name it |
| `heritage-listing` (choice welcome) | "Welcome the listing" | eventCatalogue.ts:2365: Founders Hall is not declared historic (no ivy, prestige or quarter-higher upkeep, estate.ts:112-123); only warmth +3, confidence +1, backlog +200,000 | Set Founders Hall historic (new effect) |
| `the-history` (choice archivist) | "Hire an archivist" | eventCatalogue.ts:2395: Free: warmth +2, confidence +1, no cost (compare the-address-list's records officer at 45,000) | Add cash: -45000 |

### VAGUE claims

| Event (where) | Quote | What the game actually does | Proposed fix |
|---|---|---|---|
| `parking-study` (text) | "The Faculty Senate has voted 31–2" | eventCatalogue.ts:13: Fires from year 3 with no faculty gate (when: yearAtLeast 3), yet the roster is modeled and starts at five (actions.ts:370-398): a young college holds a 33-vote Senate. Effects (cash/confidence/mood) are otherwise as stated | Add facultyOver: 33, or drop the tally ("has voted, almost unanimously") |
| `roof-goes` (text) | "A section of roof has come off {building}" | eventCatalogue.ts:28: {building} is any roofed building (catalogue.ts:210), not a worn one (the gate is estate-wide backlog); it takes no damage, no quad is cordoned, and repairs/deferrals are spread over every building's backlog (catalogue.ts:260-270), so the named building's condition may never move | Pick {building} from the buildings with the most backlog and apply the backlog effect to it |
| `roof-goes` (telling 2) | "The wind took a piece of the roof off {building}" | eventVariants.ts:11: Same as the text: random roofed building (catalogue.ts:210), no damage applied to it, estate-wide backlog (catalogue.ts:260-270) | As for the text |
| `roof-goes` (telling 3) | "Part of the roof of {building} is now in the car park" | eventVariants.ts:12: Same as the text (random building, no damage, estate-wide backlog); also British "car park" | As for the text; "parking lot" |
| `roof-goes` (choice tarpaulin) | "Tarpaulin and a fundraising appeal" | eventCatalogue.ts:32: The appeal raises nothing: cash -60,000, backlog +250,000, mood -3; compare storm/appeal, which brings cash +900,000 | Give the appeal a small inflow, or relabel "Tarpaulin it and wait" |
| `anonymous-gift` (text) | "on the single condition that it never be spent on administration" | eventCatalogue.ts:58: No restricted money exists for this: the gift lands as unrestricted cash or endowment (catalogue.ts:316-317) and can pay the seats' salaries; also {class} is the newest alumni class (catalogue.ts:207), so a "bequest" from last summer's graduates | Drop the condition (or route the gift to advancement.restrictedBuilding for "buildings"); draw the alumna from an older class |
| `star-poached` (choice counter) | "Counter the offer" | eventCatalogue.ts:76: A one-off cash -50,000; the counter-offer raises no salary (salaries are recomputed weekly from stats and tenure alone, facultySystem.ts:44), so nothing of it persists | Relabel "Pay a retention bonus", or raise the named professor's salary |
| `auditors` (choice defer) | "Undertake to review it next year" | eventCatalogue.ts:123: Nothing records the undertaking and the auditors never come back next year; the event only recurs on its 6-year cooldown (catalogueEngine.ts:38-41) | Relabel "Thank them and change nothing", or add a next-year follow-up |
| `boiler-condemned` (text) | "The inspector has condemned the boiler in {building}" | eventCatalogue.ts:167: {building} is any roofed building (catalogue.ts:210), not the one below the 0.7 condition that fired the event; nothing is locked or damaged, and "Replace the plant" spreads backlog -200,000 over the estate (catalogue.ts:260-270) | Name the lowest-condition building and apply the backlog to it |
| `boiler-condemned` (telling 2) | "The boiler in {building} has failed its inspection" | eventVariants.ts:27: Same as the text (random building, nothing locked, estate-wide backlog); British spelling "labelled" | As for the text; "labeled" |
| `boiler-condemned` (telling 3) | "condemned the boiler. The building is cold" | eventVariants.ts:28: Same as the text: the named building is neither cold nor worse in the game | As for the text |
| `ivy-structural` (text) | "the ivy on the west face is now doing some of the work" | eventCatalogue.ts:182: {building} is any roofed building (catalogue.ts:210), possibly new; ivy is drawn only on buildings declared historic (ageMarks.tsx:115), and "considered for listing" never touches the game's own Declare-historic status (estate.ts:112-123) | Draw {building} from historic or 25-year-old buildings; wire the listing aside to historic status or drop it |
| `roof-slates` (text) | "Slates have been coming off {building}" | eventCatalogue.ts:197: {building} is any roofed building (catalogue.ts:210), not a worn one (the gate is estate-wide backlog); repairs/deferrals are spread over the whole estate (catalogue.ts:260-270) | Pick {building} from the buildings with backlog and apply the effect to it |
| `roof-slates` (telling 2) | "A slate came off {building} this morning" | eventVariants.ts:31: Same as the text; also British "queue", "first-years" | As for the text |
| `roof-slates` (telling 3) | "The roof of {building} has been shedding slates" | eventVariants.ts:32: Same as the text; also British "since the autumn" | As for the text |
| `asbestos` (text) | "The refurbishment survey of {building} has found asbestos ... Work has stopped" | eventCatalogue.ts:227: {building} is any roofed building (catalogue.ts:210), possibly new, and no renovation is under way or stopped (the game's renovation, estate.ts:56-60, is untouched); strip/seal move estate-wide backlog | Draw {building} from buildings over 30 years old; drop "Work has stopped" or tie it to a real renovation |
| `bell-tower` (text) | "The bell mechanism has stopped. It stopped once before, in the founder's time" | eventCatalogue.ts:257: No needs gate: the college may have no Bell Tower (AMENITY-BELLTOWER, facilitiesData.ts:484) or Campanile (facilitiesData.ts:458-462); "Restore the movement" changes nothing on the map | Gate on a bell tower (new NeedKey), or say "the Founders Hall clock" (Founders Hall always has a clock tower, buildingMotifs.tsx:1696) |
| `endowment-manager` (choice appoint) | "Appoint a proper manager" | eventCatalogue.ts:366: A one-off endowment +2,000,000 at no fee; the fund's return is a fixed 5.5% (financeSystem.ts:140, 341) that no manager changes, and the event can recur in 8 years still describing the local firm | Relabel as a one-off gain, or suppress the event after "appoint" |
| `two-body` (text) | "{faculty}, the best appointment {school} has made in years" | eventCatalogue.ts:500: {faculty} is drawn at random from the roster (catalogue.ts:208) whatever the teaching/research the Faculty tab shows | Pick the highest-rated faculty member for {faculty} |
| `two-body` (choice courses) | "Offer teaching by the course" | eventCatalogue.ts:504: No course gains an instructor; one-off cash -30,000 and incoming quality +1 | Relabel "Offer a one-term stipend" |
| `two-body` (choice nothing) | "Say that nothing is possible" | eventCatalogue.ts:505: The rival offers in the text never act: {faculty} stays (no departs), unlike star-poached's "Wish them well" | Add departs: 1 here, or soften the threat in the text |
| `star-lecture` (text) | "{faculty}'s lectures have started attracting people who are not registered" | eventCatalogue.ts:531: {faculty} is any roster member (catalogue.ts:208), not a strong teacher; the gate is the campus average (teachingOver 45) | Pick the faculty member with the highest teaching stat |
| `teaching-review` (choice invest) | "Fund a teaching program and protect the time" | eventCatalogue.ts:549: Teaching (course grades, faculty teaching) is untouched; the lever is incoming quality +1 (catalogue.ts:327), the last intake's average, overwritten next summer (resolveAdmissions.ts:156) | Add a teaching lever, or relabel the effect |
| `accreditation-visit` (text) | "The accreditation panel will visit in the spring" | eventCatalogue.ts:561: No visit ever happens and nothing records the preparation; the only consequences are confidence ±3 and incoming quality ±1 now | Reword as a filing ("The self-study is due"), or add a spring follow-up event |
| `accreditation-visit` (telling 2) | "The accreditors are coming in April" | eventVariants.ts:71: Same as the text: no visit follows | As for the text |
| `accreditation-visit` (telling 3) | "An accreditation visit is on the calendar for the spring" | eventVariants.ts:72: Same as the text: no visit follows | As for the text |
| `program-thin` (choice invest) | "Fund it properly and give it three years" | eventCatalogue.ts:579: Nothing reviews the program in three years; the event just recurs on its 5-year cooldown (catalogueEngine.ts:38-41) | Drop "and give it three years", or add a follow-up |
| `library-acquisition` (choice buy) | "Buy the collection" | eventCatalogue.ts:610: The library does not change (its academic credit reads seats and floors); the lever is incoming quality +2 (catalogue.ts:327), overwritten next summer | Add a library lever, or relabel |
| `annual-fund-drive` (text) | "The last one raised four times what it cost" | eventCatalogue.ts:733: This one raises fifteen times what it costs (cash -60,000, endowment +900,000), and into the endowment rather than the annual fund's cash | Write "fifteen times", or make "run" endowment +240,000 |
| `annual-fund-drive` (telling 2) | "The last one paid for itself four times over" | eventVariants.ts:95: Same as the text: the effect is 15 to 1 | As for the text |
| `class-complaint` (text) | "concerns a building that is not there any more, a tradition that has lapsed" | eventCatalogue.ts:749: Nothing requires a demolition (the game logs them, demolition.ts:89-110), and {class} is the class that graduated last summer (catalogue.ts:207) | Gate on a demolished building, or draw an older class |
| `class-complaint` (telling 2) | "about a building that has come down" | eventVariants.ts:99: Same as the text | As for the text |
| `class-complaint` (telling 3) | "before the old hall came down" | eventVariants.ts:100: Same as the text | As for the text |
| `alumni-trustee` (choice grant) | "Create the seat" | eventCatalogue.ts:767: No seat exists afterward, and the event can recur in 10 years asking for the seat again (catalogueEngine.ts:38-41) | Record the answer and suppress the event, or relabel "Promise to create the seat" |
| `tuition-letter` (choice aid) | "Fund more aid and say so publicly" | eventCatalogue.ts:797: There is no aid lever: the price-sensitive cohort reads the listed price (cohorts.ts:24, 244), which is unchanged; the "aid" is a one-off cash -300,000 with satisfaction/warmth | Relabel "Set up a one-off hardship fund" |
| `guidebook` (text) | "{school} has appeared in a guidebook for the first time" | eventCatalogue.ts:809: The 6-year cooldown lets it fire again (catalogueEngine.ts:38-41), "for the first time" each time: in simulated runs it fired in years 9, 28 and 45 of one game | cooldownYears: 99 |
| `guidebook` (choice advertise) | "Buy the larger entry next year" | eventCatalogue.ts:812: The students arrive now: enrollment +8 is added to the current freshman class at once (catalogue.ts:272-293) | Drop "next year" |
| `fire` (choice modern) | "Replace it with something cheaper and newer" | eventCatalogue.ts:844: Nothing is replaced: the building's age, look and condition are unchanged (cash -2,200,000, warmth -3, satisfaction +1) | Relabel "Refit it cheaply" |
| `scandal` (text) | "the two weeks arrives anyway, later, with the college having chosen its own silence to explain" | eventCatalogue.ts:857: Nothing follows the silent answers: no later exposure or event; "quiet" costs confidence -3 and satisfaction -1 once | Add a follow-up letter after "internal"/"quiet", or cut the prediction |
| `thin-fund` (text) | "The endowment is smaller than it was ten years ago" | eventCatalogue.ts:938: Only endowmentUnder 46,000,000 is checked; a young or growing fund qualifies | Compare with the endowment in the history ten years back, or reword "smaller than the board's comparators" |
| `payroll-share` (choice freeze) | "Hold salaries for a year" | eventCatalogue.ts:957: Salaries are recomputed every week (facultySystem.ts:44) and never held; the saving is a lump sum cash +400,000, and the payroll share that fired the event is unchanged | Relabel "Defer this year's raises (one-off saving)" |
| `one-teacher` (choice cover) | "Cover it with visiting lecturers" | eventCatalogue.ts:1018: No instructor is added to any course (cash -70,000, incoming quality -1) | Relabel "Pay for outside cover" |
| `the-boiler` (choice replace) | "Replace the boiler" | eventCatalogue.ts:1033: Nothing records the new boiler: after the 8-year cooldown the event can fire again about the boiler "installed in the college's first decade" (catalogueEngine.ts:38-41) | Suppress the event after "replace", or cooldownYears: 99 |
| `the-boiler` (choice nurse) | "Nurse it through the winter" | eventCatalogue.ts:1034: The winter gate (winterAtLeast 0.5) passes only in weeks 48-51 and 1-4 (catalogue.ts:76-79), which the status bar calls the last weeks of the Spring Term and the first of the Fall Term (StatusHeader.tsx:72-74); week 52 is the summer | Center winterDepth on the Fall Term's midwinter (about week 17) |
| `the-ice-walk` (text) | "froze overnight into a single continuous sheet" | eventCatalogue.ts:1047: Winter gate passes only in weeks 49-51 and 1-3 (catalogue.ts:76-79): the end of the Spring Term and the start of the Fall Term (StatusHeader.tsx:72-74); British "the first year" for the freshmen | Fix winterDepth as above |
| `the-ice-walk` (telling 2) | "The path ... iced over in the night" | eventVariants.ts:127: Same season mismatch as the text | As for the text |
| `the-ice-walk` (telling 3) | "The main walk froze solid overnight" | eventVariants.ts:128: Same season mismatch as the text; British "first-years" | As for the text |
| `the-heating-bill` (telling 3) | "The gas bill for the winter's first cold month" | eventVariants.ts:132: Same gate: it arrives at the end of the Spring Term or the start of the Fall Term | As for the text |
| `the-snow-day` (text) | "It snowed eleven inches overnight" | eventCatalogue.ts:1078: Never fires: winterAtLeast 0.9 passes only in week 52 (catalogue.ts:76-79), which is always the summer, when the catalogue does not tick (admissionsSystem.ts:421, eventSystem.ts:288-289); the snow is timed to the summer break | Fix winterDepth (and then the 0.9 threshold) |
| `the-snow-day` (telling 2) | "Eleven inches of snow fell overnight" | eventVariants.ts:135: Same as the text (never fires) | As for the text |
| `the-snow-day` (telling 3) | "Snow, a foot of it, on a teaching day" | eventVariants.ts:136: Same as the text (never fires) | As for the text |
| `the-snow-load` (text) | "The snow on the flat roofs is now deep enough" | eventCatalogue.ts:1108: Winter gate (0.8) passes only in weeks 51 and 1 (catalogue.ts:76-79): the week before the summer and the first week of the Fall Term | Fix winterDepth |
| `the-freeze` (text) | "The coldest night in forty years came on the Sunday before term" | eventCatalogue.ts:1124: Never fires: winterAtLeast 0.9 passes only in week 52, the summer (catalogue.ts:76-79, admissionsSystem.ts:421); the "coldest night" is timed to late summer. British "on the Sunday", "trolley" | Fix winterDepth |
| `the-championship-run` (text) | "The {sport} team has won the title, and the campus has not slept since" | eventCatalogue.ts:1140: The gate is any title ever (titlesAtLeast 1, catalogue.ts:136) on a 2-year cooldown, so it can fire years after the last title, every other year | Gate on a title this season (studentLifeData's inTitleYear) |
| `the-championship-run` (telling 2) | "The {sport} team are champions, and the campus has not gone to bed" | eventVariants.ts:139: Same as the text | As for the text |
| `the-championship-run` (telling 3) | "The {sport} team has won the title, and the celebration is into its third day" | eventVariants.ts:140: Same as the text | As for the text |
| `the-rankings-slip` (telling 3) | "The college has slipped in the guide" | eventVariants.ts:148: The gate is a rank of 20th or worse (rankAtLeast 20; rivalsSystem.ts:313-315), not a fall: a rising college qualifies | Compare with last year's rank, or reword "sits low in the guide" |
| `the-all-nighter` (telling 2) | "The library was full at 4 a.m." | eventVariants.ts:155: No needs: ['library'] gate (unlike the-closing-bell), so it can fire at a college without a library | needs: ['library'] |
| `the-grant-windfall` (text) | "funded a center proposal from {faculty} ... where the center will be housed" | eventCatalogue.ts:1221: No center or research initiative is created and nothing is housed (research runs as initiatives in labs, researchSystem.ts:13); "Find the center a home" is cash +200,000 once; {faculty} is any roster member (catalogue.ts:208), whatever their research | Start an initiative in a lab, or relabel "Take the overhead"; pick a research-strong {faculty} |
| `the-grant-windfall` (telling 2) | "A foundation has funded {faculty}'s proposal for a center" | eventVariants.ts:159: Same as the text | As for the text |
| `the-grant-windfall` (telling 3) | "{faculty} will direct a new center, funded for five years" | eventVariants.ts:160: Same as the text, and nothing runs for five years | As for the text |
| `the-car-park` (choice second) | "Lay out a second car park" | eventCatalogue.ts:1256: No car park appears on the map (there is no parking buildable); the 11 trees felled are the first in the tree list, wherever they stand (woodland.ts:15-17), and the event can recur with the same shortage | Relabel "Lease overflow parking" and drop the trees, or add a buildable lot |
| `the-burst-pipe` (text) | "A pipe above the second floor of {building} burst on the Saturday" | eventCatalogue.ts:1269: {building} is any roofed building (catalogue.ts:210) and takes no damage; repairs are estate-wide (catalogue.ts:260-270); winter gate passes only at the end of the Spring Term / start of the Fall Term (catalogue.ts:76-79) | Target the named building's backlog; fix winterDepth |
| `the-burst-pipe` (telling 2) | "A pipe above the second floor of {building} burst on Saturday night" | eventVariants.ts:167: Same as the text | As for the text |
| `the-burst-pipe` (telling 3) | "Water came through the ceiling of {building} all weekend" | eventVariants.ts:168: Same as the text | As for the text |
| `the-master-key` (choice cards) | "Move the whole campus to key cards" | eventCatalogue.ts:1304: Nothing records the key cards, so the lost-master-key event can recur in 6 years; the effect also books backlog -80,000 of "repairs done" for a lock change | Suppress after "cards"; drop the backlog term |
| `the-buckets` (text) | "Rain has been getting into {building}" | eventCatalogue.ts:1316: {building} is any roofed building (catalogue.ts:210), not one below the 0.75 condition that fired the event; repairs/deferrals are estate-wide (catalogue.ts:260-270) | Name the lowest-condition building and target its backlog |
| `the-buckets` (telling 2) | "There are now nine buckets in the top corridor of {building}" | eventVariants.ts:171: Same as the text | As for the text |
| `the-buckets` (telling 3) | "The top floor of {building} leaks along the gutter line" | eventVariants.ts:172: Same as the text | As for the text |
| `the-lift` (text) | "The lift in {building} has stopped between floors for the fourth time" | eventCatalogue.ts:1332: {building} is any roofed building (catalogue.ts:210), not the worn one; "Replace the lift" spreads backlog -150,000 over the estate (catalogue.ts:260-270); British "lift" | Name the worn building and target it; "elevator" |
| `the-lift` (telling 2) | "The lift in {building} has stuck between floors again" | eventVariants.ts:175: Same as the text | As for the text |
| `the-lift` (telling 3) | "The lift in {building} failed once more" | eventVariants.ts:176: Same as the text | As for the text |
| `the-listing` (text) | "would like to list {building} as a building of special interest" | eventCatalogue.ts:1347: {building} is any roofed building (catalogue.ts:210), possibly new; the gate is the oldest building over 20 years, short of the game's own 25-year rule for historic status (estate.ts:112-123) | Draw {building} from buildings eligible for Declare historic |
| `the-writing-requirement` (choice require) | "Require the writing course" | eventCatalogue.ts:1415: Nothing records the requirement: the event can recur in 6 years with the committee still debating it | Suppress the event after "require" |
| `the-grade-medians` (choice publish) | "Print the median beside every grade" | eventCatalogue.ts:1431: Not recorded: the event can recur in 8 years ("risen for the ninth year running") | Suppress after "publish" |
| `the-lab-inspection` (text) | "gives the college twenty-eight days" | eventCatalogue.ts:1445: No deadline exists: nothing checks the list after 28 days, including under the default "worst", which leaves the fridge and the rest | Drop the deadline, or add a follow-up |
| `the-lab-inspection` (telling 2) | "The report allows twenty-eight days" | eventVariants.ts:183: Same as the text | As for the text |
| `the-lab-inspection` (telling 3) | "gives the college four weeks" | eventVariants.ts:184: Same as the text | As for the text |
| `the-closing-bell` (choice open) | "Open the library all night in exams" | eventCatalogue.ts:1482: Not recorded: the event can recur in 4 years with the library closing at midnight | Suppress after "open" |
| `the-honorary-degree` (choice defer) | "Defer the nomination a year" | eventCatalogue.ts:1660: Nothing brings the nomination back next year (8-year cooldown) | Relabel "Let the nomination lapse" |
| `the-matching-challenge` (choice announce) | "Announce the challenge and campaign for it" | eventCatalogue.ts:1691: The fifth-of-alumni condition is never tested: the full gift always arrives, whatever the alumni's size or warmth | Scale the result by alumni warmth/participation |
| `the-dormant-account` (choice controller) | "Hire a controller to find the others" | eventCatalogue.ts:1740: No others are ever found: cash -90,000, confidence +3 once | Relabel "Hire a controller to tidy the accounts" |
| `the-pension-valuation` (text) | "it says the gap will grow if nothing is done" | eventCatalogue.ts:1751: There is no pension liability: nothing grows, and "Wait for the next valuation" costs only confidence -2, satisfaction -1 | Drop the warning, or add a follow-up that grows |
| `the-land-offer` (choice lease) | "Lease it for twenty years" | eventCatalogue.ts:1787: A one-off cash +300,000 and trees -8; no rent in later years, and the land neither leaves nor returns | Relabel "Sell a twenty-year lease up front" |
| `the-trustee-bid` (choice award) | "Award it to the lowest bid" | eventCatalogue.ts:1818: Awarding a roofing contract brings cash +120,000, and no roof work follows under either answer (no backlog change) | Give both answers a backlog reduction and make "award" cost less rather than pay |
| `the-term-limits` (choice adopt) | "Adopt term limits" | eventCatalogue.ts:1881: Not recorded: the event can recur in 8 years about the same long-serving trustee | Suppress after "adopt" |
| `the-rankings-survey` (choice brochure) | "Send every president a glossy brochure first" | eventCatalogue.ts:1897: No reputation or rank effect: only confidence +2 (there is no reputation effect key) | Relabel, or add a small reputation effect |
| `the-booster-club` (choice accept) | "Accept the gift and the seat" | eventCatalogue.ts:1930: The seat does nothing: coaches are still hired by the player (Coach, types.ts:715-741; athleticDirector, types.ts:847-850); the gift "for the {sport} program" is unrestricted cash +300,000, not athletics budget | Say the seat is advisory; route the gift to athletics |
| `the-flood` (choice defend) | "Build the flood defenses" | eventCatalogue.ts:1947: No defenses exist afterward (nothing on the map or in state), and the flood can recur after 20 years | Suppress the event after "defend" |
| `the-flood` (choice upstairs) | "Move teaching off the ground floors" | eventCatalogue.ts:1949: No capacity or rooms change; one-off cash -400,000, backlog +1,500,000, satisfaction -4, incoming quality -1 | Relabel "Move ground-floor teaching for a term" |
| `the-essay-ring` (choice rescind) | "Rescind the degrees and fail the rest" | eventCatalogue.ts:1981: enrollment -40 scales with the whole student body (catalogue.ts:279): above about 7,000 enrolled it removes more freshmen than the 140 names on the list, and only freshmen; rescinded graduates stay in the alumni count | Cap the loss at the list, spread it over all years |
| `the-grant-cut` (choice current) | "Replace them for students already enrolled" | eventCatalogue.ts:1999: The -25 enrollment (the future students who lose grants) is taken from the current freshmen (catalogue.ts:272-293), the very students this answer protects | Apply it to next year's intake, or drop it |
| `the-harrowgate-pledge` (choice contest) | "Contest the administrators' claim" | eventCatalogue.ts:2016: The claim never resolves; cash -500,000 once | Add an outcome, or relabel "Pay counsel to see them off" |
| `the-prospectus-case` (choice defend) | "Defend the case" | eventCatalogue.ts:2033: The suit never resolves ("would probably win, eventually"): no verdict or later cost follows (the default) | Add a verdict event, or relabel "Defend it (a year of costs)" |
| `the-kitchen-strike` (text) | "The precedent it sets for every other line of the payroll is not" | eventCatalogue.ts:2047: No precedent is tracked: meeting the claim changes no salary, and faculty pay is untouched (facultySystem.ts:44) | Cut the warning, or add a later pay claim after "meet" |
| `the-sinkhole` (text) | "A hole thirty-six feet across opened overnight beside {building} ... kept empty" | eventCatalogue.ts:2081: No hole, lost path or cordon appears (pathways are real tiles, reducer.ts:264-275), and {building} (any roofed building, catalogue.ts:210) is never emptied | Remove a few path tiles and block the site, or reword |
| `the-sinkhole` (choice fill) | "Fill this one and watch the others" | eventCatalogue.ts:2085: Nothing watches the others: no second sinkhole follows from this answer (the default) | Drop "and watch the others" |
| `the-sinkhole` (choice fence) | "Fence off the marked ground" | eventCatalogue.ts:2086: No ground is fenced or made unbuildable; backlog +1,000,000 spreads over the estate | Relabel "Fence and defer the survey" |
| `the-merger-proposal` (choice share) | "Open talks on shared services" | eventCatalogue.ts:2119: Talks never conclude and nothing is shared; their notional savings arrive at once as cash +1,800,000 | Relabel "Agree shared services" (and spread the saving) |
| `the-merger-proposal` (choice merge) | "Enter merger negotiations" | eventCatalogue.ts:2120: Negotiations never resolve: {rival} stays a rival and nothing merges, yet the college receives cash +2,500,000 for entering them | Add an outcome, or relabel |
| `what-happened` (text) | "under the headline 'What Happened?'" | eventCatalogue.ts:2237: The gate is a low reputation (reputationUnder 40), not a decline: it can fire from year 3 at a college that was never higher | Gate on a reputation drop (history), or reword |
| `talk-at-the-gate` (text) | "a place that used to be something ... by the spring meeting" | eventCatalogue.ts:2284: The gate is a low reputation (reputationUnder 30), not a decline, and nothing checks the plan at a spring meeting | Gate on a drop; drop the deadline |
| `talk-at-the-gate` (choice teaching) | "Spend on the teaching" | eventCatalogue.ts:2287: Teaching is untouched: the lever is incoming quality +3 (catalogue.ts:327), which raises the academic standard (satisfactionSystem.ts:117-120) and is overwritten next summer (resolveAdmissions.ts:156) | Add a teaching lever, or relabel "Spend on recruiting stronger students" |
| `second-generation` (choice legacy) | "Give alumni children a preference" | eventCatalogue.ts:2318: No preference exists (no legacy cohort, cohorts.ts:17-26) and nothing records the policy; the event can recur in 10 years | Record the policy and suppress, or relabel "This year only" |
| `heritage-listing` (text) | "which would protect it from demolition and from the college" | eventCatalogue.ts:2362: Founders Hall can never be demolished anyway (demolition.ts:79) | Drop "from demolition" |
| `who-comes-next` (choice deputy) | "Appoint a deputy to groom" | eventCatalogue.ts:2380: No deputy or successor appears (the President never changes), at no cost: confidence +3 only | Relabel "Name a deputy in private" |
| `old-rival-proposal` (choice degree) | "Agree the joint degree" | eventCatalogue.ts:2411: No joint degree or program appears and nothing is shared with {rival}; incoming quality +2 now | Relabel, or add a program |

### Patterns

**1. Choices whose effects contradict their label.**
- **Money flows backwards:**
  - `recession` "Cut this year's spending" *costs* cash −1,500,000.
  - `the-championship-run` "Let the boosters pay for the scoreboard" and `the-reunion-gift` "Install the clock as given" *pay the college* +400,000 and +250,000, and nothing is bought.
  - `the-trustee-bid` "Award it to the lowest bid" earns +120,000.
  - `the-merger-proposal` pays +2,500,000 for merely entering negotiations.
  - `anonymous-gift` "Put it into the buildings" pays the gift twice: cash plus the same sum in free repairs.
- **Costs that are free:**
  - `newspaper` "Fund it".
  - `the-pension-valuation` "Raise contributions over time".
  - `the-board-secretary` "Appoint a full-time successor".
  - `the-history` "Hire an archivist".
  - `who-comes-next` "Appoint a deputy".
  - `founding-faculty-last` "Endow a chair" is the reverse: cash −300,000 that never reaches the endowment, while `the-last-lecture` "Endow a prize" does move its money into the endowment.
- **Labels that name a lever the effect does not touch:**
  - "Cut the draw" and "Stop drawing" leave the draw-rate setting alone (`treasury.ts:15-17`).
  - "Hold salaries" leaves salaries alone (`facultySystem.ts:44`).
  - "Spend on the teaching" and "Fund a teaching program" move incoming quality, not teaching.
  - "Fell and replant" renders as "25 trees felled".
  - "Move the whole campus to key cards" books $80,000 of repairs.

**2. The game has the system, but the event does not use it.** The worst false claims promise something the game already models elsewhere.
- **Hires and departures.** "Fill the post", "Hire, whatever it costs" and "Fund a teaching line" hire no one; the roster only grows through `appointFaculty`. "Deny, with a year to find something" and "Require a return or a resignation" remove no one, though `departs` exists. The retirement stories (`the-last-lecture`, `founding-faculty-last`) retire nobody, while the game runs real retirements with a year's notice (`facultySystem.ts:119-139`).
- **Programs.** "Teach out … and close it" (the default in `program-thin`) and "Open something, anything" cannot happen. No effect opens a program, and nothing in the game can close one: programs only relocate (`techSystem.ts:482-495`), and a hall with programs cannot be demolished (`demolition.ts:83`).
- **Historic status.** "Support the listing" and "Welcome the listing" do not call Declare historic (`estate.ts:112-123`), which already carries listing-like rules: ivy, a little prestige, a quarter more upkeep, and no demolition.
- **Promises.** "Promise a rise within five years" makes no promise in the game's promise system (`promises.ts`).
- **Campaigns.** "Run a capital campaign" runs no campaign in `campaigns.ts`.
- **Restricted money.** Gifts "for a building" land as free cash, though the game keeps a restricted building fund (`types.ts:988`).
- **Mascot.** "Adopt the heron" leaves the mascot unset (`s.self.mascot`), so the game later asks for a team name anyway.
- **Map objects.** "Accept the gift and the statue" and "Pave the line they walk" place nothing, though statues and paths are real map objects (`facilitiesData.ts:480`, `reducer.ts:264-275`).
- **Named funds.** The scholarship fund, named scholarship, bursaries, named prize and endowed chair are all just the general endowment, or nothing.

**3. Stakes that read bigger than the effects.**
- **Seismic letters describe losses the game never applies.** `fire`: "What is lost is the east end", but nothing is lost. `storm`: the limes, but no tree falls. `recession`: the endowment "is worth materially less", but only if you ride it out. `the-sinkhole`: no hole on the map. `the-harrowgate-pledge`: a building with his name on it that does not exist.
- **Threats and deadlines that nothing enforces:**
  - `scandal`: "the two weeks arrives anyway, later".
  - `the-pension-valuation`: "the gap will grow".
  - `the-kitchen-strike`: "the precedent … for every other line of the payroll".
  - `accreditation-visit`: a visit that never comes.
  - `the-lab-inspection`: a 28-day deadline.
  - `talk-at-the-gate`: "by the spring meeting".
  - `auditors`: "review it next year"; `the-honorary-degree`: "defer a year".
  - `the-prospectus-case`, `the-harrowgate-pledge` and `the-merger-proposal`: a lawsuit, a claim and negotiations that never resolve.
- **Weak levers under strong words.** Board confidence has almost no mechanical consequence: it only gates six events and one promise goal. Satisfaction changes fade in weeks. "Incoming quality" is reset every summer. Warmth is the one lever that lasts, which is why `the-records` ("will be remembered longer than the breach") is true.
- **Choices are not remembered, so decisions can be undone by recurrence.**
  - A replaced boiler returns as the boiler "installed in the college's first decade".
  - A required writing course is debated again.
  - The median is printed and then "has risen for the ninth year" again.
  - A library opened all night "closes at midnight" again.
  - The strip that was sold can be offered for again.
  - Key cards are followed by a lost master key.
  - Term limits are adopted, and then the trustee of twenty-six years returns.
  - The board seat is granted and then asked for again.
  - `guidebook` appears "for the first time" up to three times a game (seen in the simulated runs).

**4. Placeholders that point at the wrong thing.**
- **`{building}`** is any roofed building (`catalogue.ts:210`), whatever made the event fire. In the simulated runs, the derelict-building letter named buildings at condition 0.94 and 0.74 while the derelict one sat at 0.00. The boiler, pipe, lift, ivy, listing and sinkhole letters named buildings at condition 0.98-1.00.
- **`{faculty}`** is any roster member (`catalogue.ts:208`). It is "on sabbatical" or "took leave" (the game has neither), "the best appointment in years", or the star lecturer, whatever the stats on the Faculty tab.
- **`{class}`** is always the class that graduated last summer (`catalogue.ts:207`). It raises a "reunion gift" that the game's every-fifth-year reunions (`giving.ts:55-59`) do not allow. It produces a graduate "of the college's publicity for a generation" a year out, and an alumna leaving a bequest at about 22.
- **Named administrators.** "The Facilities Director", "the Dean of Students", "the Dean" and "the Provost" are real, named seats (`seatData.ts`) that may be empty. `the-boiler` also gives the Facilities Director a "he" the seat holder may not match.
- **Names that collide.** The Harrowgate family shares its name with the top rival, Harrowgate University (`rivalData.ts:153`). The heron is already Bellhaven College's mascot (`rivalData.ts:149`).

**5. Conditions that contradict the words, and dead events.**
- **The winter model is off by half a year.** It centers winter on week 52/1 (`catalogue.ts:74-79`; the same function drives the ambience in `audio/director.ts:35-41`). In this game, week 52 is the summer (`admissionsSystem.ts:421`; the opening letter "Summer is coming" says "At week 52 the clock stops for the summer", `eventData.ts:1188`), and weeks 1-26 are labeled "Fall Term" (`StatusHeader.tsx:72-74`). So snow, ice, burst pipes and "the heating bill for December" arrive in the last four weeks of the Spring Term or the first four of the Fall Term. Every simulated firing fell in those weeks.
- **Three winter events can never fire.** `the-snow-day`, `the-freeze` and `the-dark-term` need a depth of 0.9 or more, which only week 52 reaches, and the catalogue never ticks during the summer interrupt (`eventSystem.ts:288-289`).
- **Two more events are dead for other reasons.** `nothing-to-study` cannot fire, because every college houses the three founding programs forever. `bad-run` fires only at satisfaction 4 or less out of 100: a v2 mood scale, like `rag-week`'s `moodOver: 0`, which is always true.
- **Ages that are impossible at the gated year.** `emeritus-office` (from year 18) and `the-last-lecture` (from year 15) describe retirements, but no one can retire before about year 26: careers are 25-40 years, and any founder still on the roster retires in years 30-31 in every game, because their career lengths are hashed from fixed ids. `founding-faculty-last` (from year 38) therefore always describes a founder who has already gone. `the-board-secretary` (31 years of service, from year 20) and `the-term-limits` (26 years, from year 14) have the same problem. The board secretary also retires again every 8 years.
- **A level where the text describes a fall.** `what-happened` (it fired in year 3 in one run), `talk-at-the-gate` and "The college has slipped in the guide" gate on a low number, not a decline. `the-championship-run` gates on any title ever and repeats every two years.
- **Missing needs gates.** `bell-tower` does not require a bell tower, `the-all-nighter` does not require a library, and `parking-study` gets a 33-vote Senate from year 3.
- **Coverage.** In three simulated fifty-year runs, 45 of the 154 events never fired at all, including these five dead ones.

**6. The rendered effect line.** It is honest about which lever moves, with these exceptions:
- "repays $X of debt" shows even when the college owes less (`bequest` "Clear the debt", where the rest vanishes).
- "$X of repairs done" shows even when the estate has less backlog than that.
- "endowment −$X · brings $X" (`overdraft` "Draw on the endowment") pays out the cash even when the endowment is smaller, because it floors at 0.
- "±N freshmen" lands on the class already enrolled, so "Buy the larger entry next year", "Replace them for students already enrolled" and every recruiting answer move this year's freshmen.
- It reads "+1 freshmen" at N = 1 (`EventPanel.tsx:43`).
- "Incoming quality" appears under 54 choices, most of them not about the incoming class: tenure, snow days, library books, a writing course, closing the labs.

**7. Tone: British idioms and spellings.** The voice is dry, understated and consistent across tellings, and the spelling is mostly American (color, theater, center, canceled, apologize, neighbors, counselors). But the institution and the vocabulary are Oxbridge.
- **Spellings:** "grey" (`derelict-notice` t2, `bad-run` t3) should be "gray"; "labelled" (`boiler-condemned` t2) should be "labeled"; "Mr Harrowgate" should be "Mr. Harrowgate".
- **Estate and staff:**
  - "car park" (`roof-goes` t3, `the-car-park` ×4) → "parking lot".
  - "lift" (`the-lift` ×4) → "elevator".
  - "torch" (`the-closing-bell`) → "flashlight".
  - "queue" (`roof-slates` t2, `the-laundry` t3) → "line".
  - "rota" (`sit-in` t2, `protest-era`, `the-laundry` ×3) → "schedule" or "sign-up sheet".
  - "porters", "porters' lodge" and "night porter" (14 places) → "custodians", "security desk", "night guard".
  - "plant room" → "boiler room".
  - "trolley" → "cart"; "common room" → "lounge".
  - "gritting crew" → "salting crew"; "hoarding" → "construction fence".
  - "Make it good now" → "Fix it properly now"; "Tarpaulin" → "Tarp".
  - "Reslate the elevation" and "repoint" → "re-roof that side" and "tuckpoint".
  - "Clerk of Works" → "project manager"; "the Clerk" → "the secretary".
  - "listing", "listed" and "heritage officer" → "landmark designation" and "historic preservation officer".
- **Students and academics:**
  - "Rag Week" → "charity week"; "caravan" → "camper".
  - "students' union" (×4) → "student government".
  - "resit" (×2) → "retake".
  - "the Proctor" → "the Dean of Students"; "external examiner" → "outside reader".
  - "dissertations" (undergraduate) → "senior theses"; "Academic Registrar" and "the Registry" → "the Registrar".
  - "a flat off campus" → "an apartment".
  - "the first year" and "first-years" → "the freshmen"; "second-year" → "sophomore".
  - "halls of residence" → "residence halls".
  - "the autumn break" and "since the autumn" → "fall break" and "since the fall".
  - "prospectus" (×7) → "viewbook" or "catalog"; "the fee" → "tuition"; "bursaries" → "scholarships".
  - "timetable" (×9) → "schedule".
- **Money and law:**
  - "the Bursar" as the college's finance officer (13 places) → "the CFO" or "the VP for Finance". An American bursar's office handles student bills, not the budget.
  - "solicitor(s)" → "lawyer(s)".
  - "overdraft … facility" → "line of credit"; "excess" → "deductible"; "loss adjuster" → "claims adjuster".
  - "gone into administration" and "administrators" → "filed for bankruptcy" and "the bankruptcy trustee".
- **Idiom:**
  - "got round to" → "gotten around to"; "going round" → "going around".
  - "rung" and "ringing" the college → "called" and "calling"; "the post" → "the mail".
  - "minuted" → "on the record".
  - "the brigade" → "the fire department".
  - "takeaways" and "tea from a flask" → "takeout places" and "coffee from a thermos".
  - "on the Tuesday night", "on the Monday" and the like (`storm`, `recession`, `the-freeze`, `the-burst-pipe`, `the-flood`) → drop the "the".
- **Code only (not displayed):** the id `counsellors-tour`, the NeedKey `arts-centre`, the field `favours`.
