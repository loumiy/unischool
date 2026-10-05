# Plan 91 — Committee lamps

*Planning document only. Its job is to record the owner's pick from a round
of mockups (October 2026) for keeping an eye on the curriculum committee
without opening the Curriculum tab.*

**Status: Landed.** One PR.

The owner disliked Plan 80E's committee chip, a "Committee 3 of 4" box beside
the speed gears, and asked for small squares that light up while courses are
in development. Five placements were mocked up: under the Curriculum tab's
word, a drawer tab on the dock's gold edge, a row under the term bar, bare
squares where the chip was, and a tray on the map. The owner picked the first.

**As implemented:**
- One lamp per seat the committee has earned (`techSystem.ts`'s
  `committeeLamps`), so the row grows from four toward nine as prestige and
  the Office of Curriculum Development add seats. Seats not yet earned have
  no lamp; the committee panel still shows them locked.
- A writing seat is lit in the school's second colour and fills from the
  bottom as its course nears done. A free seat breathes while some course
  could start (`committeeStatus`'s `ready`, which flagged the chip), and is
  held half lit when motion is reduced. A course just done flashes once.
- The lamps sit under the word, absolutely placed. Every tab's glyph and word
  rise 3px so all the words stay on one line.
- The button's name stays "Curriculum", so the tools that find tabs by name
  still work. The committee's sentence (`FIGURE_HINTS.committee`) describes
  the button and is its title; each lamp is titled with its course.
- The chip is gone: `committee` is no longer a `StatChip`, and the
  `curriculum.committee` heading stays in `SECTION_HEADINGS` for the panel.
  The Curriculum tab's "!" (unseen courses) is unchanged.
