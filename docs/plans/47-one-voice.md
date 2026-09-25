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
  - **Verbs:** a read-only modal closes with Continue and a note with
    Noted. Dismiss, Understood and Resolve are gone as dismiss verbs.
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
    - The notes over the map stack in one column, most urgent first, so no
      unread note hides another.
    - The catalog's letters are "A letter to the President"; "From the
      board" belongs to the distress ladder alone.
    - A tab that a ladder milestone opens is announced by the milestone's
      note alone, not by a log line as well.
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
