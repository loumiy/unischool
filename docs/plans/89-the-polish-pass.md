# Plan 89 — The polish pass

*Planning document only. Its job is to turn the owner's picks from three
rounds of styling mockups (October 2026) into changes to the screens they
were drawn on.*

**Status: Proposed.** One PR, seven streams merged into it.

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
