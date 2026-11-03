# Pass A — The census

*Plan 123 §3, pass A: what the game has, how often players see it, and what decision it serves.*

**Commit read:** `5d06ae4`. **Reviewer:** a model (the review's lead), from `npm run review:strings`, `npm run review:census`, the gallery's counts ([`data/gallery.md`](data/gallery.md)) and PostHog ([`data/play-statistics.md`](data/play-statistics.md)).

## Method and limits

- `review:census` lists every surface file with its words, the actions it dispatches and the state it reads. It also lists every player action with the surfaces that dispatch it. Its "state no surface reads" list is regex-based: most of those fields reach the player through a system's figure, so it is not quoted as a finding.
- Words per screen count every string a screen *can* show (the string table), and the gallery's counts are what one visit *does* show on the top layer.
- The play statistics are a small sample, and they include the owner's tests. Tab opens come from the `year_reached` event's per-year counts.
- A verdict here is a candidate. The other passes' evidence decides it; each row in the cut list names its pass.

## The totals (the baseline every card is measured against)

| | Now |
|---|---|
| Player-facing strings / words | 8,669 / **61,332** |
| …of which events (catalogue and decisions) | 912 / 16,535 |
| …chapters, their help and the Guide | 173 / 2,617 |
| …course descriptions | 473 / 8,908 |
| Surface files (components, tabs, App) | 145, 49,784 lines |
| Player actions | 90 (85 reachable from a screen) |
| Systems (pass D) | 21, with 64 causal edges |
| Words read before year 2, careful newcomer (pass B) | ≈1,050 (≈1,300 opening every help) |
| Read-to-act, first 20 minutes (pass B) | ≈30 words per action |
| Words on the bare map's band: year 2 → year 15 → year 30 | 81 → 273 → 282 |
| Busiest screen: Curriculum at year 15 | 3,534 words, 540 controls |
| Juice coverage (pass C) | 62% of verb × beat cells at 2 or more |
| Edges seen / told / hidden (pass D) | 22% / 75% / 3% |
| Founded runs that end before year 1 (0.1.3–0.1.4.1) | ≈1 in 3 |

## How often each tab is opened

Per run-year, on 0.1.3–0.1.4.1 (362 run-years):

| Curriculum | Inbox | Faculty | Students | Research | Athletics | History | Treasury |
|---|---|---|---|---|---|---|---|
| **3.7** | 2.0 | 1.9 | 1.0 | 0.95 | 0.62 | 0.57 | **0.43** |

The game is played in the Curriculum, the Inbox and the Faculty tabs and on the map. History and the Treasury are visited about once in two years. That matters for every fact that lives only there: the prestige breakdown (History), the money levers (Treasury) and the alumni (History).

## Surfaces, scored

| Surface | Words (can show / one visit) | Seen | Decision it serves | Systems | Verdict |
|---|---|---|---|---|---|
| The map | 603 / 81–282 on the band | always | place, pave, plant; watch | campus, satisfaction, all | **keep**, and carry more (cards 5, 8, 10) |
| Curriculum tab | 826 / 368–3,534 | 3.7 a year | develop a course, assign a teacher | curriculum, faculty | **keep**; show the actionable rows first (card 6's spirit; not carded) |
| Faculty tab, Market, person | 1,628 / 446–1,963 | 1.9 a year | hire, fire, assign | faculty | **keep**; merge the two stacked segmented controls (E-9) |
| Inbox | 508 + events / 85–404 | 2.0 a year | answer matters | events | **keep**; fewer, map-backed letters (cards 8, 9) |
| Admissions page (summer) | 273 / — | once a year | price and admit rate | admissions, money, prestige | **keep, protect** (cards 3, 5) |
| Students tab | 541 / 228–574 | 1.0 a year | read needs; charter | satisfaction, student life | **fold onto the map** where it can (card 8) |
| Research tab | 2,379 / 760 | 0.95 a year | commission research | research | **keep**; the one optional system that pays (pass D) |
| Athletics tab | 1,197 / 717 | 0.62 a year | coaches, order, budget | athletics | **cut** the department's busywork (card 11) |
| History tab (prestige, record, guide, chronicle, alumni, promises) | 1,004 + 418 + 471 + 2,304 / 76–1,536 | 0.57 a year | none (it reports) | prestige, rivals, chronicle | **merge** prestige into the band (card 7); **cut** promises (card 9) |
| Treasury tab (endowment, estate, advancement) | 1,277 / 256–291 | 0.43 a year | maintenance, draw, sweep, campaigns | money, estate, alumni | **cut** the levers that do nothing (card 11) |
| Founders Hall offices | 546 | rarely | open an office | administration | **cut** (card 9) |
| Objectives drawer and chapters | 2,617 / 90–214 | every chapter | none (it guides) | guidance | **trim** hard (cards 1–3) |
| Tab walks | ≈340 | four, once | none | guidance | **cut** (card 3) |
| Opening coach, admissions coach | 259 + ≈220 | once | none | guidance | **trim**, **cut** (cards 3, 4) |
| Letters, board letters, milestone letters | 2,467 + 403 + 877 | often | sometimes | events, ladder | **trim** to map-backed ones (cards 8, 9) |
| Toasts, ticker, NEXT, drawer chip, badges | — / most of the band's words | always | none (they point) | guidance, inbox | **merge** to one place per fact (card 6) |
| Committee lamps | drawn | always | glance at the committee | curriculum | **keep**; stop the breathing (card 12) |
| Specialization room | 924 + 2,016 | once | the specialization | prestige | **keep** the room; land it on the map (card 10) |
| Final Report | 512 | once | none (the verdict) | all | **keep**; stage it (card 10) |
| Settings, main menu, save slots | 342 | rarely | settings | — | keep |

## Actions no screen reaches

`RENOVATE_LIBRARY` has a reducer case (`engine/reducer.ts:962`) that no surface dispatches. The library now grows through another route, so the case is dead code (cut list F1). `TICK`, `UNLOCK_EARNED`, `SAVE_FAILED` and `RESET` are the engine's own.

## What the numbers say

1. **The game already teaches itself in its best places.** The admissions screen, the founding, hiring through a hall slot and placing a building worked with every explanation hidden (pass B). Real players finish chapters whose briefings they never open (`data/play-statistics.md`).
2. **The words sit where the player isn't.** History and the Treasury hold 2,281 words of standing and money explanation and are opened about once in two years. The letters layer holds about 20,000 words for effects pass D measures as weak.
3. **The band grows with the college.** It carries 81 words in year 2 and 273 by year 15, mostly the same pending fact said in several places.
4. **Some systems serve nobody.** Pass D finds 7 islands among 21 systems. No goal player used the offices or held a reunion, and blocking the Treasury levers changed standing by at most 5 points (pass D).
