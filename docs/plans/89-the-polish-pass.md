# Plan 89 — The polish pass

*Planning document only. Its job is to turn the owner's picks from three
rounds of styling mockups (October 2026) into changes to the screens they
were drawn on.*

**Status: Landed.** One PR, the seven streams merged into it.

**As implemented:**
- **A:** one `GradeMark` (a letter in one of three hand-drawn rings at one of
  five tilts, picked from the letter) replaced the grade chip everywhere it
  was drawn: Curriculum, Faculty, Building info, the Hall of Fame and the
  Final Report. The coloured letter inside an instructor's name chip stays a
  letter: a ring there would make the chip taller.
- **B:** the meters fill to the raw score, with potential as a paler run
  beyond it. The foot is two lines, not one: tiles are about 200px wide and
  can carry More, Train and Dismiss at once. `FacultyPortrait` gained a
  square shape for the mount.
- **C:** the college records no founding year, and every game starts at
  Year 1, so the patch reads "Est. Year 1". The dock's terms are the two
  26-week halves of the year (`TERM_LENGTH`, `weekOfTerm` in `format.ts`);
  the calendar's large figure stays the week of the year, as the old line
  said, and the bar under the days is the week within the term. The seven
  cells name their order only: the sim moves in whole weeks.
- **D:** the dial's ticks are an SVG mask over the existing arc; a full dial
  goes to the secondary colour, not brass, so it follows the school's pick.
  The data has no praise or warning field, so a reputation whose own effect
  costs the college (Party School, Commuter, Pressure Cooker) takes the
  cream sticker. Stickers are 82px, not 58: "Research Powerhouse" broke
  mid-word any smaller. The large quote mark is set in the sans: the display
  face's mark read as two blocks at that size.
- **E:** the running projects, which were tall panels above the cards, now
  sit under their own lab's row, so the roster is one list. A running lab
  keeps its "Wind up"; the mock's "View" had nothing to open. The tally has a
  cell per lab that stands, not a fixed thirteen.
- **F:** the "13–5" on a program card is the all-time series with that
  sport's rival, not a game, so the scoreboard's second cell is the *rival
  series* and reads Lead, Trail or Level rather than W or L. "Hire" scrolls
  to the market and moves focus there. The switch is opt-in (a `switch`
  class and `segmentedSwitch.ts`): Athletics' subsidy and scholarships, the
  Faculty views and every Settings row take it; the Inbox filters, build
  categories and tree chips keep their pills. The athletic director keeps
  its own block: one person, appointed by the board, with no market to open.
- **G:** every tile state stays apart: available, placing, developing
  (dashed, in the primary), built (stamped), the built-×N summary, and
  disabled (flat, the drawing faint). Level pips run to the highest tier the
  data has, so the library shows one of one. The cohort count was coloured
  by the cohort's pull (drawn above or below its usual share); that meaning
  moved to an arrow on the card's header, since the count is now ink and
  the colour is the change against last year. The cohort colour map moved
  to `cohortColors.ts`, shared with Enrollment.
- **Checks:** `npm run check` (148 of 148 suites) and `npm run phone` on a
  late-game save ("Nothing runs past the edge"), on the merged branch.
- **After the merge:** the switch's thumb is a pseudo-element, which the
  stylesheet's `* { box-sizing: border-box }` does not reach, so its border
  pushed it out of the track at the last option; it is border-box now. The
  README's pictures (`docs/images/`, last taken in September) were
  taken again with `tools/README.md`'s recipes, and `scenario.ts --name`
  now renames the college in a Final Report the run has already written.

The owner kept the Varsity register of Plan 18 (the school's colours,
cream and outline ink, hard offsets) and asked for tweaks that make it more
particular to a college, not a new direction. The mockups were drawn with
the register's own tokens; thirteen were picked. Each stream below is one
screen or one shared control, so the streams can be built in parallel and
merged without stepping on each other.

## The streams

- **A — Grades and the curriculum.** A letter grade is a letter circled in
  pen, slightly off the square, in place of the "grade B" chip, everywhere
  the chip appears (D). The Curriculum tab's schools become binder
  dividers: the school's colour in a tab at the row's left and down the
  left edge of its programs, with a small fill meter in place of the bare
  "53/54" (G).
- **B — Faculty cards as staff ID cards (E).** A band across the top in
  the school colour carrying the department and the waiting count; the
  portrait upright in a mounted frame; rank as a small stamped label;
  teaching and research as short meters with their letter; the salary and
  load in a footer strip.
- **C — The pennant and the clock.** The school's name on the map becomes
  an embroidered patch: an oval in the school colour with a gold satin
  border, a stitched line inside it, and the founding year over the name
  (H4). The dock's date becomes a desk calendar page (the term on its
  header, the week large), with the seven day cells lettered and a thin
  bar for the week within the term (S).
- **D — Students.** The satisfaction dials get gauge ticks, and a full
  score a gold centre and a "full marks" note; the weight becomes a small
  multiplier tag (I). The guidebook's reputations become round stickers
  beside the quote set large, with "on the way" as pips (N).
- **E — Research (M).** The vacant-lab cards become one roster: a lamp per
  lab, lit while a project runs, and a compact button. The checklist of
  labs that have finished a project becomes a tally of cells.
- **F — Athletics and the segmented control.** A program card's rank and
  last result sit on a small navy scoreboard, and a flagship gets a gold
  corner in place of its tag (O). A program's staff are three seats, an
  empty one dashed with a hire link (R). Every segmented choice becomes
  one sunken track with a sliding gold thumb (Q).
- **G — Build and admissions.** A build tile carries a strip of plan paper
  with its drawing at full strength, its count as a stamp and a level as
  pips (P). The admissions modal's cohorts carry their own colours (the
  register's `--cohort-1` to `--cohort-8`), the change from last year, and
  two bars on one shared scale (T).

## What every stream keeps

- Colours come from the register's tokens, so the school's own pick, the
  colour-vision-safe set and the text scale all still apply.
- Motion stays behind the player's motion setting.
- The phone layout holds (`npm run phone`).
- `npm run check` passes.
