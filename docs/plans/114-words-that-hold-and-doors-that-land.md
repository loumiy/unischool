# Plan 114 — Words that hold, and doors that land

*The owner's choices on the third game review's findings (23 October
2026, [Plan 109](109-third-game-review.md)), for C2-2, C2-4, C2-6, C2-7,
C2-9, C2-11, C3-2, C3-5, C3-9, C3-11 and C3-12, each taken as the review
recommends: the false rules left after Plans 111 and 112, with a test that
ties the briefings' numbers to their constants; one way of talking about
prestige; the first Review's class line; numbers in place of letters; five
course sentences; one count of places; doors that open on what they name;
the glance saying what opens a zero pillar; the small doubts; The teams
opening on a team, with the ticker on the main chapter; and a Curriculum
that opens only the rows you can act on.*

**Status: Landed on the branch (23 October 2026), A–H, to ship with
0.1.4.** The owner took §2's recommendations. Notes on where the PRs
landed differently are in §4.

---

## 0. What stands at `f7b2091`

Paths are under `unischool/`. Plan 112 rewrote the chapters, so the
review's line numbers have moved. Some of `2b`'s rewrites are already in:
claims 4, 6, 7, 8 and 9, the charter objective, and the AD's "runs the
order". What is left:

- **C2-2.** "The walkthrough takes about five minutes" (`src/data/openingData.ts:87`), for a welcome and two steps. Courses "take ten to fifteen weeks" (`src/data/chapterData.ts:97`), but the tiers take 4, 12, 24 and 28 (`src/data/techData.ts:38`). "The second speed button" (`:104`) is the third (`src/components/StatusHeader.tsx:70`). "Its board scale shows how worried the board is" (`:155`), but Tight does nothing. A law school and a graduate college "from year 10" (`:308`) open in year 15 (`src/data/projectData.ts:85, 91`). The glance's "falls faster than it climbs" (`src/tabs/PrestigeGlance.tsx:52`) is false through year 5 (`src/systems/prestige/prestigeSystem.ts:44, 60-63`). The laboratories letter still asks for a project in each lab, and its ask and done check track every lab (`src/data/eventData.ts:1302-1312`). NEXT still puts an "unproven" lab first (`src/systems/guidance/nextStep.ts:381-385`, `src/data/researchParkData.ts:156`). Literals stand where constants exist: "week 47", "week 52", 60, 50, "year 3", "top 30", "year 20", "top 10", "two weeks of running costs", "half a year", and the welcome's "350 students" (`openingData.ts:101`). No test ties them to anything.
- **C2-6.** The drawer prints "Prestige 42.8, heading for 47.9" and "Academics 5.6 of 41.3" (`src/components/ObjectivesPanel.tsx:48-50`, `chapterData.ts:373-375`). *Standing* says prestige moves "toward a target" (`:171`), and its help says "History shows the target" (`:182`). The Review prints "+5.5 of 41.3" (`src/state/yearInReview.ts:247`).
- **C2-7.** The Review's class card calls `classYears(s, s.clock.year)` (`yearInReview.ts:297`) before the closing year's row is pushed (`src/systems/admissions/resolveAdmissions.ts:175`) and the class is stamped (`:182`). Year 1 falls back to today's satisfaction (`src/systems/alumni/ledger.ts:33`).
- **C2-9.** "Professors below an A in teaching" (`src/tabs/FacultyTab.tsx:601`). The plot's lines read D/C/B/A (`src/tabs/facultySort.ts:72-74`, `src/tabs/FacultyPlot.tsx:124-125`). Training gives "a full grade better" (`src/data/specializationData.ts:234, 238`). The scoreboard prints a rank as "7/100" (`src/tabs/AthleticsTab.tsx:422, 456`).
- **C2-11.** All six sentences unchanged (`src/data/courseDescriptions.ts:310, 359, 361, 433, 445, 599`).
- **C3-2.** *The teams* opens on `varsityAsked` (`src/state/chapters.ts:248`), which a declined petition also sets (`src/data/ladderData.ts:96-97`). The chapter then asks for a team that can't come for three years. `currentChapter` returns the first open chapter of any kind (`chapters.ts:419-423`), so the ticker (`src/components/LogTicker.tsx:65`) and the drawer (`ObjectivesPanel.tsx:74`) show a side chapter over the main one.
- **C3-5.** *Seats for everyone* counts places taught (`chapters.ts:151-155`). The NEXT line under it counts places taught and coming (`src/systems/guidance/seating.ts:59-61`).
- **C3-9.** `ringedBuilding` rings only for *Somewhere to sleep*, *A hall of its own* and the teams' venue (`chapters.ts:352-368`). So *Campus life*'s Student Center door opens on Grounds (`src/components/BuildPopup.tsx:260-266`), and so do NEXT's build doors, even when their intent names a building (`src/App.tsx:627`). Treasury doors open on Budget. The campaign is under Endowment (`src/tabs/TreasuryTab.tsx:94, 315`). *Research*'s Show me does nothing before the first lab, because its tab is shut (`App.tsx:374`, `ObjectivesPanel.tsx:121-122`). Nothing in Curriculum or Faculty points to a free slot.
- **C3-11.** A pillar at 0.0 doesn't say what opens it (`PrestigeGlance.tsx:58-74`).
- **C3-12.** Open: the search's price has no reason (`src/tabs/CurriculumTab.tsx:516-525`), and founding doesn't say its price is the entry course's (`src/components/BuildingInfoPanel.tsx:681`). The Paths tile doesn't say walkers wear their own paths (`BuildPopup.tsx:732`). "Send the offers" can sit below the fold (`src/components/AdmissionsPage.tsx:520`). The founding form ignores Enter (`src/components/StartupScreen.tsx:388-394`). The placing strip says "Click open ground to build" (`src/data/buildWords.ts:6`). A search's find is only a log line (`src/systems/faculty/facultySearch.ts:56-61`).
- **C2-4.** A program row stays open while it has courses to develop (`CurriculumTab.tsx:924`).

## 1. The PRs

| PR | Findings | What |
|---|---|---|
| A | C2-2 | The last false rules. The numbers in the briefings and the walkthrough come from their constants, with a test. |
| B | C2-6, C3-11 | One prestige vocabulary, which way it is heading and what each pillar adds. The glance's meters go in the drawer, its rule holds in both eras, and a zero pillar names what opens it. |
| C | C2-9, C2-11 | Numbers in place of letters, a rank written as a rank, and six course sentences. |
| D | C2-7 | The Review's class line, read from the inputs the stamp will use. |
| E | C3-2, C3-5 | *The teams* opens on a team. The ticker shows the main chapter, and side chapters move to the drawer. One count of places. A check that no required objective waits a year. |
| F | C3-9 | Build doors ring their building, Treasury doors carry their view, a shut tab's Show me says when it opens, and the Curriculum points to a free slot. |
| G | C3-12 | The small doubts: six lines and one form. |
| H | C2-4 | The Curriculum opens only the rows you can act on. |

A goes first, because its test guards every later rewrite. E comes
before F, because F's rings read the chapter E makes current. H comes
last, because F adds a line to the same tab head. B, C, D and G stand
alone.

### A. The last false rules, and a test that keeps them true (C2-2)

The rewrites follow Plan 111's rules. Where `2b` joined two sentences with
a semicolon, they are split here.

| Where | Becomes |
|---|---|
| `openingData.ts:87` | "The walkthrough is ${countWord(steps)} steps.", counted from `OPENING_STEPS`. |
| `openingData.ts:101` | "${count(totalEnrolled(s.students))} students have enrolled…" |
| `chapterData.ts:97` | "…writes four at a time. An entry course takes about ${T1} weeks, and a capstone about ${T4}." (`TIER_DURATION_WEEKS`, exported. The last two sentences join, so *about* keeps three.) |
| `:104` | "…click the double-arrow button…" |
| `:155` | "…It also shows how the board rates your finances." The false part was "worried", not the plain shape of Plan 111's sentence, so only that word changes. The board's levels are named in the scale's own tooltip (`figureHints.ts:37`), not here. |
| `:308` | "From year ${first}, the build menu offers capital projects, the arts center first. More open by year ${later}.", read from `PROJECTS`' `fromYear`. |
| `eventData.ts:1302-1312` | "Start a project from the Research tab." The ask names the first idle lab, and it is done once any lab has run a project. |
| `nextStep.ts:381-385` | The first idle lab, "…is idle: start a research project". `PARK_WORDS.unprovenLab` goes. `finishedLabs` stays in the save, but no guidance reads it. |

The glance's rule is PR B's. The literals become their constants:
`PLAYOFF_WEEK`, `WEEKS_PER_YEAR`, `DEMAND_SATISFACTION_THRESHOLD`,
`DEMAND_FIRST_YEAR`, `ATTRITION_SATISFACTION_LINE`, `SEARCH_COST_WEEKS`
and `SEARCH_WEEKS`, the specialization's ranks and year through
`prestigeWords.ts`, the speed seats from `src/systems/delegation/seats.ts`,
and the Student Center's program count from its ladder rung.

**The test,** `test/briefing-numbers.test.ts`, works like
`test/pillar-rule.test.ts`. It parses `chapterData.ts` and
`openingData.ts` with the TypeScript compiler, as
`tools/review/strings.ts` does. It takes the literal text of every string
and template outside its `${}`, and finds digits, and number words (two
to twelve, half, a dozen) next to a unit: weeks, years, courses,
students, beds, places, percent. "One" is left alone. "One idea", "one
band" and "one at a time" are plain English, and a test that flagged
them would push the writing toward awkward phrasing to dodge it. A hit
passes only if it is on a short allow-list with its reason: a key name ("Press 2"), a speed's own label, a score's
"out of 100", the four pillars, the five needs. Anything else fails with
its line. Tests that pin the old words take the new ones:
`test/opening.test.ts`, `test/chapters.test.ts`, `test/researchPark.test.ts`
and `test/playthrough-rules.test.ts`. `npm run review:plain` must stay at
or under its baseline.

### B. One prestige vocabulary, and what opens a pillar (C2-6, C3-11)

The glance's words become the only ones: which way prestige is heading,
and what each pillar adds. No target figure, and no "of 41.3".

- **The glance's rule** (`PrestigeGlance.tsx:52`). Before `EARLY_FADE_YEAR`
  (exported): "Prestige is graded each summer. It moves toward that
  grade. Until year ${EARLY_FADE_YEAR} it also climbs a little every
  week." From then on, the last sentence becomes "It falls faster than it
  climbs." Which sentence shows is decided by comparing
  `riseRateIn(year)` with `PRESTIGE_FALL_RATE`. The first two sentences
  stay split, as Plan 111 left them.
- **History's help** (`HistoryTab.tsx:72`) says the same rule a second
  time ("It rises slowly and falls quickly"). It takes the glance's
  sentences, from the same function, so the two can't drift apart.
- **The drawer.** `StandingLive` drops `prestigeNow`'s target and the
  pillars' "of {weight}". It shows "Prestige 42.8, rising", in the arrow's
  own word, and the glance's `PillarMeter` rows, exported from
  `PrestigeGlance.tsx` as Plan 107D proposed.
- ***Standing*.** The *about* ends "Neither one jumps. Each moves a little
  at a time." The objective is retitled "Prestige rising". Its help: "Your
  endowment and the four pillars lift prestige, and run-down buildings
  pull it down. History › Prestige shows which way it is heading and what
  each pillar adds."
- **The Review** (`yearInReview.ts:247`): "Academics: +5.5".
- **C3-11.** A pillar meter at 0.0 whose door is shut gets one muted line
  under it. Research reads "Opens with your first lab" while no lab
  stands. Athletics reads "Opens with your first varsity team" while there
  is no team. In *Details*, terms behind the same door are marked "not
  yet". Both read the state, not the figure.

Tests: `test/history-views.test.ts` covers the rule in both eras from the
constants, and the zero line before and after a lab.
`test/year-in-review.test.ts` checks that no pillar line says "of".
`test/chapters.test.ts` checks that no drawer word says "target".

### C. Numbers, a rank, and six sentences (C2-9, C2-11)

- `FacultyTab.tsx:601`: "Professors below the top band in teaching, and
  not yet trained this year."
- `GRADE_LINES` drops the letters. The plot labels the top line
  "${GRADE_A}, the top band" and shows the others as bare numbers.
- Training (`specializationData.ts:234, 238`): "Each one moves up one band
  in teaching, for good." Any figure comes from `oneGradeUp`.
- The scoreboard prints "#7" with a small "of 100", not "7/100". The
  screen-reader text stays.
- PHIL240, PHDL720, PHYS230, KINE230 and PHRM230 take review II's
  sentences word for word
  (`docs/reviews/2026-10-game-review-ii/2a-course-descriptions.md:58, 60, 82, 105, 107`).
  KINE230 keeps its opening clauses. PHYS310 leads with the thesis:
  "Carries one question further in a written thesis, after repeating
  classic experiments such as Millikan's oil drop and the Franck-Hertz
  tube."

Tests: `test/course-descriptions.test.ts` passes unchanged.
`test/faculty-sort.test.ts` pins the lines' labels, and
`test/training.test.ts` takes the new words.

### D. The class the Review describes is the class recorded (C2-7)

`classYears` takes its history rows as an argument, with `s.history` as
the default. The Review builds the closing year's row as
`resolveAdmissions` will. It calls `captureYearSnapshot` with
`trailingYearSatisfaction(s)`, `projectedAttrition(s)`
(`yearInReview.ts:164`) and the seniors, then reads
`classYears(s, year, [...s.history, row])`. The stamp's order doesn't
change. Test, in `test/alumni.test.ts`: on guided summers in years 1, 2
and 6, the Review's memory clauses equal the stamped ones, and its warmth
matches to the figure shown.

### E. The teams opens on a team, and the ticker on the main chapter (C3-2, C3-5)

- *The teams* opens on `s.orgs.teams.length > 0`. The ladder's `sport`
  rung stays `varsityAsked`. In a guided run the Athletics tab follows the
  chapter (`TabNav.tsx:36-39`), so after a declined petition both stay
  shut until a team exists. "Field a varsity team" goes (§2), *about*
  opens with "A sport club has gone varsity.", and the help about a
  refusal goes. Saves that opened the chapter on a refusal keep it open.
  Plan 113C holds the mascot stop until this chapter opens, so the stop
  now waits for a team, as I7-2 asked.
- `currentChapter` returns the first open main chapter, or else the first
  open side chapter. A new `openSideChapters(s)` lists the rest. The
  ticker shows the current chapter only. The other open chapters go in
  the Guide's list, which the drawer already links, not in the drawer
  itself. Plan 112A cut the drawer to a title, an *about* and the
  objectives, and the owner left the drawer to it (C2-1), so this plan
  adds no section there. The ring functions keep reading
  `currentChapter`, and the venue's ring already reads `chapterOpen`.
- **C3-5.** While the two counts differ, *Seats for everyone* shows both:
  "240 taught · 320 with courses under way". `ObjectiveProgress` gains an
  optional `coming` figure, read from `placesComing`. The NEXT line stays
  as it is and agrees with the second figure.
- **The check.** A harness check runs the guided players
  (`sim/harness/guided.ts`, three seeds, ten years). It records the weeks
  from each chapter's opening to each of its required objectives. It fails
  if any takes more than a year, or if the ticker ever shows a side
  chapter while a main one is open. It goes in `npm test` if it fits, and
  in `test:slow` if it doesn't. `test/the-teams.test.ts` adds a declined
  petition: the chapter and the guided tab stay shut, and both open when
  the next petition is accepted.

### F. Doors that land (C3-9)

- `ringedBuilding` gains *Campus life*'s Student Center, *Research*'s
  first available lab and the Research Park. Each is ringed while its
  objective is unmet and the building is available, so `initialBuildTab`
  opens on its tab. *Capital projects* opens the build menu on its Capital
  projects tab.
- A NEXT `go: 'build'` whose intent names a building (`site` with
  `buildableIds`, or `build-for`) opens the menu on that building's tab
  and rings it. App's `onGo` passes the building's id to `setBuildOpen`.
- `Lever` gains `view` for the Treasury. *The alumni*'s campaign door opens
  on Endowment, through the overlay's existing `target`, which
  `TreasuryTab` reads for its first view.
- If a Show me's door is a tab that `tabAvailable` says is shut, the
  button doesn't show. A muted line takes its place, such as "The Research
  tab opens with your first lab.", read from the tab's ladder rung
  (`milestoneForTab`, `ladderData.ts:383`).
- The Curriculum's head shows NEXT's `freeSlot` step (`nextStep.ts:172`,
  exported) when there is one, as one line with its Go.

Tests: `test/build-tab.test.ts` checks each new ring and the NEXT build
door. `test/treasury.test.ts` checks the campaign door's view.
`test/chapters.test.ts` checks, over a guided run's saves, that no Show me
points at a shut tab.

### G. The small doubts (C3-12)

1. The search button's title adds: "It costs ${SEARCH_COST_WEEKS} weeks of running costs, so the price grows with the college."
2. The founding panel adds: "The price is the program's first course. Its later courses cost more."
3. The Paths tile adds: "Students wear tracks in the lawn along their busiest routes. Lay a path there and they'll use it." (The review's "paving one keeps the grass" is an aphorism, and it is unclear which grass is kept. The tracks are `desireLines`, `CampusMap.tsx:1118`.)
4. "Send the offers" sticks to the foot of the admissions aside, so it stays in view at 1280×720 every summer. The coach's ring scrolls it into view. Checked with `npm run review:gallery` at 1280×720.
5. The founding form becomes a `<form>`, and "Open the doors" is its submit. Enter founds once the button is enabled.
6. The placing strip stays "Click open ground to build · R turns it · Esc cancels" (`buildWords.ts:6`). Plan 111 already fixed the review's "break ground". "Open ground" is the one word in the strip that says why a click can fail, so it stays. The walkthrough's "anywhere on the map" is the first placement, where every tile is open.
7. A search's find becomes a toast in `toastsFor`.

Tests: `test/toasts.test.ts` checks that a search's find is a toast and an
ordinary listing is not. `test/founding.test.ts` checks Enter.
`test/text-check.test.ts` holds.

### H. The Curriculum at size (C2-4)

A row starts open only if you can act on it. Either its next course is
ready and someone can teach it (`canStartDevelopment`, ignoring the
committee's room, §2), or the program is dark. Every other row starts
folded. 107C stays: a row folds when its program finishes, and that
overrides an earlier click. `useCollapse` resets on finishing only,
through a separate `resetKey`, so a row that folds because its course
started keeps your click. With chapters on, every row stays open until
*A hall of its own* opens.

Tests: `test/collapse-defaults.test.ts` covers a ready row (open), a
waiting row (folded), a dark row (open) and a click kept after a course
starts. Measure with `npm run review:gallery` on the year 9, year 16 and
specialization saves (now 1,881, 3,561 and 3,883 words). The aim is review
II's level, under 1,200 words at year 16.

## 2. Decisions to take

- **The teams' first objective.** Once the chapter opens on a team, "Field
  a varsity team" is met on the day it opens. *Recommended:* drop it, so
  the AD leads.
- **"Can act on" with the committee full (H).** If a full committee
  counted, every row would fold when it fills and open again when a course
  finishes. *Recommended:* ignore the committee. A ready course with a
  teacher opens its row.
- **The Review's pillar detail.** "Academics stands at 47.7 of 150" uses
  the pillar's own scale, as the standings do. *Recommended:* keep it. Only
  "of 41.3" goes.

## 3. What this plan does not do

- **The owner chose to leave these:** C2-5 (admissions with no room, `2b`
  row 18), C2-10 (the glossary's last mile, though A's test will catch
  chapter 18's typed 30, 20 and 10), C3-1 (the Treasury chapter), C3-3,
  C3-4, C3-6 and C3-7.
- **Plan 112's:** C2-1 and C2-3. **Already fixed:** C2-8 (the calendar
  counts 1 to 52).
- **Plan 113's:** the mascot stop (I7-2) and the AD renaming the teams
  (C3-10). E only moves when *The teams* opens.

## 4. As implemented

- **A.**
  - The test is `test/briefing-numbers.test.ts`. The test runner now reads
    `typescript` from `node_modules` rather than bundling it.
  - The allow-list also holds a degree's "four years" and the speeds'
    "8×".
  - The chair's welcome letter (`eventData.ts`) typed "350" and "80" too.
    Both now read from the game.
  - The laboratories letter's ask needed a case with no lab standing.
  - *The next course*'s *about* keeps three sentences: "Each program has
    ten courses, and the curriculum committee writes them N at a time."
- **B.**
  - The weekly-climb sentence shows while `riseRateIn` is at or above
    `PRESTIGE_FALL_RATE`, which is through year 8, not until
    `EARLY_FADE_YEAR`. Both sentences are true in the years they show.
  - *Standing*'s *about* keeps three sentences.
  - The zero line reads the state (no lab, no team), so a pillar a capital
    project lifts before a lab still says what opens the rest.
  - History's help is built by `prestigeHelp(s)`, which uses the glance's
    `summerRule`.
  - The drawer's heading is the glance's own, "What lifts it".
- **C.**
  - Only the teaching axis names the top band, because the research axis
    has no room for the words.
  - The plot's grade labels are set in the UI's sans, not the monospace
    face.
  - The Training Institute's description says "one band better" too.
- **D.** The Review's row is captured before the summer moves the classes
  up. Only the "thinned" clause reads the enrolled count, and it didn't
  differ in the three summers tested.
- **E.**
  - The seats objective keeps the target: "240/350 taught · 320 with
    courses under way".
  - The team objectives count every team: "Fill every team's staff posts"
    and "Build every team's venue". With two teams, the old wording read
    "three staff posts 0/6".
  - The other open side chapters are listed first in the Guide, marked
    "open now".
  - **`test/chapter-pace.test.ts`** runs gated guided players on three
    seeds for ten years. The ticker never showed a side chapter over a main
    one. Five required objectives wait over a year. They are listed in its
    `KNOWN` with reasons and printed on every run, for the owner to decide:
    - *Teach 16 courses* and *Teach 24 courses*: 64–90 weeks.
    - *Site a lab*: 57–94 weeks.
    - *Commission research*: 72–122 weeks.
    - *Build the venue*: 235 weeks on a football seed.
  - The test hires team staff from the market and appoints the VP of
    Advancement, which the harness never did.
- **F.**
  - The Research and Research Park rings read whether their chapter is
    open, as the teams' venue does. They are side chapters.
  - A ring lights only a building the college can pay or borrow for. If it
    can't, the menu opens on the right tab with nothing ringed.
  - The no-shut-tab check is in `chapter-pace.test.ts`.
  - Checked in the built game: five of seven doors land and ring. The lab
    and the park opened on their tab unringed, because each was short of
    cash.
  - The shut-tab line can sit below the help card's visible edge. The card
    clipped before this PR.
- **H.**
  - `useCollapse` takes a `finished` flag in place of a `resetKey`.
  - Measured with `npm run review:gallery`, words and controls, before →
    after:

    | Save | Before | After |
    |---|---|---|
    | Year 9 | 1,517 / 205 | 1,321 / 170 |
    | Year 16, a crisis save with no cash | 3,726 / 504 | 1,017 / 58 |
    | Year 23, specialization | 3,863 / 537 | 3,735 / 517 |

  - With §2's committee rule, a solvent college with a full committee keeps
    every ready row open. Counting the committee would bring year 9 to 533
    words and year 23 to 993, at the cost of rows folding and reopening.
