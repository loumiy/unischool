# Plan 43 — The consistency review

*Planning document only. Its job is to turn the owner's request into a PR.*

**Status: In progress.**

---

## 0. The request, and what was found

The owner asked for a thorough review of everything in the game except its
balance:
- what looks off, and what looks off when the camera turns;
- what contradicts itself;
- where style or tone does not match;
- what is redundant or duplicated.

They asked for fixes as the review went, and for the findings as a repo
document with screenshots.

Six read-only reviews ran in parallel: logic, flow, screens, authored data,
words, and the map under rotation. A browser pass covered five saves in
every tab and view. The findings, the fixes and the questions left for the
owner are in
[the consistency review](../reviews/2026-09-consistency-review.md).

The work is split three ways, one PR each:

- **This plan:** logic, flow, the screens and the data, plus the review
  document.
- **[Plan 44](44-the-map-in-every-view.md):** the map in every view.
- **[Plan 45](45-the-words-agree.md):** the words.

## 1. The PR

Everything here is a clear fix: a finding with one right answer. The review
lists each finding with its commit.

- **The resolve path.**
  - Naming the mascot advances the clock.
  - Every resolve returns when nothing is pending.
  - A decision event always applies a choice: an invalid or unaffordable
    pick falls to the free one, and the free one applies even with
    negative cash.
  - Enter no longer answers a decision event, the Final Report or a promise
    offer.
- **One standing predicate.** `standsOnCampus` covers a finished building,
  or one open through in-place work.
  - It decides a venue's seats and whether its teams play.
  - Demolition benches a category's teams when no other venue stands, takes
    back any kind's beds, and settles a loan only if this build took one.
  - A dissolved housed chapter's beds go with it.
- **The shell.**
  - Front screens silence every key and draw no modal over themselves.
  - New Game starts from a clean shell.
  - Every walkthrough card can skip the rest.
  - A modal covers the whole game, the game behind it is inert, and Escape
    closes one thing at a time.
- **The screens.**
  - The History tab keeps its Chronicle.
  - Every Appoint shows the pay the college gives, and none is gated on
    cash.
  - Promote, and dismissing a scholar on a project, warn first.
  - The build menu and log popups stop overlapping; the notes step aside
    for a building's panel.
  - The text-size and colour-vision settings reach everything.
  - The dead styles go.
- **The data.** Wrong descriptions, internal codes shown to the player, a
  duplicated need, missing Law research interests, and stale comments.
- **Dead and duplicated code.**
  - The finished-course count and faculty departure are each in one place.
  - The `'demand'` interrupt and two pre-v72 save deletes, which no loadable
    save can reach, are gone.
- **Tests.**
  - `demolition.test.ts` covers teams, beds and loans.
  - `hotkey-gates.test.ts` covers the front screens (32 states).
  - `ladder.test.ts` holds the 'town' letter's claim about the cost of
    being large.

No save version bump: the one new field (`FinalReport.figures`) is optional
and falls back to the live figures.

**As implemented:** *(to be written when the PR lands.)*
