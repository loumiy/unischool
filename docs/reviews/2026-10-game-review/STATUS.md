# The October review, after Plan 85

*A status note on [the October 2026 review](README.md) (Plan 73, which read
`58fa3fd`), written on 2 October 2026 against `4062bfb`, after Plans 74–85
landed. The review itself is a snapshot and is not edited. This note records
what became of each finding. Each fix was checked in the code, not taken from
a plan's status line. What is still open is in [`BACKLOG.md`](../../../BACKLOG.md),
and the second review (Plan 86, `docs/reviews/2026-10-game-review-ii/`)
reads the game afresh.*

**Fully** means the finding no longer holds on `HEAD`. **Partly** means
part of the fix landed. **Not** means it still holds. Where the thing a
finding was about has since been replaced, such as the event panel by the
inbox (Plan 77), board confidence (removed by 80C) or prestige by the
four-pillar blend (85B), the note says so.

## The totals

| | Fully | Partly | Not |
|---|---|---|---|
| Findings (A1–A4, G7, with G7-17 as a–d): 53 | 43 | 6 | 4 |
| The ten ranked improvements | 5 | 5 | 0 |
| Fix first | 6 | 0 | 0 |
| Area 6's recommendations: 13 | 1 | 4 | 8 |

**Partly addressed:** A2-2, A2-5, A4-1, A4-2, A4-4 and A4-5.

**Not addressed:**
- A1-7 and A1-8, which the owner deferred to the backlog in Plan 74;
- A4-3, where Plan 77C kept every stop a stop;
- A4-6, area 4's blind price, which had been on no list until this re-read.

**Area 6 (marketability)** is the one area the owner has not triaged.

## Area 1 — Aesthetics (Plans 74 and 75)

The canvas map (Plan 83) draws through the same motif functions, so what
follows is what the canvas draws.

| Id | Finding | Status | Evidence | What remains |
|---|---|---|---|---|
| A1-1 | The vernacular restyles about half a grown campus | Fully | 74E: `SURFACE_FOLLOWS_MOTIFS` (`buildingSpec.ts`). Re-measured: 67 of 74 buildings (79% of the footprint) wear the vernacular's surface. Massing varies on 41 of 74, as before, by design. | The per-vernacular details the review listed (fanlights, quoins, Mission courtyards, pilotis) |
| A1-2 | Different buildings share one drawing | Fully | 74F: `signifierOf`, and a repeat rule in `test/building-spec.test.ts`. 66 distinct looks. | Repeats only within one function (chapter houses, towers, villages) |
| A1-3 | The Great Dome draws itself cut in half | Fully | 74C (`landmarks.tsx`, `Dome`) | — |
| A1-4 | The grand landmarks look like placeholders | Fully | 74C (ribs, peristyle, lantern, clock, gate reliefs); 75B (the gate's arches walkable) | — |
| A1-5 | The stadium opens as a bare field | Fully | 74D (touchline stands as built) | — |
| A1-6 | The late campus is derelict at full funding | Fully | 74B: `BACKLOG_PAYDOWN_RATE` (`estate.ts`). Re-measured at year 51: 0 derelict buildings on three seeds (the review found 50 of 81, 44 of 69 and 52 of 70). Founders Hall's condition is 0.90–0.93 (it was 0). | Repair letters still spread their backlog over the whole campus (backlog, *Events that do what they say*) |
| A1-7 | Diagonal and curved walks draw as staircases | Not (deferred) | Corner-joined diagonals already draw straight (Plan 24F). Edge-joined runs do not. | Backlog, *Walks that draw straight* |
| A1-8 | Doors onto lawn, seams, trees and racks | Not (deferred) | Re-measured over 69 arrangement saves: 1,158 doors onto lawn, 208 on a seam, 113 behind another building, 41 onto courts, 40 under trees, 20 under props, 37 overhangs. The review counted over a different set of 63 saves, so the numbers don't compare, but every rule still fires. | Backlog, *Doors that meet the campus* |
| A1-9 | Style slips within a vernacular | Fully | 74G | — |
| A1-10 | The map never changes with time | Fully | 74I: seasons (`components/seasons.ts`), on by default | Night, weather and water |
| — | Construction sites don't grow | Fully | 74H (`siteStageOf`) | — |
| — | The list of decorative assets | Not (deferred) | None is built | Backlog, *Decorative assets* |

## Area 2 — UI and text (Plan 76, reshaped in part by 77, 78 and 80)

| Id | Finding | Status | Evidence | What remains |
|---|---|---|---|---|
| A2-1 | The Curriculum is the heaviest screen | Fully | 76B and 80B: one line per program, grade and staffing filters, a pinned head. Plan 76 measured 885 words and 52 controls at year 8, against the review's 2,244 and 282. | — |
| A2-2 | 109 flavor claims are false | Partly (nearly all) | 76C and 76D fixed the words or built the effect; 79C and 79D fixed the landmark's lift and the `{faculty}` placeholder. `test/event-truth.test.ts` and `test/text-true.test.ts` guard them. The claims about board confidence went with the system (80C). | Three report tags (commuter, country club, pressure cooker); ten event rows wait on systems the events cannot reach (backlog) |
| A2-3 | Money and figures written several ways | Fully | 76E (`format.ts`; the warning colour at 5.9:1) | — |
| A2-4 | Voice slips | Fully | 76F. Re-measured with `review:strings`: no engine words, contractions or exclamation marks, and second person down from 58 to 37. | One British spelling in a label players never see; "Autumn leaves…" in Settings |
| A2-5 | Course descriptions with real errors | Partly | 76G: 132 sentences and 7 titles fixed, and house checks added | The catalog's shape (no 300- or 400-level courses, no Professional Responsibility in the JD, no internal medicine in the MD): backlog |
| A2-6 | Buttons and headings have no system | Fully | 76H | The share card's fonts and a few glyphs (backlog, *Small things*) |
| A2-7 | The phone layout crowds and breaks words | Fully | 76I | — |
| A2-8 | The register is out of date | Fully | 76H (`ui-shell.md`) | — |

## Area 3 — Intuitive gameplay (Plans 77 and 78)

| Id | Finding | Status | Evidence | What remains |
|---|---|---|---|---|
| A3-1 | The second hall can deadlock a new player | Fully | 78D: the claimed hall's own offers, `DECLINE_OFFER`, a confirmation before a program takes another school's room; `test/split-school.test.ts` | Other schools' offers still show in a claimed hall, behind the confirmation |
| A3-2 | The NEXT line points at the wrong panel | Fully | 78D | — |
| A3-3 | Events pass while the player reads a tab | Fully, by another route | The event panel became the inbox (77). 78E pauses the game when a matter arrives and in its final week (`systems/inbox/unseen.ts`). | The countdown is not held while a tab is open (declined: a sim change). The year's review counts defaulted matters but does not name them (backlog, *A digest*). |
| A3-4 | Year one is quiet while satisfaction falls | Fully | 78B: the Students tab from week 1, and a year-one fallback for the NEXT line | — |
| A3-5 | The chips don't lead to their explanations | Fully | 78C, retargeted by 80C (`statChips.ts`) | The chips' word labels are hidden on a phone |
| A3-6 | Jargon in the first minutes | Fully | 76F, 78F | — |
| A3-7 | Smaller doubts | Fully | 78F, 77, 78G | The coach card does not follow the building's footprint |
| — | The charter | Fully | 78G: a choice, sent as an inbox matter | — |

## Area 4 — Strategy (held by the owner; taken in part by 76B, 78D, 80 and 85)

| Id | Finding | Status | Evidence | What remains |
|---|---|---|---|---|
| A4-1 | Every ambitious path ends as the same college | Partly | Plan 85: four pillars, a permanent specialization, rivals that specialize | Not re-measured until the second review (area 4). Lasting scarcity was not taken up, and money still piles up late (85I). |
| A4-2 | The teaching standard is the late game, with only a manual lever | Partly | The *Below A* filter (76B). A faculty-development lever, but only as the academics specialization's training program (85E). The Provost's auto-fill was declined by the owner (Plan 80). | No link from the Prestige panel to the filter; no lever for a college that did not choose academics |
| A4-3 | Most weeks ask nothing while modals crowd the rest | Not | Milestone notes and research reports still stop the clock, now in the inbox (77C kept every stop a stop) | Backlog, *A digest for the stops that ask nothing* |
| A4-4 | The Final Report misreads the goals that differ | Partly | 76C (the finance phrase; athletics scaled once). 85B and 85I (the experience axis reads the student-life pillar, which includes welfare). 85D (the title names the specialization). | The access phrase, "never opened its doors very wide" (backlog) |
| A4-5 | Athletics and size have too few levers | Partly | Declining an offer (78D); recruiting, capped flagships and the college's pull (80G); more flagship slots with the athletics specialization (85G) | Founding or disbanding a team; a target enrollment (backlog) |
| A4-6 | The price is set blind | Not | The admissions beat is unchanged | Backlog, *The price is set blind* (added by this re-read) |

## Area 7 — Bugs (Plan 79, with Plans 74 and 76)

Every entry is fixed:

| Id | Bug | Fixed by |
|---|---|---|
| G7-1 | A stale second tab overwrites the save | 79B (`persistence.ts`, `test/two-tabs.test.ts`) |
| G7-2 | Backlog compounds at full funding | 74B |
| G7-3 | The winter model is half a year off | 76D (`state/winter.ts`) |
| G7-4 | Tag attrition is previewed but never applied | 76C (`summerAttrition`) |
| G7-5 | The athletics axis can't reach an A | 76C; since 85B it reads the athletics pillar |
| G7-6 | The dome's drum | 74C |
| G7-7 | The landmark and milestone applicant lifts do nothing | 79C |
| G7-8 | The Treasury doesn't add up | 76C, 79D |
| G7-9 | A move before the summer shrinks the class | 79C |
| G7-10 | Placeholders name the wrong building or person | 76D, 79D (`star-poached` and the tenure case stay drawn on purpose: backlog) |
| G7-11 | Dead and mistimed events | 76D |
| G7-12 | The phone layout breaks | 76I |
| G7-13 | The low-satisfaction figure fades | 76E |
| G7-14 | The stale hall price | 76C |
| G7-15 | A renovation costs more than a rebuild | 79C |
| G7-16 | The cancel log line overstates the refund | 79D |
| G7-17a–d | The `node_modules` symlink, `newplayer`, the three scenarios that never stopped, `shoot.mjs`'s header | the review branch, 79E |
| G7-18 | The docs are out of date | 74B, 76H, 79E |
| G7-19 | Smaller things | 76H, 77, 78E, 78F, 79 (the Credits' spelling was confirmed by the owner) |

## The ten ranked improvements

| # | Improvement | Status |
|---|---|---|
| 1 | The first year explains itself | Fully (78B, C, F, G) |
| 2 | The move to school halls unstuck | Fully (78D) |
| 3 | No decision taken without the player | Partly: the pause on arrival and in the final week (78E). The digest and "modals for choices only" are open. |
| 4 | The text made true | Partly, nearly all (76C, D, G; 79C, D) |
| 5 | A late-game worklist and a lever | Partly: the filter, and the training program for academics only. The Provost's auto-fill was declined. |
| 6 | A usable Curriculum | Fully (76B, 80B) |
| 7 | Ambitious strategies that end differently | Partly: Plan 85. Its effect is measured by the second review. |
| 8 | A fair Final Report | Partly: everything except the access phrase |
| 9 | One way to write a number | Fully (76E, 76H) |
| 10 | A campus worth a screenshot | Fully on the map (74, 75). The store-page picture is area 6's. |

## Fix first

All six are done: G7-1 in 79B; G7-3 in 76D; G7-4, G7-5 and G7-14 in 76C;
and G7-17a on the review branch. None of them landed in Plan 74's first PR,
as the README had asked. They were spread over Plans 76 and 79.

## Area 6 — Marketability (not triaged)

| Recommendation | Status |
|---|---|
| A picture a stranger wants to click | Partly: seasons, the landmarks and the ring of land are built. The title screen still shows no campus. |
| Choices that exclude each other | Partly: Plan 85 (see A4-1) |
| AI use disclosed and human direction made visible | Not: only the Credits line |
| A sandbox after the report | Partly: a Sandbox mode from the title screen (29 September, outside any plan), and the Epilogue, which the memo missed |
| The private playtest (70L) | Partly: the owner played a full run (Plan 80); 70L itself is on hold |
| The first decade ready to demo | Fully (Plans 76 and 78) |
| A free web demo, a Steam page, a Next Fest date, a price | Not decided |
| A devlog, human-made capsule art and music, a hand edit of the most-read text | Not |
