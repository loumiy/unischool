# Plan 96 — The owner's second playthrough

*Planning document only — no gameplay code is changed by this file. Its job
is to turn the owner's notes from a full run after Plan 95, read against the
code in [`docs/reviews/2026-10-owners-playthrough-ii.md`](../reviews/2026-10-owners-playthrough-ii.md),
and the owner's answers to its questions, into PRs.*

**Status: Proposed.**

---

## 0. Where this comes from

The owner played a run after Plan 95 and sent notes on the UI, the gameplay,
the authored text, one asset and the opening's pace. The review sorted them
and read each against `main` at `60bac7e`. It found:

- ten bugs with a known cause;
- UI and text changes the owner had already decided;
- balance: the slow first three years and the faculty's 55% start;
- performance late in a run;
- four questions, which the owner then answered (the review's §7).

Section numbers below (§1.3, §4.1…) are the review's.

## 1. The owner's decisions

1. **"Est. Year 1" goes.** The game keeps no calendar and no start year.
2. **The curriculum names its courses**: "Develop *Introduction to
   Sociology* with Pemberton (D)", not "SOCY 130". The rest of the
   curriculum's layout stays as it is for now.
3. **No formal text pass.** This plan makes the cuts the owner listed, and
   extrapolates from them to the same kinds of text elsewhere (2 below). The
   owner keeps noting text to cut in future reviews.
4. **Measure the opening before tuning it.** The pacing report prints
   years 1–5 first. The levers are chosen from what it shows (PR I).
5. **Faculty: current and potential are rolled apart** (the owner's note,
   §4.2):
   - the potential is always at or above the current;
   - early candidates' current ability is heavily C, D and F;
   - their potential is spread fairly evenly, with an occasional A right
     away.
6. **Targets against actuals stay as they are.** The question waits in the
   backlog (§4.3).

## 2. The rule for cutting text

A cut is taken when the text does any of these:

- **explains a label the label already says.** "Their field and what they
  work on." beside *Background*;
- **narrates how a number is made**, where the number and its parts are
  already on screen. The student body's subtitle, "Teaching, against what
  these students expect…";
- **restates the panel as a footnote.** The career chart's footnote, the
  student body's † line;
- **says when or where something else happens**, where that place already
  says it. "The President answers them together at the summer's Students
  step…".

A cut is not taken when the text is the only place a player learns what a
number means or what to do about it. When in doubt, the text moves into the
figure's hint (`data/figureHints.ts`) rather than going.

## 3. The PRs

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | This plan; the backlog | no | no |
| B | The opening, measured | no | no |
| C | Fixes | no | no |
| D | Screens | no | no |
| E | Words | no | no |
| F | The Recreation Center's climbing wall | no | no |
| G | A full campus, faster | no | no |
| H | Faculty: current and potential rolled apart | re-recorded | bump |
| I | The opening, tuned | re-recorded | maybe |

**Order.**

- B lands first, so the opening has numbers before anything moves it.
- C, D, E, F and G touch no simulation and land in any order, side by side.
  D and E both touch `StudentLifeTab.tsx` and `careerWords.ts`, so whichever
  lands second merges the other in.
- H moves the baseline and re-runs B's report. Better early faculty change
  the opening, so the owner reads the opening after H, not before.
- I lands last, with the levers the owner picks from H's re-run of B.

**Rules for every PR** (as in Plans 80 and 95):

- `npm run check` passes. `npm run sim` matches `sim/baseline.json`, except
  in H and I, which re-record it with the owner's sign-off and say how it
  moved and why.
- Player-facing words follow Plan 47's glossary. `review:strings`' flagged
  counts don't rise.
- A changed state shape bumps `SAVE_VERSION` (99 today) with a migration and
  a fixture of the version before.
- A visual PR carries screenshots in `docs/reviews/2026-10-playthrough-fixes/`,
  desktop and phone. A map change also shows more than one vernacular and
  camera, on the canvas and on the SVG fallback (`?map=svg`).
- Presentation never touches the run's random stream.
- Each PR adds an **As implemented** note to its section below.

---

## PR 96B — The opening, measured

The pacing report has a row for every year (`sim/pacing.ts`'s `PaceYear`
records `netPerWeek` and `applicants`) but prints nothing before year 10.
This PR prints the first five years. It changes nothing in the game.

- **A table per player and seed, years 1–5**, as each year opens (the
  summer just closed):
  - tuition;
  - applicants;
  - enrolled;
  - beds;
  - net per week;
  - cash;
  - prestige and its target;
  - satisfaction;
  - courses on offer, and courses in development.
- **The applicant pool's factors** for the same summers, from
  `FunnelFactors` (`admissionsSystem.ts:448`):
  - price;
  - sticker shock;
  - capacity;
  - word of mouth;
  - crowding;
  - beauty and cohort demand.

  This is the table that says which factor made year 1's 34 applicants.
- **The owner's own price.** One extra Natural run per seed with tuition
  fixed at $25,000 in year 1 and $20,000 in year 2, the owner's two
  summers, so the report shows the case that was played.
- The report is written as `docs/reviews/2026-10-pacing-opening.md`. The
  scorecard's targets are unchanged. Year 1–5 rows get no targets, only
  numbers.
- **Checks:**
  - `npm run sim` is unchanged;
  - the report's year-10 and later rows match `2026-10-pacing-rebased.md`.

## PR 96C — Fixes

The review's §1, except 1.8 (D and E) and 1.10 (F). Each is small, and each
gets a test where the logic is testable.

- **The last day light** (§1.1). `DayTicker.tsx:32` lights the current day:
  `min(7, floor(p * 7) + 1)`. Sunday lights for the week's last seventh.
- **Lamps stuck white** (§1.2). `CommitteeLamps.tsx`: each flash gets its
  own expiry time, kept in a ref and cleared only on unmount, so a second
  course starting inside 1.2 s no longer cancels the first one's un-flash.
- **The segmented switch** (§1.3, §1.4):
  - the switch keeps its place in the panel head: the auto margin moves
    from `.dept-bulk` to `.dept-views`;
  - the thumb loses its offset shadow (`.segmented.switch::before`), so its
    border is even. The same rule serves Faculty, Athletics' subsidy and
    every other switch.
- **The person's facts** (§1.5). `.panel .faculty-person-facts` wins over
  `.panel dl`, so values sit beside their labels.
- **One panel at a time** (§1.6). `inspectedId` moves up into `App`.
  Opening a building's panel closes the build menu; opening the build menu
  closes the panel.
- **Amenities can be taken down** (§1.7). The fountain's and the statue's
  props carry their owner's id on the canvas hit list and the SVG scene, so
  a click opens the amenity's panel with *Take down*.
- **The Students tab's spacing** (§1.9). `.students-tab` stacks its blocks
  with the 16 px gap the others have. *The student body*, *Last summer's
  funnel* and *The classes over the years* take `.panel-head`, like Clubs.
- **Checks:**
  - unit tests for the day count and the lamps' flash expiry;
  - the screenshots in Rules;
  - a demolish of a fountain from a click, in the review harness.

## PR 96D — Screens

The review's §2 and the owner's decisions 1 and 2.

- **Awaiting recognition becomes a half-panel** (`StudentLifeTab.tsx:422`).
  It sits beside Clubs, at the head of the clubs block, so its two
  half-panels share a row.
- **The faculty's *The person*** (`FacultyPerson.tsx`, `careerWords.ts`):
  - no explainer under any fact;
  - a quirk reads as its name, its line, and its numbers only: "teaching
    potential +4, morale −2". `morale` is already a number in
    `quirkData.ts`;
  - Pay is one figure, today's pay. `payNote` goes.
- **The career chart's footnote goes** (`careerWords.ts:80`). The grade
  bands stay drawn.
- **Courses named, not numbered** (decision 2). Wherever the Curriculum or
  the Faculty tab writes a code on a button, it writes the course's title:
  - `RowAction`'s *Develop … with …* (`CurriculumTab.tsx:873`);
  - the batch button;
  - the drawer's *Develop*;
  - the Faculty tab's *Worth taking* (`unblocks`, `hiringNext.ts:48`).

  The code stays in the course cell and in the tooltip. On a phone, a title
  that does not fit is cut with an ellipsis, and the tooltip carries the
  rest.
- **Levels where there is a level to add** (§2). The build menu's tier pips
  go. A building that can be raised shows its level as pips in its own
  panel, beside the button that raises it:
  - a residence's added stories (`floorsAdded`, out of its maximum);
  - the library's renovation;
  - a chain's step (Student Center, then Union Expansion).
- **"Est. Year 1" goes** (decision 1; `Pennant.tsx:5,20`). Nothing replaces
  it. The pennant is checked at its longest name.
- **Checks:** the screenshots; `npm run phone`.

## PR 96E — Words

The review's §3, §1.8 and §4.4, then the same rule applied further (2).

- **The Students tab** (§3's table):
  - the "#/# served" lines go, on the cards and in the drawer;
  - "Basic needs" becomes "Dining", here and in the crowding label;
  - the teaching line reads "Average course grade (D−): +0", built from
    `meanGradeLetter(meanGradePoints(campusCourseScores(s)))`. Points are
    unchanged. The students' expectation is no longer printed;
  - "Quads and the like, at any size" becomes "Green space";
  - the student body's subtitle, its † footnote and its † marks go;
  - Awaiting recognition's sentence goes.
- **The summer's crowding line** (§4.4) reads "Dining feeds only 51% of
  this class: prestige target −9.9". The worst-covered need's name comes
  first; the hint keeps the full rule.
- **Letters from the board** (§1.8). Every `board`-domain inline event
  without a `from:` gets one: "The board", or "Buildings and grounds" for the
  insurance renewal, the heating bill and the roofing contract. `domain` is
  not changed, because delegation routes on it. A test fails any inbox item
  whose sender is the President.
- **The rule, applied further.** One pass over the screens a first run
  reads most:
  - Students;
  - Faculty and its person;
  - Curriculum;
  - the summer;
  - Treasury (its version of the student-body line, `TreasuryTab.tsx:71`).

  It cuts what 2's rule names. Each cut is listed in the As implemented
  note, so the owner can put any back. Letters and events are out of scope:
  they wait for the owner's human edit (BACKLOG, B6-3).
- **Checks:**
  - `review:strings`;
  - the "#/# served" and President-to-President tests;
  - the screenshots.

## PR 96F — The Recreation Center's climbing wall

§1.10. `RecCenterShed` (`buildingMotifs.tsx:4101`) draws the climb on
whichever two walls are far from the camera, behind two always-glazed near
walls.

- The climb goes on two fixed walls of the tower: its two inner walls,
  `opposite(corner.colWall)` and `opposite(corner.rowWall)`.
- It is drawn through the glass only when those walls are the far ones.
- From the other cameras, the near walls that carry the climb are solid,
  and the glass shows the gym floor, not panels.
- **Checks:**
  - the asset gallery (`npm run gallery:assets`), all four cameras, every
    vernacular;
  - the canvas and the SVG fallback.

## PR 96G — A full campus, faster

§5. Profile first, then the two cheap fixes. The structural one stays in
the backlog.

- **Measure.** A year-30 and a year-45 save from `npm run scenario`, through
  `npm run profile` at each speed:
  - with the map showing;
  - with a tab open over it.

  Record frames per second, the 95th-percentile frame and long tasks.
- **The map rests under a tab.** While a tab overlay covers the map, or the
  page is hidden:
  - `CampusMap` gets `gait = 0` and a `hidden` flag;
  - the walkers' `requestAnimationFrame` loop stops;
  - the canvas asks for no frames.

  All three resume where they were when the map shows again.
- **The layout keyed on what it reads.** `useCampusLayout` and
  `crowdedVenues` are memoised on placements, pathways, tech and enrolment,
  not on `s`, so a tick that changes none of them recomputes neither.
- **Measure again**, and write both tables in the As implemented note.
- If the profile shows the reducer's `structuredClone` (`reducer.ts:159`) is
  still most of a tick at year 45, the PR says so with the numbers. That
  work joins the backlog's *sim on a worker thread*, which it belongs with,
  and is not done here.
- **Checks:**
  - `npm run sim` unchanged;
  - a test that the walker loop stops while hidden.

## PR 96H — Faculty: current and potential rolled apart

Decision 5. Today every rolled candidate's current stats are
`0.55 × potential` (`facultyData.ts:627`, `:830`), so no new hire opens
above C.

- **The potential, spread wider early.** At founding standing (centre 50)
  the market's spread flattens and widens: from a triangle of ±20 with 3%
  standouts to a flatter, wider shape, with its width set by the targets
  below. As standing rises the centre climbs
  as today (`marketCenters`) and the spread narrows back toward today's.
- **The start, per person.** Each candidate gets a `startFraction`: how far
  along their potential they are at hire. It is drawn from a hash of the id,
  as the quirk is, so the run's random stream is not moved. It lies in
  about 0.4–1.0, weighted low, so most arrive well short of their potential
  and a few arrive at it. The current stat is
  `round(startFraction × potential)`, never above the potential.
- **Growth from that start.** `grownStat(potential, start, tenureWeeks)`
  closes the gap from the person's own start, with the same six-year curve.
  The training path (`facultySystem.ts:46`, `training.ts:90`) takes the same
  start.
- **Targets per year 1 candidate, in teaching**, for the owner to sign
  off. Research follows the same shape. Today's odds are in the review's
  §4.2.

  | | Today | Target |
  |---|---|---|
  | Potential A | ~2% | ~10% |
  | Potential B | ~12% | ~20% |
  | Current A | 0% | ~1% (the occasional A right away) |
  | Current B | 0% | ~5% |
  | Current C | ~2% | ~20% |
  | Current D or F | ~98% | ~74% |

- **What moves with it:**
  - `courseQuality.ts`'s comment that no fresh hire opens above C;
  - the quirk words: "potential" is now said only where it is meant;
  - the founding three: they keep their written potentials, and take a
    `startFraction` that reproduces today's stats, so the opening is
    unchanged by them;
  - salaries, priced from current stats: a high-potential, low-current hire
    is cheap, which is intended;
  - Plan 84's Faculty-tile meter ("C → A") reads right as it is.
- **Save.** `startFraction` is a new field: version 100. The migration sets
  0.55 for everyone already on a roster or in the pool, so a loaded run's
  people do not jump.
- **Re-run B's report** after the baseline is re-recorded. The PR states how
  years 1–5 moved: better early teaching should raise satisfaction, word of
  mouth and the year 2 pool.
- **Checks:**
  - a test of the year 1 distribution against the targets (10,000 draws);
  - current ≤ potential always;
  - the migration fixture;
  - the slow suites.

## PR 96I — The opening, tuned

Decision 4. The owner reads B's tables as H re-ran them and picks levers.
The candidates from the review's §4.1:

- the tolerance shown on the tuition slider beside the tier colour (also
  answers the backlog's *The price is set blind*);
- a softer year 1 pool: a smaller crowding or capacity penalty for the
  founding class, or a founding class that comes whatever the price;
- a cheaper first tier of courses, or an early fifth committee seat.

This section is written in full once the owner has chosen. Its rule is set
now: whatever it changes is measured by B's report, years 1–5, before and
after, and the scorecard's later targets still pass.

---

## 4. The backlog

- The *Awaiting the owner: the second playthrough* entry points here.
- *Targets against actuals* stays there, undecided (decision 6).
- If G finds the reducer's clone is still most of a late tick, its numbers
  go into *The sim on a worker thread*.

## What this plan does not do

- No calendar and no start year (decision 1).
- No change to how the curriculum lays out its courses beyond their names
  (decision 2).
- No pass over letters, events or the Final Report's prose. That is the
  owner's human edit (B6-3).
- No change to targets against actuals (decision 6).
- No structural rewrite of the reducer, and no worker thread (G measures;
  the backlog keeps it).
