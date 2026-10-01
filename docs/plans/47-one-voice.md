# Plan 47 — One voice

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

[The consistency review](../reviews/2026-09-consistency-review.md) asked
two questions about presentation and words. The owner said yes to both:
- **Q13:** one set of conventions across the screens.
- **Q14:** a decision on each word the text review could not settle alone.

[Plan 46](46-the-owners-answers.md) took the logic answers. This plan takes
Q13 and Q14. No game rule changes here except the catalog's costs and gates,
and no save field changes.

## 1. The PR

- **Q13: conventions.**
  - **Verbs:** a read-only modal closes with Continue, and the board's
    letter with Noted; any other letter is read by opening it in the inbox
    (Plan 77). Dismiss, Understood and Resolve are gone as dismiss verbs.
  - **Dates and weeks:**
    - Prose reads "Year N": a chapter's founding, a trophy, the research
      record.
    - The log and the charts keep their compact stamps.
    - Compact durations read "Nw", rates "/wk", and prose says weeks.
  - **Case:** headings and buttons are sentence case. The Treasury's
    "Balance" heading drops a "Policy" it did not hold.
  - **Confirmations:** `ConfirmButton` is the one way the game asks before a
    loss.
    - The first click arms it and says what is lost.
    - The second click acts.
    - Blur or Escape disarms it.

    It guards:
    - calling off or demolishing a building;
    - declaring a building historic;
    - relocating a program;
    - moving cash to the endowment;
    - releasing a coach;
    - promoting or hiring into a seat;
    - winding up research;
    - New game, on the menu and on the title screen (there only when a run
      is underway).
  - **Announcements:**
    - Everything addressed to the President waits in the inbox (Plan 77),
      grouped by tier, most urgent first, so no unread letter hides another.
    - The catalog's letters are "A letter to the President"; "From the
      board" belongs to the distress ladder alone.
    - A tab that a ladder milestone opens is announced by the milestone's
      letter alone, not by a log line as well.
    - The school-founded and school-distinguished milestones are quiet,
      because their celebration modals already say what opened.
  - **The opening:** founding a program happens in a hall's panel. The
    walkthrough's founding step, the first letter's ask ("Found a fourth
    program (Founders Hall)") and the free-slot line all open Founders
    Hall's panel, not the Curriculum (`NextStep.go 'hall'`).
  - **Year 51:**
    - The fiftieth summer's first step is labeled "Final report".
    - The report's closing line says the summer goes on to set Year 51's
      tuition and admit its class, so the admissions beat is expected.
- **Q14: the catalog's words.**
  - **"Paid" choices cost money.** Thirteen choices that said they paid
    for something now carry a cost:
    - from $45,000 for an alumni records officer;
    - to $250,000 for "Spend on the teaching";
    - and $500,000 for meeting a claim in full.
  - **The duplicates go.** The catalog copies of the naming rights (both),
    the recruiting scandal and the coach poached are gone. The athletics
    system's own beats carry those stories.
  - **Dated texts wait for their year.**
    - The fire in the oldest building waits for Year 40.
    - The Whitfield letter waits for Year 44.
    - The storm waits for Year 25, and "took the roof off the first hall".
    - The founding faculty's farewell no longer assumes two buildings are
      gone ("Where Things Began").
  - **No real names.**
    - The real trophies become the Iron Gate, Stone Jar, Anvil,
      Weathervane, Chapel Bell and Oar.
    - Rivals that shared a real college's name become Portside Tech and
      Nightjar College (the Nightjars).
    - The Crusaders and the Quakers become the Wardens and the Pilots.
    - The Thunderbirds, among the mascot suggestions, become the
      Thunderhawks.
    - The real funders become the Federal Science Council and the Federal
      Humanities Council.

**As implemented:** as above. The costs and gates change which letters
arrive and what they take, so the slow suites move again; Plan 49 re-fits
them.

## 2. The glossary (Plan 76F)

*An additive edit from [Plan 76](76-ui-and-text.md)'s PR F. One word per
thing. Where the plan's proposed word would have contradicted what the game
already calls the thing, the game's word wins, and the entry says so.*

**The voice.** A senior administrator's dry, specific prose, in American
English. The college is "the college", not "you"; the President is "the
President". The chair's letters and the walkthrough may say "you", since
they are written to the President. No contractions, no exclamation marks,
no cheer. The menu, Settings, the crash screen and the credits may speak of
"the game" and "the run"; nothing else does.

**Things with one name:**
- **Program slot.** A hall's place for a program: "six program slots", "a
  free program slot", "Move to … program slot 2". Always written in full,
  since a bare "slot" could be any of three things (Plan 76J). *Plan 76 proposed "rooms"; the game already
  said "slot" in about twenty strings (the Build menu, the hall panel, the
  map, the Curriculum, the next-step line), and "room" already meant the
  places left for a new class. The walkthrough's and the first-hall
  letter's "rooms" became slots.*
- **Course slot.** A professor's teaching capacity, and a department's:
  always "course slot", never a bare "slot" or a "seat". A professor's
  *teaching load* is the courses they teach against their course slots.
  A course that waits on one says **"needs faculty"** ("needs Economics
  faculty"), not "no free slot": the player's move is a professor, and the
  words name it (Plan 76J).
- **Seat.** An administration post: the Provost, the Deans, the Facilities
  Director, the Dean of Students, the VP of Advancement. Physical seats
  (study seats, dining seats, seats in the stands) are furniture and keep
  the word. The curriculum committee has no seats or slots: it "writes up to
  four courses at once", and a course waits for "room on the committee".
- **Places.** Teaching capacity: each course taught gives the catalog
  eighty places ("the catalog's places", "+80 places").
- **Room.** The places left for the incoming class once the three classes
  staying on are counted: "Room for", "held to the room", "where the class
  fills the room".
- **The guide.** The published ranking: "#12 in the guide", "the guide's
  academic ranking". Its six lists are *the standings* ("six rankings, one
  field"). *The guidebooks* are kept for reputations (the identity tags)
  alone. "The rankings" as a publication, "the table" and "the academic
  table" are gone.
- **The board's scale.** The distress ladder: sound, tight, deficit, a
  construction freeze, austerity, an interim CFO. The college moves down it
  and back up it. The milestones are *milestones*; no player-facing text
  calls either system a ladder.
- **Stage.** A program's standing in the hall panel (its milestones:
  established, distinguished). *Standing* is the six ranked standings, and
  the Treasury's *standing sweep* is a standing order.
- **The board.** The body; "a trustee" is one of its members. "The
  trustees" as the body is gone.
- **The Final Report.** A document's name, capitalized everywhere,
  including the fiftieth summer's first step. *This replaces the step's
  "Final report" (§1, Year 51), which set the step's word, not its case:
  one name is written one way.*
- **New game.** Starting over, on the menu, the title screen, the Final
  Report and the hall of fame. *Plan 76's default 4.*
- **Grade.** Every score, the Final Report's included ("Final grade"). A
  "mark" is gone.
- **Step.** The summer's three steps: Review, Admissions, Students.
- **A graduating class.** The first the college graduated is "the first
  graduating class"; every later one carries its year, "the class of Year
  3", never a bare number that reads as a count (Plan 78F).
- **Grade**, beside a count, is written on its chip: "3/9 grade B". A course
  cell's chip, in a grid with its key, stays a bare letter (Plan 78F).
- **Training pick.** One of the year's places at the Faculty Training
  Institute ([Plan 85](85-specializations.md) PR E): "3 of 5 training picks
  left this year". The action on a professor's tile is **Train**, and a
  professor so raised is *trained*. Picks not used *lapse*.
- **Specialization.** The one pillar a college, or a rival, may be the very
  best at ([Plan 85](85-specializations.md)): "specialized in research".
  Never "archetype", which names the harness's players. A pillar's cap
  without one is its *limit* ("At its limit"), as the table below says of
  any ceiling (Plan 85C).

**Plain words for what the code calls things:**

| The code's word | Said as |
|---|---|
| the wall | Waiting on faculty |
| housed | with a hall; the courses now taught |
| the recreation chain | the recreation buildings |
| flat (a bonus) | at any size |
| cohort signal | no particular pull |
| varsity-active | plays varsity |
| initiative | research project |
| revealed, unlocks | open; can be built once; listed once |
| earned (a program) | on offer |
| beat | step |
| tier | Level N (a building); capstone and upper-level courses; subsidy level (athletics) |
| the pot (athletics) | the department's fund |
| chair (coaching) | post |
| ceiling | limit; a coach's potential |
| attribute (satisfaction) | need |
| stock | moves slowly toward its target |
| floored | cannot fall below a floor |
| dark (a program moving halls) | closed while it moves; *dark* is kept for a program with an unstaffed course |
| the estate | buildings and grounds; the campus |
| default (an unanswered matter) | left unanswered |
| pts/wk (a scholar's output) | a week, of the 90 a paper takes |

**The engine stays out of the prose.** No weekly tick, run (outside the
menu, Settings, crash screen and credits), throttle, pacing, "interrupts
play" or scrolling. The speed control is said as the setting it is: "game
speed 4×", "Game speed 8× (4)".

**Lists** take no serial comma ("tuition, the payroll and the size of the
catalog"), unless one is needed for sense ("soccer, lacrosse, field hockey,
and track and field"). A series of clauses may keep its commas.

**Case.** "The Dean", "the Athletic Director" and "the build menu" are
written one way each. The clock's terms are "Fall term" and "Spring term".
