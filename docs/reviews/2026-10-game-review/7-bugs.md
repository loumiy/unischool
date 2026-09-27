# 7. Bugs

Plan 73, area 7. Commit read: `58fa3fd`. Ranked by severity, then by how many players meet it.
- **Severity:** *blocker* breaks a run or a save; *major* a player will notice and be hurt by it; *minor* noticeable and harmless; *polish*.
- **Effort:** S an hour, M a PR, L a plan.

**No blocker was found.** Nothing crashed, and no save failed to load, in any of:
- 70 goal-player games (area 4);
- 60 sweep games;
- 284 gallery captures, plus 63 at the largest text size;
- the hands-on sessions.

The worst finding is a data loss that needs two tabs (G7-1). It was raised with the owner the day it was found, as the plan asks.

## What was run

| Sweep | Tool | Result |
|---|---|---|
| Invariants after every week, and a save round trip at the start of every year (the whole load path: parse, migrate, sanitize, compared field by field). Six players × ten seeds × fifty years, with odd names: one letter, an apostrophe, "Ælfric & Sons", 北京大学, جامعة النور, and a 72-character name | `npm run review:sweep` (new) | **60 of 60 clean** |
| Every tab, menu, panel and held modal at 1440×900 and 390×844, page errors caught | `npm run review:gallery` | **284 captures, no page error** |
| The same at the largest text size, with colour-safe signals and reduced motion | `--settings` | **No page error.** Layout breaks on the phone (G7-12). |
| Doors, props, overhangs and depth order over 63 saves × 4 views | `npm run review:doors` | **No depth-order error, no unreachable door.** Door findings in area 1. |
| The goal players' 70 games | `npm run review:goals` | All finished |
| Exploratory: odd and long names, negative cash, a program moved at week 50, a modal left open over a reload, cancel and demolish, the hidden tab, two tabs | `tools/review/drive.mjs`, `twoTabs.mjs` (new), harness probes | Below |

**Checked and fine:**
- **Negative cash.** The Build menu says why nothing can start ("Cash is negative — … A building the campaign fund covers in full can still start").
- **A summer left mid-beat over a reload.** It returns to the same beat with the same numbers. The reveal's numbers count up, so an early reading is lower.
- **A hidden tab at high speed.** The clock's sampler caps each sample at one second (`weekClock.ts:32`), so a hidden tab never runs away.
- **Non-Latin and right-to-left names** survive every save.

## The list

### G7-1. Two tabs on one save: the stale tab overwrites the newer game — major, S

- **Repro.** `npm run dev`, then `node tools/review/twoTabs.mjs node_modules/.tmp/sc/y8.json`. The same by hand:
  1. Open the game in two tabs and press Continue in both.
  2. Play on in the first. Switching away saves it.
  3. Close the second.
- **Expected.** The newer game survives, or the second tab refuses to play.
- **Actual.** The first tab played from week 2 to week 10 and saved week 10. Closing the second tab saved week 2 over it, and a fresh tab continues at week 2. The eight weeks are gone, silently. Weeks could as easily be years.
- **Where.**
  - `src/engine/useGame.ts:130-138` saves on `visibilitychange` and `pagehide` whenever a game is under way.
  - Nothing in `src/` listens for `storage` events or uses `BroadcastChannel` or a lock.
- **Fix.** Stamp each save with a monotonic counter (or the clock and `savedAt`), and refuse to write a save older than the one stored. Add a banner in the second tab: "This college is open in another tab." S.

### G7-2. Event backlog compounds at full maintenance, and most of a year-50 campus ends derelict — major, M

- **Repro.** `npm run review:probe -- backlog`.
- **Actual.**
  - In all three games, 44–52 of about 70 buildings end derelict, and Founders Hall is at condition 0, with maintenance fully funded throughout.
  - A few event answers add backlog, scaled up to 12× by budget: "Make safe and defer the rest", "Fill this one and watch the others", and "Dry out and repair", which adds backlog despite its label.
  - That backlog is spread over every building by cost (`catalogue.ts:260-270`) and compounds at 6% a year (`estate.ts:155`). Full funding never pays it down (`estate.ts:131-157`).
- **Where.** The header comment `estate.ts:13` ("At full funding nothing here moves") is false.
- **Fix, and the look.** See area 1, A1-6. M.

### G7-3. The winter model is off by half a year — major, S

- **Actual.**
  - `winterDepth` is deepest at week 52 and week 1 (`catalogue.ts:74-78`: "deepest at the turn of the year").
  - In this game week 52 is the summer, and weeks 1–26 are the "Fall Term" (`StatusHeader.tsx:73`). So snow, ice, burst pipes and "the heating bill for December" arrive in the last weeks of spring and the first of fall.
  - A depth of 0.9 is reached only at week 52, when the catalogue doesn't tick. `the-snow-day`, `the-freeze` and `the-dark-term` can never fire.
  - The winter ambience in `audio/director.ts:35-37` reads the same winter.
- **Fix.** Centre winter on week 26, the turn of the fall and spring terms. S.

### G7-4. The Teaching College's attrition point shows in the preview but is never applied — major, S

- **Actual.**
  - The identity tag promises "one point less attrition a year".
  - The admissions preview adds it: `consequences.ts:75` uses `attritionRate(...) + tagTeeth(s, 'attrition')`.
  - The commit does not: `resolveAdmissions.ts:132` uses `attritionRate(priorYearAvgSatisfaction)` without the tag.
  - So the projection the player decides on and the class that results disagree.
- **Fix.** One function for both. S.

### G7-5. The Final Report's athletics axis can never reach an A — major, S

- **Actual.**
  - The player's athletic standing is `athleticProgramStrength`, capped at 100 (`studentLifeData.ts:816`). Rivals share a 5–85 scale (`rivalsSystem.ts:25-26`).
  - The report scales every axis by 100/150 (`finalReport.ts:83`), as if all ran to 150.
  - At best, athletics scores 0.5 × 66.7 + 0.3 × 66.7 + 0.2 × 100 = 73.3, and an A needs 75 (`reportData.ts:6-12`).
  - Every athletics grade is understated by a third.
- **Fix.** Scale athletics by 100/100, or put it on the 150 scale. S.

### G7-6. The Great Dome draws its drum's top in front of the dome — minor, S

See area 1, A1-3 (`landmarks.tsx:72-100`, `:167`, `:171`).

### G7-7. The landmarks' and milestones' applicant bonuses do nothing — minor, S

- **Actual.**
  - A grand landmark adds 1,500 to `s.students.applicantPool` (`facilitiesData.ts:453`, `techSystem.ts:325`), and milestones add their bonuses (`techSystem.ts:565`).
  - The next summer overwrites the field without reading it (`resolveAdmissions.ts:152`). `eventData.ts:39` itself warns "Never s.students.applicantPool: the summer funnel overwrites it".
  - The design's "one-time lift to the applicant pool" (`facilitiesData.ts:446-448`) never happens.
- **Fix.** Feed the bonus into the funnel as a one-summer term. S.

### G7-8. The Treasury's weekly statement doesn't add up — minor, S

- **Repro.** Load the `crisis` scenario and open the Treasury.
- **Actual.** The seven expense lines sum to $7,072,875. "Total expenses" reads $7,237,476. The missing $164,601 is student life (clubs and chapters, $164,602 a week on the Students tab), which has no line.
- **Fix.** Add the line. S.

### G7-9. Moving a program just before the summer shrinks the class — minor, S

- **Repro.** A harness probe from the year-8 save: at week 50, move a program. That summer's teaching capacity is 80 seats less for each of its developed courses (5,440 against 5,520 for a one-course program).
- **Actual.** A moving program is dark (`instructionCapacity.ts:25-33`), and the ceiling is read at the summer boundary. So a move in weeks 49–52 takes the program's seats out of that summer's intake cap, for a cohort that stays four years. The move button says only "dark 4 weeks". The NEXT line proposes moves at any week.
- **Fix.** Count a program's seats at the summer if it settles before the term starts, or warn in the last four weeks. S.

### G7-10. Event placeholders name the wrong building or person — minor, S

- `{building}` is any roofed building (`catalogue.ts:210`). The town's "eyesore" letter fires because some building is derelict, yet in the simulated runs it named buildings at condition 0.94 and 0.74.
- `{faculty}` is any professor, described as "on leave" or as the star.
- **Fix.** Let the condition that fires an event bind the placeholder. S.

### G7-11. Dead and mistimed events — minor, S

- `nothing-to-study` can't fire: every college keeps its founding programs.
- `bad-run` fires only at satisfaction 4 or below, a v2 mood scale.
- `rag-week`'s `moodOver: 0` is always true.
- Retirement stories gate on years (15, 18, 38) when nobody can retire before about year 26.
- In three simulated fifty-year games, 45 of the 154 events never fired.

Details in `2b-flavor-and-mechanics.md`, event section 5.

### G7-12. Phone layout breaks — minor, S

- The admissions cohort labels break mid-word even at normal text ("PRE-PROFESSIO NAL"). At the largest text it is worse ("HIGH ACHIEVE RS", "RESEARC H-ORIENTE D").
- The summer's beat headers run together at the largest text ("2·ADMISSIONS3·STUDENTS").
- The Build menu's cards are cut off by the dock.
- A long college name wraps the pennant to four lines, which covers the menu and map-tools buttons.

See area 2, A2-7.

### G7-13. The low-satisfaction figure fades out — minor, S

Below 55 the dock's satisfaction figure turns a pink meant for dark backgrounds, on a cream chip: 1.57:1 contrast, and 1.42:1 in colour-safe mode (`StatusHeader.tsx:145`, `styles.css:185`). Area 2, A2-3.

### G7-14. The stale hall price every player reads — minor, S

"A hall of its own" says "three quarters of a million, sixteen weeks to build" (`eventData.ts:1150`). The hall costs $2.5M and takes 26 weeks (`techData.ts:77-79`, since Plan 71). Area 2, A2-2.

### G7-15. Renovating can cost twice as much as rebuilding — minor, S

A renovation costs the backlog plus 5% of the building's cost (`estate.ts:53`). Demolishing is free, and a fresh building costs its cost with no backlog (`demolition.ts:89-113`). By year 50 the early buildings carry about twice their cost in backlog (G7-2), so pulling them down and building again is half the price of renovating. **Fix.** Cap a renovation at the building's cost, or carry the backlog through a rebuild. S.

### G7-16. A cancelled building's log line overstates the refund — polish, S

"Construction of X has been called off; $cost returned" (`demolition.ts:70`) prints the full cost even when a loan was settled out of it, or the money went back to the building fund or the endowment. Say where it went.

### G7-17. Repository and tooling

| # | What | Where | Severity |
|---|---|---|---|
| a | `unischool/node_modules` is committed as a symlink to another machine's temp folder (`/tmp/claude-0/wt70g/unischool/node_modules`, commit `002f905`, Plan 72B). Every clone gets a dangling link. `npm install` replaces it with a warning, and the tree then shows a deleted tracked file that someone will commit. `.gitignore`'s `node_modules/` matches directories only. | repo root | minor, S: `git rm --cached unischool/node_modules`, and ignore `node_modules` without the slash |
| b | `npm run newplayer` times out: it waits for the founding form, but the title screen comes first. | `tools/newPlayer.mjs:48` | minor, S |
| c | Three named scenarios never reach their stopping point: `research-report` (by year 30), `championship` and `demand` (by year 40). The scenario index also still describes the summer as "review, standing (the U.S. News report), the blind price, the digest". | `tools/scenarios.ts:120` and the three recipes | minor, S |
| d | `shoot.mjs`'s header names `tools/makeSave.ts` and `npm run shot:save`, neither of which exists. | `tools/shoot.mjs:2,12` | polish |

### G7-18. Documentation that no longer matches the game — polish, S

| Doc | Says | The game |
|---|---|---|
| `docs/design/economy.md:155` | "the first hall ($750k, then ×1.3 a rung)" | $2.5M, ×1.45 (the doc's own table at line 85 says so) |
| `docs/design/admissions.md:6` | "one stop a year, four beats" | three beats: Review, Admissions, Students (`types.ts:482-491`; Plan 33 dropped Standing) |
| `docs/design/progression.md:356, 467, 502` | "the Standing beat of every summer" | no Standing beat |
| `docs/design/progression.md:54` | "ten named collegiate pairings" | eight colour pairs |
| `docs/design/progression.md:417-432` | ambitions in `data/ambitionsData.ts` and `systems/ambitions/ambitionsSystem.ts`; "Seven grades" | neither file exists; the report has six axes |
| `src/systems/estate/estate.ts:13` | "At full funding nothing here moves" | event backlog compounds at full funding (G7-2) |
| `docs/architecture/ui-shell.md` | tabs, speeds, toasts, palette, camera, `L` key | see area 2, A2-8 |

### G7-19. Smaller things — polish

- "0 weeks to answer" means the last week (area 3).
- "The class of 1" reads as a count (area 3).
- A name over 60 characters is cut at 60 without a word (`COLLEGE_NAME_MAX`, `Pennant.tsx:44`).
- "Wind up" wraps onto two lines in narrow research cards, a regression of a fixed consistency item (area 2).
- `Credits.tsx:16` credits "Louis Miyani". The owner should confirm the spelling.
