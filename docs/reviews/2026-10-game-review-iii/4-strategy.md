# 4. Strategy

Plan 86's shape, third review, area 4. Commit read: `b1f2114` (main, 0.1.3). Production build in `unischool/dist/` (5.2 MB; main chunk 1.95 MB), served with `vite preview` on port 4104.

**Method.** As review II's: seven goal-directed players (`tools/review/goalPlayers.ts`, `npm run review:goals`) play the real reducer to year 50, each adapting by rules, logging a reason for every decision and a **want** for every lever the game lacks, and choosing the specialization its goal implies when offered. Tables: [`4a-goal-players.md`](4a-goal-players.md).

**What was run, exactly.**

| Tool | Runs | Notes |
|---|---|---|
| `npm run review:goals -- --seeds 12345,4242,777 --names Blackmoor` | **21 games** (7 goals × 3 seeds × 1 name), `GOALS_JOBS=2`, `nice -n 10` | Review II ran 70 (five seeds, two names) on four cores. This machine has two cores shared by six reviewers (load 10–13 throughout); one game took 3–13 minutes. Three seeds, one name is what Plans 95R–X measured with, so the medians compare with theirs. No seeds were added: the machine never went quiet. |
| The same tool, one game (prestige, 12345, Halifax) | 1 | Timed first (247 s) and read in full to check the harness still plays after Plans 106–108 (below). Not in the medians. |
| `npm run natural -- --pacing` | the lead's run, 20:03, 1,111 s | Not rerun. Read from the log and `pacing-runs.json` ([`data/c4-pacing-scorecard.md`](data/c4-pacing-scorecard.md)). |
| `npm run natural -- --opening` | 1 (107 s) | Years 1–5 for the scorecard's three players ([`data/c4-opening.md`](data/c4-opening.md)). |
| Probes in this area's scratch dir (not in the repo) | see *Tools* | The admit rate held at 1% and at the room's maximum, on `b1f2114` and `fa51c1d5` (the last tree before Plan 107); the Idle player and the natural line on both; the teaching-blind Guided player bisected over ten trees from 19 to 21 October; the clock's pauses over 50 years. All seed 12345. |
| Hand checks in the build (`tools/review/drive.mjs`, 1440×900) | 3 scenario saves | `specialization` (Year 22: the offer and its cards), `research-park` (Year 40: History's prestige panel), `final-report` (Year 50: read, nothing in this area turned on it). |

**Does the harness still play?** Yes. The worry was a player that silently stops choosing (review II's first 20 runs never specialized). Checked on the timing game and then on all 21:
- every run founds, builds and acts in every year (decisions logged every year; the fewest, 2 a year, are year 2–3 for the prestige player saving for a hall);
- every run but satisfaction is offered the specialization and takes its goal's pillar the year it comes;
- every run writes a Final Report;
- no run failed. `sim/harness/invariants.ts` flags 19 rules broken in each championships run, all "a deep run in Year N, outside the window": a reading quirk of the invariant, not a game fault (C4-12).

Plans 106–108 did not break the tool: headless foundings are not gated by the chapters (`gates.ts:20–24`), the founding faculty arrive appointed, and the summer still resolves through `RESOLVE_SUMMER_BEAT`/`RESOLVE_ADMISSIONS` (the admissions page is a view). **No tool was repaired.**

**The limits.** A goal player is a policy, not a person: it never gets bored, never misreads a screen, and plays the weeks it is given. It answers every stop at once, so its "stops" are the game's interrupts, not a person's pauses (C4-4 compares the two). Three seeds give a median and a range, not a distribution. Judgments of feel are labelled as **the reviewer's** (a model's).

## What changed since review II, in this area

| Plan | What it did to strategy | Measured here |
|---|---|---|
| 95R | The specialization at the overall top 30, or from Year 20 a pillar's top 10 | Six of seven goals are offered it at Y20–24; good-then-big at Y36–38; satisfaction never. |
| 95S | The Provost's *Staff the weakest courses first* | The goal players' own swaps are 0; the Provost makes 150–680 a run (7 for revenue, with 56 courses). |
| 95T | Celebrations and research reports are letters | Goal-player stops a run: 81–203 (review II: 129–298). |
| 95U | The Final Report reads the path | Championships is "known first for its teams"; big-then-good no longer "never opened its doors". Satisfaction still F. |
| 95V | Cutting a varsity team | 2 of 3 championships runs cut one (years 34 and 40). |
| 95W–X | Money measured; a late use for money | Natural Y40 cash $9.5B (95X measured $4.9B). |
| 107A | Three founding salaries from week 1; the funds carry two of them (+~$200k on $2.9M) | Opening cash and net unchanged in shape ([`data/c4-opening.md`](data/c4-opening.md)). |
| 107E | Crowding out of prestige and the pool; class seats 30 points of the academic need | See C4-3. |
| 107F | Prestige opens at 32; early help by year, full to Y5, gone by Y10 | See C4-3. |
| 108B | The pool's top band climbs from 5% at prestige 30 to 14% by 75 | Incoming quality 46 (P55) and 59 (P70), was 43 and 51 (Plan 108B's own figures). |

## The seven at year 50

Medians of three runs each ([`4a-goal-players.md`](4a-goal-players.md)). Review II's medians (ten runs, before Plan 95) in brackets where they moved.

| Goal | Rank | Prestige | Students | Courses | Teams | Titles | Lead pillar | Offered → chose | Cash | Final Report |
|---|---:|---:|---:|---:|---:|---:|---|---|---:|---|
| Revenue | 57 (56) | 61 | 4,480 | 56 | 0 | 0 | research 110 | Y20 → research (never) | $4.0B | D ×3 |
| Prestige | 9 (11) | 107 (104) | 37,120 | 415 | 20 | 0 | academics 134 | Y20 → academics (Y41) | $4.6B | C ×3 |
| Satisfaction | 59 (62) | 54 (51) | 3,730 | 204 | 0 | 0 | student life 79 | **never** | $5M | **F ×3** |
| Every asset | 3 | 114 (110) | 37,840 | 420 | 20 | 0 | research 150 | Y20 → research (Y39) | $3.0B | B ×3 |
| Championships | 11 (50) | 105 (72) | 37,840 | 420 | 20 | **53** (0) | **athletics 147** | Y20 → athletics (never) | $2.5B | B ×3 (D) |
| Good then big | 7 (17) | 109 (98) | 37,120 | 415 | 20 | 0 | academics 129 | Y36 → academics (Y47) | $0.3B | B ×2, C ×1 |
| Big then good | **1** (5) | 118 (110) | 37,120 | 415 | 20 | 0 | student life 135 | Y20 → student life (Y43) | $5.1B | B ×3 |

In the "Offered → chose" column, the year in brackets is when review II's runs chose (or "never"). Every run chose its goal's pillar the summer it was offered. Big-then-good is first at year 50 in all three runs; every asset in one (12345). For the harness's own players on the same commit (the scorecard): Natural first at Y50 on two seeds of three at 118.4, Guided first on all three at about 115.

## Do the ambitious strategies now end in different colleges?

**The titles and the lead pillars do. The bodies do not.** Five goals (prestige, every asset, championships, good-then-big, big-then-good) end within 2% of each other in size and breadth:

| Goal | Students | Courses (grad) | Programs | Schools | Placeables | Teams | Faculty | Pillars (acad / res / life / ath) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Prestige | 37,120 | 415 (49) | 51 | 7 | 57 | 20 | 88 | **134** / 122 / 98 / 32 |
| Every asset | 37,840 | 420 (53) | 52 | 7 | **83** | 20 | 94 | 103 / **150** / 115 / 83 |
| Championships | 37,840 | 420 (53) | 52 | 7 | 65 | 20 | 86 | 101 / 79 / 115 / **147** |
| Good then big | 37,120 | 415 (49) | 51 | 7 | 65 | 20 | 81 | **129** / 122 / 102 / 82 |
| Big then good | 37,120 | 415 (49) | 51 | 7 | 60 | 20 | 90 | 120 / 122 / **135** / 84 |

On review II's eight features, the four that were ambitious in review II sit 0.03–0.09 apart (review II 0.04–0.10), and championships 0.23–0.32 from them. On the four pillars alone the same four sit 0.11–0.23 apart (review II 0.09–0.24): no change. Championships, the newcomer, is 0.27–0.43 from each. The specialization coming at Y20 instead of Y40 did not spread the pillar shapes; what spread them is that one more goal now reaches a specialization of its own.

What did change since review II, all of it from Plan 95R:
- **Championships is a strategy again.** Offered athletics at Y20 through its pillar (#10 in athletics), it wins 49–66 titles a run, is first in the athletic standing from about year 30, and finishes 9th–12th (review II: 0 titles, 50th, D). Its title is "a college known first for its teams".
- **Athletics now leads its own standing.** Championships is first in the athletic standing; as in review II, every asset is first in research and big-then-good third in student life (B6-2's student-life gap is unchanged).
- **The choice comes early.** Y20 for six goals (review II: Y39–47 or never).

What did not:
- **The body underneath.** A specialization changes the score and one building; it never changes what the college builds or how big it gets. Every ambitious goal founds every program, teaches all 415–420 courses, fields twenty teams and fills the room to 37,000 (B4-1's "deeper half", which Plan 95 left out).
- **"Do everything" still ranks with the best.** Every asset is 3rd (1st once); prestige, the goal that wants standing, is 9th.
- **The three goals that stop** (revenue, satisfaction and, until Y20, good-then-big) are the only bodies that differ, and two of them (revenue D, satisfaction F) are graded as failures.

**The reviewer's judgment.** A second run on 0.1.3 would *read* differently from the first (a different title, a different lead pillar, one building that only that college has, and from Y20 a different thing to watch: titles, trained professors, Landmark Programs or festivals). It would not *play* differently for its first twenty years, and after Y20 the build list is the same list. Real players saw this already: F3, after one full run, "starts off exactly the same". Plan 106's chapters made the first five years more alike, not less (C4-1).


## What became of review II's findings

| Review II | Title | On `b1f2114` | Evidence | Carried as |
|---|---|---|---|---|
| B4-1 | The ambitious paths still build one college | **Partly fixed.** Championships is now a different college at the top (four-pillar distance 0.27–0.43 from the others), and every title names its pillar. Among review II's four ambitious goals nothing moved (0.11–0.23, was 0.09–0.24). The body is the same: 37,120–37,840 students, 415–420 courses, 20 teams for five goals. Plan 95 left "the specialization shaping the build" out on purpose. | Table above; `095-…md` §"What area 4 does not do" | C4-1 |
| B4-2 | The specialization is out of reach for the strategies that differ | **Partly fixed.** Revenue and championships are offered it at Y20 (pillar route, `prestigeSystem.ts:166–167`); championships went from 0 titles to 53. **Satisfaction is still never offered it** (student life #15–29, overall #56–61). | `4a`, *The specializations* | C4-6 |
| B4-3 | The choice comes at years 39–47 | **Fixed, and overshot.** Six goals choose at Y20, the first summer the pillar route allows; real players were offered it on reaching Y21, every one, and 12 of 15 chose that year (`play-statistics.md`). The choice is now a date, not a milestone. | `4a`; [image](img/c4-specialization-y22.jpg) | C4-7 |
| B4-4 | Small is a trap | **Deferred by the owner** ("small stays hard on purpose", Plan 95 area 4). Plan 107 changed the arithmetic: Lean +12 prestige at Y50 and Selective +2.7 (`sim/baseline.json`, `fa51c1d5` → `b1f2114`; 107F's commit names the crowding they no longer pay), but both still end 55th–60th. Good-then-big at Y20: 1,564–2,064 students, rank 56–58. | `sim/baseline.json` history | C4-10 |
| B4-5 | The teaching cap is gone, and swaps doubled | **Fixed for the harness; partly for players.** The goal players' own swaps are 0 (review II 495–839); the Provost makes 150–680 a run. The policy is the fourth radio choice on one seat and nothing names it; the link to the courses below the top band now sits in a closed *Details* (Plan 107D). | `4a`, *late load*; [image](img/c4-prestige-glance-y40.jpg) | C4-8 |
| B4-6 | Most weeks ask nothing, and the stops grew | **Partly fixed.** Stops fell to 81–203 a run (review II 129–298; 95T). Idle weeks: 57–86% of a run (review II 51–83%). Real players stop the clock 8.3 times a year in years 30–50 and play about a fifth of their late weeks at 8×, none at 4×, the rest at 1× and 2×. | `4a`; `play-statistics.md` | C4-4 |
| B4-7 | The Final Report misreads the strategies that differ | **Partly fixed.** "Stayed hard to get into" (95U), "known first for its teams". The satisfaction goal is **still F ×3** (score about 31 against a D at 34). | `4a`, each run's report | C4-6 |
| B4-8 | Athletics and size have too few levers | **Partly fixed.** A team can be founded (Plan 89's office) and cut (95V; 2 of 3 runs cut one). Still no recruiting for a non-flagship (3 of 3 runs want it, from Y20), no target enrolment, no decline that leaves a gap. | `4a`, *Wants* | C4-9 |
| B4-9 | The price is set blind | **Superseded** by the Admissions Office (Plan 89; 95 closed it). The revenue player, which never opens offices, still wants it in 3 of 3 runs, from Y27. | `4a` | — (closed) |
| B4-10 | Money stops mattering | **Still holds, and worse.** Natural Y40 cash $9.5B median (95X measured $4.9B on its branch; the rebased card $9.1B). The goal players that grow end with $2.5–5.1B; good-then-big $0.3B. | [`data/c4-pacing-scorecard.md`](data/c4-pacing-scorecard.md) | C4-5 |
| B4-11 | The scorecard measures October's prestige | **Fixed** by 95W (re-based, and an absolute cash row). Since then 107E/F moved the early curve and the card was not refitted: 75 of 115 (95W's card: 85). | scorecard | C4-11 |

Counts: fixed 2 (B4-3, B4-11), partly fixed 6 (B4-1, B4-2, B4-5, B4-6, B4-7, B4-8), still holds 1 (B4-10), superseded 1 (B4-9), deferred by the owner 1 (B4-4).

### The playtest's strategy findings (`playtest-1/findings.md`, area 4 and *Asked for in play*)

| Player | What they said | On 0.1.3 | A fix that would answer it |
|---|---|---|---|
| F1, S1 | Finding a decent teacher; searches turning up only weak candidates | **Still holds, by design.** The market centres on 50 teaching potential at or below prestige 50 (`facultyData.ts:581–583`) and Plan 96H's wide early market is unchanged. 107F's lower start does not make it worse: the market clamps at the founding standing. Plan 104G's numbers make a 50 among 40s read as a good hire. | None needed for the rule; C4-8 for the late-game half. |
| F1 | Waiting to add more classes | **Still holds.** The committee's seats are unchanged; big-then-good wants "more seats now" from year 1 in 3 of 3 runs. | Plan 89's curriculum office (one more seat) exists; nothing tells a player it is the answer. |
| T1 | Admitted 1% three summers into debt | **No longer happens.** The owner's "no change" stands, but Plan 107 removed the debt: on seed 12345, 1% for three summers went 24 weeks into the red and borrowed $488k before 107, and on 0.1.3 never goes into the red; it is five points behind at Y10 and ahead by Y20. 1% for ten summers still reaches debt (404 weeks in the red). | C4-3 |
| F3 | Every run starts the same | **Still holds, more so.** Same three founding programs, same founding faculty (now appointed), and from 106 the same thirteen chapters. The first divergence a real player sees is the specialization at Y21. | C4-1 |
| F3 | "Max two titles a year" | **Answered in words.** Chapter *The teams* says "the old athletic powers keep an edge in the postseason, so titles come slowly at first" (`chapterData.ts:279`); the specialization card says "keep a quarter of their postseason edge". The rule is unchanged. | — |
| F4 | Can't choose which program to establish | **Still holds, by design** (three offers, one decline a year, `programOffers.ts`). The founding choice is now free among three (107A). | — (owner's design) |
| F5 | Automate athletics hiring | **Still holds.** A coach who retires leaves the chair empty until the player hires (`athleticsSystem.ts:74–90`); the athletic director hires nobody. | C4-9 |
| F3 | Coaches with continuity, history and reputations | **Still holds.** `FIRE_COACH` empties the chair at no cost (`reducer.ts:560–566`); tenure only grows a coach's quality and salary. | C4-9 |
| F1 | An ordinance system | **Partly there**: the seats' policies and the offices are standing orders, but each is buried in its own panel. | C4-8 |

## Findings

Ranked by how many players they hit, how early, and how badly.

| Id | Title | Severity | Effort | Was |
|---|---|---|---|---|
| C4-1 | Every ambitious run still builds one body; the choice changes the score, not the build | major | L | B4-1 |
| C4-2 | Teaching does not decide the top: a college that never picks its teachers finishes first (the guardrail passed only because of S2's bug) | major | M | — |
| C4-3 | The early game's mistakes cost much less now: T1's 1% summers no longer reach debt, and doing nothing rises | major | M | — |
| C4-4 | The late game is still idle at 1×; real players stop the clock 8.3 times a year | major | M | B4-6 |
| C4-5 | Late money is worse than Plan 95X measured: $9.5B at Y40 | major | M | B4-10 |
| C4-6 | The happiest college is still graded F and never offered its specialization | major | M | B4-2, B4-7 |
| C4-7 | The specialization is a date, not a milestone: six goals of seven are offered it at exactly Y20 | minor | S | B4-3 |
| C4-8 | The late game's teaching lever exists but nothing points to it | minor | S | B4-5 |
| C4-9 | Athletics' new strategy runs on manual chores | minor | M | B4-8, F3, F5 |
| C4-10 | Small is a twenty-year detour, then the same college | minor | M | B4-4 |
| C4-11 | The pacing scorecard was not refitted after 107E/F: 75 of 115 met, 18 rows lost against 95W's card | minor | S | B4-11 |
| C4-12 | The harness invariant for the athletics complex reads the record without its window | polish | S | — |

### C4-1. Every ambitious run still builds one body; the choice changes the score, not the build — major, L (was B4-1)

**What.**
- Five of seven goals end at 37,120–37,840 students, 415–420 courses, 51–52 programs, all seven schools and twenty teams (the table above). On review II's eight features they sit 0.03–0.09 apart; review II read 0.04–0.10.
- The specialization now comes at Y20 and its pillar leads (academics 134, research 150, student life 135, athletics 147), so the titles differ. The pillar shapes of review II's four ambitious goals are as far apart as they were (0.11–0.23, was 0.09–0.24); championships is the one new shape (0.27–0.43).
- But nothing in a specialization asks for a different build. A research college still founds every school; an athletics college still teaches all 420 courses. The specialization's one building and its "what money can speed" purchase are the only differences in what is built.
- The opening is now identical across runs by design. Same three founding programs and professors (now appointed, 107A), and the same thirteen chapters of the main chain (106). The first choices that differ between two runs are the founding program (any of three) and the random draw of offers and events.
- F3 (playtest): "after playing it once, it is the beginning because it starts off exactly the same."

**Why it matters.** Replay value decides the price and the pitch (area 6). A player's second run would read differently from Y20 on (different title, pillar, building, and things to watch). The first twenty years, the hours a buyer judges in, would play the same. Of real players' founded runs, 11 of 80 reached year 21 (`play-statistics.md`, all versions): about 1 in 7.

**Fix.** The cheapest steps that make the *build* diverge:
- **Let each specialization ask for a different body**, as B4-1 proposed. Research rewards graduate programs and labs over undergraduate breadth; student life rewards a residential college under a size; athletics rewards venues and recruiting over course count. Ease the other pillars' breadth terms when the chosen pillar pushes, so skipping a school is a choice, not a loss. L.
- **A founding choice that matters before Y20.** For example the founding charter: three programs from different schools, or a founding emphasis (a research college opens with a lab, a residential college with a dorm and dining). It changes the first five chapters' order, not their teaching. M.
- **Offer the specialization's *preview* early.** A "which way will you go?" letter with chapter 14, *The long game* (Y5) names the four routes and what each will want, so a player can steer from Y5. S.

### C4-2. Teaching does not decide the top: a college that never picks its teachers finishes first — major, M (new)

**What.** Plan 71's rule, kept as a scorecard guardrail (`sim/pacing.ts:256–260`): "building everything with no regard to who teaches reaches the top 25 and no further; the top ten and above take hand-picked faculty". The teaching-blind Guided player (hires the cheapest, never tends the teaching) now ends **1st, 2nd and 1st** at Y50 (target 11–25; 95W's card read 25th).

Bisected on seed 12345 (this area's probe on trees extracted with `git archive`; every run in [`data/c4-probes.md`](data/c4-probes.md)):

| Teaching-blind Guided, seed 12345 | Y10 | Y20 | Y30 | Y40 | Y50 |
|---|---|---|---|---|---|
| `526e957a` (20 Oct, before the S2 fix) | 48.9, #57 | 65.3, #53 | 79.4, #35 | 95.1, #19 | 106.7, **#9** |
| `0a1b40ea` ("NEXT asks for a library only when one would help", S2) | 48.9, #57 | 67.3, #50 | 89.4, #22 | 107.8, #7 | 115.7, **#1** |
| `b1f2114` (0.1.3) | 56.7, #54 | 72.2, #39 | 92.4, #21 | 111.1, #3 | 116.9, **#1** |
| Guided (cares), `526e957a` and `0a1b40ea` alike | 53.0, #56 | 70.1, #45 | 91.6, #16 | 108.7, #4 | 115.1, #1 |

The flip is one commit, and not a balance one. Before the S2 fix, the NEXT line told a college whose academic need was short to build a library, even with one standing and its seats enough. The blind player's academic need is short all run (its courses: 5–13% graded A, academic need 44–63), so the line asked it for a library **852 times in 30 years and it could carry one**; the research asks behind it reached it 36 times. With the fix the line says "better teaching would raise it" and waits, so the research asks get through (354, carried 331), and the blind college researches as the caring one does. The caring player is unchanged (it never had the shortfall). Plans 107E/F added about a point on top.

So until 20 October the guardrail passed because the harness's blind player was stuck on advice it could not follow (S2's bug), not because the weights reward teaching. With the bug gone, the weights speak:
- **Teaching quality is worth about 7 points of prestige at most.** It is 30 of academics' core weight of about 140, scaled into the pillar and then by academics' 35% (History at Year 40 shows "Teaching quality +6.0" of academics' +24.6).
- **A weak academic need costs little.** It is one of five needs in satisfaction, which reaches prestige through welfare (full at a year's average of 80, `prestigeSystem.ts:685`) and word of mouth on the pool.
- **The teaching ceiling binds only near the top.** It is 88 + 62 × the mean grade points (`prestigeSystem.ts:508–515`): 111–122 for the blind college, just above where it ends.

**Why it matters.** Hiring and assigning teachers is the game's most-used late lever (real players open Faculty 3.3 times a year in years 30–50, Curriculum 6.1), and the playtest's F1 and S1 named finding a decent teacher the most frustrating part. If ignoring it costs nothing, that frustration buys nothing. Every player, from about Y15, when breadth and size dominate the target. And the scorecard read a pass that was not one.

**Fix.**
- Lower the teaching ceiling's floor (88, `prestigeSystem.ts:508`) to about 60: the blind college's Y50 ceiling falls from 118–122 to 104–109, while a college whose courses average an A keeps a ceiling above 140. S to try; the scorecard row is the test.
- Or weigh teaching quality more in academics (30 → 45) and breadth less (50 → 40). M, with a re-baseline.
- Either way, rerun the guardrail before 0.1.4, and give the teaching-blind line its own reason to fail that is not the NEXT line (for instance, run it as the Completionist, which does not follow NEXT).

### C4-3. The early game's mistakes cost much less now — major, M (new)

**What.** Plans 107E (crowding gone), 107F (open at 32, early help through Y5) and 107A (founding salaries carried) together soften most of what a careless first five years cost. This area's probe (`admitProbe.ts`) plays the Guided player's own moves with only its admit rate overridden, on seed 12345, on `b1f2114` and on `fa51c1d5` (the last tree before Plan 107):

| Seed 12345 | Admit rate | Y4 students | Y10 prestige, rank | Y20 prestige, rank | Weeks in red | Debt |
|---|---|---|---|---|---|---|
| As it plays, before 107 | 86% | 1,680 | 53.0, #56 | — | 0 | none |
| **1% for three summers, before 107** | 1%, then 83% | 800 | 46.1, #57 (−6.9) | — | **24** | $488k borrowed |
| As it plays, `b1f2114` | 86% | 1,520 | 57.4, #55 | 69.5, #50 | 0 | none |
| **1% for three summers, `b1f2114`** | 1%, then 48% | 640 | 52.2, #56 (−5.2) | 70.0, **#42** | **0** | none |
| The room's maximum every summer, `b1f2114` | 21–88% | 1,440 | 57.7, #56 | 72.3, #42 | 0 | none |
| 1% for ten summers, `b1f2114` | 1% | 35 | 46.4, #58 | 48.2, #60 | 404 | yes |

(One seed; the rows differ by a few points. [`data/c4-admit-probe.md`](data/c4-admit-probe.md).)

- **T1's mistake no longer bites.** Before 107 three summers at 1% put the college 24 weeks in the red and into a loan, which is what T1 saw on 0.1.1 and climbed out of. Now the same line never goes into the red, and by Y20 it stands *ahead* of the as-is line. It still costs about five points of prestige at Y10.
- **Admitting the room's maximum is free.** With crowding gone it never costs prestige; class seats pull the academic need, but satisfaction stays 82–91.
- **The Idle player (does nothing at all) rises.** On seed 12345 it climbs from 32 to 42.3 in ten years; before 107 it fell from 42 to 16 by Y5. Part of this is 107F's design: the college opens at the pillars' floor, so it cannot fall far, and it rises toward its own target above that floor (before 107 it also climbed back, 16 to 30 by Y11, with no help). The early help, which reads the year and not what the college did, speeds the rise: 32.0 → 33.2 under full help through Y5, then about 9 points in Y5–Y11 as it fades. Doing nothing no longer reads as failing.

| Prestige at the start of years 1–11, seed 12345 | Y1 | Y2 | Y3 | Y4 | Y5 | Y6 | Y11 |
|---|---|---|---|---|---|---|---|
| Idle, `fa51c1d5` | 42.0 | 31.6 | 24.2 | 19.6 | 16.0 | 18.3 | 30.1 |
| Idle, `b1f2114` | 32.0 | 32.9 | 33.6 | 33.3 | 33.2 | 35.7 | 42.3 |
| Guided, `fa51c1d5` | 42.0 | 39.6 | 40.6 | 41.7 | 42.6 | 43.3 | 53.0 |
| Guided, `b1f2114` | 32.0 | 37.5 | 42.7 | 46.3 | 48.2 | 49.3 | 57.4 |

**Why it matters.** The owner's 14 October rule for T1 was "a careless choice is punished" (`playtest-1/findings.md`). Plan 107 kept the rule's words and blunted it: the cost is now a few points of prestige that the early help makes up by Y20. The early help is by year, and the climb rate is 0.45 of the gap through Y5 for every college. So the five years where a new player learns what matters are the five where nothing they do moves the needle much. Plan 107's aim ("rises every summer if the player is doing the obvious things") is met; so is the converse, which nobody asked for: it also rises if the player does nothing. F6's complaint ("why is my prestige continuing to plummet?") is answered, but by making the number move whatever the player does. This hits every new player, years 1–10.

**Fix.**
- Scale the early rise by how much of the target the college has *earned*, not by the year: full help while the target is above the stock because of what was built, none for the baseline's own pull. S–M.
- Put the founding class's size back into the price: a first summer that admits under a third of the room shows the four-year tuition gap in the admissions page's panel (it shows money already) *and* the summer's report card names it. S.
- Keep the scorecard's Idle row honest: add "Idle Y10 prestige ≤ 35" (it was a guardrail in spirit, Plan 63). S.

### C4-4. The late game is still idle at 1×; real players stop the clock 8.3 times a year — major, M (was B4-6)

**What.**
- **The goal players' late years** (30–50, medians a year; `4a`, *The late load*): 1.5–4.0 stops, of which the summer is 1 and a decision event about 1; 11–46 decisions of their own; 25–44 idle weeks of 52. Over the run 57–86% of weeks are idle (review II 51–83%: a week that only answered a celebration now counts as idle, as 95T said it would).
- **What a player on the default settings would see** (this area's `pauseProbe.ts`, the Guided player, seed 12345): every stop plus every new matter in the inbox, which pauses the clock with *Pause when a matter arrives* on (`settings.ts:45`, the default). Years 30–50: **2.1 stops and 4.0 arrivals a year, 6.2 pauses**. Years 15–25: 7.8 ([`data/c4-pauses.md`](data/c4-pauses.md)).
- **Real players** (`play-statistics.md`, years 30–50, 6 runs): **8.3 clock stops a year**, about 20 weeks of 52 at 1×, 22 at 2×, 0 at 4×, 11 at 8×. They open the Curriculum 6 times a year, Faculty 3.3, Research 3.2, the Treasury 0.3.
- The two figures agree in shape: about three-quarters of what stops a late player (6.2 of 8.3) is a matter or a summer that asks a little; the rest is the player pausing to look. No late week was played at 4×; the 8× weeks (11 a year) need a Provost and three Deans, so those runs had them.

**Why it matters.** Six late-game runs played 20 weeks a year at 1×, where a week is 5 seconds (`useGame.ts:26`), so 100 seconds of each late year, over half an hour across years 30–50, are spent at 1×. The late game has one or two real choices a year (the summer, a specialization purchase), so most of a late year is watching. **The reviewer's judgment:** the clock does not stop too often (6–8 times a year is fine). The trouble is that between stops there is little to do. And each new matter takes the speed away: on the default setting it pauses the clock, and with that setting off it drops 2×, 4× and 8× to 1× (`useGame.ts:158–164`), four times a year late in a run. Why real players chose 1× for 20 weeks a year the statistics cannot say.

**Fix.**
- **Pause on arrival only for a matter that is short of time** (two weeks or less to answer), and otherwise keep the speed and show the slip: the final-week pause (`unseen.ts`) already catches one left unread. S.
- **A late decision a year that is not upkeep**: the specialization's purchases are once-each (95X); a yearly ask with a real trade-off (a bid for a rival's star professor, a donor's conditional gift, an expansion that costs a pillar) gives the late years a summer of their own. M.
- Count the stops a run in the goal report the way PostHog counts them (pauses, not interrupts), so the two can be compared. S (tooling).

### C4-5. Late money is worse than Plan 95X measured: $9.5B at Y40 — major, M (was B4-10)

**What.**
- The natural line's Y40 cash: **$9.5B median** ($9.3–10.2B), Y50 $22–24B (`data/c4-pacing-scorecard.md`). 95X measured $4.9B on its branch; the rebased card (95W) $9.1B. On `fa51c1d5`, before Plan 107, seed 12345 reads $10.6B at Y40: the late money is not 107's doing, and 95X's lower figure has not held since.
- The goal players that grow end with $2.5–5.1B cash (median), and the prestige and big-then-good players with $3.4B endowments. Cash starts to pile at Y42–44, when the catalogue is done: the prestige player's cash goes $0.5B (Y42) → $4.0B (Y50); its late decisions are training picks and research.
- The Guided player's three seeds end at $1.4B, $17.2B and $5.3B: a player who stops spending at Y40 banks the rest.

**Why it matters.** As review II: money never forces a choice between pillars, so it cannot make two runs differ (C4-1). The Treasury is opened about once in ten years (`play-statistics.md`), which is what one would expect of a number that has stopped mattering.

**Fix.** 95X named the two remaining options, both the owner's: rivals who bid for the college's best professors (payroll that grows with standing), or a board rule that reinvests cash above a reserve. A third, smaller one: let the 95X purchases repeat at a rising price once the share is full (a third institute class, a second festival a year), with a small effect beyond the share (satisfaction, recruiting), so money buys something every year. M.

### C4-6. The happiest college is still graded F and never offered its specialization — major, M (was B4-2, B4-7)

**What.** The satisfaction goal (each term, whatever need is lowest; never crowded):
- satisfaction 86–92 all run, every need at 90 by year 2; **graded F in all three runs**, mark score about 31 against a D at 34 (`reportData.ts:8–14`);
- **never offered a specialization**: student life #15–29 in the standings, overall #56–61. Its pillar value (73–81) trails because student life is welfare 20, campus life 12, beauty 6 and capital projects, and this college builds few venues, clubs or projects;
- its title is "a teaching college that never fielded a team anyone feared" in all three runs (review II: "a campus life to envy" in 6 of 10). The guidebooks' *teaching college* tag (`tags.ts:74`: courses graded well, little research) is the one it holds, since 80% of its courses are graded A and it does no research; the title names the guidebooks' tag before its strongest standing (`finalReport.ts:166–171`), so the one thing this college set out to be is not in its name.

Plan 95 recorded this as left to the owner (95U: "B4-4's small college, which the owner left hard on purpose").

**Why it matters.** It is the one goal whose body differs from the ambitious five and is still graded as a failure, and its natural specialization (the downtown, "meets up to 15% of the students' social, dining and housing needs") never reaches it. Few real players play this way all run (a reviewer's guess), but many play it for the first decade: F2 named "being able to buy everything that the students would want to have the maximum satisfaction" as their best moment.

**Fix.**
- Let welfare count in student life's standing for what it is: weight satisfaction more in the student-life pillar of a college whose satisfaction leads (95U's `satisfactionLeads` already decides this for the report), so its pillar route opens. S–M.
- Or make the pillar route "the top 10 of any pillar, or the field's best year-average satisfaction". S.
- Let the experience axis name the college when `satisfactionLeads` holds (95U's own test), before a guidebook tag. S.

### C4-7. The specialization is a date, not a milestone — minor, S (was B4-3)

**What.** Six goals of seven are offered the choice at exactly Y20 (revenue Y20–22, big-then-good Y20–24, the rest Y20). Real players: every run that reached year 21 was offered it and chose; 12 of 15 chose in year 21 (`play-statistics.md`). The hand check at Year 22 ([image](img/c4-specialization-y22.jpg)): a college 38th in the guide is offered it as "#10 in student life, in the top 10 of a pillar's standing". Plan 95R put the pillar route at Y20 "to hold it to the plan's window", and found most goals at the window's low edge.

**Why it matters.** A milestone the player reaches by playing feels earned; a date does not, and a player who has learned it is Y20 has no reason to shape the college toward it before then. With C4-1, this is why the first twenty years play the same in every run.

**Fix.** Read the pillar route from a pillar's top 5 (95R measured: it lost championships the offer, so pair it with C4-6's satisfaction route and a check on championships), or require the pillar to lead the college's own blend by a margin. Or let it come *earlier* for a college that is clearly pointed (top 5 of a pillar from Y12). S, with the goal players re-run.

### C4-8. The late game's teaching lever exists but nothing points to it — minor, S (was B4-5)

**What.**
- Plan 95S's *Staff the weakest courses first* works: with it, the goal players make **no** instructor swaps of their own (review II: 495–839 a run) and the Provost makes 150–680 a run for them.
- But it is the fourth radio choice on the Provost's seat, under three that read like spending policies ("Hold the line on spending", "Spend on the academic side", "Keep the students on side"; `seatData.ts:52–60`). The default is the third. Chapter 13 (*Running the college*) asks the player to appoint a Provost and says a seat "answers the matters in its domain by a policy"; it does not mention staffing.
- History's link to the courses below the top band ("Show the 43 courses below the top band") moved inside the prestige panel's closed *Details* in Plan 107D ([image](img/c4-prestige-glance-y40.jpg): at Year 40, the four meters show; the link is below the fold, one click in).
- The teaching-blind result (C4-2) means a player who never finds it loses little; that is the deeper problem.

**Why it matters.** Real players open Faculty 3.3 times a year late; the playtest's F1 found "a decent teacher" the most frustrating part. A player who does not find the policy does the swaps by hand, as review II counted.

**Fix.** Name staffing in the chapter's briefing ("On *Staff the weakest courses first*, the Provost moves your best free teacher onto each course below the top band"); make it the Provost's default once the college has more than one teacher per field; and put the "Show the N courses below the top band" link on the Academics meter's row, outside *Details*. S.

### C4-9. Athletics' new strategy runs on manual chores — minor, M (was B4-8; F3, F5)

**What.** Championships is now the most distinct ambitious college (C4-1) and wins 49–66 titles. Its work:
- **185–203 stops a run**, the most of any goal; 53 of them are championship reports, which still stop the clock (`eventSystem.ts:111`), unlike milestones and research reports since 95T;
- coaching by hand: 132–144 coach replacements and 93–98 hires a run, and 69–70 reorders of the priority list; a coach who retires leaves the chair empty until the player hires (`athleticsSystem.ts:74–90`); firing a champion coach costs nothing (`reducer.ts:560–566`);
- still no recruiting for a non-flagship (3 of 3 runs, from Y20), and a team can be founded only with Plan 89's office or a club's petition (3 of 3 want "found a team" from Y4, 91 weeks).

**Why it matters.** F3 (a second run, athletics-focused): "dominating in the athletics with 22-0 seasons" was the best moment; continuity and reputations for coaches were the asks. F5 asked to automate athletics hiring. The strategy that now differs most is the one with the most manual upkeep.

**Fix.**
- A title is news: file it as a letter, as 95T did for milestones (a final at most once a year per team). S.
- The athletic director fills an empty chair from the market by a policy (best available, or under a salary), as the Provost staffs courses. M.
- A coach's tenure gives the team a continuity bonus that firing loses. S–M.

### C4-10. Small is a twenty-year detour, then the same college — minor, M (was B4-4)

**What.**
- Good-then-big (selective, twelve programs, for twenty years): at Y20, 1,564–2,064 students, prestige 50–53, rank 56–58; then it grows and finishes **4th–11th**, prestige 109, the same body as the rest (37,120 students, 415 courses).
- The prestige goal still gives up selectivity: "a way up for a small college" fires in 3 of 3 runs at Y9 (review II: Y5).
- The harness's Selective (narrow, priced 15% over) ends 55th at Y50, prestige 64.9; Lean 60th at 55.5 (`sim/baseline.json`). Both rose with Plan 107 (Lean +12, Selective +2.7; 107F's commit: "the crowding it no longer pays"), and both are still in the bottom half.
- 108B's early climb in the pool's quality helps a small college most (incoming quality 46 at prestige 55, was 43), but student quality still counts at ×0.35 below 6,000 students (`prestigeSystem.ts:253`).

**Why it matters.** The owner decided small stays hard. The finding is narrower than review II's: small is not a trap any more (good-then-big recovers fully), but it is not a strategy either, because nothing a small college does differs from what a big one does twenty years later.

**Fix.** Within the owner's decision: let the student-life specialization reward a residential, smaller college (C4-1's "a different body"), so "small and happy" has an ending of its own. M.

### C4-11. The pacing scorecard was not refitted after 107E/F — minor, S (was B4-11)

**What.** 75 of 115 targets met (95W's re-based card: 85). Against that card, 18 rows were lost and 8 gained. The losses are mostly where 107E/F moved the curve on purpose: prestige reaches half its growth sooner (natural Y20, target Y22–26; guided Y23, target Y24–30), the top 25 sooner (natural Y23, target Y24–30), the Completionist no longer first at Y50. Plan 107F said the `CHECKPOINTS` and `WHEN` rows "move for Y10"; no commit touched `sim/pacing.ts` after Plan 95W except a rename. And one lost row is not timing: the teaching-blind guardrail, which the S2 fix to the NEXT line flipped on 20 October, before Plan 107 (C4-2).

**Why it matters.** A card that fails by design hides the one row that matters, as review II said of B4-11.

**Fix.** Re-base the timing rows on today's three players, keep the guardrails (teaching-blind, money) as they are, and add an Idle row (C4-3). S.

### C4-12. The harness invariant for the athletics complex reads the record without its window — polish, S (new)

**What.** Every championships run reports 19 broken rules, "a deep run in Year 23 (… 41), outside the window" (`sim/harness/invariants.ts:197–198`). The game keeps the complex's deep runs for ten years and prunes them only when the next postseason is recorded (`athleticsComplexData.ts:118–123`); readers filter by the window (`complexRuns`, `:102–105`). So between a year's turn and the next postseason, the record holds one year past the window. The invariant reads the raw array. `finalReport.ts:151` also reads the raw array (`complexRuns.length > 0` for the "known for its teams" tag), which is harmless.

**Why it matters.** Not a player-facing bug: the share and the cards read the window. But a harness that cries wolf in every championships run hides a real break. No data loss, no crash.

**Fix.** Read `complexRuns(s)` in the invariant, or prune on the year's turn. S.

## Would a second run on 0.1.3 feel different from the first?

**For its first twenty years, no; after that, yes, in what it is called and what it watches, not in what it builds.**
- Years 1–5 are now the same thirteen chapters in every run, with the same three founding programs and professors. Years 5–20 are the same build list: found what is offered, develop, staff, house, add schools.
- At Y20 (exactly, for a player who is doing well) the specialization arrives. From there a research college runs Landmark Programs, an athletics college wins titles (now many: 49–66 a run), an academic college trains professors, a student-life college grows a downtown. That is a real difference, and the Final Report names it.
- But the college under it is the same 37,000 students and 415 courses, the money stops mattering by Y40, and teaching (the lever players spend most time on) barely moves the standing (C4-2).

**The reviewer's judgment** (a model's): a player who liked the first run will enjoy a second for the specialization's last thirty years. They will not find a different game in its first hour, which is when a buyer decides. C4-1's founding choice and C4-7's earlier, earned offer are the two cheapest ways to change that.

## For the README's ten

1. **Make the build diverge, not just the score** (C4-1 with C4-7): a founding emphasis and an earned, earlier specialization, so a second run differs in its first hours.
2. **Make teaching matter, and early mistakes cost something** (C4-2 with C4-3, C4-11): Plan 71's teaching rule held only through S2's stuck advice, and Plan 107 blunted the owner's rule for careless admissions. Rerun the guardrails before 0.1.4.
3. **Give the late game something to decide, and stop taking its speed away** (C4-4 with C4-5, C4-9): one yearly choice that spends late money, titles as letters, and a matter that pauses only when it is short of time.

## Tools

- **`tools/review/goalPlayers.ts`**: unchanged. Bundled with `npx rolldown` (as `npm run review:goals` does) and run as `GOALS_JOBS=2 nice -n 10 node node_modules/.tmp/goalPlayers.mjs --seeds 12345,4242,777 --names Blackmoor --dir <scratch>/goals`. Before the batch, one game (`--run --goal prestige --seed 12345 --name Halifax`) was timed (247 s) and its record read through (decisions in every year, the offer at Y20 taken, a Final Report). The report was written by the tool; `4a-goal-players.md` adds four tables from the same runs (a script in the scratch directory).
- **`npm run natural -- --pacing`**: the lead's run, not repeated. `npm run natural -- --opening`: run once.
- **Probes**, written in this area's scratch directory, not committed, each a few lines over the harness (`sim/harness/game.ts`, `guided.ts`, `archetypes.ts`):
  - `admitProbe.ts`: the Guided player with the admit rate overridden (1% for three summers, 1% for ten, the room's maximum). Run on `b1f2114` and on `fa51c1d5`.
  - `blind-*.ts`, `care-*.ts`, `rec-*.ts`, `idle-*.ts`, `natural-*.ts`: the teaching-blind Guided player (and its NEXT asks), the caring Guided player, the Idle and Guided players' first ten years, and the natural line, on `b1f2114` and on older trees extracted with `git archive` into the scratch directory and bundled against the repo's `node_modules`: `fa51c1d5` (the last before Plan 107), and for the teaching-blind bisection `526e957a`, `0a1b40ea`, `39ed87b7`, `77e90652`, `b7dab812`, `4aa162c2`, `281a9548`, `9774eab3`, `434c90ce`, `5eba30b5`. Seed 12345 only.
  - `pauseProbe.ts`: the Guided player for 50 years, counting the stops and the new inbox matters that would pause the clock on the default settings.
- **Hand checks**: `tools/review/drive.mjs` against `vite preview --port 4104`, at 1440×900, on copies of the shared scenario saves `specialization`, `research-park` and `final-report`.
- **No tool was repaired.** One bug in my own probe (the teaching-blind flag read inverted on the first try) was found from the output and fixed before the numbers above were taken.
