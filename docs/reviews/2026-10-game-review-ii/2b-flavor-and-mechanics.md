# Appendix to area 2: flavor text against the code

Plan 86, area 2. Commit read: `4062bfb`. October's audit read 1,261 claims and found 109 false and 199 vague (`docs/reviews/2026-10-game-review/2b-flavor-and-mechanics.md`). Plan 76C and 76D set out to fix every one, by changing the words or building the effect. This appendix re-measures in two parts:

1. **October's 308 claims that were not true** (109 false, 199 vague), each looked up on `HEAD`. Where the quoted words are still in `src/`, the claim was read again against the code. Where they are gone, the row is marked *changed* and a sample of the new words was read (below). The rows, with a verdict and a reason each, are `data/blurbs.tsv`, `data/letters-promises.tsv` and `data/events-catalogue.tsv`, the October tables' names.
2. **The text added since October** that could imply a mechanic: the specialization's choice, notice and four programs (Plan 85), the faculty's person page and market (Plan 84), the pillar breakdowns and standings (Plan 85B), the inbox (Plan 77), the charter (Plan 78G), the six town-and-gown events and the spring festival. 83 claims, each read against the code: `data/new-text.tsv`.

October's 953 true claims were not re-read one by one. 210 of them have different words on `HEAD`; the sample of changed rows below covers some of them. One reader, a model. Each verdict cites a file and line.

**Verdicts**, as in October: *true*; *false* (the text promises what the game does not do); *vague* (a player could fairly read a mechanic into it that the game does not have).

## The re-measure

| Scope | October: claims | false | vague | `HEAD`: still false | false → vague | still vague | now true (read again) | words changed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Building blurbs, tags, quirks, research, clubs, Final Report, chronicle, alumni | 773 | 17 | 44 | 0 | 0 | 4 | 8 | 49 |
| Letters, promises, campaigns, seats, the ladder, figure and help hints | 215 | 26 | 48 | 0 | 0 | 1 | 7 | 66 |
| The event catalogue | 273 | 66 | 107 | 0 | 6 | 19 | 58 | 90 |
| **October's claims** | **1,261** | **109** | **199** | **0** | **6** | **24** | **73** | **205** |
| The new text (Plans 77–85) | 83 | — | — | **4 false** | — | **11 vague** | 68 true | — |

**The words that changed.** 205 rows' quoted words are no longer in `src/`. Plans 76C and 76D rewrote them under two tests that hold the rewrites in place: `test/text-true.test.ts` (the attrition teeth, the Jock School's points, the building fund, promise sums, the hall's price) and `test/event-truth.test.ts` (1,055 checks: every event can fire, the lever test on every answer's label, named buildings and classes). A sample of 25 changed rows was read on `HEAD`: the tag teeth (`tagData.ts:21-30`), the quirks October named (`quirkData.ts:26-55`), the Housing Campaign's kept line (`campaignData.ts:49`), the "Thirty scholars" promise (`promiseData.ts:184-192`), "A hall of its own" (`eventData.ts:1152`), the laboratories' and Research Park's gates (`projectData.ts:76`), the Pilot Study's "Rarely a paper", and fifteen relabeled event answers ("Freeze its budget", "Support the designation", "Adopt the swan", "Rebuild the east end as it was", "Find a year's savings in the payroll", "Tarp it and wait", and others in `eventCatalogue.ts`). All 25 are true.

**Judgment.** Plan 76's text pass did what it set out to do. No false claim from October survives; six became vague, and 24 vague ones remain, nearly all the recurrences and missing systems Plan 76D listed and sent to the backlog. The new text is also mostly true: Plan 85's numbers are read from its constants, and its rules match the code to the point. The four false claims it adds are two kinds of drift: words written before Plan 85 that it made wrong, and words written for board confidence after Plan 80C removed it.

---

## Building blurbs, identity tags, quirks and the Final Report

### What became of October's false claims (17)

All true or reworded. Read again where the words survive:

- **The Jock School's six points** reach every team (`teamQuality`, Plan 76C).
- **The Teaching College and Pressure Cooker attrition points** are applied at the summer by the preview's own `summerAttrition` (G7-4).
- **The Final Report's athletics axis** reads its own 0–100 scale (G7-5); "the books mostly balanced" reads the distress record; the chronicle's money line says "Cash on hand {net} over the era".

### Still vague (4)

| Where | Quote | Why |
|---|---|---|
| `quirkData.ts:33` | "Sits on every committee, chairs three, and calls this service." | No committee or service mechanic; seats pick by teaching and research, which this quirk lowers by 4 each. |
| `chronicleData.ts:44` | "The {ordinal} Campaign" | The ordinal counts campaign eras, not campaigns. |
| `alumniData.ts:23-24` | "under-taught" / "well taught" | Read from the campus course average at commencement, not over the class's four years. |

## Letters, promises, campaigns, seats, the ladder and hints

### What became of October's false claims (26)

All true or reworded. "A hall of its own" reads the hall's price and weeks from its Buildable; promise titles print the sum they are judged on, at the price scale of the summer they were made; the laboratories' letter names the Research Park's gates; "Turning people away" is offered only below a 50% admit rate.

### Still vague (1)

| Where | Quote | Why |
|---|---|---|
| `boardData.ts` (enter-2) | "The board would like to see a surplus before it sees another building" | Kept on purpose by Plan 76C: the board's wish, not a rule. Nothing stops building at Deficit. |

### New false claim in this group (1)

| Where | Quote | Why |
|---|---|---|
| `EndowmentPanel.tsx:36` | "Above 5% the board starts to worry." (and "— more than the board thinks prudent", `:55`) | `DRAW_RATE_PRUDENT` (`distress.ts:45`) is read by this panel and nothing else. Plan 80C removed board confidence, the only thing that could worry; no rung, letter or budget reads the draw rate. The October audit passed this line while confidence existed. |

## The event catalogue

### What became of October's false claims (66)

- **True or reworded (60).** Every effect-table error October listed is corrected: the cut costs (`recession`: both answers lose endowment), the boosters and the reunion class pay the supplier, the free hires cost what their siblings charge (`the-board-secretary`, `the-history`), the newspaper costs $30,000, "Put it into the buildings" pays once. The heating bill arrives in the Fall Term's last weeks and the dark term at the Spring Term's start (`state/winter.ts`, G7-3). The derelict letter names the derelict building; the repair letters the worst-kept one; the reunion gift a reunion class. Retirements, the trustee's twenty-six years and the secretary's thirty-one wait for a year when they are possible. A welcomed listing declares the building historic, a promise is made where a rise is promised, a bequest for a building goes to the building fund.
- **Now vague (6).** The label or text is true as far as it goes, but names a thing the game does not make:

| Event | Quote | Why |
|---|---|---|
| `the-championship-run` | "Let the boosters pay for the scoreboard" | No money now (warmth +2), but no scoreboard either. |
| `the-reunion-gift` (answer) | "Install the clock as given" | Warmth +3; no clock is installed. |
| `the-last-lecture` | "The longest-serving teacher in {program} retires in June" | Gated to year 26, but nobody leaves the roster. |
| `founding-faculty-last` | "The last of the founding faculty retires this year" | Gated to years 29–31, but nobody leaves, and nothing checks that a founder is still on the roster. |
| `sabbatical-overrun` | "The year's leave granted to {faculty} is now in its second year" | {faculty} keeps teaching; the game has no leave. |
| `the-reunion-gift` (telling 2) | "The {class} would like its reunion gift spent on a clock" | As the answer: the class is now a reunion class (fixed), but no clock follows. |

### Still vague (19)

Plan 76D's own list of what it left, each in `BACKLOG.md` under "Events that do what they say":

- **Recurrence after an answer settles it** (7): `the-boiler` (replace), `the-master-key` (key cards), `the-writing-requirement`, `the-grade-medians`, `the-closing-bell`, `the-term-limits`, `the-flood` (the defenses). Nothing records the answer, so the same matter can come back years later as if new.
- **A thing named but not drawn or kept** (2): `the-sinkhole` (no hole; repairs spread over the estate), `ivy-structural` (ivy drawn only on historic buildings).
- **{faculty} is anyone** (4 rows): `star-lecture` and `the-grant-windfall`'s three tellings want a professor chosen by strength.
- **Levers that do not exist** (6): `library-acquisition` (the library does not change), `the-essay-ring` (enrollment −40 scaled with the whole body, freshmen only), `the-matching-challenge` (the match is a fixed sum, not "a year of alumni giving"), `endowment-manager` (a one-off gift; the fund's return is fixed), `two-body` ("Say that nothing is possible": nobody leaves), `anonymous-gift` ("never be spent on administration": no restricted money for it).

## The new text (Plans 77–85)

83 claims; the rows are `data/new-text.tsv`.

| Source | Claims | True | Vague | False |
|---|---:|---:|---:|---:|
| The specialization: the choice, the notice, the status and closed lines (`specializationData.ts`) | 13 | 12 | 1 | 0 |
| The four programs: training, the research park, the complex, the downtown and festival | 27 | 26 | 1 | 0 |
| The six town-and-gown events and the charter | 8 | 5 | 3 | 0 |
| The person page and the market (`careerWords.ts`, `FacultyTab.tsx`) | 13 | 11 | 2 | 0 |
| History, the standings and the pillar breakdowns | 15 | 10 | 2 | 3 |
| The inbox | 5 | 4 | 1 | 0 |
| The endowment panel (board confidence) | 2 | 0 | 1 | 1 |

### False (4)

| Where | Quote | Why |
|---|---|---|
| `HistoryTab.tsx:236` | "Of {n} colleges, in the guide's academic ranking; #1 is the top." (the note under "Place in the guide, by year") | The chart plots the prestige rank. Since Plan 85 the guide ranks by prestige, the blend of four pillars, and "Academics" is a separate pillar ranking in the standings. A player comparing the chart with the standings looks in the wrong column. |
| `HistoryTab.tsx:228` | "The grade reads the curriculum, the teaching, the students, research, satisfaction, campus life, the buildings and grounds, and the endowment." (the Prestige chart's note) | Written before the pillars. It leaves out athletics, 15% of prestige since Plan 85B, and crowding. |
| `HistoryTab.tsx:260` | "Breadth is what lifts the prestige limit — the decades-long half of the climb." (the Catalog chart's note) | The only limit left is the teaching standard (`teachingCeiling`, `prestigeSystem.ts:464`), which reads grades, not breadth. Breadth is one term of academics, a pillar worth 35%: not half the climb. |
| `EndowmentPanel.tsx:36` | "Above 5% the board starts to worry." | As above: nothing reads the draw rate since Plan 80C. |

### Vague (11)

| Where | Quote | Why |
|---|---|---|
| `specializationData.ts:261-264` (`opensLine`) | "Opens the faculty training program's share of academics, worth 28 points" (28, 28, 34, 34 on the four cards) | The points are the pillar's (it runs 32 to 150), not prestige's. A pillar counts at its weight, so the shares are worth 9.8, 7.0, 8.5 and 5.1 points of prestige: athletics' "34" is worth least. On the one choice the game makes permanent, the cards' only comparable figure misleads (B2-3). |
| `prestigeSystem.ts:471` (the teaching standard) | "31% of courses graded A: standing can reach 127. A campus of B's reaches 128; only A's everywhere reach 150." (year 25) | The limit is read from the mean grade points, not the share of A's the sentence names, so a reader sees more A's lowering the limit. |
| `prestigeSystem.ts:566` | "{n} national titles of the 12 a dynasty is." | Titles are weighted by their sport's payoff (`titlesScore`, `:880-883`): the count is not what the bar reads. |
| `FacultyTab.tsx:436` | "…and their research potential with its research standing, and a little with prestige." | Prestige is 30% of the research potential's center (Plan 84B). |
| `careerWords.ts:39` | "($159,323 at a prestige-50 market)" | True, but the term is never defined. |
| `InboxTab.tsx:171` | "Every matter settled, by the President, a seat or the clock, is kept here." | The Answered list reads the log's 200 lines (Plan 77A). |
| `EndowmentPanel.tsx:55` | "— more than the board thinks prudent" | A label with no consequence (as the false row above). |
| `downtownData.ts` (the festival) | "A headline act fills the town's hotels for three nights." | No town economy; the effect is goodwill and applicants. |
| `town-bar` | "Accept on the college's terms: no drinks promotions" | The offer's fee is lost on these terms (no cash), which the label does not say. |
| `town-street-festival` | "Lend them the quad" (text: "They promise to put it back exactly as they found it") | Costs $30,000 and a point of mood: the text promises no damage. |
| `town-rents` | "raised the rents … for the third year running" | Can fire four years into the district; rents are not modeled. |

### Patterns

- **Plan 85's text is careful.** Every number on the cards, the term rows, the program bars and the hints is read from the constant that sets it (`FACULTY_PER_TRAINING_PICK`, `PARK_RESEARCH_BOOST`, `COMPLEX_HOME_EDGE`, `OFF_CAMPUS_SHARE`, `GOODWILL_FOR_FULL` and the rest), so a retune moves the words with it. Three exceptions are typed: the athletics card's "80" (`TEAM_QUALITY_KNEE`), the person page's "A from 78, B from 62" (`GRADE_A`, `GRADE_B`), and the four pillar weights written into five help texts ("35%, 25%, 25% and 15%"). All three match today.
- **Drift comes from plans that changed the rules under old words.** Three of the four false claims are History notes written for the single-target prestige that Plan 85B replaced; the fourth is a line that relied on board confidence, which Plan 80C removed. Neither plan's text pass reached them, because each re-read the strings it wrote, not the strings that described what it changed. The fix is a habit: when a plan changes a rule, grep for the rule's words (here "academic ranking", "the grade reads", "prestige limit", "board", "worry", "prudent").
- **The recurrences remain the catalogue's main vagueness**, as October found: an answer is not remembered, so a settled matter returns. That is a system (the backlog's "a memory of answers"), not a word fix.
- **Not counted here:** the canvas map's failure to draw the scaffold pattern on buildings under construction (`url(#campus-scaffold)`, reported by the gallery on most saves) is area 1's.
