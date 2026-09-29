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

**As implemented (#TBD):**
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
  (`LETTER_WEEKS`). **Save 81 → 82:** each milestone reached is dated to
  week 1 of its year, and a walk held on the old "teaching" or "found" step
  resumes at play; fixture `save-v81.json` (a Guided Year 9 run).
- **The pennant** renames nothing. The charter's letter carries a name
  field beside its two answers; an answer with a new name renames the
  college first. `RENAME_COLLEGE` is refused unless the charter waits, so
  the rename is once; "Keep the name" is final ("College for good").
- **The harness** founds from nothing through its existing moves (the
  guided player's `foundIn` and the archetypes' `hireForBlocked` hire from
  the market, then found). Tests written against the old college use
  `test/fixtures/teaching.ts`, which appoints the three and houses the
  pillars with two courses each.
- **Baseline move** (medians, three seeds): the Guided player at Year 10
  has 4,810 students (−519), 63 courses (−15) and 5 schools (−1), with
  $12.2M (+$7.9M); at Year 25 rank 13 (+5), at Year 50 rank 1, prestige
  141.7 (−0.7), $132M (−$41M); lowest cash $0.2M. The Completionist is
  909 students and 10 courses behind at Year 10, and level by Year 50
  (+$71M). Selective finishes rank 15 (from 23), Lean about as before. The
  Idle college never founds: no course, no students from Year 10 (51
  before), and its prestige, no longer held down by an unhappy body, sits
  near 50.
- **Checks:** `opening.test.ts` (the walk from the founding to English
  founded, a professor appointed early, the skip at each step),
  `first-year.test.ts` (NEXT seats the students), `inbox.test.ts` (letters
  expire), `charter.test.ts` (the rename, once), `save-migrations.test.ts`
  (81 → 82), `guided.test.ts` (founds and seats every student in Year 1).
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
