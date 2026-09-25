# Plan 46 — The owner's answers

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

[The consistency review](../reviews/2026-09-consistency-review.md) left
sixteen questions open. The owner answered:
- Q1–Q10: yes.
- Q11 (the debug flag on a school named "Test"): keep it for development,
  and remove it before publishing.
- Q12: yes, except the capital projects that repeat buildings, which get
  their own look later.
- Q13, Q14 and Q16: yes.
- Q15: fix the walkers, not the doors.
- Spelling: American, always.

This plan takes Q1–Q10 and Q12. Q13 and Q14 are Plan 47, the walkers Plan
48 and the harness Plan 49. The harness plan goes last, so it re-fits the
bands after every change that moves the dice.

## 1. The PR

- **Q1: in-place work stands.**
  - A library floor or venue expansion keeps its building standing
    (`standsOnCampus`) for library adequacy, prestige contribution,
    condition, historic status, beauty, upkeep and the estate's week.
  - Its end is logged as a renovation, not as a newly developed building.
- **Q2:** a campaign closes on its due week (`dueWeek`, optional, so a
  campaign already running closes on its calendar year).
- **Q3:** the construction freeze stops stories, venue expansions and
  library floors, and the buttons say why.
- **Q4:** a program between halls is not taught anywhere:
  - its courses cannot be reassigned;
  - they neither seat students nor cost instruction sections, since the
    Treasury's count is the admissions ceiling's (`taughtCourses`).
- **Q5:** planting a tree is seeded from the tile, not the game's dice.
- **Q6:** a research topic runs in one lab at a time.
- **Q7:** each resolve answers only its own modal, and a held Enter, Space
  or Escape answers once.
- **Q8:**
  - the blind tuition lock is kept in the save (`LOCK_TUITION`,
    `SummerPayload.lockedTuition`);
  - every letter offers "no more letters".
- **Q9:**
  - The save policy stays as `persistence.ts` states it: no migration
    chain while the game is unreleased. (The "migrations from day one"
    rule is the v2 repository's.)
  - A save this version cannot open is now set aside, not overwritten.
  - The title screen names it and offers to discard it.
- **Q10:** on load, descriptions (and course titles, which nothing
  renames) come from the catalog, so corrections reach saved runs. A
  building's name is kept, because naming rights can change it.
- **Q12:**
  - "Commons" is for dining and "Hall" for academic buildings. Residences
    are Houses; four dining halls that shared a name with something else
    are renamed; the default quad name The Commons is now The Common.
  - Chemistry is CHEM and Chemical Engineering CHEN.
    - `SAVE_VERSION` is 73.
    - A one-off carry from 72 remaps the ids in the saved text.
  - The Graduate College adds no beds.
  - A cross topic's partner field's own lab is always admitted.
  - Ashcombe (r1) joins the elite band.

**As implemented:** as above. The slow suites are expected to move again,
because Q1, Q4, Q5, Q6 and the elite band all change play. Plan 49
re-fits them.
