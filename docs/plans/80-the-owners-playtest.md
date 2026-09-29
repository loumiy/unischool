# Plan 80 — The owner's playtest

*Planning document only. Its job is to turn the owner's notes from a full
playthrough (September 2026), and the owner's answers to the questions they
raised, into PRs.*

**Status: Proposed.**

---

## 0. Where this comes from

The owner played a run after Plan 79 and sent 33 notes: the walkthrough,
the core loop, balance, screens, the map, and questions about how several
numbers work. Each note was read against the code (`main` at a1f1c20) and
answered. The owner then decided the open questions (§2). Athletics, which
the October review's area 4 raised and the backlog held as *Athletics,
deepened*, is folded in at the owner's request.

## 1. What the code showed

The answers the owner asked for, kept here because several PRs rest on
them.

- **Prestige is academic standing.** The Prestige chip and "Academic
  standing" are one number (`s.self.reputation`). Research standing and
  campus life standing are separate rankings and never feed it. The
  Standing panel stacks all three and says none of this; its academic
  block also has "Research output" and "Campus life" rows that are not the
  standings of the same name.
- **The teaching ceiling** on prestige is 88 + 62 × (mean grade points)^1.3,
  with A = 1, B = 0.65, C = 0.35, D = 0.1. An all-B campus tops out near
  123; only an all-A campus reaches 150. Course grades: A from 78, B from
  62.
- **Price and sticker shock** are separate calculations. Price shrinks the
  whole pool at every price (1.0 at free, 0.37 at the families' tolerance).
  Sticker shock acts only above tolerance and turns weaker applicants away
  more than strong ones. Above tolerance the overreach is counted twice.
- **Board confidence** moves with surplus and deficit terms, event answers
  and promises, and is read only by six events' gates and the Treasury
  line.
- **Promises** are judged once, at the start of the summer they fall due.
  Nine of the 27 have a target their text never states. "Turning people
  away" means an admit rate of 25% or lower, read at the start of the due
  summer, so it judges the rate chosen the summer before.
- **The chronicle** names eras from rank movement, so a college that
  climbs steadily gets the Rise, the Climb and the Ascent again and again.
- **Campus beauty** is read by admissions (up to ±12% of the pool),
  prestige (weight 6), four events, two promises, alumni memory and the
  "country club" tag. Quad detection is a fifth of beauty (its enclosure
  term) and gates one event.
- **Walkers on a Campus Quad** pay 1 on its walks and only 2 on its lawn,
  so they cut across the grass. A marked or detected quad changes nothing
  for walkers.
- **Fitness.** The gym, pool and tennis courts already feed health; the
  build menu files them under Social. The Recreation Center and the
  Athletics Complex feed social.
- **The grocery store** costs $900 a place against $1,333–$2,400 for a
  dining hall, and $1.0 a week in upkeep per student against $2.2. Five
  dining halls, the grocery and the towers' shops feed the harness's year-50
  enrollment, so the last three dining halls are never needed.
- **Every sport is Flagship** because the funding pot is the subsidy plus
  the gate, and the gate is uncapped. A large college's gate (about $8M a
  year) covers all twenty programs ($4.1M) on the low subsidy.
- **Winning a title.** The top eight in a sport play a three-round
  bracket, where a 25-point edge wins three games in four. The top eight
  in most sports sit around 85–100. A team's strength is its coaches
  (head 50%, assistant 25%, trainer 25%, × 0.92), +10 if fully funded, up
  to +7 from the athletic director, +3 from the field house, and the Jock
  School tag. Elite coaches are 7% of the market and start at 55% of their
  ceiling. Nothing the college builds or becomes (enrollment, prestige,
  venues) reaches the team, and there is no recruiting.
- **Money.** Facility upkeep is a flat $0.5–$2.2 a week per student served,
  trivial against tuition, and nothing costs more for being built beyond
  need. The Natural player nets about $30k a week in Years 1–2 (a
  tier-2 course costs $900k) and $355k at Year 8; the owner saw $1.1M.
- **The committee** has 4 seats, rising to 8 with prestige. Every course
  of a tier takes the same weeks (4, 12 or 24), so seats free up together.
  Graduate courses never take a seat.
- **A bug:** founding a program while the committee is full takes the hall
  slot and silently leaves the entry course unstarted.
- **Rotation.** Every frame of a turn re-renders every building, tree and
  prop and rebuilds every walker's clip outline. Walkers are displaced
  because their loop reads the new angle a frame or more before the scene
  has turned. A desktop wrapper would run the same browser engine and
  would not help.
- **Half-step views (45°)** land on straight-on angles where one wall of
  every building collapses to a line; the art assumes two walls.
- **The physics and biology lab roofs:** the roof plant kept at each view
  is chosen by depth and painted after the dome or glasshouse, so at three
  views it shows through them; the exhaust stack is never sorted.

## 2. The owner's decisions

1. **The opening:** the walkthrough founds English only, and the college is
   crowded from day one. The founding funds are enough to develop the
   courses that seat the Year 2 headcount, with some room to spare.
2. **Fitness:** the Recreation Center stays social; the Athletics Complex
   moves to health.
3. **The core loop:** an indicator and varied course lengths. No queue, no
   Provost auto-fill.
4. **Board confidence** is removed.
5. **Grades:** the teaching ceiling's curve is flattened; the library is a
   bigger share of academic satisfaction; an all-B college reads academic
   satisfaction 70–90, higher for weaker classes and lower for stronger
   ones (better students demand better teaching).
6. **Flagships** are capped by the athletics subsidy: 2 at low, 4 at
   medium, 6 at high.
7. **Athletics** gets the rest of the deepening: recruiting, the college's
   own pull, a coach market that always offers someone solid, and the
   focus the cap gives.

And from the notes themselves: no forced move into Elm Hall; letters leave
the inbox after a year; the pennant loses its rename, which moves to the
charter; quads lose their labels and "Mark a quad"; the curriculum strip
goes.

## 3. The PRs

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | This plan; the backlog | no | no |
| B | Screens that say what they mean | no | no |
| C | Numbers explained, and board confidence removed | re-recorded | bump |
| D | The opening | re-recorded | bump |
| E | The committee | re-recorded | no |
| F | Balance | re-recorded | no |
| G | Athletics, deepened | re-recorded | bump |
| H | The map: quads, walkers, turning, lab roofs | no | bump |
| I | The chapel and the benches | no | bump |

**Order.** B, H and I touch no simulation and can land at any time. C, D,
E, F and G each move the baseline and land in that order, each on the one
before, so every re-recording describes one change. F sets the opening
funds D introduces. Save bumps land in merge order.

**Rules for every PR** (as in Plans 76, 78 and 79):
- `npm run check` passes; `npm run sim` matches the baseline, or the
  baseline is re-recorded and the PR says how it moved and why. No
  hand-tuning beyond the targets this plan states.
- Player-facing words follow Plan 47's glossary; `review:strings`' flagged
  counts don't rise.
- A changed state shape bumps `SAVE_VERSION` with a migration and a fixture
  of the version before.
- Each PR adds an **As implemented** note to its section below.

## PR 80B — Screens that say what they mean

- **Curriculum filters.** "Needs attention" goes; "Below A" and "No
  instructor" cover it. A weak course in a dark program is still caught by
  "Below A" (today it has no grade and drops out).
- **The curriculum strip** (On offer, Near a milestone, Ready now, Waiting
  on faculty) goes; the committee panel stays. Two parts are kept in a new
  form:
  - a filter chip, "One course from established";
  - one line under the committee naming the fields short of faculty, with
    "Faculty →".
- **Graduate School, Business School, Law School and Medical School** get
  sections of their own in the Curriculum, in their home school's colors:
  the PhDs and the MFA under the Graduate School, the MBA under the
  Business School, the JD under the Law School, the MD under the Medical
  School.
- **The hall panel:** "Not this year" sits beside each offer; the offer
  tile narrows to make room.
- **The Research tab:** the Landmark Programs note gets space above it. The
  Research Park shows its progress: "Labs that have finished a project: n
  of m", each lab marked, and a line that a new lab raises the count.
- **A lab's panel** on the map shows the project under way and its
  progress, or "Start research" when it is idle, and "Open in Research →".
- **"Campus tools"** is renamed **"Grounds"**.
- **The build menu** files the gym, pool and tennis courts under Health,
  where their effect is (the Athletics Complex follows in F).
- **The committee-full bug:** founding a program needs a free committee
  seat, and the offer says so when there is none.
- **Checks:** the filter predicates; the graduate sections; the hall
  panel and lab panel at 1440×900 and 390×844; `npm run phone`.

**As implemented (#247):**

- **Curriculum filters** (`curriculumFilter.ts`). Needs attention is gone.
  Below A reads `instructorQuality` (new, `facultyAssignment.ts`): the grade
  a course's own instructor earns on it, dark program or not.
  `courseQuality` is that plus the dark and transit checks, so every grade
  the game reads is unchanged. "One course from established" is a chip:
  the last not-done course among a major's entry course and tier-2
  quartet, started or not (`oneFromEstablished`).
- **The strip is gone.** The committee sits alone at the head of the tab,
  its eight seats in one row where there is room. Under it, "Waiting on
  faculty: …" names `neededFacultyFields` (most waited-on first), and
  "Faculty →" opens the Faculty tab on the first. Plan 47's glossary
  already calls the wall "Waiting on faculty", so the line says that
  rather than "short of faculty". The Curriculum's `onInspectHall` went
  with the strip's "Found in" doors.
- **Graduate sections.** `GraduateProgramSeed.section` names the MD's,
  JD's and MBA's; the doctorates and the MFA default to the Graduate
  School (`techData.ts`'s `GRADUATE_SECTIONS`). The sections follow the
  seven schools and are named from the start. A professional school takes
  its home school's hue and mark. The Graduate School has several home
  schools, so its header takes the college's own colors and each row its
  home school's hue and mark. `discoverySections` is unchanged.
  - `visibleCourseIds` (the curriculum badge) now reads the rows the tab
    draws, so the two cannot disagree.
  - A section's "Staff from the market" covers the courses it draws. Before,
    it covered the whole school, graduate programs included. `RESTAFF`
    takes optional `courseIds`, and `unstaffedIn`/`restaffPlan`/`restaff`
    take an optional course list.
- **The hall panel.** "Not this year" sits beside each offer tile, which
  narrows. Armed, its longer words take a line under the tile.
- **The Research tab.** The Landmark note has 12px above it. The Research
  Park block (`ResearchParkProgress`) shows until the park stands. It has
  the gate's own sentence (`projectOpens`), "Labs that have finished a
  project: n of m", each lab as a pill (✓ finished one / ○ not yet), and
  "A new lab raises the count: it has to finish a project too." While the
  park is going up it shows the weeks left instead. `labsTowardPark`
  (`projects.ts`) is the list `everyLabFinished` now reads, so the count
  and the gate are one reading.
- **A lab's map panel** (`BuildingInfoPanel.tsx`'s `LabResearch`) shows the
  project's topic, depth, weeks and a progress track. An idle lab says so
  and offers "Start research". Both show "Open in Research →". The Research
  tab takes a target (`lab:<id>` scrolls to the lab; `start:<id>` also
  opens its choices), passed only while the tab is open to the college.
- **Grounds.** The tab's label changed. Its id (`campus-tools`) stayed.
- **Health.** `FacilityCategory` gains `health`: the health chain and
  the gym, pool and tennis courts. In the build menu the fitness chain is its
  own group, keyed `gym`, numbered #1–#3 after the health chain. The
  Recreation Center stays under Social as "Recreation" (the Athletics
  Complex with it, until F), no longer numbered.
- **Room on the committee.** `canFoundProgram` refuses a major while
  the committee writes its most. A graduate program is not written by
  the committee. The hall panel says so over the offers, and Found carries
  the reason. The words follow Plan 47 ("room on the committee", no
  "seat").
- **The sim moved.** This departs from the table's "no". The guided,
  Completionist and Lean players founded programs with the committee full.
  Each founding took its program slot, and its entry course started weeks
  later when a course finished. Now the founding waits for room instead:
  the harness's foundings read `canFoundProgram`. A probe with only the
  new check removed matched the baseline exactly, so nothing else moved it.
  At Year 50 Guided's cash is +$531M, Completionist's +$720M and Lean's
  +$363M; prestige moved from −1.0 to +5.6. Completionist spent one week in the
  red, down $0.5M. Selective and Idle did not move. The baseline is re-recorded in its own commit.
- **Checks.** `curriculum-filter.test.ts` covers Below A in a dark program
  and One course from established. `curriculum-sections.test.ts` is new: the four
  sections, their rows, colors and order, and every drawn course visible
  once. `founding.test.ts` checks that a full committee refuses a founding
  and leaves the program slot and the offer alone. Its "hall fills" case
  now waits for room between foundings. `npm run phone` passes. The hall
  and lab panels were shot at 1440×900 and 390×844
  (`docs/reviews/2026-10-ui-fixes/80b-*.jpg`).

## PR 80C — Numbers explained, and board confidence removed

- **The Prestige chip** opens a page titled Prestige, with only its
  breakdown. The academic block's inputs are named for what they are ("the
  labs' output, as prestige reads it"). Research standing and campus life
  standing move to the standings, where they belong.
- **The Rank chip** opens the rankings: the guide's table (the one-time
  top-50 view, reused), with the college's own row and its neighbors when
  it sits below 50. It reads `rankedListBy`.
- **Promises show their targets.** The offer and the Promises panel say
  the measure, the target, the date it is judged ("at the summer of Year
  N") and where the college stands now: "Admit rate 25% or lower at the
  summer of Year 14. Now 36%." Every promise's text is checked against its
  goal.
- **The admissions reveal** shows one "price" line for price and sticker
  shock together; who stayed away shows in the class mix. (The double
  count itself is fixed in F.)
- **Board confidence is removed:** the state field, the six events' gates
  (each event is regated on a condition that says what its text means, or
  loses the gate), the `confidence` effects on events and promises, the
  Treasury line and its hint. The save drops the field.
- **The chronicle** names eras for what the college did, not for its rank:
  - a year is classed by its largest new thing: a school founded, a
    graduate school, a capital project or landmark, a building boom,
    titles, research prizes, a campaign, troubles;
  - eras take names from those things ("The Years of the School of
    Science", "The Medical Center Years", "The Championship Years");
  - rank names an era only at a real turn: entering the top ten, reaching
    first, or a fall.
- **Checks:** a test that every promise's text states its target; the
  chronicle over the harness players shows no repeated era kind in a row;
  the save fixture migrates.

**As implemented (#250):**

- **Prestige:**
  - The chip opens History › Prestige (section `history.prestige`, which
    replaces `history.standing`): prestige's breakdown alone, its figure
    in the panel head. The breakdown's label is now "Prestige".
  - Its research and campus rows are "The labs' output" and "Recreation
    buildings and venues"; each says it is prestige's own reading and that
    the standing of that name is ranked on its own.
  - Research standing and campus life standing are broken down under
    History's standings (`StandingsPanel.tsx`), which also shows from the
    first commencement now. The breakdown view moved to
    `tabs/StandingBreakdown.tsx`.
- **Rank:** the chip opens History › the guide (`history.rankings`,
  `tabs/RankingsPanel.tsx`), shown from the first week. The table is the
  entry reveal's, pulled out as `components/RankingsTable.tsx` and used by
  both; the live one reads `rankedList` (the academic `rankedListBy`),
  prints the top fifty and, below them, a gap and the college's row with a
  neighbor either side. It has no "Last year" column (the report's
  previous places are the summer's reconstruction).
- **Promises:**
  - `systems/promises/promiseTargets.ts` writes a goal from its condition
    keys: "Admit rate 25% or lower at the summer of Year 14. Now 36%."; a
    two-part goal names each part. Money is at the promise's own scale.
  - The offer (each choice, under its text) and the Promises panel (each
    open promise, in place of "Made in Year N") show it.
  - No promise text contradicted its goal; the ids that name other numbers
    (`found-six-schools`, `open-thirty-programs`, `one-fifty-million`) are
    internal and stay. The test reads every title that names a number back
    against the goal.
- **The admissions reveal:** one "price" part, the product of the price
  and sticker-shock factors (`yearOverYear.ts`); the funnel is unchanged.
- **Board confidence removed:**
  - The field, its term arithmetic, the `confidenceOver`/`confidenceUnder`
    conditions, the `confidence` effect (188 answers, all 27 promises), the
    Treasury's figure, its hint and the "recovered" letter's clause.
  - The six gates: *A trustee resigns* is gated on Deficit or worse
    (`rungAtLeast: 2`); *The board retreat* on Tight or better
    (`rungAtMost: 1`); *The strategic plan*, *The consultants' report*,
    *The board secretary* and *Term limits* lose the gate and keep their
    years.
  - 22 answers moved only the confidence; they now change nothing and
    say "nothing to speak of". Every event keeps an answer that does
    something, and the catalog test now asks that of each event rather
    than each answer.
  - 13 promises' only penalty was the confidence. The design gives every
    promise a penalty, so each now costs 2 points of alumni warmth, the
    smallest penalty the other promises use (a judgment call; the harness
    declines promises, so the sim does not see it).
  - `SAVE_VERSION` 83 → 84, with a migration (`dropBoardConfidence`,
    `MIGRATIONS[83]`). `test/fixtures/save-v81-confidence.json` is the
    `year-8-balanced` scenario written at version 81, before this PR, and
    migrates through every later step; `test/promise-targets.test.ts`
    loads it. `test/fixtures/save-v83.json` is the same scenario written
    by main at version 83, for the chain's one-fixture-per-link check.
- **The chronicle:**
  - A year is its largest new thing, in this order: the founding years,
    receivership, troubles, reaching first, a school founded, a graduate
    degree taught in full, entering the top ten, a capital project or
    grand landmark, titles, research prizes, a campaign, a fall, a
    building boom (two or more), a letter answered, else quiet.
  - A fall is losing first, leaving the top ten, or five places in three
    years from the top 25. The rise, decline, golden and rivalry kinds
    are gone (the rival's line stays in the summary).
  - An era is the largest kind of its years; a short run folds into a
    neighbor as before and the pair takes the larger kind; two eras of a
    kind never stand in a row. A long run is split only where each part
    can be named for something its neighbor is not.
  - Names: "The Years of the School of Science", "The Schools of Science
    and Business", "The First PhDs", "The Medical Center Years", "The
    Championship Years", "The Laureate Years", "Into the Top Ten", "First
    in the Guide", "The Slide". The summaries add the schools founded, the
    degrees taught in full and the prizes.
  - It needed two records: `GameState.milestoneYears` (written by
    `awardMilestone`) and the history rows' `prizes`. Both are optional;
    a save from before reads its milestones as undated.
  - `test/archetypes.test.ts` and `test/guided.test.ts` check every
    harness player's chronicle: no two eras of a kind in a row, every
    name its own, at most two named for the guide, and across the runs
    the names mostly distinct.
- **The baseline moved** (re-recorded after merging 80B, 80E, 80H and
  80I; medians against main's baseline, before → after): Completionist Y50
  cash $143M → $976M, Y10 satisfaction 89.7 → 85.6; Selective Y50 rank
  18 → 21, prestige 117.2 → 112.9; Lean Y50 rank 26 → 31, prestige 108.7 →
  98.7, enrolled 12,665 → 4,452, satisfaction 74.4 → 67.7; Guided Y25 cash
  $43M → $68M, Y50 cash $613M → $960M; Completionist and Guided still
  finish first. No rule was retuned: the six events' new gates
  change which board events fire and when, and every later draw on the
  run's stream moves with them; the confidence effects themselves reached
  nothing else. Lean is bimodal (see 80E's note), and its move is which
  side two of the three seeds land on; Y50 cash swings with the endowment
  sweep's timing.

## PR 80D — The opening

- **The college starts with nothing to teach.** No professors, no courses;
  350 founding students and Founders Hall to site.
- **The walkthrough:**
  1. The doors open (the welcome, rewritten).
  2. Site Founders Hall.
  3. Appoint the college's first professor: Dr. Grace Bennett, English,
     offered in a founding market.
  4. Found English, whose entry course goes to the committee.
  5. Play. The college is crowded until the courses come; the NEXT line
     and the letters point at developing the next courses and appointing
     the professors they need.
- **Skipping the walkthrough** leaves Founders Hall unplaced; the clock is
  held and the NEXT line says to site it.
- **Founding funds:** enough to develop the courses that seat the Year 2
  headcount (80 places a course), with the professors they need, and about
  a fifth to spare. The figure is derived in F from the harness, and D
  sets a provisional one.
- **Letters:**
  - "A program of its own" (the founding note) is deleted.
  - "Moving in" no longer asks for a move. When the second academic hall
    stands, a letter explains that a school is six programs of one school
    in one hall, any hall, Founders Hall included, and the NEXT item is
    **"Establish a school: six programs of {school} in one hall (n of
    6)"**. "A hall of its own", "A school takes shape" and "A second
    school" are rewritten to match.
  - The chair's letters no longer mention the founding three.
- **Letters leave the inbox a year after they arrive:** milestone letters
  and founding notes, as updates already leave after half a year. A
  milestone records the week it was reached.
- **The pennant** loses its rename. The charter letter offers a one-time
  rename beside "Become {name} University" and "Keep the name".
- **The harness** founds as a player does: it appoints and founds from
  nothing. `docs/design/` is updated for the founding (Plan 52's three
  pillars become the market's first offers).
- **Checks:** the walkthrough from the title to the first program; skip at
  each step; letters expire; the charter rename; the save fixture
  migrates (a milestone's week).

**As implemented (#251):**
- **The start:** no professor, no course, every program slot of Founders
  Hall free, 350 students. The first program offers are the pillars
  (English, Mathematics, Economics), and the market opens with their
  professors, Bennett, Iyer and Okafor (`FOUNDING_MARKET`, grown over
  `FOUNDING_TENURE_WEEKS` as before), beside 27 ordinary candidates. Reyes
  and Novak and the founding offer's guarantee are gone. A headless
  founding (the harness) still sites the hall at the center.
- **The walkthrough:** welcome, then site Founders Hall, then *Appoint the
  first professor* (the hall's panel opens; the free program slot, English
  and later Found are rung; Bennett is appointed from the market beside
  the program), then *Found the first program* (English, its entry course
  to the committee), then play. `settleOpening` moves through steps
  already done. "Not this year" is hidden during the walk. Skipping, from
  any card, leaves an unsited hall unsited: the clock holds, the Build
  button and the hall's tile are rung, and NEXT reads "Site Founders Hall:
  the clock waits until it stands".
- **Crowded until the courses come:** a new reading (`seating.ts`) names
  the cheapest step while the places taught and coming fall short of the
  students: "Places for 80 of 350 students, counting courses under way:
  found another program in Founders Hall, with a professor to teach it",
  or a course to develop, or the professor it needs. It is the first
  letter's ask (done when a program is housed and every student has a
  place), and NEXT's after a dark program in later years. Zero courses
  reads zero coverage, never a division; the first summer's class is held
  to the room.
- **Founding funds, provisional: $2.45M** (was $3M). The Guided player's
  Year 2 body is about 345 (344, 344, 346 on the three seeds) and the
  founding body 350, so five courses (400 places). The cheapest five are
  five programs' entry courses, 5 × $300k = $1.5M; a professor each for a
  year, the three founding-market professors at about $105k and two
  median candidates at about $73k, $0.46M; the courses carried for a year,
  5 × $300 × 52 = $0.08M. $2.04M, and a fifth more is $2.45M. The Guided
  player's lowest cash in Years 1–2 is $0.18–0.20M.
- **Letters:** "A program of its own" deleted. "The doors open" rewritten.
  "A hall of its own" says a school is six programs of one school in any
  hall, Founders Hall included. "Moving in" (the second academic hall
  standing) asks "Establish a school: six programs of {school} in one hall
  (n of 6)" for the school closest to six (`schools.ts`'s `closestSchool`,
  `establish.ts`); "A school takes shape" comes at three in one hall with
  the same ask; both are done when a school is founded; "A second school"
  follows the first school founded and is done at two. NEXT's move reading
  (`awayFromHome`) is replaced by the same establish line, shown only when
  something can be done this week; its intent (found the school's program
  there, bring one in, or make room in a full hall) is the guided player's
  way there and is never named. The suggested move stays on the program
  tile. The chair's letters no longer mention the founding three; the
  "A fourth program" milestone keeps its condition (four housed).
- **Letters expire:** a milestone records its week (`s.ladder.reachedWeek`);
  its letter, and the founding note, leave the inbox a year after
  (`LETTER_WEEKS`). **Save 84 → 85** (`MIGRATIONS[84]`, after 80I's, 80H's
  and 80C's): each milestone reached is dated to week 1 of its year, and a
  walk held on the old "teaching" or "found" step resumes at play.
  Fixtures: `save-v84.json` (the `year-8-balanced` scenario written by
  main before this PR) for the chain, and `save-v81-opening.json` (a
  Guided Year 9 run from before it) for the milestone weeks.
- **The pennant** renames nothing. The charter's letter carries a name
  field beside its two answers; an answer with a new name renames the
  college first. `RENAME_COLLEGE` is refused unless the charter waits, so
  the rename is once; "Keep the name" is final ("College for good").
- **The harness** founds from nothing through its existing moves (the
  guided player's `foundIn` and the archetypes' `hireForBlocked` hire from
  the market, then found). Tests written against the old college use
  `test/fixtures/teaching.ts`, which appoints the three and houses the
  pillars with two courses each.
- **Baseline move**, against main's after 80B, 80C, 80E, 80H and 80I
  (medians, three seeds): the Guided player at Year 10 has 4,897 students
  (−465), 74 courses (−7) and 4 schools (−2), with $8.7M (+$4.1M); at Year
  25 rank 10 (−2, better), 25,680 students (−1,200), $40.7M (−$27.2M); at
  Year 50 rank 1, prestige 143.3 (−0.9), $289M (−$671M); lowest cash
  $0.2M. The Completionist is 623 students and 7 courses behind at Year
  10, level by Year 25, and ends with $133M (−$843M) at rank 1. Selective
  and Lean finish a place or four better (Lean +2,930 students and +$322M
  at Year 50). The Idle college never founds: no course, no students from
  Year 10 (51 before), and its prestige, no longer held down by an unhappy
  body, sits near 50. The Year-50 cash of the players that build
  everything swings by hundreds of millions on small timing changes; the
  shape of each run holds.
- **With the committee** (80B, 80E): founding needs a free committee seat.
  The walk's first founding always has one, and the seating reading and
  the first letter step aside while the committee is full, so neither the
  walk nor the harness waits on a founding that would be refused.
- **Checks:** `opening.test.ts` (the walk from the founding to English
  founded, a professor appointed early, the skip at each step),
  `first-year.test.ts` (NEXT seats the students), `inbox.test.ts` (letters
  expire), `charter.test.ts` (the rename, once), `save-migrations.test.ts`
  (84 → 85), `guided.test.ts` (founds and seats every student in Year 1).
  `npm run newplayer` follows the new walk to Year 2 with no stall.

## PR 80E — The committee

- **A committee chip on the dock:** "Committee 3 of 4" with the free seats
  counted, flagged when a seat comes free, opening the Curriculum's
  committee panel.
- **Courses vary in length:** each course's weeks are its tier's, varied up
  to a quarter either way, fixed for that course (a hash of its id), so
  seats come free at different times. The course drawer and the committee
  show each course's weeks.
- **Graduate courses take a committee seat** like any other.
- **Checks:** the chip counts and flags; lengths are stable per course and
  within the band; a graduate course needs a free seat.

**As implemented (#249):**
- **Lengths:** `techData.ts`'s `courseWeeks(id, base)` varies each course's
  weeks up to `COURSE_LENGTH_SPREAD` (a quarter) either way off
  `hashUnit("course-length:<id>")`, whole weeks, at least one, for
  undergraduate and graduate courses alike (tier 1 now 3–5 weeks, tier 2
  9–15, tier 3 18–30, doctoral 24–40, professional 30–50). No state change:
  a loaded save takes the catalog's weeks for a course still locked or
  available (persistence's `refreshAuthoredText`); one under way or done
  keeps the weeks it started with, so its progress still reads right. The
  course drawer already showed the weeks; the committee's busy seats now
  read "5 of 14w".
- **Graduate courses take a seat:** `coursesInDevelopment` and
  `canStartDevelopment` count every course. Founding a graduate program
  needs a free seat too (`canFoundProgram`), or its entry course would be
  left unstarted, the bug 80B fixes for majors. The committee's help text
  and the drawer's full-committee note no longer exempt graduate courses.
- **The chip:** "Committee 3 of 4" ("3/4" beside the curriculum glyph on a
  phone), `committeeStatus` in `techSystem.ts`. It is flagged (the tabs'
  alert badge and a border) only while there is a free seat *and* some
  course could start now, so a free seat with nothing startable (no cash,
  no professor, nothing left) never nags. It opens the Curriculum's
  committee (a new `curriculum.committee` section; `statChips.ts`'s fifth
  chip, with its own sentence in `figureHints.ts`). It sits on the gears'
  row, not with the four stat chips: there it pushed the band to two rows at
  1440 and past a phone's edge; on the gears' row the band is unchanged at
  1280, 1440 and 1600, and `npm run phone` passes.
- **The baseline moved** (re-recorded; no tuning). Lean, which builds no
  graduate courses, is bimodal: before, two of three seeds crossed prestige
  about 100 near Year 30 and caught the applicant surges that followed, and
  one plateaued near 4,300 students; with courses of varied length all three
  plateau, so its Year-50 median falls (enrolled 12,011 → 4,298, prestige
  109.2 → 93.1, satisfaction 77.3 → 65.6). Completionist's Year-25 courses
  fall 357 → 337 as graduate courses share the committee; it and Guided
  still finish all 431 by Year 50. Year-50 cash moves by hundreds of
  millions either way (Guided +$457M, Selective −$65M), which is how lumpy
  late cash is in any run, not a trend. Idle is unchanged; the slow suites
  pass.

## PR 80F — Balance

Targets, checked by the harness and stated in the PR with the before and
after:

- **Years 1–2.** Listed tuition and the founding admit rate go up (the
  admit rate curve starts higher for a small college and meets today's by
  prestige 100). The founding funds are set here (see D). Target: the
  Guided player seats its Year 2 class without borrowing, and never falls
  below zero cash in Years 1–2.
- **The late game.** Facility upkeep is tied to what a building cost (a
  share of its price a year), and capacity beyond what students need is
  paid in full. Target: the Guided player's net income at Year 8 is well
  under today's, and cash at Year 25 and 50 falls; the exact shares are
  chosen to meet the harness targets, not by hand.
- **Food.** The grocery store and the towers' shops count for at most 40%
  of what students need to eat; dining halls carry the rest.
- **Fitness.** The Athletics Complex feeds health; the Recreation Center
  stays social.
- **Academic satisfaction.** The library's share rises (from 20% toward
  40%), and teaching is read against the class: an all-B college reads
  70–90, higher with weaker students, lower with stronger ones.
- **The teaching ceiling** is flattened: linear in mean grade points
  (an all-B campus reaches about 128).
- **Price:** the overreach above tolerance is counted once.
- **Checks:** the harness targets above; academic satisfaction at an all-B
  college across class quality; the baseline re-recorded.

## PR 80G — Athletics, deepened

- **Flagships are chosen, and capped:** 2 at the low subsidy, 4 at medium,
  6 at high, taken from the top of the team order. Only a flagship can be
  fully funded and recruit; the gate no longer makes every program one.
  Other programs are competitive or developmental as the pot allows.
- **Recruiting:** each flagship has a scholarship budget (none, some,
  full). Recruiting builds a team's strength over three to four years, a
  class at a time, up to about +15, and falls away the same way when the
  money stops.
- **The college's pull:** a small lift, up to about +5, from the sport's
  venue stage and the college's campus life standing, so a large college
  with a stadium plays like one.
- **The coach market** always lists at least one solid-or-better
  candidate for each sport. Elite coaches stay rare.
- **Target:** a player who picks one or two flagship sports and funds
  their recruiting contends for a title (reaches the final four) within
  eight to twelve years. Checked with the harness's championships player.
- The save gains each team's recruiting; the version is bumped.

**As implemented (#252):**

- **Flagships:** `ATHLETICS_BUDGET_TIERS` carries the cap (2, 4, 6).
  `departmentPot` marks the first active programs on the list as
  flagships, whatever the pot holds; a flagship draws its sport's whole
  cost (and may still be short of it on a thin pot), any other program at
  most `NON_FLAGSHIP_FUNDED_SHARE` = 0.6 of it: competitive while the money
  reaches it, developmental once it does not. 0.6 keeps a clear step (a
  60-staff program reads about 62 against a flagship's 70 before
  recruiting). The funded line is drawn under the flagships ("Flagships
  above · 2 of 2"). The demotion rule, the recruiting scandal and
  `programReputation` read the band. Lowering the subsidy level demotes
  without the coach-resignation roll, as before.
- **Recruiting:** `VarsityTeam.scholarships` (none / some / full) and
  `recruiting` (0–15). Some costs half the sport's cost to compete a year,
  full the whole of it ($120k, $450k, $1.2M), paid only for a flagship, by
  the college, on a new Treasury line (*Athletic scholarships*), not from
  the pot. `tickRecruiting` (weekly, in `tickAthletics`) moves the strength
  toward the level's lift (15 or 7.5) by a quarter of that lift a year, so
  both build over four years, and down by up to a full class (3.75) a year
  when the money stops or the team is no flagship. Weekly rather than a
  signing day, so there is no year boundary to game; one number stands in
  for four classes, so a small build falls away sooner than four real
  classes would. The budget is kept on a team that drops out of the
  flagships and resumes if it returns.
- **Pull:** `collegePull`, up to +5: +2.5 × the venue's expansions over its
  most, +2.5 × campus life standing read from 25 to 100. On every active
  team.
- **Coach market:** `sportsWithoutSolidListing` lists a solid candidate
  (potential ≥ 60) for any fielded sport without one, every week, beside
  the journeyman floor. The elite rule is unchanged.
- **The tab:** the Department panel shows Flagships n of cap and the
  scholarships' cost; each flagship's card has the None / Some / Full
  control with its price, and every active card its recruiting ("+8.4,
  building toward +15" / "falling away") and pull. Checked at 1440×900 and
  390×844.
- **Save:** `SAVE_VERSION` 85 → 86 (after 80I's, 80H's, 80C's and 80D's
  links), migration `noRecruitingYet` at `MIGRATIONS[85]` (every team none
  and 0) and a sanitizer. `test/fixtures/save-v85.json` is the
  `year-8-balanced` scenario written with main's code before the bump;
  `save-v81-recruiting.json` is a Natural run at Year 21 with four teams,
  written at version 81, which the recruiting test walks up the whole
  chain.
- **The target:** the championships goal player now chooses two flagships
  (the strongest active program while a place is free, then kept at the
  top of the list) and puts each on full scholarships when a year's net
  covers it. Over 5 seeds × 2 names, after 80C and 80D (a college founded
  with nothing to teach): its first final four came a median of 2 years
  after choosing (0–4), at a median Year 7, against Year 9 for the same
  goal player on main; its first title a median Year 8, against Year 14.
  Every run got there. Before the merge, the same player without
  scholarships reached its first final four in the same year as with them,
  and its first title a year later: the final four comes from the coaching
  (the solid floor helps), the funding and the pull, and recruiting turns
  it into titles. The target reads as a bound ("within"), so it is met; as
  a band it is beaten, and recruiting and pull only add strength, so no
  tuning inside their bounds could slow it. Nothing was tuned.
- **The chronicle** (a merge fix to 80C's eras): the archetypes suite's
  "at most two eras named for the guide" failed for Selective seed 12345,
  whose shifted run crossed the top-ten line four times. A rank turn now
  names an era only the first time it comes (a fall for as long as it
  lasts); `test/chronicle.test.ts` covers the back and forth.
- **Baseline:** re-recorded against main's (after 80B–80F, 80H, 80I). The
  extra solid listings take ids from the global stream (`newId`, as the
  journeyman floor already did), so every player with teams shifts: at
  Year 50, Lean is rank 36 (+9), prestige 94.3 (−12.1), 4,257 enrolled
  (−3,125), cash $50M (−$318M); Selective's prestige +6.4 and satisfaction
  −6.4, cash −$199M; Guided's cash $138M (−$151M); Completionist's −$26M.
  Years 10 and 25 move by a rank or two and a few points. Idle is
  unchanged.

## PR 80H — The map: quads, walkers, turning, lab roofs

- **Quads lose their labels:** the overlay, the names, "Mark a quad", the
  quad panel and the stored marks and names go. Detection stays, for
  beauty and the one event that reads it.
- **Walkers keep to a Campus Quad's walks:** the lawn inside a quad costs
  them what any lawn does.
- **Turning:**
  - walkers are hidden during a turn and return where they belong when it
    settles;
  - the scene draws without trees, props and benches while turning, and
    whole again when it stops.
- **The lab roofs:** every item on a roof (the dome, the glasshouse, the
  plant, the stack, the flues) is sorted together at every view.
- **Checks:** the depth-sort test at every view for both labs; the door and
  walker checks; a turn timed on a year-30 campus before and after.

**As implemented (#248):**

- **Quads lose their labels.** `quadLayer.tsx` (the tint, the outline, the
  names) and `QuadPanel.tsx` are gone, with "Mark a quad", the `quad`
  campus tool, `MARK_QUAD`, `UNMARK_QUAD`, `NAME_QUAD`, the N key, the Aa
  button, `QUAD_NAMES` and `QUAD_NAME_MAX`. `detectQuads` keeps only what
  the campus encloses; a `Quad` no longer carries a name, a center or
  `designated`. Beauty and `quadsOver` read it as before.
- **Save version 83** (after 80I's 82) drops `GameState.quads`
  (`dropQuadMarks`, `MIGRATIONS[82]`), with the v82 fixture (the
  `year-8-balanced` scenario, given a name and a mark), and
  `save-v81-quads.json`, a v81 save with a name and a mark that
  `test/quads.test.ts` takes through both steps.
  Beauty reads the same for a save without marks; one whose marks made a
  quad loses that quad's share of the enclosure term. The harness never
  marked a quad, and the sim report matches the baseline.
- **Walkers:** a Campus Quad's lawn costs `LAWN_COST` (4), its walks 1.
  Desire lines may now wear its grass as they wear any lawn's, under the
  quad's plate.
- **Turning:** `CampusScene` takes `turning`; while it is set the sorted
  scene has no trees, no props on the grounds and no dressing. The walkers
  are hidden (`visibility`) through a turn and walk on unseen, skip the
  outline rebuild and the canvas read, and are drawn again only once their
  outlines are built for the camera the projection is at, which covers a
  tilt and a reduced-motion snap too. Reduced motion still snaps.
- **Per frame, only the camera's work.** The hall pips, the lab marks and
  the full-residence marks are memoised layers that redraw on the camera;
  each hall's offers and blocked programs are read once a state, not every
  frame of a turn. The crowded venues are read once a state too.
- **The turn, timed** on a year-30 Completionist campus (67 buildings,
  607 trees, 340 walkers), production build, headless Chromium. The
  machine was loaded (load average 14 to 37 on 4 cores), so wall times were
  noise and even CPU time moved between runs; the figures are the main
  thread's CPU from a trace, medians of 8 turns, over three to four runs
  each:

  | | Before | After |
  |---|---|---|
  | A frame of the turn | 58–73 ms | 48–64 ms (about 51) |
  | The frame that settles it | 47–71 ms | 88–109 ms |
  | The whole turn | 195–343 ms | 216–295 ms |
  | SVG nodes mid-turn | 15,600 | 11,900 |

  A frame of the turn is about a fifth lighter. The settling frame costs
  more, since the trees come back and the walkers' outlines are built once
  there rather than every frame, so the whole turn costs about the same.
  Wall time to a settled view was about 0.6 s before and after. What is
  left is the buildings, redrawn every frame (the backlog's faster map).
- **Lab roofs:** `flatRoofItems` (`buildingMotifs.tsx`) puts the dome or
  glasshouse, each flue, the exhaust stack and the plant through one
  `depthOrder`. A roof under 4 tiles keeps the first plant unit clear of
  everything else on it, the same at every view (on a small pavilion or
  block roof, the first unit). `test/depth-sort.test.ts` checks every lab
  at both orientations and all four views; `test/walk-routes.test.ts` the
  quad's walks. The door checker's 1,842 hits are unchanged.
  `docs/reviews/2026-10-campus-fixes/80h-lab-roof-*.jpg`: the four views,
  before above, after below.

## PR 80I — The chapel and the benches

- **The chapel** gets its own drawing in each vernacular: a nave, a
  steeple or bell tower, tall windows. It stops sharing the pavilion.
- **Benches:**
  - a bench sits at a tile's edge, facing out;
  - it has four facings, chosen with R while placing, and the ghost draws
    the bench itself, so the facing shows before it is set;
  - the bench is drawn with slats and arms.
  The save stores each bench's facing; old benches take the facing they
  were drawn with.
- **Checks:** the gallery in each vernacular; a bench at each facing and
  view.

**As implemented (#246):**

- **The chapel** is a motif of its own, `'chapel'` (`buildingSpec.ts`'s
  `CHAPELS` table and `chapelPlan`; `buildingMotifs.tsx`'s `Chapel`): a
  tower at the west end (-col; -row when turned), a nave under a steep roof
  with tall windows in odd bays, and a lower, narrower chancel at the east
  end with a rose in the nave's gable over it. Tower, nave, chancel and
  buttresses are painted in `depthOrder`. By set: a lead spire over a white
  belfry (Georgian, and in slate for Second Empire), a stone spire with
  pinnacles and buttresses (Gothic), a cupola (Classical), a campanile
  (Mission, Italianate), battlements (Tudor), setbacks to a gilt mast (Art
  Deco), a bell blade over slot windows (Modern). Its wall is the set's
  limestone (Gothic, Classical) or its hall wall (the rest), under the
  halls' roof.
  - Where the plan was silent: the nave stands on the footprint's middle
    (the tower and chancel take equal ends), so a door is drawn at each of
    the four doors walkers use: the tower's west face, the middle bay of
    each long wall, the chancel's east face. No cross anywhere, as the
    Mission bell-gable before it. The nave is one clear-span volume (9.5 m
    to the eaves). The weathering marks the nave and chancel, not the tower
    (a volume's marks are masked by nearer walls, not roofs).
- **Benches** store a facing: `Dressing` values are `'lamp'` or
  `'bench-n' | 'bench-e' | 'bench-s' | 'bench-w'` (north is -row;
  `state/dressing.ts`). A bench stands against one edge of its tile and
  faces out across it. `PLACE_DRESSING` takes an optional `facing`; without
  one, the bench faces the path beside it (south, east, west, north where
  there are several). R with the bench tool armed turns the ghost a quarter
  clockwise, and the ghost draws the bench, half-transparent. Setting a
  bench again on its tile takes the new facing. Touch has no turn: a tap
  sets the default facing.
  - The bench is redrawn at the walkers' scale (seat at hip height):
    three seat slats with a front edge, two raked back slats, iron ends
    carrying the arms, a small cast shadow.
- **Save version 82**, with `MIGRATIONS[81]`: each old bench takes the
  facing it was drawn with (east where paving lay east or west of it, else
  south). `test/fixtures/save-v81.json` is the `year-8-balanced` scenario
  with a walk, four benches and a lamp laid through the version-81 reducer.
- **Checks:** `test/dressing.test.ts` (default facings, a turned bench, a
  bench at each facing and view, the v81 fixture's migration),
  `test/building-spec.test.ts` (the chapel in every set, both ways round).
  Two new arrangements, `chapel` (benches at every facing) and
  `chapel-turned`: `review:doors` is clean on both and unchanged elsewhere.
  Pictures: `docs/reviews/2026-10-campus-fixes/chapel-vernaculars.jpg`,
  `chapel-views.jpg`, `benches.jpg`.

## 4. The backlog

- **Athletics, deepened** is taken into G, except founding a team directly
  and cutting a team, which stay with the athletics deferrals.
- **Confidence the board acts on** comes off: the owner removed board
  confidence (C).
- **New entries under *Named, not sequenced*:**
  - **half-step camera views (45°):** straight-on angles, where every
    building shows one wall, need an art pass for one-wall views;
  - **a faster map:** beyond H's lighter turn, a canvas or WebGL renderer.
    A desktop wrapper would not be faster.

## What this plan does not do

- No course queue and no Provost auto-fill (decision 3).
- No founding or cutting of teams (the backlog).
- No 45° views, no new renderer.
- Nothing from the October review's area 6.
