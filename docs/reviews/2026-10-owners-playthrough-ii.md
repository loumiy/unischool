# The owner's second playthrough (October 2026)

*The owner's notes from a full run after Plan 95, sorted by the kind of work
each one is and read against the code (`main` at `60bac7e`). A snapshot like
the rest of this folder: what becomes of each note is recorded in the plan
that answers it. Paths are under `unischool/src/` unless they say otherwise.*

Two notes did not match the code, and the reading is given with them:

- **The day lights already run Monday to Sunday** (`components/DayTicker.tsx:10`).
  The last light never comes on, which made the week look shifted.
- **The "1x / 2x" marks in the build menu are tier pips** (`LevelPips`,
  `components/BuildPopup.tsx:403`). They show the entry's place in its chain
  (Student Center is tier 1 of 2, the Union Expansion is 2 of 2). They do not
  count what has been built.

---

## 1. Bugs: the cause is known, and each is a small PR

| # | Note | Cause | Fix |
|---|---|---|---|
| 1.1 | The last day light never lights | `litDays = floor(weekProgress() * 7)`. Progress stays in [0, 1), so it tops out at 6 (`DayTicker.tsx:32`) | Light the current day: `min(7, floor(p * 7) + 1)` |
| 1.2 | The curriculum lights stick at bright white | `CommitteeLamps.tsx:23-34`. The effect's cleanup cancels the pending 1.2 s un-flash whenever another course starts or finishes inside that window, so those ids stay in `flashing` for good | One timer per flash, cleared only on unmount, or an expiry time per id |
| 1.3 | The Faculty / Market / Departments switch jumps to the left under *Departments* | `.dept-bulk` joins the `.panel-head` with `margin-left: auto` (`styles.css:2449`) and takes the free space | Put the auto margin on the switch, or move the bulk buttons out of the head |
| 1.4 | The switch's thumb border is uneven (here, on Athletics' subsidy, everywhere `segmented switch` is used) | The thumb has a 2 px border plus `--shadow-1`, a 2 px offset shadow (`styles.css:286-290`) | Drop the shadow on `.segmented.switch::before` |
| 1.5 | Big gap between a label and its value in the faculty's *The person* | `.panel dl` (`1fr auto`, `styles.css:2005`) outranks `.faculty-person-facts` (`max-content 1fr`, `:2271`) | Raise the selector, e.g. `.panel .faculty-person-facts` |
| 1.6 | A hall's panel and the build menu can both be open | `buildOpen` lives in `App.tsx:115`; `inspectedId` is local to `CampusMap.tsx:1165`, and neither closes the other | Lift `inspectedId` to `App`; opening either closes the other |
| 1.7 | A fountain or statue can't be deleted | Demolition allows it (`state/demolition.ts`). But the drawn prop has no owner, so a click on it lands on the ground and never opens the panel that holds *Take down* (`groundMarkings.tsx:1652`, `canvasPaint.ts:707`) | Give the prop its owner's id, so a click opens the amenity's panel |
| 1.8 | A letter "from the President to the President" | About 45 `board`-domain events have no `from:`. The inbox labels the board domain `'The President'` (`systems/inbox/inbox.ts:153`) and writes "From X to the President" (`InboxTab.tsx:328`). The facilities letter is most likely `the-insurance-renewal` (`data/eventCatalogue.ts:1718`) | Give those events a `from:` (the board, buildings and grounds…), or relabel the board domain. Don't change `domain`: delegation routes on it |
| 1.9 | Students tab: Clubs and *The student body* run together, and so do *Last summer's funnel* and *The classes over the years* | The tab is several sibling `.tab-content` blocks, and nothing spaces them (`tabs/StudentsTab.tsx:25`; no `.students-tab` rule) | `.students-tab { display: flex; flex-direction: column; gap: 16px }`. Also, three of those panels use a bare `<h2>`, not `.panel-head` |
| 1.10 | The Recreation Center's glass shows the rock wall from every angle | The climb is drawn on whichever two walls are far from the camera (`buildingMotifs.tsx:4124`). The two near walls are always glass | Fix the climb to two of the tower's real walls; draw it only when those are the far walls |

## 2. UI changes the owner has already decided

- **Awaiting recognition becomes a half-panel**: `panel panel-span-2` →
  `panel` (`tabs/StudentLifeTab.tsx:422`). It then shares a row with Clubs,
  so check the order.
- **The faculty's *The person*** (`data/careerWords.ts`, `tabs/FacultyPerson.tsx`):
  - drop the explainers (`bioNote`, `nationalityNote` and the rest);
  - quirks show only the numbers: "teaching potential +4". Two catches:
    - the morale part is words today ("the students find them hard going");
      it needs a number, or it is dropped;
    - it says *potential*, and a hire's current stat starts at a fraction of
      that (see 4.2);
  - Pay is one number: drop `payNote` ("at a prestige-50 market"). The
    multiplier is 1.0 at or below prestige 50, so early in a run both
    numbers are the same anyway.
- **Delete the career chart's footnote** (`careerWords.ts:80`, `chartNote`).
- **Development buttons name the course**: "Develop *Intro to Sociology*
  with Pemberton (D)", not "SOCY 130". The title is already split out at
  `tabs/CurriculumTab.tsx:823` (`titleFromName`). It needs a look on the
  phone, where titles are long.
- **Upgrade levels in the build menu.** Take the tier pips off one-off
  chains. Show the level where there is one to add: a dorm's added stories
  (`floorsAdded`) and the library's renovation. Neither shows in the build
  menu today, and dorms collapse into "×N BUILT".

## 3. Text: cuts and renames already decided

Students tab:

| Now | Becomes | Where |
|---|---|---|
| "1,200/113 served" lines | dropped | `StudentLifeTab.tsx:198-208`, `:231` |
| "Basic needs" | "Dining" | `data/figureHints.ts:16`, plus the crowding label "dining" (`prestigeSystem.ts` `COVERAGE_LABELS`) |
| "Teaching, against what these students expect (A's in 24%…)" | "Average Course Grade (D-): +0" | `systems/satisfaction/satisfactionSystem.ts:326` |
| "Quads and the like, at any size" | "Green Space" | `satisfactionSystem.ts:323` |
| The student body's subtitle "750 students across four classes…" | deleted | `tabs/EnrollmentTab.tsx:109-113` |
| The † footnote "Juniors, Seniors carry no particular pull…" | deleted, with its † marks (`:62`) | `EnrollmentTab.tsx:142-149` |
| "The President answers them together at the summer's Students step…" | deleted | `StudentLifeTab.tsx:424-426` |

Notes for whoever does it:

- **The "1,200/113" case.** The Academic line counts library seats only. In
  that case the library earned its full 40 points and teaching (60 points)
  made the score low. Dropping the line removes the confusion.
- **"Basic needs" is not only dining halls.** It also counts the grocery,
  the towers' food halls (capped at 40% of meals together), downtown for the
  student-life specialization, and an affordability bonus. "Dining" still
  fits them, but the affordability bonus shows as its own line under it.
- **The average course grade already exists.**
  `meanGradeLetter(meanGradePoints(campusCourseScores(s)))` gives letters
  with +/−, and prestige already says "courses average a B+". Points are 0
  for any average at or below C, so "(D-): +0" is what a player sees in
  year 1. The expectation stays hidden, as the owner asked.

## 4. Balance

### 4.1 The first three years are slow

The owner's numbers: year 1 at prestige 41.6, tuition $25k, **34
applicants**, net $44.9k/wk. Year 2 at $20k: 474 applicants, $138.9k/wk.

What the code says (`systems/admissions/admissionsSystem.ts`):

- **The price.** At prestige 41.6 the families' tolerance is
  $12,000 + 190 × prestige ≈ **$19.9k**. So $25k is 26% over it, in the
  "expensive" tier, and sticker shock applies. Price and shock together
  shrink the pool to about 0.21 of what it would be, against 0.36 at $20k.
  That accounts for about 1.75× of the 14× difference.
- **The rest is very likely year 1 itself** (estimated, not measured in
  that run). Almost no beds (capacity factor near 0.35), crowding (the
  pool's crowding factor goes as low as 0.1), and low satisfaction
  (word of mouth). The second review measured year 1 at crowding −11.5,
  with no beds until week 25
  ([`b3-opening-prestige.md`](2026-10-game-review-ii/data/b3-opening-prestige.md)).
- **The year 1 summer crowding line points the same way.** It read
  "Crowding −9.9… (dining 51%)", which is the "Crowding" line in 4.4.
- **What throttles courses** is cash up front ($300k for a tier-1 course)
  and the committee's four seats. Money does not shorten development.
- **The pacing harness can't show any of this yet.** It records applicants
  and net per week for every year (`sim/pacing.ts`), but its report prints
  nothing before year 10.

Levers, for the owner to choose from:

- show the tolerance on the tuition slider, beside the tier colour (the
  backlog's *The price is set blind* is the same complaint);
- soften the year 1 pool: a smaller crowding or capacity penalty for the
  founding class, or a founding cohort that comes whatever the price;
- a cheaper first tier of courses, or a fifth seat early on;
- print years 1–5 in the pacing report first, so a change can be measured.

### 4.2 Faculty: the 55% start, and the early market

**The 55% start is confirmed.**

- Every rolled candidate's current teaching and research is
  `round(0.55 × potential)` (`data/facultyData.ts:627`, `:830`). It grows
  toward the potential, closing 95% of the gap in six years.
- So a fresh hire's current stat is at most 55, and no new hire opens above
  C. `data/courseQuality.ts:11` says so in a comment.
- The founding three are written by hand and arrive at about 79%.

**The early market**, at prestige below 50: both centres sit at 50, spread
±20, with 3% standouts. Per candidate:

| Outcome | Chance |
|---|---|
| Potential A, teaching or research | ~4% (about 5 a year across all fields) |
| Potential B or better (teaching) | ~14% |
| Current F | ~62% |
| Current D | ~37% |
| Current C | ~2% |

**The owner's direction**: current and potential rolled separately, with
potential ≥ current. Current ability weighted heavily to C, D and F early
on. Potential spread fairly evenly, with an occasional A-tier right away.

Things that move with it:

- the `0.55` comment in `courseQuality.ts`;
- `grownStat` and the six-year growth, which needs a starting point per
  person;
- the quirk text (2);
- the founding three;
- salaries, which are priced from the stats;
- saves: existing faculty keep their stats, but `grownStat`'s
  inputs change.

### 4.3 Targets against actuals (to the backlog, as the owner asked)

- **Satisfaction** shows *target* and *today* (`StudentLifeTab.tsx:269`),
  and so does the summer modal.
- **Prestige** shows "current → target" and "Drifting toward…"
  (`tabs/StandingBreakdown.tsx:123-187`).
- The owner likes the idea but suspects it confuses. Not decided.

### 4.4 The summer's "Crowding" line

"Crowding −9.9 of prestige's grade (dining 51%)" means: admit this class,
and dining feeds 51% of the students. Below 85% coverage, the worst-covered
need (housing, dining, health or instruction) takes up to 25 points off the
prestige target. Here it is about 9.9 (`systems/admissions/consequences.ts:152`,
`components/InterruptModal.tsx:445`).

A plainer line, for example: "Dining feeds only 51% of this class: prestige
target −9.9".

## 5. Performance: slow late campuses, even off the map

From reading the code; nothing was profiled.

1. **The whole state is cloned every tick.** `structuredClone(state)` on
   every action (`engine/reducer.ts:159`), and a 50 ms sampler dispatches
   ticks (`engine/useGame.ts:114`). A new identity for every object means
   every `memo` keyed on `s` re-renders, and so does the open tab. This
   grows with the state (about 470 courses, faculty, history, alumni,
   cohorts). It matches the backlog's measurement: 68 of 76 ms of a
   building's completion is the game's own update.
2. **The map keeps drawing under a tab.** The overlay is opaque, but
   `CampusMap` stays mounted. Walkers run an endless `requestAnimationFrame`
   and request canvas frames (`components/Walkers.tsx:514`), up to 400
   walkers (`:37`). Nothing checks the overlay or `document.hidden`. This is
   why it is slow "even when not looking at the campus".
3. **`campusLayout(s)` and `crowdedVenues(s)` are recomputed every tick**,
   because they are keyed on `s` (`components/campusLayout.ts:124`,
   `CampusMap.tsx:1185`).

The cheap wins are (2) and (3): stop the walkers and the canvas while a tab
covers the map or the page is hidden, and key the layout on placements,
pathways and tech. The real fix for (1) is structural sharing in the
reducer, or the backlog's *sim on a worker thread*. Profile a year-25+ save
first.

## 6. Design questions for the owner

- **"Est. Year 1"** (`components/Pennant.tsx:5`, `FOUNDED_YEAR = 1`). The
  game has no calendar. Either drop the line, or set a start year (2027).
  Using 2027 raises the next question: does the clock then read 2027, 2028…
  everywhere `gameDate` writes "Year N"?
- **The curriculum's level of detail.** Naming the course (2) is agreed.
  The wider question stays open: keep every course's detail reachable
  without a wall of courses.
- **Too much text, throughout.** A full pass to cut words while still
  teaching what each number means and what to do. It belongs with the
  owner's human edit of the most-read text (the backlog's B6-3).
- **The first three years.** A slow start feels like real work, but may
  lose new players. Which of 4.1's levers to pull, if any.
