# Plan 72 — The owner's answers on the backlog

*Planning document only. Its job is to turn the owner's answers into PRs.*

**Status: Proposed.**

---

## 0. The owner's answers

The backlog, re-read after Plan 70J ([#192](https://github.com/loumiy/unischool/pull/192)),
was put to the owner as twenty-one questions with a recommendation each. The
answers:

| # | Question | Answer |
|---|---|---|
| 1 | The high-price line misses its year 10–30 checkpoints: move the targets or the economy? | **Move the targets** (recommended) |
| 2 | Can first place be taken once held? | **Yes, late and only when the college's standing slips** (recommended) |
| 3 | `star-poached` says a professor may leave, and nobody does | **Make the departure real** |
| 4 | Write the 49 graduate course descriptions | **Yes** |
| 5 | The small cleanups | **Yes.** The residences: **take v2's residence types** in place of the same-looking hall repeated |
| 6 | Sort and filter on the Faculty tab | **Yes** |
| 7 | A full residence marked on the map | **Yes** |
| 8–10 | A budget and a CFO; poaching and retention as a plan; events that reach further | **Deferred,** kept in the backlog |
| 11 | Clubs stop counting at the social cap | **Yes:** diminishing returns in place of the cap |
| 12 | The split-school trap | **Explained;** waiting on the owner |
| 13–14 | The admit rate's early slope; the partly answered notes | **Deferred** |
| 15–16 | Events in the founding years; night and seasons on the map | **No,** and off the backlog |
| 17–21 | Athletics deferrals; Plan 70's deferrals; direction items; 70K; 70L | **Deferred** |

## Rules for every PR in this plan

- One branch per PR (`plan-72x-subject`), merged once `check` and `slow`
  pass.
- **Balance moves only where the PR says so** (H, I and J). Everywhere else
  `npm run sim` reads the same as `sim/baseline.json`.
- Randomness for presentation never touches the run's stream (hash, as
  Plan 70I's `pickLine`).
- Any state-shape change ships a save migration and a version bump.
- Each PR writes an **As implemented** note here.

## The map

| PR | Subject | Answer | Moves balance |
|---|---|---|---|
| A | This plan; the backlog updated | — | no |
| B | A professor who is poached leaves | 3 | a little (a lost professor) |
| C | Graduate course descriptions | 4 | no |
| D | Residences from v2 | 5 | no |
| E | The charter as a log line; two unused effects gone | 5 | no |
| F | Faculty tab: sort and filter | 6 | no |
| G | A full residence on the map | 7 | no |
| H | Clubs with diminishing returns | 11 | yes |
| I | A first place that can be taken | 2 | yes |
| J | The scorecard: the high-price line's targets, re-read after H and I | 1 | targets only |
| K | The Japanese garden, in place of a formal garden drawn as a small Grand Quad | the owner, later | no |

B through G can land in any order; H and I before J, since J re-reads the
scorecard they move.

---

## PR 72A — The plan

- This document, and its row in `docs/plans/README.md`.
- `BACKLOG.md`: the items this plan takes point here; the quiet founding
  years and night and seasons on the map come off (answers 15–16).

## PR 72B — A professor who is poached leaves

- The catalogue gains a **faculty departure effect**: the professor the
  event names leaves the college, as a resignation does (their courses go
  dark until restaffed, their research seat empties), with a log line.
- `star-poached`: *Counter the offer* pays and keeps them (as now); *Wish
  them well*, the default, now loses them. The event reads as a real
  choice. `admissions-poached` is read for the same fault and fixed if it
  has it.
- **Checks:** the event's default removes exactly the named professor; a
  counter keeps them; the content check knows the new effect.
- **Balance:** a few professors a run leave. Measured with `npm run sim`;
  the baseline re-recorded if it moves, and the move written down.

**As implemented** (PR B):
- A catalogue effect, `departs`: the professor the firing named leaves
  through `leaveFaculty` (their courses wait for a new instructor, as when
  anyone leaves), with a departure line in the log. The firing now keeps
  the professor's id beside the name (`vars.facultyId`, drawn with the
  name so the stream reads the same); a firing saved before finds them by
  name, and one whose professor has already gone takes nobody. The event
  panel names who leaves.
- `star-poached`'s *Wish them well* (the default) carries it; *Counter the
  offer* keeps them. `admissions-poached` is about the Director of
  Admissions, who is not on the roster, and already costs enrollment and
  confidence; it is left as it is.
- **Balance** (`npm run sim`, re-recorded): the harness players still
  finish where they did (Completionist and Guided #1 at year 50);
  Guided's year-50 prestige +2.0 and cash −$19.6M, Selective and Lean a
  few ranks better at year 50 (14 and 33), and Idle, which answers
  nothing, empties faster (21 students at year 25 against 69), as it
  loses its professors to every offer.
- **Checks:** `test/poached.test.ts` (the default removes exactly the named
  professor and orphans their courses; a counter keeps them; an older
  firing finds them by name; one already gone takes nobody).

## PR 72C — Graduate course descriptions

- The 49 graduate courses get a sentence each, written as the undergraduate
  ones were in Plan 20, in place of the generated line in
  `courseDescriptions.ts`.
- **Checks:** the description test covers every graduate course; none
  empty, none repeated.

**As implemented** (PR C):
- There are 53 graduate courses, not 49 (the MD has twelve, law eight, the
  MBA five, and each of the six doctorates and the MFA four). Each has an
  authored sentence in `GRADUATE_COURSE_DESCRIPTIONS`
  (`data/courseDescriptions.ts`), in the undergraduate register. The entry
  course of each program follows it with its gate ("Founds the law school
  (JD); offered once …"), composed in `techData.ts` from the seed as
  before. Saves pick the new text up on load (Plan 46's catalog refresh).
- **Checks:** `test/course-descriptions.test.ts` covers the graduate
  courses: every one has a sentence, one capitalized sentence each, no
  course code or "this course", none copied, and the Buildable carries it
  (the entry course with its gate after). `docs/design/curriculum.md` says
  so.

## PR 72D — Residences from v2

- v2 (`loumiy/unischool-v2`, `src/content/buildings.json`) has several
  residence types, each its own form: the **Residence Hall** (a long
  four-storey block of ranked windows under one roof), the **House**
  (small, a tutor on the ground floor), the **Apartment Block** (kitchens
  and a lock on every door, for the upper years) and the **Residential
  College** (beds round a court with a hall and a master's lodging). v2
  also varies neighbouring halls so no two read the same.
- The eight hall rungs (four of 500 beds, four of 1,000) take these forms
  and their own blurbs in place of one look repeated, each drawn in the
  college's vernacular. Beds, costs and build weeks stay as they are, so
  the balance reads the same. The villages and towers keep their own forms.
- **Checks:** every rung has a distinct form and blurb; screenshots of a
  campus with all of them in each vernacular.

**As implemented** (PR D):
- Five forms after v2's residence types (`buildingSpec.ts`'s
  `RESIDENCE_FORMS`, keyed by rung id, so nothing is stored), each a roof,
  a wall, balconies or none, and a front door:

  | Form | From v2 | Roof | Wall | Balconies | Door |
  |---|---|---|---|---|---|
  | Residence Hall | Residence Hall | gabled | the residences' dark brick | yes | residential |
  | House | House | gabled | red brick | no | residential |
  | Suites | Graduate House | gabled | buff brick | no | formal |
  | Apartment Block | Apartment Block | flat | render | yes | residential |
  | Residential College | Residential College | gabled | the civic stone | no | formal |

  The eight rungs, in the order they unlock: House, Residence Hall, Suites,
  Apartment Block; then Residential College, Apartment Block, Residence
  Hall, Suites. Walls vary by vernacular as every wall does, except the
  apartments': a flat block is modern in every vernacular (the rule the
  hospital follows), so it takes render where v2 has buff brick. v2's
  Suites are limestone and its college red brick; here they are swapped
  to buff and stone, since red brick is already the House's.
- Each rung has its own blurb, adapted from v2's, naming no material
  (walls change with the vernacular). Beds, costs, build weeks and
  footprints are unchanged; Meadow House, the villages and the towers keep
  their own forms. `npm run sim` reads the same.
- **Checks:** `test/building-spec.test.ts`: every hall rung has a form, no
  two neighbouring rungs share one, every form draws differently and the
  same wherever it stands, and every rung has its own blurb. Screenshots
  of all eight in each vernacular: `docs/reviews/2026-09-residences/`.

## PR 72E — The charter, and two unused effects

- **The charter** stops being a modal: a log line, and a rename button
  where the college's name is shown.
- **`tuitionBonus` and `unlockIds`** are deleted from `BuildableEffects`
  and `techSystem.ts`; no building sets them.

**As implemented** (PR E):
- **The charter** is granted, not asked: the first quiet week after a lab
  is at work, the trustees grant it with a log line naming the new name
  and where to change it. It still takes that week as its own, as the
  modal did, so `npm run sim` reads the same. The modal, its action and
  its default answer are gone.
- **Renaming, from the pennant** (`RENAME_COLLEGE`): a small button on the
  college's pennant opens a form with the name the founding screen took
  (same rules: a typed "College" or "University" is dropped, 60 letters
  at most) and College or, once chartered, University. Either way, as
  often as the player likes, with a log line.
- **Saves:** version 79. A version-78 save held at the old modal loads
  chartered, the week moved on as answering it did
  (`test/fixtures/save-v78-charter.json`).
- **`tuitionBonus` and `unlockIds`** are gone from `BuildableEffects` and
  `techSystem.ts`; the admissions doc no longer mentions the first.
- **Found on the way:** `prestigeSystem.ts` read satisfaction's
  `TARGET_RATIO` at module load, and the two modules import each other,
  so a test bundle that loaded prestige first failed (`save-load` alone,
  even on `main`). It reads it when used now.
- **Checks:** `test/charter.test.ts` (the grant, with no modal, once; the
  rename's rules; the version-78 fixture migrates); `save-load`'s version
  checks no longer assume the version before this one is 77.

## PR 72F — Faculty tab: sort and filter

- Sort by teaching, research, salary, years left and department; filter by
  department and by *short-staffed*. The choice is kept for the session.
- **Checks:** the phone check at 390 wide; a test of the sort orders.

**As implemented** (PR F):
- Above the department board: *Sort people by* (teaching, research,
  salary, years left, name), *Department* (all, or any the college uses),
  and *Short-staffed only* (departments short, or with more on offer than
  the roster teaches). The sort applies to the roster and the market
  alike; ties go by name, so a week's growth never shuffles equals. Years
  left counts to retirement (`careerWeeks`). Picking a department opens
  it. The choice is kept for the session in the tab's module, not in the
  save. The market used to be ordered by teaching and research together;
  it now follows the chosen sort, teaching by default.
- The logic is pure (`tabs/facultySort.ts`) and tested
  (`test/faculty-sort.test.ts`); the phone check passes the tab at 390 and
  820 wide.

## PR 72G — A full residence on the map

- A residence at capacity shows a small mark on the map (no text), in the
  style of the labs' ring (Plan 41); gone when a bed frees. Reduced motion
  respected.

**As implemented** (PR G):
- Beds are one pool in the simulation, so which residence is full is a
  reading (`components/residenceFill.ts`): the students who want a bed,
  the enrolled body at the housing standard satisfaction holds the college
  to (`expectedRatio(s, 'housing')`, 35% rising with prestige), take beds
  in the order the residences opened, oldest first. A residence whose
  every bed is taken is full. Short of beds, every one is; with room, the
  newest are not; one going up holds nobody.
- The mark is the labs' dark disc with a ring in the school's second
  color and a bed on it, over the residence's name, with "Full: every bed
  taken" on hover. It is still, so reduced motion has nothing to stop.
  Nothing is stored and nothing moves in the sim.
- **Checks:** `test/full-residence.test.ts`. The launch fixture's
  residential quarter: `docs/reviews/2026-09-residences/full-mark.png`.

## PR 72H — Clubs with diminishing returns

- The social bonus's hard cap (`STUDENT_LIFE_SOCIAL_BONUS_CAP = 30`)
  becomes a curve: each club counts for less than the one before, so a new
  club always counts for something. Tuned so a typical mid-game college
  reads about where it does now.
- **Balance:** measured; baseline re-recorded; the move written down.

**As implemented** (PR H):
- A probe of four harness players on two seeds found the raw sum
  (clubs, chapters and athletics) past 30 by years 15-20 in every run,
  and at 45-90 later, so the old cap made every club after mid-game
  worth nothing.
- The cap is now a curve (`studentLifeSocialCurve`): the first 20 points
  count in full, and each point past them less than the one before,
  approaching 40 without reaching it. A sum of 40 reads ~33, near the
  old 30; a club at a sum of 90 still counts. Satisfaction reads the
  curve; campus-life standing keeps reading the uncurved sum against the
  old 30 (`STUDENT_LIFE_PRESTIGE_FULL`), so the standings do not move.
- **Balance** (`npm run sim`, re-recorded): small. Selective's year-50
  satisfaction −2.4 and cash +$5.2M; Guided's year-50 prestige −1.2 and
  cash −$17.8M; every other reading within noise. Completionist and
  Guided still finish #1.
- **Checks:** `test/social-curve.test.ts` (full to the knee, every point
  adds less than the last, never the top, a sum of 40 near the old cap,
  a late club still counts). `docs/design/student-life.md` says so.

## PR 72I — A first place that can be taken

- The elite band's no-leapfrog rule (`ELITE_NO_LEAPFROG_GAP`) lifts in the
  last fifteen years, and only against a college whose standing has
  slipped (below its own best by more than a small margin), so a college
  that keeps its standing keeps #1 and one that lets it go can lose it.
- A rank lost this way is news (the toast and the sound already exist).
- **Balance:** the harness players still finish #1; measured and written
  down.

**As implemented** (PR I):
- `rivalsSystem.ts`: `CONTEST_YEARS = 15` and `CONTEST_SLIP = 3`.
  `standingContested(s)` holds after year 35 when the college's standing is
  more than three points below its best (`bestStanding`, the highest in
  its history, so no new state and no save change). While it holds, the
  elite band chases the best less the slip, not today's standing, and the
  no-leapfrog cap is off; once the college climbs back within the slip,
  the old rules return. The rival's draw is untouched, so the stream reads
  the same.
- The loss is news already: the rank toast says *Down to #N in the
  rankings* with its sound (`Toasts.tsx`), and the Standing beat names the
  rival that passed. Nothing new was needed.
- `docs/design/progression.md` gains the rule under *The top has to be
  held*.
- **Balance** (`npm run sim`, re-recorded): every player finishes where it
  did (Completionist and Guided #1 at year 50); the one move is Guided's
  year-50 satisfaction, +2.3.
- **Checks:** `test/first-place.test.ts` (late and six points below its
  best, a leader is passed within eight years; within the slip, or the
  same slip before the last fifteen years, it keeps first place).

## PR 72J — The scorecard

- The high-price line's year 10–30 targets are reset to what that line now
  produces, since slow growth is the cost of charging high (Plan 71's
  option 2). The scorecard is re-read after H and I, and every change to a
  target is listed with its reason.

## PR 72K — The Japanese garden

*Added after the plan, from the owner:* "I think I saw some repeated assets
with the quad/decorations — might have been grand quad and formal garden?
Check if those look the same. If they do, replace one of them with a
Japanese garden."

They did: the formal garden (`AMENITY-GARDEN`) was drawn as the Grand
Quad itself at a sixth of the size (`groundMarkings.tsx` said so: "the
garden is a small Grand Quad"), with the same lawn, walks, beds, hedges,
trees and fountain.

**As implemented:**
- `AMENITY-GARDEN` becomes **the Japanese Garden**, drawn on its own: moss,
  a bed of raked gravel with three upright stones in rings, a koi pond
  with a red arched bridge, stepping stones, a stone lantern, two pines
  and two maples in autumn red. Everything authored in the plot's u/v, so
  it turns with the camera.
- The id, footprint, cost, weeks, upkeep and beauty are the garden's, so
  saves carry it (the catalog's text refreshes on load) and the sim reads
  the same. The ladder's line names it.
- Screenshot: `docs/reviews/2026-09-garden/japanese-garden.png`.

## What this plan does not do

- The budget and a CFO, poaching and retention as a whole (a retention
  offer, a person page), and events that reach further (answers 8–10).
- The admit rate's early slope (13), and anything the owner's playtest
  (70L) should decide first.
- The split-school trap (12), until the owner answers.
