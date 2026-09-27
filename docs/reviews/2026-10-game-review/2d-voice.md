# Appendix to area 2: the voice

Plan 73, area 2. Commit read: `58fa3fd`. Every player-facing string outside the events, letters, promises, course descriptions and name pools (3,711 rows, 20,138 words, 47 screens, from `npm run review:strings`) was read in order for one voice: a senior administrator's dry, specific prose, in American English. The report follows unchanged except for heading levels. `2-ui-and-text.md` summarizes it.

Read in full: **3,711 rows, 20,138 words, on 47 screens** of `strings.csv`, screen by screen and in file order within each screen. Skipped, as briefed: Events (catalogue), Course descriptions, Events (decision) and letters, Promises, Names (people, rivals, mascots), Debug panel (developer only), Audio (not read).

The standard: “a senior administrator’s dry, specific prose, American spelling, no in-jokes that break the frame”, plus the concrete rules of Plan 47 (`docs/plans/47-one-voice.md`):

- **Verbs:** a read-only modal closes with *Continue*, a note with *Noted*; *Dismiss*, *Understood* and *Resolve* are retired as dismiss verbs.
- **Dates and weeks:** prose says “Year N”; the log and charts keep compact stamps; compact durations read *Nw*, rates */wk*, and prose says weeks.
- **Case:** headings and buttons are sentence case (the Treasury heading is “Balance”).
- **Confirmations:** `ConfirmButton` is the one way to ask before a loss; the first click arms it and says what is lost.
- **Announcements:** the catalog’s letters are “A letter to the President”; “From the board” belongs to the distress ladder alone; a tab a milestone opens is announced by the milestone’s note, not also by a log line.
- **Opening:** programs are founded in a hall’s panel (the “free-slot line” opens Founders Hall).
- **Year 51:** the fiftieth summer’s first step is labeled “Final report”; the report says the summer goes on to set Year 51’s tuition.
- **No real names** (trophies, rivals, funders).

**How to read the tables.** The text between “ ” in the Quote column is the CSV text exactly, or an exact excerpt of a longer row; placeholders are as the CSV prints them (often cut short). Words in *italics* are words under discussion or rendered examples, not quotes. Every quote and every `name.ts:line` reference was checked against the CSV by script. Where one row stands for several, the others are listed in the issue column.

### 1. Frame breaks (33)

In-world prose that speaks as a game or a UI. Not counted, because they are UI by design: the walkthrough steps (`openingData.ts:37`, `:43`, `:49`, which must say “click”), map and build-menu tooltips and help hints that explain controls (e.g. `CampusMap.tsx:1805`), and the menu, settings, crash screen and credits, which rightly speak of “the game” and “the run”.

| Quote | file:line | screen | issue | suggested rewrite |
|---|---|---|---|---|
| “on the academic table the rest of the game means by rank. One is the top of the chart.” | `src/tabs/HistoryTab.tsx:342` | History tab | Speaks as the game (“the rest of the game”) and as a chart. *Table* is also British (section 4). | “Of {n} colleges in the guide’s academic ranking; #1 is the top.” |
| “Academics is the ranking the rest of the game means by rank” | `src/tabs/StandingsPanel.tsx:23` | History tab | The same aside about “the game”, in the standings explanation. | “Academics is the ranking the guide leads with, and the one Rank shows.” |
| “Money is the only throttle on starting anything” | `src/tabs/TreasuryTab.tsx:181` | Treasury tab | Designer vocabulary (“throttle”) in the Treasury explanation. | “Nothing starts until it is paid for” |
| “so the wait for the next purchase is the pacing” | `src/tabs/TreasuryTab.tsx:181` | Treasury tab | Game-design talk (“pacing”), same paragraph. | “so cash sets how fast the college grows” |
| “That never ends the run” | `src/tabs/TreasuryTab.tsx:181` | Treasury tab | “The run” is the player’s session, not the college’s. | “A deficit never closes the college” |
| “Year 50 · the run formally ends” | `src/data/reportData.ts:90` | Final Report | The Final Report’s eyebrow names the play session. | “Year 50 · the fiftieth year closes” |
| “Averaged {mean} over the run;” | `src/data/reportData.ts:94` | Final Report | “The run” again, inside the report’s own prose. | “Averaged {mean} over fifty years;” |
| “The run is over; the college is not.” | `src/data/reportData.ts:104` | Final Report | Meta framing; the same row goes on “then the clock runs on” and ends “Nothing new unlocks.” | “The fifty years are over; the college is not.” … “Nothing new opens.” |
| “from the same sum the weekly tick runs.” | `src/data/figureHints.ts:24` | Help hints | *Tick* is the engine’s update step. Same ending at figureHints.ts:25 and :26. | “as of this week’s figures.” |
| “read from the same computation the weekly tick runs, not a separate tally.” | `src/tabs/StudentLifeTab.tsx:78` | Students tab | Engine vocabulary (computation, tick, tally). | “the same figures that set satisfaction each week.” |
| “exactly what the weekly tick charges or collects.” | `src/tabs/TreasuryTab.tsx:68` | Treasury tab | Engine vocabulary in the income statement’s header. | “exactly what the college pays or collects each week.” |
| “Answered together in the summer's Students beat — nothing here interrupts play.” | `src/tabs/StudentLifeTab.tsx:355` | Students tab | *Beat* is the code’s name for a summer step; “interrupts play” speaks as the game. | “The President answers them together each summer; none waits on a decision now.” |
| “you will decide in the summer's Students beat.” | `src/systems/studentlife/studentLifeSystem.ts:25` | Student life and athletics | Log line uses the internal step name. Also studentLifeSystem.ts:26 and yearInReview.ts:163. | “the President decides at the summer’s student review.” |
| “The {action.label} tab is now open.” | `src/engine/reducer.ts:486` | Engine (log lines) | A log line about a UI tab. Still fires for tabs a milestone does not open (NOTE_TAB_AVAILABLE with announce). | “{label} now reports to the President.” |
| “The record of its earliest weeks has scrolled off the log.” | `src/components/InterruptModal.tsx:459` | Modals (summer, events, letters) | Describes the UI scrolling, in the year-in-review. | “The log no longer reaches back to its first weeks.” |
| “(the Treasury's "Being large")” | `src/data/ladderData.ts:136` | Ladder and milestone notes | The board’s letter cites a UI row label. | “(the Treasury counts it as the cost of being large)” |
| “The name can be changed from its pennant.” | `src/state/persistence.ts:83` | State (log lines) | Points at a UI control from the charter log line. | Drop the sentence; the pennant’s tooltip already says it. |
| “Unlocks once the campus passes” | `src/data/facilitiesData.ts:497` | Building names and blurbs | Game verb; also facilitiesData.ts:788 and :805. Siblings say “Opens” (facilitiesData.ts:822, projectData.ts:52). | “Can be built once enrollment passes {n}.” |
| “Unlocks at prestige” | `src/data/facilitiesData.ts:640` | Building names and blurbs | Same verb; the row opens with “The chain's capstone” (facilitiesData.ts:640), jargon for section 3. | “Can be built at prestige {n}.” |
| “Revealed only once the football program itself goes varsity.” | `src/data/facilitiesData.ts:749` | Building names and blurbs | Fog-of-war verb. | “Listed once football goes varsity.” |
| “No program housed here has been earned yet.” | `src/components/BuildingInfoPanel.tsx:406` | Building panel | “Earned” means unlocked. | “No program for this hall is on offer yet.” |
| “every revealed course is under way or done.” | `src/tabs/CurriculumTab.tsx:1127` | Curriculum tab | “Revealed” treats the catalog as hidden map. Also CurriculumTab.tsx:1183, :1196 and FacultyTab.tsx:287, :291, :680, :691, :759. | “every course the college can offer is under way or done.” |
| “The year can run at up to eight times.” | `src/tabs/AdministrationPanel.tsx:23` | Faculty tab | The game-speed control dressed as the college’s calendar, and unclear (eight times what?). Also AdministrationPanel.tsx:25, :26, seatData.ts:47, :58 and seats.ts:137, :140, :141. | Say it as the setting it is: “Game speed up to 8×.” |
| “the clock will not run until you have.” | `src/data/openingData.ts:31` | Opening walkthrough | The chair’s letter refers to the game clock. | “and nothing else can start until you have.” |
| “Playtesting only — not intended for normal play (5)” | `src/components/StatusHeader.tsx:65` | Dock and toolbar | Developer note in the player’s speed control, beside “Fast (sandbox)” (StatusHeader.tsx:59). | Hide in release builds, or “Fastest (5)”. |
| “when one of its events comes up, it answers by the policy you set and the log says so.” | `src/tabs/AdministrationPanel.tsx:32` | Faculty tab | “Events” and “the log” are UI objects. | “when a matter in its domain comes up, it answers by your policy and records the answer.” |
| “Anything not yet unlockable is left off rather than teased.” | `src/components/BuildPopup.tsx:721` | Build menu | Gamer vocabulary (unlockable, teased). | “Buildings the college cannot build yet are not listed.” |
| “pts/wk” | `src/tabs/FacultyTab.tsx:196` | Faculty tab | Game “points” as the unit of a professor’s scholarly output. | Name the unit (“credits a week”) or drop it. |
| “· interdisciplinary bonus” | `src/tabs/ResearchTab.tsx:258` | Research tab | *Bonus* is game vocabulary; the house word is *lift*. | “· interdisciplinary lift” |
| “Progress above is read off the same campus state the demand resolves against” | `src/tabs/StudentLifeTab.tsx:296` | Students tab | Engineering vocabulary (state, resolves against). | “The bar above is what this need is served by today, against what the students asked for.” |
| “satisfaction is floored” | `src/tabs/StudentLifeTab.tsx:313` | Students tab | Mechanic-speak. | “satisfaction cannot fall below a floor” |
| “there is no yield step” | `src/tabs/EnrollmentTab.tsx:176` | Students tab | Design-document language (also section 3). | “everyone admitted enrolls” |
| “The slider ends at” | `src/components/InterruptModal.tsx:345` | Modals (summer, events, letters) | Names the control in the admissions decision (low). | “The admit rate stops at {n}%, where the class fills the room.” |

### 2. Register slips (21)

No exclamation marks anywhere in scope (the two `!` in the CSV are TypeScript non-null operators inside placeholders). Five rows hold contractions; the rest of the text never contracts.

| Quote | file:line | screen | issue | suggested rewrite |
|---|---|---|---|---|
| “You've entered the rankings” | `src/components/InterruptModal.tsx:615` | Modals (summer, events, letters) | Contraction and second-person pep; the modal’s other two titles are “Standing — the guide” and “Standing”. | “The college enters the guide” |
| “This year's standings are in — you're ranked #{rank}.” | `src/components/InterruptModal.tsx:620` | Modals (summer, events, letters) | Chatty, a contraction, and “you” for the college. | “This year’s standings: the college is #{rank}.” |
| “You are ranked #{rank} of {payload.field} this summer.” | `src/components/InterruptModal.tsx:621` | Modals (summer, events, letters) | “You” for the college. The row ends “the college is not on it yet”, where “it” refers back to “fifty names”. | “The college ranks #{rank} of {field}. The guide prints fifty names; the college is not yet among them.” |
| “nobody in the country is ahead of you” | `src/components/InterruptModal.tsx:673` | Modals (summer, events, letters) | Second person for the college. | “no college in the country is ahead” |
| “far beyond your prestige — sticker shock will bite” | `src/components/InterruptModal.tsx:136` | Modals (summer, events, letters) | Colloquial (“will bite”) and second person; “your prestige” also at InterruptModal.tsx:133, :134, :135. | “far above what the college’s prestige supports; expect sticker shock” |
| “your price vs. what your prestige supports” | `src/systems/admissions/cohorts.ts:24` | Admissions | Second person where the rest says “the college”. | “the price against what the college’s prestige supports” |
| “Big movers” | `src/components/InterruptModal.tsx:648` | Modals (summer, events, letters) | Market-report slang. | “The largest moves” |
| “Each tile shows what's built, what's under construction, and what's next available.” | `src/components/BuildPopup.tsx:721` | Build menu | Six contractions in one hint (what’s ×4, you’ve, that’s): most of the contractions in the in-scope text. | “what is built … you have … that is” |
| “the campus hasn't crossed the population where this need starts to matter yet.” | `src/tabs/StudentLifeTab.tsx:197` | Students tab | Contraction. | “has not” |
| “Expand one to see exactly what's behind its score” | `src/tabs/StudentLifeTab.tsx:238` | Students tab | Contraction. | “what is behind” |
| “pays off bigger” | `src/tabs/ResearchTab.tsx:313` | Research tab | Casual comparative in a formal explanation. | “pays more” |
| “a jock school” | `src/data/reportData.ts:25` | Final Report | Slang, and it feeds the Final Report’s title, “{college}: {phrase}, and a very good one” (reportData.ts:70), and the guidebook log line (tags.ts:116). | “an athletics school” |
| “The Troubles” | `src/data/chronicleData.ts:16` | Chronicle | An era name that borrows the name of the Northern Ireland conflict. | “The Hard Years” |
| “{team} started the year the right way, beating {them}.” | `src/data/logWords.ts:32` | Log | Sportscaster cliché. | “{team} opened the year by beating {them}.” |
| “{team} sent the homecoming crowd home happy, beating {them}.” | `src/data/logWords.ts:42` | Log | Cliché; compare the drier “and the alumni stayed late” (logWords.ts:43). | “{team} beat {them} before the homecoming crowd.” |
| “Is, somewhere, every author's Reviewer Two” | `src/data/quirkData.ts:62` | Faculty (bios, quirks, log) | Academic meme. In-world, but an in-joke (low). | Keep if wanted; change “marks” to “grades” (section 4). |
| “Students demand somewhere to be seen” | `src/data/demandData.ts:90` | Student demands | A pun on “seen” (by a doctor). Low; it may be intended. | “Students demand a health center” |
| “Every college that ever sent a letter about the car park” | `src/components/Credits.tsx:22` | Credits | In-joke on the car-park events. Fine in the credits, but British (section 4). | “… about the parking lot” |
| “I know the way — skip the walkthrough and the letters” | `src/components/OpeningCoach.tsx:45` | Opening walkthrough | The player’s first-person voice on a button; also InterruptModal.tsx:1060. Low. | “Skip the walkthrough and the letters” |
| “Once there is a real club scene” | `src/data/studentLifeData.ts:103` | Student life and athletics | Casual. | “Once clubs are established” |
| “lost the semi” | `src/tabs/AthleticsTab.tsx:27` | Athletics tab | Clipped slang (also “lost the quarter”, AthleticsTab.tsx:28); the champions modal says “Semifinal” (InterruptModal.tsx:903). | “lost the semifinal” |

### 3. Jargon a new player would not know (30)

Counts are rows of player-visible text (placeholders stripped), in scope only. The Quote column shows the term’s first appearance in the table’s own order; the issue column says where, if anywhere, it is explained. Two terms from the brief do not occur in player-visible text: *rung* (only as the placeholder `{rung}`, `chronicleData.ts:37`, and a constant name) and *teeth* (nowhere). Checked and acceptable: *market* (introduced at `openingData.ts:49`), *applicant pool*, *funnel*, *endowment draw* (`figureHints.ts:18`), *warmth* (`AlumniPanel.tsx:22`) and *standing sweep* (well explained in the board’s letter, `boardData.ts:40`).

| Quote | file:line | screen | issue | suggested rewrite |
|---|---|---|---|---|
| “A course has no instructor: the program is dark until it is restaffed” | `src/components/BuildingInfoPanel.tsx:183` | Building panel | **dark**: 14 rows on 5 screens. Two meanings: a program with an unstaffed course, and a program moving halls (techSystem.ts:492, CurriculumTab.tsx:389). Explained in this tooltip, at CurriculumTab.tsx:893 and inline at nextStep.ts:216; bare at nextStep.ts:217, techSystem.ts:492 (log), BuildingInfoPanel.tsx:363 and InterruptModal.tsx:1107. | Keep for “unstaffed”; say “closed while it moves” for relocation. |
| “{t.slots} program slots” | `src/components/BuildPopup.tsx:270` | Build menu | **slot**: 42 rows on 9 screens, never defined. Two meanings: a hall’s place for a program (19 rows) and a professor’s or department’s teaching capacity (23 rows). The walkthrough and the first-hall letter call a hall’s places “rooms” (openingData.ts:49, ladderData.ts:125). | “room” for halls; “teaching load” for faculty. |
| “Adds {rung.seatsGain.toLocaleS} seats for the gate” | `src/components/BuildPopup.tsx:333` | Build menu | **seat**: 31 rows on 13 screens, five meanings: teaching capacity (13 rows, “the catalog's seats” (InterruptModal.tsx:308)), an administration post (5, AdministrationPanel.tsx:32), a curriculum-committee place (6, CurriculumTab.tsx:1233), physical seats (5, “study seats”) and stadium seats (2, this row). Only the post and the committee place are explained. | “seat” for posts only; “places” for teaching capacity. |
| “petitioning for recognition — answered in the summer's Students beat” | `src/state/yearInReview.ts:163` | Summer review | **beat**: 4 rows on 3 screens (also studentLifeSystem.ts:25, :26 and StudentLifeTab.tsx:355). The code’s name for a summer step; the step itself is labeled “Students”. Never explained. | “the summer’s student review” |
| “Click for the ladder: every milestone and what it opens.” | `src/components/LogTicker.tsx:71` | Dock and toolbar | **ladder**: 3 rows on 3 screens, two different systems: the milestones here, the board’s distress levels at figureHints.ts:17 and TreasuryTab.tsx:181. | “Click for every milestone and what it opens.”; the other is “the board’s scale”. |
| “weeks dark, and the last school sorted keeps this one.” | `src/components/BuildingInfoPanel.tsx:363` | Building panel | **sorted**: 1 row (figureHints.ts:10 uses the word plainly). Means the last school still without a hall of its own. | “and the last school without a hall of its own keeps this one.” |
| “; missed, next summer's pool is” | `src/components/DemandNote.tsx:26` | Student demands | **pool**: 10 rows on 7 screens, plus 4 swimming pools. Mostly the applicant pool, labeled at EnrollmentTab.tsx:165; bare “the pool” at figureHints.ts:34, :42 and EnrollmentTab.tsx:181; a coaching pool at AthleticsTab.tsx:148. Low. | “applicant pool” in full where no label is near. |
| “there is no yield step” | `src/tabs/EnrollmentTab.tsx:176` | Students tab | **yield**: 1 row. A real admissions term, used to name a step the game does not have. | “everyone admitted enrolls” |
| “never a hard cap on enrollment” | `src/tabs/HistoryTab.tsx:350` | History tab | **cap**: 2 rows on 2 screens (also “capped apart”, StudentLifeTab.tsx:380). | “never a hard limit”; “counted against separate limits” |
| “Tier {t.tier}” | `src/components/BuildPopup.tsx:298` | Build menu | **tier**: 6 rows on 5 screens, four unrelated systems: building upgrades (this row), course levels (courseQuality.ts:124, techData.ts:725), research depth (“the Landmark tier”, ResearchTab.tsx:313) and the athletics budget (TreasuryTab.tsx:151). Never explained; the Athletics tab calls that budget “the one dial”. | Name each: “Expansion 2”, “capstone courses”, “Landmark Programs”, “subsidy level”. |
| “+{flat} flat” | `src/components/BuildPopup.tsx:275` | Build menu | **flat**: 4 rows on 4 screens: a satisfaction bonus that does not grow with enrollment (BuildingInfoPanel.tsx:114, facilitiesData.ts:861, satisfactionSystem.ts:264). | “+{n} social life, at any size” |
| “gates capstone coursework” | `src/components/BuildPopup.tsx:268` | Build menu | **gate**: 13 rows on 5 screens, three meanings: a prerequisite (3 rows: this, BuildingInfoPanel.tsx:126, techData.ts:725), ticket revenue (8, “at the gate”, AthleticsTab.tsx:286) and stadium capacity (2, “seats for the gate”). The revenue sense is standard American sports usage; the prerequisite sense is the jargon. | “required for capstone courses” |
| “The chain's capstone:” | `src/data/facilitiesData.ts:640` | Building names and blurbs | **chain**: 5 rows on 3 screens (“the recreation chain”, ladderData.ts:147, :148, prestigeSystem.ts:395, :649). Never explained. | “the last of the recreation buildings” |
| “Each standing is a stock.” | `src/tabs/HistoryTab.tsx:176` | History tab | **stock**: 3 rows on 2 screens (HistoryTab.tsx:334, StudentLifeTab.tsx:78). A systems-modeling term. | “Each standing moves slowly toward its target.” |
| “from the same sum the weekly tick runs.” | `src/data/figureHints.ts:24` | Help hints | **tick**: 5 rows on 3 screens (section 1). | “this week’s figures” |
| “Standing” | `src/components/BuildingInfoPanel.tsx:192` | Building panel | **standing**: 33 rows on 17 screens, five senses: the six ranked standings (History tab), a program’s stage (this label shows *3 to Established*, *Distinguished* and the like), the “standing sweep” (a standing order), “The standing body” (EnrollmentTab.tsx:117) and plain “Standing idle” (ResearchTab.tsx:345). | Keep “standings” for the six rankings; “Stage” here; “The student body”. |
| “already at its ceiling” | `src/components/InterruptModal.tsx:923` | Modals (summer, events, letters) | **ceiling**: 7 rows on 4 screens, four senses: a satisfaction maximum (this, StudentLifeTab.tsx:91), a coach’s potential (AthleticsTab.tsx:38, :148, :175), the enrollment limit (EnrollmentTab.tsx:186) and the prestige limit (HistoryTab.tsx:366). | “potential” for coaches; “limit” elsewhere. |
| “Revealed only once the football program itself goes varsity.” | `src/data/facilitiesData.ts:749` | Building names and blurbs | **revealed**: 9 rows on 3 screens (8 of them courses, e.g. CurriculumTab.tsx:1127). Never defined (section 1). | “open”, “offered” |
| “The chair is left open until someone is hired from the market.” | `src/tabs/AthleticsTab.tsx:84` | Athletics tab | **chair**: 5 rows, all on the Athletics tab, for a coaching post. Elsewhere a chair is an endowed professorship (campaignData.ts:57) or the chair of the board. | “post” |
| “has seen an initiative through.” | `src/data/projectData.ts:58` | Building names and blurbs | **initiative**: 2 rows (also nextStep.ts:232), plus the summer review’s count (yearInReview.ts:117). The Research tab calls the same thing a project. | “has finished a research project” |
| “credits of {RESEARCH_CREDITS_FOR_FUL}” | `src/systems/prestige/prestigeSystem.ts:391` | Standing (History tab) | **credits**: 2 rows (also prestigeSystem.ts:611). A unit shown nowhere else. | Say once what a credit is. |
| “Held to the room:” | `src/components/InterruptModal.tsx:344` | Modals (summer, events, letters) | **room** (capacity): 8 rows on 6 screens (“fills the room”, InterruptModal.tsx:345; figureHints.ts:34; “over its room”, demandData.ts:108). The same word is also a hall’s place for a program (6 rows), which is also a “slot”. | “Held to capacity:” |
| “seats across the housed catalog;” | `src/components/InterruptModal.tsx:314` | Modals (summer, events, letters) | **housed**: 9 rows on 6 screens. Means a program that has a hall (not in transit). Unexplained here, at prestigeSystem.ts:542 and at EnrollmentTab.tsx:186. | “seats across the courses now taught” |
| “The wall” | `src/tabs/CurriculumTab.tsx:1190` | Curriculum tab | **The wall**: 1 row. A heading for courses blocked on faculty. Unexplained. | “Waiting on faculty” |
| “no cohort signal” | `src/tabs/EnrollmentTab.tsx:154` | Students tab | **cohort signal**: 1 row. Internal term. | “no particular pull” |
| “is now varsity-active.” | `src/systems/studentlife/studentLifeSystem.ts:44` | Student life and athletics | **varsity-active**: 1 row. Internal state name in a log line. | “now plays varsity” |
| “(see the Students tab's Housing attribute)” | `src/components/BuildPopup.tsx:721` | Build menu | **attribute**: 4 rows on 3 screens (EnrollmentTab.tsx:181, StudentLifeTab.tsx:238, prestigeSystem.ts:662). The UI calls the same five things needs. | “need” |
| “where Landmark Programs are commissioned.” | `src/data/projectData.ts:58` | Building names and blurbs | **Landmark**: the research sense (3 rows: also ResearchTab.tsx:209 and “the Landmark tier”, ResearchTab.tsx:313) shares its name with the Grand Landmark buildings (BuildPopup.tsx:56, ladderData.ts:241). | Rename the research depth, e.g. “Signature Programs”. |
| “a small draw on its own.” | `src/data/facilitiesData.ts:572` | Building names and blurbs | **draw**: three senses: the endowment draw (10 rows, explained at figureHints.ts:18), what athletic programs take from their fund (6 rows, AthleticsTab.tsx:288) and appeal (this, facilitiesData.ts:640, EnrollmentTab.tsx:154). | “pull” for appeal; “take” for athletics. |
| “The department runs on a pot:” | `src/tabs/AthleticsTab.tsx:222` | Athletics tab | **pot**: 10 rows on 2 screens. Defined at AthleticsTab.tsx:287; informal for an administrator. | “the department’s fund” |

### 4. British English (31)

The automated scan (strings.md) found 38 spellings and 68 idioms, but only 10 of those flags fall on in-scope screens (2 spellings, 8 idioms; the Debug panel’s “queue” is out of scope). Nine are confirmed and one is rejected. The scan missed at least 21 more in scope, listed after the flags. The house spelling otherwise holds: color, center, theater, stories, program, labor, behavior, catalog.

| Quote | file:line | screen | issue | suggested rewrite |
|---|---|---|---|---|
| “Neuroimmune Signalling After Injury” | `src/data/researchTopics.ts:161` | Research | Automated flag (spelling): **confirmed**. | “Signaling” |
| “Catalogue” | `src/tabs/HistoryTab.tsx:361` | History tab | Automated flag (spelling): **confirmed**. Also inconsistent: “The catalog” (CurriculumTab.tsx:1399) and every other row say catalog. | “Catalog” |
| “weeks dark, and the last school sorted keeps this one.” | `src/components/BuildingInfoPanel.tsx:363` | Building panel | Automated flag (“sorted”): **confirmed**, as British colloquial and as jargon (section 3). | “the last school without a hall of its own” |
| “Every college that ever sent a letter about the car park” | `src/components/Credits.tsx:22` | Credits | Automated flag (“car park”): **confirmed**. | “parking lot” |
| “The queue at the dining halls runs out of the door and round the building” | `src/data/demandData.ts:71` | Student demands | Automated flag (“queue”): **confirmed**. The same clause has two more the scan missed: “out of the door” and “round the building”. | “The line at the dining halls runs out the door and around the building” |
| “sorted by prestige” | `src/data/figureHints.ts:10` | Help hints | Automated flag (“sorted”): **rejected**. Here it means ordered, which is standard American usage. (The same row’s “academic table” is British; see below.) | No change for “sorted”. |
| “a rota for the kitchen” | `src/data/foundingNotes.ts:17` | Founding notes | Automated flag (“rota”): **confirmed**. | “a kitchen schedule” |
| “{name} is written and on the timetable.” | `src/data/logWords.ts:62` | Log | Automated flag (“timetable”): **confirmed**. | “on the schedule” |
| “revises it every autumn” | `src/data/quirkData.ts:48` | Faculty (bios, quirks, log) | Automated flag (“autumn”): **confirmed**; the game’s own calendar says “Fall Term” (StatusHeader.tsx:73). | “every fall” |
| “sit out of the queue” | `src/tabs/AthleticsTab.tsx:429` | Athletics tab | Automated flag (“queue”): **confirmed**. “Line” is taken in this paragraph (the funding line), so use another word. | “sit out of the order” |
| “organisational behavior” | `src/data/facultyData.ts:553` | Faculty (bios, quirks, log) | **Missed** (spelling): British -isational beside American -or. | “organizational behavior” |
| “on the academic table” | `src/data/figureHints.ts:10` | Help hints | **Missed**: a “table” of colleges is the British league table. Also HistoryTab.tsx:342 and “Six tables, one field.” (StandingsPanel.tsx:23). | “in the academic rankings”; “Six rankings, one field.” |
| “The estate” | `src/tabs/EstatePanel.tsx:34` | Treasury tab | **Missed**: “the estate” for a university’s buildings is British. 8 rows: also EstatePanel.tsx:35, figureHints.ts:12, HistoryTab.tsx:334, prestigeSystem.ts:411, :412, seatData.ts:69 and EventPanel.tsx:21. | “Buildings and grounds” |
| “a fence round a ruin” | `src/tabs/EstatePanel.tsx:35` | Treasury tab | **Missed**: “round” for around. Also campusData.ts:51 (“round one formal front door”), facilitiesData.ts:482 (“round three stones”) and demandData.ts:71. | “a fence around a ruin” |
| “with a balcony to every other flat” | `src/data/campusData.ts:52` | Building names and blurbs | **Missed**: “flat” for apartment (the scan caught it only in the events). | “every other apartment” |
| “An apartment block, flat-roofed and balconied” | `src/data/campusData.ts:47` | Building names and blurbs | **Missed**: “apartment block” is British; also campusData.ts:52. | “An apartment building” |
| “the department's biscuits keep leaving.” | `src/data/quirkData.ts:60` | Faculty (bios, quirks, log) | **Missed**: biscuits. | “cookies” |
| “marks undergraduate essays” | `src/data/quirkData.ts:62` | Faculty (bios, quirks, log) | **Missed**: “marks” for grades. | “grades undergraduate essays” |
| “A dear sticker, little aid, and a beautiful campus.” | `src/data/tagData.ts:27` | Identity tags | **Missed**: “dear” for expensive. | “A steep sticker price, little aid, …” |
| “the first to read a subject that did not exist before them” | `src/data/alumniData.ts:29` | Alumni and campaigns | **Missed**: “to read a subject” is Oxbridge for study. | “the first to major in a subject …” |
| “four years of bad news from the bursary” | `src/data/alumniData.ts:33` | Alumni and campaigns | **Missed**: in Britain a bursary is a grant; the office is the bursar’s office. | “from the bursar’s office” |
| “full marks at” | `src/tabs/EndowmentPanel.tsx:85` | Treasury tab | **Missed**: British idiom; also “the full mark” (EndowmentPanel.tsx:79). The Final Report’s “Final mark” (resolveAdmissions.ts:81) is the same usage (section 5). | “the top score at” |
| “Welfare” | `src/systems/prestige/prestigeSystem.ts:398` | Standing (History tab) | **Missed**: in American usage *welfare* means public assistance; the row measures student satisfaction. | “Student well-being” |
| “Handover Protocols and Avoidable Error” | `src/data/researchTopics.ts:153` | Research | **Missed**: the American clinical term is *handoff*. | “Handoff Protocols and Avoidable Error” |
| “a medical research charity” | `src/data/researchData.ts:205` | Research | **Missed**: “charity” reads British here. | “a medical research foundation” |
| “First-years ask for these by name.” | `src/data/campusData.ts:44` | Building names and blurbs | **Missed**: *first-years*; the game says “Freshmen” (EnrollmentTab.tsx:16). “the upper years” (campusData.ts:47) is British too (also campusData.ts:52). | “Freshmen ask for these by name.”; “upperclassmen” |
| “the faculty have noticed” | `src/data/foundingNotes.ts:13` | Founding notes | **Missed** (low): British plural agreement; the same row has “in the common room”. | “the faculty has noticed”; “in the faculty lounge” |
| “Suites behind a proper front door” | `src/data/campusData.ts:46` | Building names and blurbs | **Missed** (low): “proper” for real. Related tic: “properly taught” (alumniData.ts:24), “Worst first, properly” (seatData.ts:65). | “a real front door” |
| “the contacts, the consultancy, and the car” | `src/data/quirkData.ts:64` | Faculty (bios, quirks, log) | **Missed** (low): “consultancy”. | “the consulting firm” |
| “clear a wood” | `src/components/BuildPopup.tsx:614` | Build menu | **Missed** (low): “a wood”; also “clearing a wood” (BuildPopup.tsx:610). | “clear woodland” |
| “a sporting college” | `src/data/reportData.ts:52` | Final Report | **Missed** (low): “sporting college” reads British. | “an athletic college” |

### 5. Inconsistency (34)

Checked and clean: “Treasury” is never “Finances”; “Student Center” is always so written; prose dates read “Year N” throughout; read-only modals close with Continue and notes with Noted. (The toast’s close button keeps the aria-label “Dismiss”, `Toasts.tsx:102`, which only screen readers hear.) Multi-meaning words are in section 3.

| Quote | file:line | screen | issue | suggested rewrite |
|---|---|---|---|---|
| “from the board:” | `src/state/yearInReview.ts:228` | Summer review | Plan 47 breach: the summer review labels the catalog’s letters “from the board”, which Plan 47 reserves for the distress ladder. The letters themselves are headed “A letter to the President” (InterruptModal.tsx:1133). | “{title}, a letter to the President: {choice}” |
| “six rooms, one program to a room” | `src/data/ladderData.ts:125` | Ladder and milestone notes | The same milestone calls a hall’s places “rooms” here and “six program slots each” in its next line (ladderData.ts:126). The walkthrough says rooms (openingData.ts:49); the next-step line says “has a free slot” (nextStep.ts:149). | Pick one (“room”) everywhere. |
| “The trustees grant a university charter once a lab is at work.” | `src/components/Pennant.tsx:54` | Dock and toolbar | “The trustees” in 3 rows (also persistence.ts:83, AthleticsTab.tsx:239); “the board” in 29. | “The board grants …” |
| “Open the Faculty board on {field}: its people, the market, a search” | `src/tabs/CurriculumTab.tsx:1200` | Curriculum tab | *Board* also names the Faculty screen here and at FacultyTab.tsx:680 (“across the whole board”), beside the Board. | “Open the Faculty tab on {field} …” |
| “New game” | `src/components/MainMenu.tsx:76` | Menu | Starting over has three names: this, “Found a new college” (TitleScreen.tsx:61) and “Found another college” (ReportCardActions.tsx:53). The session is also “the run”, “the save” and “The game also saves itself” (MainMenu.tsx:58). Plan 47 calls it “New game” on both screens. | One label, e.g. “Found a new college”, and update Plan 47. |
| “Release” | `src/tabs/AthleticsTab.tsx:82` | Athletics tab | Letting staff go is “Dismiss” for faculty (FacultyTab.tsx:159) and “Release” for coaches. As an armed label, “Release” neither starts “Confirm —” nor says what is lost (compare “Confirm — demolish”, BuildingInfoPanel.tsx:580). | “Confirm — release; the post stays open” |
| “Move to slot {slot + 1}” | `src/components/BuildingInfoPanel.tsx:279` | Building panel | Two more armed labels break the *Confirm — …* pattern: this one (which does not say what is lost) and “Move {program.name} — dark” (BuildingInfoPanel.tsx:225). | “Confirm — {program} closes {n} weeks” |
| “An event has passed” | `src/components/InterruptModal.tsx:1159` | Modals (summer, events, letters) | The same lapsed-matter fallback has two titles: this and “A matter set aside” (InterruptModal.tsx:49), over the same body. “Event” is also the system’s word, not the college’s. | “A matter set aside” for both. |
| “The Curriculum” | `src/tabs/CurriculumTab.tsx:1381` | Curriculum tab | Case: “The curriculum” two lines later (CurriculumTab.tsx:1386). | Sentence case for both. |
| “Satisfaction Breakdown” | `src/tabs/EnrollmentTab.tsx:181` | Students tab | Case: the heading it points to reads “Satisfaction breakdown” (StudentLifeTab.tsx:236). | “Satisfaction breakdown” |
| “Basic Needs” | `src/tabs/StudentLifeTab.tsx:19` | Students tab | Case: “Basic needs” on the next-step line (nextStep.ts:67). | “Basic needs” |
| “Capital Projects” | `src/components/BuildPopup.tsx:58` | Build menu | Case: “Capital projects” in the standings (prestigeSystem.ts:300). | “Capital projects” |
| “Academic Halls” | `src/components/BuildPopup.tsx:99` | Build menu | Plan 47 wants sentence-case headings. Also “Chapter Houses” (BuildPopup.tsx:116), “Campus Tools” (:214), “Monuments & Gardens” (:57), “Grand Landmark” (:56), “Varsity Athletics” (AthleticsTab.tsx:220) and “Fall Term” (StatusHeader.tsx:73). | “Academic halls”, “Chapter houses”, … |
| “Head Coach” | `src/tabs/AthleticsTab.tsx:48` | Athletics tab | Case: “head coach” (studentLifeData.ts:845) and “head coach, assistant and trainer” (AthleticsTab.tsx:395). | “Head coach” |
| “An athletic director” | `src/components/InterruptModal.tsx:979` | Modals (summer, events, letters) | Case: “Athletic Director” everywhere else (AthleticsTab.tsx:233, reducer.ts:597). | “An Athletic Director” |
| “from the Build menu” | `src/components/CampusMap.tsx:1805` | Campus map | Case: “the build menu” in the walkthrough (openingData.ts:37) and “Open build menu” (Toolbar.tsx:125). | One form. |
| “which the Dean regards as a healthy sign” | `src/data/foundingNotes.ts:13` | Founding notes | Case: “the dean” in the quirks (quirkData.ts:52; also “the dean's.” (quirkData.ts:36)). | One form. |
| “while the work is underway” | `src/components/BuildPopup.tsx:333` | Build menu | *Underway* here; *under way* elsewhere (demolition.ts:84, yearInReview.ts:129, CurriculumTab.tsx:1127). | “under way” |
| “Keep {weeks} wk” | `src/tabs/EndowmentPanel.tsx:82` | Treasury tab | Plan 47 breach: compact durations read *Nw*. | “Keep {weeks}w” |
| “under construction · {weeksLeft}w left” | `src/components/CampusMap.tsx:266` | Campus map | Two neighboring map labels, two formats: this and “{topic} · {run.weeksRemaining} week{run.weeksRemaining === 1} to go” (CampusMap.tsx:517). | “{n}w left” for both. |
| “, eight weeks” | `src/components/BuildingInfoPanel.tsx:547` | Building panel | Building buttons give durations three ways: *Renovate · $…, eight weeks* (this row), “Add a story ·” … “weeks,” (BuildingInfoPanel.tsx:522) and “{money(t.cost)} ·” … “w” (BuildPopup.tsx:455). | “Renovate · {cost} · 8w” |
| “is launched: ${(target / 1e6).toFixed(1}M over {def.years} years.” | `src/systems/alumni/campaigns.ts:61` | Alumni and campaigns | Money written three ways. This log line hand-rolls *$12.0M*; `moneyShort` would print *$12M*; other log lines use `money` (*$12,000,000*, e.g. sweep.ts:73). Salaries too: “asks {money(c.salary)}” (CurriculumTab.tsx:521) vs “at {moneyShort(l.pay)}/yr” (FacultyTab.tsx:313). | One helper per context: `money` in prose, `moneyShort` in compact labels. |
| “which grows six percent a year” | `src/tabs/EstatePanel.tsx:35` | Treasury tab | Numbers as words in UI prose (“six percent”; “fifteen percent” and “a tenth” in tagData.ts:27, :21) beside *N%* in the same Treasury tab (TreasuryTab.tsx:93). Low. | “6% a year” |
| “Developed: {name}.” | `src/data/logWords.ts:61` | Log | The building log uses the course verb. The other building lines say built and finished (“The builders are out of {name}.”, same row group). | “Built: {name}.” |
| “the grade reads curriculum, teaching, students, research, satisfaction, campus life and the estate.” | `src/data/figureHints.ts:12` | Help hints | The prestige hint leaves out the endowment, which the History tab lists as an input (HistoryTab.tsx:334). | “… campus life, the estate and the endowment.” |
| “The board climbed to {rung}” | `src/data/chronicleData.ts:37` | Chronicle | Direction flips: the Treasury walks the college “down the board's ladder” (TreasuryTab.tsx:181). | “The college fell to {rung} …” |
| “The market turns over constantly — or pay for a search.” | `src/tabs/CurriculumTab.tsx:511` | Curriculum tab | The same fact, two ways: “The market turns over every week” (FacultyTab.tsx:492). | “every week” in both. |
| “Up to #{now} in the rankings.” | `src/components/Toasts.tsx:43` | Dock and toolbar | The ranking publication has five names: “the rankings” (this), “the guide” (InterruptModal.tsx:618), “the guidebooks” (EndowmentPanel.tsx:85; the identity tags also belong to “the guidebooks”), “the academic table” (figureHints.ts:10) and “Six tables” (StandingsPanel.tsx:23). | “the guide” for the ranking; “the guidebooks” for reputations only. |
| “The college's name: graded each summer” | `src/data/figureHints.ts:12` | Help hints | The Prestige figure is glossed as *the college's name* (also figureHints.ts:32, StandingsPanel.tsx:23), while *reputation* means the guidebook tags (IdentityPanel.tsx:18). Low. | “Prestige: graded each summer …” |
| “Final mark” | `src/systems/admissions/resolveAdmissions.ts:81` | Admissions | The final score is a “mark” (also “The mark”, reportCard.ts:104); every yearly score is “graded” (resolveAdmissions.ts:224). | “Final grade” |
| “Recognize a society and it costs a little every week” | `src/components/InterruptModal.tsx:110` | Modals (summer, events, letters) | “Society” only here; “student organization” and “club” everywhere else. Low. | “Recognize an organization …” |
| “Halls near a library” | `src/systems/satisfaction/satisfactionSystem.ts:286` | Satisfaction | The next label names the same buildings “Residences near a dining hall” (same line). | “Residence halls near …” for both. |
| “Tuition, the payroll and the size of the catalog” | `src/data/boardData.ts:13` | Board letters | Serial comma is mixed: most lists omit it (this row), but a dozen or so use it, e.g. “a bench, a project, and their name” (quirkData.ts:53). American house style usually keeps it. | Pick one and apply it. |
| “Enrollment” | `src/tabs/HistoryTab.tsx:345` | History tab | The same count is “Enrolled” in the table on the same tab (HistoryTab.tsx:240) and in the header (StatusHeader.tsx:134). Low. | “Enrolled” for both. |

### 6. Vague or empty lines (23)

Lines that say nothing specific, and hints that restate the label they sit under.

| Quote | file:line | screen | issue | suggested rewrite |
|---|---|---|---|---|
| “Nothing to report.” | `src/state/yearInReview.ts:172` | Summer review | The Students section’s empty line says nothing; its siblings are specific (“No appointments and no departures.”, yearInReview.ts:109). | “No demands, petitions or departures this year.” |
| “A residential tower with shops and a food hall at street level.” | `src/data/campusData.ts:61` | Building names and blurbs | Four tiers, one sentence (identical at campusData.ts:62, :63, :64); nothing tells them apart. | Give each tier its size or feature. |
| “A residential village: a dozen small houses around a shared green, on one large plot.” | `src/data/campusData.ts:57` | Building names and blurbs | Identical for two tiers (campusData.ts:58). | Differentiate the second. |
| “— build for it” | `src/systems/guidance/nextStep.ts:202` | Next-step line | The next-step line names a weak need but not what to build. | “Housing is at 41: a residence hall would raise it” |
| “As the system says” | `src/components/SettingsPanel.tsx:35` | Settings | Vague option label (it follows the device’s reduced-motion setting). | “Match the device setting” |
| “The catalog has crossed several milestones at once.” | `src/components/InterruptModal.tsx:738` | Modals (summer, events, letters) | Restates the heading above it (“{payload.entries.length} milestones reached”). | Drop it, or name the milestones. |
| “The share of the pool the college chose to admit.” | `src/data/figureHints.ts:42` | Help hints | Restates its label, “Admit rate”. | “Admitting more takes weaker applicants; the class is still held to the room.” |
| “Students who will not come back next year, and why.” | `src/data/figureHints.ts:39` | Help hints | Restates its label, “Not returning”. | Say what drives it, or drop the hint. |
| “The price this class pays every year until it graduates.” | `src/data/figureHints.ts:41` | Help hints | Restates “Tuition for the incoming class” and its note “(locked for four years)” (InterruptModal.tsx:545). | Drop, or add what the lock protects against. |
| “Whatever the programs leave in the pot, returned to the college's budget.” | `src/tabs/AthleticsTab.tsx:289` | Athletics tab | Restates its label, “Back to the college”. | Drop, or say when it is paid back. |
| “The board notes it with relief, and with its confidence.” | `src/data/boardData.ts:48` | Board letters | The last clause says nothing measurable. | “… with relief, and its confidence rises.” |
| “below a line, fewer come back each summer.” | `src/data/figureHints.ts:13` | Help hints | Which line? | “below {n}, fewer come back …” |
| “worth {fromResults.toLocaleStri} of these.” | `src/systems/admissions/cohorts.ts:343` | Admissions | *These* has no clear antecedent. | “worth {n} applicants of this kind.” |
| “Read, not counted.” | `src/tabs/HistoryTab.tsx:156` | History tab | Cryptic label. | “Shown for reference; not part of the grade.” |
| “Over” | `src/tabs/FacultyTab.tsx:568` | Faculty tab | A heading that says nothing without its tooltip. | “Short-staffed” |
| “and asking cools the ledger a little.” | `src/tabs/AdvancementPanel.tsx:35` | Treasury tab | Vague: which ledger? | “and each campaign cools alumni warmth a little.” |
| “The faculty's characters” | `src/systems/satisfaction/satisfactionSystem.ts:282` | Satisfaction | Vague label for the quirks’ effect on satisfaction. | “Faculty personalities” |
| “The standing body” | `src/tabs/EnrollmentTab.tsx:117` | Students tab | Obscure heading. | “The student body” |
| “a national reading counts in full” | `src/systems/prestige/prestigeSystem.ts:335` | Standing (History tab) | Vague. | “the guide gives full credit from {n} students” |
| “and one other thing.” | `src/tabs/IdentityPanel.tsx:18` | Students tab | Coy; the tags do list their third effect. | “and one effect of its own, listed with each.” |
| “and the board reads every term.” | `src/data/figureHints.ts:9` | Help hints | Reads what? | “and the board reviews them every term.” |
| “at the summer, prestige closes” | `src/tabs/HistoryTab.tsx:108` | History tab | Unidiomatic and vague. | “each summer, prestige closes …” |
| “Capacity unknown.” | `src/components/BuildingInfoPanel.tsx:619` | Building panel | Empty fallback (low). | Hide the row when there is no figure. |

### 7. The ten best lines (10)

The voice working: specific, dry, in-world, often with the consequence in the last clause.

| Quote | file:line | screen | issue | suggested rewrite |
|---|---|---|---|---|
| “Three terms frozen, and no recovery in sight. The board is cutting maintenance to nothing, and will not let the listed tuition fall, until the books are in surplus again. The buildings will show it. The board regrets that, and has decided it is the cheaper regret.” | `src/data/boardData.ts:21` | Board letters | Consequence, cause and cost in four sentences, with a dry close. | Keep. |
| “A campaign for endowed chairs: money that pays a salary forever rather than a salary this year. The letters go to the classes who remember being taught, and to the ones who remember not being.” | `src/data/campaignData.ts:57` | Alumni and campaigns | Explains the mechanic (endowment versus salary) in-world, then turns it. | Keep. |
| “A good degree at a price a family can say out loud.” | `src/data/tagData.ts:29` | Identity tags | A guidebook line, exact about who pays. | Keep. |
| “A campus this size needs a clinic, not a nurse.” | `src/data/ladderData.ts:195` | Ladder and milestone notes | A milestone that opens a building with one concrete contrast. | Keep. |
| “Has announced a retirement four times, and is currently between announcements.” | `src/data/quirkData.ts:59` | Faculty (bios, quirks, log) | Specific count, deadpan. | Keep. |
| “{ad.name} has been on the telephone since the final whistle.” | `src/components/InterruptModal.tsx:894` | Modals (summer, events, letters) | Shows the title’s effect through one person’s behavior. | Keep. |
| “A bell tower taller than anything for miles: the college on every postcard, and a clock the town sets its watches by.” | `src/data/facilitiesData.ts:461` | Building names and blurbs | Blurb that says what the building does for the college. | Keep. |
| “Six programs, one building. This is the School of {school}.” | `src/systems/techtree/techSystem.ts:581` | Curriculum (log, gates) | Restates the rule as ceremony. | Keep. |
| “Gifts and bequests: the routine of being given money.” | `src/data/seatData.ts:91` | Administration | An administrator’s view of fundraising in eight words. | Keep. |
| “A campus with nothing on it after five o'clock is the complaint, and it is a fair one. The student body has asked, formally, for {theName(ask)}.” | `src/data/demandData.ts:85` | Student demands | The administrator concedes the point and names the ask. | Keep. |

Also strong:

- “No course is being taught, so there is no teaching to be good at.” (`src/systems/prestige/prestigeSystem.ts:381`, Standing (History tab))
- “Read each summer. The net is the year's change in cash on hand, so a year that built something big reads low.” (`src/tabs/TreasuryTab.tsx:259`, Treasury tab)
- “The Final Report is written at the fiftieth summer, and drafted from the tenth: a college is not graded on its first decade.” (`src/data/reportData.ts:103`, Final Report)
- “A quiet year: nothing reached the President's desk.” (`src/state/yearInReview.ts:239`, Summer review)
- “A campaign to put the old buildings right, addressed to people whose photographs of the place have scaffolding in them. The Development Office has enclosed one of the photographs.” (`src/data/campaignData.ts:84`, Alumni and campaigns)
- “Endowed before anyone alive was born, and dressed for it.” (`src/data/tagData.ts:30`, Identity tags)
- “Four scholars across disciplines, five years. The work prizes are given for.” (`src/data/researchData.ts:261`, Research)
- “The college has spent more than it took in for two terms running. The board would like to see a surplus before it sees another building. Tuition, the payroll and the size of the catalog are the usual places to look.” (`src/data/boardData.ts:13`, Board letters)
- “Sits on every committee, chairs three, and calls this service.” (`src/data/quirkData.ts:33`, Faculty (bios, quirks, log))

### Summary

| Section | Rows |
|---|---|
| 1. Frame breaks | 33 |
| 2. Register slips | 21 |
| 3. Jargon a new player would not know | 30 |
| 4. British English | 31 |
| 5. Inconsistency | 34 |
| 6. Vague or empty lines | 23 |
| 7. The ten best lines | 10 |
| Issues in sections 1–6 | 172 rows (155 distinct strings; 15 strings appear in two or three sections) |

Many rows stand for several strings (e.g. “tick” ×5, “revealed” ×9, the game-speed lines ×8, “estate” ×8, “slot” ×42).

**Screens with the most issues** (rows in sections 1–6, by the quoted row’s screen):

| Screen | Rows | By section |
|---|---|---|
| Modals (summer, events, letters) | 15 | §1: 2, §2: 6, §3: 3, §5: 3, §6: 1 |
| Building names and blurbs | 14 | §1: 3, §3: 5, §4: 4, §6: 2 |
| Students tab | 13 | §1: 5, §2: 2, §3: 2, §5: 2, §6: 2 |
| Build menu | 12 | §1: 1, §2: 1, §3: 6, §4: 1, §5: 3 |
| Help hints | 11 | §1: 1, §3: 1, §4: 2, §5: 2, §6: 5 |
| Treasury tab | 10 | §1: 4, §4: 3, §5: 2, §6: 1 |
| History tab | 8 | §1: 2, §3: 2, §4: 1, §5: 1, §6: 2 |
| Building panel | 8 | §1: 1, §3: 3, §4: 1, §5: 2, §6: 1 |
| Athletics tab | 7 | §2: 1, §3: 2, §4: 1, §5: 2, §6: 1 |
| Faculty (bios, quirks, log) | 6 | §2: 1, §4: 5 |

**The five fixes that would most improve the voice**

1. **Take the engine out of the prose** (§1: 33 rows standing for about 50 strings). Replace “the weekly tick”, “the run”, “the rest of the game”, “beat”, “interrupts play”, “unlocks”, “revealed”, “earned”, “throttle”, “pacing”, “campus state”, “floored”, “pts” and “bonus”, and stop dressing the game-speed control as the college’s calendar (“The year can run at up to eight times.”, 8 strings). The worst clusters: the Treasury explanation (`TreasuryTab.tsx:181`, `:68`), the Students tab help (`StudentLifeTab.tsx:78`, `:296`, `:313`, `:355`), the Final Report (`reportData.ts:90`, `:94`, `:104`) and the building blurbs (“Unlocks once …”).
2. **One word per thing, and a glossary in Plan 47** (§3, §5). First: a hall’s places are “slots” in 19 rows but “rooms” in the walkthrough and in the first-hall milestone, whose next line says “slots” (`ladderData.ts:125` against `:126`). Then split “seat” (5 meanings in 31 rows), “ladder” (2 systems), “gate” (3), “tier” (4), “ceiling” (4), “standing” (5) and “dark” (2), and replace the code names that leak through: “The wall”, “housed”, “the recreation chain”, “flat”, “cohort signal”, “varsity-active”, “initiative”.
3. **Put the rankings and admissions modals in the house voice** (§2). The summer rankings modal (`InterruptModal.tsx:615`, `:620`, `:621`, `:648`, `:673`) and the price labels (`InterruptModal.tsx:133`–`:136`, `cohorts.ts:24`) are the one place the game cheers, contracts and calls the college “you”, and every player sees them every summer. Expand the five contracted rows while there (`BuildPopup.tsx:721`, `StudentLifeTab.tsx:197`, `:238`).
4. **Finish the American pass** (§4, 31 rows): “the estate” (8 rows), “table/tables” for rankings (3), “round” for around (4), “flat” and “apartment block”, biscuits, “marks”, “full marks” and “Final mark”, “bursary”, “to read a subject”, “dear”, “Welfare”, “Handover”, “charity”, “first-years” and “the upper years”; plus the nine confirmed automated flags and “organisational”. Add these words to the scanner’s list in `tools/review/strings.ts` so they stay caught.
5. **Hold Plan 47 to its own rules** (§5). The summer review still labels the catalog’s letters “from the board” (`yearInReview.ts:228`); “Keep {weeks} wk” should read *Nw* (`EndowmentPanel.tsx:82`); three armed labels skip “Confirm — …” and what is lost (`AthleticsTab.tsx:82`, `BuildingInfoPanel.tsx:225`, `:279`); Title Case headings remain (the Build menu’s groups, “Varsity Athletics”, “Basic Needs”, “Satisfaction Breakdown”, “Capital Projects”); and starting over has three names (“New game”, “Found a new college”, “Found another college”).

### Other notes

- **Coverage.** All 3,711 in-scope rows were read. About 52 are code rather than prose, and were read but not judged: IDs such as “program-established:”, the report card’s SVG markup (`reportCard.ts:96`–`:130`), CSS (`TouchTitles.tsx:14`, `CurriculumTab.tsx:897`), hash keys, font stacks, file names, and the faculty name-origin groups (`facultyData.ts:131` etc., which the UI never shows). About 16 more are developer-only: the audio “Listening bench” (`AudioBench.tsx`) and the playtest log lines (`reducer.ts:118`–`:130`, `:733`, `:757`).
- **Not in the table.** The faculty quirk names (the `name` fields in `src/data/quirkData.ts`, shown as a badge by `FacultyTab.tsx:122`) were not extracted; two are British: “Answers email by post” (`quirkData.ts:43`) and “Marks overnight” (`quirkData.ts:50`). The summer review’s “answered by you”, “by the seats” and “left to take its/their default” (`yearInReview.ts:233`–`:235`) are missing too, and carry the jargon “seats” and “default”. Worth adding to `tools/review/strings.ts`. (These quotes come from the source, not the CSV.)
- **Credits.** `Credits.tsx:16` credits “Louis Miyani”. Worth the owner confirming the spelling.
