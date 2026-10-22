# The string table (data)

Area 2 of the third review, commit `b1f2114`, from the repaired `npm run review:strings` (see the area file's Tools). The full rows (`strings.json`, `strings.csv`) are working files, not committed.

Written by `npm run review:strings` (`tools/review/strings.ts`). 8,472 player-facing strings, 59,103 words, from 198 files. Every row is in `strings.json` and `strings.csv`.

## Per screen

Words a screen can put in front of a player (every string it could show, not what one visit shows).

| Screen | Strings | Words | Longest | Median words |
|---|---|---|---|---|
| Events (catalogue) | 722 | 14,276 | 143 | 7 |
| Course descriptions | 473 | 8,897 | 31 | 19 |
| Objectives (chapters, briefings, the Guide) | 250 | 2,567 | 68 | 6 |
| Events (decision) and letters | 172 | 2,267 | 115 | 7 |
| Promises | 138 | 2,109 | 54 | 12 |
| Specialization programs | 131 | 1,982 | 96 | 8 |
| Research | 643 | 1,967 | 15 | 2 |
| Names (people, rivals, mascots) | 1645 | 1,779 | 4 | 1 |
| Faculty tab | 362 | 1,590 | 102 | 2 |
| Curriculum names and gates | 521 | 1,366 | 19 | 2 |
| Athletics tab | 143 | 1,190 | 233 | 2 |
| Treasury tab | 176 | 1,187 | 97 | 2 |
| Faculty (bios, quirks, log) | 196 | 992 | 18 | 3 |
| History tab | 156 | 961 | 99 | 2 |
| Building names and blurbs | 70 | 930 | 41 | 13 |
| Specialization (choice and notice) | 80 | 886 | 116 | 7 |
| Ladder and milestone letters | 68 | 816 | 50 | 8 |
| Curriculum tab | 160 | 784 | 168 | 2 |
| Modals (summer, events, letters) | 179 | 717 | 55 | 3 |
| Build menu | 129 | 669 | 213 | 2 |
| Help hints | 52 | 575 | 31 | 10 |
| Campus map | 72 | 555 | 300 | 3 |
| Founders Hall offices | 99 | 534 | 26 | 4 |
| Students tab | 91 | 516 | 62 | 3 |
| Building panel | 153 | 511 | 30 | 2 |
| Final Report | 70 | 482 | 40 | 4 |
| Alumni and campaigns | 45 | 479 | 38 | 7 |
| Chronicle | 104 | 471 | 16 | 3 |
| Inbox | 127 | 435 | 31 | 2 |
| Standing (History tab) | 64 | 415 | 21 | 5 |
| State (log lines) | 77 | 413 | 19 | 5 |
| Board letters | 18 | 410 | 77 | 4 |
| Administration | 46 | 406 | 51 | 5 |
| Next-step line | 63 | 394 | 14 | 6 |
| Identity tags | 32 | 331 | 17 | 10 |
| Settings | 94 | 316 | 20 | 2 |
| Student life and athletics | 47 | 261 | 26 | 3 |
| Other | 95 | 258 | 11 | 2 |
| Student demands | 24 | 252 | 41 | 5 |
| Summer review | 55 | 251 | 36 | 4 |
| Research tab | 69 | 243 | 83 | 2 |
| Log | 30 | 240 | 16 | 7 |
| Menu | 46 | 236 | 21 | 3 |
| Admissions page (summer) | 67 | 220 | 12 | 3 |
| Opening walkthrough | 26 | 210 | 35 | 6 |
| Admissions | 47 | 204 | 16 | 3 |
| Speed-ups (letters) | 21 | 191 | 24 | 6 |
| Title screen | 37 | 184 | 24 | 3 |
| Dock and toolbar | 72 | 181 | 10 | 2 |
| Curriculum (log, gates) | 34 | 161 | 13 | 4 |
| Engine (log lines) | 24 | 160 | 20 | 5 |
| Founding screen | 26 | 143 | 16 | 3 |
| Debug panel (developer only) | 47 | 96 | 11 | 1 |
| Audio (not read) | 22 | 89 | 15 | 3 |
| Crash screen | 8 | 81 | 31 | 4 |
| Credits | 14 | 81 | 29 | 2 |
| Satisfaction | 12 | 54 | 11 | 4 |
| Founding notes | 2 | 50 | 46 | 4 |
| Rivals and rankings | 16 | 50 | 16 | 1 |
| Estate | 3 | 17 | 6 | 6 |
| Money (log, letters, Treasury) | 7 | 15 | 8 | 1 |

## Per file (top 30 by words)

| File | Strings | Words |
|---|---|---|
| `src/data/eventCatalogue.ts` | 593 | 10,224 |
| `src/data/courseDescriptions.ts` | 473 | 8,897 |
| `src/data/eventVariants.ts` | 116 | 4,004 |
| `src/data/chapterData.ts` | 249 | 2,566 |
| `src/data/eventData.ts` | 168 | 2,230 |
| `src/data/promiseData.ts` | 123 | 2,061 |
| `src/data/researchTopics.ts` | 577 | 1,662 |
| `src/data/facultyData.ts` | 1477 | 1,653 |
| `src/data/techData.ts` | 521 | 1,366 |
| `src/tabs/AthleticsTab.tsx` | 143 | 1,190 |
| `src/data/specializationData.ts` | 80 | 886 |
| `src/data/ladderData.ts` | 67 | 814 |
| `src/tabs/FacultyTab.tsx` | 154 | 801 |
| `src/tabs/CurriculumTab.tsx` | 160 | 784 |
| `src/data/downtownData.ts` | 51 | 707 |
| `src/tabs/TreasuryTab.tsx` | 88 | 652 |
| `src/data/quirkData.ts` | 80 | 635 |
| `src/components/BuildPopup.tsx` | 110 | 575 |
| `src/data/figureHints.ts` | 50 | 570 |
| `src/components/InterruptModal.tsx` | 141 | 559 |
| `src/components/CampusMap.tsx` | 61 | 537 |
| `src/components/BuildingInfoPanel.tsx` | 153 | 511 |
| `src/data/researchParkData.ts` | 29 | 502 |
| `src/data/athleticsComplexData.ts` | 22 | 475 |
| `src/data/reportData.ts` | 54 | 447 |
| `src/data/chronicleData.ts` | 88 | 444 |
| `src/data/boardData.ts` | 18 | 410 |
| `src/data/facilitiesData.ts` | 33 | 401 |
| `src/tabs/StudentLifeTab.tsx` | 64 | 391 |
| `src/data/campaignData.ts` | 25 | 376 |

## The longest strings (top 25)

- **300 words**, Campus map, `src/components/CampusMap.tsx:2733`: Where the college physically grows. Pick a building from the build menu (the toolbar's Build button) and place it here: the cost is charged at once, and it goes up where it is put. Press R, or click the ⟳ on the ghost, t…
- **233 words**, Athletics tab, `src/tabs/AthleticsTab.tsx:250`: A sport club (see the Students tab) can petition to go varsity: a program budget and a shared competition venue for its sport's category. Coaching staff is hired separately, from the one market below — every team wants a…
- **213 words**, Build menu, `src/components/BuildPopup.tsx:859`: Every building the college can have, grouped into categories along the top — pick a category to see its buildings as a row of tiles. A red exclamation mark on a category means something new to build there, a building the…
- **189 words**, Athletics tab, `src/tabs/AthleticsTab.tsx:664`: Drag a program up or down. The first {pot.cap} are the flagships {pot.cap > pot.baseCap ? } — the line shows where they end. A flagship takes its sport's whole cost to compete from the department's fund and may carry a s…
- **168 words**, Curriculum tab, `src/tabs/CurriculumTab.tsx:1366`: One line per program, grouped by school — a school is named once six of its programs share a hall; the graduate programs follow, in the Graduate School and the Business, Law and Medical Schools. Each line gives the progr…
- **156 words**, Athletics tab, `src/tabs/AthleticsTab.tsx:175`: One pool for the whole department, not a separate list per post. A head or assistant coach is qualified for exactly one sport, so their listing can only answer that sport's team; a trainer's discipline is strength &amp; …
- **143 words**, Events (catalogue), `src/data/eventCatalogue.ts:876`: Eleanor Whitfield left {school} almost everything, which is a great deal more than anyone expected, and a letter of three sentences explaining why. She graduated in a year the college would rather not dwell on, was taugh…
- **142 words**, Events (catalogue), `src/data/eventCatalogue.ts:842`: The fire began in a service riser in {building} at some time after two in the morning and was out by six. Nobody was in the building. The night guard, who was, walked the whole of the upper floor before the fire departme…
- **138 words**, Events (catalogue), `src/data/eventCatalogue.ts:859`: The irregularity in the business office accounts is eleven years old, amounts to a good deal more than was first thought, and was found by a temporary clerk checking something else. The person responsible retired four ye…
- **131 words**, Events (catalogue), `src/data/eventCatalogue.ts:893`: The administration building has been occupied since Thursday. It is orderly: there is a sign-up sheet, the mail is being passed through, and somebody has been watering the plants in the outer office. The demands run to t…
- **117 words**, Events (catalogue), `src/data/eventCatalogue.ts:2009`: The first cases came in the week after fall break, and by the end of the month a quarter of the college had been sick at once. The public health office has not ordered anything, and has said so in a letter that reads ver…
- **117 words**, Events (catalogue), `src/data/eventCatalogue.ts:2148`: The most famous graduate of the {class}, and of the college's publicity for a generation, has been convicted of a fraud large enough to have its own documentary in preparation. His name is on the annual prize for leaders…
- **116 words**, Specialization (choice and notice), `src/data/specializationData.ts:363`: The college has come within reach of the guide's top {milestone}, or, from Year {pillarYear}, of the top {pillarRank} in one of the four pillars' standings. At the close of the first summer it stands in either, the board…
- **115 words**, Events (catalogue), `src/data/eventCatalogue.ts:2095`: The dining hall staff walked out at six on Monday morning, forty-two of them, after the third year running in which their pay was held and the faculty's was not. They are outside the service entrance with a brazier and a…
- **115 words**, Events (decision) and letters, `src/data/eventData.ts:1225`: {elm} stands, with six program slots. Founders Hall is where the college began; its schools grow in the halls it builds. Three programs of one school in a hall make it that school's: from then it offers that school's pro…
- **108 words**, Events (catalogue), `src/data/eventCatalogue.ts:1987`: The river came over the east meadow on Thursday and did not stop at the path, which the planning documents had assured everyone it would. By Saturday there was water to the second step of {building} and a canoe tied to t…
- **104 words**, Events (catalogue), `src/data/eventCatalogue.ts:2130`: A hole thirty-six feet across opened overnight beside {building}, taking with it a bench, a length of path and a sundial that a founding benefactor gave and nobody could read. The geologists say the ground beneath the ol…
- **102 words**, Events (catalogue), `src/data/eventCatalogue.ts:2026`: An outside reader in {program} noticed that four senior theses shared a bibliography, down to the same misspelled author. The inquiry that followed has found a paid essay service run from an apartment off campus, a custo…
- **102 words**, Faculty tab, `src/tabs/FacultyTab.tsx:498`: Every professor and every candidate as a tile: teaching and research as numbers out of 100, the scale courses are graded on, with where each is heading. A candidate's teaching is set beside your faculty's median, warm wh…
- **101 words**, Events (catalogue), `src/data/eventCatalogue.ts:2112`: Someone has copied the student records database: names, addresses, transcripts and the financial aid files of every student since the founding. The college learned of it from a message to the Registrar's inbox with a sam…
- **101 words**, Events (catalogue), `src/data/eventCatalogue.ts:2608`: With its first laboratory open, the board has voted the college a university charter. {name} College may now call itself {name} University, as many American colleges did when they took up research and graduate work. Othe…
- **101 words**, Faculty tab, `src/tabs/AdministrationPanel.tsx:32`: Each seat takes its domain's routine off the President's desk: when a matter in its domain comes up, the seat answers by its policy and records the answer. Anything that would cost more than four weeks of operating cost,…
- **99 words**, Events (catalogue), `src/data/eventCatalogue.ts:2077`: Thirty-one graduates of {program} have filed suit over a line in the viewbook that promised 'employment in the field within six months' and gave a percentage. The percentage came from a survey of nine people, four of who…
- **99 words**, History tab, `src/tabs/StandingsPanel.tsx:33`: Seven rankings, one field. Prestige is the ranking the guide leads with, and the one Rank shows: the blend of four pillars, the same for the college and every rival. Each rival specializes in one pillar, which runs highe…
- **97 words**, Events (catalogue), `src/data/eventCatalogue.ts:2165`: {rival} has written proposing a merger. The letter is courteous and long, and its appendix lists the savings to be had from one registrar, one catalog and one set of athletic fields, most of which would be theirs. The na…

## Repeated word for word (four words or more)

43 sentences appear more than once.

- ×6: “[Right click] to delete” — `src/components/CampusMap.tsx:239`, `src/components/CampusMap.tsx:240`, `src/components/CampusMap.tsx:241`, `src/components/CampusMap.tsx:242`
- ×4: “The hall of fame” — `src/components/HallOfFame.tsx:43`, `src/components/HallOfFame.tsx:46`, `src/components/TitleScreen.tsx:107`, `src/components/TitleScreen.tsx:108`
- ×3: “Fifty years to build a university.” — `src/components/Credits.tsx:19`, `src/components/StartupScreen.tsx:318`, `src/components/TitleScreen.tsx:49`
- ×3: “A matter set aside” — `src/components/InterruptModal.tsx:50`, `src/components/InterruptModal.tsx:865`, `src/systems/inbox/inbox.ts:135`
- ×3: “A letter to the President” — `src/components/InterruptModal.tsx:839`, `src/systems/inbox/inbox.ts:129`
- ×2: “The board has frozen construction; nothing new goes up until it lifts.” — `src/components/BuildPopup.tsx:439`, `src/components/BuildingInfoPanel.tsx:744`
- ×2: “A green centerpiece for campus life.” — `src/components/BuildingInfoPanel.tsx:177`, `src/data/facilitiesData.ts:900`
- ×2: “A course has no instructor” — `src/components/BuildingInfoPanel.tsx:244`, `src/tabs/CurriculumTab.tsx:941`
- ×2: “Could move to {hallDisplayName(s, moveH}” — `src/components/BuildingInfoPanel.tsx:246`
- ×2: “Confirm — {program.name} closes {relocationWeeks(s, progr} weeks” — `src/components/BuildingInfoPanel.tsx:279`, `src/components/BuildingInfoPanel.tsx:361`
- ×2: “The curriculum committee is full.” — `src/components/BuildingInfoPanel.tsx:646`, `src/tabs/CurriculumTab.tsx:773`
- ×2: “Drag to plant a border” — `src/components/CampusMap.tsx:244`
- ×2: “Drag to delete paths, trees and decoration” — `src/components/CampusMap.tsx:245`
- ×2: “Fold the map tools away” — `src/components/CampusMap.tsx:2723`, `src/components/CampusMap.tsx:2724`
- ×2: “The game has stopped” — `src/components/CrashScreen.tsx:39`, `src/components/CrashScreen.tsx:41`
- ×2: “— the college cannot cover this.” — `src/components/EventChoices.tsx:155`, `src/components/InterruptModal.tsx:898`
- ×2: “The matter this concerned has lapsed. Nothing has changed.” — `src/components/InterruptModal.tsx:50`, `src/components/InterruptModal.tsx:866`
- ×2: “The college enters the guide” — `src/components/InterruptModal.tsx:313`, `src/systems/inbox/inbox.ts:111`
- ×2: “The first sport club” — `src/components/InterruptModal.tsx:628`, `src/systems/inbox/inbox.ts:117`
- ×2: “The teams will play as the” — `src/components/InterruptModal.tsx:636`, `src/components/InterruptModal.tsx:691`
- ×2: “A letter has been mislaid” — `src/components/InterruptModal.tsx:730`, `src/components/InterruptModal.tsx:827`
- ×2: “A hall of its own” — `src/data/chapterData.ts:204`, `src/data/eventData.ts:1167`
- ×2: “Object to the designation” — `src/data/eventCatalogue.ts:1370`, `src/data/eventCatalogue.ts:2419`
- ×2: “From the chair of the board” — `src/data/openingData.ts:93`, `src/systems/inbox/inbox.ts:123`
- ×2: “published and taken up widely” — `src/data/researchData.ts:161`, `src/data/researchData.ts:193`
- ×2: “the Federal Science Council” — `src/data/researchData.ts:162`, `src/data/researchData.ts:194`
- ×2: “an industrial research consortium” — `src/data/researchData.ts:162`, `src/data/researchData.ts:201`
- ×2: “the Kellner Award for Scientific Achievement” — `src/data/researchData.ts:163`, `src/data/researchData.ts:202`
- ×2: “Staff the weakest courses first” — `src/data/seatData.ts:57`, `src/data/seatData.ts:72`
- ×2: “no way to walk to it from the road” — `src/state/reach.ts:122`, `src/state/reach.ts:127`
- ×2: “{orphaned.length} {orphaned.length === 1 ? } for a new instructor in {f.field}.” — `src/systems/delegation/seats.ts:82`, `src/systems/faculty/facultySystem.ts:151`
- ×2: “{money(Math.ceil(shortfal} short of the development cost” — `src/systems/techtree/programProgress.ts:139`, `src/tabs/CurriculumTab.tsx:878`
- ×2: “your faculty’s median is” — `src/tabs/CurriculumTab.tsx:487`, `src/tabs/FacultyTile.tsx:88`
- ×2: “Course slots in use” — `src/tabs/FacultyPlot.tsx:227`, `src/tabs/FacultyTab.tsx:458`
- ×2: “; your faculty's median is {median}” — `src/tabs/FacultyTable.tsx:52`, `src/tabs/FacultyTile.tsx:76`
- ×2: “{isCandidate ? 'Asks' : '} {money(f.salary)}; the college pays {money(pay)} at its market rate” — `src/tabs/FacultyTable.tsx:140`, `src/tabs/FacultyTile.tsx:296`
- ×2: “Withdraws from the market in {weeksShort(listingLeft)}” — `src/tabs/FacultyTable.tsx:145`, `src/tabs/FacultyTile.tsx:298`
- ×2: “Show less about {f.name}” — `src/tabs/FacultyTable.tsx:157`, `src/tabs/FacultyTile.tsx:318`
- ×2: “Show more about {f.name}” — `src/tabs/FacultyTable.tsx:157`, `src/tabs/FacultyTile.tsx:318`
- ×2: “This year's grade is lifting it.” — `src/tabs/PrestigeGlance.tsx:42`, `src/tabs/StandingBreakdown.tsx:147`

## British spellings (the house voice is American)

By word: grey ×1, enrolment ×1.

2 found:

- “grey” (gray) — Other, `src/components/canvasPaint.ts:1073`: mask (grey)
- “Enrolment” (enrollment) — Founders Hall offices, `src/data/officeData.ts:14`: Enrolment

## British idioms (for a person to judge)

15 found. By phrase: proper ×5, autumn ×3, queues ×2, queue ×1, the flat ×1, the sunday ×1, porters ×1, full marks ×1.

- “queue” (line) — Debug panel (developer only), `src/components/DebugPanel.tsx:212`: celebrate queue
- “Autumn” (fall) — Settings, `src/components/SettingsPanel.tsx:100`: Autumn leaves and winter snow on the campus, or its summer green all year.
- “queues” (line) — Course descriptions, `src/data/courseDescriptions.ts:147`: Builds discrete-event models of factories, hospitals, and queues, and runs experiments on them that would be too costly in real life.
- “queues” (line) — Course descriptions, `src/data/courseDescriptions.ts:569`: Models supply chains, queues, and capacity, and uses data to decide where a business should cut waste and where it should add slack.
- “proper” (real) — Events (catalogue), `src/data/eventCatalogue.ts:110`: Throw them a proper reception
- “proper” (real) — Events (catalogue), `src/data/eventCatalogue.ts:374`: Appoint a proper manager
- “proper” (real) — Events (catalogue), `src/data/eventCatalogue.ts:734`: The Development Office would like to run a proper telephone campaign: students calling alumni in the evenings, a script, a target. The last …
- “the flat” (apartment) — Events (catalogue), `src/data/eventCatalogue.ts:1116`: The snow on the flat roofs is now deep enough that the structural engineer has asked, politely and in writing, for it to be somewhere else. …
- “the Sunday” (on Monday) — Events (catalogue), `src/data/eventCatalogue.ts:1132`: The coldest night in forty years came the Sunday before term, and on Monday the pipes gave way in three buildings at once. Water came throug…
- “proper” (real) — Events (catalogue), `src/data/eventCatalogue.ts:1300`: Commission a proper mural beside it
- “porters” (custodian, doorman) — Events (catalogue), `src/data/eventCatalogue.ts:1321`: The master key to {building} has been lost. The locks were all changed in Year {answeredYear}, and the new master key has gone the way of th…
- “proper” (real) — Events (catalogue), `src/data/eventVariants.ts:200`: Bike theft outside {building} has reached forty a term. The racks are dark, the locks are cheap, and the student government has set up a tab…
- “autumn” (fall) — Speed-ups (letters), `src/data/speedUpData.ts:103`: An autumn festival
- “autumn” (fall) — Speed-ups (letters), `src/data/speedUpData.ts:134`: An autumn festival with a headline act filled the downtown, for {price}.
- “Full marks” (grade, the top score) — Students tab, `src/tabs/StudentLifeTab.tsx:195`: Full marks

## Engine words in the prose (for a person to judge)

6 found. By word: unlocked ×3, this run ×2, the slider ×1.

- “unlocked” (opens, can be built) — Inbox, `src/components/InboxTab.tsx:518`: architecture, unlocked
- “this run” (the college, the fifty years) — Modals (summer, events, letters), `src/components/InterruptModal.tsx:177`: Back up this run
- “the slider” (name the figure) — Objectives (chapters, briefings, the Guide), `src/data/chapterData.ts:147`: Tuition: the slider says whether a price is in line with the college's standing. The applicants show only once it is set.
- “Unlocked” (opens, can be built) — Objectives (chapters, briefings, the Guide), `src/data/chapterData.ts:421`: Unlocked
- “this run” (the college, the fifty years) — Opening walkthrough, `src/data/openingData.ts:79`: Skip the walkthrough? It doesn’t come back this run.
- “unlocked” (opens, can be built) — Inbox, `src/systems/inbox/inbox.ts:145`: {unlockLabel(v)} architecture, unlocked

## Marks

| Mark | Strings | Per screen (top 5) |
|---|---|---|
| exclamation marks | 0 |  |
| second person (you, your) | 40 | Faculty tab 11, Events (catalogue) 7, Events (decision) and letters 4, Inbox 3, Credits 2 |
| contractions | 3 | Admissions page (summer) 1, Build menu 1, Opening walkthrough 1 |
| emoji | 1 | Debug panel (developer only) 1 |
| ALL CAPS words | 12 | Course descriptions 7, Events (catalogue) 2, Curriculum names and gates 2, Build menu 1 |
| ellipses | 10 | Curriculum tab 5, Build menu 2, Building panel 2, Menu 1 |

## The glossary's words

Words Plan 47's glossary names one way: no bare "slots", no "default" for a matter left unanswered, and "Spring term" in lower case (`tools/review/glossaryChecks.ts`).

1 found:

- “slots”, bare "slots" ("course slots" or "program slots") — Building panel, `src/components/BuildingInfoPanel.tsx:544`: , so its free slots take the programs on offer.

## Jargon

How often each term a new player may not know appears, and on how many screens. A term used on many screens before it is explained anywhere is the thing to check.

| Term | Strings | Screens |
|---|---|---|
| tier | 1 | 1 |
| rung | 1 | 1 |
| cohort | 2 | 1 |
| seat | 49 | 17 |
| sweep | 11 | 6 |
| draw rate | 3 | 2 |
| backlog | 11 | 5 |
| tolerance | 1 | 1 |
| ceiling | 5 | 1 |
| standing | 39 | 21 |
| concentration | 1 | 1 |
| breadth | 2 | 2 |
| intake | 1 | 1 |
| sections | 3 | 2 |
| section | 13 | 4 |
| services | 7 | 7 |
| endowment | 65 | 22 |
| distinguished | 24 | 9 |
| established | 23 | 11 |
| founded | 39 | 18 |
| housed | 2 | 2 |
| milestone | 9 | 5 |
| ladder | 2 | 2 |
| vernacular | 1 | 1 |
| flagship | 22 | 6 |
| developmental | 3 | 2 |
| competitive | 2 | 2 |
| pot | 13 | 4 |
| subsidy | 16 | 4 |
| gate | 16 | 9 |
| veteran | 3 | 2 |
| prospect | 4 | 3 |
| scout | 1 | 1 |
| market rate | 7 | 5 |
| tenure | 7 | 4 |
| teaching standard | 1 | 1 |
| report card | 4 | 2 |
| grade | 43 | 17 |
| target | 8 | 3 |
| drift | 1 | 1 |
| dividend | 2 | 2 |
| annual fund | 5 | 4 |
| austerity | 7 | 4 |
| distress | 2 | 2 |
| warmth | 8 | 5 |
| bequest | 6 | 3 |
| restricted | 2 | 2 |
| capital project | 21 | 7 |
| depth | 2 | 2 |
| landmark program | 19 | 5 |
| breakthrough | 12 | 7 |
| petition | 32 | 11 |
| chapter | 27 | 11 |
| hellenic | 7 | 4 |
| pillar | 37 | 5 |
| specialization | 36 | 7 |
| potential | 13 | 4 |
| training pick | 1 | 1 |
| objective | 6 | 2 |
| briefing | 2 | 2 |
| top band | 12 | 4 |
| sweep | 11 | 6 |
| office | 108 | 21 |
