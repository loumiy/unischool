# 7. Bugs

Plan 86, area 7. Commit read: `4062bfb`. Ranked by severity, then by how many players meet it.
- **Severity:** *blocker* breaks a run or a save; *major* a player will notice and be hurt by it; *minor* noticeable and harmless; *polish*.
- **Effort:** S an hour, M a PR, L a plan.

**As run.** Two of this area's tools were brought up to date, and nothing under `src/` or `sim/` was changed:
- **`tools/review/sweep.ts`** (`npm run review:sweep`) now:
  - writes the yearly save through `exportSave`, the file a player downloads, so each round trip covers export and import as well as the browser's own save;
  - plays four weeks on from the live state and from the reloaded one and compares them. October's check compared two JSON copies, so it could not see a value JSON drops (`NaN`, `Infinity`, `undefined`);
  - counts a clock that stops as a failure, not a hang;
  - takes `--fixtures`, which loads every save in `test/fixtures/` (the launch save at version 78 and each version's since) through `readSave` and plays it on with the invariants checked every week. This is Plan 70's migration chain run forward, not just loaded.
- **`tools/review/twoTabs.mjs`** was October's repro of G7-1. After Plan 79B the repro no longer showed the bug, so the script now runs four cases, each with the week it expects, and exits non-zero on a surprise.
- `tools/README.md` says both.

**No blocker was found.** Nothing crashed, no save failed to load, and no page threw, in any of the runs below. **No major was found either.** The worst finding is a migration that over-counts a research specialization's Landmark work on saves from before Plan 85F (H7-1).

Of the October list's nineteen entries, seventeen are fixed on `HEAD` and two partly (G7-10, G7-17). G7-1 is fixed, with one edge left by design (H7-3).

| # | Finding | Severity | Effort | Was |
|---|---|---|---|---|
| H7-1 | A pre-85F save counts more than three Landmark Programs a week | minor | S | — |
| H7-2 | The map's wheel zoom can't stop the browser's: a console error per scroll, and a pinch zooms the page | minor | S | — |
| H7-3 | Two tabs side by side: a Continue in the second drops the first's unsaved weeks | minor | S | G7-1 |
| H7-4 | A matter opened before a reload pauses the clock again in its final week | polish | S | — |
| H7-5 | A board letter is always dated this week | polish | S | — |
| H7-6 | Short money rounds past its unit ("$1,000k") | polish | S | — |
| H7-7 | "University of Ashford" reads "University of Ashford College" | polish | S | — |
| H7-8 | Tooling: two scenarios never stop; the harness's double "University"; the scaffold fill | minor/polish | S | G7-17c |
| H7-9 | Three events still name anyone | polish | S | G7-10 |

## What was run

| Sweep | Tool | Result |
|---|---|---|
| Invariants every week, and an export, import and play-on check every year. Six players × seeds 1–5 (Lean and Idle 1–10) × fifty years, with October's odd names: one letter, an apostrophe, "Ælfric & Sons", 北京大学, جامعة النور, and a 64-character name | `npm run review:sweep` | **40 of 40 clean** (October: 60 of 60, ten seeds each; fewer seeds here, as four reviewers shared four cores). `data/h7-sweep.txt` |
| The same, thirty years, with more odd names: emoji, combining marks (Zalgo), HTML and quotes, leading and doubled spaces, diacritics | `review:sweep -- --names …` | **12 of 12 clean** (Lean and Idle × six names) |
| Every committed save, from the launch save (v78) through v92, migrated and played five years by Guided and by Idle | `review:sweep -- --fixtures` | **38 of 40 clean.** One fixture breaks an invariant under both players (H7-1). `data/h7-sweep-fixtures.txt` |
| Two tabs on one save, four ways | `tools/review/twoTabs.mjs` | **All four as Plan 79B means them.** G7-1 is fixed. The fourth case loses weeks by design (H7-3). `data/h7-two-tabs.txt` |
| Ten scenario saves (years 3–50: the summer, a crisis, a decision, the specialization, the downtown, the athletics complex, the research park, year 40, the Final Report) at 1440×900 and 390×844. Each one: every tab, up to six inbox matters opened, three Faculty people and the grid's views, the Build menu, the menu and Settings, four camera turns, tilts both ways and twelve zoom steps, Founders Hall's panel, play at 2×, then a reload. Page errors **and console errors and warnings** caught | a lighter pass than area 2's `review:gallery`, on the production build | **No page error, no warning.** One console error, from the map's wheel zoom, on every save (H7-2) |
| The same on the SVG fallback (`?map=svg`), three saves at both sizes | ″ | The same: no page error, only H7-2 |
| The same at the largest text (1.3×), colour-safe signals and reduced motion, four saves at both sizes | ″ | **No page error, no warning;** only H7-2. On the phone the summer's beats and the specialization's cards stack in one column with no word broken |
| Each held stop stepped through, with a save and reload at every step: the summer's four beats, the rankings entry, a decision, the specialization, a championship and the Final Report | hands-on script | **Each came back on the same beat with the same words** |
| Doors, props, overhangs and depth order over 75 arrangement saves and 3 grown campuses × 4 views | `npm run review:doors` (run by area 1) | **No depth-order error, no unreachable door, no walled-in building.** Door findings are area 1's (`data/b1-doors-*.md`) |
| `npm run check` | | **Passed:** typecheck, lint, and 143 of 143 suites in 6 min 58 s |
| `npm run test:slow` | | **Passed:** 3 of 3 slow suites (`fuzz-late`, `guided`, `archetypes`) in 19 min 52 s, on a loaded machine |

**Checked and fine:**
- **G7-1, two tabs.** A tab that has lost the claim shows "This college is open in another tab", stays paused when asked to play, and saves nothing on hide or close. "Open it here" brings it back claimed. A Continue on a title screen loaded before the other tab saved opens the newer game.
- **The specialization is permanent.** It held over a reload while open. "Not this year" closed it with nothing chosen, and it did not return on reload. A choice made was in the save after a reload (`specialization: "research"`, `specializationYear: 30`). It was never offered again over a further year at 4×. Rivals' specializations are part of the state the sweep's round trip and play-on compare.
- **Negative cash.** The crisis save (−$2,000,000) opens the Build menu with the reason ("Cash is negative — … A building the campaign fund covers in full can still start").
- **Odd names in the browser.** A 70-character paste is held to 60, and "60 characters at most" shows (G7-19). An Arabic name lays out right to left inside an English sentence. A name of spaces cannot open the doors. HTML in a name is printed, not run. The pennant ends a long name with an ellipsis on two lines. A 46-letter German compound fits the opening letter on a phone. Only an unbroken run of about 55 letters spills off the card, which no real name has.
- **A hidden tab at high speed.** The clock's sampler still caps each sample at one second (`weekClock.ts:32`).
- **Calling off and demolishing.** Every refund path names where the money went (G7-16). Demolition is refused while a program is moving in, since the program already holds the slot it is moving to (`techSystem.ts:537`). Demolishing during a renovation is allowed and refunds nothing, which the confirmation says ("nothing is returned").
- **The canvas and the SVG map** each drew every save with nothing missing except the scaffold pattern (H7-8c).
- **The money at year 50.** A Natural college at seed 12345 ends with about $19.6B in cash, gaining $17.9M a week. **The reviewer traced it, and it is not an overflow.** Over years 44–50 the weekly statement's net (about $0.9B a year) plus the research grants the log names (another $0.4–0.7B a year, which the Treasury shows only as a running total) add up to each year's change in cash. Purchases account for the rest. The standing sweep stops at the endowment's full mark (`sweep.ts:54-59`), so the surplus stays in cash. That is a question of balance, for area 4.

## The October findings

| # | Finding | On `HEAD` | How verified | Now |
|---|---|---|---|---|
| G7-1 | Two tabs: the stale tab overwrites the newer game | **Fixed** (79B) | `twoTabs.mjs`, four cases | One edge left by design: H7-3 |
| G7-2 | Event backlog compounds at full funding; late campuses derelict | **Fixed** (74B) | Area 1's `review:probe -- backlog`: 0 derelict of 73–82 at year 51 | — |
| G7-3 | Winter off by half a year | **Fixed** (76D) | `state/winter.ts`: deepest weeks 24–29, the turn of the terms | — |
| G7-4 | Teaching College attrition previewed, not applied | **Fixed** (76C) | `summerAttrition` is used by both the preview and `resolveAdmissions.ts:132` | — |
| G7-5 | Athletics can't reach an A | **Fixed** (76C) | `state/finalReport.ts:87` reads athletics at 1× | — |
| G7-6 | The Great Dome's drum | **Fixed** (74C) | Area 1, A1-3 | — |
| G7-7 | Landmark and milestone applicant bonuses do nothing | **Fixed** (79C) | `students.applicantLift` is added by `techSystem.ts:360, 616` and cleared at `resolveAdmissions.ts:155`; the summer shows "(including 180 drawn for this year only…)" | — |
| G7-8 | The Treasury statement doesn't add up | **Fixed** (79D) | `tabs/treasuryStatement.ts`; `test/treasury.test.ts` passes | — |
| G7-9 | A move before the summer shrinks the class | **Fixed** (79C) | `test/intake-ceiling.test.ts` passes | — |
| G7-10 | Placeholders name the wrong building or person | **Partly fixed** (76D, 79D) | Buildings, grants and lectures are named by kind. The offer, the tenure case and the two-body problem still draw anyone | H7-9 |
| G7-11 | Dead and mistimed events | **Fixed** (76D) | A suite checks that every event can fire | — |
| G7-12 | The phone layout breaks | **Fixed** (76I) | Area 2, A2-7 | — |
| G7-13 | The low-satisfaction figure fades out | **Fixed** | `.stat-warn` uses `--bad-on-light` (`styles.css:388`) | — |
| G7-14 | The stale hall price | **Fixed** (76C) | The letter reads the hall's own cost and weeks (`eventData.ts:1164-1165`) | — |
| G7-15 | Renovating can cost twice as much as rebuilding | **Fixed** (79C) | `renovationCost` is capped at the building's cost (`estate.ts:65-67`) | — |
| G7-16 | A cancelled building overstates the refund | **Fixed** (79D) | `demolition.ts:41-67` names each destination | — |
| G7-17 | Repository and tooling (a symlink, `newplayer`, three scenarios, `shoot.mjs`'s header) | **Mostly fixed** (73, 79E): a and d; b by Plan 79E (area 3 runs `newplayer`); of c, `research-report` and `championship` | `championship` stops at year 23 under Natural | `demand` still never stops, and `training` is new and never stops: H7-8 |
| G7-18 | Docs that no longer match | **Fixed** (74B, 76H, 79E) | `economy.md`, `admissions.md` and `progression.md` read true | — |
| G7-19 | Smaller things | **Fixed** (77, 78, 76H, 79D) | "Final week"; the name note at 60 | — |

## The list

### H7-1. A save from before Plan 85F counts more than three Landmark Programs a week — minor, S

- **Repro.** `npm run review:sweep -- --fixtures --players Idle --years 5`, or load `test/fixtures/save-v81-recruiting.json` and play into the summer.
- **Expected.** A year's Landmark work is at most `LANDMARKS_COUNTED` (3) programs a week, which is what `recordLandmarkWork` writes and the invariant holds (`invariants.ts:186`).
- **Actual.**
  - The save is at year 21, week 2, with eight Landmark Programs running.
  - Read back by the v90 migration, year 21 already holds **16 weeks** of Landmark work after two weeks. Three a week allows six.
  - The weekly record then adds three a week. By week 49 the year holds 157 weeks against a limit of 156, and it ends at 169.
  - Earlier years are read back the same way, up to the yearly cap. Years 19 and 20 sit at it (156 each).
- **Where.** `persistence.ts:238-260` (`researchParkGate`). Its comment says "no more than LANDMARKS_COUNTED a week", but `span` adds one for every program in every week, and the cap is applied only to the year's total (`Math.min(weeks, LANDMARKS_COUNTED * WEEKS_PER_YEAR)`).
- **Who meets it.** A player whose save is from before version 90 (Plan 85F), who ran more than three Landmark Programs at once, and who then specializes in research. Their research specialization term (`parkReading`) reads more Landmark years than they earned, for up to ten years. The public build has shipped since version 78, so such saves exist. Nothing is lost, and the term is somewhat fuller than it should be.
- **Fix.** Count per absolute week, cap each week at `LANDMARKS_COUNTED`, and only then sum by year. Add the fixture to the migration test with the invariant. S.

### H7-2. The map's wheel zoom can't stop the browser's own: a console error on every scroll, and a trackpad pinch zooms the page — minor, S

- **Repro.** Any save, either map. Scroll over the map with devtools open, or pinch on a laptop trackpad (Chrome and Edge send a pinch as a wheel event with Ctrl held).
- **Actual.**
  - Every wheel step logs `Unable to preventDefault inside passive event listener invocation`. This was the only console message in 34 map sessions across ten saves.
  - A probe shows the events arrive with `cancelable: false`, Ctrl held or not. So the browser's default for the wheel goes ahead as well as the map's zoom. For a pinch, that default zooms the whole page.
  - Not checked on a real trackpad. That the default goes ahead is shown by the probe.
- **Where.** `CampusMap.tsx:1902-1913` calls `e.preventDefault()` from React's `onWheel` (`:2243`). React attaches wheel listeners as passive, so the call is ignored.
- **Fix.** Add the listener natively on the map's element with `{ passive: false }` in an effect. S.

### H7-3. Two tabs side by side: the second tab's Continue drops the first tab's unsaved weeks — minor, S (was G7-1)

- **Repro.** `node tools/review/twoTabs.mjs <save>`, case 4. By hand:
  1. Continue in tab A and play on, with A still on screen (a second window or monitor), so nothing is saved.
  2. Open tab B and press Continue.
- **Actual.** B takes the claim at the week A opened on. A shows the banner and stops. A's weeks since its last save are gone: six weeks in the probe, and up to half a year, since the autosave comes at the turn of each term. "Open it here" in A reloads the older save.
- **Expected.** This is Plan 79B's rule as written: "the last tab to take up the college keeps it". The banner says the tab saves nothing, but not that its weeks are lost.
- **Where.** `useGame.ts:70-71`: the `storage` event calls `lose()` without a last save.
- **Fix.** On losing the claim, a tab whose game is ahead of the stored one saves it first. The guard is unchanged by this: the claiming tab then meets a newer save at its next write and shows the banner, with "Open it here" leading to the newer game. Or the banner names the loss. S.

### H7-4. A matter opened before a reload pauses the clock again in its final week — polish, S

- **Repro.** The `downtown` scenario. Open both matters in the inbox, close it, and play at 2×: the clock runs. Reload, Continue, and play at 2×: the clock pauses itself two weeks later, when the festival reaches its final week.
- **Where.** `App.tsx:125-129` keeps the "opened" set in React state, and `unseen.ts`'s memory starts empty on each load (`before` is null). Both are per page, so a reload forgets what the player read.
- **Fix.** Keep the opened ids for the run in `sessionStorage`, or in the save as the demand's `demandUnread` is. S.

### H7-5. A board letter is always dated this week — polish, S

- **Repro.** The `downtown` save: the board's "Within reach of the top 20" reads "Y38W31". Play two weeks and it reads "Y38W33". In the Final Report save it reads "Y50W52" at a college ranked #6.
- **Where.** `inbox.ts:214` gives the board's letter `week: now`, so it always sorts first among letters and never ages. Area 2 found it (its B2-7) and passed it here.
- **Fix.** Record the week a board letter arrives beside its id in `distress.letters`. S, with a save field.
- **Related, area 2's.** Where the Close button stands, a held stop shows "Answer to go on" (`TabOverlay.tsx:31`) as a dashed pill that looks like a button and does nothing.

### H7-6. Short money rounds past its unit: "$1,000k", "$10.0M" — polish, S

- **Repro.** `moneyShort(999_500)` is "$1,000k", `moneyShort(9_950_000)` is "$10.0M", and `moneyShort(999_950_000)` is "$1,000M".
- **Where.** `format.ts:50-57` picks the unit and the number of decimals before it rounds.
- **Fix.** Round first, then choose. S.

### H7-7. A name that begins "University of" ends "College", then "University" — polish, S

- **Repro.** Found "University of Ashford". The pennant reads "University of Ashford College". If the charter is taken, it becomes "University of Ashford University".
- **Where.** `bareSchoolName` (`types.ts:1083-1085`) strips a trailing "College" or "University" only. The founding form's caption covers a trailing "University" (`typedUniversity`), not a leading one.
- **Fix.** Treat a leading "University of" or "College of" as the name's own form, and keep the suffix off it. Or say on the form how the name will read. S.
- The harness's `DEFAULT_NAME` is "Test University" (`sim/harness/game.ts:44`), and it bypasses the form. So every scenario save and every screenshot from one reads "Test University University" (H7-8b). In the game itself a typed trailing "University" is stripped, as designed.

### H7-8. Tooling — minor and polish

| # | What | Where | Severity |
|---|---|---|---|
| a | Two named scenarios never reach their stopping point. **`training`** runs out at year 45 under Guided ("ran out the clock … without reaching its stopping point"): the Faculty Training Institute never stands. **`demand`** is October's G7-17c again: Plan 79E made it stop under Lean in year 27, and it now runs out at year 30 with no demand raised. Later balance moved Lean's satisfaction. *Since fixed for `training` by area 2's one-line change in this review (the scenario names its specialization); it stops at year 38 week 6.* | `tools/scenarios.ts:188-199`, `:349` | minor, S |
| b | The harness founds "Test University", which the charter makes "Test University University" in every scenario save, and so in the review's screenshots (area 2's B2-1 image says so). | `sim/harness/game.ts:44` | polish, S |
| c | The canvas reports `url(#campus-scaffold)` as a fill it cannot draw, 1–7 times per save, on most saves (area 2 counted 30 sessions over 11 saves). **On screen the reviewer found no difference.** The y8 save's three labs under construction were cropped at 2× and 3× on the canvas and on `?map=svg`, and are identical, hatching included. The missing fill is in a stage or face not on screen in those saves. The look is area 1's call. | `canvasPaint.ts:1090` (the def is not yet seen when the element is recorded) | polish |
| d | October's sweep compared two JSON copies of the state, so it could not see a value JSON drops. **Done in this review:** the sweep also plays four weeks on from both. | `tools/review/sweep.ts` | — |

### H7-9. Three events still name anyone — polish, S (was G7-10)

- `star-poached` (an offer), `tenure-case` and `two-body` draw `{faculty}` from the whole roster (`eventCatalogue.ts:75, 477, 507`).
- Plan 79D left them drawn on purpose: naming by kind would change who leaves, and that would move the sim. `BACKLOG.md:141` holds the offer and the tenure case.
- Plan 84 makes this easier to notice. The Faculty person page shows each professor's years at the college, so a tenure case can now visibly name someone who has taught there for twenty-five years.
- **Fix.** As `BACKLOG.md:141` has it: the tenure case names a professor a few years in, the offer the strongest researcher. Then re-record the baseline. S.
