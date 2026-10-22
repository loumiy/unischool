# UniSchool — a third full review of the game, October 2026

Plan 109. Commit read: `b1f2114` (main, 0.1.3, with Plans 87–108 landed: 537 commits since the second review). This file is area 5 of the plan: the executive summary and the ten improvements that matter most, ranked. The area files hold the evidence. Every finding in them carries its source (a screenshot, a save or scenario, a file and line), a severity and an effort. Each area also says what became of the [second review](../2026-10-game-review-ii/README.md)'s findings in it, and of the itch.io players' reports; the full table of the second review's findings is its [`STATUS.md`](../2026-10-game-review-ii/STATUS.md).

| Area | File | Findings |
|---|---|---|
| 1. Campus and asset aesthetics | [`1-aesthetics.md`](1-aesthetics.md) | 7 (1 major): the young campus, the walkers, winter's roofs, the Arena |
| 2. UI and text | [`2-ui-and-text.md`](2-ui-and-text.md) + appendices [`2a`](2a-course-descriptions.md) [`2b`](2b-flavor-and-mechanics.md) [`2c`](2c-consistency.md) [`2d`](2d-voice.md) | 11 (4 major): 474 captures, 8,472 strings, the chapters' claims read against the code |
| 3. Intuitive gameplay | [`3-intuitive-gameplay.md`](3-intuitive-gameplay.md) | 12 (4 major): a careful player to year 6 and three skimmers, by hand |
| 4. Strategy | [`4-strategy.md`](4-strategy.md) + [`4a`](4a-goal-players.md) | 12 (6 major): seven goal players over 21 games, and a bisection of the teaching guardrail |
| 6. Marketability | [`6-marketability.md`](6-marketability.md) | 12 (5 major): the memo re-read, with Steamworks' June 2027 dates |
| 7. Bugs | [`7-bugs.md`](7-bugs.md) | 7 entries (1 blocker, 1 major) |

Finding ids move on a letter again: `C1-1` … for the areas, `I7-1` … for the bugs.

**What is new this time: real players.** The playtest's reports (`docs/reviews/playtest-1/findings.md`) are read as evidence in every area, and the anonymous play statistics were read from PostHog for this review ([`data/play-statistics.md`](data/play-statistics.md)): 80 founded runs on 0.1.0–0.1.2, 15 specializations, 7 Final Reports.

**How to read the judgments.** As before, the reviewers are models, not human players. Judgments of feel are labelled as theirs. They rest on what a run asks of a player, on renders and captures, and on hands-on sessions through the production build. The machine had two cores for six reviewers, so the batch tools ran fewer seeds than the second review's (each area says how many).

## The summary

**The second review is mostly answered.** Of its 52 findings, 32 no longer hold on `b1f2114`, 13 are partly fixed, 4 were superseded and 2 were deferred by the owner. One still holds: late money, now worse. The first summers no longer mark a college down; prestige rose every summer of five in the hands-on run, so F6's "plummeting" is answered. The Research Park, the downtown and the render wall are fixed, and Plan 87's buildings read as what they are from every camera. History's Prestige view fell from 2,054–3,296 words to 75.

**The game is robust, with one exception that is live.** No crash, failed load or page error turned up in:
- `npm run check` (190 suites) and `npm run test:slow`;
- 20 fifty-year sweep games, 12 odd-name games and 62 fixture plays;
- 21 goal-player games;
- 474 screen captures;
- eleven saves made by 0.1.2's own code.

The exception: **a 0.1.2 save left on one of the walkthrough's later steps crashes 0.1.3 on Continue, every time** (I7-1). Loading such a save from a slot or a file writes it over the live run first. 0.1.3 went up on itch.io at 21:04 UTC on 21 October, so this is in players' hands now. The fix is an hour.

**Plans 106–108 answered the right problem and made new ones.** The walkthrough is fixed: two cards of about 50 words. The admissions page is the best-explained decision in the game (areas 2, 3 and 6 agree). But the chapters that replaced the walkthrough:
1. **Can stop a run's guidance for good.** *Paying for it* requires opening the Treasury, which has no tab button: it opens from the cash figure, or from the briefing's *Show me*, which a skimmer who shuts the drawer never uses. Before a chapter asked, players opened it about once in ten years. A skimmer sat on Chapter 5 from week 30 of year 1 to year 3 and beyond, and every matter, demand, promise and later main chapter waited behind it (C3-1). *The teams* asks for an athletic director that can't be had until the club's third-year petition, and held the ticker for 143 weeks (C3-2). The first summer's briefing, T1's lesson, waits behind both, so it misses the players it was written for (C2-3).
2. **Moved the reading rather than cutting it.** A newcomer still reads about 1,340 words before year two (review II: 1,400–1,800). The drawer opens by itself at each chapter with 181–270 words, 99–159 of them the briefing; it covers the map's left third, and scrolls at both screen sizes. The first one opens in the first minute after the walk, asking for a course that can't start for four weeks (C2-1, C3-3). That is the moment the statistics flag: a third of 0.1.2's founded runs ended before the first summer.
3. **State ten rules that aren't so**, in text written in the last two days: "about five minutes" for a two-step walk; courses "over ten to fifteen weeks"; a board that "worries" at a level that does nothing; History "shows prestige's target", which Plan 98B removed (C2-2). The chapters are the answer to "I didn't know how it works"; a false rule in one costs trust in all of them.

**The strategies still build one college.** Five goal players of seven end at 37,120–37,840 students, 415–420 courses and twenty teams. The specialization changes the title, the lead pillar and one building, not the build. It now arrives at exactly year 20 for six goals of seven, and 12 of the 15 real players who chose did so in year 21, so it reads as a date, not a milestone (C4-1, C4-7). Championships is now a real strategy: 49–66 titles and a top-12 finish, against 0 titles and 50th.

**Two of the game's own rules no longer hold.**
- **Teaching doesn't decide the top.** The teaching-blind player now finishes first; the target is 11th–25th. Bisected, the guardrail only ever passed because the NEXT line kept asking that player for a library it already had (S2's bug, fixed on 20 October). With teaching worth about 7 points of prestige at most, the hiring that players called the most frustrating part buys little (C4-2).
- **Early mistakes cost little.** Since Plan 107, T1's three summers at 1% never go into the red, and a college that does nothing at all rises from 32 to 42 in ten years, toward its own target above the founding floor, where before Plan 107 it fell to 16 first. The early help, which reads the year rather than what the college did, speeds that rise (C4-3).

Late money is $9.5B at year 40 (C4-5), and the happiest college is still graded F (C4-6).

**The campus most players see is the plainest picture in the game.** The opening view is fixed on the middle of the land at zoom 0.4. Nothing asks for a path. So years 1–5, the years two in three runs never leave, are 79–96% lawn, and the first hall is 160 pixels wide. The same year-5 campus three steps closer reads as well as a year-40 one (C1-1).

**The store is on schedule but exposed.** Steamworks confirms Next Fest on 14–21 June 2027, registration closing 25 April. The plan holds if three unbuilt pieces land in time: the capsule art, the desktop build (97H) and the ten-year demo (97G) (C6-2). Three things to settle now:
- **The disclosure.** The drafts and the README say no image comes from a generator, but by the owner's account the cover is AI-generated, and the title art reads as generated. A code-drawn title painting from 15 October is already in git (C6-1, C1-6).
- **The free full game.** It stays free on itch.io with no end date (C6-3).
- **The hook.** Players named growth, depth ("the football manager of universities") and calm, not the blind price or the specialization the draft leads with (C6-5).

A new rival, *College Architect*, is announced for Q3 2027 (C6-10).

## The ten improvements that matter most

Every finding was grouped by the player problem underneath it, and each group ranked by:
- how many players it hits;
- how early in a run;
- how badly;
- the effort.

Effort: S an hour, M a PR, L a plan.

### 1. No chapter may hold the run — every guided player who skims, years 1–6, S

- **Findings:**
  - C3-1: Chapter 5's one required objective is opening the Treasury, which has no tab button: a skimmer must find the cash figure, which doesn't look like a button, and every later main chapter waits;
  - C3-2: *The teams* asks for what can't be done until the club's third-year petition (38–143 weeks in the runs), and the ticker shows it over the chapters beneath;
  - C2-3: *The first summer* waits behind chapters 4 and 5, and the letter it replaced is retired in a guided run;
  - I7-2: the sport club, the varsity petition and the athletic director arrive before their chapter, and the letters say a shut tab is open;
  - C3-7: three chair's letters still stop the clock beside the chapter that says the same.
- **Fix:**
  - "Open the Treasury" optional, or ring the cash figure and give it a word;
  - *The first summer* as a side chapter at week 46;
  - *The teams* opens on the first varsity team, and the athletics stops are gated on it;
  - the ticker shows the first open main chapter.
- **And a test:** no required objective may be impossible, or un-ringable, the week its chapter opens. Run it over a harness player that opens the tabs its chapters ask for, so the scenario saves stop sitting on Chapter 5 too (I7-5a).

### 2. The drawer as a line, not a page — every guided player, from the first minute, S–M

- **Findings:**
  - C2-1: 181–270 words at each chapter (the briefing 99–159 of them), opened by itself, scrolling at both sizes;
  - C3-3: the first one opens a minute after the walk and asks for a course that can't start;
  - C2-6: prestige explained in three vocabularies, and the target figure back;
  - C3-5: two counts of the same places, 80 apart.
- **Fix:**
  - Open a new chapter collapsed to its objectives and *what*, with *How* and *Why* behind one "More". About 60–80 words.
  - Don't auto-open the first chapter: ring its line, and auto-open from *Somewhere to sleep*.
  - Hold §5 of Plan 106 to words, not sentences: *what* at most 45 words, no sentence over 20, counted by `test/chapters.test.ts`.
  - One prestige vocabulary, the glance's.

### 3. Make the new text true — every guided player, the first ten minutes on, S

- **Findings:**
  - C2-2: ten false rules in the briefings and letters;
  - C3-8 and I7-6: "admitting more crowds 350 beds" after crowding went;
  - C2-7: the first Review describes a class that isn't the one recorded;
  - C2-8: the calendar counts weeks of the term, the text weeks of the year;
  - C2-9: letters beside numbers, and a rank printed as "7/100";
  - C2-5: an admissions page with no room shows "1%", "0 of 0" and "0/100".
- **Fix:**
  - The rewrites in `2b`.
  - Then read every number in `chapterData.ts` from its constant, with a test, as `test/pillar-rule.test.ts` does for the weights.
  - Plan 95E's habit checks old text against a new rule. These are new texts against old rules, so the test is the guard.

### 4. Show the young campus — every player and every store visitor, minute one, S–M

- **Findings:**
  - C1-1: a fixed far camera and no paths make years 1–5 a stamp on a lawn;
  - C1-2: with Founders Hall alone every walker heads for the road (S2);
  - C1-5: the first decade's halls are one drawing;
  - C1-6: at 1280×720 *Open the doors* sits below the fold.
- **Fix, in order:**
  - Frame what stands, with a zoom floor near 1.0 while the campus is small (S).
  - Lay a drive from the road to Founders Hall at founding (S).
  - One objective that lays a path, in *Somewhere to sleep* (S).
  - A variant per hall by a hash of its id (S).
  - A year-5 store shot beside the year-32 one.

### 5. A stopped clock that says so, and a summer that doesn't take the page — every player from year 2, S

- **Findings:**
  - C3-4: a matter pauses the clock with an 8-second toast as its only sign (T1; Plan 104B still held);
  - I7-3: any stop that holds the clock, the summer above all, swaps the tab being read for the Inbox (S2);
  - C4-4: each new matter takes 2×, 4× and 8× away;
  - C3-6: an idle committee with nothing on the ticker.
- **Fix:**
  - Plan 104B as written: "Paused: a matter waits — Open" in the ticker, and a band on the calendar.
  - Hold the summer behind a pill while a tab is open.
  - Pause on arrival only for a matter with two weeks or less to answer.
  - The idle-committee reading after the shortfall.

### 6. The Curriculum at size, and doors that land — every player, years 5–25, S

- **Findings:**
  - C2-4: Plan 107C's open rows made the Curriculum the heaviest screen again: 3,561 words and 479 controls at year 16, against 1,118 and 57;
  - C3-9: *Show me* and *Go* open the right screen on the wrong part (the build menu on Grounds, the Treasury not on the Endowment, a Research door before the tab exists);
  - C3-11: the glance doesn't say which pillar can move now;
  - B2-1's Faculty load, unchanged.
- **Fix:**
  - Open by default only rows the player can act on now, and everything in a guided run until chapter 9.
  - Doors that carry their tab and view.
  - A muted "opens with …" line under a pillar at 0.0.

### 7. Make teaching and early choices count — every player, felt from year 10, M

- **Findings:**
  - C4-2: the teaching-blind player finishes first;
  - C4-3: three summers at 1% no longer reach debt, and doing nothing rises;
  - C4-11: the scorecard not refitted, which hid both;
  - C4-8: the Provost's staffing policy works, and nothing points to it.
- **Fix:**
  - Lower the teaching ceiling's floor (88 → about 60, `prestigeSystem.ts:508`), or weigh teaching more in academics.
  - Scale the early help by what the college earned, not by the year.
  - Re-base the scorecard, with an Idle row and a teaching-blind line that doesn't run through NEXT.
  - Name staffing in *Running the college*.
  - Rerun the guardrails before 0.1.4.

### 8. A second run that differs before year 20 — every player who plays twice, L

- **Findings:**
  - C4-1: one body for every ambitious goal;
  - C4-7: the specialization is a date;
  - C4-10: small is a twenty-year detour;
  - C4-6: the happiest college graded F and never offered its pillar;
  - F3's "starts off exactly the same".
- **Fix, a plan for the owner:**
  - Specializations that ask for different bodies.
  - A founding emphasis that changes the first chapters' order.
  - A "which way will you go?" letter at year 5.
  - A satisfaction route to the student-life pillar.

  This is still the change that decides replay, and so the price (area 6).

### 9. Give the late game a decision and late money a use — players past year 30, M

- **Findings:**
  - C4-5: $9.5B in cash at year 40;
  - C4-4: late years at 1× with little to decide;
  - C4-9: athletics, the most distinct strategy, runs on manual chores (53 title stops a run; coaches hired by hand);
  - C1-4: the Arena still a hangar.
- **Fix:**
  - One yearly ask with a real trade-off.
  - The 95X purchases repeating at a rising price.
  - Titles as letters.
  - An athletic director who fills an empty chair by a policy, and a continuity bonus for a long-serving coach (F3, F5).

### 10. The road to Next Fest — every store visitor, S to L

- **Findings:**
  - C6-1: the disclosure's "no image generator" is false;
  - C6-2: the capsule art, 97H and 97G on the critical path;
  - C6-3: the full game free with no end date;
  - C6-4: no path from today's players to a wishlist;
  - C6-5: the store copy leads with the memo's hooks, not the players';
  - C6-6: the first ten minutes decide a demo;
  - C6-7: the shop window shows 0.1.1 again;
  - C6-8: the trailer has no cut list in the repository;
  - C6-10: *College Architect* in the same window.
- **Fix:** area 6's dated checklist:
  - the disclosure, the itch.io end date and shots 2 and 4 by 31 October;
  - the capsule set by 1 December;
  - 97H in November–December, and the Steam page by about 10 December or the first week of January;
  - 97G in February;
  - registration by 25 April;
  - launch in August–September at $14.99.

  Revive the code-drawn title painting (`4f384089`) until the commission lands.

### Fix first, whatever the ranking

Small and certain. Each one loses or overwrites a player's data, misleads every player of a kind, or breaks a tool the next review needs:
- **I7-1: the 0.1.2 save that crashes 0.1.3.** Make `sanitizeOpening` carry every retired stage to `play` (today it carries only `appoint`, to `found`), and make `OpeningCoach` return `null` for a stage it doesn't know (today it throws). Add a test that loads each retired stage and draws the card. Ship it as 0.1.3.1: 0.1.3 is live.
- **C3-10: appointing the athletic director renames the teams.** The pick always sends the mascot suggestion, and the reducer writes any non-empty mascot (`InterruptModal.tsx:675`, `reducer.ts:698`; `defaultAnswers.ts:108` does the same when the stop is answered for the player). Write it only when the college has none.
- **C2-2's first three rules:** the "five minutes", the course weeks and the board's freeze, which every guided player reads in the first ten minutes.
- **C3-1's Chapter 5:** make "Open the Treasury" optional. Until then, skimmers on 0.1.3 lose every system the chapters gate.
- **C6-1: the "no image generator" lines** (six places in the store drafts and the README), before any store form is filled in.
- **I7-5: the scenario saves.** They sit on Chapter 5 with a briefing over the map, which broke three review tools, and `demand` still never stops.

## The play statistics, in one table

From [`data/play-statistics.md`](data/play-statistics.md), founded runs, sandbox excluded:

| | 0.1.0 | 0.1.1 | 0.1.2 |
|---|---:|---:|---:|
| Founded runs | 45 | 11 | 24 |
| Never reached a summer | 53% | 36% | 33% |
| Reached year 21 | 5 | 2 | 4 |
| Specializations offered (saves loaded from files included) | 7 | 5 | 3 |
| Reached year 50 | 3 | 1 | 1 |

0.1.3's chapters are untested by outside players: the six runs seen so far are almost certainly the owner's. The next read should look at `chapter_opened` and `chapter_done`, and above all at how many runs sit on *Paying for it*.

## The tools

The review reran Plans 73 and 86's tools; `tools/README.md` has their usage. Repairs, all under `unischool/tools/`, none under `src/` or `sim/`:

| Tool | Change |
|---|---|
| `review/gallery.mjs` | A 1280×720 size; the admissions page (not a `.modal`), the Faculty table and plot, Prestige Details, the drawer and the Guide, save slots |
| `review/strings.ts` | Plans 89–108's files get screens of their own ("Other" from 4,468 words to 258); six jargon terms; save slots excused from the bare-"slots" check |
| `review/shootViews.mjs`, `keyboardCheck.mjs`, `touchCheck.mjs` | Set Objectives to Brief before loading, since a chapter's briefing opens over the map on every harness save |
| `shoot.mjs` | `--bare` hides the objectives drawer, which would otherwise land in the share image and the itch.io cover |
| `review/sweep.ts` | An absent `hallClaims` and an empty one compare equal (every Idle game had failed on it) |
| `profile.mjs` | Reads the date from the calendar's label |
| `review/drive.mjs` | `DRIVE_TIMEOUT` for the page's default timeout |
| `newPlayer.mjs` | Plays Plan 107A's walk, logs the chapter line, closes the drawer Guided opens, and takes `--years=N`; the README's newcomer paragraph to match |

`review:goals` needed no repair. The probes each area wrote (the admit rate held at 1%, the teaching-blind bisection, the 0.1.2 save generator, the scripted newcomer, the drawer counts) are described in their areas, and the 0.1.2 save generator is kept as `data/c7-old-saves-script.ts.txt`.
