# Appendix to area 2: the voice

Plan 86, area 2. Commit read: `4062bfb`. The standard is the one Plan 76F wrote into Plan 47's §2: a senior administrator's dry, specific prose in American English; the college is "the college", not "you" (the chair's letters and the walkthrough excepted, since they are written to the President); no contractions, exclamation marks or cheer; the engine stays out of the prose; one name per thing.

**What was read.**

- **The whole table, by the scanner.** `npm run review:strings` over `src/`: **7,451 strings, 54,036 words** (October: 6,821 and 47,015). It needs two small changes for Plans 84 and 85, made in this review (see the "As run" note in `2-ui-and-text.md`): the specialization's files had no screen and fell into "Other" (3,198 words), and "pillar", "specialization", "potential" and "training pick" joined its jargon list.
- **Every string added since October, by hand.** The screens Plans 77, 78, 80, 84 and 85 added or rewrote: the Inbox (113 rows), the Faculty tab with its tile and person page (282), the specialization's choice and notice (59) and its four programs (133), History's pillar breakdowns and the standings (179), the next-step line (35) and the help hints (39), plus the six town-and-gown events and the spring festival. About 850 rows, 6,000 words.
- **The October appendix's 172 issue rows**, spot-checked: fourteen of its named problems were searched for on `HEAD` ("eight times", "Keep {weeks} wk", "Found a new college", "Found another college", "You've entered", "Big movers", "the estate" for the campus, "biscuits", "full marks", "Varsity Athletics", "Basic Needs", "weekly tick", "from the board" in the summer review, "rooms" for program slots). None remains.

One reader, a model. The judgments of what reads well are the reviewer's.

### The scanner, October and now

| Check | October (`58fa3fd`) | After Plan 76F | `HEAD` |
|---|---:|---:|---:|
| Strings / words | 6,821 / 47,015 | 6,814 / 47,083 | **7,451 / 54,036** |
| British spellings | 38 | 0 | 1 (`grey`, the name of a drawing mask in `canvasPaint.ts:1065`, not shown) |
| British idioms (for a person to judge) | 68 (old list) | 10 (new list) | 11: "proper" ×5 in event labels, "queues" ×2 (operations research, stands), "Autumn" in Settings (Plan 82, see §4), "flat roofs", "the Sunday before term" |
| Engine words in the prose | — | 68 → 0 | **0** |
| Second person (you, your) | 58 | 40 | **37** |
| Contractions | 4 | 0 | 0 |
| Exclamation marks | 0 | 0 | 0 |
| Repeated sentences (four words or more) | 22 | 22 | 28 |

The words grew by 7,000 since October, almost all in Plans 84 and 85: the specialization's choice, notice and programs are 2,950 words, the Faculty tab 1,500. The longest new strings are the specialization notice (118 words, `specializationData.ts:294`), the Faculty tab's help (103), and the History and standings helps (132 and 110), each of which now explains the four pillars.

---

### 1. Frame breaks (2)

| Quote | Where | Issue | Proposed |
|---|---|---|---|
| "Still to come" / "Arrives in a later update." | `specializationData.ts:271-272` (`CHOICE_WORDS.coming`, `comingNote`) | A software release spoken from inside the college. Dead today, since every mechanic is `ready: true` (`:208-247`), but one flag away from printing on the run's one permanent choice. | Delete the block and the `ready` flag now that Plan 85 has landed. |
| "Joined Test University University in Year 8, fall term." | the person page, on every scenario save | Not the game's: the harness founds its colleges as "Test University" (`sim/harness/game.ts:44`), which the founding form would strip, and the charter adds a second "University". It shows in every review capture. | Found the harness's colleges as "Test" or another bare name. |

### 2. Register slips (3)

| Quote | Where | Issue | Proposed |
|---|---|---|---|
| "…about 13 more appointments at the course slots a new hire brings, fewer if you keep them long enough to grow." | `FacultyTab.tsx:694` | "You" in the Faculty tab's summary line, the most read sentence on the tab. | "…fewer if the college keeps them long enough to grow." |
| "Open the Curriculum on the {field} courses still ahead of you" | `FacultyTab.tsx:263` | "You" in a tooltip. | "…the {field} courses not yet developed" |
| "Each seat takes its domain's routine off your desk … answers by your policy … still comes to you" | `AdministrationPanel.tsx:32` | The help speaks to the player as the President, three times in one hint. The rule lets letters do that; a help hint is the game's voice. | "…off the President's desk … by the policy set for it … still comes to the President". |

The other second-person rows are of the same kind: the Athletics tab's market ("a sport you field", "a potential you cannot quite see", "Show only who you need", `AthleticsTab.tsx:163, 180, 206`), the admissions panel ("what you have built", "Your decision, not a reading", `EnrollmentTab.tsx:168, 173`), the enrolled chip's hint ("the class you admit", `figureHints.ts:25`), and two decision events' answers ("and you will not be asked again", "will eventually bring you its own problems", `eventData.ts:511, 523`). Fifteen strings, each a word or two to change.

### 3. Jargon a new player would not know (4)

| Quote | Where | Issue | Proposed |
|---|---|---|---|
| "Opens the faculty training program's share of academics, worth 28 points" (and 28, 34, 34 on the other cards) | the specialization's four cards (`specializationData.ts:261-264`, `opensLine`) | "Points" of what? They are pillar points (the pillar runs 32 to 150), worth 9.8, 7.0, 8.5 and 5.1 points of prestige. The card that reads largest is worth least. See B2-3. | "…worth up to 9.8 points of prestige (28 of academics, which counts for 35%)". |
| "the academics pillar's specialization term is full at 40%" beside "for a term they teach one course fewer" | the Faculty tab's training bar (`trainingData.ts:95, 97`) | "Term" is both the prestige formula's word for a share of a pillar and the academic term, one line apart. The cards, the notice and the Research tab say "share" for the first. The History rows ("The term is full from 12"), `specializationStatus` ("each pillar's specialization term is empty") and the three programs' term lines say "term". | "Share" everywhere a pillar's part is meant; "term" for the calendar only. |
| "($159,323 at a prestige-50 market)" | the person page's Pay (`careerWords.ts:39`) | A term the game never defines: the salary before the market-rate multiplier. | "(the market rate at founding: $159,323)". |
| "DISTINGUISHED" over a professor's name | the tile's rank line (`FacultyTile.tsx:150`) | The glossary's word for a program's and a school's top stage. The person page then says "Taught in Political Science, a distinguished program" under a professor ranked Distinguished. | "Senior", or the US ranks (Professor, Associate, Assistant). |

### 4. British English (2)

| Quote | Where | Issue | Proposed |
|---|---|---|---|
| "Autumn leaves and winter snow on the campus, or its summer green all year." | `SettingsPanel.tsx:51` (Plan 82's seasons) | "Autumn" is good American English but the scanner's list flags it, and the game's calendar says "Fall term". | "Fall leaves and winter snow…", or excuse "autumn" in the scanner. |
| "Throw them a proper reception", "Appoint a proper manager", "Commission a proper mural", "a proper telephone campaign" (and "Fund it properly", "Strip it out properly") | `eventCatalogue.ts:109, 373, 726, 1286`; `eventVariants.ts:200` | Plan 76F left the catalogue's "proper" ×5 as reading American. In an answer's label it is the one British tic a player meets often, and "a proper manager" implies the current one is not. | "Hold a reception", "Hire a professional manager", "Commission a mural", "a telephone campaign". |

"A code of practice" (`town-rents`, "Press the landlords for a code of practice") reads British too; "a code of conduct" is the American phrase.

### 5. Inconsistency (6)

| Quote | Where | Issue | Proposed |
|---|---|---|---|
| "Each pillar holds a share only its own specialization fills, so without one no pillar reaches the top" | History's help (`HistoryTab.tsx:47`), the standings' help (`StandingsPanel.tsx:32`), the guide's help (`RankingsPanel.tsx:25`), the choice's intro (`specializationData.ts:269`), the notice (`:294`), the status line (`:146-147`) | Plan 85's rule in six places in six wordings; the four weights ("35%, 25%, 25% and 15%") in five. Each restatement is a place for a retune to leave a stale number. | Say it once, in History › Prestige's head, with the numbers read from `PILLAR_WEIGHTS`; let the others point there. |
| "Seven rankings, one field." / "The six standings, graded over the arc" | `StandingsPanel.tsx:32`; `reportData.ts:104, 112` | The History tab counts prestige among its rankings; the Final Report counts six standings without it; Plan 47's glossary still says six. | "Prestige and six standings" in the History help; the glossary updated. |
| "{n}/{m} slots"; "Move {program} to {hall}, slot {n}" | `FacultyTile.tsx:209`; `BuildingInfoPanel.tsx:282` | A bare "slot", which the glossary forbids (it means three things). | "9/10 course slots" (or "9 of 10 courses"); "program slot {n}". |
| "Nobody answered in time, so it took its default." | `InboxTab.tsx:464` | The glossary's word for a default is "left unanswered". | "Nobody answered in time, so it was left unanswered: {answer}." |
| "the Spring Term's fourth week" | `downtownData.ts:231, 240` | The glossary and the dock say "Spring term". | "the fourth week of the Spring term". |
| "Program established: Film (Arts & Media)" / "Founded Finance in Founders Hall" / "Linden Hall takes in a new program: Music" / "Completed: Mensah School of Arts & Media" | the summer review's Built list (`logWords.ts:63`, `techSystem.ts:646`, `yearInReview.ts:97`) | Four grammars for program news in one list, two of them with a label and a colon. | One shape, a sentence each: "Film is established in Arts & Media", "Finance is founded in Founders Hall". |

### 6. Vague or empty lines (3)

| Quote | Where | Issue | Proposed |
|---|---|---|---|
| "'Continuous-Flow Synthesis at Plant Scale' has concluded after 26 weeks: 0 publications, 0 breakthroughs." | the research log line (`researchSystem.ts:130`; the ticker and the inbox's bulletins) | Bare zeros where a sentence would say it, and "publications" where the person page says "papers". | "…has concluded after 26 weeks with no paper and no breakthrough." |
| "Every matter settled, by the President, a seat or the clock, is kept here." | `InboxTab.tsx:171` | The Answered list reads the activity log's 200 lines, so a late game keeps a year or two (Plan 77A). | "The matters settled lately, by the President, a seat or the clock." |
| "…a little with prestige." | `FacultyTab.tsx:436` | Research potential follows prestige at 30%, research standing at 70%: "a little" undersells a third. | "…and their research potential mostly with its research standing, partly with prestige." |

### 7. The ten best lines (10)

New since October, and in the house voice at its best:

1. "The owner has already had the crest painted, slightly wrong, and is prepared to discuss the lion." (`town-bar`)
2. "They promise to put it back exactly as they found it, and have attached a plan of the stalls drawn on the back of a menu." (`town-street-festival`)
3. "The hardware store has offered to hang them, and has been asked not to." (`town-colors`)
4. "…citing demand, which the college created, and the downtown, which the college also created." (`town-rents`)
5. "The merchants have pointed out, more than once and in writing, that a spring without a festival is a spring the town remembers." (the spring festival)
6. "A headline gala does all of that and seats the alumni at dinner, where they are reliably generous." (the spring festival)
7. "Where they come from. It changes nothing in their work." (the person page's nationality note: a rule said as a fact about a person)
8. "The council's own half is to come from a parking fee that the council has not yet voted on and the merchants have already opposed." (`town-night-buses`)
9. "Others kept the name they opened under and were none the worse for it." (the charter)
10. "{n} national titles of the 12 a dynasty is." (athletics' championships row)

### Summary

| Section | Rows |
|---|---|
| 1. Frame breaks | 2 |
| 2. Register slips | 3 (standing for 15 strings) |
| 3. Jargon | 4 |
| 4. British English | 2 (standing for 8 strings) |
| 5. Inconsistency | 6 |
| 6. Vague or empty lines | 3 |
| 7. The ten best lines | 10 |
| Issues in sections 1–6 | 20 rows |

October found 172 issue rows over 155 strings; Plan 76F fixed them, and the spot-check found none back. The voice of the October text is now consistent, and the new text from Plans 77 to 85 mostly holds it. The town-and-gown events and the festival are as good as the best of the catalogue.

What is new is **weight, not slips.** Plan 85 explains itself in full sentences on every screen it touches, with the same rule restated six times and its term lines running 50 to 70 words ("The college is specialized in athletics: training at the Athletic Performance Complex, its programs have made 3 titles, 2 lost finals and 4 lost semifinals in the last 10 years, 5 points (a title counts 1, a lost final a half and a lost semifinal a quarter). It fills as that rises, full at 30."). Each is true (see `2b`), and each is a formula written out. That is the load finding B2-1 in `2-ui-and-text.md`.

**The three fixes that would most improve the voice now**

1. **One word for a pillar's part** (§3): "share", never "term", and the prestige value of a share on the specialization cards.
2. **Say Plan 85's rule once** (§5) and let the other five places point to it.
3. **Finish the glossary's last mile** (§5, §3): "course slots" on the tile, "left unanswered", "Spring term", seven rankings, and a rank word that is not "Distinguished". Add "slots" (bare), "default" and "Spring Term" to the scanner so they stay caught.
