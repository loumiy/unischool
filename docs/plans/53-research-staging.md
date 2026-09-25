# Plan 53 — Research staging

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The owner asked to stage research more:
- show only the first three depths of research initiative;
- gate the Research Park on an initiative completed in every field, and
  have it unlock the fourth depth;
- scrap the Research Library.

For "every field" the owner chose every built lab.

## 1. The PR

- **The first three depths** (Pilot Study, Funded Project, Major Program)
  are open from the first lab.
- **The Landmark Program** is offered, and accepted, only once the Research
  Park stands (`researchData.ts`'s `depthOpen`).
  - `initiativeOffers` leaves it out until then.
  - `startInitiative` refuses it.
  - The Research tab says it opens with the park.
- **The Research Park** (`CapitalProject.everyLabFinished`) opens from Year
  12, once every standing lab has seen an initiative through.
  - The record is `s.research.finishedLabs`, written when an initiative
    ends uncancelled.
  - It is optional, so an older save reads as none recorded.
- **The Research Library goes.**
  - The library grows by floors on the first-tier building alone.
  - The "research reputation" rung (prestige 70) opens the Bell Tower,
    with a new letter.
- **Save 76**, with a one-off carry from 75: the library leaves, with its
  site and every prerequisite that named it.
- **Tests:**
  - `projects.test.ts` covers the park's gate and the Landmark staging.
  - `ladder.test.ts` covers the rung's buildable.
  - `save-load.test.ts` covers the carry.
- **Docs:** `research.md` and `progression.md`.

**As implemented:** as above. The harness is untouched.
