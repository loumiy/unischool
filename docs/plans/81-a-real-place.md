# Plan 81 — A real place

*Planning document only. Its job is to turn the owner's ask, that the
campus feel like a place and not a model hanging in space, into PRs.*

**Status: Landed.** A to E merged (#254–#258).

---

## 0. The owner's ask

The campus is a flat 126 × 126 parcel drawn on a plain green fill
(`--grass-deep`, behind the whole map). Past its edge there is nothing, so
at most zooms it reads as a board on a table. The owner asked for subtle
terrain and for ground that runs on past what the camera can see.

Of the options put to the owner, they chose:
- **the land around the campus:** a landscape beyond the parcel, drawn
  but not built on;
- **rolling ground beyond the campus:** gentle hills in that landscape,
  with the campus on a flat valley floor.

Not chosen: shading on the campus's own ground, and real slopes inside the
campus. Real slopes would touch the projection, the depth sort, siting,
paths, walkers, doors, hit-testing and shadows; they wait in the backlog
beside the faster renderer, which would carry elevation natively.

## 1. The PRs

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | This plan; the backlog | no | no |
| B | The land around the campus | no | no |
| C | Fewer fields, more woods and hills | no | no |
| D | Open grass, scattered trees | no | no |
| E | Grass margins between fields | no | no |

## PR 81B — The land around the campus

- **A ring of land around the parcel**, several screens deep on every
  side, drawn under nothing the player can build on:
  - the road runs on off both ends of the parcel;
  - meadows and fields divided by hedgerows;
  - woods, from the existing tree art, thinning with distance;
  - a low town edge along the road: small roofs, not buildings the
    player can inspect;
  - gentle hills rising away from the parcel on the far sides, so the
    campus sits on a flat valley floor. The hills are drawn on the ring
    only; the parcel stays flat.
- **Haze:** the ring fades toward the sky color with distance, more at
  low pitch, so there is never a hard edge.
- **Stable and not state:** the ring is generated from the college's name
  (a seeded hash, as the rivals' colors are), so it is the same on every
  load, and nothing is saved. The vernacular colors its roofs.
- **Cheap to draw:** a few large shapes and a sparse set of trees and
  roofs, built once per camera view and memoized, and left out during a
  turn as the trees already are (Plan 80H). A turn must not get slower.
- **The camera** stops before the ring's outer edge can be seen at any
  zoom, pitch or view; the far edge dissolves into haze.
- **Checks:**
  - screenshots at every view, the widest zoom and the lowest pitch, on a
    new college and a year-30 campus, in two vernaculars;
  - a turn timed on the year-30 campus before and after, the way Plan 80H
    measured it;
  - `npm run check`, `npm run phone`; the sim unchanged.

**As implemented (#255):**

- **The land** (`ringLand.ts`, drawn by `Surroundings.tsx`): 200 tiles of
  country on every side, from a seeded hash of the college's name, never
  saved. Blocks round the parcel and the road are halved into fields
  (meadow, pasture, crop, plough, wood, pine), bigger with distance, with
  hedgerows round them out to 130 tiles; crops on the valley floor, grazing
  and woods up the hills. The road runs on off both ends, with its kerbs
  (the parcel's road gains its south kerb). The town stands on the side
  the name picks: houses on both sides of the road and across it from the
  campus, a lane or two, in the vernacular's walls and roofs, snow on them
  in winter; two or three farms on the far side.
- **Hills**: a height field, flat for 26 tiles round the parcel, then a
  slow rise and twenty rounded hills. The whole ring is lifted by it, and
  each field is lit by its slope in five steps. Slopes stay under the
  lowest pitch's sight line (tested), so the ground never hides itself
  and can be drawn as merged shapes. The parcel stays flat. A drawn ridge
  of hills on the far rim was tried and dropped: at the opening pitch it
  read as a band laid across the fields.
- **Woods**: a canopy pattern (crowns in the season's leaf colors), forty
  trees from the campus's own art at the edges of the near woods, and
  clumps of crowns further out, a dozen to a path.
- **Haze**: `--haze` is the map's background now; a radial gradient in
  tiles about the parcel (clear to about 70, solid by about 240) and a wash
  up the screen past the parcel, both stronger the lower the pitch.
- **Cheap**: about 550 nodes, in an `<svg>` of its own under the map's, so
  the map's own frames repaint none of it. Built once per name and camera.
  Sprites standing in front of the parcel are drawn over it by
  `CampusScene`, under the labels. While turning only the plate, road and
  haze show; the rest stays mounted and hidden and is updated when the
  turn settles.
- **The camera**: the canvas's corners are kept over the ring and its
  center within 70 tiles of the parcel, at every view and pitch; on a big
  screen at a low pitch the widest zoom closes in to fit (tested on four
  screen sizes).
- **The turn, timed** as in 80H (year-30 Completionist campus, laid out,
  production build, headless Chromium, main-thread CPU from a trace,
  medians of 12 turns, five runs each, before and after alternating; 4
  cores, loaded):

  | | Before | After |
  |---|---|---|
  | The whole turn, opening zoom | 701–735 ms (713) | 691–753 ms (703) |
  | The whole turn, widest zoom | 701–707 ms | 705–712 ms |
  | A frame of the turn | 108–114 ms | 111–115 ms |
  | The frame that settles it | 71–78 ms | 72–81 ms |
  | Main thread at Play (walkers) | 359–374 ms/s | 290–305 ms/s |

  The turn is unchanged within the machine's noise. A steady frame at
  Play is about a fifth lighter, most likely because the map's `<svg>` no
  longer paints a background under the whole scene (not isolated).
- **Checks**: `test/surroundings.test.ts` (stable per name, off the
  parcel and the road, houses apart, flat floor, gentle slopes, the
  camera's leash); `npm run check`; `npm run phone` and the touch check;
  the sim report shows no deltas; the door checker's hits are the same
  before and after. `docs/reviews/2026-10-campus-fixes/81b-*.jpg`: a new
  college and a year-30 campus at the widest zoom, the lowest pitch, a
  turned view, winter, Saint Aldric in Mission, and a phone; the
  `81b-before-*` shots are the first three before.

## PR 81C — Fewer fields, more woods and hills

The owner, on 81B's pictures: less farmland, more trees, more hills.

- **Farmland** a minority of the ring, about a third at most rather than
  most of it, kept to the road and the town, where farms would stand.
- **Woods**, many more, as large woods rather than scattered clumps:
  - each wood a mass (its canopy, a darker edge, some texture), with trees
    drawn one by one only along its edges near the campus and in copses
    thinning out into the open;
  - meadows and rough grass between the woods, so the land is not one
    green carpet;
  - still cheap: built once per view, hidden through a turn.
- **Hills** clearly read and still gentle, the campus still on its flat
  valley floor:
  - stronger light and shade on the slopes, lit toward the sun;
  - woods climbing them;
  - soft, hazed layers of far hills at a low pitch, never a wall.
- Winter and the vernaculars as before.
- **Checks:** farmland under about 40% of the ring, tested; `npm run
  check`, `npm run phone`, the sim unchanged; a turn and a steady frame
  timed against main; 81B's set of pictures again, and a before of the
  year-30 campus at the widest zoom and the lowest pitch.

**As implemented (#256):**

- **Farms** keep to the road and the town (`farmness`: within about 30
  tiles of the road, fading by 64, and round the town, on the low ground).
  Only there is a field crop, hay or plough, and only those are hedged;
  everywhere else a field is open meadow or rough grass (a new
  `--field-rough`, with the seasons). Farmland was 44–50% of the ring's
  area in 81B (64–69% counting the hedged meadows); it is now 18–22%.
  `test/surroundings.test.ts` holds it under 40%, over 10%, and off the
  far country.
- **Woods** are shapes of their own, not fields: a seeded noise value on
  a four-tile grid, raised on high ground and near the campus, cleared
  from the farms, road, town and the campus's edge, traced by marching
  squares into large irregular woods with clearings (even-odd). Pine is a
  second value inside them. Each is the canopy pattern under a darker
  edge. They cover 40–56% of the land (tested between 30 and 70%) and
  climb the hills. The campus's own tree art stands along the woods'
  edges on the valley floor and in copses in the meadows (56 at most);
  further out, clumps along the edges and in copses (150 at most, merged
  a dozen to a path).
- **Hills**: 30 of them, larger and a little taller (the slope cap
  unchanged, tested). Their light is traced on the same grid from a lower
  sun (24°) into two steps of light and two of shade, laid over fields and
  woods alike, replacing 81B's per-field shading. At a low pitch two
  layers of far hills stand on the far side of the valley, hazed as the
  ground at their feet, falling into saddles; they sink away by the
  opening pitch.
- **Cost**: about 620 ring nodes (81B about 550), built once per name
  (20–60 ms) and per view (7–15 ms), hidden through a turn as before.
  Timed against main as in 81B (year-30 campus, production builds,
  main-thread CPU from a trace, medians of 12 turns, runs alternating):

  | | Main | 81C |
  |---|---|---|
  | The whole turn, opening zoom (4 runs) | 710–797 ms | 709–758 ms |
  | The whole turn, widest zoom (4 runs) | 714–877 ms | 729–939 ms |
  | The frame that settles it | 74–91 ms | 76–93 ms |
  | Main thread at Play (4 runs) | 283–324 ms/s | 295–312 ms/s |

  Both within the machine's noise; at Play perhaps 3% heavier.
- **Checks**: `npm run check`, `npm run phone`; the sim unchanged.
  `docs/reviews/2026-10-campus-fixes/81c-*.jpg`: 81B's set again (a new
  college and a year-30 campus at the widest zoom, the lowest pitch, a
  turned view, winter, Saint Aldric in Mission, a phone), and
  `81c-before-*` the year-30 campus from main at the widest zoom and the
  lowest pitch.

## PR 81D — Open grass, scattered trees

The owner, on 81C's pictures: "The woods don't look good, delete those and
leave it as plain grass with some scattered trees." And then: "On the
farmland, the borders look too harsh, try no border."

- **No woods:** their shapes, edges, clearings, pine and clumps go; where
  they stood, the meadow and rough grass already there.
- **Scattered trees:** single trees and the odd group of two or three, in
  the campus's own tree art near it and simple crowns further out, thinning
  with distance into the haze; bare or dusted in winter as the campus's
  are. No more nodes than 81C.
- **No borders on the farmland:** no hedgerow, stroke or outline round a
  field, in any season (the gray lines in the snow go too). Neighbours
  are told apart by their fill colors alone, so no two that touch share
  one.
- **Kept:** the farms by the road and the town, the road and
  the town, the hills with their light and shade, the far hills at a low
  pitch, the haze, the camera's leash, winter and the vernaculars.
- **Checks:** no wood shapes, no field borders, touching fields unlike,
  and a sparse band of trees, tested; the farm-share checks kept; `npm run check`, `npm run phone`, the sim
  unchanged; a turn and a steady frame timed against main; 81C's set of
  pictures again, a view of the fields close to, and a before of the
  year-30 campus at the widest zoom.

**As implemented (#257):**

- **No woods.** 81C's wood outlines, their edges, clearings and pine, the
  canopy patterns and the clumps are gone; the grass beneath (meadow and
  rough grass) shows where they stood.
- **Scattered trees:** a tree here and there, one time in four or so two
  or three together, thinning with distance (by e every 55 tiles) and
  none on the road, in the town or in a farmyard. On the valley floor the
  campus's own tree art (34–40 per college, at most 40); past it, out to
  125 tiles, a single crown on a short stem or a pine's spire, the size of
  a campus tree (196–200, at most 200), merged sixteen to a run. They go
  bare in winter and the pines take a dusting, as on campus. The test
  holds the counts in a sparse band, that they thin with distance, and
  that no tree has more than a small group within four tiles.
- **No borders on the farmland:** the hedgerows, their stroke and the
  `--hedge` color are gone. A hairline in each field's own color closes
  the seam between two fills. No two touching farm fields share a cover
  (`unlikeNeighbours`: pass after pass a clashing field takes the cover
  fewest of its neighbours have; one still clashing lies fallow as rough
  grass), and under snow each keeps a little of its own color (the
  stubble whitest, the grass paler, the plough darkest), so neighbours
  read apart in winter too. Tested: no pair alike. Farmland 20–21%.
- **Cost:** about 550 ring nodes (81C about 650). Built once per name and
  per view, hidden through a turn. Against main (81C), production builds,
  main-thread CPU from a trace, medians of 12 turns, runs alternating:

  | | Main | 81D |
  |---|---|---|
  | The whole turn (4 runs) | 810–863 ms | 792–825 ms |
  | The frame that settles it | 86–98 ms | 76–102 ms |
  | A frame at Play (walkers) | 26–28 ms | 25–28 ms |

  A frame at Play costs the same; without the woods the page draws a
  few more of them a second (15 to 17 in headless Chromium), so the main
  thread's time per second is up by that much.
- **Checks:** `npm run check`, `npm run phone`; the sim unchanged.
  `docs/reviews/2026-10-campus-fixes/81d-*.jpg`: 81C's set again, the
  fields close to in summer and winter (`81d-8`, `81d-9`), and
  `81d-before-2-year30-wide.jpg` from main.

## PR 81E — Grass margins between fields

The owner, on 81D's pictures: "Instead of no border between fields, just
use the grass color for a border."

- **A margin of grass** round each farm field, so neighbours are parted by
  a strip of grass like a headland, not by a line or a hedge; thin enough
  not to weigh at the widest zoom, wide enough to read at the opening one.
- **With the year:** the ground's own grass color, summer, autumn and snow.
- 81D's hairline seam stroke goes; the margin does its work.
- **Checks:** the field borders drawn in the grass token, tested; `npm run
  check`, `npm run phone`, the sim unchanged; the fields close to in
  summer and winter, the year-30 campus wide, Mission, and a before.

**As implemented (#258):**

- Each farm field (crop, hay, plough) is stroked in `--grass`, the token
  the ring's plate, the meadows and the campus's own lawn take, so the
  margin is the surrounding grass and moves with the seasons (white under
  snow). The stroke is 14 world units, about a third of a tile (some 3 m):
  about five pixels at the opening zoom, three at the widest, 35 at the
  closest. A stroke rather than an inset: the same path data, no new
  shapes, and two neighbours' strokes lie on their shared edge, so the
  strip between them is one width wide. The farm fields are drawn after
  the open ground so their margins lie over it too. No other field is
  stroked; 81D's hairline in each field's own color is gone.
- **Kept** 81D's rule that touching farm fields never share a cover: with
  a strip of grass between them two alike would still read as one field
  cut in two, and the mixed patchwork is what the owner has been looking
  at.
- **Cost:** none: the same paths, the same 554 ring nodes, so no timing
  run.
- **Checks:** `test/surroundings.test.ts` reads the stylesheet: the farm
  fields' border is `stroke: var(--grass)` in world units, and no other
  field is stroked. `npm run check`, `npm run phone`; the sim unchanged.
  `docs/reviews/2026-10-campus-fixes/81e-*.jpg`: the fields close to in
  summer and winter, the year-30 campus wide, Saint Aldric in Mission,
  and `81e-before-fields-close.jpg` from main.

## 2. The backlog

**Real slopes on campus** go under *Named, not sequenced*, beside the
faster map: gentle elevation inside the parcel, with buildings on leveled
pads and plinths on the downhill side. It waits for the new renderer.

## What this plan does not do

- No elevation inside the parcel; no shading on the campus's ground.
- Nothing in the ring is interactive, and it doesn't grow over the run.
