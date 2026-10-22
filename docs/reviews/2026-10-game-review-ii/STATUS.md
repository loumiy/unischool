# The second review, after 0.1.3

*A status note on [the second review](README.md) (Plan 86, which read
`4062bfb`), written on 22 October 2026 against `b1f2114` (0.1.3), after
Plans 87–108 landed. The review itself is a snapshot and is not edited. This
note records what became of each finding. Each status was checked in the code
or the build by the third review (Plan 109,
[`docs/reviews/2026-10-game-review-iii/`](../2026-10-game-review-iii/README.md)),
whose area files hold the full evidence. A finding still true is carried there
as a new `C…` or `I7-…` finding.*

**Fixed** means the finding no longer holds on `b1f2114`. **Partly** means
part of it was fixed. **Still holds** means none of it was. **Superseded**
means the thing it was about was replaced, or the owner discarded the ask.
**Deferred** means the owner decided to leave it.

## The totals

| Area | Findings | Fixed | Partly | Still holds | Superseded | Deferred |
|---|---:|---:|---:|---:|---:|---:|
| 1. Aesthetics | 9 | 7 | — | — | 2 | — |
| 2. UI and text | 7 | 5 | 2 | — | — | — |
| 3. Intuitive gameplay | 10 | 6 | 2 | — | 1 | 1 |
| 4. Strategy | 11 | 2 | 6 | 1 | 1 | 1 |
| 6. Marketability | 6 | 4 | 2 | — | — | — |
| 7. Bugs | 9 | 8 | 1 | — | — | — |
| **All** | **52** | **32** | **13** | **1** | **4** | **2** |

**Still holds:** B4-10, late money, which is worse ($9.5B at year 40; Plan 95X
had measured $4.9B).

**Deferred by the owner:** B3-9 (an idle committee, "the lamps are enough") and
B4-4 (small stays hard on purpose). Both are re-read in the third review (C3-6,
C4-10).

**Of the ten ranked improvements:**
- answered in full or nearly: 2 (prestige readable), 3 (a new college not
  marked down), 4 (guidance that sees what's coming), 8 (the text true) and
  9 (the specializations drawn), through Plans 87, 95 and 107;
- in part: 1 (the specialization reached sooner, but the bodies don't
  diverge), 5 (small), 6 (the clock and the late clicks) and 10 (the shop
  window, stale again);
- not at all: 7 (late money).

Its fix-first list was done in full except H7-8a (`demand` still never stops).

## Area 1 — Aesthetics

| Id | Finding | Status | Evidence | Carried as |
|---|---|---|---|---|
| B1-1 | The Research Park reads as a warehouse | Fixed | Plan 87B: pavilions round a court, in every set | — |
| B1-2 | Seasons stop at the open ground | Fixed | Plan 95B: turf, courts, pool, pond, cherries follow the week | C1-3 (newer roofs miss the snow) |
| B1-3 | The vernacular stops at the render wall | Fixed | Plan 95D: 0% render wall outside Modern and Art Deco | — |
| B1-4 | Diagonal walks draw as staircases | Superseded | Discarded by the owner, 12 October (`backlog-archive.md`) | — |
| B1-5 | Doors open onto lawn | Superseded | Discarded by the owner; 1,020 hits remain on four grown campuses | — |
| B1-6 | The asset gallery is stale | Fixed | Regenerated on `b1f2114`, all 27 images match | — |
| B1-7 | The downtown's lights burn at noon | Fixed | Plan 95C | — |
| B1-8 | Identical towers and chapter houses | Fixed | Plan 87H: crowns and letters | C1-5 (the first decade's halls) |
| B1-9 | Slips on Plan 85's buildings | Fixed | Plan 87 | — |

## Area 2 — UI and text

| Id | Finding | Status | Evidence | Carried as |
|---|---|---|---|---|
| B2-1 | The load moved to Faculty, History and Athletics | Partly | History's Prestige view 42–75 words (was 2,054–3,296); Athletics folded. Faculty no lighter. The Curriculum heavy again (Plan 107C's open rows) | C2-4 |
| B2-2 | Four false claims | Fixed | Plan 95E. New false claims are a new finding | C2-2 |
| B2-3 | The specialization: 681 words and a misleading figure | Fixed | Plan 95F: prestige points, 372 words | — |
| B2-4 | The rule six times; "term" two ways | Fixed | `prestigeWords.ts` | — |
| B2-5 | The glossary's last mile | Partly | A bare "Confirm" returned; second person back to 40 strings | C2-10 |
| B2-6 | The catalog's shape and the 101s | Fixed | Plans 95L–M and 102: 473 courses | C2-11 (five sentences) |
| B2-7 | Small phone and inbox details | Fixed | Plan 95K | — |

## Area 3 — Intuitive gameplay

| Id | Finding | Status | Evidence | Carried as |
|---|---|---|---|---|
| B3-1 | The first summers mark every college down | Fixed | Plan 107F: opens at 32; the careful run rose every summer of five | — |
| B3-2 | Prestige's panel can't say how to raise it | Partly | Plan 107D's glance; no row says what can move now | C3-11 |
| B3-3 | NEXT asks for a building already going up | Fixed | Plan 95O | — |
| B3-4 | "Establish a school" names the goal | Fixed | NEXT names the step and counts | — |
| B3-5 | Admissions hides a big class's prestige cost | Superseded | Crowding retired (Plan 107E) | — |
| B3-6 | The specialization says when, not why | Fixed | Plan 95F | — |
| B3-7 | The first lab doesn't say it starts research | Fixed | The tile says so | — |
| B3-8 | The Curriculum won't name a school | Fixed | "Science · 1 program, not yet founded" | — |
| B3-9 | Nothing points at an idle committee | Deferred | Plan 95: "the lamps are enough" | C3-6 |
| B3-10 | Smaller doubts | Partly | Most fixed; the search price's climb still unexplained | C3-12 |

## Area 4 — Strategy

| Id | Finding | Status | Evidence | Carried as |
|---|---|---|---|---|
| B4-1 | The ambitious paths build one college | Partly | Championships is now a distinct college; five goals still end at 37,120–37,840 students, 415–420 courses, 20 teams | C4-1 |
| B4-2 | The specialization is out of reach for the strategies that differ | Partly | Revenue and championships offered it at Y20; satisfaction never | C4-6 |
| B4-3 | The choice comes at years 39–47 | Fixed, and overshot | Six goals of seven at exactly Y20; real players at Y21 | C4-7 |
| B4-4 | Small is a trap | Deferred | The owner: small stays hard. Plan 107 lifted Lean +12 and Selective +2.7, still bottom half | C4-10 |
| B4-5 | Instructor swaps doubled | Partly | The Provost's policy does the swaps; nothing points to it | C4-8 |
| B4-6 | Most weeks ask nothing; stops grew | Partly | Stops 81–203 a run (was 129–298); idle weeks 57–86% | C4-4 |
| B4-7 | The Final Report misreads the strategies that differ | Partly | Championships and big-then-good read right; satisfaction still F | C4-6 |
| B4-8 | Athletics and size have too few levers | Partly | Teams can be founded (Plan 89) and cut (95V); no recruiting, no target enrolment | C4-9 |
| B4-9 | The price is set blind | Superseded | The Admissions Office (Plan 89) | — |
| B4-10 | Money stops mattering | **Still holds** | Natural Y40 cash $9.5B | C4-5 |
| B4-11 | The scorecard measures October's prestige | Fixed | Plan 95W re-based it; not refitted after Plan 107 | C4-11 |

## Area 6 — Marketability

| Id | Finding | Status | Evidence | Carried as |
|---|---|---|---|---|
| B6-1 | The shop window shows the September game | Partly | Retaken by Plan 95Y and on 12 October; stale again after Plans 104–108 | C6-7 |
| B6-2 | Two of four specialists don't top their pillar; the choice comes late | Fixed | Plans 85I and 95R | — |
| B6-3 | The AI disclosure is nowhere a buyer looks | Partly | Drafted (95Z); its "no image generator" line is now false | C6-1 |
| B6-4 | February's Next Fest is not realistic | Fixed (a decision) | June 2027, confirmed by Steamworks | C6-2 |
| B6-5 | A first run ends near the refund line | Fixed | The store texts name the sandbox and the Epilogue; the playtest's runs pass two hours | C6-6 |
| B6-6 | Three of October's facts need correcting | Fixed | No document repeats them | — |

## Area 7 — Bugs

| Id | Finding | Status | Evidence | Carried as |
|---|---|---|---|---|
| H7-1 | A pre-85F save counts too many Landmark Programs | Fixed | Plan 95AA | — |
| H7-2 | The wheel can't stop the browser's zoom | Fixed | Plan 95AB | — |
| H7-3 | A second tab drops the first's unsaved weeks | Fixed | Plan 95AA; `twoTabs.mjs` case 4 | — |
| H7-4 | An opened matter pauses again after a reload | Fixed | Plan 95AA | — |
| H7-5 | A board letter is always dated this week | Fixed | Plan 95K | — |
| H7-6 | Short money rounds past its unit | Fixed | Plan 95AB | — |
| H7-7 | "University of Ashford College" | Fixed as decided | Plan 95AC: the form says how it will read | — |
| H7-8 | Tooling | Partly | `training` stops; `demand` still never stops | I7-5 |
| H7-9 | Three events name anyone | Fixed | Plan 95AD | — |
