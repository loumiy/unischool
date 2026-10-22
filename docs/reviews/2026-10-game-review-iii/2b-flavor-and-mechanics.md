# Appendix to area 2: the new text against the code

Plan 86's area 2, third review. Commit read: `b1f2114`. This uses review II's 2b method: the claim, where it is, what the code does, and the rewrite. One reader, a model, with every verdict citing a file and line.

**What was read:**
- every chapter's objectives and briefing (`src/data/chapterData.ts`, 18 chapters, 2,195 briefing words);
- the walkthrough (`src/data/openingData.ts`);
- the opening letters a guided or unguided run still gets (`src/data/eventData.ts:1143–1316`);
- the admissions page (`src/components/AdmissionsPage.tsx`);
- History › Prestige at a glance (`src/tabs/PrestigeGlance.tsx`);
- the summer Review's new lines (`src/state/yearInReview.ts`).

**The greps** for the rules that changed this week, over the string table (`npm run review:strings`, 8,472 strings), each hit read:

| Rule | Searched for | Player-text hits on `b1f2114` |
|---|---|---|
| Crowding retired (107E) | "crowd" | 1 left: "admitting more crowds 350 beds", already area 7's **I7-6**. The 7 others are game-day crowds and festivals. One comment, `prestigeSystem.ts:748`, is not shown. |
| Prestige opens at 32 (107F) | "42", "51.5", "40.5", "fifties" | none in player text. A comment says "the founding's low fifties" (`prestigeSystem.ts:48`), which Plan 107F asked to fix. |
| Founding faculty appointed (107A) | "appoint" (56 hits) | All read. None asks the player to appoint the founding three. |
| Admit rate held to the room (107G) | "86%" | none. The opening note reads the room ("opens at 23%, the most the seats left will hold"), but see row 18 below. |
| "Below top band" (107H) | "78", "Below A", "an A" | One left: "Professors below an A in teaching" (`FacultyTab.tsx:599`, a tooltip). See C2-9. |
| Walkthrough ends at the first program (106C) | "walkthrough" | "The walkthrough takes about five minutes" (row 16). |
| Research Park opens with the choice (F5) | "every lab", "finished a research project" | The laboratories letter and a NEXT line (row 17). |
| Board confidence gone (80C; review II's B2-2) | "worry", "prudent", "board" | Fixed in the endowment help (95E), but **back in a briefing**: "worries the board" (row 3). |

## The claims

Eighteen rows. 10 are false, 7 vague and 1 a wrong tick. The "Player sees it" column says when.

| # | Where | Claim | What the code does | Verdict | Player sees it | Rewrite |
|---:|---|---|---|---|---|---|
| 1 | `chapterData.ts:211` (A hall of its own) | "When three programs of one school share a hall, that school claims the hall and gives it its name." | The claim is at three (`schools.ts:87` `CLAIM_AT`), but the hall takes the school's name only when all six slots hold that school (`hallDisplayName` reads `dedicatedSchool`, `schools.ts:61`). The *Moving in* letter says this correctly: "Six found the school, and the hall takes its name" (`eventData.ts:1225`). | **false** | Y2–3, every guided player | "Three programs of one school claim a hall for it; six found the school, and the hall takes its name." |
| 2 | `chapterData.ts:133` (Paying for it, why) | "every building and course is paid from cash, and a freeze stops them all" | A freeze blocks buildings, not courses (`techSystem.ts:324`: `node.kind !== 'course' && constructionFrozen`). | **false** | Y1 wk 30 | "…a freeze stops new buildings; courses go on." |
| 3 | `chapterData.ts:126` (Paying for it, what) | "Cash under a term of expenses worries the board, and term after term of deficit walks the college down its scale, as far as a construction freeze." | Tight (cash under a term) is "a reading, not a step": no letter and no effect (`distress.ts:163`). Deficit terms alone stop at Deficit. Only cash at or below zero freezes (`rungByConditions`, `distress.ts:133–138`). At year 41 the Treasury reads "Tight" beside +$131M a year, because the sweep keeps cash low. | **false** | Y1 wk 30 | "Two deficit terms in a row mark the books Deficit; cash at zero freezes new buildings. The Treasury shows the board's reading." |
| 4 | `chapterData.ts:169` (Standing, how) | "History shows prestige's target and what makes up each pillar" | History hides the target. Plan 98B made it an arrow, and 107D's glance shows "↗" and "This year's grade is lifting it" with no target figure (`PrestigeGlance.tsx:17–26`). | **false** | Y2, the chapter that sends players to History | "History › Prestige shows which way prestige is heading and what each pillar adds." |
| 5 | `chapterData.ts:164, 436` (Standing) | Objective "Prestige's target above prestige"; readout "Prestige 42.8, its target 47.9" | True, but the drawer prints the one figure every other screen hides (98B). See C2-6. | vague | Y2 | "Prestige rising" (the arrow's own words). |
| 6 | `PrestigeGlance.tsx:59` | "Graded each summer, it climbs toward its grade and falls faster than it climbs." | Through year 5 it climbs faster than it falls: rise 0.45 against fall 0.30, and part of the climb comes weekly (`prestigeSystem.ts:53–70`, 107F). Chapter 7 says the opposite model: "Each drifts week by week toward a target." | **false** in Y1–5, true from Y10 | Y2 onward | One sentence for both screens: "Each summer's grade moves it; in the first five years it also climbs a little every week." |
| 7 | `chapterData.ts:232` (Campus life) | "A matter left unanswered decides itself after four weeks." | Timeouts run 1–6 weeks: 1×1, 26×2, 91×3, 28×4, 10×5, 4×6 (`eventCatalogue.ts`). Most decide in three. | **false** | Y3 | "A matter left unanswered decides itself when its weeks run out; the Inbox shows how many are left." |
| 8 | `chapterData.ts:240` (Campus life, why) | "the first sport club approved opens the Athletics tab" | Not in a guided run: the tab waits for *The teams* (`TabNav.tsx:38`, `gates.ts`). This is area 7's **I7-2**. | **false** in a guided run | Y3 | "…forms the first sport club; the Athletics tab opens with *The teams*." |
| 9 | `chapterData.ts:70` (The next course) | "The committee writes four courses at once, each over ten to fifteen weeks." | Weeks by tier: 4, 12, 24 and 28, ±25% (`techData.ts:38, 45`). So 3–5 weeks for an entry course and 21–35 for a capstone. The drawer's own Curriculum shows "4 of 4w", "18w" and "23w". | **false** for three tiers of four | Y1 wk 1 | "…each from a few weeks to half a year, longer the higher it sits." |
| 10 | `chapterData.ts:74` | "The clock runs at double speed from its second button, or press 2." | The buttons are Pause, Play, 2× (`StatusHeader.tsx:198`), so it is the third. | **false** | Y1 wk 1 | "…from the double-arrow button, or press 2." |
| 11 | `chapterData.ts:377` (Capital projects, why) | "each pillar has a share that only its capital projects fill" | Academics, research and student life have a *Capital projects* term. Athletics has none (`prestigeSystem.ts:591, 609, 877`; `athleticsBreakdown`, `:612`, passes `[]`). The words also echo the specialization's "a share only its own specialization fills". | **false** | Y10 | "academics, research and student life each count their capital projects." |
| 12 | `chapterData.ts:371` | "From year 10 the build menu offers capital projects: an arts center, a law school, a graduate college and more" | The arts center opens at year 10. The law school and the graduate college open at year 15 (`projectData.ts:60, 85, 91`). | vague | Y10 | "From year 10 the build menu offers capital projects, the arts center first; more open by year 15." |
| 13 | `chapterData.ts:270` (The teams) | "An athletic director runs the department: the coaches, and the order the fund pays the programs in." | The player drags the order (`AthleticsTab.tsx:664`). The director adds a lift and scouts (`:175, :250`). | vague | Y4 | "An athletic director lifts every team and scouts the coaches' market; the order is the President's." |
| 14 | `chapterData.ts:266` + `chapters.ts:216` (The teams) | Objective "Appoint an athletic director" is required; "Field a varsity team" is optional. | The director can be appointed only from the board's offer, which needs a varsity team (`eventSystem.ts:132–134`). The team needs a petition from a club of three years (`studentLifeData.ts:1022`). Nothing the player does brings either sooner, and the How lists no lever for them. The Athletics tab says "The board will put candidates forward before long." | vague (a required step with no lever) | Y4–5 | Make the varsity team the first objective and say how it comes: "Wait for a club's varsity petition, then accept it." |
| 15 | `chapters.ts:254` (Research) | Optional objective "Answer the board on the university charter" | It ticks on `universityCharterOffered`, which is set when the offer arrives, before any answer (`eventSystem.ts:88`). | wrong tick | Y7–10 | Read the answered record, or reword: "The board offers a university charter." |
| 16 | `openingData.ts:84` | "The walkthrough takes about five minutes." | It was seven steps in 0.1.2. Since 106C it is the welcome and two steps, a minute or two by hand. | **false** | Y1 wk 1, every new player | "The walkthrough is two steps." |
| 17 | `eventData.ts:1289`, `researchParkData.ts:156`, `nextStep.ts:360–383` | The laboratories letter: "The board asks one thing of you here: see a project through in every lab this college builds." NEXT puts "{lab} has not finished a research project yet — commission one" ahead of every other idle lab. | Since the F5 fix, finishing every lab opens nothing. The park opens with the research specialization (`projectData.ts:62–68`). `finishedLabs` is read only by this letter's ask and that NEXT line. | **false** (an ask with no consequence) | Y7–10, unguided and guided | Drop the ask and the "unproven" ordering. The letter keeps "A lab runs one research project at a time…". |
| 18 | `AdmissionsPage.tsx:133, 413–416` | With no room ("Room for 0 new students"): "Admit rate 1%", "Freshman class 0 of 0 places", "Incoming quality 0/100", "The admit rate opens at 1%, the most the seats left will hold" | `maxAdmitRate` is floored at 0.01, so the page prints 1% for a class of nobody, and grades it 0. | **false** | Y1 summer, a player who founded one program and waited (the passive run; T1's kind of player) | With no room, show one line in the standard's place: "No places this year: returning students fill the catalog. Develop courses before next summer." No rate, no quality. |

## The summer Review's class line (C2-7)

| Where | Claim | What the code does | Verdict |
|---|---|---|---|
| `yearInReview.ts:293–300` | Year 1: "The first graduating class: happy in it, well taught and there for the building years. 87 seniors leave warm toward the college (83 of 100)". Year 2: "The class of Year 2: miserable in it…", two cards below "Satisfaction averaged 64 this year". | The Review reads `classYears` before the closing year's history row exists. `resolveAdmissions.ts:175` pushes the row, and only then does `stampGraduatingClass` record the class. So year 1 falls back to today's satisfaction (77.4), and later years leave out the closing year. What is recorded for year 1 is satisfaction 60.2, "well taught and there for the building years", warmth 65.7 (probe: `c2/tools/classLine.ts`, on the first-summer save). Later summers drift less (year 6: warmth 94 shown against 99.3 recorded). | **false** in the first summers |

## Checked and true

These read true against the code:
- the rank as the average of teaching and research (`facultyData.ts:761`), F2's question answered;
- a search's two weeks of costs and half a year (`facultySearch.ts:16–17`);
- the committee's seats at prestige 70, 80, 90 and 100;
- attrition under 50 and demands under 60 from year 3 (`admissionsSystem.ts:314`, `demandData.ts:21–26`);
- four and eight times speed (`seats.ts:130–147`);
- a seat's salary for good;
- the moves' four and twelve weeks;
- the first hall at eight courses;
- promises (three open, four years' rest after a decline);
- the playoffs in week 47 (as a week of the year; see C2-8);
- half a capital project from the endowment;
- the specialization's two routes (typed as literals in the briefing rather than read from `specializationOfferWhen()`, which Plan 95E's habit asks for);
- the founding cards' "each with its professor already appointed";
- the price page's "Set the price to see who applies";
- 107G's opening note, wherever the room is not zero.

**Plan 108B** (the pool's quality climbing) changed no player text. The incoming-quality hint is neutral ("The average preparation of the class that enrolls").

## Review II's tables

Review II's four false claims are gone (95E). Its 11 vague claims (`2026-10-game-review-ii/data/new-text.tsv`) are reworded or answered by 95E–F and Plan 101's events. These were not re-read one by one.

The catalogue's recurrences, review II's main vagueness, are answered by Plan 101A's memory of answers. That was not re-audited here.
