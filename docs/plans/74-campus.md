# Plan 74 — The campus, from the review's area 1

*Planning document only. Its job is to turn the owner's answer on area 1
of the October review into PRs.*

**Status: Proposed.**

---

## 0. The owner's answer

The review ([Plan 73](73-game-review.md),
[`1-aesthetics.md`](../reviews/2026-10-game-review/1-aesthetics.md)) found
ten things wrong with how the campus looks. The owner's answer: **do every
recommended fix in area 1 except A1-7 (diagonal walks) and A1-8 (doors),
which go to the backlog.** The area's ranked list of decorative assets to
add goes to the backlog too: it is a list of additions, not fixes, and its
first entry, seasons, is A1-10, which this plan does.

| Finding | What | PR |
|---|---|---|
| A1-1 | The vernacular restyles only about half of a grown campus | E |
| A1-2 | Different buildings share one drawing | F |
| A1-3 | The Great Dome draws its drum's top in front of the dome | C |
| A1-4 | The grand landmarks look like placeholders | C |
| A1-5 | The Football Stadium opens as a bare field | D |
| A1-6 | Late campuses end derelict at full funding, and the derelict look is too faint | B |
| A1-7 | Diagonal walks draw as staircases | backlog |
| A1-8 | Doors open onto lawn, seams, trees and racks | backlog |
| A1-9 | Style slips within a vernacular | G |
| A1-10 | The map never changes with time | I |
| (sites) | Construction sites look the same from the first week to the last | H |

The review read `58fa3fd`. Plan 72M, which landed after it, already drew
the Founder's Statue and the Fountain on their own, so the area's remark
that they repeat the quad centerpieces is done.

## Rules for every PR in this plan

- One branch per PR (`plan-74x-subject`), merged once `check` and `slow`
  pass.
- **Balance moves only in B.** Everywhere else `npm run sim` reads the same
  as `sim/baseline.json`: the rest is drawing.
- Each visual PR carries screenshots in
  `docs/reviews/2026-10-campus-fixes/`, in more than one vernacular and
  from more than one camera where the change turns with the camera, and
  runs `npm run review:doors` over the arrangements to show no depth-order
  error came in.
- Presentation never touches the run's random stream (hashes of ids, as
  the dressing and weathering already do).
- Any state-shape change ships a save migration and a version bump.
- Each PR writes an **As implemented** note here.

## The map

| PR | Subject | Findings | Moves balance |
|---|---|---|---|
| A | This plan; the backlog notes | — | no |
| B | The estate: backlog that full funding pays down, and a derelict look that warns | A1-6 | yes |
| C | The landmarks: the dome whole, and a detail pass on all three | A1-3, A1-4 | no |
| D | The stadium opens with stands | A1-5 | no |
| E | The vernacular's surface on the invariant buildings | A1-1 | no |
| F | One signifier per building | A1-2 | no |
| G | Style slips | A1-9 | no |
| H | Construction sites that grow | area 1, "Sites don't grow" | no |
| I | Seasons on the map | A1-10 | no |

B through H can land in any order. I lands last: it tints palettes the
others add to.

---

## PR 74A — The plan

- This document, and its row in `docs/plans/README.md`.
- `BACKLOG.md`: the triage entry says area 1 is taken into this plan, and
  A1-7, A1-8 and the decorative assets go into *Named, not sequenced*.

## PR 74B — The estate

*A1-6, with G7-2 (the same defect from area 7).* In every simulated
fifty-year game most of the campus ends derelict with maintenance fully
funded: five event answers add backlog, scaled up to 12× by budget, spread
over every building by cost, and it compounds at 6% a year that full
funding never pays down.

- **Full funding pays the backlog down.** Backlog compounds only while
  maintenance is underfunded. At full funding the maintenance budget pays
  a share of each building's backlog down every week (about a tenth a
  year), so an event's damage heals over a decade instead of growing
  forever. A renovation still clears it at once.
- **The labels say what they do.** The flood's "Dry out and repair" adds
  backlog; it becomes "Dry out and defer the repairs".
- **`estate.ts`'s header** says what is now true.
- **The derelict look warns.** A building below condition 0.1 draws a
  timber hoarding round its plot (in place of the hairline fence), a
  tarpaulin on its roof and a darker, grayer wall; the boarded windows of
  band 3 read at the opening zoom.
- **Balance:** measured with `npm run sim` and the pacing scorecard;
  baseline re-recorded; the move written down. The review's backlog probe
  (`npm run review:probe -- backlog`) is rerun and quoted.
- **Checks:** at full funding a backlog falls and never compounds; below
  it, it compounds as before; a renovation still clears it.

**As implemented (#209).**

- `estate.ts`: while maintenance is fully funded a backlog is paid down by
  `BACKLOG_PAYDOWN_RATE` (a tenth a year, weekly) and cleared outright
  below $1,000; it compounds at 6% only while funding is under full, as
  before. A renovation still clears it at once, and the backlog stands
  while one runs. The header says so.
- The flood's `repair` answer reads "Dry out and defer the repairs".
- `ageMarks.tsx`: a derelict building (band 4) darkens both visible walls,
  lays a blue tarpaulin up its roof's slope from the longer near eave
  (hanging a little down the wall), and stands behind a 2.4 m timber
  hoarding with posts round the plot, in place of the dashed hairline
  fence. The boarded windows of band 3 are larger, darker-edged and
  cross-braced.
- **Checks:** `test/estate.test.ts` adds that at full funding a seeded
  $1M backlog falls every week, by a tenth in a year, and is gone in
  time with the building back to perfect condition; and that at 95%
  funding it compounds as before.
- **Balance** (`npm run sim`, medians of three seeds, change from the old
  baseline; re-recorded):
  - Completionist Y50 cash $573.8M (+$503.4M); rank, enrollment, courses
    unchanged.
  - Lean Y50 enrollment 12,234 (+7,986), prestige 105.7 (+11.5), rank 29
    (4 places up).
  - Selective Y50 prestige +2.6; Guided Y50 prestige −1.2, cash +$3.3M;
    Idle unchanged.
  - The pacing scorecard (`npm run natural -- --pacing`) still meets 86 of
    114 targets. At high price, prestige's 90% now lands at Y35 and net
    $/wk's at Y42, a year outside their windows each; the second-straight
    falls in net $/wk go from 2 to 0 and that row now passes.
- **The review's probe** (`npm run review:probe -- backlog`) at year 51,
  maintenance fully funded throughout: derelict 0 of 80 (Completionist
  seed 12345), 0 of 69 and 0 of 68 (Natural seeds 12345 and 4242), against
  44–52 of about 70 in the review. Founders Hall ends at condition
  0.95, 0.93 and 0.94. Event answers still add $8M–$22M of backlog each;
  it heals over the following decade.
- Screenshots: `docs/reviews/2026-10-campus-fixes/derelict-vernaculars.png`
  (three derelict and three boarded buildings in Georgian, Collegiate
  Gothic, Mission and Modern) and `derelict-opening-zoom.png`.

## PR 74C — The landmarks

*A1-3 and A1-4.*

- **The dome whole.** The drum's top face is not drawn under a dome; the
  dome's silhouette runs down to the near half of its base ring, and the
  drum is a tone off the plinth.
- **The campanile:** arched belfry openings, a clock face on the shaft and
  a string course at each stage.
- **The gate:** pilasters, a cornice and relief panels either side of the
  arch.
- **The dome:** ribs, a peristyle of columns round the drum and a gilded
  lantern.
- The staged construction (footings, half, all but the crown) keeps
  working, each stage showing what stands.

## PR 74D — The stadium opens with stands

*A1-5.* The Football Stadium seats 40,000 from the day it opens and draws
as a bare field until its second expansion.

- It opens with low stands down both touchlines. The first expansion adds
  stands behind both ends, the second closes the corners into the bowl,
  and the third adds the second deck, so every expansion still adds
  something you can see. Seats, costs and weeks stay as they are.

**As implemented (#211).**

- `buildingMotifs.tsx`'s bowl motif now draws the stages like this:
  - As built, low stands run down both touchlines (what the first
    expansion used to add).
  - The first expansion adds a lower stand behind each end zone.
  - The second closes the corners into the full bowl.
  - The third adds the second deck all round.
- Seats, costs and weeks are unchanged (`facilitiesData.ts`).
- Drawing only. `npm run sim` reads the same as the baseline, and
  `npm run review:doors` reports the same 1,842 hits as `main`.
- Screenshots in `docs/reviews/2026-10-campus-fixes/`:
  - `stadium-stages.png`: as built, expanded once, twice and three times,
    and the site.
  - `stadium-stages-behind.png`: the same from the opposite camera.

## PR 74E — The vernacular's surface on the invariant buildings

*A1-1.* Seven motifs never restyle by design (`VERNACULAR_INVARIANT_MOTIFS`),
and four of the seven school halls use them, so by year 50 about half of a
campus looks the same whatever architecture was chosen.

- **Massing stays, surface follows.** The `block`, `works` and `hangar`
  buildings keep their form but take the vernacular's surface:
  - its roof color on parapets and plant screens;
  - its trim on the cornice;
  - its window shape (`paneShapeOf`);
  - its entrance part at the door;
  - and its parapet crest (a Gothic block gets merlons, a Mission one a
    tile coping).
- The school signature halls (Science, Engineering, Health Science,
  Computer Science) come first, since by year 50 they are the most-built
  halls; the labs, sheds and the hospital follow in the same PR.
- The venues' fields and bowls, the towers and the landmarks stay
  invariant.
- **Checks:** `test/building-spec.test.ts`'s invariance rules split into
  massing (still invariant) and surface (now follows the vernacular); the
  review's probe (`npm run review:probe -- vernacular`) is rerun and
  quoted.

## PR 74F — One signifier per building

*A1-2.* The engineering sheds, the pavilions, the civic porticos and some
labs share drawings, so the map cannot say where the dining hall is
without a click.

- One feature per id, in the way `LAB_FEATURES` already marks physics,
  biology and chemistry:
  - the dining halls: kitchen stacks and a terrace awning;
  - the student center: a clock or banner on its gable;
  - the grocery: its shopfront, legible at the opening zoom;
  - Mechanical Engineering: a gantry crane beside the shed;
  - Aerospace: a wind-tunnel duct;
  - Civil: a test tower;
  - Chemical Engineering: a distillation column beside the flues;
  - Film: a soundstage's great door and lamp;
  - the Museum: banners between its columns;
  - the Law School: a pediment with the scales;
  - the Humanities Research Institute and the Art Gallery, the Neuroscience
    and Computing labs: one mark each so the pairs part.
- **Checks:** a test that no two placeables share motif, material,
  footprint and feature (the review's repeat probe, as a rule).

## PR 74G — Style slips

*A1-9.*

- **Mission's tile reaches the halls:** pitched roofs in Mission are clay
  tile whatever the wall material, so the Social Sciences hall and the
  Business exchange stop wearing gray decks.
- **A Gothic library:** in Collegiate Gothic the library and gallery take a
  Gothic form (steep roof, lancets, a tower on the library) instead of the
  pale flat portico.
- **The Modern generic hall** stops reading as a parking garage: glazing
  between the bands, and a recessed, glazed ground floor.
- **Benches and arcades at the opening zoom:** benches keep a seat and a
  back, and a Mission arcade shows its arches rather than a barcode.

## PR 74H — Construction sites that grow

*Area 1, "Sites don't grow".* A hall or residence under construction is a
hatched slab with a crane from its first week to its last; labs and
pavilions get the slab alone. Only the grand landmarks rise in stages.

- Every building under construction rises through the landmarks' three
  stages: footings, then the frame (a skeleton to full height), then the
  closed shell in scaffolding. The crane stays on the large ones. Read off
  the build countdown the landmarks already use.

## PR 74I — Seasons on the map

*A1-10*, and the review's first decorative asset. The owner declined
night and seasons on the map in Plan 72 (answer 16); this answer takes in
every area-1 fix but A1-7 and A1-8, so seasons are back in. It lands last
so it can be dropped without touching the rest.

- **The year on the map.** A tint by week on the trees, lawns and roofs:
  - leaves turning through the Fall Term;
  - snow on the roofs and lawns at the turn of the terms (week 26);
  - bare trees into the Spring Term;
  - green again by the summer.
- The seasons read the game's own calendar (week 1–26 Fall Term, 27–52
  Spring Term, the summer at week 52). The events' winter model is half a
  year off (area 7, G7-3); it is not part of area 1, so it stays as it is
  here, and the seasons' calendar is written so G7-3 can reuse it.
- Reduced motion is respected; a tint changes by the week, never animates.
- **Checks:** the season at each week is tested; screenshots of one campus
  through a year.

## What this plan does not do

- A1-7 and A1-8, and the decorative assets other than seasons (water and a
  boathouse, walls and gates, a bandstand or quad clock, more sculpture,
  parking, signage): in `BACKLOG.md`.
- The review's other areas, which wait for the owner's triage.
