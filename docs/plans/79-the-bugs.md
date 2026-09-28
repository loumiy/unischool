# Plan 79 — The bugs, from the review's area 7

*Planning document only. Its job is to turn the owner's answer on area 7 of
the October review into PRs, after Plans 74 to 78 took some of its entries
with the areas they belong to.*

**Status: Landed.** A to E merged (#240–#244).

---

## 0. The owner's answer

On area 4 (strategy), the owner holds the fixes. Some ideas may be adopted
later, but the owner disagrees with most of the proposed fixes and will
playtest balance and strategy first. One thing is taken: athletics can be
deepened, and it goes to the backlog (§3).

On area 7 ([`7-bugs.md`](../reviews/2026-10-game-review/7-bugs.md)), the
owner's answer is: fix the bugs.

## 1. Where each entry stands

Read against `main` at 3364c31.

| Entry | What | Where it stands |
|---|---|---|
| G7-1 | Two tabs on one save: the stale tab overwrites the newer game | **Open: B** |
| G7-2 | Event backlog compounds at full funding | Fixed by Plan 74B (full funding pays a backlog down) |
| G7-3 | The winter model is off by half a year | Fixed by Plan 76D (`state/winter.ts`) |
| G7-4 | The tag attrition point is previewed but not applied | Fixed by Plan 76C (`summerAttrition`, one function for both) |
| G7-5 | The athletics axis can't reach an A | Fixed by Plan 76C (`finalReport.ts` reads athletics at 1×) |
| G7-6 | The Great Dome's drum | Fixed by Plan 74C |
| G7-7 | The landmarks' and milestones' applicant bonuses do nothing | **Open: C** |
| G7-8 | The Treasury's statement doesn't add up | Fixed: the statement has a Student life line. **D** adds a test that the lines sum to the total |
| G7-9 | Moving a program just before the summer shrinks the class | **Open: C** |
| G7-10 | Event placeholders name the wrong building or person | Building fixed by Plan 76D (`names.building`). **Open for `{faculty}`: D** |
| G7-11 | Dead and mistimed events | Fixed by Plan 76D (deleted, regated, and a sweep that every event can fire) |
| G7-12 | Phone layout breaks | Fixed by Plan 76I |
| G7-13 | The low-satisfaction figure fades out | Fixed by Plan 76 (`--bad-on-light`) |
| G7-14 | The stale hall price | Fixed by Plan 76C |
| G7-15 | Renovating can cost twice as much as rebuilding | **Open: C** (less often since Plan 74B, still possible) |
| G7-16 | A cancelled building's log line overstates the refund | **Open: D** |
| G7-17a | The committed `node_modules` symlink | Fixed on the review branch |
| G7-17b–d | `newplayer` times out; three scenarios never stop; `shoot.mjs`'s header | **Open: E** |
| G7-18 | Docs that no longer match the game | `estate.ts:13` fixed by Plan 74B; `ui-shell.md` by Plan 76H. **The rest: E** |
| G7-19 | Smaller things | "0 weeks to answer" fixed by Plans 77/78 ("Final week"); "The class of 1" by Plan 78F; "Wind up" by Plan 76H; the credits' spelling confirmed by the owner. **The name cut at 60 without a word: D** |

## 2. The PRs

| PR | Subject | Entries | Sim baseline | Save version |
|---|---|---|---|---|
| A | This plan; the backlog | — | no | no |
| B | Two tabs on one save | G7-1 | no | no |
| C | The simulation's three bugs | G7-7, G7-9, G7-15 | re-recorded | 80 → 81 |
| D | Small bugs in the words | G7-8 (test), G7-10, G7-16, G7-19 | no | no |
| E | Tooling and docs | G7-17b–d, G7-18 | no | no |

B to E touch different files and can land in any order after A.

**Rules for every PR** (as in Plans 76 and 78):
- `npm run check` passes and `npm run sim` matches the baseline, or the
  baseline is re-recorded and the move is described in the PR, with no
  hand-tuning.
- Player-facing words follow Plan 47's glossary; `review:strings`' flagged
  counts don't rise.
- Each PR adds an **As implemented** note to its section below.

## PR 79B — Two tabs on one save

*G7-1.* Each tab saves on `visibilitychange` and `pagehide`
(`useGame.ts`), and nothing tells a tab another one has saved since. A
stale tab's close writes its older game over the newer one, silently.

- **The last tab to take up the college keeps it.** A tab that continues
  or founds a game claims the save (a small claim key in `localStorage`
  with a tab id). Every other tab open on the save hears it through the
  `storage` event.
- **A tab that has lost the claim stops.** It pauses, stops saving on
  hide, close, term and summer, and shows a banner: "This college is open
  in another tab." with a button that loads the saved game here (and
  claims it back).
- **A guard under the claim.** `saveGame` refuses to write when the
  stored save is newer than the one this tab last loaded or wrote (by
  `savedAt`), so a tab that missed the event, or two tabs saving within
  the same moment, still can't overwrite a newer game. A refused write
  from the guard shows the same banner, not "the save failed".
- The review's `tools/review/twoTabs.mjs` passes: the newer game survives
  the stale tab's close.
- **Checks:** unit tests on the guard (an older write is refused, a newer
  one goes through, the claim moves); the two-tab probe.

**As implemented (#241):**

- **The claim and the guard** are in `persistence.ts`. `claimSave` puts
  the tab's id under `unischool.save.claim`, and `trySave` says `'newer'`
  when the guard refuses; `saveGame` keeps its yes or no. The tab's last
  `savedAt` is set by a load, a write and New game's clear.
- **A tab saves only while it holds the claim** (`useGame.ts`). One that
  loaded a save and sits on the title screen has not claimed it, so its
  hide saves nothing either. Otherwise a tab left on the title would stamp
  the same game newer and stop the tab that is playing.
- **A tab that has lost the claim** is paused, and asking it for a speed
  does nothing. A Save pressed there is dropped, so no "Game saved." line
  appears. The banner sits top center, above every modal, and says the tab
  is paused and saves nothing.
- **"Open it here"** reloads with a `sessionStorage` flag, and the page
  comes back into the game, claimed, without the title screen between.
- **Past the plan:** a Continue on a title screen loaded before another
  tab's save opens that newer save (the same reload), rather than claiming
  an older game the guard would then stop. Founding over a save this tab
  never saw is stopped by the guard and shows the banner. An imported file
  writes past the guard and takes the claim, since the player chose to
  replace the run. A save this version sets aside does not bar the next
  save.
- **The probe.** `twoTabs.mjs` runs to the end: tab B's Continue takes the
  claim, so tab A shows the banner and does not play on, and a fresh tab
  continues at the week both opened at. A variant with the claim taken
  back found tab A at week 5 kept over tab B's close at week 1, and a stale
  Continue opened week 8.
- **Checks:** `test/two-tabs.test.ts`, 35 checks.

## PR 79C — The simulation's three bugs

*G7-7, G7-9, G7-15.*

- **Applicant lifts reach the funnel (G7-7).** A grand landmark and the
  milestones add to `s.students.applicantPool`, which the next summer
  overwrites without reading. They go instead to a new
  `s.students.applicantLift`, which the next summer's funnel adds to the
  pool and then clears. The Admissions beat names the lift where the pool
  is shown. The save version goes from 80 to 81, with a migration that
  starts the lift at 0.
- **A move just before the summer keeps its seats (G7-9).** The intake
  ceiling is read at the summer, and a program in transit counts as dark,
  so a move in weeks 49 to 52 takes its seats out of a class that stays
  four years. At the summer, a program in transit counts its seats: it
  will be teaching within four weeks. An unstaffed program still counts
  none.
- **A renovation never costs more than the building (G7-15).** The cost
  is the backlog plus the fee, capped at the building's cost, so
  renovating is never dearer than demolishing and building again.
- **Checks:** a landmark's lift appears in the next summer's pool and
  only that summer; a program moved at week 50 keeps the summer's
  ceiling; a renovation's cost is capped; the save fixture at version 80
  migrates.
- The baseline is re-recorded, and the PR says how the three moved it.

**As implemented (#243):**

- **The lift:**
  - `students.applicantLift` is new. A grand landmark's
    `applicantPoolBonus` and each milestone's bonus add to it
    (`techSystem.ts`'s `applyEffects` and `awardMilestone`).
  - It reaches the funnel as `CohortSignals.applicantLift`, read by
    `deriveCohortSignals`, so the Admissions beat's preview and
    `resolveAdmissions` read the same figure. `projectAdmissions` adds it
    after sticker shock, shared among the quality bands as the pool is.
    `resolveAdmissions` clears it after the funnel.
  - It is a factor of the pool (`FunnelFactors.lift`: the pool with it
    over the pool without), so the factors still multiply to the pool.
    The year-over-year line names it: "a one-year lift: +4%", and the
    next summer "last year's lift ended: −4%".
  - The pool's label names it: "Applicant pool (including 1,500 drawn
    for this year only by new landmarks and milestones)". One label covers a
    landmark and a milestone, since the lift is one number.
  - `eventData.ts`'s warning now points events at the lift.
  - `SAVE_VERSION` 80 → 81, with a migration (`noLiftYet`) and a load
    sanitizer (a negative or non-number lift reads 0).
    `test/fixtures/save-v80.json` is the `year-8-balanced` scenario,
    written before the bump.
- **The move before the summer:**
  - `intakeCeiling` counts the seats of a program in transit, and none
    for an unstaffed one. `instructionCapacity` (the weekly teaching, the
    crowding, the grades, the sections) still counts a moving program as
    dark.
  - The plan said a moving program teaches "within four weeks". That
    holds for a move out of Founders Hall. A move between halls is dark
    for twelve weeks, so one begun from week 41 is still moving at the
    summer. It counts its seats too, since the class stays four years.
  - The Admissions beat's room note says so when it applies: "…places
    across the courses now taught, counting 80 in programs moving halls,
    which teach again early in the year". The move buttons were already
    true ("no teaching, no progress… until it settles") and are
    unchanged.
- **The renovation:** `renovationCost` is
  `min(cost, backlog + 5% of cost)`. No building costs nothing to raise
  (Founders Hall's cost is $400,000), so the cap never makes a renovation
  free. The reducer, the building panel and the Estate panel all read the
  one function.
- **Checks:**
  - `test/applicant-lift.test.ts`: the Great Dome's 1,500 wait in the
    lift, not the pool; the Admissions preview is 1,500 more than without
    it and is what the summer draws; the lift clears, the next summer has
    none, and its reveal says the lift ended; a milestone's bonus goes to
    the lift; the v80 fixture loads with no lift.
  - `test/intake-ceiling.test.ts`: a founding program moved at week 50 is
    still moving at the summer and keeps the ceiling's seats, while the
    weekly figure counts it dark; an unstaffed program counts none.
  - `test/estate.test.ts`: the cap, and that a capped renovation still
    pays off the whole backlog.
  - `test/reveal-yoy.test.ts`'s factor product includes the lift.
  - `npm run check` and `npm run test:slow` pass. `review:strings`'
    flagged counts are unchanged.
- **The sim move** (medians of three seeds, against the old baseline). No
  tuning constant was touched. Each fix was also run alone to say which
  moved what; the renovation moves nothing, since no harness player
  renovates.
  - **The lift moves Selective and Lean entirely**, and most of
    Completionist. Milestones now add 30–60 applicants each to the next
    pool, which changes class sizes by a little and the runs' paths after
    that.
    - Selective: rank at Year 50 14 → 23, prestige 119.5 → 117.0,
      satisfaction at Year 25 +7.5 and at Year 50 +6.1.
    - Lean: rank at Year 25 23 → 30; at Year 50, 8,255 → 12,011 enrolled,
      prestige 111.9 → 109.2 and cash $454.7M → $141.8M.
    - Completionist: cash at Year 50 $146.9M → $432.1M, prestige 144.3 →
      142.6, one school by Year 10 (was 2); rank 1 at Year 50.
  - **The move fix moves Guided most.** The guided player and the
    archetypes move programs whenever the line or `moves.ts` finds a
    move, some late in a year. Alone, it
    adds 640 students at Year 25 to Completionist and takes Guided's
    Year 50 cash from $608.3M to $215.9M; both together give Guided
    $173.0M at Year 50, rank 8 at Year 25 (was 11) and rank 1 at Year 50.
  - Year 50 cash is the noisiest line: a few hundred more or fewer
    applicants shift when the big projects are paid for, and the medians
    of three seeds swing by hundreds of millions. Enrollment at Year 50
    is unchanged for Completionist, Selective and Guided (the catalog
    ceiling). **Idle** is unchanged. `sim/baseline.json` is re-recorded.

## PR 79D — Small bugs in the words

*G7-8, G7-10, G7-16, G7-19.*

- **`{faculty}` is the professor the event means (G7-10).** As Plan 76D
  did for `{building}` and `{class}`, `names.faculty` on an event picks
  the person from the college without changing the random stream: the
  strongest researcher for a grant or a star lecture, the strongest
  teacher for a teaching story, the longest-serving for a story about
  long service. An event that says the person is on leave, or leaving,
  names someone for whom that can be true, or its words change. The
  BACKLOG's row for the star lecture and the grant windfall comes off.
- **A cancelled building says where the money went (G7-16).** The log
  line names each destination: cash, the building fund, the endowment, a
  loan settled.
- **A long name says it was cut (G7-19).** The founding form and the
  pennant's rename say "60 characters at most" once the name reaches the
  limit.
- **The Treasury adds up (G7-8).** A test holds the statement's lines to
  its total, so a new expense can't go missing again.
- **Checks:** the named professor for each `names.faculty` kind; the
  cancel line for each destination; the Treasury sum over the scenario
  saves.

**As implemented (#242):**

- **`{faculty}`.** `names.faculty` takes `researcher` (the strongest
  researcher), `teacher` (the strongest teacher) or `longest` (the
  longest-serving); ties go to the id. The random draw is still made, so
  every other name and the stream after it read the same, and `facultyId`
  follows the person named.
  - The grant windfall names the strongest researcher, the crowded lecture
    the strongest teacher (its gate is teaching, so teacher rather than
    the researcher this plan said). The BACKLOG row comes off.
  - The offer (`star-poached`) and the tenure case are left drawn. Both
    let the professor go (`departs`), so naming them changes who leaves,
    and the sim moved by it (Selective's year-50 cash by $98M, Lean's
    by $403M). Nothing in the offer's words needs a particular person; the
    tenure case can name someone long-serving. Both are in the BACKLOG,
    and a test holds that no event that lets its professor go names them
    by kind.
  - `two-body` stays drawn: anyone can have a spouse. No event speaks of
    long service with `{faculty}`, so `longest` has no user yet; the
    retirement stories name nobody, and a named person who then did not
    retire would be untrue (their BACKLOG row stays).
- **Calling off.** The log line names each destination with its sum:
  "$X returned to cash", "to the building fund", "$half returned to the
  endowment and $rest to cash", or "$balance settled its loan and $rest
  returned to cash". The building panel's warning already said where.
- **The name's limit.** At 60 characters the founding form and the
  pennant's rename say "60 characters at most" (`NAME_LIMIT_NOTE` in
  `data/foundingData.ts`, from `COLLEGE_NAME_MAX`), in the muted caption
  style.
- **The Treasury.** The statement adds up. Its lines are now a table
  (`tabs/treasuryStatement.ts`): each figure, label and when it shows,
  and the tab renders from it. `test/treasury.test.ts` sums the shown
  lines against both totals over the founding college, the three
  committed saves, each in the crisis scenario's break, the launch save
  with every line in play, and every week of a guided college's first
  ten years; every line shows in at least one.

## PR 79E — Tooling and docs

*G7-17b–d, G7-18.*

- **`npm run newplayer`** passes the title screen before the founding
  form (G7-17b).
- **The three scenarios that never stop** (`research-report`,
  `championship`, `demand`) reach their stopping point, or are rewritten
  for what the game now does (the inbox, Plan 77, turned several modals
  into letters). The scenario index describes the summer's three beats
  (G7-17c).
- **`shoot.mjs`'s header** names the tools that exist (G7-17d).
- **The design docs** (G7-18): `economy.md`'s first hall price,
  `admissions.md`'s beats, `progression.md`'s Standing beat, its color
  pairings, its ambitions files and its grades.
- **Checks:** `npm run newplayer` and each fixed scenario run to the end.

**As implemented (#244):**

- **`newplayer`** presses the title screen's New game, then founds.
  - It then ran out of time. 4× waits for a Provost, so its click on the
    disabled 4× waited out Playwright's 30-second default, and year one ran
    at 1×, past the three-minute limit. It now plays at the fastest speed
    open, 2× in year one, and every click gives up after 1.5 seconds.
  - A matter that pauses the clock on arrival (Plan 78E) is opened from
    its notice, answered in the inbox with its last answer, and the clock
    resumed. Year one has none. A run from a year-3 save met one and did
    not stall.
  - A run reaches Year 2 in about 140 seconds with no stalls. `CAMPUS_URL`
    points it at another port, as the other tools do.
- **The scenarios:**
  - `research-report` already stops, in year 12. Plan 74B's backlog
    paydown moved the Completionist's run onto a lab after the review.
    The recipe is unchanged, with a comment.
  - `championship` never stopped because the Completionist misses the top
    eight in every sport, every year. The Natural player wins a title in
    year 18, so the recipe uses it, to year 25.
  - `demand` waited for a `demand` modal, which Plan 29 made a note and
    Plan 43 deleted. It now stops the week a demand is announced
    (`activeDemand`), under the Lean player, in year 27. Idle raises one in
    year 3, on a college with nothing built.
  - The `summer` recipe names the three beats: Review, Admissions, Students.
- **`shoot.mjs`** names `tools/scenario.ts` and `npm run scenario`.
  `tools/README.md` drops its note that `newplayer` is broken.
- **The design docs:**
  - `economy.md`: the first hall is $2.5M, then ×1.45 a rung.
  - `admissions.md`: three beats. Review settles the promises, and Plan 33
    dropped the Standing beat. Admissions is the second beat.
  - `progression.md`: eight color pairs. The report has no stop of its
    own; the Review's Standing section and History's standings carry it.
    Ambitions and the legacy give way to **Promises** and **The Final
    Report** (six grades and a title), and the legacy is noted as the
    harness's reading (`sim/legacyReading.ts`). The sealed record is
    `s.ending`.
  - `gameplay.md`'s ambitions become the promises; `interrupts.md` and
    `defaultAnswers.ts`'s comment count three summer beats, not four.
- `npm run sim` matches the baseline.

## 3. The backlog

- The triage entry says area 4 is held by the owner for their own
  playtesting, and area 7 is this plan.
- **Athletics, deepened** goes under *Named, not sequenced*, joined with
  the *Athletics deferrals* entry. Its starting point is area 4's A4-5 and
  the championship goal player's three wants: found a team without
  waiting for a club, recruit (scholarships in the athletics budget), and
  cut a team. The owner has taken the direction, not those fixes.

## What this plan does not do

- Nothing from area 4, except the backlog entry for athletics.
- No balance: C's baseline moves are described, not tuned.
- Nothing from area 6.
